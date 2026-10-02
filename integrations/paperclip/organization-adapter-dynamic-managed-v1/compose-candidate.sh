#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WANDORA_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BASE_ROOT="$WANDORA_ROOT/integrations/paperclip/plugins/organization-adapter-v1"
OVERLAY="$SCRIPT_DIR/organization-adapter-v0.7.0.patch"
DEST="${1:?usage: compose-candidate.sh /path/to/output}"

rm -rf "$DEST"
mkdir -p "$DEST"
cp -a "$BASE_ROOT/." "$DEST/"

node - "$BASE_ROOT/package.json" "$BASE_ROOT/compatibility.json" <<'NODE'
const fs = require('node:fs');
const pkg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const compatibility = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
if (pkg.version !== '0.6.1') throw new Error('canonical_organization_adapter_version_changed');
if (compatibility.paperclipImage !== 'wandora/paperclip:v2026.916.1') {
  throw new Error('canonical_organization_adapter_provider_pin_changed');
}
NODE

git -C "$DEST" init -q
git -C "$DEST" config user.email "ci@wandora.invalid"
git -C "$DEST" config user.name "Wandora CI"
git -C "$DEST" add -A
git -C "$DEST" commit -qm "base organization adapter 0.6.1"

git -C "$DEST" apply --check "$OVERLAY"
git -C "$DEST" apply "$OVERLAY"
git -C "$DEST" diff --check

node - "$DEST/package.json" "$DEST/compatibility.json" <<'NODE'
const fs = require('node:fs');
const pkg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const compatibility = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
if (pkg.version !== '0.7.0') throw new Error('candidate_version_invalid');
if (compatibility.paperclipImage !== 'wandora/paperclip:v2026.916.1-dynamic-managed-agent-v1') {
  throw new Error('candidate_provider_profile_invalid');
}
if (compatibility.providerProfile !== 'dynamic-managed-agent-v1') {
  throw new Error('candidate_provider_profile_marker_missing');
}
NODE

grep -Fq "'agents.managed.dynamic'" "$DEST/src/manifest.ts"
grep -Fq "endpointKey: 'employee-ensure-dynamic'" "$DEST/src/manifest.ts"
grep -Fq 'agents.managed.ensureDynamic' "$DEST/src/dynamic-employee.ts"
grep -Fq "resolution.agent.status !== 'paused'" "$DEST/src/dynamic-employee.ts"

echo "ORGANIZATION_ADAPTER_DYNAMIC_MANAGED_CANDIDATE_COMPOSITION_OK"
