#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
test_dir=$(mktemp -d)

cleanup() {
  rm -rf "$test_dir"
}
trap cleanup EXIT INT TERM

mkdir -p "$test_dir/bin" "$test_dir/repository"
backup_file="$test_dir/starter-test.dump"
password_file="$test_dir/restic-password"
restic_log="$test_dir/restic.log"

printf 'database dump fixture\n' > "$backup_file"
printf 'checksum fixture\n' > "${backup_file}.sha256"
printf 'encryption password fixture\n' > "$password_file"

cat > "$test_dir/bin/restic" <<'EOF'
#!/usr/bin/env sh
set -eu
printf '%s\n' "$*" >> "$RESTIC_TEST_LOG"
case "$*" in
  *snapshots*) exit 0 ;;
  *backup*) exit 0 ;;
  *) exit 64 ;;
esac
EOF
chmod +x "$test_dir/bin/restic"

PATH="$test_dir/bin:$PATH" \
RESTIC_TEST_LOG="$restic_log" \
RESTIC_REPOSITORY="$test_dir/repository" \
RESTIC_PASSWORD_FILE="$password_file" \
RESTIC_HOST="test-host" \
POSTGRES_DB="test_database" \
  sh "$SCRIPT_DIR/backup-offsite.sh" "$backup_file"

grep -F -- '--no-cache snapshots --host test-host' "$restic_log" >/dev/null
grep -F -- '--tag postgres --tag database:test_database' "$restic_log" >/dev/null
grep -F -- "$backup_file ${backup_file}.sha256" "$restic_log" >/dev/null

if RESTIC_REPOSITORY="$test_dir/repository" \
  RESTIC_PASSWORD_FILE="$test_dir/missing-password" \
  sh "$SCRIPT_DIR/backup-offsite.sh" "$backup_file" >/dev/null 2>&1; then
  echo "Expected an unreadable password file to fail." >&2
  exit 1
fi

echo "Off-host backup contract verified."
