# MaternalCare+ — audit against the project proposal

Audited 26 August 2026, at commit `ccc08cc`, against *MaternalCare+ — Maternity
and Childcare monitoring Platform*.

Every claim below was checked against running code, not against memory. Where a
feature is marked partial the specific missing piece is named, and where
something is built but *wrong* it is listed as a defect rather than as done —
a feature that returns a confident wrong answer is worse than one that is
absent, because nobody goes looking for it.

| | |
|---|---|
| **Built** | 15 of 20 |
| **Partial** | 4 of 20 |
| **Not built** | 1 of 20 |
| **Defects found in "built" features** | 1 (F5, below) |
| Verification at this commit | 137 model tests · 144 API audit · 13 ML service tests |

---

## Requirement 1 — Pregnancy & Maternal Health Monitoring

### F1 · Pregnancy week tracker — **built**
Gestational age and EDD derived from LMP in `pregnancyModel`, with height and
pre-pregnancy weight driving a BMI-banded weight-gain range (IOM tables). Week,
trimester and progress are computed server-side, so no screen can drift from
another.

### F2 · Daily maternal vital logging — **built**
Blood pressure, glucose, weight and temperature, plus fetal heart rate and
(added for F13) maternal pulse. Validation lives in `vitalModel`, not the form.

### F3 · Health trend dashboard with automated alerts — **built**
Historical charts from real rows, and `vitalModel.alerts()` raising on
thresholds including a severe-BP/pre-eclampsia flag. Alerts read each
measurement's own newest non-null value, so a weight-only entry can no longer
hide an abnormal glucose.

---

## Requirement 2 — Child Growth & Development Monitoring

### F4 · Child growth recorder — **built**
Height, weight and head circumference over time in `growth_records`.

### F5 · WHO percentile comparator — **built, with a defect**

> **Defect — `models/childModel.js`, `percentileSummary()`**
>
> The comparator holds one reference table, `WHO_WEIGHT_GIRLS`, and uses it
> unconditionally. It never reads the child's sex, although `children.gender`
> is recorded. A boy is silently plotted against girls' curves and told
> "healthy range" or "below the 3rd percentile" on the wrong reference.
>
> It also covers **weight-for-age only**. F4 records height and head
> circumference; neither has a curve, so two thirds of what is measured is
> never compared to anything.
>
> This is the same class of problem as the fabricated nutrition panel removed
> in F14 — a confident number with nothing behind it. It reads as working
> because the seeded child is female.

**To close it:** add boys' weight-for-age, plus length/height-for-age and
head-circumference-for-age for both sexes, and branch on `children.gender`.
Roughly half a day, mostly transcribing WHO tables.

### F6 · Developmental milestone tracker — **built**
`milestones` table with per-child achieved state, toggled from the child screen.

---

## Requirement 3 — Vaccination & Medication Management

### F7 · Personalized vaccination scheduler — **built**
Maternal and child timelines generated per account, following the Bangladesh
EPI schedule and standard maternal immunisation guidance.

### F8 · Smart reminder system — **partial**

Reminders exist, are scheduled, and surface in an in-app notification bell with
an escalating missed-days counter. What the proposal asks for and does not
exist is **notification delivery when the app is closed** — no push, no SMS, no
email. A reminder a mother only sees when she opens the app is a to-do list,
not a reminder.

**To close it:** Web Push for the browser (service worker + VAPID keys), or
FCM for the Guardian Android app. FCM needs a Firebase project that only you
can create. SMS would reach the most users in Bangladesh and costs money per
message.

### F9 · Digital vaccination record manager — **built**
Mark a dose given, and file the card that proves it *against that dose*
(`documents.vaccination_id`). Cards appear in the health report. An EJS control
that toasted "Document attached to your record" and stored nothing was removed.

---

## Requirement 4 — Appointment & Healthcare Services

### F10 · Doctor directory — **built, scope changed on your instruction**

The proposal says "with filtering by specialty, availability, ratings, and
location". You directed that filters be removed and everything weighed
automatically, and that hospitals not be listed at all.

As built: one ranking orders every clinician by qualification, availability,
rating and measured response time, and each card states in words why it sits
where it does. Nobody is hidden. Filters were removed from both the React and
the server-rendered views. Location is gone entirely — consultations are by
video, and a registering doctor cannot state their distance from a mother who
has not signed up yet.

**Deviation to be ready to defend in a viva:** "healthcare facility directory"
and "location" are in the proposal and are deliberately not in the product.
The reasoning — that naming real hospitals implies an affiliation this platform
does not have, and that an unmaintained directory on an emergency screen is
dangerous — is recorded in migration `0008_drop_hospitals.sql`.

### F11 · Appointment booking and management — **built**
Reserve, **reschedule** (which did not exist at all) and cancel, from both
sides. Moves are limited to three per appointment for a mother so a queue
position cannot be held indefinitely; every move is recorded with who, from
where, and why. Cancelling now records a reason from a per-side vocabulary.
Ending the care relationship is a separate act, available to both sides, with a
reason and a written note — a clinician must write one, a mother need not.

### F12 · Digital medical history dashboard — **built**
Past consultations, prescriptions, uploaded reports and upcoming appointments,
with a date-ordered timeline and per-document viewer, visible to the mother and
on the clinician's patient view.

---

## Requirement 5 — AI-Powered Decision Support

### F13 · ML risk prediction, multi-language, voice — **partial (2 of 3)**

**Machine learning on FastAPI — built.** A separate Python service
(`ml-service/`) serving a scikit-learn random forest trained on the UCI
Maternal Health Risk dataset. It is reported *beside* the rule engine rather
than replacing it, because the rules explain themselves and the F14 care plan
is composed from their individual factors. The app degrades to rules alone when
the service is down, and the API audit passes in both states.

Honest scoring is published at `GET /risk/model`: **f1 0.64 / 65% accuracy**
de-duplicated, against 0.75 with the dataset's 563 duplicate rows left in —
which is how most published results on this dataset reach 85–90%.

**Multi-language — partial.** Bangla covers the mother's navigation, the risk
assessment (including the clinical sentences composed server-side) and the
shared vocabulary for SOS, vitals, check-in, reminders and community. Her
choice is stored on her account, so it follows her to another device.

Not yet translated: the ~120 care-plan advice strings in `guidanceModel`, the
marketing site, and the clinician portal. The advice strings are health
guidance and should be reviewed by someone clinically qualified before they
ship — that is a decision for you, not a task I should quietly complete.

**Voice assistant — barely started.** `SpeechRecognition` exists in the symptom
logger only, with `lang` hardcoded to `en-US`. Nothing reads anything aloud.

**To close it:** `SpeechSynthesis` read-aloud for the care plan and risk result
(the piece that actually serves a low-literacy user), and set `rec.lang` from
the chosen language. Note that Bangla speech support is patchy — recognition
works in Chrome on some platforms, and Bangla synthesis voices are frequently
not installed on the device. Build it to say so rather than silently doing
nothing.

### F14 · Personalized nutrition, exercise and lifestyle — **built**
Composed from her stage, her *risk drivers* (not just the level), her recorded
conditions, her weight gain and seven days of her own log. Every line names the
reading that produced it. A high-risk profile is given **no exercise
programme** — that branch hands the decision to her obstetrician, and it is
tested directly.

Replaced three hardcoded arrays of four tips and a "Nutrition today · % of
daily goal" panel whose five progress bars were written into the source. This
app has never had food logging; those numbers could not have been measured.

### F15 · Downloadable PDF health report — **built**
Multi-page PDF via PDFKit with hand-drawn vector charts, covering profile,
pregnancy, vitals, daily activity, symptoms, appointments, vaccinations, filed
documents and the risk assessment. Available from the mother's screens and the
clinician's patient view.

**Known limitation:** a report or card uploaded as a **PDF** appears as a named
reference box rather than an embedded page; images embed correctly. Fixable
with `pdf-lib` — roughly two hours.

---

## Requirement 6 — Emergency Assistance & Community Support

### F16 · One-touch Emergency SOS — **partial**

Built: one-touch alert, live location shared with chosen contacts, fan-out to
clinicians and guardians, national emergency number, and a Guardian companion
app that receives the alert.

Not built: **the voice assistant** the proposal specifies ("Voice assistant
force active"). Hands-free activation is the single most defensible voice
feature in the whole product — a woman who cannot reach or see her phone is
exactly the case SOS exists for.

Also removed on your instruction: the "nearby hospitals and ambulance services"
list. It was four named institutions with placeholder phone numbers, and a
wrong number on that screen costs a woman the minutes she has.

### F17 · Educational knowledge base — **built**
Eight doctor-reviewed articles with categories and reading times, plus
per-week pregnancy tips. Content is stage-aware.

### F18 · Moderated community forum — **built**
Posts, comments, images and hearts, all DB-backed. Reporting with reasons
weighted for this domain — unsafe medical advice counts heaviest and sorts to
the top of a clinician's queue. Upholding a report hides rather than deletes,
so a decision can be reviewed, explained or reversed; removed replies leave a
tombstone so threads still read as conversations.

Before this, the board had claimed "Posts are moderated · clinician-reviewed"
in two places with no report button, no queue and no way to remove anything.

---

## Requirement 7 — Doctor & Administrative Portal

### F19 · Doctor dashboard — **built**
Assigned patient profiles, health trends, risk reports (both engines),
consultation history, request inbox, messaging, patient files, the moderation
queue, and the care-ending record showing why patients have left.

### F20 · Caregiver and Administration Portal — **partial (caregiver only)**

The caregiver half is built: a separate Guardian app, token-linked, receiving
emergency alerts, vitals and reminders.

The **administration portal does not exist**. The proposal asks it to manage
doctor verification, user accounts, reported content and platform operations.
Of those, only reported content has a home (in the clinician portal). The
`users.role` column already allows `'admin'` and nothing uses it.

Worth knowing: **doctor verification is currently a claim, not a check.**
Registration stores a licence number and the interface says plainly that nobody
is checking it against a register. That honesty is deliberate, but it is the
gap the admin portal was meant to fill.

---

# Non-functional requirements

The proposal has no non-functional section. These are the qualities its own
feature list implies — a platform that holds medical records, sends emergency
alerts and claims moderation is making non-functional promises whether or not
it writes them down.

| Quality | Implied by | State |
|---|---|---|
| **Authentication** | F19 "secure access", F20 user accounts | **Absent** |
| Authorisation | F19, F20 | Partial — patient-scoped endpoints check the caseload |
| Data protection at rest | All medical records | Partial — RLS denies PostgREST; no field encryption |
| Transport security | All | Absent locally; TLS is the host's job in production |
| Availability | F16 SOS | Good — no single service can take the app down |
| Performance | F3 trends, F10 ranking | Good — N+1 queries collapsed, indexed hot paths |
| Auditability | F18 moderation, F11 endings | Good — decisions record who, when and why |
| Accessibility | F13 multi-language, target users | Partial — Bangla started, no screen-reader pass |
| Data honesty | Everything clinical | Enforced throughout — see below |
| Testability | — | Good — 294 assertions across three suites |

### The one that matters most: there is no authentication

`userModel.current()` returns the first seeded mother. Every request is that
mother. The clinician portal is reachable by anyone who visits `/doctor`, and
`GET /api/patients/2` will return a patient record to an unauthenticated
stranger.

This is fine for a demo and is disqualifying for anything else. It is listed
first under production work below.

### Data honesty as a standing rule

A recurring theme in this project has been removing things that *looked* like
working features but measured or stored nothing: fabricated nutrient
percentages, a moderation claim with no moderation, an upload control that
saved nothing, hospital phone numbers that were placeholders, a "verified
credentials" promise nobody was keeping.

The rule applied throughout: **an interface element is a claim.** A progress bar
claims measurement; a "Reported" button claims someone will read it. Where the
system cannot honour the claim, the element is removed or the limitation is
stated where the user can see it. F5 above is the last known violation.

---

# Production-level improvements — immediate

Ordered by what would stop this being deployable to a real mother tomorrow.

### 1. Authentication and sessions — **blocking**
Real accounts, password hashing (argon2 or bcrypt), server-side sessions or
JWTs, and a middleware that resolves the current user from the session instead
of `SELECT ... LIMIT 1`. Every `/api` route needs an authorisation check;
clinician routes need a role gate. Nothing else on this list matters until this
is done. *2–3 days.*

### 2. Fix the WHO percentile defect — **blocking for child users**
F5 above. A silently wrong growth assessment is worse than none. *Half a day.*

### 3. Transport and headers
TLS termination, HSTS, `helmet` for security headers, a real CORS allow-list
instead of the current permissive handler, and cookies marked `Secure`,
`HttpOnly`, `SameSite`. *Half a day.*

### 4. Rate limiting and abuse control
Nothing throttles anything. The SOS endpoint, the report endpoint, login (once
it exists) and the PDF generator are all trivially floodable, and the PDF
route is expensive per call. *Half a day.*

### 5. Upload hardening
Files are validated by declared MIME and written to disk under a UUID. Add
magic-byte sniffing, a per-account quota, virus scanning if budget allows, and
move storage to object storage (S3/Supabase Storage) so the app tier stays
stateless. Also: deleting a post currently orphans its image on disk. *1 day.*

### 6. Secrets and configuration
`DATABASE_URL` is read from `.env`. In production it belongs in a secret
manager with rotation. The Supabase service key must never reach a client
bundle. *Half a day.*

### 7. Backups and recovery
No backup policy is written down. Medical records need point-in-time recovery,
a tested restore, and a stated retention period. Supabase provides the
mechanism; the policy and the *tested* restore are yours. *Half a day.*

### 8. Observability
No structured logging, no error tracking, no uptime monitoring. For a service
with an SOS button, an alert that silently fails is the worst possible failure
and nothing would currently notice. Add structured request logs, Sentry or
equivalent, and a health check on each service. *1 day.*

### 9. Data protection compliance
A privacy policy, a lawful basis for processing, a data-subject export and
delete path, and a retention schedule. Bangladesh's Digital Security Act and —
if any user is in the EU — GDPR both apply to health data. This is paperwork,
but it is not optional. *Depends on legal input.*

### 10. CI
The three test suites are run by hand. They should run on every push, with the
ML service started in the pipeline so the F13 integration is covered in both
its up and down states. *Half a day.*

### Deliberately not on this list

**Scaling.** There is no traffic. Connection pooling is already in place and
the N+1 queries are collapsed; anything further is speculative work against a
load that does not exist.

**Migrating off the rule engine.** The trained model is not accurate enough to
stand alone on this data, and the rule engine is what makes the care plan
explainable. Keeping both is the design, not a transitional state.

---

## Summary

| Status | Features |
|---|---|
| **Built** | F1, F2, F3, F4, F6, F7, F9, F10, F11, F12, F14, F15, F17, F18, F19 |
| **Built with a defect** | F5 — sex-blind growth curves, weight only |
| **Partial** | F8 (no delivery when closed) · F13 (voice barely started, translation incomplete) · F16 (no voice) · F20 (no admin portal) |
| **Not built** | — |

Two proposal items are deliberately absent on your instruction and should be
defended rather than hidden: **hospital/facility listings and location-based
filtering** (F10, F16).
