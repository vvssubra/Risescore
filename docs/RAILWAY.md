# Railway staging deploy

Why Railway: the app is one long-running Node process with SQLite + private PDF storage, so it needs a **persistent volume** (not serverless).

**Status: configured but NOT deployed.** The build container that prepared this had no route to railway.com and no token, so none of
the Railway steps below has been executed or tested against Railway. The app itself was verified in production mode locally.

## What is in the repo
* `railway.json` — Railpack build (`npm ci --include=dev && npm run build`), `node dist/server/server/index.js`, health check `/api/health`, single replica.
* `.node-version` = 22 (needs `node:sqlite`).
* `scripts/railway-deploy.sh` — creates the `/data` volume, generates secrets (written only to Railway), sets variables, deploys.
* `STAGING_BASIC_AUTH=user:password` — puts the whole site behind HTTP Basic auth (health check excluded). **Keep this on** until `npm run launch-check` passes.

## Deploy
1. Railway dashboard → New Project → Empty project; Project Settings → Tokens → create a **project token**.
2. `export RAILWAY_TOKEN=…` then `scripts/railway-deploy.sh` (or do the same by hand: add volume at `/data`, set the variables in the script, `railway up`).
3. Generate a domain (Service → Settings → Networking) and set `PUBLIC_BASE_URL` to it (the script does this if a domain already exists).
4. Create the first admin: `railway run npm run create-admin -- you@example.com "Your Name" admin` (a temporary password is printed once).
5. Check `/api/health`, sign in at `/admin`, run Launch readiness.

## Caveats
* One replica only (SQLite file + in-memory rate limiter). Back up the volume (Railway volume backups) before relying on it.
* Email stays queued until `MAIL_WEBHOOK_URL` is set.
* Staging data is test data. Don't point real users at it.
