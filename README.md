# R.I.S.E.™ Scorecard

Standalone, production-oriented build of the Balla DK **R.I.S.E.™ Financial** and **Career & Income** scorecards
(see `docs/STANDALONE_APP_DECISION.md` — this is deliberately separate from `premium-suite` / `bloomngrow`).

* Mobile-first, one question per screen, Back/edit, "I'm not sure", conditional modules, keyboard + screen-reader friendly.
* Free results preview with **no contact details**; detailed report only after an explicit request.
* **Server-side scoring** (R.I.S.E.™ V4.3 engine with two-priority selection), complete answer check before results, encrypted storage, consent records, expiring report links.
* **V4.4 report handover**: the WhatsApp button creates a 48-hour link to the report that only signed-in staff can open; the prospect previews and sends the message.
* Staff console: the eight V4.3 planners (TK01–TK08) with PDF versioning, four-eyes review, activate/archive; shared-report view; leads; audit log.
* English + Bahasa Malaysia UI (privacy notice and consent in both). Question wording is English until a reviewed BM translation is added (`QUESTION_MS` in `src/client/lib/i18n.ts`).

## Quick start

```bash
npm install
npm run seed                                   # embedded Postgres (PGlite) + the eight V4.3 planners TK01–TK08
# production / real Postgres: export DATABASE_URL=postgres://user:pass@host:5432/db   (required when NODE_ENV=production)
ADMIN_PASSWORD='Use-A-Strong-Passw0rd' npm run create-admin -- you@example.com "Your Name" admin
npm run dev:server        # API on :3000
npm run dev:client        # Vite on :5173 (proxies /api)  → http://localhost:5173  and /admin.html
```

Production: `npm run build && NODE_ENV=production npm start` (see `.env.example`; `DATA_ENCRYPTION_KEY` and `SIGNING_SECRET` are mandatory
and the server refuses to start without them). Public app at `/`, staff console at `/admin`.

## Commands

| Command | What it does |
|---|---|
| `npm test` | 121 unit/API tests on embedded Postgres: scoring incl. the 18 V4.3 cohort scenarios (56), planners (9), public API + handover (27), admin/RBAC/PDF workflow (19), database layer (10) |
| `npm run test:pg` | The API suites against a **real Postgres server** (`TEST_DATABASE_URL`, default `postgres://postgres@localhost:5433/rise_test`), incl. concurrent uploads/boots |
| `npm run test:scoring` | V4.3's own rule tests and 18 published cohort results (scores, coverage, priorities, alerts) + 10,000 random combinations |
| `npm run test:toolkits` | TK01–TK08 catalogue, PDFs present, planner calculations, workbook content never in the client bundle |
| `npm run test:e2e` | Playwright on a 375 px phone **and** desktop: both tracks, multi-select, answer check, gate, report, planner, WhatsApp handover, erase, admin, axe-core WCAG 2.2 AA, CSP-violation guard |
| `npm run build:demo` | Builds `dist-demo/artifact.html`: one self-contained, backend-free clickable demo (real engine + toolkit rules; nothing saved) |
| `npm run launch-check` | Exits non-zero while blocking pre-launch items remain |
| `npm run purge` | Applies retention (also runs automatically every 15 min) |

> V4.3 + V4.4 were delivered as a package for a different (JS + Supabase) codebase; they were ported into this app rather than installed.
> The original package sources, question bank, cohort results and the eight PDFs are kept in `reference/v4.3/` as audit copies (not served).

## Layout

```
src/shared    pure TypeScript used by browser and server: questions, engine, two-priority selection, planner calculations, legal text
src/server    Express API, Postgres (pg; embedded PGlite for dev/tests), crypto, auth, services (assessments, reports, toolkits), mail outbox, retention
src/client    Vite app (public flow) + admin console, self-hosted fonts, strict-CSP-safe rendering
tests         vitest (unit/API) · e2e (Playwright)
reference     v4.3/ — V4.3 question bank (a test asserts the typed config matches it exactly), cohort results, original sources and PDFs
docs          decision, handoff, migration plan, security notes, release checklist
```

## Key behaviours

* **Scoring**: `POST /api/assessments` validates every question/option id against the versioned config, rescores, stores the encrypted
  payload, and returns a *safe preview* (scores + headline only). The full report recalculates from stored answers on every read.
* **Unknown ≠ zero**; an overall score needs ≥70 % coverage across at least three scored pillars (career profiles without team questions have three); severe alerts override a high score.
* **Priorities**: one or two, each tied to exactly one planner (TK01–TK08). Healthy results get a single maintenance priority, never an invented problem.
* **One deliberate engine hardening**: answers to questions that are *not active* for the current profile are ignored (the prototype let
  stale conditional-module answers still raise alerts after a profile change). Tested in `tests/scoring.test.ts`.
* **Gate**: required processing consent and a *separate* optional marketing consent, each stored as an append-only event with notice version.
* **Report links**: 256-bit random, stored only as SHA-256, expire (default 30 days), access logged; optional `REPORT_ACCESS_MODE=email_verified`.
* **WhatsApp handover**: official green `#25D366`, +60 12-220 2217, created only when tapped. The prefilled text holds first name, score, priority titles and a 48-hour staff-only link (hashed at rest, replaced on re-tap, withdrawable, deleted with the report) — never individual answers.
* **Toolkits**: a report unlocks only the 1–2 planners named by its priorities; there is no public library, and planner content is served only
  inside the report response. PDFs: ≤15 MB, `%PDF-` magic check, active-content screen, private storage, 10-minute signed URLs,
  uploader ≠ reviewer, optional review-expiry date after which a PDF hides itself.

## Not done / needs a decision (see docs/RELEASE_CHECKLIST.md)

Nothing has been deployed, no real lead data migrated, payments not enabled. Open items: legal review of the privacy notice and toolkit wording,
BM question translations, an email provider (`MAIL_WEBHOOK_URL`), hosting choice (Railway + its Postgres is configured but not deployed — see docs/RAILWAY.md),
human usability testing before calling the score "validated".
