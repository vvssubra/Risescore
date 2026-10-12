# Railway staging deploy

The app is a single Node process + **managed Postgres**. PDFs are stored in Postgres, so there is **no volume** to manage and
the server itself is stateless (you can redeploy or restart freely; data lives in the database).

**Status: configured but NOT deployed.** The environment that prepared this had no route to railway.com and no token, so none of the
Railway steps has been executed against Railway. What *was* verified: the production build against a real Postgres 16 server
(boot with `DATABASE_URL`, bootstrap admin, staging gate, data surviving a restart) and the full test suite on a real Postgres.

## What is in the repo
* `railway.json` — Railpack build (`npm ci --include=dev && npm run build`), start `node dist/server/server/index.js`, health check `/api/health`.
* `.node-version` = 22.
* `scripts/railway-deploy.sh` — adds the Postgres service, generates secrets (written only to Railway), references `${{Postgres.DATABASE_URL}}`, deploys.
* `STAGING_BASIC_AUTH` — whole site behind HTTP Basic auth (health check excluded). **Keep it on** until `npm run launch-check` passes.
* `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` — creates the first admin on boot when none exists (no shell needed). Remove after first sign-in.

## Deploy
1. Railway → New Project → Empty project; Project Settings → Tokens → create a **project token**.
2. `export RAILWAY_TOKEN=… ADMIN_EMAIL=you@example.com && scripts/railway-deploy.sh` (or in the dashboard: add the Postgres plugin, set the variables listed in the script, deploy).
3. Service → Settings → Networking → Generate Domain; set `PUBLIC_BASE_URL` to it.
4. Open the URL (staging login from the script), sign in at `/admin` with the bootstrap admin, change the password, then remove the `BOOTSTRAP_ADMIN_*` variables.
5. Admin → Launch readiness lists what still blocks a public launch.

## Notes
* Several replicas are safe for data (migrations take an advisory lock; verified with concurrent boots). The rate limiter is in-memory per instance, so put an edge limiter in front before scaling out.
* Use Railway's Postgres backups; PDFs are included because they are in the database. Use `DATABASE_SSL=require` if you connect over the public proxy URL.
* Email stays queued until `MAIL_WEBHOOK_URL` is set. Staging data is test data.
