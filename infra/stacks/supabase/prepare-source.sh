#!/usr/bin/env bash
set -euo pipefail

readonly REPO="https://github.com/supabase/supabase.git"
readonly REF="8c7a4d9dbbaf8b552893822e89d7bf06f33f9220"
readonly TAG="self-hosted/v0.8.1"
readonly DEST="${1:-source}"
readonly HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -e "$DEST" ]]; then
  echo "Refusing to overwrite existing path: $DEST" >&2
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

git clone --filter=blob:none --no-checkout --quiet "$REPO" "$tmp/repo"
git -C "$tmp/repo" sparse-checkout init --cone
git -C "$tmp/repo" sparse-checkout set docker
git -C "$tmp/repo" checkout --detach --quiet "$REF"
actual="$(git -C "$tmp/repo" rev-parse HEAD)"
[[ "$actual" == "$REF" ]] || { echo "Unexpected upstream commit: $actual" >&2; exit 1; }

mkdir -p "$DEST"
cp -a "$tmp/repo/docker/." "$DEST/"
cp "$HERE/docker-compose.wandora.yml" "$DEST/docker-compose.wandora.yml"
printf 'SUPABASE_SELF_HOSTED_TAG=%s\nSUPABASE_UPSTREAM_COMMIT=%s\n' "$TAG" "$REF" > "$DEST/.wandora-upstream"

echo "Prepared Supabase $TAG at $DEST ($actual). Generate secrets locally before first start."
