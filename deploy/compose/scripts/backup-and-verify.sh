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

BACKUP_DIR=${BACKUP_DIR:-"$COMPOSE_DIR/backups"}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-}
result_file=$(mktemp)

cleanup() {
  rm -f "$result_file"
}
trap cleanup EXIT INT TERM

case "$BACKUP_RETENTION_DAYS" in
  ''|*[!0-9]*)
    if [ -n "$BACKUP_RETENTION_DAYS" ]; then
      echo "BACKUP_RETENTION_DAYS must be a positive integer or empty." >&2
      exit 1
    fi
    ;;
  0)
    echo "BACKUP_RETENTION_DAYS must be greater than zero or empty." >&2
    exit 1
    ;;
esac

BACKUP_RESULT_FILE="$result_file" BACKUP_DIR="$BACKUP_DIR" ENV_FILE="$ENV_FILE" \
  "$SCRIPT_DIR/backup-postgres.sh"
backup_file=$(sed -n '1p' "$result_file")

if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
  echo "Backup command did not return a valid dump path." >&2
  exit 1
fi

"$SCRIPT_DIR/verify-postgres-restore.sh" "$backup_file"

if [ -z "$BACKUP_RETENTION_DAYS" ]; then
  echo "Backup retention disabled; set BACKUP_RETENTION_DAYS after off-host copies are configured."
  exit 0
fi

backup_dir=$(CDPATH= cd -- "$BACKUP_DIR" && pwd)
if [ "$backup_dir" = "/" ]; then
  echo "Refusing to prune backups from filesystem root." >&2
  exit 1
fi

POSTGRES_DB=${POSTGRES_DB:-starter}

find "$backup_dir" -maxdepth 1 -type f \
  -name "${POSTGRES_DB}-*.dump" -mtime "+$BACKUP_RETENTION_DAYS" -print |
while IFS= read -r expired_backup; do
  [ -n "$expired_backup" ] || continue
  expired_dir=$(CDPATH= cd -- "$(dirname -- "$expired_backup")" && pwd)
  if [ "$expired_dir" != "$backup_dir" ]; then
    echo "Refusing to remove backup outside $backup_dir: $expired_backup" >&2
    exit 1
  fi
  rm -f "$expired_backup" "${expired_backup}.sha256"
  echo "Expired local backup removed: $expired_backup"
done

echo "Backup cycle completed: created, restore-verified, retention applied."
