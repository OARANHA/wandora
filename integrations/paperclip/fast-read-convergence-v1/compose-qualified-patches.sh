#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WANDORA_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PAPERCLIP_ROOT="${1:?usage: compose-qualified-patches.sh /path/to/paperclip}"
PAPERCLIP_ROOT="$(cd "$PAPERCLIP_ROOT" && pwd)"
EXPECTED_COMMIT="d554c4789ed3930f8a53ac9fdf6503b3187097da"

actual="$(git -C "$PAPERCLIP_ROOT" rev-parse HEAD)"
if [[ "$actual" != "$EXPECTED_COMMIT" ]]; then
  echo "Paperclip source mismatch: expected $EXPECTED_COMMIT, got $actual" >&2
  exit 1
fi
if [[ -n "$(git -C "$PAPERCLIP_ROOT" status --porcelain)" ]]; then
  echo "Paperclip source must be clean before composition" >&2
  exit 1
fi

patches=(
  "$WANDORA_ROOT/integrations/paperclip/patches/v2026.916.1-host-operational-read-v1.patch"
  "$WANDORA_ROOT/integrations/paperclip/patches/v2026.916.1-fast-read-run-result-read-v1.patch"
  "$WANDORA_ROOT/integrations/paperclip/patches/v2026.916.1-synchronous-webhook-response-v1.patch"
)

tmp_root="$(mktemp -d)"
cleanup() {
  find "$tmp_root" -mindepth 1 -maxdepth 1 -type d -name 'worktree-*' -print0 2>/dev/null     | while IFS= read -r -d '' worktree; do
        git -C "$PAPERCLIP_ROOT" worktree remove --force "$worktree" >/dev/null 2>&1 || true
      done
  rm -rf "$tmp_root"
}
trap cleanup EXIT

resolve_union_conflicts() {
  local label="$1"
  mapfile -t conflicts < <(git -C "$PAPERCLIP_ROOT" diff --name-only --diff-filter=U)
  if [[ "${#conflicts[@]}" -eq 0 ]]; then
    echo "$label reported apply failure without unmerged paths" >&2
    exit 1
  fi

  for file in "${conflicts[@]}"; do
    echo "Resolving additive composition conflict: $file"
    local base="$tmp_root/base"
    local ours="$tmp_root/ours"
    local theirs="$tmp_root/theirs"
    git -C "$PAPERCLIP_ROOT" show ":1:$file" > "$base"
    git -C "$PAPERCLIP_ROOT" show ":2:$file" > "$ours"
    git -C "$PAPERCLIP_ROOT" show ":3:$file" > "$theirs"

    set +e
    git merge-file --union -p "$ours" "$base" "$theirs" > "$PAPERCLIP_ROOT/$file"
    local merge_rc=$?
    set -e
    if [[ "$merge_rc" -ge 128 ]]; then
      echo "merge-file failed for $file with rc=$merge_rc" >&2
      exit "$merge_rc"
    fi
    git -C "$PAPERCLIP_ROOT" add "$file"
  done

  if git -C "$PAPERCLIP_ROOT" diff --name-only --diff-filter=U | grep -q .; then
    echo "unresolved composition conflicts remain after union resolution" >&2
    git -C "$PAPERCLIP_ROOT" status --short >&2
    exit 1
  fi
}

apply_overlay() {
  local patch="$1"
  local label="$2"
  local worktree="$tmp_root/worktree-$label"
  local overlay="$tmp_root/$label.patch"

  git -C "$PAPERCLIP_ROOT" worktree add --detach "$worktree" "$EXPECTED_COMMIT" >/dev/null
  git -C "$worktree" apply --check "$patch"
  git -C "$worktree" apply "$patch"
  git -C "$worktree" diff --full-index --binary > "$overlay"
  test -s "$overlay"
  git -C "$PAPERCLIP_ROOT" worktree remove --force "$worktree" >/dev/null

  set +e
  git -C "$PAPERCLIP_ROOT" apply --3way "$overlay"
  local apply_rc=$?
  set -e
  if [[ "$apply_rc" -ne 0 ]]; then
    resolve_union_conflicts "$label"
  fi
  git -C "$PAPERCLIP_ROOT" add -A
}

apply_overlay "${patches[0]}" "operational-read"
apply_overlay "${patches[1]}" "run-result-read"
apply_overlay "${patches[2]}" "synchronous-webhook"

if grep -RInE '^(<<<<<<<|=======|>>>>>>>)'   "$PAPERCLIP_ROOT/packages/plugins/sdk/src"   "$PAPERCLIP_ROOT/server/src/services/plugin-host-services.ts"   "$PAPERCLIP_ROOT/server/src/routes/plugins.ts" >/dev/null; then
  echo "merge conflict markers remain in composed Paperclip source" >&2
  exit 1
fi

git -C "$PAPERCLIP_ROOT" diff --check

for marker in   '"tools.operational.read"'   '"agent.runs.read"'   'PLUGIN_WEBHOOK_RESPONSE_MAX_BYTES'
do
  if ! git -C "$PAPERCLIP_ROOT" grep -q "$marker"; then
    echo "missing composed marker: $marker" >&2
    exit 1
  fi
done

echo "PAPERCLIP_FAST_READ_QUALIFIED_PATCH_COMPOSITION_OK"
echo "paperclip_source_commit=$EXPECTED_COMMIT"
git -C "$PAPERCLIP_ROOT" status --short
