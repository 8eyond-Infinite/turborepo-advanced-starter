#!/usr/bin/env sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <verified-backup.dump>" >&2
  exit 1
fi

backup_file=$1
checksum_file="${backup_file}.sha256"

if [ ! -f "$backup_file" ] || [ ! -f "$checksum_file" ]; then
  echo "Verified backup or checksum is missing: $backup_file" >&2
  exit 1
fi

: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY is required when off-host backup is enabled.}"
: "${RESTIC_PASSWORD_FILE:?RESTIC_PASSWORD_FILE is required when off-host backup is enabled.}"

if [ ! -r "$RESTIC_PASSWORD_FILE" ]; then
  echo "Restic password file is not readable: $RESTIC_PASSWORD_FILE" >&2
  exit 1
fi

if ! command -v restic >/dev/null 2>&1; then
  echo "restic is required when off-host backup is enabled." >&2
  exit 1
fi

RESTIC_HOST=${RESTIC_HOST:-turborepo-starter}
POSTGRES_DB=${POSTGRES_DB:-starter}

# Requiring an existing repository keeps an incorrect URL or empty bucket from
# being initialized silently during an unattended backup cycle.
restic --no-cache snapshots --host "$RESTIC_HOST" >/dev/null

restic --no-cache backup \
  --host "$RESTIC_HOST" \
  --tag postgres \
  --tag "database:${POSTGRES_DB}" \
  "$backup_file" "$checksum_file"

echo "Encrypted off-host backup completed: $(basename -- "$backup_file")"
