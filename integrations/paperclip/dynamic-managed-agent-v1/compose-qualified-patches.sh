#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WANDORA_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PAPERCLIP_ROOT="${1:?usage: compose-qualified-patches.sh /path/to/paperclip}"
PAPERCLIP_ROOT="$(cd "$PAPERCLIP_ROOT" && pwd)"
EXPECTED_COMMIT="d554c4789ed3930f8a53ac9fdf6503b3187097da"

base_composer="$WANDORA_ROOT/integrations/paperclip/fast-read-convergence-v1/compose-qualified-patches.sh"
dynamic_patch="$WANDORA_ROOT/integrations/paperclip/patches/v2026.916.1-dynamic-managed-agent-ensure-v1.patch"

actual="$(git -C "$PAPERCLIP_ROOT" rev-parse HEAD)"
if [[ "$actual" != "$EXPECTED_COMMIT" ]]; then
  echo "Paperclip source mismatch: expected $EXPECTED_COMMIT, got $actual" >&2
  exit 1
fi
if [[ -n "$(git -C "$PAPERCLIP_ROOT" status --porcelain)" ]]; then
  echo "Paperclip source must be clean before composition" >&2
  exit 1
fi

# Reuse the already-qualified four-delta composition as the exact base.
chmod +x "$base_composer"
"$base_composer" "$PAPERCLIP_ROOT"

# Fifth delta is deliberately authored against the composed four-patch tree.
# Require exact-context application: no fuzz, no union merge, no silent fallback.
git -C "$PAPERCLIP_ROOT" apply --check "$dynamic_patch"
git -C "$PAPERCLIP_ROOT" apply "$dynamic_patch"
git -C "$PAPERCLIP_ROOT" add -A

if grep -RInE '^(<<<<<<<|=======|>>>>>>>)' \
  "$PAPERCLIP_ROOT/packages/plugins/sdk/src" \
  "$PAPERCLIP_ROOT/packages/plugins/sdk/tests" \
  "$PAPERCLIP_ROOT/packages/shared/src" \
  "$PAPERCLIP_ROOT/packages/db/src/migrations" \
  "$PAPERCLIP_ROOT/server/src/services" \
  "$PAPERCLIP_ROOT/server/src/__tests__" >/dev/null; then
  echo "merge conflict markers remain in composed Paperclip source" >&2
  exit 1
fi

git -C "$PAPERCLIP_ROOT" diff --cached --check

for marker in \
  '"agents.managed.dynamic"' \
  '"agents.managed.ensureDynamic"' \
  'paperclipDynamicManagedAgent' \
  'agents_dynamic_managed_agent_marker_uq' \
  'plugin.dynamic_managed_agent.created'
do
  if ! git -C "$PAPERCLIP_ROOT" grep -q "$marker"; then
    echo "missing dynamic managed Agent composed marker: $marker" >&2
    exit 1
  fi
done

echo "PAPERCLIP_DYNAMIC_MANAGED_AGENT_QUALIFIED_PATCH_COMPOSITION_OK"
echo "paperclip_source_commit=$EXPECTED_COMMIT"
git -C "$PAPERCLIP_ROOT" status --short
