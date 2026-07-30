#!/usr/bin/env sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <backup.dump>" >&2
  exit 1
fi

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
COMPOSE_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
ENV_FILE=${ENV_FILE:-"$COMPOSE_DIR/.env.production"}
COMPOSE_FILE="$COMPOSE_DIR/compose.production.yaml"
BACKUP_FILE=$1

if [ ! -f "$ENV_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Environment or backup file is missing." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

POSTGRES_USER=${POSTGRES_USER:-starter}
POSTGRES_DB=${POSTGRES_DB:-starter}
VERIFY_DB="restore_verify_$(date -u +%Y%m%d%H%M%S)_$$"

cleanup() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
    dropdb --username "$POSTGRES_USER" --if-exists --force "$VERIFY_DB" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

checksum_file="${BACKUP_FILE}.sha256"
if [ -f "$checksum_file" ]; then
  backup_dir=$(CDPATH= cd -- "$(dirname -- "$BACKUP_FILE")" && pwd)
  (cd "$backup_dir" && sha256sum --check "$(basename "$checksum_file")")
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  createdb --username "$POSTGRES_USER" "$VERIFY_DB"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_restore --username "$POSTGRES_USER" --dbname "$VERIFY_DB" \
  --no-owner --no-privileges < "$BACKUP_FILE"

table_count=$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  psql --username "$POSTGRES_USER" --dbname "$VERIFY_DB" --tuples-only --no-align \
  --command "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")

if [ "$table_count" -le 0 ]; then
  echo "Restore verification failed: no public tables restored." >&2
  exit 1
fi

echo "PostgreSQL restore verified in isolated database $VERIFY_DB ($table_count public tables)."
echo "The live database $POSTGRES_DB was not modified."
