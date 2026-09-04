# MaternalCare+ 🤍

Maternal & child health monitoring platform — **MVC architecture**
CSE470 Software Engineering · Summer 2026 · Section 2

Pregnancy tracking, symptom journalling with voice input, appointments & reminders,
maternal vitals with automated alerts, WHO child-growth curves, vaccination scheduling,
AI risk classification, emergency SOS, knowledge base + community, and a doctor portal.

---

## Architecture

**One Model layer, one View layer.** Express holds the Models and Controllers and
exposes them as a JSON API; the React SPA is the View that consumes it. An
earlier server-rendered EJS View was removed — it predated authentication and
served patient records to anonymous requests.

```
MaternityCare+/
├── app.js                  # entry point — mounts the API routes
├── config/
│   └── database.js         # SQLite connection, schema, demo seed
├── models/                 # MODEL — data access + domain logic
│   ├── userModel.js            pregnancyModel.js    vitalModel.js
│   ├── childModel.js           vaccinationModel.js  appointmentModel.js
│   ├── riskModel.js            contentModel.js
│   ├── symptomModel.js     # Sprint 2
│   └── reminderModel.js    # Sprint 2
├── controllers/            # CONTROLLER — request handling
│   ├── dashboardController.js  pregnancyController.js  vitalsController.js
│   ├── childController.js      vaccinationController.js  …
│   └── api/                # Sprint 2 — JSON controllers for the React client
│       ├── symptomApiController.js
│       └── reminderApiController.js
├── routes/
│   └── api.js              # JSON API routes
└── frontend/               # VIEW — React + TypeScript SPA
    └── src/
        ├── pages/          # route-level screens
        ├── components/     # reusable UI
        ├── hooks/          # useDashboardData — all server I/O
        ├── lib/            # api client, health domain helpers
        └── data/           # reference data & types
```

---

## Running the project

Requires **Node.js 22+** and a PostgreSQL connection string in `.env`
(see `.env.example`). Python 3.11+ is optional — only the risk model needs it.

### 1. Database

```bash
npm run db:reset && npm run db:seed && npm run db:stages && npm run db:passwords
```

`db:reset` rebuilds the schema from `db/migrations`, `db:seed` fills it,
`db:stages` adds the three life-stage accounts the main seed does not cover,
and `db:passwords` gives every account a password.

### 2. Backend — Express MVC API

```bash
npm start
```

Runs at **http://localhost:3000**.

### 3. Frontend — React dashboard

```bash
npm --prefix frontend install && npm --prefix frontend run dev
```

Runs at **http://localhost:5173**. Start the backend first — the API needs a
session, so the React app will send you to the sign-in page without one.

### 4. Risk model — optional

```bash
npm run ml:serve
```

Runs at **http://localhost:8000**. The app works without it: the risk screen
falls back to the rule engine and says the model is not running. See
[`ml-service/README.md`](ml-service/README.md).

---

## Signing in

Every account is stored with a **scrypt** hash (N=2^17, r=8, p=1 — OWASP's
recommended minimum). The plaintext below exists only in `db/seed-passwords.js`
and here; nothing in the application stores, logs or returns it.

| Account | Email | Stage / role | What it shows |
|---|---|---|---|
| Ayesha Rahman | `ayesha@example.com` | pregnant | Week 29. The fullest record — appointments, messages, documents, SOS contacts. |
| Amena Chowdhury | `amena@stage.demo` | planning | Pre-conception. No pregnancy, no countdown. |
| Nabila Karim | `nabila@stage.demo` | new mother | Ayaan at seven weeks, with his own daily log. |
| Orpa Das | `orpa@stage.demo` | parent | Rehnuma at two and a half, growth and milestones. |

Passwords by role:

| Role | Password |
|---|---|
| mother | `demo-mother-2026` |
| clinician | `demo-clinician-2026` |
| admin | `demo-admin-2026` |

The other seeded mothers — Nusrat, Farhana, Priya, Maria, Shirin — use the same
mother password and their `firstname.lastname@example.com` address. They exist
to populate a clinician's caseload.

> These are demo credentials for a database of invented people. If this is ever
> pointed at real records, every one of these accounts has to go first — a known
> password on a medical record is the whole problem.

Each of the four dashboards is different, so signing in as each is the fastest
way to see what the app actually does. Sign out from the account menu, top right.

---

## Key screens

| URL | Screen |
|---|---|
| `localhost:5173/` | Landing page |
| `localhost:5173/register` | Registration (mother / doctor) |
| `localhost:5173/onboarding` | Onboarding questionnaire |
| **`localhost:5173/mother`** | **Mother dashboard — main Sprint 2 deliverable** |
| `localhost:5173/about` | About — scroll-driven story |
| `localhost:5173/doctor` | Clinician portal |

`localhost:3000` serves no pages. It is the API the client fetches from, and it
must be running for any of the above to load data.

---

## API

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/me` | Current demo user + pregnancy summary |
| `GET` | `/api/symptoms` | List logged symptoms |
| `PUT` | `/api/symptoms` | Replace the symptom journal |
| `POST` | `/api/symptoms` | Add one symptom |
| `PATCH` | `/api/symptoms/:id` | Update intensity / duration |
| `DELETE` | `/api/symptoms/:id` | Remove a symptom |
| `POST` | `/api/symptoms/end-entry` | End entry — next visit asks "still there?" |
| `GET` | `/api/reminders` | List reminders (`?upcoming=true` to filter) |
| `POST` | `/api/reminders` | Create a reminder |
| `DELETE` | `/api/reminders/:id` | Delete a reminder |

Quick check:

```bash
curl http://localhost:3000/api/me
```

---

## Documentation

- [Sprint 2 Report](docs/SPRINT-2-REPORT.md)
- [ADR-001 — Backend stack decision (Express vs ASP.NET Core)](docs/adr/ADR-001-backend-stack.md)

---

## Tech stack

Node.js · Express 4 · PostgreSQL (Supabase, `pg`) ·
React 18 · TypeScript · Vite · Tailwind CSS · Framer Motion · Recharts · Lucide

Django, FastAPI and Flask are **not** used.
