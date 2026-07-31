#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
COMPOSE_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
ENV_FILE=${ENV_FILE:-"$COMPOSE_DIR/.env.production"}
BACKUP_DIR=${BACKUP_DIR:-"$COMPOSE_DIR/backups"}
COMPOSE_FILE="$COMPOSE_DIR/compose.production.yaml"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing deployment environment file: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

POSTGRES_USER=${POSTGRES_USER:-starter}
POSTGRES_DB=${POSTGRES_DB:-starter}
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_file="$BACKUP_DIR/${POSTGRES_DB}-${timestamp}.dump"

umask 077
mkdir -p "$BACKUP_DIR"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --format=custom --no-owner --no-privileges > "$backup_file"

if [ ! -s "$backup_file" ]; then
  echo "Backup is empty: $backup_file" >&2
  exit 1
fi

(cd "$BACKUP_DIR" && sha256sum "$(basename "$backup_file")" > "$(basename "$backup_file").sha256")
if [ -n "${BACKUP_RESULT_FILE:-}" ]; then
  printf '%s\n' "$backup_file" > "$BACKUP_RESULT_FILE"
fi
echo "PostgreSQL backup created: $backup_file"
