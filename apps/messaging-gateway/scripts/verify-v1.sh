#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_IMAGE='node:22.23.2-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5'
IMAGE="wandora/messaging-gateway:verify"

docker run --rm \
  -v "$APP_DIR:/app" \
  -w /app \
  "$NODE_IMAGE" \
  sh -lc 'npm ci --ignore-scripts --no-audit --no-fund && npm run verify'

docker build -t "$IMAGE" "$APP_DIR"
echo 'WANDORA_MESSAGING_GATEWAY_CODE_V1_OK'
