/**
 * MaternalCare+ — application entry point (MVC architecture)
 *   Models      → /models       (data access + domain logic, PostgreSQL-backed)
 *   Views       → /frontend     (React client)
 *   Controllers → /controllers  (request handling, wired via /routes)
 *
 * This process is the Model and Controller layers plus the API that carries
 * them to the View. It serves no pages of its own.
 *
 * It used to serve a second, server-rendered View from /views: the same
 * records as EJS pages, on the same port. They were written before there was
 * any authentication and never gained it — an anonymous GET /vitals returned a
 * patient's name, her glucose reading and a clinical alert, straight past the
 * guard that protects every /api route. They are gone rather than retrofitted;
 * one View is one place for that mistake to be made.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./routes/api');

const session = require('./middleware/session');

const app = express();
const PORT = process.env.PORT || 3000;
// Vite dev origins: the mother/clinician client (5173) and the guardian
// companion app (5174). Override with a comma-separated CLIENT_ORIGIN.
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN
  || 'http://localhost:5173,http://localhost:5174').split(',').map((s) => s.trim());

// Normal JSON should stay small. Document, image and message uploads have
// their own model-level byte limits and are the only routes allowed above it.
const LARGE_JSON_PATH = /^\/api\/(?:documents(?:\/|$)|messages(?:\/|$)|community\/posts$|vaccinations\/\d+\/card$)/;
const smallJson = express.json({ limit: '256kb' });
const largeJson = express.json({ limit: '12mb' });
app.use((req, res, next) => {
  const isNormalApi = req.path.startsWith('/api/') && !LARGE_JSON_PATH.test(req.path);
  return (isNormalApi ? smallJson : largeJson)(req, res, next);
});

// The guardian app has to be opened on a real phone to test install,
// vibration and audio, so in development a private-network origin on either
// dev port is allowed too. Set CLIENT_ORIGIN in production to switch this off.
const LAN_DEV = /^http:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)[\d.]+:(5173|5174)$/;

function allowedOrigin(origin) {
  if (!origin) return null;
  if (CLIENT_ORIGINS.includes(origin)) return origin;
  if (!process.env.CLIENT_ORIGIN && LAN_DEV.test(origin)) return origin;
  return null;
}

// documents arrive as base64 data URLs, which inflate ~4/3 over the 5 MB cap
app.use(express.urlencoded({ extended: true }));
/*
 * Still served: the guardian APK that SosModal links to for download, under
 * public/downloads. The stylesheet and scripts that used to live here belonged
 * to the EJS pages and went with them.
 */
app.use(express.static(path.join(__dirname, 'public')));

/*
 * The built React client, when there is one.
 *
 * In development it is not here: Vite serves it on :5173 with hot reload, and
 * this process answers only /api. In a deployment there is no second server to
 * run, so the same process serves the client it already has the API for —
 * which also puts them on one origin, and a session cookie the browser will
 * actually send. `SPA fallback` below is the other half of that.
 */
const CLIENT_DIR = path.join(__dirname, 'frontend', 'dist');
const hasClient = fs.existsSync(path.join(CLIENT_DIR, 'index.html'));
if (hasClient) {
  app.use(express.static(CLIENT_DIR));
}

// Allow the Vite dev server to call the API during development
app.use('/api', (req, res, next) => {
  const origin = allowedOrigin(req.headers.origin);
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }
  // the session lives in a cookie, and a cross-origin fetch will neither send
  // nor store one without this — the dev server is a different origin
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  // the report download reads the filename off this header; without exposing it
  // a cross-origin fetch cannot see it and every report saves under one name
  res.header('Access-Control-Expose-Headers', 'Content-Disposition');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/*
 * Resolve the session before anything else looks at a request. It never
 * rejects — it only answers "who is this" — so the sign-in page and the
 * marketing site still render for nobody in particular.
 */
app.use(session.attach());

app.use('/api', apiRoutes);

/*
 * SPA fallback.
 *
 * React Router owns /mother, /doctor, /signin and the rest. Those paths exist
 * only in the browser, so a reload or a pasted link arrives here as a request
 * for a file that was never on disk. Handing back index.html lets the router
 * resolve it.
 *
 * Three things are deliberately excluded: anything under /api, which must
 * answer as an API and not as a page; anything but GET, so a mistyped POST
 * fails loudly instead of receiving HTML; and any path with a dot in it, so a
 * missing image 404s as a missing image rather than quietly returning markup.
 */
if (hasClient) {
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api')) return next();
    if (req.path.includes('.')) return next();
    return res.sendFile(path.join(CLIENT_DIR, 'index.html'));
  });
}

/*
 * 404. JSON — what reaches here is an API call, a missing asset, or a request
 * to a deployment with no client built into it.
 */
app.use((req, res) => res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' }));

// Global error handler middleware
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large' || err.code === 'LIMIT_STRING') {
    return res.status(413).json({ error: 'That request is too large', code: 'PAYLOAD_TOO_LARGE' });
  }
  console.error('[server error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

const server = app.listen(PORT, () => {
  console.log(`\n  MaternalCare+ running →  http://localhost:${PORT}\n`);
});

/*
 * Why the process is made to say something before it goes.
 *
 * Node ends the process on an unhandled promise rejection, and an Express app
 * is almost nothing but promises. Left alone it exits with no output at all:
 * the server is simply gone between one request and the next. A browser can
 * only see a connection that refused, so it reports "Failed to fetch" - which
 * reads like a fault in the page, and sends whoever is debugging into the
 * wrong half of the codebase. These handlers cost nothing, and mean a crash
 * always leaves a reason behind it.
 */
server.on('error', (err) => {
  console.error('');
  if (err.code === 'EADDRINUSE') {
    console.error(`  [fatal] port ${PORT} is already in use - another copy of the`);
    console.error('          server is probably still running. Stop it, or set PORT.');
  } else {
    console.error('  [fatal] the server could not start:', err.message);
  }
  console.error('');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('');
  console.error('  [fatal] unhandled promise rejection - the server is stopping:');
  console.error(reason instanceof Error ? reason.stack : reason);
  console.error('');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('');
  console.error('  [fatal] uncaught exception - the server is stopping:');
  console.error(err.stack || err.message);
  console.error('');
  process.exit(1);
});
