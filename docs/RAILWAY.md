# Railway staging deploy

Why Railway: the app is one long-running Node process. Data lives in **PostgreSQL** (a Railway Postgres service); private toolkit PDFs still live on local disk, so the app service needs a **persistent volume** at `/data` (not serverless).

**Status: configured but NOT deployed.** The build container that prepared this had no route to railway.com and no token, so none of
the Railway steps below has been executed or tested against Railway. The app itself was verified in production mode locally.

## What is in the repo
* `railway.json` — Railpack build (`npm ci --include=dev && npm run build`), `node dist/server/server/index.js`, health check `/api/health`, single replica.
* `.node-version` = 22.
* `scripts/railway-deploy.sh` — adds a Postgres service and the `/data` volume, links `DATABASE_URL` to it, generates secrets (written only to Railway), sets variables, deploys. **Untested against Railway** (no access from the build environment); the Postgres code itself is tested locally against PostgreSQL 16.
* `STAGING_BASIC_AUTH=user:password` — puts the whole site behind HTTP Basic auth (health check excluded). **Keep this on** until `npm run launch-check` passes.

## Deploy
1. Railway dashboard → New Project → Empty project; Project Settings → Tokens → create a **project token**.
2. `export RAILWAY_TOKEN=…` then `scripts/railway-deploy.sh` (or do the same by hand: add volume at `/data`, set the variables in the script, `railway up`).
3. Generate a domain (Service → Settings → Networking) and set `PUBLIC_BASE_URL` to it (the script does this if a domain already exists).
4. Create the first admin: `railway run npm run create-admin -- you@example.com "Your Name" admin` (a temporary password is printed once).
5. Check `/api/health`, sign in at `/admin`, run Launch readiness.

## Caveats
* One replica only for now: PDFs are on a local volume and the rate limiter is in-memory. Enable backups on **both** the Postgres service and the `/data` volume before relying on it.
* Tables are created automatically on boot (`migrate()` takes an advisory lock, so concurrent boots are safe).
* Email stays queued until `MAIL_WEBHOOK_URL` is set.
* Staging data is test data. Don't point real users at it.
