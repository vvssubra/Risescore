# Migration plan & status

Target: new private repo `rise-scorecard` (this repository is the working tree). Nothing else is touched.

| Milestone (AGENTS.md) | Status |
|---|---|
| A Baseline & critical bugs | Done. Prototype engine/matcher extracted verbatim as golden reference. Found + fixed: stale conditional-module answers could raise alerts after a profile change. Fonts were loaded from Google (third-party IP leak) → self-hosted. Prototype grey text failed WCAG AA (down to 2.2:1) → fixed. |
| B Modular TypeScript app | Done: question config, pure engine, flow views, report, toolkit matching are separate modules. |
| C Tests | Done: unit, differential, API, privacy, RBAC, e2e on 375 px + desktop, axe, CSP guard. |
| D Authenticated backend + persistence | Done on node:sqlite (single-instance). No service-role keys in client code. |
| E PDF export + secure toolkit links | Secure signed links and print-to-PDF done. A server-rendered branded PDF *report* is **not** built (browser "Save as PDF" is the current route). |
| F Staging, security, WCAG, consent verification, checklist | Checklist + `launch-check` provided; staging deployment awaits your hosting decision and approval. |

## Decisions I made (change freely)
1. **SQLite + local disk** (zero native deps, simple ops). Repository code is plain SQL; moving to Postgres/S3 means swapping `db.ts` and `storage.ts`.
2. **Email via encrypted outbox + generic webhook** rather than choosing a vendor. Until configured, report emails stay queued (the on-screen link still works in `immediate` mode).
3. **Report link returned immediately** after the gate (`REPORT_ACCESS_MODE=immediate`); flip to `email_verified` if you want proof of email ownership first.
4. Retention defaults: unrequested assessments 90 days, report requests 365 days, audit 730 days — set by counsel.
