# MaternalCare+ 🤍

Maternal & child health monitoring platform — **MVC architecture**
CSE470 Software Engineering · Summer 2026 · Section 2

Pregnancy tracking, symptom journalling with voice input, appointments & reminders,
maternal vitals with automated alerts, WHO child-growth curves, vaccination scheduling,
AI risk classification, emergency SOS, knowledge base + community, and a doctor portal.

---

## Architecture

**One Model layer, two View layers.** The server-rendered EJS pages and the React SPA
both go through the same controllers and models — no data logic is duplicated.

```
MaternityCare+/
├── app.js                  # entry point — mounts web + api routes
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
│   ├── web.js              # server-rendered page routes
│   └── api.js              # JSON API routes  (Sprint 2)
├── views/                  # VIEW (server) — EJS templates
└── frontend/               # VIEW (client) — React + TypeScript SPA
    └── src/
        ├── pages/          # route-level screens
        ├── components/     # reusable UI
        ├── hooks/          # useDashboardData — all server I/O
        ├── lib/            # api client, health domain helpers
        └── data/           # reference data & types
```

---

## Running the project

Requires **Node.js 22+** (uses the built-in `node:sqlite` module).

### 1. Backend — Express MVC API + EJS pages

```bash
npm install
npm start
```

Runs at **http://localhost:3000**. The SQLite database is created and seeded
automatically on first run. Delete `data/maternitycare.db` to reseed.

### 2. Frontend — React dashboard

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Runs at **http://localhost:5173**

> Start the backend **first**. If it is not running the React app still loads with local
> demo data and reports an offline state — it just will not persist anything.

---

## Key screens

| URL | Screen |
|---|---|
| `localhost:5173/` | Landing page |
| `localhost:5173/register` | Registration (mother / doctor) |
| `localhost:5173/onboarding` | Onboarding questionnaire |
| **`localhost:5173/mother`** | **Mother dashboard — main Sprint 2 deliverable** |
| `localhost:5173/about` | About — scroll-driven story |
| `localhost:3000/dashboard` | Server-rendered EJS dashboard |
| `localhost:3000/vitals` | Vitals logging + trend charts |
| `localhost:3000/child` | Growth recorder + WHO percentile chart |
| `localhost:3000/doctor` | Doctor portal |

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

Node.js · Express 4 · EJS · SQLite (`node:sqlite`) · Chart.js ·
React 18 · TypeScript · Vite · Tailwind CSS · Framer Motion · Recharts · Lucide

Django, FastAPI and Flask are **not** used.
