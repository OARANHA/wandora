#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
MIGRATIONS="$ROOT/infra/stacks/supabase/migrations"
VERIFIERS="$ROOT/infra/stacks/supabase/verifiers"
PG_IMAGE="${POSTGRES_IMAGE:-supabase/postgres:17.6.1.136}"
SUFFIX="$$"
NET="wandora-provisioning-v2-net-$SUFFIX"
DB="wandora-provisioning-v2-db-$SUFFIX"
DB_NAME="wandora_provisioning_v2"
DB_PASSWORD="wandora-test-only"

cleanup() {
  docker rm -f "$DB" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker network create "$NET" >/dev/null
docker run -d --name "$DB" --network "$NET" \
  -e POSTGRES_PASSWORD="$DB_PASSWORD" -e POSTGRES_DB="$DB_NAME" \
  "$PG_IMAGE" >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$DB" pg_isready -U postgres -d "$DB_NAME" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
sleep 8

docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" -c \
  "DO \$\$ BEGIN
     CREATE ROLE authenticated NOLOGIN;
     CREATE ROLE anon NOLOGIN;
     CREATE ROLE service_role NOLOGIN;
     CREATE ROLE supabase_functions_admin NOLOGIN;
   EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;
   CREATE SCHEMA IF NOT EXISTS net;
   GRANT USAGE ON SCHEMA net TO PUBLIC;" >/dev/null

for migration in \
  20260914_001_core_multitenant_auth_v1.sql \
  20260914_002_ana_vertical_slice_v1.sql \
  20260914_003_core_runtime_role_v1.sql \
  20260915_004_supervised_proposal_v1.sql \
  20260915_005_human_supervision_read_v1.sql \
  20260915_006_human_session_bootstrap_v1.sql \
  20260915_007_human_send_proposal_v1.sql \
  20260916_008_private_tenant_provisioning_v1.sql \
  20260916_009_platform_provisioner_role_v1.sql \
  20260916_010_organization_adapter_state_v1.sql \
  20260916_011_organization_adapter_service_contract_v1.sql \
  20260918_012_private_tenant_provisioning_v2.sql; do
  docker cp "$MIGRATIONS/$migration" "$DB:/tmp/$migration" >/dev/null
  docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" \
    -f "/tmp/$migration" >/dev/null
done

# Migration 012 must be safely repeatable.
docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" \
  -f /tmp/20260918_012_private_tenant_provisioning_v2.sql >/dev/null

for verifier in \
  VERIFY_20260918_PRIVATE_TENANT_PROVISIONING_V2_LIVE.sql \
  VERIFY_20260918_PRIVATE_TENANT_PROVISIONING_V2.sql; do
  docker cp "$VERIFIERS/$verifier" "$DB:/tmp/$verifier" >/dev/null
  docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" \
    -f "/tmp/$verifier"
done

echo "PRIVATE_TENANT_PROVISIONING_V2_VERIFY_OK"
