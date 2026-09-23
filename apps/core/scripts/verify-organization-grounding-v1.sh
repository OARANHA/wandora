#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
MIGRATIONS="$ROOT/infra/stacks/supabase/migrations"
VERIFIERS="$ROOT/infra/stacks/supabase/verifiers"
PG_IMAGE="${POSTGRES_IMAGE:-supabase/postgres:17.6.1.136}"
NODE_IMAGE="${NODE_IMAGE:-node:22.23.2-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5}"
SUFFIX="$$"
NET="wandora-grounding-v1-net-$SUFFIX"
DB="wandora-grounding-v1-db-$SUFFIX"
DB_NAME="wandora_grounding_test"
DB_PASSWORD="wandora-grounding-test-only"
CORE_PASSWORD="wandora-grounding-core-test-only"
FIXTURE_PASSWORD="wandora-grounding-fixture-test-only"

cleanup() {
  docker rm -f "$DB" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker network create "$NET" >/dev/null
docker run -d --name "$DB" --network "$NET"   -e POSTGRES_PASSWORD="$DB_PASSWORD"   -e POSTGRES_DB="$DB_NAME"   "$PG_IMAGE" >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$DB" pg_isready -U postgres -d "$DB_NAME" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
sleep 5

docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" -c   "DO \$\$ BEGIN
     CREATE ROLE authenticated NOLOGIN;
     CREATE ROLE anon NOLOGIN;
     CREATE ROLE service_role NOLOGIN;
     CREATE ROLE supabase_functions_admin NOLOGIN;
   EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;
   CREATE SCHEMA IF NOT EXISTS net;
   GRANT USAGE ON SCHEMA net TO PUBLIC;

   CREATE SCHEMA IF NOT EXISTS storage;
   CREATE TABLE IF NOT EXISTS storage.buckets (
     id text PRIMARY KEY,
     name text NOT NULL UNIQUE,
     public boolean DEFAULT false,
     file_size_limit bigint,
     allowed_mime_types text[]
   );
   CREATE TABLE IF NOT EXISTS storage.objects (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     bucket_id text,
     name text,
     metadata jsonb
   );
   ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
   GRANT USAGE ON SCHEMA storage TO authenticated;
   GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;" >/dev/null

for migration in "$MIGRATIONS"/*.sql; do
  base_name="$(basename "$migration")"
  docker cp "$migration" "$DB:/tmp/$base_name" >/dev/null
  docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME"     -f "/tmp/$base_name" >/dev/null
done

for verifier in \
  VERIFY_20260922_ORGANIZATION_GROUNDING_CONTRACT_V1.sql \
  VERIFY_20260923_ORGANIZATION_GROUNDING_SOURCE_STORAGE_V1.sql
do
  docker cp "$VERIFIERS/$verifier" "$DB:/tmp/$verifier" >/dev/null
  docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" -f "/tmp/$verifier"
done

docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" -c   "ALTER ROLE wandora_core_runtime CONNECTION LIMIT 4 PASSWORD '${CORE_PASSWORD}';
   CREATE ROLE wandora_fixture_admin_test LOGIN BYPASSRLS PASSWORD '${FIXTURE_PASSWORD}';
   GRANT USAGE ON SCHEMA wandora, wandora_private TO wandora_fixture_admin_test;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA wandora, wandora_private TO wandora_fixture_admin_test;
   GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA wandora, wandora_private TO wandora_fixture_admin_test;" >/dev/null

docker run --rm --network "$NET" -v "$ROOT/apps/core:/src:ro"   -e DATABASE_URL="postgresql://wandora_core_runtime:${CORE_PASSWORD}@${DB}:5432/${DB_NAME}"   -e FIXTURE_DATABASE_URL="postgresql://wandora_fixture_admin_test:${FIXTURE_PASSWORD}@${DB}:5432/${DB_NAME}"   "$NODE_IMAGE" sh -lc   'mkdir -p /app &&
   cp /src/package.json /src/package-lock.json /src/tsconfig.json /src/tsconfig.build.json /app/ &&
   cp -a /src/src /src/test /app/ &&
   cd /app &&
   npm ci --ignore-scripts --include=dev >/dev/null &&
   npm run typecheck &&
   node --import tsx --test --test-concurrency=1 \
     test/human-grounding-route.test.ts \
     test/human-grounding.integration.test.ts \
     test/organization-grounding-runtime-contract.test.ts \
     test/organization-grounding-runtime-projection.integration.test.ts'

echo "ORGANIZATION_GROUNDING_V1_VERIFY_OK"
