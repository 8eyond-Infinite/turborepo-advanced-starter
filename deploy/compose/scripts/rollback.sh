#!/usr/bin/env sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <previous-image-tag>" >&2
  exit 1
fi

case "$1" in
  latest | local | *[!A-Za-z0-9._-]*)
    echo "Rollback requires an immutable commit SHA or release version." >&2
    exit 1
    ;;
esac

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
COMPOSE_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
ENV_FILE=${ENV_FILE:-"$COMPOSE_DIR/.env.production"}
COMPOSE_FILE="$COMPOSE_DIR/compose.production.yaml"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing deployment environment file: $ENV_FILE" >&2
  exit 1
fi

SERVER_IMAGE_TAG=$1 docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  pull api worker

SERVER_IMAGE_TAG=$1 docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  up -d --no-deps api worker

SERVER_IMAGE_TAG=$1 docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  up --wait api

echo "Application rolled back to SERVER_IMAGE_TAG=$1"
echo "Database migrations were not reversed."
