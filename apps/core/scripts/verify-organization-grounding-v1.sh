#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
MIGRATIONS="$ROOT/infra/stacks/supabase/migrations"
VERIFIERS="$ROOT/infra/stacks/supabase/verifiers"
PG_IMAGE="${POSTGRES_IMAGE:-supabase/postgres:17.6.1.136}"
SUFFIX="$$"
DB="wandora-grounding-v1-db-$SUFFIX"
DB_NAME="wandora_grounding_test"
DB_PASSWORD="wandora-grounding-test-only"

cleanup() {
  docker rm -f "$DB" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run -d --name "$DB"   -e POSTGRES_PASSWORD="$DB_PASSWORD"   -e POSTGRES_DB="$DB_NAME"   "$PG_IMAGE" >/dev/null

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
   GRANT USAGE ON SCHEMA net TO PUBLIC;" >/dev/null

for migration in "$MIGRATIONS"/*.sql; do
  base_name="$(basename "$migration")"
  docker cp "$migration" "$DB:/tmp/$base_name" >/dev/null
  docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME"     -f "/tmp/$base_name" >/dev/null
done

verifier="VERIFY_20260922_ORGANIZATION_GROUNDING_CONTRACT_V1.sql"
docker cp "$VERIFIERS/$verifier" "$DB:/tmp/$verifier" >/dev/null
docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME"   -f "/tmp/$verifier"

echo "ORGANIZATION_GROUNDING_V1_VERIFY_OK"