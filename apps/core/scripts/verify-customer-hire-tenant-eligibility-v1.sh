#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CORE="$ROOT/apps/core"
MIGRATIONS="$ROOT/infra/stacks/supabase/migrations"
VERIFIERS="$ROOT/infra/stacks/supabase/verifiers"
PG_IMAGE="${POSTGRES_IMAGE:-supabase/postgres:17.6.1.136}"
NODE_IMAGE="${NODE_IMAGE:-node:22.23.2-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5}"
SUFFIX="$$"
NET="wandora-customer-hire-eligibility-v1-net-$SUFFIX"
DB="wandora-customer-hire-eligibility-v1-db-$SUFFIX"
DB_NAME="wandora_test"
DB_PASSWORD="wandora-test-only"
CORE_PASSWORD="wandora-core-test-only"
FIXTURE_PASSWORD="wandora-fixture-test-only"

cleanup() {
  docker rm -f "$DB" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker network create "$NET" >/dev/null
docker run -d --name "$DB" --network "$NET"   -e POSTGRES_PASSWORD="$DB_PASSWORD" -e POSTGRES_DB="$DB_NAME"   "$PG_IMAGE" >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$DB" pg_isready -U postgres -d "$DB_NAME" >/dev/null 2>&1; then break; fi
  sleep 1
done
sleep 8

docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" -c   "DO \$\$ BEGIN
     CREATE ROLE authenticated NOLOGIN;
     CREATE ROLE anon NOLOGIN;
     CREATE ROLE service_role NOLOGIN;
     CREATE ROLE supabase_functions_admin NOLOGIN;
   EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;
   CREATE SCHEMA IF NOT EXISTS net;
   GRANT USAGE ON SCHEMA net TO PUBLIC;" >/dev/null

MIGRATION_SEQUENCE=(
  20260914_001_core_multitenant_auth_v1.sql
  20260914_002_ana_vertical_slice_v1.sql
  20260914_003_core_runtime_role_v1.sql
  20260915_004_supervised_proposal_v1.sql
  20260915_005_human_supervision_read_v1.sql
  20260915_006_human_session_bootstrap_v1.sql
  20260915_007_human_send_proposal_v1.sql
  20260916_008_private_tenant_provisioning_v1.sql
  20260916_009_platform_provisioner_role_v1.sql
  20260916_010_organization_adapter_state_v1.sql
  20260916_011_organization_adapter_service_contract_v1.sql
  20260918_012_private_tenant_provisioning_v2.sql
  20260918_013_customer_hire_tenant_eligibility_v1.sql
)

for migration in "${MIGRATION_SEQUENCE[@]}"; do
  docker cp "$MIGRATIONS/$migration" "$DB:/tmp/$migration" >/dev/null
  docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME"     -f "/tmp/$migration" >/dev/null
done

# Migration 013 is required to be safely repeatable before any production preflight.
docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME"   -f /tmp/20260918_013_customer_hire_tenant_eligibility_v1.sql >/dev/null

VERIFIER="VERIFY_20260918_CUSTOMER_HIRE_TENANT_ELIGIBILITY_V1.sql"
docker cp "$VERIFIERS/$VERIFIER" "$DB:/tmp/$VERIFIER" >/dev/null
docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME"   -f "/tmp/$VERIFIER"

docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" -c   "ALTER ROLE wandora_core_runtime CONNECTION LIMIT 4 PASSWORD '${CORE_PASSWORD}';
   CREATE ROLE wandora_fixture_admin_test LOGIN BYPASSRLS PASSWORD '${FIXTURE_PASSWORD}';
   GRANT USAGE ON SCHEMA wandora, wandora_private TO wandora_fixture_admin_test;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA wandora, wandora_private TO wandora_fixture_admin_test;
   GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA wandora, wandora_private TO wandora_fixture_admin_test;" >/dev/null

docker run --rm --network "$NET" -v "$CORE:/app" -w /app   -e DATABASE_URL="postgresql://wandora_core_runtime:${CORE_PASSWORD}@${DB}:5432/${DB_NAME}"   -e FIXTURE_DATABASE_URL="postgresql://wandora_fixture_admin_test:${FIXTURE_PASSWORD}@${DB}:5432/${DB_NAME}"   "$NODE_IMAGE" sh -lc   'npm ci --ignore-scripts >/dev/null &&
   npm run typecheck &&
   node --import tsx --test --test-concurrency=1      test/customer-hire-tenant-eligibility.integration.test.ts      test/organization-adapter-service.integration.test.ts      test/organization-adapter-runtime-e2e.integration.test.ts      test/human-digital-employees-route.test.ts      test/runtime-readiness.test.ts'

echo "CUSTOMER_HIRE_TENANT_ELIGIBILITY_V1_VERIFY_OK"
