#!/usr/bin/env bash
set -Eeuo pipefail

on_error() {
  local status="$?"
  printf 'ATTESTATION_FAILURE status=%s line=%s command=%q\n' \
    "$status" "${BASH_LINENO[0]:-${LINENO}}" "${BASH_COMMAND:-unknown}" >&2
}
trap on_error ERR


ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
PAPERCLIP_SOURCE_ROOT="${PAPERCLIP_SOURCE_ROOT:?set PAPERCLIP_SOURCE_ROOT to pinned Paperclip source checkout}"
EXPECTED_PAPERCLIP_COMMIT="65ec059bde30d98c92165b24a30a540800dd1f6f"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-supabase/postgres:17.6.1.136}"
NODE24_IMAGE="${NODE24_IMAGE:-node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6}"
TMP_PARENT="${WANDORA_ATTESTATION_TMP_ROOT:-${RUNNER_TEMP:-/tmp}/wandora-paperclip-core-e2e}"
SUFFIX="${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}-$$"
TMP="${TMP_PARENT%/}/$SUFFIX"
NET="wandora-paperclip-core-e2e-$SUFFIX"
DB="wandora-paperclip-core-e2e-db-$SUFFIX"
PAPERCLIP="wandora-paperclip-core-e2e-paperclip-$SUFFIX"
PAPERCLIP_PROXY="wandora-paperclip-core-e2e-proxy-$SUFFIX"
CORE="wandora-paperclip-core-e2e-core-$SUFFIX"
CORE_IMAGE="wandora/core:paperclip-e2e-$SUFFIX"
WANDORA_DB="wandora_test"
DB_PASSWORD="wandora-disposable-db-only"
CORE_PASSWORD="wandora-disposable-core-only"
PAPERCLIP_DB_PASSWORD="wandora-disposable-paperclip-only"
ORG_ID="11111111-1111-4111-8111-111111111111"
EMPLOYEE_ID="22222222-2222-4222-8222-222222222222"

cleanup() {
  docker rm -f "$CORE" "$PAPERCLIP_PROXY" "$PAPERCLIP" "$DB" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  docker image rm -f "$CORE_IMAGE" >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

mkdir -p "$TMP"
chmod 700 "$TMP"

actual_paperclip_commit="$(git -C "$PAPERCLIP_SOURCE_ROOT" rev-parse HEAD)"
test "$actual_paperclip_commit" = "$EXPECTED_PAPERCLIP_COMMIT"

node "$PAPERCLIP_SOURCE_ROOT/scripts/ensure-plugin-build-deps.mjs"
test -f "$PAPERCLIP_SOURCE_ROOT/packages/plugins/sdk/dist/index.js"
test -f "$PAPERCLIP_SOURCE_ROOT/packages/shared/dist/index.js"

stage_tree() {
  local source="$1" target="$2"
  mkdir -p "$(dirname "$target")"
  if cp -al "$source" "$target" 2>/dev/null; then
    return
  fi
  cp -a "$source" "$target"
}

# CI's rootless Docker daemon cannot see runner-private /tmp. Stage every bind mount
# under RUNNER_TEMP (or the explicit proof root) before launching containers.
stage_tree "$PAPERCLIP_SOURCE_ROOT" "$TMP/paperclip-source"
stage_tree "$ROOT/integrations/paperclip/adapters/wandora-mastra-v1" "$TMP/wandora-adapter"

printf '%s\n' 'paperclip-execution-bridge-disposable-hmac-0123456789abcdef0123456789abcdef' > "$TMP/bridge.hmac"
printf '%s\n' "$CORE_PASSWORD" > "$TMP/core-db-password"
printf '%s\n' 'gateway-ingress-disposable-hmac-0123456789abcdef0123456789abcdef' > "$TMP/gateway.hmac"
cat > "$TMP/paperclip-loopback-proxy.mjs" <<'PROXY'
import http from 'node:http';
import os from 'node:os';

const address = Object.values(os.networkInterfaces())
  .flat()
  .find((entry) => entry?.family === 'IPv4' && !entry.internal)?.address;
if (!address) throw new Error('paperclip_disposable_network_address_unavailable');

const server = http.createServer(async (request, response) => {
  const authorization = request.headers.authorization ?? '';
  const runId = request.headers['x-paperclip-run-id'] ?? '';
  if (
    request.method !== 'GET'
    || request.url !== '/api/agents/me'
    || !authorization.toLowerCase().startsWith('bearer ')
    || typeof runId !== 'string'
    || !runId
  ) {
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end('{"error":"not_found"}');
    return;
  }

  try {
    const upstream = await fetch('http://127.0.0.1:3100/api/agents/me', {
      method: 'GET',
      headers: {
        authorization,
        'x-paperclip-run-id': runId,
        accept: 'application/json',
      },
    });
    const body = await upstream.text();
    response.writeHead(upstream.status, {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
    });
    response.end(body);
  } catch {
    response.writeHead(502, { 'content-type': 'application/json' });
    response.end('{"error":"upstream_unavailable"}');
  }
});
server.listen(3100, address);
PROXY
chmod 0644 "$TMP/bridge.hmac" "$TMP/core-db-password" "$TMP/gateway.hmac" "$TMP/paperclip-loopback-proxy.mjs"

docker network create "$NET" >/dev/null

docker run -d --name "$DB" --network "$NET"   -e POSTGRES_PASSWORD="$DB_PASSWORD"   -e POSTGRES_DB="$WANDORA_DB"   "$POSTGRES_IMAGE" >/dev/null

for _ in $(seq 1 90); do
  if docker exec "$DB" pg_isready -U postgres -d "$WANDORA_DB" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "$DB" pg_isready -U postgres -d "$WANDORA_DB" >/dev/null
sleep 5

docker exec -i "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$WANDORA_DB" <<SQL >/dev/null
DO \$\$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE service_role NOLOGIN;
  CREATE ROLE supabase_functions_admin NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;
CREATE SCHEMA IF NOT EXISTS net;
GRANT USAGE ON SCHEMA net TO PUBLIC;
CREATE ROLE paperclip_attestation LOGIN PASSWORD '$PAPERCLIP_DB_PASSWORD';
CREATE DATABASE paperclip_attestation OWNER paperclip_attestation;
SQL

MIGRATIONS="$ROOT/infra/stacks/supabase/migrations"
for migration in   20260914_001_core_multitenant_auth_v1.sql   20260914_002_ana_vertical_slice_v1.sql   20260914_003_core_runtime_role_v1.sql   20260915_004_supervised_proposal_v1.sql   20260915_005_human_supervision_read_v1.sql   20260915_006_human_session_bootstrap_v1.sql   20260915_007_human_send_proposal_v1.sql   20260916_008_private_tenant_provisioning_v1.sql   20260916_009_platform_provisioner_role_v1.sql   20260916_010_organization_adapter_state_v1.sql   20260916_011_organization_adapter_service_contract_v1.sql   20260918_013_customer_hire_tenant_eligibility_v1.sql; do
  docker cp "$MIGRATIONS/$migration" "$DB:/tmp/$migration" >/dev/null
  docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$WANDORA_DB" -f "/tmp/$migration" >/dev/null
done

docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$WANDORA_DB" -c   "ALTER ROLE wandora_core_runtime CONNECTION LIMIT 4 PASSWORD '$CORE_PASSWORD';" >/dev/null

docker run -d --name "$PAPERCLIP"   --network "$NET" --network-alias wandora-paperclip   --read-only   --tmpfs /tmp:rw,nosuid,size=64m   --tmpfs /paperclip:rw,nosuid,size=256m   -v "$TMP/paperclip-source:/app:ro"   -v "$TMP/wandora-adapter:/proof/wandora-adapter:ro"   -v "$TMP/bridge.hmac:/proof/bridge.hmac:ro"   -e HOST=127.0.0.1   -e PORT=3100   -e SERVE_UI=false   -e PAPERCLIP_HOME=/paperclip   -e PAPERCLIP_INSTANCE_ID=wandora-disposable-attestation   -e PAPERCLIP_DEPLOYMENT_MODE=local_trusted   -e PAPERCLIP_DEPLOYMENT_EXPOSURE=private   -e PAPERCLIP_PUBLIC_URL=http://wandora-paperclip:3100   -e PAPERCLIP_ALLOWED_HOSTNAMES=wandora-paperclip   -e PAPERCLIP_TELEMETRY_DISABLED=1   -e DO_NOT_TRACK=1   -e PAPERCLIP_BUILD_VERSION=v2026.831.1   -e PAPERCLIP_BUILD_COMMIT="$EXPECTED_PAPERCLIP_COMMIT"   -e PAPERCLIP_MIGRATION_AUTO_APPLY=true   -e PAPERCLIP_MIGRATION_PROMPT=never   -e DATABASE_URL="postgresql://paperclip_attestation:$PAPERCLIP_DB_PASSWORD@$DB:5432/paperclip_attestation"   -e BETTER_AUTH_SECRET=disposable-better-auth-secret-0123456789abcdef   -e PAPERCLIP_AGENT_JWT_SECRET=disposable-agent-jwt-secret-0123456789abcdef0123456789abcdef   -e PAPERCLIP_TOOL_ACTION_SIGNING_SECRET=disposable-tool-secret-0123456789abcdef0123456789abcdef   -e WANDORA_PAPERCLIP_EXECUTION_BRIDGE_URL=http://wandora-core:8788/internal/v1/paperclip/execution   -e WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE=/proof/bridge.hmac   "$NODE24_IMAGE"   node --import /app/server/node_modules/tsx/dist/loader.mjs /app/server/src/index.ts >/dev/null

pc_api() {
  local method="$1" path="$2" body="${3:-}"
  docker exec     -e METHOD="$method"     -e API_PATH="$path"     -e API_BODY="$body"     "$PAPERCLIP" node --input-type=module -e '
      const method = process.env.METHOD;
      const path = process.env.API_PATH;
      const body = process.env.API_BODY || "";
      const response = await fetch(`http://127.0.0.1:3100${path}`, {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body || undefined,
      });
      const text = await response.text();
      process.stdout.write(text);
      if (!response.ok) {
        if (text) console.error(text);
        console.error(`\nPaperclip HTTP ${response.status} for ${method} ${path}`);
        process.exit(22);
      }
    '
}

json_field() {
  local field="$1"
  node -e '
    const fs = require("node:fs");
    const value = JSON.parse(fs.readFileSync(0, "utf8"));
    const parts = process.argv[1].split(".");
    let current = value;
    for (const part of parts) current = current?.[part];
    if (current === undefined || current === null) process.exit(3);
    process.stdout.write(String(current));
  ' "$field"
}

for _ in $(seq 1 120); do
  if pc_api GET /api/health >/dev/null 2>&1; then
    break
  fi
  if [ "$(docker inspect -f '{{.State.Running}}' "$PAPERCLIP" 2>/dev/null || echo false)" != "true" ]; then
    echo "Disposable Paperclip exited during startup." >&2
    docker logs "$PAPERCLIP" >&2 || true
    exit 1
  fi
  sleep 1
done
if ! pc_api GET /api/health >/dev/null 2>&1; then
  echo "Disposable Paperclip did not become healthy." >&2
  docker logs "$PAPERCLIP" >&2 || true
  exit 1
fi

docker run -d --name "$PAPERCLIP_PROXY" \
  --network "container:$PAPERCLIP" \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=8m \
  --security-opt no-new-privileges:true \
  --cap-drop ALL \
  -v "$TMP/paperclip-loopback-proxy.mjs:/proof/paperclip-loopback-proxy.mjs:ro" \
  "$NODE24_IMAGE" \
  node /proof/paperclip-loopback-proxy.mjs >/dev/null

for _ in $(seq 1 30); do
  if docker run --rm --network "$NET" "$NODE24_IMAGE" \
    node -e "fetch('http://wandora-paperclip:3100/not-allowed').then(r=>process.exit(r.status===404?0:1)).catch(()=>process.exit(1))" \
    >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker run --rm --network "$NET" "$NODE24_IMAGE" \
  node -e "fetch('http://wandora-paperclip:3100/not-allowed').then(r=>process.exit(r.status===404?0:1)).catch(()=>process.exit(1))" \
  >/dev/null

adapter_install="$(pc_api POST /api/adapters/install '{"packageName":"/proof/wandora-adapter","isLocalPath":true}')"
test -n "$adapter_install"

company_json="$(pc_api POST /api/companies '{"name":"Wandora Disposable Execution Attestation"}')"
COMPANY_ID="$(printf '%s' "$company_json" | json_field id)"

agent_body="$(node -e '
  process.stdout.write(JSON.stringify({
    name: "Ana",
    role: "general",
    title: "Disposable Attestation Ana",
    adapterType: "wandora_mastra",
    adapterConfig: {},
    budgetMonthlyCents: 0,
    metadata: {
      pluginManagedAgent: {
        pluginKey: "wandora.organization-adapter-v1",
        agentKey: "ana-commercial-v1"
      }
    }
  }));
')"
agent_json="$(pc_api POST "/api/companies/$COMPANY_ID/agents" "$agent_body")"
AGENT_ID="$(printf '%s' "$agent_json" | json_field id)"

# The public create-agent schema intentionally accepts only Paperclip's board-facing
# role vocabulary. Plugin-managed agents use the lower-level agent service and may
# persist manifest-declared roles such as "commercial-assistant". The Organization
# Adapter provisioning path is already proven separately, so this execution-only
# attestation mutates just this synthetic Paperclip row to the canonical managed
# representation instead of reinstalling/re-running that provider capability.
docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d paperclip_attestation \
  -v agent="$AGENT_ID" -v company="$COMPANY_ID" <<'SQL' >/dev/null
WITH updated AS (
  UPDATE agents
     SET role = 'commercial-assistant',
         updated_at = now()
   WHERE id = :'agent'::uuid
     AND company_id = :'company'::uuid
  RETURNING 1
)
SELECT (count(*) = 1) AS patch_ok
  FROM updated
\gset
\if :patch_ok
\else
  \echo 'synthetic managed-agent role patch did not affect exactly one row'
  \quit 41
\endif
SQL

agent_identity="$(pc_api GET "/api/agents/$AGENT_ID")"
test "$(printf '%s' "$agent_identity" | json_field name)" = "Ana"
test "$(printf '%s' "$agent_identity" | json_field role)" = "commercial-assistant"
test "$(printf '%s' "$agent_identity" | json_field metadata.pluginManagedAgent.pluginKey)" = "wandora.organization-adapter-v1"
test "$(printf '%s' "$agent_identity" | json_field metadata.pluginManagedAgent.agentKey)" = "ana-commercial-v1"

PROVIDER_REF="$(node -e '
  const { createHash } = require("node:crypto");
  const company = process.argv[1];
  const key = "ana-commercial-v1";
  const digest = createHash("sha256")
    .update(JSON.stringify(["wandora.organization-adapter-v1", company, key]))
    .digest("hex");
  process.stdout.write(`managed:v1:${digest}`);
' "$COMPANY_ID")"

docker exec -i "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$WANDORA_DB"   -v org="$ORG_ID" -v employee="$EMPLOYEE_ID" -v company="$COMPANY_ID" -v provider_ref="$PROVIDER_REF" <<'SQL' >/dev/null
INSERT INTO wandora.organizations(id,slug,display_name,status)
VALUES (:'org'::uuid,'disposable-bridge-attestation','Disposable Bridge Attestation','active');

INSERT INTO wandora_private.control_plane_provider_bindings
  (organization_id,provider,provider_company_ref)
VALUES (:'org'::uuid,'paperclip',:'company');

INSERT INTO wandora.digital_employees
  (id,organization_id,display_name,role,status,autonomy_mode)
VALUES (:'employee'::uuid,:'org'::uuid,'Ana','commercial-assistant','active','supervised');

INSERT INTO wandora_private.digital_employee_provider_bindings
  (organization_id,employee_id,provider,provider_agent_ref)
VALUES (:'org'::uuid,:'employee'::uuid,'paperclip',:'provider_ref');
SQL

docker build -q -t "$CORE_IMAGE" "$ROOT/apps/core" >/dev/null

docker run -d --name "$CORE"   --network "$NET" --network-alias wandora-core   --read-only   --tmpfs /tmp:rw,noexec,nosuid,size=16m   --security-opt no-new-privileges:true   --cap-drop ALL   -v "$TMP/core-db-password:/run/secrets/core-db-password:ro"   -v "$TMP/gateway.hmac:/run/secrets/gateway.hmac:ro"   -v "$TMP/bridge.hmac:/run/secrets/bridge.hmac:ro"   -e PORT=8788   -e WANDORA_CORE_MODE=database   -e WANDORA_CORE_DB_HOST="$DB"   -e WANDORA_CORE_DB_PORT=5432   -e WANDORA_CORE_DB_NAME="$WANDORA_DB"   -e WANDORA_CORE_DB_USER=wandora_core_runtime   -e WANDORA_CORE_DB_PASSWORD_FILE=/run/secrets/core-db-password   -e WANDORA_GATEWAY_INGRESS_ENABLED=true   -e WANDORA_GATEWAY_INGRESS_SECRET_FILE=/run/secrets/gateway.hmac   -e WANDORA_AGENT_RUNTIME_MODE=mastra-deterministic   -e MASTRA_TELEMETRY_DISABLED=true   -e WANDORA_PAPERCLIP_EXECUTION_BRIDGE_ENABLED=true   -e WANDORA_PAPERCLIP_AGENT_ME_URL=http://wandora-paperclip:3100/api/agents/me   -e WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE=/run/secrets/bridge.hmac   "$CORE_IMAGE" >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$CORE" node -e "fetch('http://127.0.0.1:8788/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

docker exec "$CORE" node --input-type=module -e '
  const response = await fetch("http://127.0.0.1:8788/readyz");
  const payload = await response.json();
  if (
    response.status !== 503
    || payload.reason !== "paperclip-execution-bridge-database-boundary-unavailable"
  ) {
    console.error(JSON.stringify({ status: response.status, payload }));
    process.exit(1);
  }
  console.log("BRIDGE_READINESS_WITHOUT_014_FAILS_CLOSED_OK");
'

# Migration 014 is deliberately NOT applied in this attestation.
# Install only a disposable resolver shim with the same callable boundary so
# /readyz and the end-to-end bridge can be proven without changing migration state.
docker exec -i "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$WANDORA_DB" <<'SQL' >/dev/null
CREATE OR REPLACE FUNCTION wandora_private.resolve_paperclip_execution_organization(
  p_provider_company_ref text
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, wandora, wandora_private, pg_temp
AS $$
  SELECT o.id
    FROM wandora_private.control_plane_provider_bindings b
    JOIN wandora.organizations o ON o.id = b.organization_id
   WHERE b.provider = 'paperclip'
     AND b.provider_company_ref = p_provider_company_ref
     AND o.status = 'active'
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION wandora_private.resolve_paperclip_execution_organization(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wandora_private.resolve_paperclip_execution_organization(text)
  TO wandora_core_runtime;
SQL

docker exec "$CORE" node --input-type=module -e '
  const response = await fetch("http://127.0.0.1:8788/readyz");
  const payload = await response.json();
  if (response.status !== 200 || payload.status !== "ready") {
    console.error(JSON.stringify({ status: response.status, payload }));
    process.exit(1);
  }
  console.log("BRIDGE_READINESS_WITH_DISPOSABLE_RESOLVER_SHIM_OK");
'

issue_body="$(node -e '
  process.stdout.write(JSON.stringify({
    title: "Disposable execution bridge attestation",
    description: "Synthetic task proving Paperclip run-scoped identity through Wandora Core into deterministic Mastra.",
    status: "todo",
    priority: "high",
    assigneeAgentId: process.argv[1]
  }));
' "$AGENT_ID")"
issue_json="$(pc_api POST "/api/companies/$COMPANY_ID/issues" "$issue_body")"
ISSUE_ID="$(printf '%s' "$issue_json" | json_field id)"

sleep 2
runs_json="$(pc_api GET "/api/companies/$COMPANY_ID/heartbeat-runs?agentId=$AGENT_ID&limit=10")"
run_count="$(printf '%s' "$runs_json" | node -e 'const fs=require("node:fs"); const rows=JSON.parse(fs.readFileSync(0,"utf8")); process.stdout.write(String(rows.length));')"
if [ "$run_count" = "0" ]; then
  pc_api POST "/api/agents/$AGENT_ID/heartbeat/invoke" '{}' >/dev/null
fi

RUN_ID=""
RUN_STATUS=""
RUN_JSON=""
for _ in $(seq 1 120); do
  runs_json="$(pc_api GET "/api/companies/$COMPANY_ID/heartbeat-runs?agentId=$AGENT_ID&limit=10")"
  RUN_ID="$(printf '%s' "$runs_json" | node -e '
    const fs=require("node:fs");
    const rows=JSON.parse(fs.readFileSync(0,"utf8"));
    process.stdout.write(rows[0]?.id ?? "");
  ')"
  if [ -n "$RUN_ID" ]; then
    RUN_JSON="$(pc_api GET "/api/heartbeat-runs/$RUN_ID")"
    RUN_STATUS="$(printf '%s' "$RUN_JSON" | json_field status)"
    case "$RUN_STATUS" in
      succeeded|failed|interrupted|cancelled|timed_out) break ;;
    esac
  fi
  sleep 1
done

if [ "$RUN_STATUS" != "succeeded" ]; then
  printf 'Disposable Paperclip run did not succeed: %s\n%s\n' "$RUN_STATUS" "$RUN_JSON" >&2
  if [ -n "$RUN_ID" ]; then
    pc_api GET "/api/heartbeat-runs/$RUN_ID/events?afterSeq=0&limit=200" >&2 || true
  fi
  docker logs "$CORE" >&2 || true
  docker logs "$PAPERCLIP" >&2 || true
  exit 1
fi

execution_id="$(printf '%s' "$RUN_JSON" | node -e '
  const fs=require("node:fs");
  const run=JSON.parse(fs.readFileSync(0,"utf8"));
  process.stdout.write(String(run.resultJson?.executionId ?? ""));
')"
if ! [[ "$execution_id" =~ ^exec_[0-9a-f]{64}$ ]]; then
  printf 'Missing canonical Wandora execution id in Paperclip run result: %s\n' "$execution_id" >&2
  exit 1
fi

agent_me="$(pc_api GET "/api/agents/$AGENT_ID")"
test "$(printf '%s' "$agent_me" | json_field metadata.pluginManagedAgent.pluginKey)" = "wandora.organization-adapter-v1"
test "$(printf '%s' "$agent_me" | json_field metadata.pluginManagedAgent.agentKey)" = "ana-commercial-v1"

printf '%s\n' "PAPERCLIP_WANDORA_MASTRA_DISPOSABLE_E2E_ATTESTATION_V1_OK"
printf '%s\n' "migration_014_applied=false"
printf '%s\n' "paperclip_commit=$actual_paperclip_commit"
printf '%s\n' "run_status=$RUN_STATUS"
printf '%s\n' "execution_id_shape=exec_sha256"
printf '%s\n' "issue_id_present=$([ -n "$ISSUE_ID" ] && echo true || echo false)"
