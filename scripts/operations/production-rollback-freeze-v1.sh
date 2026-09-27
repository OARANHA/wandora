#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# ADR 0299 — Production Rollback Freeze + Secret Metadata Readback V1
# Operator-local only. Run manually as root on wandora-vps-01.
# No activation, provider call, customer work, outbound effect, or secret value output.
# No arguments are accepted; every path and runtime identity is fixed by the reviewed runbook.

fail() {
  printf 'ROLLBACK_FREEZE_V1_ERROR: %s\n' "$*" >&2
  exit 1
}

[[ "$#" -eq 0 ]] || fail "no arguments accepted"
[[ "${EUID}" -eq 0 ]] || fail "must run as root on the operator host"

PC="wandora-paperclip"
CORE="wandora-core"
GW="wandora-messaging-gateway"

PC_IMAGE="wandora/paperclip:v2026.916.0"
PC_COMMIT="dffc2b3ca1b9e88fa21cb17493083e682dffd1ca"
CORE_IMAGE="wandora/core:organization-adapter-candidate-f3225586d082"
OA_KEY="wandora.organization-adapter-v1"
OA_VERSION="0.3.1"
OA_PATH="/paperclip/operator-packages/wandora-organization-adapter-v1/06a42a04dd0b6eff8ee377c1d4f1e40bbabce122767d0d77e92ee509d27d811d/package"

BACKUP_PARENT="/home/wandora-admin/backups"
RECEIPT="/opt/wandora/ops-workspace/production-rollback-freeze-v1.metadata"

TYPESAFE="/opt/wandora/stacks/core/secrets/wandora_typesafe_jev_api_key"
WFRI1="/opt/wandora/stacks/core/secrets/wandora_fast_read_intent_hmac"
MISTRAL="/opt/wandora/stacks/core/secrets/wandora_model_provider_api_key"

PC_MASTER_KEY="/paperclip/instances/default/secrets/master.key"
PC_ADAPTER_REGISTRY="/paperclip/instances/default/adapter-plugins.json"

PAPERCLIP_COMPOSE="/opt/wandora/stacks/paperclip/compose.yaml"
PAPERCLIP_BRIDGE_COMPOSE="/opt/wandora/stacks/paperclip/compose.paperclip-execution-bridge.yaml"
PAPERCLIP_BRIDGE_WRAPPER="/opt/wandora/stacks/paperclip/paperclip-bridge-secret-entrypoint.sh"
CORE_STACK="/opt/wandora/stacks/core"

POSTGRES_CLIENT_IMAGE="postgres:18.1"
POSTGRES_CLIENT_INDEX_DIGEST="sha256:1090bc3a8ccfb0b55f78a494d76f8d603434f7e4553543d6e807bc7bd6bbd17f"
POSTGRES_CLIENT_REPO_DIGEST="postgres@${POSTGRES_CLIENT_INDEX_DIGEST}"
POSTGRES_CLIENT_PLATFORM="linux/amd64"

stamp="$(date -u +%Y%m%dT%H%M%S%NZ)"
prefix="adr0299-rollback-freeze-v1-${stamp}"
root="${BACKUP_PARENT}/paperclip-v9161-fast-read-rollback-freeze-v1-${stamp}"
pc_tmp="/paperclip/instances/default/backups/${prefix}"
restore_name="wandora-adr0299-restore-${stamp,,}"
qualified=false
parent_created=false
root_created=false
restore_created=false
pc_tmp_owned=false
tmp_receipt=""
receipt_published=false

cleanup() {
  if [[ "${restore_created}" == "true" ]]; then
    docker rm -f "${restore_name}" >/dev/null 2>&1 || true
  fi
  if [[ "${pc_tmp_owned}" == "true" ]]; then
    docker exec "${PC}" rm -rf -- "${pc_tmp}" >/dev/null 2>&1 || true
  fi
  if [[ "${qualified}" != "true" && -n "${tmp_receipt}" && -e "${tmp_receipt}" ]]; then
    rm -f -- "${tmp_receipt}" || true
  fi
  if [[ "${qualified}" != "true" && "${receipt_published}" == "true" ]]; then
    rm -f -- "${RECEIPT}" || true
  fi
  if [[ "${qualified}" != "true" && "${root_created}" == "true" && -d "${root}" ]]; then
    rm -rf -- "${root}" || true
  fi
  if [[ "${qualified}" != "true" && "${parent_created}" == "true" && -d "${BACKUP_PARENT}" ]]; then
    rmdir -- "${BACKUP_PARENT}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [[ -e "${RECEIPT}" || -L "${RECEIPT}" ]]; then
  fail "receipt already exists; reconcile it before any rerun: ${RECEIPT}"
fi

container_field() {
  docker inspect --format "$2" "$1"
}

assert_container() {
  local container="$1" expected_image="$2"
  [[ "$(container_field "$container" '{{.State.Running}}')" == "true" ]] ||
    fail "${container} not running"
  [[ "$(container_field "$container" '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}')" == "healthy" ]] ||
    fail "${container} not healthy"
  [[ "$(container_field "$container" '{{.RestartCount}}')" == "0" ]] ||
    fail "${container} restart count non-zero"
  [[ "$(container_field "$container" '{{.Config.Image}}')" == "${expected_image}" ]] ||
    fail "${container} image mismatch"
}

assert_regular_secret_meta() {
  local path="$1"
  [[ ! -L "$path" && -f "$path" ]] || fail "secret path not regular: ${path}"
  [[ "$(stat -c '%U:%G:%a:%F' -- "$path")" == "wandora-admin:wandora-ops:640:regular file" ]] ||
    fail "secret metadata mismatch: ${path}"
}

flag_value() {
  local container="$1" key="$2"
  docker exec "$container" node -e     'const key=process.argv[1]; process.stdout.write(process.env[key] ?? "");'     "$key"
}

assert_false_or_absent() {
  local container="$1" key="$2" value
  value="$(flag_value "$container" "$key")"
  case "${value,,}" in
    ""|0|false|off|no) ;;
    *) fail "${container} ${key} unexpectedly enabled" ;;
  esac
}

safe_secret_meta_line() {
  local label="$1" path="$2"
  printf '%s_path=%s\n' "$label" "$path"
  printf '%s_owner=%s\n' "$label" "$(stat -c '%U' -- "$path")"
  printf '%s_group=%s\n' "$label" "$(stat -c '%G' -- "$path")"
  printf '%s_mode=0%s\n' "$label" "$(stat -c '%a' -- "$path")"
  printf '%s_type=%s\n' "$label" "$(stat -c '%F' -- "$path")"
}

paperclip_db_url() {
  docker exec "${PC}" \
    node \
    --import /app/server/node_modules/tsx/dist/loader.mjs \
    --input-type=module \
    -e '
      import { resolveDatabaseTarget } from "/app/packages/db/src/runtime-config.ts";

      const target = resolveDatabaseTarget();
      if (target.mode !== "embedded-postgres") throw new Error("unexpected_database_mode");
      if (target.port !== 54329) throw new Error("unexpected_database_port");
      if (target.source !== `embedded-postgres@${target.port}`) {
        throw new Error("unexpected_database_source");
      }
      if (!target.dataDir) throw new Error("database_data_dir_unavailable");

      // Keep exact parity with Paperclip v2026.916.0 db:backup embedded-postgres
      // resolution. These are provider-local fixed embedded credentials, not a
      // Wandora-owned secret or externally routable database credential.
      const connectionString =
        `postgres://paperclip:paperclip@127.0.0.1:${target.port}/paperclip`;

      const url = new URL(connectionString);
      if (url.protocol !== "postgres:") throw new Error("unexpected_database_protocol");
      if (url.hostname !== "127.0.0.1") throw new Error("database_not_loopback");
      if ((url.port || "5432") !== "54329") throw new Error("unexpected_database_port");
      if (url.pathname !== "/paperclip") throw new Error("unexpected_database_name");

      process.stdout.write(connectionString);
    '
}

paperclip_db_data_dir() {
  docker exec "${PC}" \
    node \
    --import /app/server/node_modules/tsx/dist/loader.mjs \
    --input-type=module \
    -e '
      import { resolveDatabaseTarget } from "/app/packages/db/src/runtime-config.ts";

      const target = resolveDatabaseTarget();
      if (target.mode !== "embedded-postgres") throw new Error("unexpected_database_mode");
      if (target.port !== 54329) throw new Error("unexpected_database_port");
      if (target.source !== `embedded-postgres@${target.port}`) {
        throw new Error("unexpected_database_source");
      }
      if (!target.dataDir) throw new Error("database_data_dir_unavailable");
      process.stdout.write(target.dataDir);
    '
}

pg18_live_dump() {
  local mode="$1" output="$2"
  local -a pg_args=(
    "--no-owner"
    "--no-privileges"
  )
  case "$mode" in
    probe|schema)
      pg_args+=("--schema-only")
      ;;
    custom)
      pg_args+=("--format=custom")
      ;;
    *)
      fail "unsupported pg18 dump mode"
      ;;
  esac

  if [[ "$mode" == "probe" ]]; then
    paperclip_db_url |
      docker run --rm -i \
        --network "container:${PC}" \
        --entrypoint /bin/sh \
        "${POSTGRES_CLIENT_IMAGE}" \
        -ceu '
          db_url="$(cat)"
          test -n "$db_url"
        exec pg_dump --dbname="$db_url" "$@"
        ' -- "${pg_args[@]}" >/dev/null
    return
  fi

  paperclip_db_url |
    docker run --rm -i \
      --network "container:${PC}" \
      --entrypoint /bin/sh \
      "${POSTGRES_CLIENT_IMAGE}" \
      -ceu '
        db_url="$(cat)"
        test -n "$db_url"
        exec pg_dump --dbname="$db_url" "$@"
      ' -- "${pg_args[@]}" >"${output}"
}

pg18_live_scalar() {
  local sql="$1"
  paperclip_db_url |
    docker run --rm -i       --network "container:${PC}"       --entrypoint /bin/sh       "${POSTGRES_CLIENT_IMAGE}"       -ceu '
        db_url="$(cat)"
        test -n "$db_url"
        exec psql --dbname="$db_url" --no-psqlrc --tuples-only --no-align --command "$1"
      ' -- "$sql"
}

normalize_schema() {
  sed \
    -e '/^\\restrict /d' \
    -e '/^\\unrestrict /d' \
    "$1" >"$2"
}

# ---------------------------
# Fresh pre-effect checks
# ---------------------------

assert_container "${PC}" "${PC_IMAGE}"
assert_container "${CORE}" "${CORE_IMAGE}"

[[ "$(container_field "${GW}" '{{.State.Running}}')" == "true" ]] || fail "gateway not running"
[[ "$(container_field "${GW}" '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}')" == "healthy" ]] ||
  fail "gateway not healthy"
[[ "$(container_field "${GW}" '{{.RestartCount}}')" == "0" ]] ||
  fail "gateway restart count non-zero"

health="$(curl -fsS http://127.0.0.1:3100/api/health)"
[[ "$(jq -r '.status' <<<"$health")" == "ok" ]] || fail "Paperclip health not ok"
[[ "$(jq -r '.commit' <<<"$health")" == "${PC_COMMIT}" ]] || fail "Paperclip commit mismatch"
[[ "$(jq -r '.deploymentMode' <<<"$health")" == "authenticated" ]] || fail "Paperclip mode mismatch"
[[ "$(jq -r '.deploymentExposure' <<<"$health")" == "private" ]] || fail "Paperclip exposure mismatch"
[[ "$(jq -r '.databaseBackup.status' <<<"$health")" == "ok" ]] || fail "Paperclip backup health not ok"

drain_proxy="$(curl -fsS -X POST -H 'content-type: application/json' --data '{}' \
  http://127.0.0.1:23751/ops/paperclip/task-drain-status)"
[[ "$(jq -r '.code' <<<"$drain_proxy")" == "0" ]] || fail "Task Drain proxy failed"
drain="$(jq -cer '.stdout | fromjson | select(.ok == true and .operation == "task-drain-status") | .result' <<<"$drain_proxy")" ||
  fail "Task Drain proxy envelope invalid"
[[ "$(jq -r '.draining' <<<"$drain")" == "false" ]] || fail "Task Drain enabled"
[[ "$(jq -r '.activeRuns' <<<"$drain")" == "0" ]] || fail "activeRuns non-zero"
[[ "$(jq -r '.pendingWakes' <<<"$drain")" == "0" ]] || fail "pendingWakes non-zero"
[[ "$(jq -r '.quiescent' <<<"$drain")" == "true" ]] || fail "Task Drain not quiescent"

plugins="$(docker exec "${PC}" paperclipai plugin list --json)"
oa_count="$(jq --arg k "${OA_KEY}" '[.[] | select(.pluginKey==$k)] | length' <<<"$plugins")"
[[ "$oa_count" == "1" ]] || fail "OA count mismatch"
oa="$(jq -c --arg k "${OA_KEY}" '.[] | select(.pluginKey==$k)' <<<"$plugins")"
[[ "$(jq -r '.version' <<<"$oa")" == "${OA_VERSION}" ]] || fail "OA version mismatch"
[[ "$(jq -r '.status' <<<"$oa")" == "ready" ]] || fail "OA not ready"
[[ "$(jq -r '.lastError // ""' <<<"$oa")" == "" ]] || fail "OA lastError non-empty"
[[ "$(jq -r '.packagePath' <<<"$oa")" == "${OA_PATH}" ]] || fail "OA packagePath mismatch"

core_compose="$(container_field "${CORE}" '{{index .Config.Labels "com.docker.compose.project.config_files"}}')"
[[ "$core_compose" != *"compose.semantic-fast-read.yaml"* ]] || fail "semantic-fast-read overlay is live"
[[ "$core_compose" != *"compose.semantic-fast-read-custody.yaml"* ]] || fail "semantic-fast-read custody overlay is live"

assert_false_or_absent "${CORE}" "WANDORA_FAST_READ_EXECUTION_ENABLED"
assert_false_or_absent "${CORE}" "WANDORA_SEMANTIC_FAST_READ_ENABLED"
assert_false_or_absent "${CORE}" "WANDORA_SEMANTIC_SELECTOR_ENABLED"
assert_false_or_absent "${CORE}" "WANDORA_HUMAN_SEND_PROPOSAL_ENABLED"
assert_false_or_absent "${GW}" "WANDORA_GATEWAY_OUTBOUND_ENABLED"

assert_regular_secret_meta "${TYPESAFE}"
assert_regular_secret_meta "${WFRI1}"
assert_regular_secret_meta "${MISTRAL}"

docker image inspect "${POSTGRES_CLIENT_IMAGE}" >/dev/null 2>&1 ||
  fail "local postgres:18.1 image absent; do not pull in this slice"
postgres18_image_id="$(docker image inspect --format '{{.Id}}' "${POSTGRES_CLIENT_IMAGE}")"
[[ -n "${postgres18_image_id}" ]] || fail "postgres:18.1 image identity unavailable"
postgres18_platform="$(docker image inspect --format '{{.Os}}/{{.Architecture}}' "${POSTGRES_CLIENT_IMAGE}")"
[[ "${postgres18_platform}" == "${POSTGRES_CLIENT_PLATFORM}" ]] ||
  fail "local postgres:18.1 platform mismatch"
postgres18_repo_digests="$(docker image inspect --format '{{json .RepoDigests}}' "${POSTGRES_CLIENT_IMAGE}")"
jq -e --arg expected "${POSTGRES_CLIENT_REPO_DIGEST}" 'index($expected) != null' <<<"${postgres18_repo_digests}" >/dev/null ||
  fail "local postgres:18.1 digest mismatch; rerun the separate image qualification slice"

paperclip_compose="$(container_field "${PC}" '{{index .Config.Labels "com.docker.compose.project.config_files"}}')"
expected_paperclip_compose="${PAPERCLIP_COMPOSE},${PAPERCLIP_BRIDGE_COMPOSE}"
[[ "${paperclip_compose}" == "${expected_paperclip_compose}" ]] ||
  fail "Paperclip active compose set mismatch"

server_version="$(pg18_live_scalar 'SHOW server_version' | tr -d '[:space:]')"
[[ "${server_version}" == "18.1"* ]] ||
  fail "live PostgreSQL server is not 18.1"

expected_data_dir="$(paperclip_db_data_dir)"
actual_data_dir="$(pg18_live_scalar 'SHOW data_directory' | xargs)"
[[ -n "${expected_data_dir}" && "${actual_data_dir}" == "${expected_data_dir}" ]] ||
  fail "live PostgreSQL data_directory does not match Paperclip embedded target"

# The same PostgreSQL 18.1 client that will create the freeze must prove a
# schema-only read before any backup file/directory is created.
pg18_live_dump probe /dev/null ||
  fail "PostgreSQL 18.1 live schema-only precheck failed"

# Collision checks remain read-only and happen before the first write.
[[ ! -e "${root}" && ! -L "${root}" ]] || fail "rollback root already exists"
docker inspect "${restore_name}" >/dev/null 2>&1 &&
  fail "disposable restore container name already exists"
set +e
docker exec "${PC}" test -e "${pc_tmp}"
pc_tmp_status=$?
set -e
case "${pc_tmp_status}" in
  0) fail "Paperclip temporary backup directory already exists" ;;
  1) ;;
  *) fail "could not verify Paperclip temporary backup directory absence" ;;
esac

# ---------------------------
# First write begins here
# ---------------------------

if [[ -e "${BACKUP_PARENT}" || -L "${BACKUP_PARENT}" ]]; then
  [[ ! -L "${BACKUP_PARENT}" && -d "${BACKUP_PARENT}" ]] ||
    fail "backup parent is not a regular directory"
else
  install -d -m 0700 -o wandora-admin -g wandora-ops -- "${BACKUP_PARENT}"
  parent_created=true
fi

mkdir -m 0700 -- "${root}" || fail "rollback root appeared concurrently"
root_created=true
chown wandora-admin:wandora-ops -- "${root}"
install -d -m 0700 -o wandora-admin -g wandora-ops -- \
  "${root}/db" "${root}/paperclip" "${root}/paperclip/official" \
  "${root}/runtime" "${root}/core-compose"

# Official Paperclip backup in an isolated unique directory, so normal
# paperclip-* retention is not pruned.
pc_tmp_owned=true
docker exec "${PC}" paperclipai db:backup \
  --dir "${pc_tmp}" \
  --retention-days 1 \
  --filename-prefix "${prefix}" \
  --json >/dev/null

mapfile -t official_files < <(
  docker exec "${PC}" find "${pc_tmp}" -maxdepth 1 -type f -name "${prefix}-*.sql.gz" -print
)
[[ "${#official_files[@]}" -eq 1 ]] || fail "official backup file count mismatch"
official_in_container="${official_files[0]}"
docker cp "${PC}:${official_in_container}" "${root}/paperclip/official/"
official_host="${root}/paperclip/official/$(basename "${official_in_container}")"
gzip -t -- "${official_host}" || fail "official backup gzip validation failed"

# Fresh PostgreSQL 18.1 live custom-format and schema-only dumps.
pg18_live_dump custom "${root}/db/paperclip-live.dump"
[[ -s "${root}/db/paperclip-live.dump" ]] || fail "custom-format live dump is empty"
pg18_live_dump schema "${root}/db/live-schema.sql"
[[ -s "${root}/db/live-schema.sql" ]] || fail "live schema dump is empty"

# Matching local_encrypted master key, copied without printing and verified
# only as a boolean byte-equality result.
docker cp "${PC}:${PC_MASTER_KEY}" "${root}/paperclip/master.key"
docker exec "${PC}" cat "${PC_MASTER_KEY}" | cmp -s - "${root}/paperclip/master.key" ||
  fail "master.key source/copy mismatch"

docker cp "${PC}:${PC_ADAPTER_REGISTRY}" "${root}/paperclip/adapter-plugins.json"
docker cp "${PC}:/paperclip/operator-packages" "${root}/paperclip/operator-packages"
docker cp "${PC}:${OA_PATH}" "${root}/paperclip/organization-adapter-0.3.1-package"

cp -- "${PAPERCLIP_COMPOSE}" "${root}/runtime/"
cp -- "${PAPERCLIP_BRIDGE_COMPOSE}" "${root}/runtime/"
cp -- "${PAPERCLIP_BRIDGE_WRAPPER}" "${root}/runtime/"

# Snapshot the exact active Core Compose inputs from Docker's current label,
# including execution overlays outside /opt/wandora/stacks/core. Do not copy
# environment files or secret files.
IFS=',' read -r -a active_core_compose_files <<<"${core_compose}"
[[ "${#active_core_compose_files[@]}" -gt 0 ]] || fail "active Core compose set empty"
: >"${root}/core-compose/ACTIVE_COMPOSE_PATHS"
index=0
for file in "${active_core_compose_files[@]}"; do
  [[ "${file}" == /* && ! -L "${file}" && -f "${file}" ]] ||
    fail "active Core compose path invalid: ${file}"
  index=$((index + 1))
  name="$(basename "${file}")"
  dest="$(printf '%s/core-compose/%02d-%s' "${root}" "${index}" "${name}")"
  cp -- "${file}" "${dest}"
  printf '%02d %s -> %s\n' "${index}" "${file}" "$(basename "${dest}")" >>"${root}/core-compose/ACTIVE_COMPOSE_PATHS"
done

# Also retain the current versioned Core stack compose family as rollback
# context; this does not include .env or secret material.
shopt -s nullglob
core_stack_compose_files=("${CORE_STACK}"/compose*.yaml)
[[ "${#core_stack_compose_files[@]}" -gt 0 ]] || fail "Core stack compose files not found"
install -d -m 0700 -o wandora-admin -g wandora-ops -- "${root}/core-stack-compose"
for file in "${core_stack_compose_files[@]}"; do
  [[ ! -L "${file}" && -f "${file}" ]] || fail "Core stack compose path invalid: ${file}"
  cp -- "${file}" "${root}/core-stack-compose/"
done
shopt -u nullglob

# Safe runtime anchors only.
{
  printf 'paperclip_image=%s\n' "$(container_field "${PC}" '{{.Config.Image}}')"
  printf 'paperclip_image_id=%s\n' "$(container_field "${PC}" '{{.Image}}')"
  printf 'paperclip_health=%s\n' "$(container_field "${PC}" '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}')"
  printf 'paperclip_restart_count=%s\n' "$(container_field "${PC}" '{{.RestartCount}}')"
  printf 'paperclip_commit=%s\n' "${PC_COMMIT}"
  printf 'paperclip_compose_files=%s\n' "${paperclip_compose}"
  printf 'postgres18_image_id=%s\n' "${postgres18_image_id}"
  printf 'postgres_server_version=%s\n' "${server_version}"
  printf 'core_image=%s\n' "$(container_field "${CORE}" '{{.Config.Image}}')"
  printf 'core_image_id=%s\n' "$(container_field "${CORE}" '{{.Image}}')"
  printf 'core_revision=%s\n' "$(container_field "${CORE}" '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
  printf 'core_health=%s\n' "$(container_field "${CORE}" '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}')"
  printf 'core_restart_count=%s\n' "$(container_field "${CORE}" '{{.RestartCount}}')"
  printf 'core_compose_files=%s\n' "${core_compose}"
  printf 'gateway_image=%s\n' "$(container_field "${GW}" '{{.Config.Image}}')"
  printf 'gateway_image_id=%s\n' "$(container_field "${GW}" '{{.Image}}')"
  printf 'gateway_health=%s\n' "$(container_field "${GW}" '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}')"
  printf 'gateway_restart_count=%s\n' "$(container_field "${GW}" '{{.RestartCount}}')"
  printf 'oa_count=%s\n' "${oa_count}"
  printf 'oa_version=%s\n' "${OA_VERSION}"
  printf 'oa_status=ready\n'
  printf 'task_drain_draining=false\n'
  printf 'task_drain_active_runs=0\n'
  printf 'task_drain_pending_wakes=0\n'
  printf 'task_drain_quiescent=true\n'
} >"${root}/runtime/anchors.metadata"

# Disposable PostgreSQL 18.1 restore. No published ports and no network.
docker run -d --rm \
  --name "${restore_name}" \
  --network none \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  "${POSTGRES_CLIENT_IMAGE}" >/dev/null
restore_created=true

for _ in $(seq 1 60); do
  if docker exec "${restore_name}" pg_isready -U postgres -d postgres >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "${restore_name}" pg_isready -U postgres -d postgres >/dev/null 2>&1 ||
  fail "disposable PostgreSQL 18.1 did not become ready"

docker exec "${restore_name}" createdb -U postgres paperclip_restore
docker cp "${root}/db/paperclip-live.dump" "${restore_name}:/tmp/paperclip-live.dump"
docker exec "${restore_name}" pg_restore \
  -U postgres \
  -d paperclip_restore \
  --clean \
  --if-exists \
  --exit-on-error \
  --no-owner \
  --no-privileges \
  /tmp/paperclip-live.dump

docker exec "${restore_name}" pg_dump \
  -U postgres \
  -d paperclip_restore \
  --schema-only \
  --no-owner \
  --no-privileges >"${root}/db/restored-schema.sql"

normalize_schema "${root}/db/live-schema.sql" "${root}/db/live-schema.normalized.sql"
normalize_schema "${root}/db/restored-schema.sql" "${root}/db/restored-schema.normalized.sql"
cmp -s -- "${root}/db/live-schema.normalized.sql" "${root}/db/restored-schema.normalized.sql" ||
  fail "normalized schema mismatch after disposable restore"

# Fresh post-write validation before the receipt. This does not authorize any
# additional effect; it only proves the operation left the guarded runtime
# boundary unchanged and quiescent.
assert_container "${PC}" "${PC_IMAGE}"
assert_container "${CORE}" "${CORE_IMAGE}"
[[ "$(container_field "${GW}" '{{.State.Running}}')" == "true" ]] || fail "gateway stopped during freeze"
[[ "$(container_field "${GW}" '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}')" == "healthy" ]] ||
  fail "gateway unhealthy after freeze"
[[ "$(container_field "${GW}" '{{.RestartCount}}')" == "0" ]] || fail "gateway restarted during freeze"
post_health="$(curl -fsS http://127.0.0.1:3100/api/health)"
[[ "$(jq -r '.status' <<<"${post_health}")" == "ok" ]] || fail "Paperclip health changed during freeze"
[[ "$(jq -r '.commit' <<<"${post_health}")" == "${PC_COMMIT}" ]] || fail "Paperclip commit changed during freeze"
post_drain_proxy="$(curl -fsS -X POST -H 'content-type: application/json' --data '{}' \
  http://127.0.0.1:23751/ops/paperclip/task-drain-status)"
[[ "$(jq -r '.code' <<<"${post_drain_proxy}")" == "0" ]] || fail "post-freeze Task Drain proxy failed"
post_drain="$(jq -cer '.stdout | fromjson | select(.ok == true and .operation == "task-drain-status") | .result' <<<"${post_drain_proxy}")" ||
  fail "post-freeze Task Drain proxy envelope invalid"
[[ "$(jq -r '.draining' <<<"${post_drain}")" == "false" ]] || fail "Task Drain changed during freeze"
[[ "$(jq -r '.activeRuns' <<<"${post_drain}")" == "0" ]] || fail "activeRuns changed during freeze"
[[ "$(jq -r '.pendingWakes' <<<"${post_drain}")" == "0" ]] || fail "pendingWakes changed during freeze"
[[ "$(jq -r '.quiescent' <<<"${post_drain}")" == "true" ]] || fail "quiescence changed during freeze"
assert_false_or_absent "${CORE}" "WANDORA_FAST_READ_EXECUTION_ENABLED"
assert_false_or_absent "${CORE}" "WANDORA_SEMANTIC_FAST_READ_ENABLED"
assert_false_or_absent "${CORE}" "WANDORA_SEMANTIC_SELECTOR_ENABLED"
assert_false_or_absent "${CORE}" "WANDORA_HUMAN_SEND_PROPOSAL_ENABLED"
assert_false_or_absent "${GW}" "WANDORA_GATEWAY_OUTBOUND_ENABLED"

# Secure all copied state. Directories need execute permission for traversal.
chown -R wandora-admin:wandora-ops -- "${root}"
find "${root}" -type d -exec chmod 0700 -- {} +
find "${root}" -type f -exec chmod 0600 -- {} +

# Protected checksums for non-key files only. master.key must never enter a
# user-visible or general manifest digest list.
(
  cd "${root}"
  find . -type f \
    ! -path './paperclip/master.key' \
    ! -name 'SHA256SUMS' \
    -print0 |
    sort -z |
    xargs -0 sha256sum >SHA256SUMS
)
chown wandora-admin:wandora-ops -- "${root}/SHA256SUMS"
chmod 0600 -- "${root}/SHA256SUMS"

# Safe MCP-readable receipt. No secret values, DB credentials, provider
# payloads, customer data, or master-key digest are written here.
tmp_receipt="$(mktemp /opt/wandora/ops-workspace/.production-rollback-freeze-v1.metadata.XXXXXX)"
{
  printf 'rollback_root=%s\n' "${root}"
  printf 'paperclip_image=%s\n' "$(container_field "${PC}" '{{.Config.Image}}')"
  printf 'paperclip_image_id=%s\n' "$(container_field "${PC}" '{{.Image}}')"
  printf 'paperclip_health=healthy\n'
  printf 'paperclip_restart_count=0\n'
  printf 'core_image=%s\n' "$(container_field "${CORE}" '{{.Config.Image}}')"
  printf 'core_image_id=%s\n' "$(container_field "${CORE}" '{{.Image}}')"
  printf 'core_health=healthy\n'
  printf 'core_restart_count=0\n'
  printf 'gateway_image=%s\n' "$(container_field "${GW}" '{{.Config.Image}}')"
  printf 'gateway_image_id=%s\n' "$(container_field "${GW}" '{{.Image}}')"
  printf 'gateway_health=healthy\n'
  printf 'gateway_restart_count=0\n'
  printf 'oa_count=1\n'
  printf 'oa_version=%s\n' "${OA_VERSION}"
  printf 'oa_status=ready\n'
  printf 'task_drain_quiescent=true\n'
  printf 'official_backup_created=true\n'
  printf 'official_backup_gzip_valid=true\n'
  printf 'master_key_source_copy_equal=true\n'
  printf 'schema_restore=true\n'
  printf 'schema_equal=true\n'
  safe_secret_meta_line typesafe "${TYPESAFE}"
  safe_secret_meta_line wfri1 "${WFRI1}"
  safe_secret_meta_line mistral "${MISTRAL}"
  printf 'activation_performed=false\n'
  printf 'provider_call_performed=false\n'
  printf 'customer_effect=false\n'
  printf 'outbound_effect=false\n'
  printf 'ROLLBACK_FREEZE_V1_OK\n'
} >"${tmp_receipt}"

chown root:ops-mcp -- "${tmp_receipt}"
chmod 0640 -- "${tmp_receipt}"
ln -- "${tmp_receipt}" "${RECEIPT}" || fail "receipt appeared concurrently; refusing overwrite"
receipt_published=true
rm -f -- "${tmp_receipt}" || fail "temporary receipt cleanup failed after publication"
tmp_receipt=""
qualified=true

printf 'ROLLBACK_FREEZE_V1_OK\n'
printf 'receipt=%s\n' "${RECEIPT}"
printf 'activation_performed=false\n'
printf 'provider_call_performed=false\n'
printf 'customer_effect=false\n'
printf 'outbound_effect=false\n'
