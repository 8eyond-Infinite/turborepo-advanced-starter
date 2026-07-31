#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
COMPOSE_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
ENV_FILE=${ENV_FILE:-"$COMPOSE_DIR/.env.production"}
COMPOSE_FILE="$COMPOSE_DIR/compose.production.yaml"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing deployment environment file: $ENV_FILE" >&2
  exit 1
fi

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

image_tag=$(sed -n 's/^SERVER_IMAGE_TAG=//p' "$ENV_FILE" | tail -n 1)
if [ -z "$image_tag" ] || [ "$image_tag" = "latest" ]; then
  echo "SERVER_IMAGE_TAG must be an immutable commit SHA or release version." >&2
  exit 1
fi

# Create the bind-mount source as the deployment user. If Docker creates it
# implicitly, it may become root-owned and the backup systemd service cannot
# atomically replace its heartbeat later.
mkdir -p "$COMPOSE_DIR/backups" "$COMPOSE_DIR/backup-status"

compose config --quiet
compose pull api worker migrate
compose up -d --wait postgres redis
compose run --rm migrate
compose up -d --remove-orphans api worker caddy
compose up --wait api

echo "Deployment completed with SERVER_IMAGE_TAG=$image_tag"
echo "Run scripts/verify.sh to verify the public health and CORS contract."
