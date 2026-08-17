# Setting up PostgreSQL

You only do this once. Everything here happens in pgAdmin — the app never
asks you for a password and never stores one in the repository.

Your machine already has **PostgreSQL 18** installed and running on port
5432, so there is nothing to install.

---

## 1. Create the login role

In pgAdmin, expand your server (usually *PostgreSQL 18*) and log in with the
`postgres` superuser password you chose when you installed it.

1. Right-click **Login/Group Roles → Create → Login/Group Role…**
2. **General** tab → Name: `maternalcare`
3. **Definition** tab → Password: choose one and remember it
4. **Privileges** tab → turn **Can login?** on
5. Save

> A separate role rather than `postgres` is deliberate. If the app is ever
> exposed, a bug can only damage its own database, not the whole server.

## 2. Create the database

1. Right-click **Databases → Create → Database…**
2. **Database**: `maternalcare`
3. **Owner**: `maternalcare`
4. Save

## 3. Tell the app how to connect

In the project root, copy `.env.example` to `.env` and fill in the password
you just chose:

```
PGHOST=localhost
PGPORT=5432
PGDATABASE=maternalcare
PGUSER=maternalcare
PGPASSWORD=the-password-you-chose
```

`.env` is gitignored, so it never leaves your machine.

## 4. Create the tables

Two ways — either is fine.

**From pgAdmin:** right-click the `maternalcare` database → **Query Tool**,
open `db/schema.sql`, and run it (F5).

**From the terminal**, once the migration is finished:

```bash
npm run db:reset
```

## 5. Check it worked

In pgAdmin, expand **maternalcare → Schemas → public → Tables**. You should
see 21 tables: `users`, `doctors`, `pregnancies`, `vitals`, `children`,
`growth_records`, `milestones`, `vaccinations`, `appointments`, `symptoms`,
`reminders`, `documents`, `messages`, `emergency_contacts`, `sos_alerts`,
`sos_notifications`, `articles`, `posts`, `post_comments`, `daily_logs`, `hospitals`.

---

## What changed from SQLite

| | SQLite | PostgreSQL |
|---|---|---|
| Dates | `TEXT` like `'2026-03-15'` | real `DATE` |
| Timestamps | `TEXT` ISO strings | `TIMESTAMPTZ` |
| Flags | `INTEGER` 0/1 | `BOOLEAN` |
| Auto ids | `AUTOINCREMENT` | `GENERATED ALWAYS AS IDENTITY` |
| Foreign keys | declared, **not enforced** | enforced, with `ON DELETE CASCADE` |
| Enum columns | anything accepted | `CHECK` constraints |

The API returns exactly the same JSON as before. Dates still arrive as
`'2026-03-15'` and timestamps as ISO strings, because the connection
registers type parsers that hand them back as text rather than as JavaScript
`Date` objects. That keeps every existing client working untouched.
