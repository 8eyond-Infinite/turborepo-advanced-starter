#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
test_dir=$(mktemp -d)

cleanup() {
  rm -rf "$test_dir"
}
trap cleanup EXIT INT TERM

status_file="$test_dir/last-success"
env_file="$test_dir/backup.env"

cat > "$env_file" <<EOF
BACKUP_STATUS_FILE=$status_file
BACKUP_MAX_AGE_HOURS=26
EOF

cat > "$status_file" <<'EOF'
completed_at=2026-07-31T00:00:00Z
backup_file=starter-test.dump
offsite_enabled=true
EOF

ENV_FILE="$env_file" sh "$SCRIPT_DIR/verify-backup-freshness.sh" >/dev/null

touch -d '27 hours ago' "$status_file"
if ENV_FILE="$env_file" sh "$SCRIPT_DIR/verify-backup-freshness.sh" >/dev/null 2>&1; then
  echo "Expected stale backup status to fail." >&2
  exit 1
fi

rm -f "$status_file"
if ENV_FILE="$env_file" sh "$SCRIPT_DIR/verify-backup-freshness.sh" >/dev/null 2>&1; then
  echo "Expected missing backup status to fail." >&2
  exit 1
fi

printf 'completed_at=2026-07-31T00:00:00Z\n' > "$status_file"
if ENV_FILE="$env_file" sh "$SCRIPT_DIR/verify-backup-freshness.sh" >/dev/null 2>&1; then
  echo "Expected incomplete backup status to fail." >&2
  exit 1
fi

echo "Backup freshness contract verified."
