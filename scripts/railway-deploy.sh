#!/usr/bin/env bash
# Deploys STAGING to Railway: app service + managed Postgres. No volume needed (PDFs live in Postgres).
# Requires: railway CLI, RAILWAY_TOKEN (project token), ADMIN_EMAIL. Secrets are generated here and written only to Railway.
# Usage: RAILWAY_TOKEN=... ADMIN_EMAIL=you@example.com scripts/railway-deploy.sh [app-service-name]
set -euo pipefail
SERVICE="${1:-rise-scorecard}"
: "${RAILWAY_TOKEN:?Set RAILWAY_TOKEN (a Railway project token)}"
: "${ADMIN_EMAIL:?Set ADMIN_EMAIL (email of the first admin)}"
command -v railway >/dev/null || { echo "Install the CLI: npm i -g @railway/cli" >&2; exit 1; }

echo "Checking project access…"; railway status >/dev/null

# Managed Postgres (skip if the project already has one).
if ! railway variables --service Postgres --kv >/dev/null 2>&1; then
  railway add --database postgres
fi

if ! railway variables --service "$SERVICE" --kv 2>/dev/null | grep -q '^DATA_ENCRYPTION_KEY='; then
  STAGING_PASS="$(openssl rand -base64 18 | tr -d '=+/')Aa1"
  ADMIN_PASS="$(openssl rand -base64 18 | tr -d '=+/')Aa1"
  railway variables --service "$SERVICE" --skip-deploys \
    --set "NODE_ENV=production" \
    --set "TRUST_PROXY=1" \
    --set "REPORT_ACCESS_MODE=immediate" \
    --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
    --set "DATA_ENCRYPTION_KEY=$(openssl rand -base64 32)" \
    --set "SIGNING_SECRET=$(openssl rand -base64 48)" \
    --set "STAGING_BASIC_AUTH=staging:${STAGING_PASS}" \
    --set "BOOTSTRAP_ADMIN_EMAIL=${ADMIN_EMAIL}" \
    --set "BOOTSTRAP_ADMIN_PASSWORD=${ADMIN_PASS}" >/dev/null
  echo "Staging site login (browser prompt):  staging / ${STAGING_PASS}"
  echo "First admin (/admin):  ${ADMIN_EMAIL} / ${ADMIN_PASS}   (you must change it at first sign-in)"
  echo "Save both now — they are shown once."
else
  echo "Secrets already exist on Railway; leaving them untouched."
fi

DOMAIN="$(railway domain --service "$SERVICE" 2>/dev/null | grep -Eo 'https://[^ ]+' | head -1 || true)"
[ -n "$DOMAIN" ] && railway variables --service "$SERVICE" --skip-deploys --set "PUBLIC_BASE_URL=${DOMAIN}" >/dev/null

railway up --service "$SERVICE" --ci
echo "Deployed. Health: ${DOMAIN:-<run 'railway domain'>}/api/health"
echo "After the first admin signs in and changes the password, delete BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD from the service variables."
