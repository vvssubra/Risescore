# Architecture decision — standalone R.I.S.E.™ Scorecard

The user approved a separate application, NOT part of `premium-suite` or `bloomngrow`.

Suggested future private GitHub repository name: `rise-scorecard` (not yet created).

## Separation requirements
- Independent source repository, hosting and deployment pipeline.
- Independent environment variables, database and admin roles.
- Distinct public scorecard URL, with optional links from the Balla DK main website.
- No edits to other Balla DK repositories without explicit authorization.
- Preserve the current question engine, score logic, overrides and toolkit matching.
- Mobile-first, one-question-at-a-time UX; results preview -> contact-gated full report; optional WhatsApp CTA (#25D366; +60122202217).
- A secure, role-restricted resource library where Balla DK can upload PDFs and change matching rules without code edits. Serve signed/private downloads where personal data or gated materials require it.
- Privacy-aware opt-ins, secure server-side scoring, no client-only simulated gate in production.
- Financial educational toolkits reviewed for local compliance before public launch.

## Suggested implementation milestones
1. Initialize standalone TypeScript web app and migrate V3 experience; baseline tests.
2. Port or wrap existing scoring engine with regression coverage.
3. Implement server-side lead gate, authentication/roles, consent records, reports.
4. Implement toolkit admin and PDF uploads; matching rules and reports.
5. Production QA: accessibility, mobile, security, and deployment review.

Do not publish publicly, turn on payments, or migrate personal lead data without approval.
