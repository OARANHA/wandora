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
EXPECTED_PAPERCLIP_COMMIT="dffc2b3ca1b9e88fa21cb17493083e682dffd1ca"
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

  # GNU cp may leave a partially-created target when hard-link staging fails
  # (for example when the source tree contains files owned by another UID).
  # Never overlay the full copy on that partial tree: doing so nests the source
  # directory and breaks relative pnpm symlinks such as server/node_modules/tsx.
  rm -rf "$target"
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

cat > "$TMP/fake-wandora-core.mjs" <<'FAKECORE'
import http from 'node:http';

const executionId = 'exec_' + 'a'.repeat(64);
const server = http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/healthz') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end('{"status":"ok"}');
    return;
  }
  if (request.method !== 'POST' || request.url !== '/internal/v1/paperclip/execution') {
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end('{"error":"not_found"}');
    return;
  }

  let raw = '';
  request.on('data', (chunk) => { raw += chunk; });
  request.on('end', () => {
    try {
      const body = JSON.parse(raw);
      const workId = String(body?.task?.workId ?? '');
      const issueId = String(body?.task?.issueId ?? '');
      const token = String(request.headers['x-wandora-paperclip-run-token'] ?? '');
      if (!workId || !issueId || !token || String(body?.task?.description ?? '').includes('wandora-work-v1:')) {
        throw new Error('invalid_reviewed_customer_work_request');
      }
      if (String(body?.task?.title ?? '') === 'Disposable customer-work read-tool failure proof') {
        response.writeHead(422, { 'content-type': 'application/json' });
        response.end('{"error":"read-tool-failed"}');
        return;
      }
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({
        executionId,
        model: 'wandora-supervised-v1',
        summary: 'Disposable supervised customer-work result.',
        usage: {
          inputTokens: 11,
          outputTokens: 7,
          cachedInputTokens: 2,
          totalTokens: 18,
        },
      }));
    } catch (error) {
      response.writeHead(400, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
  });
});
server.listen(8788, '0.0.0.0');
FAKECORE

chmod 0644 "$TMP/bridge.hmac" "$TMP/core-db-password" "$TMP/gateway.hmac" "$TMP/paperclip-loopback-proxy.mjs" "$TMP/fake-wandora-core.mjs"

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
for migration in   20260914_001_core_multitenant_auth_v1.sql   20260914_002_ana_vertical_slice_v1.sql   20260914_003_core_runtime_role_v1.sql   20260915_004_supervised_proposal_v1.sql   20260915_005_human_supervision_read_v1.sql   20260915_006_human_session_bootstrap_v1.sql   20260915_007_human_send_proposal_v1.sql   20260916_008_private_tenant_provisioning_v1.sql   20260916_009_platform_provisioner_role_v1.sql   20260916_010_organization_adapter_state_v1.sql   20260916_011_organization_adapter_service_contract_v1.sql   20260918_013_customer_hire_tenant_eligibility_v1.sql   20260922_017_organization_grounding_contract_v1.sql; do
  docker cp "$MIGRATIONS/$migration" "$DB:/tmp/$migration" >/dev/null
  docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$WANDORA_DB" -f "/tmp/$migration" >/dev/null
done

docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$WANDORA_DB" -c   "ALTER ROLE wandora_core_runtime CONNECTION LIMIT 4 PASSWORD '$CORE_PASSWORD';" >/dev/null

docker run -d --name "$PAPERCLIP"   --network "$NET" --network-alias wandora-paperclip   --read-only   --tmpfs /tmp:rw,nosuid,size=64m   --tmpfs /paperclip:rw,nosuid,size=256m   -v "$TMP/paperclip-source:/app:ro"   -v "$TMP/wandora-adapter:/proof/wandora-adapter:ro"   -v "$TMP/bridge.hmac:/proof/bridge.hmac:ro"   -e HOST=127.0.0.1   -e PORT=3100   -e SERVE_UI=false   -e PAPERCLIP_HOME=/paperclip   -e PAPERCLIP_INSTANCE_ID=wandora-disposable-attestation   -e PAPERCLIP_DEPLOYMENT_MODE=local_trusted   -e PAPERCLIP_DEPLOYMENT_EXPOSURE=private   -e PAPERCLIP_PUBLIC_URL=http://wandora-paperclip:3100   -e PAPERCLIP_ALLOWED_HOSTNAMES=wandora-paperclip   -e PAPERCLIP_TELEMETRY_DISABLED=1   -e DO_NOT_TRACK=1   -e HEARTBEAT_SCHEDULER_INTERVAL_MS=10000   -e PAPERCLIP_BUILD_VERSION=v2026.916.0   -e PAPERCLIP_BUILD_COMMIT="$EXPECTED_PAPERCLIP_COMMIT"   -e PAPERCLIP_MIGRATION_AUTO_APPLY=true   -e PAPERCLIP_MIGRATION_PROMPT=never   -e DATABASE_URL="postgresql://paperclip_attestation:$PAPERCLIP_DB_PASSWORD@$DB:5432/paperclip_attestation"   -e BETTER_AUTH_SECRET=disposable-better-auth-secret-0123456789abcdef   -e PAPERCLIP_AGENT_JWT_SECRET=disposable-agent-jwt-secret-0123456789abcdef0123456789abcdef   -e PAPERCLIP_TOOL_ACTION_SIGNING_SECRET=disposable-tool-secret-0123456789abcdef0123456789abcdef   -e WANDORA_PAPERCLIP_EXECUTION_BRIDGE_URL=http://wandora-core:8788/internal/v1/paperclip/execution   -e WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE=/proof/bridge.hmac   "$NODE24_IMAGE"   node --import /app/server/node_modules/tsx/dist/loader.mjs /app/server/src/index.ts >/dev/null

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

fixture_output="$(docker exec \
  -e WANDORA_DISPOSABLE_COMPANY_ID="$COMPANY_ID" \
  "$PAPERCLIP" \
  node --import /app/server/node_modules/tsx/dist/loader.mjs \
  /proof/wandora-adapter/disposable-managed-agent-fixture.ts)"
AGENT_ID="$(printf '%s\n' "$fixture_output" | sed -n 's/^WANDORA_MANAGED_AGENT_ID=//p' | tail -n 1)"
if ! [[ "$AGENT_ID" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
  printf 'Disposable managed-agent fixture did not emit a valid id.\n%s\n' "$fixture_output" >&2
  exit 42
fi

agent_identity="$(pc_api GET "/api/agents/$AGENT_ID")"
test "$(printf '%s' "$agent_identity" | json_field name)" = "Ana"
test "$(printf '%s' "$agent_identity" | json_field role)" = "commercial-assistant"
test "$(printf '%s' "$agent_identity" | json_field adapterType)" = "wandora_mastra"
test "$(printf '%s' "$agent_identity" | json_field status)" = "idle"
test "$(printf '%s' "$agent_identity" | json_field metadata.pluginManagedAgent.pluginKey)" = "wandora.organization-adapter-v1"
test "$(printf '%s' "$agent_identity" | json_field metadata.pluginManagedAgent.agentKey)" = "ana-commercial-v1"
printf '%s\n' "PAPERCLIP_NATIVE_MANAGED_AGENT_FIXTURE_OK"

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
# Migration 017 is applied only to this disposable database because the execution
# bridge readiness contract now requires the organization-grounding read boundary.
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

# Close the historical synthetic non-customer issue before the focused customer-work
# lifecycle proof so the scheduler cannot create unrelated recovery noise.
pc_api PATCH "/api/issues/$ISSUE_ID" '{"status":"done"}' >/dev/null

# The existing proof above already covers the real Paperclip -> Wandora Core bridge.
# For the focused lifecycle proof below, replace Core with a deterministic fake that
# returns normalized usage without invoking any model. This isolates the adapter's
# exact issue-finalization behavior against the real pinned Paperclip scheduler.
docker rm -f "$CORE" >/dev/null
docker run -d --name "$CORE"   --network "$NET" --network-alias wandora-core   --read-only   --tmpfs /tmp:rw,noexec,nosuid,size=8m   --security-opt no-new-privileges:true   --cap-drop ALL   -v "$TMP/fake-wandora-core.mjs:/proof/fake-wandora-core.mjs:ro"   "$NODE24_IMAGE"   node /proof/fake-wandora-core.mjs >/dev/null

for _ in $(seq 1 30); do
  if docker exec "$CORE" node -e "fetch('http://127.0.0.1:8788/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "$CORE" node -e "fetch('http://127.0.0.1:8788/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null

WORK_ID="33333333-3333-4333-8333-333333333333"
work_issue_body="$(node -e '
  process.stdout.write(JSON.stringify({
    title: "Disposable customer-work single-run proof",
    description: `<!-- wandora-work-v1:${process.argv[2]} -->\\nPrepare only an internal supervised result.`,
    status: "todo",
    priority: "high",
    assigneeAgentId: process.argv[1]
  }));
' "$AGENT_ID" "$WORK_ID")"
work_issue_json="$(pc_api POST "/api/companies/$COMPANY_ID/issues" "$work_issue_body")"
WORK_ISSUE_ID="$(printf '%s' "$work_issue_json" | json_field id)"

pc_sql() {
  local statement="$1"
  docker exec -e PGPASSWORD="$PAPERCLIP_DB_PASSWORD" "$DB" \
    psql -X -At -h 127.0.0.1 -U paperclip_attestation -d paperclip_attestation -c "$statement"
}

WORK_RUN_ID=""
WORK_RUN_STATUS=""
for _ in $(seq 1 60); do
  WORK_RUN_ID="$(pc_sql "select id::text from heartbeat_runs where company_id='$COMPANY_ID'::uuid and context_snapshot->>'issueId'='$WORK_ISSUE_ID' order by created_at desc limit 1;")"
  if [ -n "$WORK_RUN_ID" ]; then
    WORK_RUN_STATUS="$(pc_sql "select status::text from heartbeat_runs where id='$WORK_RUN_ID'::uuid;")"
    case "$WORK_RUN_STATUS" in
      succeeded|failed|interrupted|cancelled|timed_out) break ;;
    esac
  fi
  sleep 1
done
if [ "$WORK_RUN_STATUS" != "succeeded" ]; then
  printf 'Focused customer-work run failed: issue=%s run=%s status=%s\n' "$WORK_ISSUE_ID" "$WORK_RUN_ID" "$WORK_RUN_STATUS" >&2
  pc_sql "select id::text,status::text,coalesce(error,''),coalesce(error_code,''),coalesce(result_json::text,''),coalesce(context_snapshot::text,'') from heartbeat_runs where id='$WORK_RUN_ID'::uuid;" >&2 || true
  pc_sql "select id::text,identifier,status::text,coalesce(execution_run_id::text,''),coalesce(checkout_run_id::text,'') from issues where id='$WORK_ISSUE_ID'::uuid;" >&2 || true
  pc_sql "select id::text,source,reason,status::text,coalesce(run_id::text,''),coalesce(error,'') from agent_wakeup_requests where company_id='$COMPANY_ID'::uuid and agent_id='$AGENT_ID'::uuid order by created_at desc limit 5;" >&2 || true
  printf '%s\n' '--- disposable Paperclip logs ---' >&2
  docker logs "$PAPERCLIP" >&2 || true
  printf '%s\n' '--- disposable focused Core logs ---' >&2
  docker logs "$CORE" >&2 || true
  exit 41
fi

work_issue_status="$(pc_sql "select status::text from issues where id='$WORK_ISSUE_ID'::uuid;")"
test "$work_issue_status" = "done"

usage_tuple="$(pc_sql "select coalesce((usage_json->>'inputTokens')::int,-1)||'|'||coalesce((usage_json->>'outputTokens')::int,-1)||'|'||coalesce((usage_json->>'cachedInputTokens')::int,-1) from heartbeat_runs where id='$WORK_RUN_ID'::uuid;")"
test "$usage_tuple" = "11|7|2"

# Wait beyond the configured 10s scheduler floor. A correctly finalized customer-work
# issue must not be reconciled as stranded and must not create issue_continuation_needed.
sleep 12

work_run_count="$(pc_sql "select count(*) from heartbeat_runs where company_id='$COMPANY_ID'::uuid and context_snapshot->>'issueId'='$WORK_ISSUE_ID';")"
test "$work_run_count" = "1"

continuation_count="$(pc_sql "select count(*) from heartbeat_runs where company_id='$COMPANY_ID'::uuid and context_snapshot->>'issueId'='$WORK_ISSUE_ID' and (context_snapshot->>'wakeReason'='issue_continuation_needed' or context_snapshot->>'retryReason'='issue_continuation_needed');")"
test "$continuation_count" = "0"

runtime_usage="$(pc_sql "select total_input_tokens||'|'||total_output_tokens||'|'||total_cached_input_tokens from agent_runtime_state where company_id='$COMPANY_ID'::uuid and agent_id='$AGENT_ID'::uuid;")"
test "$runtime_usage" = "11|7|2"

printf '%s\n' "PAPERCLIP_WANDORA_CUSTOMER_WORK_SINGLE_RUN_COMPLETION_OK"
printf '%s\n' "customer_work_run_count=$work_run_count"
printf '%s\n' "customer_work_continuation_count=$continuation_count"
printf '%s\n' "customer_work_usage=$runtime_usage"

FAIL_WORK_ID="44444444-4444-4333-8333-444444444444"
fail_issue_body="$(node -e '
  process.stdout.write(JSON.stringify({
    title: "Disposable customer-work read-tool failure proof",
    description: `<!-- wandora-work-v1:${process.argv[2]} -->\\nProve native blocked disposition after a bounded read-tool failure.`,
    status: "todo",
    priority: "high",
    assigneeAgentId: process.argv[1]
  }));
' "$AGENT_ID" "$FAIL_WORK_ID")"
fail_issue_json="$(pc_api POST "/api/companies/$COMPANY_ID/issues" "$fail_issue_body")"
FAIL_ISSUE_ID="$(printf '%s' "$fail_issue_json" | json_field id)"

FAIL_RUN_ID=""
FAIL_RUN_STATUS=""
for _ in $(seq 1 60); do
  FAIL_RUN_ID="$(pc_sql "select id::text from heartbeat_runs where company_id='$COMPANY_ID'::uuid and context_snapshot->>'issueId'='$FAIL_ISSUE_ID' order by created_at desc limit 1;")"
  if [ -n "$FAIL_RUN_ID" ]; then
    FAIL_RUN_STATUS="$(pc_sql "select status::text from heartbeat_runs where id='$FAIL_RUN_ID'::uuid;")"
    case "$FAIL_RUN_STATUS" in
      succeeded|failed|interrupted|cancelled|timed_out) break ;;
    esac
  fi
  sleep 1
done
if [ "$FAIL_RUN_STATUS" != "failed" ]; then
  printf 'Focused read-tool failure run did not fail as required: issue=%s run=%s status=%s\n' "$FAIL_ISSUE_ID" "$FAIL_RUN_ID" "$FAIL_RUN_STATUS" >&2
  exit 43
fi

fail_error_code="$(pc_sql "select coalesce(error_code,'') from heartbeat_runs where id='$FAIL_RUN_ID'::uuid;")"
test "$fail_error_code" = "adapter_failed"
fail_issue_status="$(pc_sql "select status::text from issues where id='$FAIL_ISSUE_ID'::uuid;")"
test "$fail_issue_status" = "blocked"
fail_unblock_owner="$(pc_sql "select coalesce(unblock_descriptor->'owner'->>'agentId','') from issues where id='$FAIL_ISSUE_ID'::uuid;")"
test "$fail_unblock_owner" = "$AGENT_ID"
fail_unblock_action="$(pc_sql "select coalesce(unblock_descriptor->>'action','') from issues where id='$FAIL_ISSUE_ID'::uuid;")"
test "$fail_unblock_action" = "Resolve the read-tool failure, then create a fresh explicitly authorized Wandora customer work if another read is required."

# Wait beyond the scheduler floor. The failed run remains failed, but the native
# blocked disposition is a valid Paperclip-owned next-action path and must suppress
# automatic issue_continuation_needed successor execution.
sleep 12
fail_run_count="$(pc_sql "select count(*) from heartbeat_runs where company_id='$COMPANY_ID'::uuid and context_snapshot->>'issueId'='$FAIL_ISSUE_ID';")"
test "$fail_run_count" = "1"
fail_continuation_count="$(pc_sql "select count(*) from heartbeat_runs where company_id='$COMPANY_ID'::uuid and context_snapshot->>'issueId'='$FAIL_ISSUE_ID' and (context_snapshot->>'wakeReason'='issue_continuation_needed' or context_snapshot->>'retryReason'='issue_continuation_needed');")"
test "$fail_continuation_count" = "0"

printf '%s\n' "PAPERCLIP_WANDORA_CUSTOMER_WORK_READ_TOOL_FAILURE_BLOCKED_DISPOSITION_OK"
printf '%s\n' "failure_run_status=$FAIL_RUN_STATUS"
printf '%s\n' "failure_issue_status=$fail_issue_status"
printf '%s\n' "failure_run_count=$fail_run_count"
printf '%s\n' "failure_continuation_count=$fail_continuation_count"

printf '%s\n' "PAPERCLIP_WANDORA_MASTRA_DISPOSABLE_E2E_ATTESTATION_V1_OK"
printf '%s\n' "migration_014_applied=false"
printf '%s\n' "paperclip_commit=$actual_paperclip_commit"
printf '%s\n' "run_status=$RUN_STATUS"
printf '%s\n' "execution_id_shape=exec_sha256"
printf '%s\n' "issue_id_present=$([ -n "$ISSUE_ID" ] && echo true || echo false)"
