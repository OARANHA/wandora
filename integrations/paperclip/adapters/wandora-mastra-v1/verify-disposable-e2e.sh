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
[REDACTED]
[REDACTED]
[REDACTED]
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
stage_tree "$ROOT/integrations/paperclip/plugins/organization-adapter-v1" "$TMP/organization-plugin"

SDK_JS="$PAPERCLIP_SOURCE_ROOT/packages/plugins/sdk/dist/index.js"
ESBUILD="$PAPERCLIP_SOURCE_ROOT/node_modules/.bin/esbuild"
mkdir -p "$TMP/organization-plugin/dist"
"$ESBUILD" "$TMP/organization-plugin/src/manifest.ts" --bundle --platform=node --format=esm --target=node24   --outfile="$TMP/organization-plugin/dist/manifest.js" --alias:@paperclipai/plugin-sdk="$SDK_JS" >/dev/null
"$ESBUILD" "$TMP/organization-plugin/src/worker.ts" --bundle --platform=node --format=esm --target=node24   --outfile="$TMP/organization-plugin/dist/worker.js" --alias:@paperclipai/plugin-sdk="$SDK_JS" >/dev/null

printf '%s\n' 'paperclip-execution-bridge-disposable-hmac-0123456789abcdef0123456789abcdef' > "$TMP/bridge.hmac"
printf '%s\n' 'wandora-fast-read-disposable-hmac-0123456789abcdef0123456789abcdef' > "$TMP/fast-read.hmac"
printf '%s\n' 'wandora-organization-adapter-disposable-hmac-0123456789abcdef0123456789abcdef' > "$TMP/organization-adapter.hmac"
printf '%s\n' "$CORE_PASSWORD" > "$TMP/core-db-password"
printf '%s\n' 'gateway-ingress-disposable-hmac-0123456789abcdef0123456789abcdef' > "$TMP/gateway.hmac"
cat > "$TMP/paperclip-loopback-proxy.mjs" <<'PROXY'
import http from 'node:http';
import os from 'node:os';

const address = Object.values(os.networkInterfaces())
  .flat()
  .find((entry) => entry?.family === 'IPv4' && !entry.internal)?.address;
if (!address) throw new Error('paperclip_disposable_network_address_unavailable');

function allowed(method, url) {
  return (
    (method === 'GET' && url === '/api/agents/me')
    || (method === 'POST' && url === '/api/tool-gateway/sessions')
    || (method === 'GET' && url === '/api/tool-gateway/tools')
    || (method === 'POST' && url === '/api/tool-gateway/tools/call')
  );
}

const server = http.createServer(async (request, response) => {
  if (!allowed(request.method, request.url)) {
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end('{"error":"not_found"}');
    return;
  }
  let body = '';
  for await (const chunk of request) body += chunk;
  const headers = {};
  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') headers[key] = value;
  }
  try {
    const upstream = await fetch('http://127.0.0.1:3100' + request.url, {
      method: request.method,
      headers,
      body: body || undefined,
    });
    const text = await upstream.text();
    response.writeHead(upstream.status, {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
    });
    response.end(text);
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
      const [REDACTED]'x-wandora-paperclip-run-token'] ?? '');
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

chmod 0644 "$TMP/bridge.hmac" "$TMP/fast-read.hmac" "$TMP/organization-adapter.hmac" "$TMP/core-db-password" "$TMP/gateway.hmac" "$TMP/paperclip-loopback-proxy.mjs" "$TMP/fake-wandora-core.mjs"

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
for migration in   20260914_001_core_multitenant_auth_v1.sql   20260914_002_ana_vertical_slice_v1.sql   20260914_003_core_runtime_role_v1.sql   20260915_004_supervised_proposal_v1.sql   20260915_005_human_supervision_read_v1.sql   20260915_006_human_session_bootstrap_v1.sql   20260915_007_human_send_proposal_v1.sql   20260916_008_private_tenant_provisioning_v1.sql   20260916_009_platform_provisioner_role_v1.sql   20260916_010_organization_adapter_state_v1.sql   20260916_011_organization_adapter_service_contract_v1.sql   20260918_013_customer_hire_tenant_eligibility_v1.sql   20260922_017_organization_grounding_contract_v1.sql   20260925_020_digital_employee_development_contract_v1.sql; do
  docker cp "$MIGRATIONS/$migration" "$DB:/tmp/$migration" >/dev/null
  docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$WANDORA_DB" -f "/tmp/$migration" >/dev/null
done

docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$WANDORA_DB" -c   "ALTER ROLE wandora_core_runtime CONNECTION LIMIT 4 PASSWORD '$CORE_PASSWORD';" >/dev/null

docker run -d --name "$PAPERCLIP"   --network "$NET" --network-alias wandora-paperclip   --read-only   --tmpfs /tmp:rw,nosuid,size=64m   --tmpfs /paperclip:rw,nosuid,size=256m   -v "$TMP/paperclip-source:/app:ro"   -v "$TMP/wandora-adapter:/proof/wandora-adapter:ro"   -v "$TMP/organization-plugin:/proof/organization-plugin:ro"   -v "$TMP/bridge.hmac:/proof/bridge.hmac:ro"   -e HOST=127.0.0.1   -e PORT=3100   -e SERVE_UI=false   -e PAPERCLIP_HOME=/paperclip   -e PAPERCLIP_INSTANCE_ID=wandora-disposable-attestation   -e PAPERCLIP_DEPLOYMENT_MODE=local_trusted   -e PAPERCLIP_DEPLOYMENT_EXPOSURE=private   -e PAPERCLIP_PUBLIC_URL=http://wandora-paperclip:3100   -e PAPERCLIP_ALLOWED_HOSTNAMES=wandora-paperclip   -e PAPERCLIP_TELEMETRY_DISABLED=1   -e DO_NOT_TRACK=1   -e HEARTBEAT_SCHEDULER_INTERVAL_MS=10000   -e PAPERCLIP_BUILD_VERSION=v2026.916.0   -e PAPERCLIP_BUILD_COMMIT="$EXPECTED_PAPERCLIP_COMMIT"   -e PAPERCLIP_MIGRATION_AUTO_APPLY=true   -e PAPERCLIP_MIGRATION_PROMPT=never   -e DATABASE_URL="[REDACTED]$DB:5432/paperclip_attestation"   -e BETTER_AUTH_SECRET=disposable-better-auth-secret-0123456789abcdef   -e PAPERCLIP_AGENT_JWT_SECRET=disposable-agent-jwt-secret-0123456789abcdef0123456789abcdef   -e PAPERCLIP_TOOL_ACTION_SIGNING_SECRET=disposable-tool-secret-0123456789abcdef0123456789abcdef   -e WANDORA_PAPERCLIP_EXECUTION_BRIDGE_URL=http://wandora-core:8788/internal/v1/paperclip/execution   -e WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE=/proof/bridge.hmac   "$NODE24_IMAGE"   node --import /app/server/node_modules/tsx/dist/loader.mjs /app/server/src/index.ts >/dev/null

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
    ' "$COMPANY_ID"
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

pc_sql() {
  local statement="$1"
  docker exec -e PGPASSWORD="$PAPERCLIP_DB_PASSWORD" "$DB" \
    psql -X -At -h 127.0.0.1 -U paperclip_attestation -d paperclip_attestation -c "$statement"
}

pc_signed_plugin_webhook() {
  local endpoint="$1" body="$2"
  local timestamp signature
  timestamp="$(date +%s)"
  signature="$(node -e '
    const { createHmac } = require("node:crypto");
    const fs = require("node:fs");
    const [REDACTED] "utf8").trim();
    process.stdout.write("sha256=" + createHmac("sha256", secret)
      .update(process.argv[2] + "." + process.argv[3]).digest("hex"));
  ' "$TMP/organization-adapter.hmac" "$timestamp" "$body")"
  docker exec \
    -e WEBHOOK_ENDPOINT="$endpoint" \
    -e WEBHOOK_BODY="$body" \
    -e WEBHOOK_TIMESTAMP="$timestamp" \
    -e WEBHOOK_SIGNATURE="$signature" \
    "$PAPERCLIP" node --input-type=module -e '
      const response = await fetch("http://127.0.0.1:3100" + process.env.WEBHOOK_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-wandora-timestamp": process.env.WEBHOOK_TIMESTAMP,
          "x-wandora-signature": process.env.WEBHOOK_SIGNATURE,
        },
        body: process.env.WEBHOOK_BODY,
      });
      const text = await response.text();
      if (!response.ok) {
        console.error(text);
        console.error("Plugin webhook HTTP " + response.status);
        process.exit(22);
      }
      process.stdout.write(text);
    '
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

plugin_install="$(pc_api POST /api/plugins/install '{"packageName":"/proof/organization-plugin","isLocalPath":true}')"
PLUGIN_ID="$(printf '%s' "$plugin_install" | json_field id)"

company_json="$(pc_api POST /api/companies '{"name":"Wandora Disposable Execution Attestation"}')"
COMPANY_ID="$(printf '%s' "$company_json" | json_field id)"

organization_secret_body="$(node -e '
  const fs = require("node:fs");
  process.stdout.write(JSON.stringify({
    name: "Wandora Organization Adapter Disposable HMAC",
    key: "wandora.organization-adapter.disposable-hmac",
    provider: "local_encrypted",
    managedMode: "paperclip_managed",
    value: fs.readFileSync(process.argv[1], "utf8").trim(),
  }));
' "$TMP/organization-adapter.hmac")"
organization_secret_json="$(pc_api POST "/api/companies/$COMPANY_ID/secrets" "$organization_secret_body")"
ORGANIZATION_SECRET_ID="$(printf '%s' "$organization_secret_json" | json_field id)"

plugin_config_body="$(node -e '
  process.stdout.write(JSON.stringify({
    companyId: process.argv[1],
    configJson: {
      hmacSecret: { type: "secret_ref", secretId: process.argv[2] },
    },
  }));
' "$COMPANY_ID" "$ORGANIZATION_SECRET_ID")"
pc_api POST "/api/plugins/$PLUGIN_ID/config" "$plugin_config_body" >/dev/null

reconcile_body="$(node -e '
  process.stdout.write(JSON.stringify({
    companyId: process.argv[1],
    catalogKey: "ana-commercial-v1",
  }));
' "$COMPANY_ID")"
pc_signed_plugin_webhook "/api/plugins/$PLUGIN_ID/webhooks/employee-reconcile" "$reconcile_body" >/dev/null
pc_signed_plugin_webhook "/api/plugins/$PLUGIN_ID/webhooks/employee-activate" "$reconcile_body" >/dev/null

AGENT_ID="$(pc_sql "select id::text from agents where company_id='$COMPANY_ID'::uuid and metadata->'pluginManagedAgent'->>'pluginKey'='wandora.organization-adapter-v1' and metadata->'pluginManagedAgent'->>'agentKey'='ana-commercial-v1' order by created_at desc limit 1;")"
if ! [[ "$AGENT_ID" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
  printf 'Disposable Organization Adapter did not reconcile a valid managed agent.\n' >&2
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

docker run -d --name "$CORE"   --network "$NET" --network-alias wandora-core   --read-only   --tmpfs /tmp:rw,noexec,nosuid,size=16m   --security-opt no-new-privileges:true   --cap-drop ALL   -v "$TMP/core-db-[REDACTED]"   -v "$TMP/gateway.hmac:/run/secrets/gateway.hmac:ro"   -v "$TMP/bridge.hmac:/run/secrets/bridge.hmac:ro"   -e PORT=8788   -e WANDORA_CORE_MODE=database   -e WANDORA_CORE_DB_HOST="$DB"   -e WANDORA_CORE_DB_PORT=5432   -e WANDORA_CORE_DB_NAME="$WANDORA_DB"   -e WANDORA_CORE_DB_USER=wandora_core_runtime   -e WANDORA_CORE_DB_PASSWORD_FILE=/run/secrets/core-db-password   -e WANDORA_GATEWAY_INGRESS_ENABLED=true   -e WANDORA_GATEWAY_INGRESS_SECRET_FILE=/run/secrets/gateway.hmac   -e WANDORA_AGENT_RUNTIME_MODE=mastra-deterministic   -e MASTRA_TELEMETRY_DISABLED=true   -e WANDORA_PAPERCLIP_EXECUTION_BRIDGE_ENABLED=true   -e WANDORA_PAPERCLIP_AGENT_ME_URL=http://wandora-paperclip:3100/api/agents/me   -e WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE=/run/secrets/bridge.hmac   "$CORE_IMAGE" >/dev/null

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
# Migrations 017 and 020 are applied only to this disposable database because the execution
# bridge readiness contract now requires organization grounding plus employee-development read boundaries.
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

# --- ADR 0277 disposable issue-less fast-read attestation ---
# Install Paperclip's official deterministic safe read-only Todo/KV fixture.
fast_example_json="$(pc_api POST "/api/companies/$COMPANY_ID/tools/examples/safe-read-only-todo-kv/install" '{}')"
FAST_READ_CONNECTION_ID="$(printf '%s' "$fast_example_json" | node -e '
  const fs=require("node:fs");
  const value=JSON.parse(fs.readFileSync(0,"utf8"));
  process.stdout.write(String(value.connection?.id ?? value.install?.connectionId ?? ""));
')"
test -n "$FAST_READ_CONNECTION_ID"

# Replace the normal disposable Core with the focused fast-read Core. It wires
# run identity + Tool Gateway + intent verification + deterministic execution,
# while both normal AgentTaskRuntime paths fail if touched.
docker rm -f "$CORE" >/dev/null
docker run -d --name "$CORE" \
  --network "$NET" --network-alias wandora-core \
  --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --security-opt no-new-privileges:true --cap-drop ALL \
  -v "$TMP/wandora-adapter/disposable-fast-read-core.mjs:/proof/disposable-fast-read-core.mjs:ro" \
  -e WANDORA_CORE_DB_HOST="$DB" \
  -e WANDORA_CORE_DB_PORT=5432 \
  -e WANDORA_CORE_DB_NAME="$WANDORA_DB" \
  -e WANDORA_CORE_DB_USER=wandora_core_runtime \
  -e WANDORA_CORE_DB_PASSWORD="$CORE_PASSWORD" \
  -e WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET="$(cat "$TMP/bridge.hmac")" \
  -e WANDORA_FAST_READ_INTENT_SECRET="$(cat "$TMP/fast-read.hmac")" \
  "$CORE_IMAGE" node /proof/disposable-fast-read-core.mjs >/dev/null

for _ in $(seq 1 30); do
  if docker exec "$CORE" node -e "fetch('http://127.0.0.1:8788/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "$CORE" node -e "fetch('http://127.0.0.1:8788/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null

FAST_READ_REQUEST='Leia o valor sintético do projeto.'

make_fast_read_token() {
  local correlation="$1"
  local capability="$2"
  local age_ms="$3"
  local ttl_seconds="$4"
  docker exec \
    -e FAST_READ_CORRELATION="$correlation" \
    -e FAST_READ_REQUEST="$FAST_READ_REQUEST" \
    -e FAST_READ_CAPABILITY="$capability" \
    -e FAST_READ_AGE_MS="$age_ms" \
    -e FAST_READ_TTL_SECONDS="$ttl_seconds" \
    -e FAST_READ_SECRET="$(cat "$TMP/fast-read.hmac")" \
    "$CORE" node --input-type=module -e '
      import { issueFastReadIntent } from "/app/dist/semantic-routing/fast-read-intent.js";
      const capability = process.env.FAST_READ_CAPABILITY;
      const [REDACTED]
        [REDACTED]
        organizationId: "11111111-1111-4111-8111-111111111111",
        employeeId: "22222222-2222-4222-8222-222222222222",
        correlationId: process.env.FAST_READ_CORRELATION,
        request: process.env.FAST_READ_REQUEST,
        decision: {
          mode: "deterministic_read",
          capability,
          confidence: 1,
          needsDataOrToolLookup: 1,
          needsMoreContext: 0,
          needsHumanReview: 0,
          ambiguity: "none",
        },
        availableCapabilities: [capability],
        policy: {
          minimumConfidence: 0.9,
          maximumNeedsMoreContext: 0.1,
          maximumNeedsHumanReview: 0.1,
          minimumNeedsDataOrToolLookup: 0.9,
        },
        nowMs: Date.now() - Number(process.env.FAST_READ_AGE_MS),
        ttlSeconds: Number(process.env.FAST_READ_TTL_SECONDS),
      });
      process.stdout.write(token);
    '
}

make_fast_read_webhook_body() {
  local correlation="$1"
  local token="$2"
  node -e '
    process.stdout.write(JSON.stringify({
      companyId: process.argv[1],
      catalogKey: "ana-commercial-v1",
      correlationId: process.argv[2],
      intentToken: process.argv[3],
      request: process.argv[4],
    }));
  ' "$COMPANY_ID" "$correlation" "$token" "$FAST_READ_REQUEST"
}

latest_fast_read_run_id() {
  pc_sql "select id::text from heartbeat_runs where company_id='$COMPANY_ID'::uuid and agent_id='$AGENT_ID'::uuid and context_snapshot->>'wakeReason'='wandora_fast_read_v1' order by created_at desc limit 1;"
}

wait_terminal_fast_read() {
  local run_id="$1"
  local status=""
  for _ in $(seq 1 90); do
    status="$(pc_sql "select status::text from heartbeat_runs where id='$run_id'::uuid;")"
    case "$status" in
      succeeded|failed|interrupted|cancelled|timed_out)
        printf '%s' "$status"
        return
        ;;
    esac
    sleep 1
  done
  printf '%s' "$status"
}

tool_invocation_count() {
  pc_sql "select count(*) from tool_invocations where company_id='$COMPANY_ID'::uuid;"
}

FAST_CORRELATION='77777777-7777-4777-8777-777777777777'
FAST_TOKEN="$(make_fast_read_token "$FAST_CORRELATION" 'business.products.price' 0 120)"
FAST_BODY="$(make_fast_read_webhook_body "$FAST_CORRELATION" "$FAST_TOKEN")"
fast_issue_before="$(pc_sql "select count(*) from issues where company_id='$COMPANY_ID'::uuid;")"
fast_run_before="$(pc_sql "select count(*) from heartbeat_runs where company_id='$COMPANY_ID'::uuid and agent_id='$AGENT_ID'::uuid and context_snapshot->>'wakeReason'='wandora_fast_read_v1';")"
fast_tool_before="$(tool_invocation_count)"

pc_signed_plugin_webhook "/api/plugins/$PLUGIN_ID/webhooks/employee-fast-read" "$FAST_BODY" >/dev/null
FAST_READ_RUN_ID=""
for _ in $(seq 1 30); do
  FAST_READ_RUN_ID="$(latest_fast_read_run_id)"
  if [ -n "$FAST_READ_RUN_ID" ]; then break; fi
  sleep 1
done
test -n "$FAST_READ_RUN_ID"
test "$(wait_terminal_fast_read "$FAST_READ_RUN_ID")" = "succeeded"

# Replaying the exact Wandora correlation must return the Paperclip-owned receipt
# and must not create a second run or tool call.
pc_signed_plugin_webhook "/api/plugins/$PLUGIN_ID/webhooks/employee-fast-read" "$FAST_BODY" >/dev/null
sleep 2

fast_issue_after="$(pc_sql "select count(*) from issues where company_id='$COMPANY_ID'::uuid;")"
fast_run_after="$(pc_sql "select count(*) from heartbeat_runs where company_id='$COMPANY_ID'::uuid and agent_id='$AGENT_ID'::uuid and context_snapshot->>'wakeReason'='wandora_fast_read_v1';")"
fast_tool_after="$(tool_invocation_count)"
test "$fast_issue_after" = "$fast_issue_before"
test "$((fast_run_after-fast_run_before))" = "1"
test "$((fast_tool_after-fast_tool_before))" = "1"
test "$(pc_sql "select count(*) from tool_invocations where company_id='$COMPANY_ID'::uuid and run_id='$FAST_READ_RUN_ID'::uuid and status='completed' and risk_level='read';")" = "1"
test -z "$(pc_sql "select coalesce(context_snapshot->>'issueId','') from heartbeat_runs where id='$FAST_READ_RUN_ID'::uuid;")"
fast_usage="$(pc_sql "select coalesce((usage_json->>'inputTokens')::int,-1)||'|'||coalesce((usage_json->>'outputTokens')::int,-1)||'|'||coalesce((usage_json->>'cachedInputTokens')::int,-1)||'|'||coalesce((usage_json->>'totalTokens')::int,-1) from heartbeat_runs where id='$FAST_READ_RUN_ID'::uuid;")"
test "$fast_usage" = "0|0|0|0"
test "$(pc_sql "select coalesce(result_json->>'model','') from heartbeat_runs where id='$FAST_READ_RUN_ID'::uuid;")" = "wandora-deterministic-read-v1"
fast_agentic_calls="$(docker exec "$CORE" node -e "fetch('http://127.0.0.1:8788/healthz').then(r=>r.json()).then(v=>process.stdout.write(String(v.agenticCalls))).catch(()=>process.exit(1))")"
test "$fast_agentic_calls" = "0"

# No retry/continuation successor after the scheduler floor.
sleep 12
test "$(pc_sql "select count(*) from heartbeat_runs where company_id='$COMPANY_ID'::uuid and agent_id='$AGENT_ID'::uuid and context_snapshot->>'wakeReason'='wandora_fast_read_v1';")" = "$fast_run_after"

# Expired intent -> zero Tool Gateway calls.
EXPIRED_CORRELATION='88888888-8888-4888-8888-888888888888'
EXPIRED_TOKEN="$(make_fast_read_token "$EXPIRED_CORRELATION" 'business.products.price' 10000 5)"
EXPIRED_BODY="$(make_fast_read_webhook_body "$EXPIRED_CORRELATION" "$EXPIRED_TOKEN")"
expired_tool_before="$(tool_invocation_count)"
pc_signed_plugin_webhook "/api/plugins/$PLUGIN_ID/webhooks/employee-fast-read" "$EXPIRED_BODY" >/dev/null
EXPIRED_RUN_ID=""
for _ in $(seq 1 30); do
  EXPIRED_RUN_ID="$(latest_fast_read_run_id)"
  if [ -n "$EXPIRED_RUN_ID" ] && [ "$EXPIRED_RUN_ID" != "$FAST_READ_RUN_ID" ]; then break; fi
  sleep 1
done
test -n "$EXPIRED_RUN_ID"
test "$(wait_terminal_fast_read "$EXPIRED_RUN_ID")" = "failed"
expired_tool_after="$(tool_invocation_count)"
test "$expired_tool_after" = "$expired_tool_before"

# Invalid signature -> zero Tool Gateway calls.
INVALID_CORRELATION='89898989-8989-4989-8989-898989898989'
INVALID_TOKEN="$(make_fast_read_token "$INVALID_CORRELATION" 'business.products.price' 0 120)x"
INVALID_BODY="$(make_fast_read_webhook_body "$INVALID_CORRELATION" "$INVALID_TOKEN")"
invalid_tool_before="$(tool_invocation_count)"
pc_signed_plugin_webhook "/api/plugins/$PLUGIN_ID/webhooks/employee-fast-read" "$INVALID_BODY" >/dev/null
INVALID_RUN_ID=""
for _ in $(seq 1 30); do
  INVALID_RUN_ID="$(latest_fast_read_run_id)"
  if [ -n "$INVALID_RUN_ID" ] && [ "$INVALID_RUN_ID" != "$EXPIRED_RUN_ID" ]; then break; fi
  sleep 1
done
test -n "$INVALID_RUN_ID"
test "$(wait_terminal_fast_read "$INVALID_RUN_ID")" = "failed"
invalid_tool_after="$(tool_invocation_count)"
test "$invalid_tool_after" = "$invalid_tool_before"

# Capability absent from the currently authorized Tool Gateway set -> zero calls.
UNAUTH_CORRELATION='99999999-9999-4999-8999-999999999999'
UNAUTH_TOKEN="$(make_fast_read_token "$UNAUTH_CORRELATION" 'business.orders.search' 0 120)"
UNAUTH_BODY="$(make_fast_read_webhook_body "$UNAUTH_CORRELATION" "$UNAUTH_TOKEN")"
unauth_tool_before="$(tool_invocation_count)"
pc_signed_plugin_webhook "/api/plugins/$PLUGIN_ID/webhooks/employee-fast-read" "$UNAUTH_BODY" >/dev/null
UNAUTH_RUN_ID=""
for _ in $(seq 1 30); do
  UNAUTH_RUN_ID="$(latest_fast_read_run_id)"
  if [ -n "$UNAUTH_RUN_ID" ] && [ "$UNAUTH_RUN_ID" != "$INVALID_RUN_ID" ]; then break; fi
  sleep 1
done
test -n "$UNAUTH_RUN_ID"
test "$(wait_terminal_fast_read "$UNAUTH_RUN_ID")" = "failed"
unauth_tool_after="$(tool_invocation_count)"
test "$unauth_tool_after" = "$unauth_tool_before"

# Disposable-only duplicate catalog binding for the same concrete read tool.
FAST_READ_CATALOG_ENTRY_ID="$(pc_sql "select id::text from tool_catalog_entries where company_id='$COMPANY_ID'::uuid and connection_id='$FAST_READ_CONNECTION_ID'::uuid and tool_name='kv_get' and status='active' order by created_at limit 1;")"
FAST_READ_PROFILE_ID="$(pc_sql "select id::text from tool_profiles where company_id='$COMPANY_ID'::uuid and profile_key='paperclip.examples.safe-read-only-todo-kv.profile' and status='active' limit 1;")"
test -n "$FAST_READ_CATALOG_ENTRY_ID"
test -n "$FAST_READ_PROFILE_ID"
DUP_CATALOG_ID="$(pc_sql "select gen_random_uuid()::text;")"
pc_sql "insert into tool_catalog_entries(id,company_id,application_id,connection_id,entry_kind,name,tool_name,title,description,input_schema,annotations,risk_level,is_read_only,is_write,is_destructive,status,version_hash) select '$DUP_CATALOG_ID'::uuid,company_id,application_id,connection_id,entry_kind,name||'-duplicate',tool_name,title,description,input_schema,annotations,risk_level,is_read_only,is_write,is_destructive,status,version_hash||'-duplicate' from tool_catalog_entries where id='$FAST_READ_CATALOG_ENTRY_ID'::uuid;" >/dev/null
pc_sql "insert into tool_profile_entries(company_id,profile_id,selector_type,effect,catalog_entry_id) values ('$COMPANY_ID'::uuid,'$FAST_READ_PROFILE_ID'::uuid,'catalog_entry','include','$DUP_CATALOG_ID'::uuid);" >/dev/null

DUP_CORRELATION='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
DUP_TOKEN="$(make_fast_read_token "$DUP_CORRELATION" 'business.products.price' 0 120)"
DUP_BODY="$(make_fast_read_webhook_body "$DUP_CORRELATION" "$DUP_TOKEN")"
dup_tool_before="$(tool_invocation_count)"
pc_signed_plugin_webhook "/api/plugins/$PLUGIN_ID/webhooks/employee-fast-read" "$DUP_BODY" >/dev/null
DUP_RUN_ID=""
for _ in $(seq 1 30); do
  DUP_RUN_ID="$(latest_fast_read_run_id)"
  if [ -n "$DUP_RUN_ID" ] && [ "$DUP_RUN_ID" != "$UNAUTH_RUN_ID" ]; then break; fi
  sleep 1
done
test -n "$DUP_RUN_ID"
test "$(wait_terminal_fast_read "$DUP_RUN_ID")" = "failed"
dup_tool_after="$(tool_invocation_count)"
test "$dup_tool_after" = "$dup_tool_before"

printf '%s\n' "PAPERCLIP_WANDORA_FAST_READ_DISPOSABLE_ATTESTATION_V1_OK"
printf '%s\n' "fast_read_issue_delta=$((fast_issue_after-fast_issue_before))"
printf '%s\n' "fast_read_run_delta=$((fast_run_after-fast_run_before))"
printf '%s\n' "fast_read_tool_delta=$((fast_tool_after-fast_tool_before))"
printf '%s\n' "fast_read_usage=$fast_usage"
printf '%s\n' "fast_read_agentic_calls=$fast_agentic_calls"
printf '%s\n' "fast_read_duplicate_run_same=true"
printf '%s\n' "fast_read_expired_tool_delta=$((expired_tool_after-expired_tool_before))"
printf '%s\n' "fast_read_invalid_tool_delta=$((invalid_tool_after-invalid_tool_before))"
printf '%s\n' "fast_read_unauthorized_tool_delta=$((unauth_tool_after-unauth_tool_before))"
printf '%s\n' "fast_read_duplicate_capability_tool_delta=$((dup_tool_after-dup_tool_before))"

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
