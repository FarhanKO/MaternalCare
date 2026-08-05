# MaternalCare+ — Sprint 2 Report

**Course:** CSE470 — Software Engineering (Summer 2026, Section 2)
**Project:** MaternalCare+ — Maternal & Child Health Monitoring Platform
**Sprint:** 2
**Sprint duration:** <!-- FILL: e.g. 15 July 2026 – 5 August 2026 -->
**Report date:** <!-- FILL -->

> **Fill before submission:** every `<!-- FILL -->` marker. These are team-specific
> facts (names, dates, meeting records) that must come from your own sprint.

---

## 1. Team

| Role | Member | Student ID | Main responsibility this sprint |
|---|---|---|---|
| Scrum Master | <!-- FILL --> | <!-- FILL --> | Sprint facilitation, backlog grooming, report |
| Product Owner | <!-- FILL --> | <!-- FILL --> | Requirements, acceptance criteria |
| Developer | <!-- FILL --> | <!-- FILL --> | Backend (Models, Controllers, API) |
| Developer | <!-- FILL --> | <!-- FILL --> | Frontend (React views, components) |
| Developer / QA | <!-- FILL --> | <!-- FILL --> | Testing, integration verification |

---

## 2. Sprint Goal

> **"Turn the static prototype into a working, persistent maternal health dashboard —
> where a mother can record how she feels, get guidance back, and schedule her care,
> with every entry surviving a restart."**

Sprint 1 delivered the presentation layer (landing, registration, onboarding). Sprint 2
had to make the product *do* something: capture real input, persist it, and reason over it.

---

## 3. Sprint Backlog — User Stories

Story points use a modified Fibonacci scale (1, 2, 3, 5, 8, 13).

| # | User Story | Points | Status |
|---|---|---|---|
| US-01 | As a mother, I want a dashboard showing my pregnancy week and baby's size so I can see progress at a glance. | 5 | ✅ Done |
| US-02 | As a mother, I want to log symptoms by **voice** so I can record how I feel without typing. | 8 | ✅ Done |
| US-03 | As a mother, I want to log symptoms by typing and pick an intensity so my record is accurate. | 5 | ✅ Done |
| US-04 | As a mother, I want the app to tell me **possible causes and immediate relief** after logging. | 8 | ✅ Done |
| US-05 | As a mother, I want to be asked whether earlier symptoms are **still present** so duration is tracked. | 5 | ✅ Done |
| US-06 | As a mother, I want advice to **escalate** if a symptom persists, so I know when to contact a doctor. | 8 | ✅ Done |
| US-07 | As a mother, I want to record my **mood** each day from a set of options. | 3 | ✅ Done |
| US-08 | As a mother, I want to count **baby kicks** and know if the count is normal. | 3 | ✅ Done |
| US-09 | As a mother, I want to track **water intake** in glasses with colour-coded risk feedback. | 3 | ✅ Done |
| US-10 | As a mother, I want to create **appointments and reminders** (medicine, doctor, test, exercise). | 8 | ✅ Done |
| US-11 | As a mother, I want to pick a date on a **calendar** and a time on a **clock** when scheduling. | 8 | ✅ Done |
| US-12 | As a mother, I want a **health monitor** that combines my entries into a wellbeing score. | 8 | ✅ Done |
| US-13 | As a mother, I want to know **what's coming next** in my care (screenings, vaccines, scans). | 5 | ✅ Done |
| US-14 | As a mother, I want **charts** of weight, growth, blood pressure, heart rate, sleep and nutrition. | 8 | ✅ Done |
| US-15 | As a mother, I want my data to **persist** so nothing is lost when I close the app. | 8 | ✅ Done |
| US-16 | As a user, I want a **loading indicator** so I know the app is working. | 2 | ✅ Done |
| US-17 | As a user, I want the app to greet me correctly for **my local time of day**. | 2 | ✅ Done |
| US-18 | As a visitor, I want an **About page** that explains the product's purpose emotionally. | 5 | ✅ Done |

**Committed:** 102 points **Completed:** 102 points

<!-- FILL: if any story was NOT completed, move it here and explain honestly.
     A sprint with 100% completion and no carry-over can look unrealistic to an
     evaluator — if something slipped, say so. -->

---

## 4. Features Delivered (18)

| # | Feature | Where |
|---|---|---|
| 1 | Pregnancy dashboard with 40-week progress arc | `frontend/src/pages/Mother.tsx` |
| 2 | Voice-driven symptom capture (Web Speech API) | `components/mother/SymptomModal.tsx` |
| 3 | Keyword extraction of symptoms from speech | `frontend/src/data/symptoms.ts` |
| 4 | Manual symptom entry with 4 intensity levels | `components/mother/SymptomModal.tsx` |
| 5 | AI-style "thinking" analysis stage | `components/ui/AITextLoading.tsx` |
| 6 | Causes + immediate relief guidance per symptom | `frontend/src/lib/health.ts` |
| 7 | Symptom persistence check ("still there?") | `components/mother/SymptomModal.tsx` |
| 8 | Duration-based escalation → doctor report | `lib/health.ts` (`doctorReport`) |
| 9 | Mood tracker (8 states) | `pages/Mother.tsx` (`MoodCard`) |
| 10 | Baby kick counter with range feedback | `pages/Mother.tsx` (`CounterCard`) |
| 11 | Hydration tracker (glasses + risk colours) | `lib/health.ts` (`waterStatus`) |
| 12 | Appointments & reminders (4 categories) | `components/mother/AppointmentModal.tsx` |
| 13 | Month calendar picker with event markers | `AppointmentModal.tsx` (`MonthGrid`) |
| 14 | Analog clock time picker | `AppointmentModal.tsx` (`ClockPicker`) |
| 15 | Health monitor & wellbeing score | `lib/health.ts` (`buildReport`) |
| 16 | Care forecast & stage-specific advice | `lib/health.ts` (`buildForecast`) |
| 17 | Nine data visualisations (Recharts) | `pages/Mother.tsx` |
| 18 | REST API + SQLite persistence | `routes/api.js`, `models/`, `controllers/api/` |

---

## 5. Architecture — MVC

The system follows **Model–View–Controller**. Sprint 2's main architectural work was
introducing a JSON API so that a second View technology (React) could share the
**same Model layer** as the server-rendered EJS views.

```
                    ┌──────────────────────────────┐
                    │          MODELS              │
                    │  userModel   pregnancyModel  │
                    │  vitalModel  symptomModel    │
                    │  childModel  reminderModel   │
                    │  …  (data access + domain    │
                    │       logic, SQLite-backed)  │
                    └───────────────┬──────────────┘
                                    │  (only models touch the DB)
                    ┌───────────────┴──────────────┐
                    │        CONTROLLERS           │
                    │  web:  dashboard, pregnancy, │
                    │        vitals, child, …      │
                    │  api:  symptomApiController  │
                    │        reminderApiController │
                    └───────┬──────────────┬───────┘
                            │              │
                  routes/web.js        routes/api.js
                            │              │
                    ┌───────┴────┐   ┌─────┴─────────────┐
                    │   VIEWS    │   │   VIEWS (client)  │
                    │ EJS pages  │   │  React SPA        │
                    │ /views     │   │  /frontend        │
                    └────────────┘   └───────────────────┘
```

### Design principles applied

| Principle | How it is honoured |
|---|---|
| **Separation of concerns** | Controllers never run SQL; models never touch `req`/`res`; views never contain business rules. |
| **Single Responsibility** | One model per domain entity; one controller per resource. |
| **DRY** | `symptomModel` and `reminderModel` serve both the EJS and API controllers — no duplicated data logic. |
| **Thin controllers, fat models** | Domain logic (`symptomModel.burden()`, `reminderModel.next()`) lives in the Model layer. |
| **Layered dependency direction** | Routes → Controllers → Models → DB. No upward dependencies. |
| **Data Transfer Objects** | Models expose `toDTO()` so the DB schema (`days_present`) is decoupled from the API contract (`daysPresent`). |
| **Modularity (client)** | React presentation is split into `pages/`, `components/`, `hooks/`, `lib/`, `data/`; `useDashboardData` isolates all server I/O from the view components. |

### Request lifecycle example — saving a reminder

1. **View** — the mother picks a date and time in `AppointmentModal`.
2. `useDashboardData.changeReminders()` calls `api.createReminder()` (`lib/api.ts`).
3. `POST /api/reminders` → **routes/api.js**.
4. **Controller** `reminderApiController.create` reads the request, delegates.
5. **Model** `reminderModel.create()` validates the kind/repeat and writes to SQLite.
6. The created DTO returns up the chain and the view re-renders.

---

## 6. Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| Model | Node.js + `node:sqlite` | Zero native dependencies; portable for grading. |
| Controller | Express 4 | Minimal, explicit MVC routing. |
| View (server) | EJS | Server-rendered pages for the original MVC scope. |
| View (client) | React 18 + TypeScript + Vite | Rich, interactive dashboard. |
| Styling | Tailwind CSS | Consistent design system. |
| Motion | Framer Motion | Transitions and micro-interactions. |
| Charts | Recharts | Health data visualisation. |

---

## 7. Sprint Ceremonies

| Ceremony | Date | Notes |
|---|---|---|
| Sprint Planning | <!-- FILL --> | <!-- FILL: what was committed and why --> |
| Daily Stand-ups | <!-- FILL: frequency --> | <!-- FILL: format, e.g. 10-min async on Discord --> |
| Sprint Review | <!-- FILL --> | <!-- FILL: what was demoed, who attended --> |
| Sprint Retrospective | <!-- FILL --> | See §9 |

---

## 8. Challenges & Resolutions

| Challenge | Impact | Resolution |
|---|---|---|
| **Two disconnected codebases.** The React client held all Sprint 2 features but had no backend; the Express MVC app had no Sprint 2 features. | MVC compliance at risk; nothing persisted. | Added `routes/api.js` + API controllers so React consumes the existing Model layer. One Model, two Views. |
| **Modal overlay blocked all page clicks.** `AnimatePresence` kept a full-screen overlay mounted because the wrapper had no `exit` animation, and child exits animated `backdrop-filter`, which never resolved. | Entire dashboard became unusable after opening the symptom logger. | Moved the `exit` to the wrapper (opacity + `pointer-events: none`) and removed filter animations from exit paths. |
| **Browser speech recognition is not universal.** | Voice logging unavailable in some browsers. | Feature-detected `SpeechRecognition`; falls back to typed entry with an explicit message rather than failing silently. |
| **Sentence-level intensity detection.** "really bad headache and mild swelling" tagged *both* as high. | Inaccurate severity. | Documented limitation; users can correct intensity per symptom. Per-clause parsing deferred to Sprint 3. |
| **Backdrop blur appeared abruptly.** | Poor perceived quality. | Animated `backdropFilter` 0→18px instead of applying a static class. |

---

## 9. Sprint Retrospective

**What went well**
- The MVC refactor unblocked persistence and architecture compliance in one change.
- Component library (`GlassCard`, `LiquidButton`, `Reveal`) made new screens fast to build.
- <!-- FILL: a team-process win, e.g. "daily async stand-ups kept blockers visible" -->

**What did not go well**
- The client was built for several iterations before any backend existed, creating rework.
- No automated tests — all verification was manual.
- <!-- FILL: a team-process issue, e.g. "task ownership was unclear mid-sprint" -->

**Actions for Sprint 3**
1. Write integration tests for the API endpoints.
2. Replace the demo single-user session with real authentication.
3. Agree the API contract *before* building UI for a feature.
4. <!-- FILL -->

---

## 10. Definition of Done

A story is Done when: it meets its acceptance criteria; follows the MVC layering;
persists through the Model layer where applicable; has been manually verified in the
browser; contains no console errors; and is responsive on mobile and desktop.

---

## 11. Sprint 3 — Planned

| Item | Points (est.) |
|---|---|
| Authentication & multi-user sessions | 13 |
| Doctor portal (clinician view of mother's data) | 13 |
| Child growth monitoring module | 8 |
| Community / Q&A module | 8 |
| Automated API tests | 5 |

---

## Appendix A — Running the project

See [`README.md`](../README.md).

## Appendix B — Architecture decisions

See [`docs/adr/ADR-001-backend-stack.md`](adr/ADR-001-backend-stack.md).
