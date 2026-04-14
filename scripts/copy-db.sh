#!/usr/bin/env bash
set -euo pipefail

SOURCE="${1:-}"
TARGET="${2:-}"

if [[ -z "$SOURCE" || -z "$TARGET" ]]; then
  echo "Usage: $0 <source-url> <target-url>"
  echo "  e.g. $0 postgresql://user:pass@localhost:5432/mydb postgresql://user:pass@remote:5432/mydb"
  exit 1
fi

echo "Copying database..."
echo "  From: $SOURCE"
echo "  To:   $TARGET"
echo ""

# Extract target DB name from URL for the drop/create step
TARGET_DBNAME=$(basename "$(echo "$TARGET" | sed 's/?.*$//')")
TARGET_BASE=$(echo "$TARGET" | sed "s|/$TARGET_DBNAME\$||; s|/$TARGET_DBNAME?.*\$||")

echo "Dropping and recreating target database '$TARGET_DBNAME'..."
psql "$TARGET_BASE/postgres" \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$TARGET_DBNAME' AND pid <> pg_backend_pid();" \
  -c "DROP DATABASE IF EXISTS \"$TARGET_DBNAME\";" \
  -c "CREATE DATABASE \"$TARGET_DBNAME\";"

echo "Restoring dump into target..."
# Use a pg_dump that matches the server version to avoid version mismatch errors.
# Checks common Homebrew paths for versioned installs before falling back to PATH.
SERVER_MAJOR=$(psql "$SOURCE" -tAc "SHOW server_version_num;" | cut -c1-2)
PG_DUMP_BIN="pg_dump"
PSQL_BIN="psql"
for dir in \
  "/opt/homebrew/opt/postgresql@${SERVER_MAJOR}/bin" \
  "/usr/local/opt/postgresql@${SERVER_MAJOR}/bin"; do
  if [[ -x "$dir/pg_dump" ]]; then
    PG_DUMP_BIN="$dir/pg_dump"
    PSQL_BIN="$dir/psql"
    break
  fi
done
"$PG_DUMP_BIN" --no-owner --no-acl "$SOURCE" \
  | grep -v "^SET transaction_timeout" \
  | "$PSQL_BIN" "$TARGET" > /dev/null

echo ""
echo "Done."
