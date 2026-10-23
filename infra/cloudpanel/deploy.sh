#!/usr/bin/env bash
# Deploy one commit of SokoMesh on a CloudPanel server, as the site user (docs/deploy-cloudpanel.md).
#
#   ~/sokomesh/current/infra/cloudpanel/deploy.sh [branch, tag or commit]     default: main
#
# Each deploy is a fresh release directory exported from the mirror clone; the running release is untouched
# until the new one has built, checked its contract and migrated. Then `current` switches, PM2 reloads, and if
# either server fails its health check the previous release comes back. The last three releases are kept.
#
#   ~/sokomesh/repo.git     mirror of the GitHub repository (read-only deploy key)
#   ~/sokomesh/shared/.env  production settings, linked into every release
#   ~/sokomesh/shared/media uploaded files (AC_MEDIA_ROOT)
#   ~/sokomesh/releases/…   one directory per deploy
#   ~/sokomesh/current      symlink to the release being served
set -euo pipefail

APP="${SOKOMESH_HOME:-$HOME/sokomesh}"
REF="${1:-main}"
KEEP=3
export PATH="$HOME/.local/bin:$PATH" DJANGO_SETTINGS_MODULE=config.settings.prod NEXT_TELEMETRY_DISABLED=1

say() { printf '\n==> %s\n' "$*"; }
envget() { sed -n "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*//p" "$APP/shared/.env" | tail -n 1 | sed -e "s/^['\"]//" -e "s/['\"]$//"; }
healthy() {
  for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null http://127.0.0.1:8000/healthz && curl -fsS -o /dev/null http://127.0.0.1:3000/; then return 0; fi
    sleep 2
  done
  return 1
}

[ -f "$APP/shared/.env" ] || { echo "Missing $APP/shared/.env (see docs/deploy-cloudpanel.md, step 6)." >&2; exit 1; }

say "Fetching $REF"
git -C "$APP/repo.git" remote update --prune
COMMIT="$(git -C "$APP/repo.git" rev-parse --verify "$REF^{commit}")"
DIR="$APP/releases/$(date -u +%Y%m%d%H%M%S)-${COMMIT:0:7}"
mkdir -p "$DIR"
git -C "$APP/repo.git" archive "$COMMIT" | tar -x -C "$DIR"
ln -s "$APP/shared/.env" "$DIR/.env"

say "Backend: dependencies, checks, migrations"
cd "$DIR/backend"
uv sync --frozen --no-dev
uv run --no-sync python manage.py check --deploy
uv run --no-sync python manage.py contract check   # the committed contract matches this backend
uv run --no-sync python manage.py migrate --noinput

say "Web: dependencies and build"
cd "$DIR/web"
pnpm install --frozen-lockfile
# next.config.ts is read at build time: the /api rewrite target and the public URL are baked into server.js.
API="$(envget API_ORIGIN)"
NEXT_PUBLIC_SITE_URL="$(envget NEXT_PUBLIC_SITE_URL)" API_ORIGIN="${API:-http://127.0.0.1:8000}" pnpm build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

say "Switching to $(basename "$DIR")"
PREVIOUS="$(readlink -f "$APP/current" 2>/dev/null || true)"
ln -sfn "$DIR" "$APP/current"
pm2 startOrReload "$APP/current/infra/cloudpanel/ecosystem.config.cjs" --update-env
if ! healthy; then
  echo "The new release did not answer its health checks." >&2
  if [ -n "$PREVIOUS" ] && [ -d "$PREVIOUS" ]; then
    echo "Going back to $(basename "$PREVIOUS")." >&2
    ln -sfn "$PREVIOUS" "$APP/current"
    pm2 startOrReload "$APP/current/infra/cloudpanel/ecosystem.config.cjs" --update-env
  fi
  exit 1
fi
pm2 save

say "Keeping the last $KEEP releases"
ls -1dt "$APP"/releases/*/ | tail -n +"$((KEEP + 1))" | xargs -r rm -rf
echo "Deployed ${COMMIT:0:7}."
