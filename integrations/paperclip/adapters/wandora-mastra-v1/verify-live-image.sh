#!/usr/bin/env bash
set -euo pipefail

IMAGE="${PAPERCLIP_IMAGE:-wandora/paperclip:v2026.831.1}"
HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

docker image inspect "$IMAGE" >/dev/null

docker run --rm \
  --network none \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --mount type=bind,src="$HERE",dst=/app/tmp/wandora-mastra-adapter,readonly \
  "$IMAGE" \
  node --import ./server/node_modules/tsx/dist/loader.mjs /app/tmp/wandora-mastra-adapter/verify-live-image.mjs
