#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CORE="$ROOT/apps/core"
MIGRATIONS="$ROOT/infra/stacks/supabase/migrations"
PAPERCLIP_STACK="$ROOT/infra/stacks/paperclip/compose.yaml"
PLUGIN_MANIFEST="$ROOT/spikes/paperclip-organization-adapter-private-client-v1/manifest.js"
PLUGIN_WORKER="$ROOT/spikes/paperclip-organization-adapter-private-client-v1/worker.js"
PG_IMAGE="${POSTGRES_IMAGE:-supabase/postgres:17.6.1.136}"
SUFFIX="$$"
NET="wandora-org-adapter-activation-rehearsal-net-$SUFFIX"
DB="wandora-org-adapter-activation-rehearsal-db-$SUFFIX"
DB_NAME="wandora_rehearsal"
FAIL_DB="wandora_migration_failure_rehearsal"
DB_PASSWORD="wandora-rehearsal-test-only"

cleanup() {
  docker rm -f "$DB" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT

assert_static_activation_contract() {
  grep -Fq 'PAPERCLIP_BUILD_VERSION: v2026.831.1' "$PAPERCLIP_STACK"
  grep -Fq 'PAPERCLIP_BUILD_COMMIT: 65ec059bde30d98c92165b24a30a540800dd1f6f' "$PAPERCLIP_STACK"
  grep -Fq 'image: wandora/paperclip:v2026.831.1' "$PAPERCLIP_STACK"

  grep -Fq 'id: "wandora.organization-adapter-v1"' "$PLUGIN_MANIFEST"
  grep -Fq 'capabilities: ["agents.managed", "webhooks.receive", "secrets.read-ref"]' "$PLUGIN_MANIFEST"
  grep -Fq 'format: "secret-ref"' "$PLUGIN_MANIFEST"
  grep -Fq 'agentKey: "ana-commercial-v1"' "$PLUGIN_MANIFEST"
  grep -Fq 'status: "paused"' "$PLUGIN_MANIFEST"

  grep -Fq 'multiCompanyConfig: true' "$PLUGIN_WORKER"
  grep -Fq 'ctx.config.get(companyId)' "$PLUGIN_WORKER"
  grep -Fq 'ctx.secrets.resolve(ref, { companyId, configPath: "hmacSecret" })' "$PLUGIN_WORKER"
  grep -Fq 'pluginContext.agents.managed.reconcile(catalogKey, companyId)' "$PLUGIN_WORKER"

  test -f "$CORE/src/runtime/organization-adapter.ts"
  grep -Fq 'createPaperclipOrganizationAdapterFileSecretResolver' "$CORE/src/runtime/organization-adapter.ts"
  grep -Fq 'createPaperclipOrganizationAdapterProvider' "$CORE/src/runtime/organization-adapter.ts"

  # Rehearsal/candidate wiring exists as a private factory, but production main
  # must still be unable to instantiate or expose it through customer routes.
  if grep -Fq 'createRuntimeOrganizationAdapter' "$CORE/src/runtime/main.ts"; then
    echo 'organization_adapter_rehearsal_unexpected_live_entrypoint_wiring' >&2
    exit 1
  fi
  if grep -Eq 'organization-adapter|catalog-employee|ensureCatalogEmployee' "$CORE/src/runtime/human-supervision.ts"; then
    echo 'organization_adapter_rehearsal_unexpected_customer_route' >&2
    exit 1
  fi
}

start_failure_probe_db() {
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

  docker exec "$DB" createdb -U supabase_admin "$FAIL_DB"
  docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$FAIL_DB" -c \
    "CREATE SCHEMA IF NOT EXISTS net; GRANT USAGE ON SCHEMA net TO PUBLIC;" >/dev/null
}

copy_migration() {
  local migration="$1"
  docker cp "$MIGRATIONS/$migration" "$DB:/tmp/$migration" >/dev/null
}

apply_migration() {
  local database="$1"
  local migration="$2"
  docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$database" -f "/tmp/$migration" >/dev/null
}

prove_migration_failure_rolls_back() {
  for migration in \
    20260914_001_core_multitenant_auth_v1.sql \
    20260914_002_ana_vertical_slice_v1.sql \
    20260914_003_core_runtime_role_v1.sql \
    20260916_010_organization_adapter_state_v1.sql; do
    copy_migration "$migration"
  done

  for migration in \
    20260914_001_core_multitenant_auth_v1.sql \
    20260914_002_ana_vertical_slice_v1.sql \
    20260914_003_core_runtime_role_v1.sql; do
    apply_migration "$FAIL_DB" "$migration"
  done

  # Inject a pre-existing incompatible relation without changing migration 010.
  # The canonical migration must fail inside its own transaction and leave no
  # partially-created Organization Adapter tables behind.
  docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$FAIL_DB" -c \
    "CREATE VIEW wandora_private.control_plane_provider_bindings AS
       SELECT NULL::uuid AS organization_id,
              NULL::text AS provider,
              NULL::text AS provider_company_ref
       WHERE false;" >/dev/null

  set +e
  docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$FAIL_DB" \
    -f /tmp/20260916_010_organization_adapter_state_v1.sql >/tmp/wandora-org-adapter-migration-failure-$SUFFIX.log 2>&1
  local rc=$?
  set -e
  if [[ "$rc" -eq 0 ]]; then
    cat /tmp/wandora-org-adapter-migration-failure-$SUFFIX.log >&2
    rm -f /tmp/wandora-org-adapter-migration-failure-$SUFFIX.log
    echo 'organization_adapter_rehearsal_expected_migration_failure_missing' >&2
    exit 1
  fi
  rm -f /tmp/wandora-org-adapter-migration-failure-$SUFFIX.log

  docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$FAIL_DB" -Atc \
    "DO \$\$
     BEGIN
       IF to_regclass('wandora_private.digital_employee_provider_bindings') IS NOT NULL
          OR to_regclass('wandora_private.digital_employee_hire_operations') IS NOT NULL THEN
         RAISE EXCEPTION 'organization_adapter_migration_failure_left_partial_state';
       END IF;
       IF NOT EXISTS (
         SELECT 1 FROM pg_class c
         JOIN pg_namespace n ON n.oid=c.relnamespace
         WHERE n.nspname='wandora_private'
           AND c.relname='control_plane_provider_bindings'
           AND c.relkind='v'
       ) THEN
         RAISE EXCEPTION 'organization_adapter_failure_fixture_changed_unexpectedly';
       END IF;
     END \$\$;" >/dev/null

  docker exec "$DB" dropdb -U supabase_admin "$FAIL_DB"
}

assert_static_activation_contract

# Reuse the already accepted composed verifier for the success path. It proves
# baseline -> migration 010 inert verifier -> migration 011 service verifier ->
# DB/service/custody/signed-client behavior, including uncertain frozen retry.
bash "$CORE/scripts/verify-organization-adapter-service-v1.sh"

# Independently prove that a migration failure stops the activation sequence
# without leaving a partial 010 state. No production database is touched.
start_failure_probe_db
prove_migration_failure_rolls_back

echo "ORGANIZATION_ADAPTER_PRODUCTION_ACTIVATION_REHEARSAL_V1_OK"
