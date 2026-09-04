/**
 * PostgreSQL connection layer (Model layer backing store).
 *
 * Replaces the synchronous node:sqlite driver. Everything here exists to make
 * the rest of the Model layer read almost the same as it did before:
 *
 *   * `sql` uses $1, $2 placeholders and returns rows directly
 *   * dates and timestamps come back as the *strings* the old code and every
 *     client already expect, not as JavaScript Date objects
 *   * counts come back as numbers, not the strings pg returns for bigint
 *   * anything thrown is stripped of the connection string first, so a
 *     password can never reach a log, a stack trace or an error page
 */
const { Pool, types } = require('pg');
const fs = require('fs');
const path = require('path');

/* ------------------------------------------------------------------ env */

// Node can read .env itself since v21 — no dotenv dependency needed.
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envPath);
  } catch {
    /* malformed .env — fall through to the clearer error below */
  }
}

/* -------------------------------------------------------- type parsers */

/*
 * SQLite stored dates as 'YYYY-MM-DD' and timestamps as ISO strings, and the
 * whole app — models, API responses, React, the Android build — is written
 * against that. node-postgres would hand back Date objects instead, which
 * JSON.stringify turns into a different shape and silently breaks date
 * comparisons. Parsing them back to strings keeps the contract identical.
 */
const DATE = 1082;
const TIMESTAMP = 1114;
const TIMESTAMPTZ = 1184;
const INT8 = 20;
const NUMERIC = 1700;

types.setTypeParser(DATE, (v) => v);               // already 'YYYY-MM-DD'

const toIso = (v) => {
  if (v === null) return null;
  // Postgres gives '2026-08-15 07:31:30.326+00'; the app speaks ISO
  const d = new Date(v.includes('+') || v.endsWith('Z') ? v : `${v}Z`);
  return Number.isNaN(d.getTime()) ? v : d.toISOString();
};
types.setTypeParser(TIMESTAMPTZ, toIso);
types.setTypeParser(TIMESTAMP, toIso);

// count(*) is bigint, which pg returns as a string to avoid precision loss.
// Every count in this app is small, and the callers all expect a number.
types.setTypeParser(INT8, (v) => (v === null ? null : Number(v)));
types.setTypeParser(NUMERIC, (v) => (v === null ? null : Number(v)));

/* ------------------------------------------------------------ the pool */

function connectionConfig() {
  const url = process.env.DATABASE_URL;
  if (url) return { connectionString: url };

  const { PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD } = process.env;
  if (!PGHOST || !PGDATABASE || !PGUSER) {
    throw new Error(
      'No database configured. Copy .env.example to .env and set DATABASE_URL '
      + '(Supabase → Settings → Database → Connection string → Session pooler).',
    );
  }
  return {
    host: PGHOST,
    port: Number(PGPORT) || 5432,
    database: PGDATABASE,
    user: PGUSER,
    password: PGPASSWORD,
  };
}

/*
 * Supabase terminates TLS at the pooler with a certificate Node's default
 * trust store does not chain to, so strict verification fails outright.
 * Encryption still applies; what is skipped is proving the far end's
 * identity. Point PGSSLROOTCERT at Supabase's CA to verify properly.
 */
const rootCert = process.env.PGSSLROOTCERT && fs.existsSync(process.env.PGSSLROOTCERT)
  ? fs.readFileSync(process.env.PGSSLROOTCERT).toString()
  : null;

const pool = new Pool({
  ...connectionConfig(),
  ssl: rootCert ? { ca: rootCert, rejectUnauthorized: true } : { rejectUnauthorized: false },
  // Sydney is ~200ms away, so a handful of warm connections beats reconnecting
  max: Number(process.env.PGPOOL_MAX) || 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});

/* ---------------------------------------------------------- redaction */

/**
 * Strip anything password-shaped out of a message. A connection error from
 * pg can carry the whole URL, and these end up in server logs.
 */
function redact(text) {
  return String(text ?? '')
    .replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@)/gi, '$1***$2')
    .replace(/(password[=:]\s*)\S+/gi, '$1***');
}

class DatabaseError extends Error {
  constructor(original, sql) {
    super(redact(original.message));
    this.name = 'DatabaseError';
    this.code = original.code;
    this.detail = redact(original.detail);
    this.constraint = original.constraint;
    // the statement helps debugging and never contains the password
    this.sql = sql ? String(sql).replace(/\s+/g, ' ').trim().slice(0, 200) : undefined;
  }
}

pool.on('error', (err) => {
  // an idle client dying must not take the process with it
  console.error('[db] idle client error:', redact(err.message));
});

/* ------------------------------------------------------------- helpers */

/** Run a statement and get the rows. The workhorse the models use. */
async function sql(text, params = []) {
  try {
    const result = await pool.query(text, params);
    return result.rows;
  } catch (err) {
    throw new DatabaseError(err, text);
  }
}

/** Exactly the row you asked for, or null. Mirrors SQLite's .get(). */
async function one(text, params = []) {
  const rows = await sql(text, params);
  return rows.length ? rows[0] : null;
}

/** For INSERT ... RETURNING, where the caller wants the new row. */
const insert = one;

/** How many rows a write touched — replaces info.changes. */
async function run(text, params = []) {
  try {
    const result = await pool.query(text, params);
    return result.rowCount;
  } catch (err) {
    throw new DatabaseError(err, text);
  }
}

/**
 * Several statements that must all land or none of them. Used where SQLite
 * relied on being single-threaded and in-process.
 */
async function tx(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await work({
      sql: async (t, p = []) => (await client.query(t, p)).rows,
      one: async (t, p = []) => (await client.query(t, p)).rows[0] ?? null,
      run: async (t, p = []) => (await client.query(t, p)).rowCount,
    });
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err instanceof DatabaseError ? err : new DatabaseError(err);
  } finally {
    client.release();
  }
}

/** Proves the database is reachable and reports round-trip latency. */
async function check() {
  const started = Date.now();
  const row = await one(
    `SELECT current_database() AS db, current_user AS role,
            split_part(version(), ' ', 2) AS version,
            (SELECT count(*) FROM information_schema.tables
               WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS tables`,
  );
  return { ...row, latencyMs: Date.now() - started };
}

module.exports = { pool, sql, one, insert, run, tx, check, redact, DatabaseError };
