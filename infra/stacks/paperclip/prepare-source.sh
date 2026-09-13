#!/usr/bin/env bash
set -euo pipefail

readonly REPO="https://github.com/paperclipai/paperclip.git"
readonly REF="65ec059bde30d98c92165b24a30a540800dd1f6f"
readonly DEST="${1:-source}"

if [[ -e "$DEST" ]]; then
  echo "Refusing to overwrite existing path: $DEST" >&2
  exit 1
fi

git clone "$REPO" "$DEST"
git -C "$DEST" checkout --detach "$REF"
actual="$(git -C "$DEST" rev-parse HEAD)"
[[ "$actual" == "$REF" ]] || {
  echo "Paperclip source verification failed: $actual" >&2
  exit 1
}

echo "Paperclip source prepared at $DEST ($actual)"
