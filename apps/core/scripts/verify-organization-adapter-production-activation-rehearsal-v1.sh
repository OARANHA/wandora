#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CORE="$ROOT/apps/core"
MIGRATIONS="$ROOT/infra/stacks/supabase/migrations"
CORE_STACK="$ROOT/infra/stacks/core"
PAPERCLIP_STACK="$ROOT/infra/stacks/paperclip/compose.yaml"
PLUGIN_MANIFEST="$ROOT/spikes/paperclip-organization-adapter-private-client-v1/manifest.js"
PLUGIN_WORKER="$ROOT/spikes/paperclip-organization-adapter-private-client-v1/worker.js"
CANDIDATE_PLUGIN_ROOT="$ROOT/integrations/paperclip/plugins/organization-adapter-v1"
PG_IMAGE="${POSTGRES_IMAGE:-supabase/postgres:17.6.1.136}"
NODE_IMAGE="${NODE_IMAGE:-node:22.23.2-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5}"
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
  # ADR 0130 promoted the already-qualified exact v916 Paperclip runtime.
  # Keep this rehearsal pinned to the canonical production control-plane provenance.
  grep -Fq 'PAPERCLIP_BUILD_VERSION: v2026.916.0' "$PAPERCLIP_STACK"
  grep -Fq 'PAPERCLIP_BUILD_COMMIT: dffc2b3ca1b9e88fa21cb17493083e682dffd1ca' "$PAPERCLIP_STACK"
  grep -Fq 'image: wandora/paperclip:v2026.916.0' "$PAPERCLIP_STACK"

  grep -Fq 'id: "wandora.organization-adapter-v1"' "$PLUGIN_MANIFEST"
  grep -Fq 'capabilities: ["agents.managed", "webhooks.receive", "secrets.read-ref"]' "$PLUGIN_MANIFEST"
  grep -Fq 'format: "secret-ref"' "$PLUGIN_MANIFEST"
  grep -Fq 'agentKey: "ana-commercial-v1"' "$PLUGIN_MANIFEST"
  grep -Fq 'status: "paused"' "$PLUGIN_MANIFEST"

  grep -Fq 'multiCompanyConfig: true' "$PLUGIN_WORKER"
  grep -Fq 'ctx.config.get(companyId)' "$PLUGIN_WORKER"
  grep -Fq 'ctx.secrets.resolve(ref, { companyId, configPath: "hmacSecret" })' "$PLUGIN_WORKER"
  grep -Fq 'pluginContext.agents.managed.reconcile(catalogKey, companyId)' "$PLUGIN_WORKER"

  # The live adapter remains the production baseline until a separately reviewed
  # promotion. The v0.3 candidate keeps activation and work as different webhook
  # contracts. Activation itself must still use only managed read + resume and
  # must never create an issue, wake a run or invoke an agent.
  grep -Fq "version: '0.3.0'" "$CANDIDATE_PLUGIN_ROOT/src/manifest.ts"
  grep -Fq "'agents.resume'" "$CANDIDATE_PLUGIN_ROOT/src/manifest.ts"
  grep -Fq "'issues.create'" "$CANDIDATE_PLUGIN_ROOT/src/manifest.ts"
  grep -Fq "'issues.wakeup'" "$CANDIDATE_PLUGIN_ROOT/src/manifest.ts"
  grep -Fq "'plugin.state.write'" "$CANDIDATE_PLUGIN_ROOT/src/manifest.ts"
  grep -Fq "endpointKey: 'employee-activate'" "$CANDIDATE_PLUGIN_ROOT/src/manifest.ts"
  grep -Fq "endpointKey: 'employee-work'" "$CANDIDATE_PLUGIN_ROOT/src/manifest.ts"
  grep -Fq 'activateManagedCatalogEmployee' "$CANDIDATE_PLUGIN_ROOT/src/worker.ts"
  grep -Fq 'ensureManagedCatalogEmployeeWork' "$CANDIDATE_PLUGIN_ROOT/src/worker.ts"
  grep -Fq 'agents.managed.get(CATALOG_KEY, companyId)' "$CANDIDATE_PLUGIN_ROOT/src/activation.ts"
  grep -Fq 'agents.resume(current.agentId, companyId)' "$CANDIDATE_PLUGIN_ROOT/src/activation.ts"
  if grep -Fq 'issues.' "$CANDIDATE_PLUGIN_ROOT/src/activation.ts"; then
    echo 'organization_adapter_activation_path_must_not_touch_work' >&2
    exit 1
  fi
  if grep -R -Fq 'agents.invoke' "$CANDIDATE_PLUGIN_ROOT/src"; then
    echo 'organization_adapter_candidate_must_not_invoke_agent_directly' >&2
    exit 1
  fi

  test -f "$CORE/src/runtime/organization-adapter.ts"
  grep -Fq 'createPaperclipOrganizationAdapterFileSecretResolver' "$CORE/src/runtime/organization-adapter.ts"
  grep -Fq 'createPaperclipOrganizationAdapterProvider' "$CORE/src/runtime/organization-adapter.ts"

  # Organization Adapter wiring may be live while the customer hire route remains
  # structurally closed. The route is allowed in the binary only behind its own
  # explicit disabled-by-default runtime gate.
  grep -Fq "import { createRuntimeOrganizationAdapter } from './organization-adapter.js';" "$CORE/src/runtime/main.ts"
  grep -Fq "import { createRuntimeReadinessChecker } from './readiness.js';" "$CORE/src/runtime/main.ts"
  grep -Fq 'const organizationAdapterService = pool && config.organizationAdapter' "$CORE/src/runtime/main.ts"
  grep -Fq '? createRuntimeOrganizationAdapter(pool, config.organizationAdapter)' "$CORE/src/runtime/main.ts"
  grep -Fq 'organizationAdapterEnabled: Boolean(organizationAdapterService)' "$CORE/src/runtime/main.ts"
  grep -Fq 'WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED' "$CORE/src/runtime/config.ts"
  grep -Fq 'digitalEmployeeHireService?: OrganizationAdapterService' "$CORE/src/runtime/human-supervision.ts"
  grep -Fq 'if (!digitalEmployeeHireService)' "$CORE/src/runtime/human-supervision.ts"
  grep -Fq 'humanDigitalEmployeeHireService' "$CORE/src/runtime/main.ts"

  test -f "$CORE_STACK/compose.organization-adapter.yaml"
  grep -Fq 'WANDORA_ORGANIZATION_ADAPTER_ENABLED: "true"' "$CORE_STACK/compose.organization-adapter.yaml"
  grep -Fq 'WANDORA_ORGANIZATION_ADAPTER_WEBHOOK_URL: "http://wandora-paperclip:3100/api/plugins/wandora.organization-adapter-v1/webhooks/employee-reconcile"' "$CORE_STACK/compose.organization-adapter.yaml"
  grep -Fq 'WANDORA_ORGANIZATION_ADAPTER_SECRET_DIRECTORY: "/run/secrets/wandora/organization-adapter"' "$CORE_STACK/compose.organization-adapter.yaml"
  grep -Fq ':/run/secrets/wandora/organization-adapter:ro"' "$CORE_STACK/compose.organization-adapter.yaml"
  if grep -Fq 'WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED' "$CORE_STACK/compose.organization-adapter.yaml"; then
    echo 'organization_adapter_rehearsal_must_not_enable_customer_hire' >&2
    exit 1
  fi
  test -f "$CORE_STACK/compose.human-digital-employee-hire.yaml"
  grep -Fq 'WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED: "true"' "$CORE_STACK/compose.human-digital-employee-hire.yaml"
  test -f "$CORE_STACK/compose.human-digital-employee-activation.yaml"
  grep -Fq 'WANDORA_HUMAN_DIGITAL_EMPLOYEE_ACTIVATION_ENABLED: "true"' "$CORE_STACK/compose.human-digital-employee-activation.yaml"
  grep -Fq 'WANDORA_ORGANIZATION_ADAPTER_ACTIVATION_WEBHOOK_URL:' "$CORE_STACK/compose.human-digital-employee-activation.yaml"
  test -f "$CORE_STACK/compose.human-digital-employee-work.yaml"
  grep -Fq 'WANDORA_HUMAN_DIGITAL_EMPLOYEE_WORK_ENABLED: "true"' "$CORE_STACK/compose.human-digital-employee-work.yaml"
  grep -Fq 'WANDORA_ORGANIZATION_ADAPTER_WORK_WEBHOOK_URL:' "$CORE_STACK/compose.human-digital-employee-work.yaml"

  # Base runtime remains disabled unless the candidate overlay is explicitly
  # selected; no Organization Adapter env belongs in the base stack.
  if grep -Fq 'WANDORA_ORGANIZATION_ADAPTER_' "$CORE_STACK/compose.yaml"; then
    echo 'organization_adapter_rehearsal_base_stack_must_remain_disabled' >&2
    exit 1
  fi
  if grep -Fq 'WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED' "$CORE_STACK/compose.yaml"; then
    echo 'organization_adapter_rehearsal_base_stack_must_not_enable_customer_hire' >&2
    exit 1
  fi
  if grep -Fq 'WANDORA_HUMAN_DIGITAL_EMPLOYEE_ACTIVATION_ENABLED' "$CORE_STACK/compose.yaml"; then
    echo 'organization_adapter_rehearsal_base_stack_must_not_enable_customer_activation' >&2
    exit 1
  fi
  if grep -Fq 'WANDORA_HUMAN_DIGITAL_EMPLOYEE_WORK_ENABLED' "$CORE_STACK/compose.yaml"; then
    echo 'organization_adapter_rehearsal_base_stack_must_not_enable_customer_work' >&2
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

prove_custody_and_candidate_fail_closed() {
  docker run --rm -v "$CORE:/app" -w /app "$NODE_IMAGE" \
    node --import tsx --test --test-concurrency=1 \
      test/organization-adapter-secret-custody.test.ts \
      test/organization-adapter-runtime-wiring.test.ts \
      test/organization-adapter-runtime-config.test.ts \
      test/runtime-readiness.test.ts
}

assert_static_activation_contract

# Reuse the already accepted composed verifier for the success path. It proves
# baseline -> migration 010 inert verifier -> migration 011 service verifier ->
# migration 015 least-privilege activation projection -> DB/service/custody/signed-client
# behavior, including uncertain frozen retry and no direct employee UPDATE privilege.
bash "$CORE/scripts/verify-organization-adapter-service-v1.sh"

# Make custody, config, candidate wiring and readiness fail-closed evidence
# explicit inside this rehearsal rather than relying on historical test steps.
prove_custody_and_candidate_fail_closed

# Independently prove that a migration failure stops the activation sequence
# without leaving a partial 010 state. No production database is touched.
start_failure_probe_db
prove_migration_failure_rolls_back

echo "ORGANIZATION_ADAPTER_PRODUCTION_ACTIVATION_REHEARSAL_V1_OK"
