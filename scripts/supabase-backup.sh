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
command -v python3 >/dev/null 2>&1 || { echo "python3 not found"; exit 2; }

try_psql() {
  local url="$1"
  local out

  set +e
  out=$(psql "$url" -v ON_ERROR_STOP=1 -c "select 1;" 2>&1)
  local code=$?
  set -e

  if [[ $code -ne 0 ]]; then
    echo "$out" >&2
  fi
  return $code
}

append_hostaddr_ipv4() {
  python3 - <<'PY'
import os, socket, sys
import json
import urllib.request
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

url = os.environ.get('SUPABASE_DB_URL')
if not url:
  sys.exit(2)

u = urlparse(url)
host = u.hostname
port = u.port or 5432
if not host:
  print(url)
  sys.exit(0)

try:
  infos = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
  ip = infos[0][4][0]
except Exception:
  # Fallback: DNS-over-HTTPS (helps when local resolver returns only AAAA or is misconfigured)
  ip = None
  try:
    doh_url = f"https://dns.google/resolve?name={host}&type=A"
    with urllib.request.urlopen(doh_url, timeout=10) as resp:
      payload = json.loads(resp.read().decode('utf-8'))
    for ans in payload.get('Answer', []) or []:
      # type 1 = A
      if ans.get('type') == 1 and isinstance(ans.get('data'), str):
        ip = ans['data']
        break
  except Exception:
    ip = None

if not ip:
  print(url)
  sys.exit(0)
q = dict(parse_qsl(u.query, keep_blank_values=True))
q['hostaddr'] = ip
new_query = urlencode(q)

out = urlunparse((u.scheme, u.netloc, u.path, u.params, new_query, u.fragment))
print(out)
PY
}

mkdir -p "$OUT_DIR/$TIMESTAMP"

# Validate connection (fail fast) with IPv4 fallback.
# GitHub-hosted runners may not have IPv6 connectivity; Supabase DNS can resolve to IPv6 first.
if ! try_psql "$SUPABASE_DB_URL" >/dev/null; then
  if [[ "$SUPABASE_DB_URL" == *"hostaddr="* ]]; then
    echo "Connection failed and hostaddr is already set; aborting." >&2
    exit 2
  fi

  echo "Initial connection failed; retrying with IPv4 hostaddr fallback..." >&2
  ipv4_url="$(append_hostaddr_ipv4)"
  if [[ -z "$ipv4_url" || "$ipv4_url" == "$SUPABASE_DB_URL" ]]; then
    echo "Could not resolve an IPv4 address for the DB host; aborting." >&2
    exit 2
  fi

  if try_psql "$ipv4_url" >/dev/null; then
    SUPABASE_DB_URL="$ipv4_url"
    echo "Connected using IPv4 hostaddr fallback." >&2
  else
    echo "Connection failed even with IPv4 fallback; aborting." >&2
    exit 2
  fi
fi

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
