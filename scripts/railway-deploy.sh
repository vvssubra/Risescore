#!/usr/bin/env bash
# Deploys STAGING to Railway. Requires: railway CLI, RAILWAY_TOKEN (project token) in the environment.
# Secrets are generated here and written only to Railway — they are never printed or committed.
# Usage: RAILWAY_TOKEN=... scripts/railway-deploy.sh [service-name]
set -euo pipefail
SERVICE="${1:-rise-scorecard}"
: "${RAILWAY_TOKEN:?Set RAILWAY_TOKEN (a Railway project token)}"
command -v railway >/dev/null || { echo "Install the CLI: npm i -g @railway/cli" >&2; exit 1; }

echo "Checking project access…"; railway status >/dev/null

# Postgres holds all application data. Created once; the app service references it (private network URL).
# Service name is the Railway default ("Postgres"); change PG_SERVICE if you rename it.
PG_SERVICE="${PG_SERVICE:-Postgres}"
if ! railway variables --kv 2>/dev/null | grep -q '^DATABASE_URL='; then
  railway status --json 2>/dev/null | grep -q "\"name\": *\"$PG_SERVICE\"" || railway add --database postgres
  railway variables --set "DATABASE_URL=\${{${PG_SERVICE}.DATABASE_URL}}" >/dev/null
fi

# Persistent volume: toolkit PDFs live here. Without it every deploy would wipe the uploaded PDFs.
if ! railway volume list 2>/dev/null | grep -q '/data'; then
  railway volume add --mount-path /data
fi

# Staging password (shown once, only if we create it).
if ! railway variables --kv 2>/dev/null | grep -q '^DATA_ENCRYPTION_KEY='; then
  STAGING_PASS="$(openssl rand -base64 18 | tr -d '=+/')Aa1"
  railway variables \
    --set "NODE_ENV=production" \
    --set "DATA_DIR=/data" \
    --set "TRUST_PROXY=1" \
    --set "REPORT_ACCESS_MODE=immediate" \
    --set "DATA_ENCRYPTION_KEY=$(openssl rand -base64 32)" \
    --set "SIGNING_SECRET=$(openssl rand -base64 48)" \
    --set "STAGING_BASIC_AUTH=staging:${STAGING_PASS}" >/dev/null
  echo "Staging login (save it now — shown once):  staging / ${STAGING_PASS}"
else
  echo "Secrets already exist on Railway; leaving them untouched."
fi

DOMAIN="$(railway domain 2>/dev/null | grep -Eo 'https://[^ ]+' | head -1 || true)"
[ -n "$DOMAIN" ] && railway variables --set "PUBLIC_BASE_URL=${DOMAIN}" >/dev/null

railway up --service "$SERVICE" --ci
echo "Deployed. Health: ${DOMAIN:-<run 'railway domain'>}/api/health"
echo "Next: railway ssh / 'railway run' → npm run create-admin -- you@example.com \"Name\" admin"
