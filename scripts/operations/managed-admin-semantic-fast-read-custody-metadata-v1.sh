#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# ADR 0339 — Semantic Fast Read Custody Metadata Readback Capability Qualification V1.
# Dedicated managed-admin entrypoint. The caller supplies no arguments and receives
# no generic filesystem or interpreter authority.

fail() {
  printf 'SEMANTIC_FAST_READ_CUSTODY_METADATA_V1_ERROR\n' >&2
  exit 1
}

[[ "$#" -eq 0 ]] || fail
[[ "${EUID}" -eq 0 ]] || fail

SELF="/usr/local/sbin/wandora-semantic-fast-read-custody-metadata-v1"
resolved_self="$(/usr/bin/readlink -f -- "$0")"
[[ "$resolved_self" == "$SELF" ]] || fail
[[ ! -L "$SELF" && -f "$SELF" ]] || fail
[[ "$(/usr/bin/stat -c '%U|%G|%a|%F' -- "$SELF")" == "root|root|755|regular file" ]] || fail

readonly SECRET_PATHS=(
  "/opt/wandora/stacks/core/secrets/wandora_typesafe_jev_api_key"
  "/opt/wandora/stacks/core/secrets/wandora_fast_read_intent_hmac"
  "/opt/wandora/stacks/core/secrets/wandora_model_provider_api_key"
)

rows=()
for path in "${SECRET_PATHS[@]}"; do
  [[ ! -L "$path" && -f "$path" ]] || fail
  metadata="$(/usr/bin/stat -c '%U|%G|%a|%F' -- "$path")" || fail
  [[ "$metadata" == "wandora-admin|wandora-ops|640|regular file" ]] || fail
  rows+=("path=$path owner=wandora-admin group=wandora-ops mode=0640 type=regular_file")
done

[[ "${#rows[@]}" -eq 3 ]] || fail
printf '%s\n' "${rows[@]}"
printf 'SEMANTIC_FAST_READ_CUSTODY_METADATA_V1_OK\n'
