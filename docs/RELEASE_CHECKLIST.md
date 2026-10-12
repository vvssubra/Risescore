# Release checklist (run `npm run launch-check`; the Admin → Launch readiness tab shows the same)

Blocking:
- [ ] Counsel approves the EN/BM privacy notice; fill the `[bracketed]` provider + privacy-contact placeholders; set `PRIVACY_NOTICE_STATUS='approved'`; bump `PRIVACY_NOTICE_VERSION`.
- [ ] Each of the 14 built-in worksheets reviewed for Malaysian wording (no product recommendations/returns/accreditation claims) → mark "compliance-reviewed" in the console.
- [ ] Production secrets set; HTTPS only; `NODE_ENV=production`; `DATABASE_URL` pointing at managed Postgres with TLS, automated backups and a restore drill.
- [ ] Email provider wired (`MAIL_WEBHOOK_URL`) and a test report email received (EN and BM).
- [ ] Two reviewer-capable staff accounts (four-eyes publishing); staff MFA at the identity layer or reverse proxy.
- [ ] Verify Balla DK credential/disclosure wording before publishing any (do not claim CFP accreditation unless true).
Before wide launch:
- [ ] Human usability test; do not describe the score as "validated" until done.
- [ ] Native-speaker review of BM UI strings; supply BM question translations.
- [ ] Manual screen-reader pass (VoiceOver/TalkBack/NVDA) — automated axe is clean but not sufficient.
- [ ] Edge rate-limiting / WAF if more than one instance.
Explicitly NOT done without your approval: public deployment, payments, migration of any personal lead data, edits to other Balla DK repos.
