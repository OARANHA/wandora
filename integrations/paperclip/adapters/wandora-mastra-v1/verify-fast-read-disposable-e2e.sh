#!/usr/bin/env bash
set -Eeuo pipefail

on_error() {
  local status="$?"
  printf 'FAST_READ_ATTESTATION_FAILURE status=%s line=%s command=%q\n' \
    "$status" "${BASH_LINENO[0]:-${LINENO}}" "${BASH_COMMAND:-unknown}" >&2
}
trap on_error ERR

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
PAPERCLIP_SOURCE_ROOT="${PAPERCLIP_SOURCE_ROOT:?set PAPERCLIP_SOURCE_ROOT}"
EXPECTED_PAPERCLIP_COMMIT="d554c4789ed3930f8a53ac9fdf6503b3187097da"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-supabase/postgres:17.6.1.136}"
NODE24_IMAGE="${NODE24_IMAGE:-node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6}"
TMP_PARENT="${WANDORA_ATTESTATION_TMP_ROOT:-${RUNNER_TEMP:-/tmp}/wandora-fast-read-e2e}"
SUFFIX="${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}-$$"
TMP="${TMP_PARENT%/}/$SUFFIX"
NET="wandora-fast-read-e2e-$SUFFIX"
DB="wandora-fast-read-e2e-db-$SUFFIX"
PAPERCLIP="wandora-fast-read-e2e-paperclip-$SUFFIX"
PAPERCLIP_PROXY="wandora-fast-read-e2e-proxy-$SUFFIX"
CORE="wandora-fast-read-e2e-core-$SUFFIX"
CORE_IMAGE="wandora/core:fast-read-e2e-$SUFFIX"
WANDORA_DB="wandora_fast_read_test"
ORG_ID="11111111-1111-4111-8111-111111111111"
EMPLOYEE_ID="22222222-2222-4222-8222-222222222222"

random_hex() {
  node -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("hex"))'
}
DB_AUTH="$(random_hex)"
PAPERCLIP_DB_AUTH="$(random_hex)"
CORE_DB_AUTH="$(random_hex)"
BRIDGE_KEY="$(random_hex)"
INTENT_KEY="$(random_hex)"
ORGANIZATION_KEY="$(random_hex)"
GATEWAY_KEY="$(random_hex)"
BETTER_AUTH_KEY="$(random_hex)"
AGENT_JWT_KEY="$(random_hex)"
TOOL_SIGNING_KEY="$(random_hex)"

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

stage_tree() {
  local source="$1" target="$2"
  mkdir -p "$(dirname "$target")"
  if cp -al "$source" "$target" 2>/dev/null; then return; fi
  rm -rf "$target"
  cp -a "$source" "$target"
}

stage_tree "$PAPERCLIP_SOURCE_ROOT" "$TMP/paperclip-source"
stage_tree "$ROOT/integrations/paperclip/adapters/wandora-mastra-v1" "$TMP/wandora-adapter"
stage_tree "$ROOT/integrations/paperclip/plugins/organization-adapter-v1" "$TMP/organization-plugin"

SDK_JS="$PAPERCLIP_SOURCE_ROOT/packages/plugins/sdk/dist/index.js"
ESBUILD="$PAPERCLIP_SOURCE_ROOT/node_modules/.bin/esbuild"
mkdir -p "$TMP/organization-plugin/dist"
"$ESBUILD" "$TMP/organization-plugin/src/manifest.ts" --bundle --platform=node --format=esm --target=node24 \
  --outfile="$TMP/organization-plugin/dist/manifest.js" --alias:@paperclipai/plugin-sdk="$SDK_JS" >/dev/null
"$ESBUILD" "$TMP/organization-plugin/src/worker.ts" --bundle --platform=node --format=esm --target=node24 \
  --outfile="$TMP/organization-plugin/dist/worker.js" --alias:@paperclipai/plugin-sdk="$SDK_JS" >/dev/null

printf '%s\n' "$BRIDGE_KEY" > "$TMP/bridge.hmac"
printf '%s\n' "$GATEWAY_KEY" > "$TMP/gateway.hmac"
chmod 0600 "$TMP/bridge.hmac" "$TMP/gateway.hmac"

cat > "$TMP/paperclip-loopback-proxy.mjs" <<'PROXY'
import http from 'node:http';
import os from 'node:os';
const address = Object.values(os.networkInterfaces()).flat()
  .find((entry) => entry?.family === 'IPv4' && !entry.internal)?.address;
if (!address) throw new Error('paperclip_disposable_network_address_unavailable');
http.createServer(async (request, response) => {
  const authorization = request.headers.authorization ?? '';
  const runId = request.headers['x-paperclip-run-id'] ?? '';
  if (request.method !== 'GET' || request.url !== '/api/agents/me'
    || !authorization.toLowerCase().startsWith('bearer ')
    || typeof runId !== 'string' || !runId) {
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end('{"error":"not_found"}');
    return;
  }
  try {
    const upstream = await fetch('http://127.0.0.1:3100/api/agents/me', {
      headers: { authorization, 'x-paperclip-run-id': runId, accept: 'application/json' },
    });
    response.writeHead(upstream.status, {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
    });
    response.end(await upstream.text());
  } catch {
    response.writeHead(502, { 'content-type': 'application/json' });
    response.end('{"error":"upstream_unavailable"}');
  }
}).listen(3100, address);
PROXY
chmod 0644 "$TMP/paperclip-loopback-proxy.mjs"

docker network create "$NET" >/dev/null
docker run -d --name "$DB" --network "$NET" \
  -e POSTGRES_PASSWORD="$DB_AUTH" -e POSTGRES_DB="$WANDORA_DB" "$POSTGRES_IMAGE" >/dev/null
for _ in $(seq 1 90); do
  docker exec "$DB" pg_isready -U postgres -d "$WANDORA_DB" >/dev/null 2>&1 && break
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
CREATE ROLE paperclip_attestation LOGIN PASSWORD '$PAPERCLIP_DB_AUTH';
CREATE DATABASE paperclip_attestation OWNER paperclip_attestation;
SQL

MIGRATIONS="$ROOT/infra/stacks/supabase/migrations"
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
  20260918_013_customer_hire_tenant_eligibility_v1.sql \
  20260922_017_organization_grounding_contract_v1.sql \
  20260925_020_digital_employee_development_contract_v1.sql; do
  docker cp "$MIGRATIONS/$migration" "$DB:/tmp/$migration" >/dev/null
  docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$WANDORA_DB" -f "/tmp/$migration" >/dev/null
done
docker exec "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$WANDORA_DB" -c \
  "ALTER ROLE wandora_core_runtime CONNECTION LIMIT 4 PASSWORD '$CORE_DB_AUTH';" >/dev/null

docker run -d --name "$PAPERCLIP" --network "$NET" --network-alias wandora-paperclip \
  --read-only --tmpfs /tmp:rw,nosuid,size=64m --tmpfs /paperclip:rw,nosuid,size=256m \
  -v "$TMP/paperclip-source:/app:ro" \
  -v "$TMP/wandora-adapter:/proof/wandora-adapter:ro" \
  -v "$TMP/organization-plugin:/proof/organization-plugin:ro" \
  -v "$TMP/bridge.hmac:/proof/bridge.hmac:ro" \
  -e HOST=127.0.0.1 -e PORT=3100 -e SERVE_UI=false \
  -e PAPERCLIP_HOME=/paperclip \
  -e PAPERCLIP_INSTANCE_ID=wandora-fast-read-disposable \
  -e PAPERCLIP_DEPLOYMENT_MODE=local_trusted -e PAPERCLIP_DEPLOYMENT_EXPOSURE=private \
  -e PAPERCLIP_PUBLIC_URL=http://wandora-paperclip:3100 -e PAPERCLIP_ALLOWED_HOSTNAMES=wandora-paperclip \
  -e PAPERCLIP_TELEMETRY_DISABLED=1 -e DO_NOT_TRACK=1 \
  -e HEARTBEAT_SCHEDULER_INTERVAL_MS=10000 \
  -e PAPERCLIP_BUILD_VERSION=v2026.916.0 -e PAPERCLIP_BUILD_COMMIT="$EXPECTED_PAPERCLIP_COMMIT" \
  -e PAPERCLIP_MIGRATION_AUTO_APPLY=true -e PAPERCLIP_MIGRATION_PROMPT=never \
  -e DATABASE_URL="postgresql://paperclip_attestation:$PAPERCLIP_DB_AUTH@$DB:5432/paperclip_attestation" \
  -e BETTER_AUTH_SECRET="$BETTER_AUTH_KEY" \
  -e PAPERCLIP_AGENT_JWT_SECRET="$AGENT_JWT_KEY" \
  -e PAPERCLIP_TOOL_ACTION_SIGNING_SECRET="$TOOL_SIGNING_KEY" \
  -e WANDORA_PAPERCLIP_EXECUTION_BRIDGE_URL=http://wandora-core:8788/internal/v1/paperclip/execution \
  -e WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE=/proof/bridge.hmac \
  "$NODE24_IMAGE" node --import /app/server/node_modules/tsx/dist/loader.mjs /app/server/src/index.ts >/dev/null

pc_api() {
  local method="$1" path="$2" body="${3:-}"
  docker exec -e METHOD="$method" -e API_PATH="$path" -e API_BODY="$body" "$PAPERCLIP" node --input-type=module -e '
    const response = await fetch("http://127.0.0.1:3100" + process.env.API_PATH, {
      method: process.env.METHOD,
      headers: process.env.API_BODY ? { "content-type": "application/json" } : undefined,
      body: process.env.API_BODY || undefined,
    });
    const text = await response.text();
    process.stdout.write(text);
    if (!response.ok) process.exit(22);
  '
}
json_field() {
  local field="$1"
  node -e '
    const fs=require("node:fs"); let value=JSON.parse(fs.readFileSync(0,"utf8"));
    for (const part of process.argv[1].split(".")) value=value?.[part];
    if (value === undefined || value === null) process.exit(3);
    process.stdout.write(String(value));
  ' "$field"
}
pc_sql() {
  local statement="$1"
  docker exec -e PGPASSWORD="$PAPERCLIP_DB_AUTH" "$DB" \
    psql -X -At -h 127.0.0.1 -U paperclip_attestation -d paperclip_attestation -c "$statement"
}
for _ in $(seq 1 120); do
  pc_api GET /api/health >/dev/null 2>&1 && break
  sleep 1
done
pc_api GET /api/health >/dev/null

docker run -d --name "$PAPERCLIP_PROXY" --network "container:$PAPERCLIP" \
  --read-only --tmpfs /tmp:rw,noexec,nosuid,size=8m --security-opt no-new-privileges:true --cap-drop ALL \
  -v "$TMP/paperclip-loopback-proxy.mjs:/proof/paperclip-loopback-proxy.mjs:ro" \
  "$NODE24_IMAGE" node /proof/paperclip-loopback-proxy.mjs >/dev/null

adapter_install="$(pc_api POST /api/adapters/install '{"packageName":"/proof/wandora-adapter","isLocalPath":true}')"
test -n "$adapter_install"
plugin_install="$(pc_api POST /api/plugins/install '{"packageName":"/proof/organization-plugin","isLocalPath":true}')"
PLUGIN_ID="$(printf '%s' "$plugin_install" | json_field id)"
company_json="$(pc_api POST /api/companies '{"name":"Wandora Fast Read Disposable"}')"
COMPANY_ID="$(printf '%s' "$company_json" | json_field id)"

organization_key_body="$(node -e '
  process.stdout.write(JSON.stringify({
    name: "Wandora Organization Adapter Disposable Key",
    key: "wandora.organization-adapter.fast-read-disposable",
    provider: "local_encrypted",
    managedMode: "paperclip_managed",
    value: process.argv[1],
  }));
' "$ORGANIZATION_KEY")"
organization_key_json="$(pc_api POST "/api/companies/$COMPANY_ID/secrets" "$organization_key_body")"
ORGANIZATION_KEY_ID="$(printf '%s' "$organization_key_json" | json_field id)"
plugin_config="$(node -e '
  process.stdout.write(JSON.stringify({
    companyId: process.argv[1],
    configJson: { hmacSecret: { type: "secret_ref", secretId: process.argv[2] } },
  }));
' "$COMPANY_ID" "$ORGANIZATION_KEY_ID")"
pc_api POST "/api/plugins/$PLUGIN_ID/config" "$plugin_config" >/dev/null

signed_webhook() {
  local endpoint="$1" body="$2" timestamp signature
  timestamp="$(date +%s)"
  signature="$(node -e '
    const { createHmac }=require("node:crypto");
    process.stdout.write("sha256=" + createHmac("sha256", process.argv[1])
      .update(process.argv[2] + "." + process.argv[3]).digest("hex"));
  ' "$ORGANIZATION_KEY" "$timestamp" "$body")"
  docker exec -e ENDPOINT="$endpoint" -e BODY="$body" -e TS="$timestamp" -e SIG="$signature" \
    "$PAPERCLIP" node --input-type=module -e '
      const response=await fetch("http://127.0.0.1:3100"+process.env.ENDPOINT,{
        method:"POST",
        headers:{
          "content-type":"application/json",
          "x-wandora-timestamp":process.env.TS,
          "x-wandora-signature":process.env.SIG,
        },
        body:process.env.BODY,
      });
      if(!response.ok){console.error(await response.text());process.exit(22);}
    '
}

reconcile_body="$(node -e 'process.stdout.write(JSON.stringify({companyId:process.argv[1],catalogKey:"ana-commercial-v1"}))' "$COMPANY_ID")"
signed_webhook "/api/plugins/wandora.organization-adapter-v1/webhooks/employee-reconcile" "$reconcile_body"
signed_webhook "/api/plugins/wandora.organization-adapter-v1/webhooks/employee-activate" "$reconcile_body"

AGENT_ID=""
for _ in $(seq 1 30); do
  AGENT_ID="$(pc_sql "select id::text from agents where company_id='$COMPANY_ID'::uuid and metadata->'pluginManagedAgent'->>'pluginKey'='wandora.organization-adapter-v1' and metadata->'pluginManagedAgent'->>'agentKey'='ana-commercial-v1' order by created_at desc limit 1;")"
  [ -n "$AGENT_ID" ] && break
  sleep 1
done
test -n "$AGENT_ID"
test "$(printf '%s' "$(pc_api GET "/api/agents/$AGENT_ID")" | json_field status)" = "idle"

PROVIDER_REF="$(node -e '
  const { createHash }=require("node:crypto");
  const digest=createHash("sha256")
    .update(JSON.stringify(["wandora.organization-adapter-v1",process.argv[1],"ana-commercial-v1"]))
    .digest("hex");
  process.stdout.write("managed:v1:"+digest);
' "$COMPANY_ID")"
docker exec -i "$DB" psql -v ON_ERROR_STOP=1 -U supabase_admin -d "$WANDORA_DB" \
  -v org="$ORG_ID" -v employee="$EMPLOYEE_ID" -v company="$COMPANY_ID" -v provider_ref="$PROVIDER_REF" <<'SQL' >/dev/null
INSERT INTO wandora.organizations(id,slug,display_name,status)
VALUES (:'org'::uuid,'fast-read-disposable','Fast Read Disposable','active');
INSERT INTO wandora_private.control_plane_provider_bindings(organization_id,provider,provider_company_ref)
VALUES (:'org'::uuid,'paperclip',:'company');
INSERT INTO wandora.digital_employees(id,organization_id,display_name,role,status,autonomy_mode)
VALUES (:'employee'::uuid,:'org'::uuid,'Ana','commercial-assistant','active','supervised');
INSERT INTO wandora_private.digital_employee_provider_bindings(organization_id,employee_id,provider,provider_agent_ref)
VALUES (:'org'::uuid,:'employee'::uuid,'paperclip',:'provider_ref');
CREATE OR REPLACE FUNCTION wandora_private.resolve_paperclip_execution_organization(p_provider_company_ref text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,wandora,wandora_private,pg_temp AS $$
  SELECT o.id FROM wandora_private.control_plane_provider_bindings b
  JOIN wandora.organizations o ON o.id=b.organization_id
  WHERE b.provider='paperclip' AND b.provider_company_ref=p_provider_company_ref AND o.status='active'
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION wandora_private.resolve_paperclip_execution_organization(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION wandora_private.resolve_paperclip_execution_organization(text) TO wandora_core_runtime;
SQL

example_json="$(pc_api POST "/api/companies/$COMPANY_ID/tools/examples/safe-read-only-todo-kv/install" '{}')"
FAST_READ_CONNECTION_ID="$(printf '%s' "$example_json" | node -e '
  const fs=require("node:fs"); const v=JSON.parse(fs.readFileSync(0,"utf8"));
  process.stdout.write(String(v.connection?.id ?? ""));
')"
test -n "$FAST_READ_CONNECTION_ID"
FAST_READ_CATALOG_ENTRY_ID=""
for _ in $(seq 1 30); do
  FAST_READ_CATALOG_ENTRY_ID="$(pc_sql "select id::text from tool_catalog_entries where company_id='$COMPANY_ID'::uuid and connection_id='$FAST_READ_CONNECTION_ID'::uuid and tool_name='get_value' and status='active' order by created_at desc limit 1;")"
  [ -n "$FAST_READ_CATALOG_ENTRY_ID" ] && break
  sleep 1
done
test -n "$FAST_READ_CATALOG_ENTRY_ID"

FAST_READ_PROFILE_ID="$(pc_sql "select gen_random_uuid()::text;")"
pc_sql "delete from tool_profile_bindings where company_id='$COMPANY_ID'::uuid and target_type='agent' and target_id='$AGENT_ID';" >/dev/null
pc_sql "insert into tool_profiles(id,company_id,profile_key,name,status,default_action) values ('$FAST_READ_PROFILE_ID'::uuid,'$COMPANY_ID'::uuid,'wandora-fast-read-disposable-v1','Wandora Fast Read Disposable','active','deny');" >/dev/null
pc_sql "insert into tool_profile_bindings(company_id,profile_id,target_type,target_id,priority) values ('$COMPANY_ID'::uuid,'$FAST_READ_PROFILE_ID'::uuid,'agent','$AGENT_ID',1);" >/dev/null
pc_sql "insert into tool_profile_entries(company_id,profile_id,selector_type,effect,catalog_entry_id) values ('$COMPANY_ID'::uuid,'$FAST_READ_PROFILE_ID'::uuid,'catalog_entry','include','$FAST_READ_CATALOG_ENTRY_ID'::uuid);" >/dev/null
pc_sql "insert into tool_connection_installs(company_id,connection_id,target_type,target_id) select '$COMPANY_ID'::uuid,'$FAST_READ_CONNECTION_ID'::uuid,'agent','$AGENT_ID' where not exists (select 1 from tool_connection_installs where company_id='$COMPANY_ID'::uuid and connection_id='$FAST_READ_CONNECTION_ID'::uuid and target_type='agent' and target_id='$AGENT_ID');" >/dev/null

docker build -q -t "$CORE_IMAGE" "$ROOT/apps/core" >/dev/null
docker run -d --name "$CORE" --network "$NET" --network-alias wandora-core \
  --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m --security-opt no-new-privileges:true --cap-drop ALL \
  -v "$TMP/wandora-adapter/disposable-fast-read-core.mjs:/proof/disposable-fast-read-core.mjs:ro" \
  -e WANDORA_CORE_DB_HOST="$DB" -e WANDORA_CORE_DB_PORT=5432 -e WANDORA_CORE_DB_NAME="$WANDORA_DB" \
  -e WANDORA_CORE_DB_USER=wandora_core_runtime -e WANDORA_CORE_DB_PASSWORD="$CORE_DB_AUTH" \
  -e WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET="$BRIDGE_KEY" \
  -e WANDORA_FAST_READ_INTENT_SECRET="$INTENT_KEY" \
  "$CORE_IMAGE" node /proof/disposable-fast-read-core.mjs >/dev/null
for _ in $(seq 1 30); do
  docker exec "$CORE" node -e "fetch('http://127.0.0.1:8788/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1 && break
  sleep 1
done

FAST_READ_REQUEST='Leia o valor sintético do projeto.'
make_intent() {
  local correlation="$1" capability="$2" age_ms="$3" ttl_seconds="$4"
  docker exec -e CORRELATION="$correlation" -e REQUEST_TEXT="$FAST_READ_REQUEST" \
    -e CAPABILITY="$capability" -e AGE_MS="$age_ms" -e TTL_SECONDS="$ttl_seconds" \
    -e INTENT_KEY="$INTENT_KEY" "$CORE" node --input-type=module -e '
      import { issueFastReadIntent } from "/app/dist/semantic-routing/fast-read-intent.js";
      process.stdout.write(issueFastReadIntent({
        secret: process.env.INTENT_KEY,
        organizationId: "11111111-1111-4111-8111-111111111111",
        employeeId: "22222222-2222-4222-8222-222222222222",
        correlationId: process.env.CORRELATION,
        request: process.env.REQUEST_TEXT,
        decision: {
          mode: "deterministic_read",
          capability: process.env.CAPABILITY,
          confidence: 1,
          needsDataOrToolLookup: 1,
          needsMoreContext: 0,
          needsHumanReview: 0,
          ambiguity: "none",
        },
        availableCapabilities: [process.env.CAPABILITY],
        policy: {
          minimumConfidence: 0.9,
          maximumNeedsMoreContext: 0.1,
          maximumNeedsHumanReview: 0.1,
          minimumNeedsDataOrToolLookup: 0.9,
        },
        nowMs: Date.now() - Number(process.env.AGE_MS),
        ttlSeconds: Number(process.env.TTL_SECONDS),
      }));
    '
}
make_body() {
  node -e 'process.stdout.write(JSON.stringify({
    companyId:process.argv[1],catalogKey:"ana-commercial-v1",correlationId:process.argv[2],
    intentToken:process.argv[3],request:process.argv[4]
  }))' "$COMPANY_ID" "$1" "$2" "$FAST_READ_REQUEST"
}
latest_fast_run() {
  pc_sql "select id::text from heartbeat_runs where company_id='$COMPANY_ID'::uuid and agent_id='$AGENT_ID'::uuid and context_snapshot->>'wakeReason'='wandora_fast_read_v1' order by created_at desc limit 1;"
}
wait_terminal() {
  local run_id="$1" status=""
  for _ in $(seq 1 60); do
    status="$(pc_sql "select status::text from heartbeat_runs where id='$run_id'::uuid;")"
    case "$status" in succeeded|failed|interrupted|cancelled|timed_out) printf '%s' "$status"; return ;; esac
    sleep 1
  done
  printf '%s' "$status"
}
tool_count() { pc_sql "select count(*) from tool_invocations where company_id='$COMPANY_ID'::uuid;"; }

SUCCESS_CORRELATION="77777777-7777-4777-8777-777777777777"
SUCCESS_TOKEN="$(make_intent "$SUCCESS_CORRELATION" business.products.price 0 120)"
SUCCESS_BODY="$(make_body "$SUCCESS_CORRELATION" "$SUCCESS_TOKEN")"
issue_before="$(pc_sql "select count(*) from issues where company_id='$COMPANY_ID'::uuid;")"
run_before="$(pc_sql "select count(*) from heartbeat_runs where company_id='$COMPANY_ID'::uuid and agent_id='$AGENT_ID'::uuid and context_snapshot->>'wakeReason'='wandora_fast_read_v1';")"
tool_before="$(tool_count)"
signed_webhook "/api/plugins/wandora.organization-adapter-v1/webhooks/employee-fast-read" "$SUCCESS_BODY"
SUCCESS_RUN_ID="$(latest_fast_run)"
test -n "$SUCCESS_RUN_ID"
test "$(wait_terminal "$SUCCESS_RUN_ID")" = "succeeded"
signed_webhook "/api/plugins/wandora.organization-adapter-v1/webhooks/employee-fast-read" "$SUCCESS_BODY"
sleep 2
issue_after="$(pc_sql "select count(*) from issues where company_id='$COMPANY_ID'::uuid;")"
run_after="$(pc_sql "select count(*) from heartbeat_runs where company_id='$COMPANY_ID'::uuid and agent_id='$AGENT_ID'::uuid and context_snapshot->>'wakeReason'='wandora_fast_read_v1';")"
tool_after="$(tool_count)"
test "$issue_after" = "$issue_before"
test "$((run_after-run_before))" = "1"
test "$((tool_after-tool_before))" = "1"
test "$(pc_sql "select coalesce(result_json->>'model','') from heartbeat_runs where id='$SUCCESS_RUN_ID'::uuid;")" = "wandora-deterministic-read-v1"
usage="$(pc_sql "select coalesce((usage_json->>'inputTokens')::int,-1)||'|'||coalesce((usage_json->>'outputTokens')::int,-1)||'|'||coalesce((usage_json->>'cachedInputTokens')::int,-1)||'|'||coalesce((usage_json->>'totalTokens')::int,-1) from heartbeat_runs where id='$SUCCESS_RUN_ID'::uuid;")"
test "$usage" = "0|0|0|0"
agentic_calls="$(docker exec "$CORE" node -e "fetch('http://127.0.0.1:8788/healthz').then(r=>r.json()).then(x=>process.stdout.write(String(x.agenticCalls))).catch(()=>process.exit(1))")"
test "$agentic_calls" = "0"

expired_before="$(tool_count)"
EXPIRED_CORRELATION="88888888-8888-4888-8888-888888888888"
EXPIRED_TOKEN="$(make_intent "$EXPIRED_CORRELATION" business.products.price 10000 5)"
signed_webhook "/api/plugins/wandora.organization-adapter-v1/webhooks/employee-fast-read" "$(make_body "$EXPIRED_CORRELATION" "$EXPIRED_TOKEN")"
EXPIRED_RUN_ID="$(latest_fast_run)"
test "$(wait_terminal "$EXPIRED_RUN_ID")" = "failed"
expired_after="$(tool_count)"
test "$expired_after" = "$expired_before"

unauthorized_before="$(tool_count)"
UNAUTHORIZED_CORRELATION="99999999-9999-4999-8999-999999999999"
UNAUTHORIZED_TOKEN="$(make_intent "$UNAUTHORIZED_CORRELATION" business.orders.search 0 120)"
signed_webhook "/api/plugins/wandora.organization-adapter-v1/webhooks/employee-fast-read" "$(make_body "$UNAUTHORIZED_CORRELATION" "$UNAUTHORIZED_TOKEN")"
UNAUTHORIZED_RUN_ID="$(latest_fast_run)"
test "$(wait_terminal "$UNAUTHORIZED_RUN_ID")" = "failed"
unauthorized_after="$(tool_count)"
test "$unauthorized_after" = "$unauthorized_before"

DUP_CATALOG_ID="$(pc_sql "select gen_random_uuid()::text;")"
pc_sql "insert into tool_catalog_entries(id,company_id,application_id,connection_id,entry_kind,name,tool_name,title,description,input_schema,annotations,risk_level,is_read_only,is_write,is_destructive,status,version_hash) select '$DUP_CATALOG_ID'::uuid,company_id,application_id,connection_id,entry_kind,name||'-duplicate',tool_name,title,description,input_schema,annotations,risk_level,is_read_only,is_write,is_destructive,status,version_hash||'-duplicate' from tool_catalog_entries where id='$FAST_READ_CATALOG_ENTRY_ID'::uuid;" >/dev/null
pc_sql "insert into tool_profile_entries(company_id,profile_id,selector_type,effect,catalog_entry_id) values ('$COMPANY_ID'::uuid,'$FAST_READ_PROFILE_ID'::uuid,'catalog_entry','include','$DUP_CATALOG_ID'::uuid);" >/dev/null

duplicate_before="$(tool_count)"
DUP_CORRELATION="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
DUP_TOKEN="$(make_intent "$DUP_CORRELATION" business.products.price 0 120)"
signed_webhook "/api/plugins/wandora.organization-adapter-v1/webhooks/employee-fast-read" "$(make_body "$DUP_CORRELATION" "$DUP_TOKEN")"
DUP_RUN_ID="$(latest_fast_run)"
test "$(wait_terminal "$DUP_RUN_ID")" = "failed"
duplicate_after="$(tool_count)"
test "$duplicate_after" = "$duplicate_before"

printf '%s\n' "PAPERCLIP_WANDORA_FAST_READ_DISPOSABLE_ATTESTATION_V1_OK"
printf '%s\n' "paperclip_issue_delta=$((issue_after-issue_before))"
printf '%s\n' "paperclip_run_delta=$((run_after-run_before))"
printf '%s\n' "read_tool_call_delta=$((tool_after-tool_before))"
printf '%s\n' "model_usage=$usage"
printf '%s\n' "agentic_calls=$agentic_calls"
printf '%s\n' "expired_tool_delta=$((expired_after-expired_before))"
printf '%s\n' "unauthorized_tool_delta=$((unauthorized_after-unauthorized_before))"
printf '%s\n' "duplicate_capability_tool_delta=$((duplicate_after-duplicate_before))"
