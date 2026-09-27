#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# ADR 0300 — PostgreSQL 18.1 Recovery Image Acquisition V1
# Operator-local only. This prepares the pre-existing recovery utility image
# required by ADR 0299. It does not deploy/restart any Wandora service.

fail() {
  printf 'POSTGRES_18_1_RECOVERY_IMAGE_V1_ERROR: %s\n' "$*" >&2
  exit 1
}

[[ "$#" -eq 0 ]] || fail "no arguments accepted"
[[ "${EUID}" -eq 0 ]] || fail "must run as root on the operator host"

SOURCE_INDEX_DIGEST="sha256:1090bc3a8ccfb0b55f78a494d76f8d603434f7e4553543d6e807bc7bd6bbd17f"
SOURCE_REF="postgres@${SOURCE_INDEX_DIGEST}"
EXPECTED_REPO_DIGEST="postgres@${SOURCE_INDEX_DIGEST}"
TARGET_TAG="postgres:18.1"
EXPECTED_PLATFORM="linux/amd64"
RECEIPT="/opt/wandora/ops-workspace/postgres-18-1-recovery-image-v1.metadata"

tmp_receipt=""
receipt_published=false
pull_performed=false

cleanup() {
  if [[ -n "${tmp_receipt}" && -e "${tmp_receipt}" ]]; then
    rm -f -- "${tmp_receipt}" || true
  fi
  if [[ "${receipt_published}" != "true" && -e "${RECEIPT}" ]]; then
    # Never remove a pre-existing receipt; publication uses a hard-link no-overwrite path.
    :
  fi
}
trap cleanup EXIT

[[ "$(uname -m)" == "x86_64" ]] || fail "host architecture is not x86_64"
[[ ! -e "${RECEIPT}" && ! -L "${RECEIPT}" ]] ||
  fail "receipt already exists; reconcile it before rerun: ${RECEIPT}"

image_has_expected_digest() {
  local ref="$1" digests
  digests="$(docker image inspect --format '{{json .RepoDigests}}' "$ref")"
  jq -e --arg expected "${EXPECTED_REPO_DIGEST}" 'index($expected) != null' <<<"${digests}" >/dev/null
}

image_platform() {
  docker image inspect --format '{{.Os}}/{{.Architecture}}' "$1"
}

validate_runtime() {
  local ref="$1" version
  [[ "$(image_platform "$ref")" == "${EXPECTED_PLATFORM}" ]] ||
    fail "image platform mismatch for ${ref}"
  image_has_expected_digest "$ref" ||
    fail "image digest mismatch for ${ref}"
  version="$(docker run --rm --network none --entrypoint postgres "$ref" --version)"
  [[ "${version}" == "postgres (PostgreSQL) 18.1"* ]] ||
    fail "unexpected PostgreSQL runtime version: ${version}"
  printf '%s' "${version}"
}

if docker image inspect "${TARGET_TAG}" >/dev/null 2>&1; then
  image_has_expected_digest "${TARGET_TAG}" ||
    fail "existing postgres:18.1 tag points to a different digest; refusing overwrite"
else
  if ! docker image inspect "${SOURCE_REF}" >/dev/null 2>&1; then
    docker pull --platform "${EXPECTED_PLATFORM}" "${SOURCE_REF}"
    pull_performed=true
  fi

  source_version="$(validate_runtime "${SOURCE_REF}")"
  docker tag "${SOURCE_REF}" "${TARGET_TAG}"
fi

target_version="$(validate_runtime "${TARGET_TAG}")"
target_image_id="$(docker image inspect --format '{{.Id}}' "${TARGET_TAG}")"
[[ -n "${target_image_id}" ]] || fail "target image ID unavailable"

tmp_receipt="$(mktemp "${RECEIPT}.tmp.XXXXXX")"
{
  printf 'source_ref=%s\n' "${SOURCE_REF}"
  printf 'source_index_digest=%s\n' "${SOURCE_INDEX_DIGEST}"
  printf 'target_tag=%s\n' "${TARGET_TAG}"
  printf 'platform=%s\n' "${EXPECTED_PLATFORM}"
  printf 'image_id=%s\n' "${target_image_id}"
  printf 'postgres_version=%s\n' "${target_version}"
  printf 'registry_pull_performed=%s\n' "${pull_performed}"
  printf 'service_restart_performed=false\n'
  printf 'production_container_recreated=false\n'
  printf 'customer_effect=false\n'
  printf 'provider_call_performed=false\n'
  printf 'outbound_effect=false\n'
  printf 'POSTGRES_18_1_RECOVERY_IMAGE_V1_OK\n'
} >"${tmp_receipt}"

chown root:ops-mcp -- "${tmp_receipt}"
chmod 0640 -- "${tmp_receipt}"
ln -- "${tmp_receipt}" "${RECEIPT}" ||
  fail "receipt appeared concurrently; refusing overwrite"
receipt_published=true
rm -f -- "${tmp_receipt}"
tmp_receipt=""

printf 'POSTGRES_18_1_RECOVERY_IMAGE_V1_OK\n'
printf 'receipt=%s\n' "${RECEIPT}"
printf 'source_index_digest=%s\n' "${SOURCE_INDEX_DIGEST}"
printf 'image_id=%s\n' "${target_image_id}"
printf 'registry_pull_performed=%s\n' "${pull_performed}"
printf 'service_restart_performed=false\n'
printf 'customer_effect=false\n'
printf 'outbound_effect=false\n'
