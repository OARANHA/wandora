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
FIXTURE_PASSWORD="wandora-fixture-test-only"
CORE_IMAGE="wandora/core:ci-$SUFFIX"
CORE_SMOKE="wandora-core-smoke-$SUFFIX"
CORE_DB_SMOKE="wandora-core-db-smoke-$SUFFIX"
CORE_ORG_ADAPTER_SMOKE="wandora-core-org-adapter-smoke-$SUFFIX"
CONTAINER_SECRET_GID="${WANDORA_CI_CONTAINER_SECRET_GID:-$(id -g)}"
TMP_SECRET="$(mktemp -p "${RUNNER_TEMP:-/tmp}" wandora-core-db-secret.XXXXXX)"
TMP_OUTBOUND_SECRET="$(mktemp -p "${RUNNER_TEMP:-/tmp}" wandora-core-outbound-secret.XXXXXX)"
TMP_ORG_ADAPTER_DIR="$(mktemp -d -p "${RUNNER_TEMP:-/tmp}" wandora-core-org-adapter.XXXXXX)"

cleanup() {
  docker rm -f "$CORE_ORG_ADAPTER_SMOKE" >/dev/null 2>&1 || true
  docker rm -f "$CORE_DB_SMOKE" >/dev/null 2>&1 || true
  docker rm -f "$CORE_SMOKE" >/dev/null 2>&1 || true
  docker rm -f "$DB" >/dev/null 2>&1 || true
  docker image rm -f "$CORE_IMAGE" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  rm -f "$TMP_SECRET" "$TMP_OUTBOUND_SECRET"
  rm -rf "$TMP_ORG_ADAPTER_DIR"
}
trap cleanup EXIT

docker network create "$NET" >/dev/null
docker run -d --name "$DB" --network "$NET" \
  -e POSTGRES_PASSWORD="$DB_PASSWORD" -e POSTGRES_DB="$DB_NAME" \
  "$PG_IMAGE" >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$DB" pg_isready -U postgres -d "$DB_NAME" >/dev/null 2>&1; then break; fi
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
  20260916_010_organization_adapter_state_v1.sql; do
  docker cp "$MIGRATIONS/$migration" "$DB:/tmp/$migration" >/dev/null
  docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" -f "/tmp/$migration" >/dev/null
done

for migration in \
  20260916_008_private_tenant_provisioning_v1.sql \
  20260916_009_platform_provisioner_role_v1.sql \
  20260916_010_organization_adapter_state_v1.sql; do
  docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" \
    -f "/tmp/$migration" >/dev/null
done

for verifier in \
  VERIFY_20260914_ANA_VERTICAL_SLICE_V1_LIVE.sql \
  VERIFY_20260914_CORE_RUNTIME_ROLE_V1_LIVE.sql \
  VERIFY_20260915_SUPERVISED_PROPOSAL_V1_LIVE.sql \
  VERIFY_20260915_HUMAN_SUPERVISION_READ_V1_LIVE.sql \
  VERIFY_20260915_HUMAN_SESSION_BOOTSTRAP_V1_LIVE.sql \
  VERIFY_20260915_HUMAN_SEND_PROPOSAL_V1_LIVE.sql \
  VERIFY_20260916_PRIVATE_TENANT_PROVISIONING_V1_LIVE.sql \
  VERIFY_20260916_PRIVATE_TENANT_PROVISIONING_V1.sql \
  VERIFY_20260916_PLATFORM_PROVISIONER_ROLE_V1_LIVE.sql \
  VERIFY_20260916_PLATFORM_PROVISIONER_ROLE_V1.sql \
  VERIFY_20260916_ORGANIZATION_ADAPTER_STATE_V1.sql \
  VERIFY_20260914_ANA_VERTICAL_SLICE_V1.sql; do
  docker cp "$VERIFIERS/$verifier" "$DB:/tmp/$verifier" >/dev/null
  docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" -f "/tmp/$verifier"
done

docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" -c \
  "ALTER ROLE wandora_core_runtime CONNECTION LIMIT 4 PASSWORD '${CORE_PASSWORD}';
   CREATE ROLE wandora_fixture_admin_test LOGIN BYPASSRLS PASSWORD '${FIXTURE_PASSWORD}';
   GRANT USAGE ON SCHEMA wandora, wandora_private TO wandora_fixture_admin_test;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA wandora, wandora_private TO wandora_fixture_admin_test;
   GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA wandora TO wandora_fixture_admin_test;" >/dev/null

ACTIVATED_VERIFIER="VERIFY_20260914_CORE_RUNTIME_ACTIVATED_V1_LIVE.sql"
docker cp "$VERIFIERS/$ACTIVATED_VERIFIER" "$DB:/tmp/$ACTIVATED_VERIFIER" >/dev/null
docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$DB_NAME" -f "/tmp/$ACTIVATED_VERIFIER"

# This historical harness intentionally stops at migration 010. Keep all
# migration-011 Organization Adapter integration tests in the dedicated
# verifier, where 010 inertness is proved first and 011 is applied explicitly.
docker run --rm --network "$NET" -v "$CORE:/app" -w /app \
  -e DATABASE_URL="postgresql://wandora_core_runtime:${CORE_PASSWORD}@${DB}:5432/${DB_NAME}" \
  -e FIXTURE_DATABASE_URL="postgresql://wandora_fixture_admin_test:${FIXTURE_PASSWORD}@${DB}:5432/${DB_NAME}" \
  "$NODE_IMAGE" sh -lc '
    node -v
    npm ci --ignore-scripts >/dev/null
    npm run typecheck
    npm run build
    BASE_TESTS="$(find test -maxdepth 1 -name "*.test.ts" \
      ! -name "organization-adapter-service.integration.test.ts" \
      ! -name "organization-adapter-runtime-e2e.integration.test.ts" \
      ! -name "customer-hire-tenant-eligibility.integration.test.ts" \
      ! -name "paperclip-execution-service.integration.test.ts" \
      -print | sort | tr "\n" " ")"
    test -n "$BASE_TESTS"
    node --import tsx --test --test-concurrency=1 $BASE_TESTS
  '

docker build -t "$CORE_IMAGE" "$CORE" >/dev/null
docker run -d --name "$CORE_SMOKE" --network none \
  -e WANDORA_CORE_MODE=standby -e PORT=8788 "$CORE_IMAGE" >/dev/null
core_smoke_ready=0
for _ in $(seq 1 30); do
  if [ "$(docker inspect -f '{{.State.Running}}' "$CORE_SMOKE" 2>/dev/null || echo false)" != "true" ]; then
    docker inspect -f 'core_smoke_status={{.State.Status}} exit={{.State.ExitCode}} oom={{.State.OOMKilled}} error={{json .State.Error}}' "$CORE_SMOKE" >&2 || true
    docker logs "$CORE_SMOKE" >&2 || true
    echo 'wandora_core_standby_smoke_exited_before_health' >&2
    exit 1
  fi
  if docker exec "$CORE_SMOKE" node -e \
    "fetch('http://127.0.0.1:8788/healthz').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"; then
    core_smoke_ready=1
    break
  fi
  sleep 1
done
if [ "$core_smoke_ready" -ne 1 ]; then
  docker inspect -f 'core_smoke_status={{.State.Status}} exit={{.State.ExitCode}} oom={{.State.OOMKilled}} error={{json .State.Error}}' "$CORE_SMOKE" >&2 || true
  docker logs "$CORE_SMOKE" >&2 || true
  echo 'wandora_core_standby_smoke_health_timeout' >&2
  exit 1
fi
docker exec "$CORE_SMOKE" node -e \
  "fetch('http://127.0.0.1:8788/readyz').then(r=>process.exit(r.status===503?0:1)).catch(()=>process.exit(1))"
test -z "$(docker port "$CORE_SMOKE")"

printf '%s\n' "$CORE_PASSWORD" > "$TMP_SECRET"
printf '%s\n' 'synthetic-core-outbound-secret-0123456789abcdef0123456789' > "$TMP_OUTBOUND_SECRET"
chmod 0640 "$TMP_SECRET" "$TMP_OUTBOUND_SECRET"
chmod 0750 "$TMP_ORG_ADAPTER_DIR"

docker run -d --name "$CORE_DB_SMOKE" --network "$NET" \
  --group-add "$CONTAINER_SECRET_GID" \
  -v "$TMP_SECRET:/run/secrets/wandora_core_db_password:ro" \
  -e WANDORA_CORE_MODE=database \
  -e WANDORA_CORE_DB_HOST="$DB" \
  -e WANDORA_CORE_DB_PORT=5432 \
  -e WANDORA_CORE_DB_NAME="$DB_NAME" \
  -e WANDORA_CORE_DB_USER=wandora_core_runtime \
  -e WANDORA_CORE_DB_PASSWORD_FILE=/run/secrets/wandora_core_db_password \
  -e PORT=8788 "$CORE_IMAGE" >/dev/null
for _ in $(seq 1 30); do
  if docker exec "$CORE_DB_SMOKE" node -e \
    "fetch('http://127.0.0.1:8788/readyz').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"; then break; fi
  sleep 1
done
docker exec "$CORE_DB_SMOKE" node -e \
  "fetch('http://127.0.0.1:8788/healthz').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"
docker exec "$CORE_DB_SMOKE" node -e \
  "fetch('http://127.0.0.1:8788/readyz').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"
test -z "$(docker port "$CORE_DB_SMOKE")"

# The same candidate image with Organization Adapter enabled must fail closed
# while the historical DB is intentionally still at inert migration 010.
docker run -d --name "$CORE_ORG_ADAPTER_SMOKE" --network "$NET" \
  --group-add "$CONTAINER_SECRET_GID" \
  -v "$TMP_SECRET:/run/secrets/wandora_core_db_password:ro" \
  -v "$TMP_ORG_ADAPTER_DIR:/run/secrets/wandora/organization-adapter:ro" \
  -e WANDORA_CORE_MODE=database \
  -e WANDORA_CORE_DB_HOST="$DB" \
  -e WANDORA_CORE_DB_PORT=5432 \
  -e WANDORA_CORE_DB_NAME="$DB_NAME" \
  -e WANDORA_CORE_DB_USER=wandora_core_runtime \
  -e WANDORA_CORE_DB_PASSWORD_FILE=/run/secrets/wandora_core_db_password \
  -e WANDORA_ORGANIZATION_ADAPTER_ENABLED=true \
  -e WANDORA_ORGANIZATION_ADAPTER_WEBHOOK_URL=http://wandora-paperclip:3100/api/plugins/wandora.organization-adapter-v1/webhooks/employee-reconcile \
  -e WANDORA_ORGANIZATION_ADAPTER_SECRET_DIRECTORY=/run/secrets/wandora/organization-adapter \
  -e PORT=8788 "$CORE_IMAGE" >/dev/null
for _ in $(seq 1 30); do
  if docker exec "$CORE_ORG_ADAPTER_SMOKE" node -e \
    "fetch('http://127.0.0.1:8788/healthz').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"; then break; fi
  sleep 1
done
docker exec "$CORE_ORG_ADAPTER_SMOKE" node -e \
  "fetch('http://127.0.0.1:8788/readyz').then(async r=>{const b=await r.json();process.exit(r.status===503&&b.reason==='organization-adapter-database-boundary-unavailable'?0:1)}).catch(()=>process.exit(1))"
test -z "$(docker port "$CORE_ORG_ADAPTER_SMOKE")"

docker compose -f "$ROOT/infra/stacks/core/compose.yaml" config >/dev/null
WANDORA_CORE_DB_PASSWORD_FILE="$TMP_SECRET" WANDORA_CORE_SECRET_GID="$(id -g)" docker compose \
  -f "$ROOT/infra/stacks/core/compose.yaml" \
  -f "$ROOT/infra/stacks/core/compose.database.yaml" config >/dev/null
WANDORA_CORE_DB_PASSWORD_FILE="$TMP_SECRET" \
WANDORA_CORE_SECRET_GID="$(id -g)" \
WANDORA_CORE_GATEWAY_OUTBOUND_SECRET_FILE="$TMP_OUTBOUND_SECRET" \
WANDORA_HUMAN_SEND_PROPOSAL_CONNECTION_ID="22222222-2222-2222-2222-222222222222" \
docker compose \
  -f "$ROOT/infra/stacks/core/compose.yaml" \
  -f "$ROOT/infra/stacks/core/compose.database.yaml" \
  -f "$ROOT/infra/stacks/core/compose.human-api.yaml" \
  -f "$ROOT/infra/stacks/core/compose.human-send-proposal.yaml" config >/dev/null

HIRE_EFFECTIVE="$(WANDORA_CORE_DB_PASSWORD_FILE="$TMP_SECRET" \
WANDORA_CORE_SECRET_GID="$(id -g)" \
WANDORA_ORGANIZATION_ADAPTER_SECRET_DIR_HOST="$TMP_ORG_ADAPTER_DIR" \
docker compose \
  -f "$ROOT/infra/stacks/core/compose.yaml" \
  -f "$ROOT/infra/stacks/core/compose.database.yaml" \
  -f "$ROOT/infra/stacks/core/compose.human-api.yaml" \
  -f "$ROOT/infra/stacks/core/compose.organization-adapter.yaml" \
  -f "$ROOT/infra/stacks/core/compose.human-digital-employee-hire.yaml" \
  config)"
grep -q 'WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED: "true"' <<<"$HIRE_EFFECTIVE"
grep -q 'WANDORA_ORGANIZATION_ADAPTER_ENABLED: "true"' <<<"$HIRE_EFFECTIVE"
grep -q 'WANDORA_HUMAN_API_ENABLED: "true"' <<<"$HIRE_EFFECTIVE"

echo "WANDORA_CORE_PRIVATE_RUNTIME_V1_OK"
echo "ANA_VERTICAL_SLICE_V1_VERIFY_OK"
