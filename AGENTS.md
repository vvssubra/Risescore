# R.I.S.E.™ Scorecard — Codex implementation contract

## Goal
Build a production-grade, accessible, bilingual-ready (English/Bahasa Malaysia) R.I.S.E.™ Financial and Career & Income scorecard. Preserve and refactor the supplied scoring system; do not replace it with an invented assessment.

## Current source
- `engine.js`, `engine_config.json`: established scoring, branching, applicability, and alert overrides.
- `app.js`, `index.html`, `style.css`: verified browser prototype. One question per screen, progress indicator, free results preview, optional report gate, detailed report, print view.
- `toolkits.js`: initial library of 14 educational toolkit templates with matching rules.
- `toolkit_manager.html`: demonstration-only browser-local manager. **Do not expose it as a production admin interface.**
- `PRODUCTION_HANDOFF.md`: architecture and compliance requirements.

## Important invariants
1. Offer Financial and Career & Income tracks, ask one accessible question per screen, support back/edit, keyboard navigation, `I'm not sure`, and conditional branches. Don't ask all questions at once.
2. Correctness first: preserve the risk/critical-alert rules and 'unknown is not zero' behavior. Don't invent score results when evidence is insufficient. Recalculate and validate on server.
3. Results preview must be available without an email/phone gate. Detailed personal report only after explicit request; keep marketing consent separate from necessary data-processing acknowledgment.
4. Use premium responsive design (strong editorial typography, whitespace, navy/ivory/gold) and WhatsApp official green `#25D366`. WhatsApp action is user-initiated and prefilled; do not transmit private assessment answers in URL.
5. Every eligible result should match a safe toolkit, including unknown/missing data and warning pathways. Toolkit content is educational, not personalized regulated advice.
6. Secure admin toolkit library: staff login, admin roles, PDF upload, title/description, publishing review, versioning, activate/deactivate and rule assignment. No localStorage-only admin in production.
7. Protect personal information: minimum collection, privacy notice EN/BM, opt-in logging, retention/deletion, report access tokens with expiry, storage encryption, rate limiting and basic abuse protection.
8. Maintain accessible input labels, visible focus, adequate contrast, screen reader alerts, and mobile layouts.
9. Never assert professional accreditation, CFP certification, product eligibility, returns or career income promises without review.

## Implementation milestones
A. Inspect and run baseline; record results. Fix critical bugs before migration.
B. Convert the prototype to a modular TypeScript web app if suitable for the target repo; separate question config, pure scoring engine, flow components, report pages and toolkit matching.
C. Add test coverage (unit scoring, alert routes, module routing; browser end-to-end both tracks; mobile viewport; gate privacy controls and toolkit rendering).
D. Implement authenticated backend and persistent data. Choose services based on repo's existing stack. Never put service-role keys in client code.
E. Add professional PDF report export and secure published PDF toolkit links; management interface admin-only.
F. Ship staging deployment, security checks, WCAG review, consent verification, and documented release checklist.

## Acceptance criteria
- `node scoring_tests.js` succeeds with 24 test cases and 10,000 random combinations.
- `node test_toolkits.js` succeeds with all 14 templates, 360 profile routes and 12 alert mappings.
- User may complete either track on a 375px mobile viewport with one question per screen.
- Score preview does not require contact fields; incomplete assessments do not generate falsely precise scores.
- Detailed report includes 4 pillar analyses, next best step, alerts, 3 actions and relevant toolkits.
- WhatsApp button has `#25D366` and the correct contact number +60122202217.
- Production gate submits to a secure endpoint and has separate marketing opt-in; no claim that prototype gate is live.
- Admin can safely upload, review, publish, archive and match PDFs without code changes.

## Commands
- `node scoring_tests.js`
- `node test_toolkits.js`
- To preview as a static site: `python3 -m http.server 8080` then visit http://localhost:8080

Do not deploy or modify an existing production site without explicitly confirming deployment target and access.
