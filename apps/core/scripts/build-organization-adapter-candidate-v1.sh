#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CORE="$ROOT/apps/core"
VERIFIER="$CORE/scripts/verify-organization-adapter-candidate-archive-v1.py"

if ! command -v docker >/dev/null 2>&1; then
  echo 'organization_adapter_candidate_docker_required' >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo 'organization_adapter_candidate_python3_required' >&2
  exit 1
fi

ACTUAL_HEAD="$(git -C "$ROOT" rev-parse HEAD)"
SOURCE_SHA="${WANDORA_SOURCE_SHA:-$ACTUAL_HEAD}"
if [[ ! "$SOURCE_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'organization_adapter_candidate_invalid_source_sha' >&2
  exit 1
fi
if [ "$SOURCE_SHA" != "$ACTUAL_HEAD" ]; then
  echo 'organization_adapter_candidate_source_sha_must_match_checkout_head' >&2
  exit 1
fi

if [ -n "$(git -C "$ROOT" status --porcelain --untracked-files=all)" ]; then
  echo 'organization_adapter_candidate_requires_clean_checkout' >&2
  exit 1
fi

SHORT_SHA="${SOURCE_SHA:0:12}"
IMAGE="${WANDORA_CANDIDATE_IMAGE:-wandora/core:organization-adapter-candidate-$SHORT_SHA}"
OUT_DIR="${WANDORA_CANDIDATE_OUT_DIR:-$ROOT/.candidate/core-$SHORT_SHA}"
ARCHIVE="$OUT_DIR/wandora-core-organization-adapter-candidate-$SHORT_SHA.tar.gz"
MANIFEST="$OUT_DIR/candidate-manifest.txt"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

docker build \
  --provenance=false \
  --label "org.opencontainers.image.revision=$SOURCE_SHA" \
  --label 'io.wandora.candidate=organization-adapter-core-v1' \
  -t "$IMAGE" \
  "$CORE"

RUNNER_IMAGE_ID="$(docker image inspect --format '{{.Id}}' "$IMAGE")"
IMAGE_USER="$(docker image inspect --format '{{.Config.User}}' "$IMAGE")"
IMAGE_REVISION="$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$IMAGE")"
IMAGE_CANDIDATE="$(docker image inspect --format '{{ index .Config.Labels "io.wandora.candidate" }}' "$IMAGE")"
IMAGE_ENV="$(docker image inspect --format '{{json .Config.Env}}' "$IMAGE")"

[ "$IMAGE_USER" = 'node' ] || { echo 'organization_adapter_candidate_must_run_as_node' >&2; exit 1; }
[ "$IMAGE_REVISION" = "$SOURCE_SHA" ] || { echo 'organization_adapter_candidate_revision_mismatch' >&2; exit 1; }
[ "$IMAGE_CANDIDATE" = 'organization-adapter-core-v1' ] || { echo 'organization_adapter_candidate_label_mismatch' >&2; exit 1; }

if grep -Eq 'WANDORA_ORGANIZATION_ADAPTER_ENABLED|WANDORA_ORGANIZATION_ADAPTER_SECRET|HMAC|PASSWORD|TOKEN|API_KEY' <<<"$IMAGE_ENV"; then
  echo 'organization_adapter_candidate_baked_sensitive_or_enable_env' >&2
  exit 1
fi

docker save "$IMAGE" | gzip -n > "$ARCHIVE"

ARCHIVE_SHA="$(sha256sum "$ARCHIVE" | awk '{print $1}')"
PROVENANCE="$(python3 "$VERIFIER" --archive "$ARCHIVE")"
VERIFIED_ARCHIVE_SHA="$(awk -F= '$1=="archive_sha256"{print $2}' <<<"$PROVENANCE")"
OCI_CONFIG_DIGEST="$(awk -F= '$1=="oci_config_digest"{print $2}' <<<"$PROVENANCE")"
OCI_MANIFEST_DIGEST="$(awk -F= '$1=="oci_manifest_digest"{print $2}' <<<"$PROVENANCE")"
ARCHIVE_IMAGE_TAG="$(awk -F= '$1=="image_tag"{print substr($0,index($0,"=")+1)}' <<<"$PROVENANCE")"

[ "$VERIFIED_ARCHIVE_SHA" = "$ARCHIVE_SHA" ] || { echo 'organization_adapter_candidate_archive_sha_mismatch' >&2; exit 1; }
[ "$ARCHIVE_IMAGE_TAG" = "$IMAGE" ] || { echo 'organization_adapter_candidate_archive_tag_mismatch' >&2; exit 1; }
[ -n "$OCI_CONFIG_DIGEST" ] || { echo 'organization_adapter_candidate_missing_oci_config_digest' >&2; exit 1; }
[ -n "$OCI_MANIFEST_DIGEST" ] || { echo 'organization_adapter_candidate_missing_oci_manifest_digest' >&2; exit 1; }

DOCKERFILE_SHA="$(sha256sum "$CORE/Dockerfile" | awk '{print $1}')"
LOCKFILE_SHA="$(sha256sum "$CORE/package-lock.json" | awk '{print $1}')"
TREE_SHA="$(git -C "$ROOT" rev-parse HEAD^{tree})"

cat > "$MANIFEST" <<EOF
candidate_contract=organization-adapter-core-v1
source_sha=$SOURCE_SHA
source_tree_sha=$TREE_SHA
image_tag=$IMAGE
runner_image_id=$RUNNER_IMAGE_ID
oci_config_digest=$OCI_CONFIG_DIGEST
oci_manifest_digest=$OCI_MANIFEST_DIGEST
image_user=$IMAGE_USER
dockerfile_sha256=$DOCKERFILE_SHA
package_lock_sha256=$LOCKFILE_SHA
archive_file=$(basename "$ARCHIVE")
archive_sha256=$ARCHIVE_SHA
EOF

python3 "$VERIFIER" --archive "$ARCHIVE" --manifest "$MANIFEST"
printf '%s  %s\n' "$ARCHIVE_SHA" "$(basename "$ARCHIVE")" > "$OUT_DIR/SHA256SUMS"
(
  cd "$OUT_DIR"
  sha256sum -c SHA256SUMS
)

printf 'ORGANIZATION_ADAPTER_CORE_CANDIDATE_V1_OK\n'
printf 'candidate_dir=%s\n' "$OUT_DIR"
printf 'image=%s\n' "$IMAGE"
printf 'runner_image_id=%s\n' "$RUNNER_IMAGE_ID"
printf 'oci_config_digest=%s\n' "$OCI_CONFIG_DIGEST"
printf 'oci_manifest_digest=%s\n' "$OCI_MANIFEST_DIGEST"
printf 'archive_sha256=%s\n' "$ARCHIVE_SHA"
