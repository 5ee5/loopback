#!/usr/bin/env bash
# Runs a command against the LIVE ring: loads .env.live (never loaded automatically)
# and then the command, e.g. `npm run live:admin`. Plain `npm run ...` scripts keep
# using the dev settings in .env.local.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env.live ] || { echo "Missing .env.live (the live settings)." >&2; exit 1; }
set -a
# shellcheck disable=SC1091
. ./.env.live
set +a
echo "LIVE: database $DATABASE_PATH, site $SITE_URL" >&2
exec "$@"
