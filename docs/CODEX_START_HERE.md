# Codex start prompt

Open this directory in Codex and use the following instruction:

> Review AGENTS.md, PRODUCTION_HANDOFF.md, and the supplied V3 source. Run the baseline scoring/toolkit tests. Build the R.I.S.E.™ scorecard into a production-quality application in this repository, retaining all branching and alert rules and improving mobile-first UX. Build a real backend for securely saving assessment sessions, gated report requests, signed report links and an administrator-managed toolkit PDF library. Begin by inspecting the existing repository stack and proposing a short migration plan, then implement in milestones with tests. Do not ship a demo-only localStorage gate as production. Use WhatsApp green (#25D366) for the Balla chat CTA with +60122202217. Do not deploy to production without my approval.

This package is **Codex-ready source**, not an indication that a Codex agent has already executed it.


**Decision:** Build as an entirely separate application and private `rise-scorecard` repository. Read `STANDALONE_APP_DECISION.md` first. Do not use `premium-suite` or `bloomngrow` as the deployment target.
