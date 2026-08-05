# ADR-001 — Backend stack: Node/Express MVC instead of ASP.NET Core

**Status:** Accepted
**Date:** 5 August 2026
**Deciders:** All Team Members
**Supersedes:** the Sprint 1 intention to build an ASP.NET Core backend

---

## Context

The project requires a **Model–View–Controller** architecture. Django, Flask and
FastAPI are explicitly not permitted.

During Sprint 1 the team built the platform as a **Node.js + Express + EJS** MVC
application (`models/`, `views/`, `controllers/`, `routes/`, `config/`), backed by SQLite.

Mid-project, the team decided to rebuild the client as a premium **React + TypeScript**
single-page application, and at that point proposed pairing it with an **ASP.NET Core**
backend using Clean Architecture (Repository pattern, Service layer, Dependency Injection).

By the start of Sprint 2 the situation was:

- The Express MVC backend existed, worked, and had 8 models / 10 controllers / 13 views.
- The ASP.NET Core backend **had not been started** — no solution, no project files.
  The .NET SDK was not installed on the team's development machines.
- All Sprint 2 feature work had gone into the React client, which had **no backend at all**
  and stored everything in component state (nothing persisted).

A decision was required: build the ASP.NET backend now, or consolidate on Express.

---

## Decision

**Keep Node.js + Express as the MVC backend. Do not build the ASP.NET Core backend.**

The React SPA becomes a **second View layer** that consumes a JSON API
(`routes/api.js`) served by the same Express controllers and models that serve the
EJS views.

---

## Rationale

1. **A working MVC backend already existed.** Rebuilding it in ASP.NET would have
   reproduced existing functionality rather than delivering new sprint value.
2. **The architectural requirement is MVC, not a specific language.** Express with
   `models/ + views/ + controllers/ + routes/` satisfies it directly and visibly.
3. **Time budget.** Sprint 2 capacity was needed for the 18 committed user stories.
   Introducing a new language, runtime, ORM and toolchain mid-sprint carried a high
   risk of delivering neither the backend nor the features.
4. **One language across the stack.** JavaScript/TypeScript on both sides reduces
   context-switching for a small student team.
5. **Zero-install grading.** `node:sqlite` is built into modern Node — no native
   compilation, no database server. An evaluator can clone and run with `npm start`.
6. **Reuse over duplication.** Adding an API to the existing controllers let the
   React client share `symptomModel`, `reminderModel`, `userModel` and
   `pregnancyModel` with the EJS views — a DRY outcome a separate ASP.NET service
   would have broken.

---

## Consequences

### Positive

- MVC compliance is demonstrable in one codebase, with one Model layer.
- Persistence was delivered inside Sprint 2 (SQLite via the Model layer).
- Both a server-rendered and a client-rendered View share the same domain logic —
  a strong demonstration of separation of concerns.
- Single `npm install` per package; no SDK prerequisites for graders.

### Negative

- The team does not gain ASP.NET Core / C# experience on this project.
- The Sprint 1 plan referenced ASP.NET; this ADR is the formal record of the change,
  and the Sprint 2 report must state the pivot openly.
- Express does not provide built-in Dependency Injection. Modules are wired by
  `require`, so the Repository/Service abstraction is lighter than Clean Architecture
  would give. Mitigated by keeping all data access inside models and all domain logic
  out of controllers.

### Neutral

- If ASP.NET Core is required later, the API contract in `routes/api.js` is small and
  documented, so a C# implementation could replace it without touching the React client.

---

## Alternatives considered

| Option                                        | Why rejected                                                                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Build ASP.NET Core now**                    | Highest risk. Required installing the .NET SDK, learning EF Core, and re-implementing 8 models and 10 controllers mid-sprint, with no new user-facing value. |
| **Run both backends**                         | Two sources of truth for the same data; doubles maintenance; no academic benefit.                                                                            |
| **Keep React state-only, no backend**         | Fails the MVC requirement and loses all data on refresh. This was the state at the start of Sprint 2 and is what prompted this ADR.                          |
| **Delete the Express app and go client-only** | Would remove the only MVC implementation in the project.                                                                                                     |

---

## Compliance check

| Requirement                       | Status                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------ |
| MVC architecture                  | ✅ `models/` · `views/` + `frontend/` · `controllers/` · `routes/`             |
| Django / Flask / FastAPI not used | ✅ Node.js + Express only                                                      |
| Clean, modular, maintainable      | ✅ One responsibility per model/controller; DTO mapping; no SQL outside models |
| Data persistence                  | ✅ SQLite via the Model layer                                                  |
