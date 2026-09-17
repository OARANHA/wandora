#!/usr/bin/env bash
set -euo pipefail

CORE_CONTAINER="${WANDORA_CORE_CONTAINER:-wandora-core}"
GATEWAY_CONTAINER="${WANDORA_GATEWAY_CONTAINER:-wandora-messaging-gateway}"
PAPERCLIP_CONTAINER="${WANDORA_PAPERCLIP_CONTAINER:-wandora-paperclip}"
DB_CONTAINER="${WANDORA_DB_CONTAINER:-supabase-db}"
EXPECTED_PAPERCLIP_IMAGE="${WANDORA_EXPECTED_PAPERCLIP_IMAGE:-wandora/paperclip:v2026.831.1}"
CUSTODY_DIR="${WANDORA_ORGANIZATION_ADAPTER_SECRET_DIR_HOST:-/opt/wandora/secrets/organization-adapter}"

fail() {
  printf 'ORGANIZATION_ADAPTER_LIVE_PREACTIVATION_V1_FAIL %s\n' "$1" >&2
  exit 1
}

for container in "$CORE_CONTAINER" "$GATEWAY_CONTAINER" "$PAPERCLIP_CONTAINER" "$DB_CONTAINER"; do
  docker inspect "$container" >/dev/null 2>&1 || fail "missing_container:$container"
done

core_env="$(docker inspect "$CORE_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}')"
gateway_env="$(docker inspect "$GATEWAY_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}')"

if grep -qx 'WANDORA_ORGANIZATION_ADAPTER_ENABLED=true' <<<"$core_env"; then
  fail 'organization_adapter_already_enabled'
fi
if grep -qx 'WANDORA_HUMAN_SEND_PROPOSAL_ENABLED=true' <<<"$core_env"; then
  fail 'human_send_unexpectedly_enabled'
fi
if grep -qx 'WANDORA_GATEWAY_OUTBOUND_ENABLED=true' <<<"$gateway_env"; then
  fail 'gateway_outbound_unexpectedly_enabled'
fi

if [ -n "$(docker port "$CORE_CONTAINER" 2>/dev/null)" ]; then
  fail 'core_has_published_host_port'
fi

core_networks="$(docker inspect "$CORE_CONTAINER" --format '{{range $name,$cfg := .NetworkSettings.Networks}}{{println $name}}{{end}}')"
grep -qx 'wandora-core' <<<"$core_networks" || fail 'core_missing_wandora_core_network'
grep -qx 'wandora-data' <<<"$core_networks" || fail 'core_missing_wandora_data_network'
if grep -qx 'wandora-edge' <<<"$core_networks"; then
  fail 'core_unexpectedly_on_edge_network'
fi

paperclip_image="$(docker inspect "$PAPERCLIP_CONTAINER" --format '{{.Config.Image}}')"
[ "$paperclip_image" = "$EXPECTED_PAPERCLIP_IMAGE" ] || fail "paperclip_image_mismatch:$paperclip_image"
paperclip_networks="$(docker inspect "$PAPERCLIP_CONTAINER" --format '{{range $name,$cfg := .NetworkSettings.Networks}}{{println $name}}{{end}}')"
grep -qx 'wandora-core' <<<"$paperclip_networks" || fail 'paperclip_missing_wandora_core_network'
if [ -n "$(docker port "$PAPERCLIP_CONTAINER" 2>/dev/null)" ]; then
  fail 'paperclip_has_published_host_port'
fi

read -r binding_state employee_binding_state operation_state < <(
  docker exec "$DB_CONTAINER" psql -U supabase_admin -d postgres -Atq -F' ' -c "
    SELECT
      CASE WHEN to_regclass('wandora_private.control_plane_provider_bindings') IS NULL THEN 'ABSENT' ELSE 'PRESENT' END,
      CASE WHEN to_regclass('wandora_private.digital_employee_provider_bindings') IS NULL THEN 'ABSENT' ELSE 'PRESENT' END,
      CASE WHEN to_regclass('wandora_private.digital_employee_hire_operations') IS NULL THEN 'ABSENT' ELSE 'PRESENT' END;
  "
)

[ "$binding_state" = 'ABSENT' ] || fail 'migration_010_binding_table_already_present'
[ "$employee_binding_state" = 'ABSENT' ] || fail 'migration_010_employee_binding_table_already_present'
[ "$operation_state" = 'ABSENT' ] || fail 'migration_010_operation_table_already_present'

if [ -e "$CUSTODY_DIR" ]; then
  fail 'organization_adapter_custody_already_present'
fi

printf 'ORGANIZATION_ADAPTER_LIVE_PREACTIVATION_V1_OK\n'
printf 'core_image=%s\n' "$(docker inspect "$CORE_CONTAINER" --format '{{.Config.Image}}')"
printf 'paperclip_image=%s\n' "$paperclip_image"
printf 'migration_010_tables=ABSENT\n'
printf 'organization_adapter=OFF\n'
printf 'human_send=OFF\n'
printf 'gateway_outbound=OFF\n'
printf 'custody=ABSENT\n'
