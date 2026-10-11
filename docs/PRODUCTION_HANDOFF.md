# R.I.S.E.™ Scorecard v3 — Production Handoff

## Public customer journey
1. Welcome: high-contrast brand typography and one primary CTA.
2. Assessment selection: Financial or Career & Income.
3. Profile: one profile question per screen. Contextual selection determines module routing. Profile data must never independently change scores.
4. Assessment: one scored question per screen; select to auto-advance with a short pause; Previous and `I'm not sure` supported. Up to 15 core questions + relevant conditional module questions.
5. Free preview: overall score if eligible, pillar overview, next priority and headline, even before contact details.
6. Gate: contact form for requesting the detailed report. Required processing acknowledgement vs separate optional marketing checkbox. In the demo no data leaves the device and nothing is emailed.
7. Full result: narrative, four pillars, alert panel, three actions, toolkit matching, user-initiated WhatsApp and browser print-to-PDF.
8. Worksheet: 5-step interactive prompt framework; browser print-to-PDF for personal use. Avoid gathering private account identifiers or passwords.

## Architecture
- `engine.js`: tested scoring and guardrails from v2.0; must be re-run server-side in production.
- `toolkits.js`: 14 curated original educational worksheets; `RISE_TOOLKITS.match(result,profile)` chooses relevant 1–3 templates based on priority/alert/goal, including the missing-data fallback.
- `app.js`: the UI state machine and contact flow.
- `style.css`: responsive visual system.
- `toolkit_manager.html`: development-only library editor, not secure for publication.
- `RISE_Scorecard_Premium_Standalone.html`: all display and engine assets embedded, for offline preview; the actual production deployment should use separate assets for caching and updates.

## Secure backend requirements (NOT implemented)
Suggested production entities:
- `assessments`: uuid, scorecard_version, category, created_at, timestamps, minimal stored response map if retention is justified, derived pillar scores/flags, session token/hash; user ownership if accounts exist.
- `report_requests`: assessment_uuid, recipient name, contact email, privacy_notice_version, processing consent timestamp, marketing_opt_in boolean, source campaign with consent, delivery status.
- `toolkits`: id, display title, description, scope category/pillar, locale, status, file reference/URL, version, review/expiry date, approved_by, updated_at.
- `toolkit_rules`: priority, flag or interest routing to active toolkit version.
- `report_access`: expiring signed token and access events, prevent link sharing to other participants where necessary.

All APIs must validate question ids and option ids against versioned server configuration, recalculate scores server-side, and handle abuse and rate limits. Avoid putting confidential answers in URL parameters or WhatsApp copy. Collect the minimum necessary. Implement retention and deletion policy, TLS, administrator roles, content review and secure object storage.

Suggested endpoints:
`POST /api/assessments` -> server calculates results, responds with ephemeral id and safe preview.
`POST /api/report-requests` -> validates gate submission and consent versions, sends email verification if appropriate and returns report access flow.
`GET /api/reports/:token` -> signed access full report.
`GET /api/toolkits?assessment=...` -> only published approved resources.
`POST/PATCH /api/admin/toolkits` -> authenticated administrator and content-review workflow.

## Toolkit publishing recommendations
- Do not author separate PDFs for every individual answer option. A scoring result route plus meaningful critical alerts yields a better-maintained library.
- Every result condition gets a structured resource, matched only to a sufficiently understood priority; severe alerts take precedence.
- Start with one excellent PDF per core pathway, then specialist assets (insurance/takaful, property diversification, unit trust/PRS registration, preschool economics and leadership).
- Keep the working five-section interactive version as the rapid-access option, with an optional visually polished PDF attached to each entry.
- A toolkit should include situation inventory, goal, alternatives and risks, manageable action, review/check-in. It must avoid implying product recommendation or certainty, and it should indicate when qualified advice is necessary.
- Review for Malaysian legal terminology, business facts, suitability regulations and professional disclosures; do not present resources as CFP-accredited unless genuinely accredited.

## Trust and compliance checklist
- Explicitly disclose Balla DK credentials only if verifiable; separate education from paid services/commissions.
- Malaysian-specific privacy statement in Bahasa Malaysia and English and independently recorded promotional opt-in.
- Audit every critical flag and resource route with scenario tests; no promise of investment returns or commission earnings.
- Avoid product-level investment recommendations in the automatic report.
- Validate accessible keyboard focus, mobile screen sizes, screen-reader radio labels, loading transitions and offline behaviour.
- Conduct human testing of clarity and usefulness before describing the score as validated.

## Tests completed in prototype
- Preserved original 24 scoring unit tests, covering 10,000 random scenarios.
- Added toolkit coverage test across 360 profile-and-answer archetypes, verifying at least one matched worksheet and all alert mappings.
- Browser-driven Financial and Career & Income flows tested through preview, simulated gate, detailed report and resource modal; WhatsApp visual token verified as `rgb(37, 211, 102)`.

## Public sources referenced for educational design
- CFP Board Practice Standards (seven-step process): https://www.cfp.net/ethics/compliance-resources/2020/01/practice-standards-for-the-financial-planning-process
- PDPA Commissioner (privacy notice guidance): https://www.pdp.gov.my/ppdpv1/en/akta/guidance-on-the-preparation-of-personal-data-protection-notices/
- Securities Commission Malaysia advertising and promotion guidance: https://www.sc.com.my/regulation/guidelines/advertising-and-promotion
