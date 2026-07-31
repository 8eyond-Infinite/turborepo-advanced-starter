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
BACKUP_STATUS_FILE=${BACKUP_STATUS_FILE:-"$COMPOSE_DIR/backup-status/.last-success"}
BACKUP_MAX_AGE_HOURS=${BACKUP_MAX_AGE_HOURS:-26}

case "$BACKUP_MAX_AGE_HOURS" in
  ''|*[!0-9]*|0)
    echo "BACKUP_MAX_AGE_HOURS must be a positive integer." >&2
    exit 1
    ;;
esac

if [ ! -f "$BACKUP_STATUS_FILE" ]; then
  echo "No successful backup status found: $BACKUP_STATUS_FILE" >&2
  exit 1
fi

max_age_minutes=$((BACKUP_MAX_AGE_HOURS * 60))
if find "$BACKUP_STATUS_FILE" -mmin "+$max_age_minutes" -print | grep -q .; then
  echo "Latest successful backup is older than ${BACKUP_MAX_AGE_HOURS} hours: $BACKUP_STATUS_FILE" >&2
  exit 1
fi

completed_at=$(sed -n 's/^completed_at=//p' "$BACKUP_STATUS_FILE")
backup_file=$(sed -n 's/^backup_file=//p' "$BACKUP_STATUS_FILE")

if [ -z "$completed_at" ] || [ -z "$backup_file" ]; then
  echo "Backup status file is incomplete: $BACKUP_STATUS_FILE" >&2
  exit 1
fi

echo "Backup freshness verified: $backup_file completed at $completed_at."
