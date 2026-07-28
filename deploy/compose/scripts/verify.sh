#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
COMPOSE_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
ENV_FILE=${ENV_FILE:-"$COMPOSE_DIR/.env.production"}

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing deployment environment file: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

API_URL=${API_URL:-${API_ADDRESS:-http://localhost}}
ADMIN_ORIGIN=${ADMIN_ORIGIN:-}

curl --fail --silent --show-error --max-time 10 "$API_URL/health/live" >/dev/null
curl --fail --silent --show-error --max-time 10 "$API_URL/health/ready" >/dev/null

if [ -n "$ADMIN_ORIGIN" ]; then
  headers=$(curl \
    --fail \
    --silent \
    --show-error \
    --max-time 10 \
    --request OPTIONS \
    --header "Origin: $ADMIN_ORIGIN" \
    --header "Access-Control-Request-Method: GET" \
    --dump-header - \
    --output /dev/null \
    "$API_URL/health/live")

  echo "$headers" | grep -i -q "^access-control-allow-origin: $ADMIN_ORIGIN"
  echo "$headers" | grep -i -q "^access-control-allow-credentials: true"
fi

echo "Compose deployment verified: live, ready${ADMIN_ORIGIN:+, CORS}."
