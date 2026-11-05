#!/usr/bin/env bash
# Deploys the committed code in this folder to the live ring: migrate the live
# database, build into .next-live, then (re)start the pm2 process "loopback".
# Refuses to deploy uncommitted changes (set ALLOW_DIRTY=1 to override).
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -z "${ALLOW_DIRTY:-}" ] && [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "Uncommitted changes: commit first (or ALLOW_DIRTY=1)." >&2
  exit 1
fi
[ -f .env.live ] || { echo "Missing .env.live (the live settings)." >&2; exit 1; }
set -a
# shellcheck disable=SC1091
. ./.env.live
set +a
echo "Deploying $(git rev-parse --short HEAD) to $SITE_URL (database $DATABASE_PATH)" >&2
npm run db:migrate
npm run build
if pm2 describe loopback >/dev/null 2>&1; then
  pm2 restart loopback --update-env
else
  pm2 start npm --name loopback -- start -- -H 127.0.0.1 -p 3200
fi
pm2 save
