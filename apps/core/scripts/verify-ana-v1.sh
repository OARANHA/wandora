#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CORE="$ROOT/apps/core"
MIGRATIONS="$ROOT/infra/stacks/supabase/migrations"
VERIFIERS="$ROOT/infra/stacks/supabase/verifiers"
PG_IMAGE="${POSTGRES_IMAGE:-supabase/postgres:17.6.1.136}"
NODE_IMAGE="${NODE_IMAGE:-node:22.23.2-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5}"
SUFFIX="$$"
NET="wandora-ana-v1-net-$SUFFIX"
DB="wandora-ana-v1-db-$SUFFIX"
DB_NAME="wandora_test"
DB_PASSWORD="wandora-test-only"
CORE_PASSWORD="wandora-core-test-only"

cleanup() {
  docker rm -f "$DB" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker network create "$NET" >/dev/null
docker run -d --name "$DB" --network "$NET" \
  -e POSTGRES_PASSWORD="$DB_PASSWORD" \
  -e POSTGRES_DB="$DB_NAME" \
  "$PG_IMAGE" >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$DB" pg_isready -U postgres -d "$DB_NAME" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
sleep 8

docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" -c \
  "DO \$\$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;" >/dev/null

docker cp "$MIGRATIONS/20260914_001_core_multitenant_auth_v1.sql" "$DB:/tmp/001.sql" >/dev/null
docker cp "$MIGRATIONS/20260914_002_ana_vertical_slice_v1.sql" "$DB:/tmp/002.sql" >/dev/null
docker cp "$VERIFIERS/VERIFY_20260914_ANA_VERTICAL_SLICE_V1_LIVE.sql" "$DB:/tmp/live-verify.sql" >/dev/null
docker cp "$VERIFIERS/VERIFY_20260914_ANA_VERTICAL_SLICE_V1.sql" "$DB:/tmp/verify.sql" >/dev/null

docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" -f /tmp/001.sql >/dev/null
docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" -f /tmp/002.sql >/dev/null

# This verifier is production-safe by construction: its transaction is explicitly READ ONLY.
docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" -f /tmp/live-verify.sql

# The behavioral verifier intentionally inserts synthetic data and must never run on the live database.
docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" -f /tmp/verify.sql

docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" -c \
  "CREATE ROLE wandora_core_test LOGIN BYPASSRLS PASSWORD '${CORE_PASSWORD}';
   GRANT USAGE ON SCHEMA wandora, wandora_private TO wandora_core_test;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA wandora, wandora_private TO wandora_core_test;
   GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA wandora TO wandora_core_test;" >/dev/null

docker run --rm --network "$NET" \
  -v "$CORE:/app" -w /app \
  -e DATABASE_URL="postgresql://wandora_core_test:${CORE_PASSWORD}@${DB}:5432/${DB_NAME}" \
  "$NODE_IMAGE" sh -lc 'node -v && npm ci --ignore-scripts >/dev/null && npm run typecheck && npm test'

echo "ANA_VERTICAL_SLICE_V1_VERIFY_OK"
