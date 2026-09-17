#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CORE="$ROOT/apps/core"

if ! command -v docker >/dev/null 2>&1; then
  echo 'organization_adapter_candidate_docker_required' >&2
  exit 1
fi

SOURCE_SHA="${WANDORA_SOURCE_SHA:-$(git -C "$ROOT" rev-parse HEAD)}"
if [[ ! "$SOURCE_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'organization_adapter_candidate_invalid_source_sha' >&2
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
  --label "org.opencontainers.image.revision=$SOURCE_SHA" \
  --label 'io.wandora.candidate=organization-adapter-core-v1' \
  -t "$IMAGE" \
  "$CORE"

IMAGE_ID="$(docker image inspect --format '{{.Id}}' "$IMAGE")"
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
DOCKERFILE_SHA="$(sha256sum "$CORE/Dockerfile" | awk '{print $1}')"
LOCKFILE_SHA="$(sha256sum "$CORE/package-lock.json" | awk '{print $1}')"
TREE_SHA="$(git -C "$ROOT" rev-parse HEAD^{tree})"

cat > "$MANIFEST" <<EOF
candidate_contract=organization-adapter-core-v1
source_sha=$SOURCE_SHA
source_tree_sha=$TREE_SHA
image_tag=$IMAGE
image_id=$IMAGE_ID
image_user=$IMAGE_USER
dockerfile_sha256=$DOCKERFILE_SHA
package_lock_sha256=$LOCKFILE_SHA
archive_file=$(basename "$ARCHIVE")
archive_sha256=$ARCHIVE_SHA
EOF

printf '%s  %s\n' "$ARCHIVE_SHA" "$(basename "$ARCHIVE")" > "$OUT_DIR/SHA256SUMS"
(
  cd "$OUT_DIR"
  sha256sum -c SHA256SUMS
)

printf 'ORGANIZATION_ADAPTER_CORE_CANDIDATE_V1_OK\n'
printf 'candidate_dir=%s\n' "$OUT_DIR"
printf 'image=%s\n' "$IMAGE"
printf 'image_id=%s\n' "$IMAGE_ID"
printf 'archive_sha256=%s\n' "$ARCHIVE_SHA"
