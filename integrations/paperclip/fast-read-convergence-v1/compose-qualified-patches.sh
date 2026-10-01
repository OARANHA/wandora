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

operational_patch="$WANDORA_ROOT/integrations/paperclip/patches/v2026.916.1-host-operational-read-v1.patch"
run_patch="$WANDORA_ROOT/integrations/paperclip/patches/v2026.916.1-fast-read-run-result-read-v1.patch"
webhook_patch="$WANDORA_ROOT/integrations/paperclip/patches/v2026.916.1-synchronous-webhook-response-v1.patch"

tmp_root="$(mktemp -d)"
cleanup() {
  find "$tmp_root" -mindepth 1 -maxdepth 1 -type d -name 'worktree-*' -print0 2>/dev/null |
    while IFS= read -r -d '' worktree; do
      git -C "$PAPERCLIP_ROOT" worktree remove --force "$worktree" >/dev/null 2>&1 || true
    done
  rm -rf "$tmp_root"
}
trap cleanup EXIT

merge_insertion_only_conflicts() {
  mapfile -t conflicts < <(git -C "$PAPERCLIP_ROOT" diff --name-only --diff-filter=U)
  if [[ "${#conflicts[@]}" -eq 0 ]]; then
    echo "run-result overlay failed without unmerged paths" >&2
    exit 1
  fi

  for file in "${conflicts[@]}"; do
    echo "Resolving insertion-only composition conflict: $file"
    base="$tmp_root/base"
    ours="$tmp_root/ours"
    theirs="$tmp_root/theirs"
    merged="$tmp_root/merged"
    git -C "$PAPERCLIP_ROOT" show ":1:$file" > "$base"
    git -C "$PAPERCLIP_ROOT" show ":2:$file" > "$ours"
    git -C "$PAPERCLIP_ROOT" show ":3:$file" > "$theirs"

    python3 - "$base" "$ours" "$theirs" "$merged" "$file" <<'PY'
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path
import sys

base_path, ours_path, theirs_path, output_path, label = sys.argv[1:]
base = Path(base_path).read_text().splitlines(keepends=True)
ours = Path(ours_path).read_text().splitlines(keepends=True)
theirs = Path(theirs_path).read_text().splitlines(keepends=True)

def insertions(side, side_name):
    result = defaultdict(list)
    matcher = SequenceMatcher(a=base, b=side, autojunk=False)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue
        if tag != "insert" or i1 != i2:
            raise SystemExit(
                f"{label}: {side_name} is not insertion-only at base[{i1}:{i2}] ({tag})"
            )
        result[i1].extend(side[j1:j2])
    return result

left = insertions(ours, "operational")
right = insertions(theirs, "run-result")
out = []
for pos in range(len(base) + 1):
    l = left.get(pos, [])
    r = right.get(pos, [])
    out.extend(l)
    if r != l:
        out.extend(r)
    if pos < len(base):
        out.append(base[pos])

Path(output_path).write_text("".join(out))
PY

    cp "$merged" "$PAPERCLIP_ROOT/$file"
    git -C "$PAPERCLIP_ROOT" add "$file"
  done

  if git -C "$PAPERCLIP_ROOT" diff --name-only --diff-filter=U | grep -q .; then
    echo "unresolved composition conflicts remain" >&2
    git -C "$PAPERCLIP_ROOT" status --short >&2
    exit 1
  fi
}

# 1) Operational projection is the first qualified provider delta.
git -C "$PAPERCLIP_ROOT" apply --check "$operational_patch"
git -C "$PAPERCLIP_ROOT" apply "$operational_patch"
git -C "$PAPERCLIP_ROOT" add -A

# 2) Materialize the independently-qualified run-result delta against pristine
#    916.1, then merge it into the operational-read candidate. Overlapping
#    files are accepted only when both sides are insertion-only relative to the
#    exact upstream base.
run_worktree="$tmp_root/worktree-run-result"
run_overlay="$tmp_root/run-result.patch"
git -C "$PAPERCLIP_ROOT" worktree add --detach "$run_worktree" "$EXPECTED_COMMIT" >/dev/null
git -C "$run_worktree" apply --check "$run_patch"
git -C "$run_worktree" apply "$run_patch"
git -C "$run_worktree" diff --full-index --binary > "$run_overlay"
test -s "$run_overlay"
git -C "$PAPERCLIP_ROOT" worktree remove --force "$run_worktree" >/dev/null

set +e
git -C "$PAPERCLIP_ROOT" apply --3way "$run_overlay"
run_rc=$?
set -e
if [[ "$run_rc" -ne 0 ]]; then
  merge_insertion_only_conflicts
fi
git -C "$PAPERCLIP_ROOT" add -A

# 3) The synchronous webhook delta touches different semantic regions after
#    the first two deltas. Require a normal exact-context apply; do not fuzz or
#    union this patch because it contains real replacements, not insertions only.
git -C "$PAPERCLIP_ROOT" apply --check "$webhook_patch"
git -C "$PAPERCLIP_ROOT" apply "$webhook_patch"
git -C "$PAPERCLIP_ROOT" add -A

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
