# Security notes

* **Transport/headers**: strict CSP (no inline script *or* style; dynamic sizes applied through CSSOM), HSTS in production, `Referrer-Policy: no-referrer`
  (report URLs carry a secret), `nosniff`, frame-ancestors none, API `Cache-Control: no-store`.
* **Data at rest**: name, email and the answers payload are AES-256-GCM encrypted with the column bound as AAD; email lookups use an HMAC. Link/session tokens are stored hashed.
  The DB file itself is not encrypted: use disk-level encryption on the host.
* **Auth**: scrypt (N=2^15), 12+ char passwords, lockout after 5 failures, constant-time login, `__Host-` `Secure` `HttpOnly` `SameSite=Strict` cookie, per-session CSRF token,
  roles admin/reviewer/editor, last-admin protection, session purge on disable/reset.
* **Abuse**: body size limits, strict zod validation, honeypot, rate limits (per-IP and per-email; in-memory → use an edge/WAF or Redis limiter if running >1 instance), origin + `Sec-Fetch-Site` checks.
* **Uploads**: PDFs only, size cap, magic bytes, active-content token screen (basic: also scan with AV/CDR in production), private storage, never served statically.
* **Privacy**: raw IPs are not stored (HMAC only), consent events append-only, erase-by-link works after link expiry, retention purge job, marketing CSV neutralises formula injection.
* **Known limits**: the PDF screen is heuristic; no CAPTCHA (hook point: `/api/report-requests`); no MFA for staff (recommended before launch).
