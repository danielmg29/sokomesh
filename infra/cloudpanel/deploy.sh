#!/usr/bin/env bash
# Deploy one commit of SokoMesh on a CloudPanel server (docs/deploy-cloudpanel.md). The server has two sites,
# each with its own site user, and each user deploys its own half:
#
#   as the API site's user:       ~/sokomesh/current/infra/cloudpanel/deploy.sh api [branch, tag or commit]
#   as the web site's user:       ~/sokomesh/current/infra/cloudpanel/deploy.sh web [branch, tag or commit]
#
# The ref defaults to main. Each deploy is a fresh release directory exported from the mirror clone; the running
# release is untouched until the new one has built (and, for the API, checked its contract and migrated). Then
# `current` switches, PM2 reloads, and if the health check fails the previous release comes back. A release that
# fails is removed, and the last three good ones are kept. When both halves change, deploy the API first.
#
#   ~/sokomesh/repo.git      mirror of the GitHub repository
#   ~/sokomesh/shared/.env   this site's settings, linked into every release (never in Git)
#   ~/sokomesh/shared/media  uploaded files (API only, AC_MEDIA_ROOT)
#   ~/sokomesh/releases/…    one directory per deploy
#   ~/sokomesh/current       symlink to the release being served
set -euo pipefail

PART="${1:-}"
REF="${2:-main}"
case "$PART" in
  api | web) ;;
  *) echo "Usage: deploy.sh api|web [branch, tag or commit]" >&2; exit 2 ;;
esac

APP="${SOKOMESH_HOME:-$HOME/sokomesh}"
KEEP=3
export PATH="$HOME/.local/bin:$PATH" DJANGO_SETTINGS_MODULE=config.settings.prod
export NEXT_TELEMETRY_DISABLED=1 COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# Node.js (and so pm2) lives under nvm, which only interactive shells load; a deploy run over plain SSH (GitHub
# Actions, cron) loads it here.
if ! command -v pm2 > /dev/null && [ -s "$HOME/.nvm/nvm.sh" ]; then
  set +u
  . "$HOME/.nvm/nvm.sh"
  set -u
fi

say() { printf '\n==> %s\n' "$*"; }
fail() { printf '\nDeploy stopped: %s\n' "$*" >&2; exit 1; }
need() { command -v "$1" > /dev/null || fail "$1 is not installed for $(whoami) (docs/deploy-cloudpanel.md, $2)."; }
# One value from the shared .env, without quotes.
envget() { sed -n "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*//p" "$APP/shared/.env" | tail -n 1 | sed -e "s/^['\"]//" -e "s/['\"]$//"; }

[ -f "$APP/shared/.env" ] || fail "$APP/shared/.env is missing (docs/deploy-cloudpanel.md, steps 7.3 and 8.3)."
[ -d "$APP/repo.git" ] || fail "$APP/repo.git is missing (docs/deploy-cloudpanel.md, steps 7.2 and 8.2)."
# APP_PORT is the site's App Port in CloudPanel; on a shared server another site may hold the usual one.
PORT="$(envget APP_PORT)"
if [ "$PART" = api ]; then
  HEALTH="http://127.0.0.1:${PORT:-8000}/healthz"
  need uv "step 7.1"
else
  HEALTH="http://127.0.0.1:${PORT:-3000}/"
  need pnpm "step 8.1"
fi
need pm2 "steps 7.1 and 8.1"

healthy() {
  for _ in $(seq 1 30); do
    curl -fsS -o /dev/null "$HEALTH" && return 0
    sleep 2
  done
  return 1
}

say "Fetching $REF"
git -C "$APP/repo.git" remote update --prune
COMMIT="$(git -C "$APP/repo.git" rev-parse --verify "$REF^{commit}")" || fail "$REF is not a branch, tag or commit of the repository."
DIR="$APP/releases/$(date -u +%Y%m%d%H%M%S)-${COMMIT:0:7}"
SWITCHED=0
# A release that never went live is removed, so a failed build leaves nothing behind.
trap '[ "$SWITCHED" = 1 ] || rm -rf "$DIR"' EXIT
mkdir -p "$DIR"
git -C "$APP/repo.git" archive "$COMMIT" | tar -x -C "$DIR"
ln -s "$APP/shared/.env" "$DIR/.env"

if [ "$PART" = api ]; then
  say "API: dependencies, checks, migrations, admin files"
  cd "$DIR/backend"
  uv sync --frozen --no-dev
  uv run --no-sync python manage.py check --deploy
  uv run --no-sync python manage.py contract check   # the committed contract matches this backend
  uv run --no-sync python manage.py migrate --noinput
  uv run --no-sync python manage.py collectstatic --noinput
else
  say "Web: dependencies and build"
  SITE="$(envget NEXT_PUBLIC_SITE_URL)"
  API="$(envget API_ORIGIN)"
  [ -n "$SITE" ] || fail "NEXT_PUBLIC_SITE_URL is not set in $APP/shared/.env."
  API="${API:-http://127.0.0.1:8000}"
  curl -fsS -o /dev/null "$API/healthz" || echo "Warning: the API at $API does not answer yet; pages will show it as unavailable until it does." >&2
  cd "$DIR/web"
  pnpm install --frozen-lockfile
  # next.config.ts is read at build time: the /api forwarding target and the public URL are built in. The build
  # runs at a lower CPU priority so the server's other sites stay responsive while it works.
  NEXT_PUBLIC_SITE_URL="$SITE" API_ORIGIN="$API" nice -n 10 pnpm build
  cp -r .next/static .next/standalone/.next/static
  cp -r public .next/standalone/public
fi

say "Switching to $(basename "$DIR")"
PREVIOUS="$(readlink -f "$APP/current" 2> /dev/null || true)"
ECOSYSTEM="$APP/current/infra/cloudpanel/ecosystem.$PART.cjs"
ln -sfn "$DIR" "$APP/current"
SWITCHED=1
pm2 startOrReload "$ECOSYSTEM" --update-env
if ! healthy; then
  echo "The new release did not answer $HEALTH." >&2
  if [ -n "$PREVIOUS" ] && [ -d "$PREVIOUS" ]; then
    echo "Going back to $(basename "$PREVIOUS")." >&2
    ln -sfn "$PREVIOUS" "$APP/current"
    pm2 startOrReload "$ECOSYSTEM" --update-env
    rm -rf "$DIR"
  fi
  fail "see pm2 logs (docs/deploy-cloudpanel.md, Troubleshooting)."
fi
pm2 save

say "Keeping the last $KEEP releases"
LIVE="$(basename "$(readlink -f "$APP/current")")"
ls -1t "$APP/releases" | { grep -vxF "$LIVE" || true; } | tail -n +"$KEEP" | while read -r old; do rm -rf "$APP/releases/$old"; done
echo "Deployed the $PART at ${COMMIT:0:7}."
