#!/usr/bin/env bash
set -euo pipefail

# Nightly Supabase Postgres backup (per-table + optional full dump)
# Required env:
#   SUPABASE_DB_URL  (GitHub Secret) e.g. postgresql://postgres:***@db.<ref>.supabase.co:5432/postgres?sslmode=require
# Optional env:
#   SCHEMAS       Comma-separated list of schemas to backup (default: public)
#   OUT_DIR       Output directory (default: backup_out)
#   RUN_FULL_DUMP true|false (default: true)
#   TIMESTAMP     Override timestamp folder/file label (default: UTC ISO-like)

: "${SUPABASE_DB_URL:?Missing SUPABASE_DB_URL}"

SCHEMAS="${SCHEMAS:-public}"
OUT_DIR="${OUT_DIR:-backup_out}"
RUN_FULL_DUMP="${RUN_FULL_DUMP:-true}"
TIMESTAMP="${TIMESTAMP:-$(date -u +%Y-%m-%dT%H-%M-%SZ)}"

command -v psql >/dev/null 2>&1 || { echo "psql not found (install postgresql-client)"; exit 2; }
command -v pg_dump >/dev/null 2>&1 || { echo "pg_dump not found (install postgresql-client)"; exit 2; }
command -v tar >/dev/null 2>&1 || { echo "tar not found"; exit 2; }

mkdir -p "$OUT_DIR/$TIMESTAMP"

# Validate connection (fail fast)
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "select 1;" >/dev/null

# Basic metadata (helps auditing what was backed up)
psql "$SUPABASE_DB_URL" -At -v ON_ERROR_STOP=1 -c "select version();" > "$OUT_DIR/$TIMESTAMP/pg_version.txt"
date -u > "$OUT_DIR/$TIMESTAMP/created_utc.txt"
echo "$SCHEMAS" > "$OUT_DIR/$TIMESTAMP/schemas.txt"

echo "Starting backup at $TIMESTAMP (schemas: $SCHEMAS)"

IFS=',' read -r -a schema_arr <<< "$SCHEMAS"

for raw_schema in "${schema_arr[@]}"; do
  schema="$(echo "$raw_schema" | xargs)"
  [[ -z "$schema" ]] && continue

  # Prevent accidental SQL injection via schema list.
  if [[ ! "$schema" =~ ^[A-Za-z0-9_]+$ ]]; then
    echo "Invalid schema name: $schema"
    exit 3
  fi

  echo "Listing tables in schema: $schema"
  tables="$(
    psql "$SUPABASE_DB_URL" -At -v ON_ERROR_STOP=1 \
      -c "select tablename from pg_tables where schemaname='${schema}' order by tablename;"
  )"

  if [[ -z "$tables" ]]; then
    echo "No tables found in schema: $schema"
    continue
  fi

  mkdir -p "$OUT_DIR/$TIMESTAMP/tables/$schema"

  while IFS= read -r table; do
    [[ -z "$table" ]] && continue

    # Use identifier quoting to support tables created with mixed case.
    qualified_table="\"${schema}\".\"${table}\""
    out_file="$OUT_DIR/$TIMESTAMP/tables/$schema/${table}.dump"

    echo "Dumping $schema.$table"
    pg_dump "$SUPABASE_DB_URL" \
      --format=custom \
      --no-owner \
      --no-privileges \
      --table="$qualified_table" \
      --file "$out_file"
  done <<< "$tables"
done

if [[ "$RUN_FULL_DUMP" == "true" ]]; then
  echo "Creating full database dump"
  pg_dump "$SUPABASE_DB_URL" \
    --format=custom \
    --no-owner \
    --no-privileges \
    --file "$OUT_DIR/$TIMESTAMP/db_full.dump"
fi

archive_path="$OUT_DIR/supabase-backup-${TIMESTAMP}.tar.gz"

tar -C "$OUT_DIR" -czf "$archive_path" "$TIMESTAMP"

echo "Backup archive created: $archive_path"
