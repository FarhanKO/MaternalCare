# Database setup

The database is **PostgreSQL 17 on Supabase**, project `MaternityCare+`
(`hdhpohfuiybfmnclegkh`), region `ap-southeast-2` (Sydney).

The schema is already applied. This file explains what is there, how to
connect, and how to rebuild it from scratch.

---

## 1. Connect the app

Copy `.env.example` to `.env` in the project root and add the connection
string from **Supabase → Project Settings → Database → Connection string →
URI**.

Choose **Session pooler**, not the direct connection:

| Option | Port | |
|---|---|---|
| Direct connection | 5432 | IPv6-only on the free tier. Times out silently on an IPv4-only network. |
| **Session pooler** | 5432 | **Use this.** IPv4, and keeps the session features `pg` relies on. |
| Transaction pooler | 6543 | Drops prepared statements. Causes subtle failures later. |

```
DATABASE_URL=postgresql://postgres.hdhpohfuiybfmnclegkh:YOUR-PASSWORD@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres
```

`.env` is gitignored, so the password never leaves your machine.

## 2. Rebuilding the schema

Migrations live in `db/migrations/` and are applied in order. Both are
recorded in Supabase's own migration history.

| File | What it does |
|---|---|
| `0001_initial_schema.sql` | All 21 tables, 19 foreign keys, 20 CHECK constraints, 32 indexes |
| `0002_lock_down_postgrest_access.sql` | Enables RLS everywhere and revokes the PostgREST role grants |

Apply either from **Supabase → SQL Editor**, or with `psql` against
`DATABASE_URL`.

> `0001` begins with `DROP TABLE ... CASCADE`. That makes it safely
> repeatable while we are still building, but it **destroys data**. Once
> there is anything real in the database, write a new numbered migration
> instead of re-running this one.

## 3. What is in there

**21 tables.**

| Area | Tables |
|---|---|
| People | `users`, `doctors` |
| Pregnancy | `pregnancies`, `vitals` |
| Child | `children`, `growth_records`, `milestones`, `vaccinations` |
| Care | `appointments`, `reminders`, `documents`, `messages` |
| Her own logging | `symptoms`, `daily_logs` |
| Emergency | `emergency_contacts`, `sos_alerts`, `sos_notifications` |
| Community & content | `posts`, `post_comments`, `articles`, `hospitals` |

Four of those hold data that previously only existed in the browser and
disappeared on refresh: `post_comments`, `daily_logs` (mood, kicks,
hydration), and the `avatar_file` / `bio` columns on `users`. `posts` was
rebuilt for the React community, which the old shape could not hold.

## 4. Security posture

Supabase exposes the `public` schema through PostgREST, reachable with the
**anon key — which is public by design** and ships inside client bundles.
Left alone, that key can read every row in the database.

This project does not use PostgREST at all. It connects as the table owner
over `pg`. So `0002` enables RLS on all 21 tables and creates **no
policies**, which denies PostgREST everything, and additionally revokes the
`anon` and `authenticated` grants.

Verified after applying:

```
rls_enabled_tables            21
grants_left_to_public_roles    0
anon_can_read_users        false
authed_can_read_sos        false
app_role_can_read           true
app_role_can_write          true
```

Supabase's linter will report 21 INFO notices reading *"RLS enabled, no
policy"*. That is the intended state, not a problem to fix. If a browser is
ever pointed straight at Supabase, real policies must be written first.

## 5. What changed from SQLite

| | SQLite | PostgreSQL |
|---|---|---|
| Dates | `TEXT` like `'2026-03-15'` | real `DATE` |
| Timestamps | `TEXT` ISO strings | `TIMESTAMPTZ` |
| Flags | `INTEGER` 0/1 | `BOOLEAN` |
| Auto ids | `AUTOINCREMENT` | `GENERATED ALWAYS AS IDENTITY` |
| Foreign keys | declared, **not enforced** | enforced, with `ON DELETE CASCADE` |
| Enum columns | anything accepted | `CHECK` constraints |

The API will return exactly the same JSON as before: the connection layer
registers type parsers so dates still arrive as `'2026-03-15'` and
timestamps as ISO strings, which is what every client already parses.

## 6. Latency — read this before Stage 3

The database is now in Sydney, roughly 150–250 ms away. On SQLite every
query was a function call and nobody counted them. Over a network they add
up: the clinician caseload currently issues about **30 separate queries**
for six patients, which would take several seconds per page load.

Collapsing those into joined queries is part of the model rewrite, not an
optimisation to leave until later.
