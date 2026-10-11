# R.I.S.E.™ Scorecard

Standalone, production-oriented build of the Balla DK **R.I.S.E.™ Financial** and **Career & Income** scorecards
(see `docs/STANDALONE_APP_DECISION.md` — this is deliberately separate from `premium-suite` / `bloomngrow`).

* Mobile-first, one question per screen, Back/edit, "I'm not sure", conditional modules, keyboard + screen-reader friendly.
* Free results preview with **no contact details**; detailed report only after an explicit request.
* **Server-side scoring** (the verified v2.0 engine, regression-locked), encrypted storage, consent records, expiring report links.
* Staff console: PDF toolkit library with versioning, four-eyes review, activate/archive, editable matching rules, leads, audit log.
* English + Bahasa Malaysia UI (privacy notice and consent in both). Question wording is English until a reviewed BM translation is added (`QUESTION_MS` in `src/client/lib/i18n.ts`).

## Quick start

```bash
npm install
npm run seed                                   # DB + 14 built-in worksheets + default matching rules
ADMIN_PASSWORD='Use-A-Strong-Passw0rd' npm run create-admin -- you@example.com "Your Name" admin
npm run dev:server        # API on :3000
npm run dev:client        # Vite on :5173 (proxies /api)  → http://localhost:5173  and /admin.html
```

Production: `npm run build && NODE_ENV=production npm start` (see `.env.example`; `DATA_ENCRYPTION_KEY` and `SIGNING_SECRET` are mandatory
and the server refuses to start without them). Public app at `/`, staff console at `/admin`.

## Commands

| Command | What it does |
|---|---|
| `npm test` | 99 unit/API tests: scoring (31), toolkits (27), public API (22), admin/RBAC/PDF workflow (19) |
| `npm run test:scoring` | 24 named cases + 10,000 random combinations compared byte-for-byte with the verbatim v2.0 engine |
| `npm run test:toolkits` | 14 templates, 360+ profile routes, 12 alert mappings vs the verbatim v3 matcher |
| `npm run test:e2e` | Playwright on a 375 px phone **and** desktop: both tracks, gate, report, worksheet, WhatsApp, erase, admin, axe-core WCAG 2.2 AA, CSP-violation guard |
| `npm run launch-check` | Exits non-zero while blocking pre-launch items remain |
| `npm run purge` | Applies retention (also runs automatically every 15 min) |

> The original `scoring_tests.js` / `test_toolkits.js` were not in the handoff bundle. The suites above are re-created to the
> acceptance criteria and validated *differentially* against the verbatim v2.0 engine and v3 matcher extracted from the standalone
> prototype (`tests/reference/`). If you have the originals, add them as extra reference tests.

## Layout

```
src/shared    pure TypeScript used by browser and server: questions, engine, plans/alert text, toolkit templates + matching rules, legal text
src/server    Express API, PostgreSQL (`pg`), crypto, auth, services (assessments, reports, toolkits), mail outbox, retention
src/client    Vite app (public flow) + admin console, self-hosted fonts, strict-CSP-safe rendering
tests         vitest (unit/API) · e2e (Playwright) · reference (golden v2.0 engine + v3 matcher, verbatim)
reference     QUESTION_BANK.csv audit copy (a test asserts the typed config matches it exactly)
docs          decision, handoff, migration plan, security notes, release checklist
```

## Key behaviours

* **Scoring**: `POST /api/assessments` validates every question/option id against the versioned config, rescores, stores the encrypted
  payload, and returns a *safe preview* (scores + headline only). The full report recalculates from stored answers on every read.
* **Unknown ≠ zero**; no overall score without all four pillars and ≥70 % coverage; severe alerts override a high score. Unchanged from v2.0.
* **One deliberate engine hardening**: answers to questions that are *not active* for the current profile are ignored (the prototype let
  stale conditional-module answers still raise alerts after a profile change). Tested in `tests/scoring.test.ts`.
* **Gate**: required processing consent and a *separate* optional marketing consent, each stored as an append-only event with notice version.
* **Report links**: 256-bit random, stored only as SHA-256, expire (default 30 days), access logged; optional `REPORT_ACCESS_MODE=email_verified`.
* **WhatsApp**: official green `#25D366`, +60 12-220 2217, user-initiated; the prefilled text is generic — no answers, scores, pillars or name in the URL.
* **Toolkits**: every result matches 1–3 safe toolkits; unknown/missing data → "Complete Your Snapshot"; deactivated/archived items are skipped and
  the fallback can never be removed. PDFs: ≤15 MB, `%PDF-` magic check, active-content screen, private storage, 10-minute signed URLs,
  uploader ≠ reviewer, optional review-expiry date after which a PDF hides itself.

## Not done / needs a decision (see docs/RELEASE_CHECKLIST.md)

Nothing has been deployed, no real lead data migrated, payments not enabled. Open items: legal review of the privacy notice and toolkit wording,
BM question translations, an email provider (`MAIL_WEBHOOK_URL`), hosting choice (Postgres for data; PDFs still use local disk, so use an S3 adapter in `storage.ts` before running more than one instance),
human usability testing before calling the score "validated".
