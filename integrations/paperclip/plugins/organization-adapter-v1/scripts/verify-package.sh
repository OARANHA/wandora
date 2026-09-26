#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PAPERCLIP_ROOT="${1:?usage: verify-package.sh /path/to/pinned/paperclip}"
PAPERCLIP_ROOT="$(cd "$PAPERCLIP_ROOT" && pwd)"

EXPECTED_COMMIT="$(node -e "const c=require('$ROOT/compatibility.json'); process.stdout.write(c.paperclipSourceCommit)")"
ACTUAL_COMMIT="$(git -C "$PAPERCLIP_ROOT" rev-parse HEAD)"
if [[ "$ACTUAL_COMMIT" != "$EXPECTED_COMMIT" ]]; then
  echo "Paperclip source mismatch: expected $EXPECTED_COMMIT, got $ACTUAL_COMMIT" >&2
  exit 1
fi

TSC="$PAPERCLIP_ROOT/node_modules/.bin/tsc"
ESBUILD="$PAPERCLIP_ROOT/node_modules/.bin/esbuild"
SDK_DTS="$PAPERCLIP_ROOT/packages/plugins/sdk/dist/index.d.ts"
SDK_JS="$PAPERCLIP_ROOT/packages/plugins/sdk/dist/index.js"
for required in "$TSC" "$ESBUILD" "$SDK_DTS" "$SDK_JS"; do
  [[ -e "$required" ]] || { echo "missing Paperclip build dependency: $required" >&2; exit 1; }
done

NODE_TYPES_PACKAGE="$(find "$PAPERCLIP_ROOT/node_modules/.pnpm" -path '*/@types/node/package.json' -print -quit)"
[[ -n "$NODE_TYPES_PACKAGE" ]] || { echo 'Paperclip @types/node is missing' >&2; exit 1; }
TYPE_ROOT="$(dirname "$(dirname "$NODE_TYPES_PACKAGE")")"

VERIFY_DIR="$ROOT/.verify"
rm -rf "$ROOT/dist" "$ROOT/.test-build" "$ROOT/artifacts" "$VERIFY_DIR"
mkdir -p "$ROOT/dist" "$ROOT/.test-build" "$ROOT/artifacts" "$VERIFY_DIR"

cat > "$VERIFY_DIR/tsconfig.json" <<JSON
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": false,
    "paths": {
      "@paperclipai/plugin-sdk": ["$SDK_DTS"]
    },
    "typeRoots": ["$TYPE_ROOT"],
    "types": ["node"]
  },
  "include": ["$ROOT/src/**/*.ts"]
}
JSON

"$TSC" -p "$VERIFY_DIR/tsconfig.json"
"$ESBUILD" "$ROOT/src/manifest.ts" --bundle --platform=node --format=esm --target=node24 \
  --outfile="$ROOT/dist/manifest.js" --alias:@paperclipai/plugin-sdk="$SDK_JS"
"$ESBUILD" "$ROOT/src/worker.ts" --bundle --platform=node --format=esm --target=node24 \
  --outfile="$ROOT/dist/worker.js" --alias:@paperclipai/plugin-sdk="$SDK_JS"
"$ESBUILD" "$ROOT/src/contract.ts" --bundle --platform=node --format=esm --target=node24 \
  --outfile="$ROOT/.test-build/contract.mjs"
"$ESBUILD" "$ROOT/src/activation.ts" --bundle --platform=node --format=esm --target=node24 \
  --outfile="$ROOT/.test-build/activation.mjs" --alias:@paperclipai/plugin-sdk="$SDK_JS"
"$ESBUILD" "$ROOT/src/work.ts" --bundle --platform=node --format=esm --target=node24 \
  --outfile="$ROOT/.test-build/work.mjs" --alias:@paperclipai/plugin-sdk="$SDK_JS"
"$ESBUILD" "$ROOT/src/fast-read.ts" --bundle --platform=node --format=esm --target=node24 \
  --outfile="$ROOT/.test-build/fast-read.mjs" --alias:@paperclipai/plugin-sdk="$SDK_JS"
"$ESBUILD" "$ROOT/src/integration-capability.ts" --bundle --platform=node --format=esm --target=node24 \
  --outfile="$ROOT/.test-build/integration-capability.mjs" --alias:@paperclipai/plugin-sdk="$SDK_JS"

node --test "$ROOT/test/contract.test.mjs" "$ROOT/test/activation.test.mjs" "$ROOT/test/work.test.mjs" "$ROOT/test/fast-read.test.mjs" "$ROOT/test/integration-capability.test.mjs"
node "$ROOT/scripts/verify-artifact.mjs"
node --check "$ROOT/dist/manifest.js"
node --check "$ROOT/dist/worker.js"

TSX="$(find "$PAPERCLIP_ROOT/node_modules/.pnpm" -path '*/tsx/dist/cli.mjs' -print -quit)"
[[ -n "$TSX" ]] || { echo 'Paperclip tsx runtime is missing' >&2; exit 1; }
PAPERCLIP_ROOT="$PAPERCLIP_ROOT" node "$TSX" "$ROOT/scripts/validate-paperclip.ts"

mkdir -p "$VERIFY_DIR/pack1" "$VERIFY_DIR/pack2"
(
  cd "$ROOT"
  npm pack --ignore-scripts --pack-destination "$VERIFY_DIR/pack1" >/dev/null
  npm pack --ignore-scripts --pack-destination "$VERIFY_DIR/pack2" >/dev/null
)
PACK1="$(find "$VERIFY_DIR/pack1" -maxdepth 1 -name '*.tgz' -print -quit)"
PACK2="$(find "$VERIFY_DIR/pack2" -maxdepth 1 -name '*.tgz' -print -quit)"
HASH1="$(sha256sum "$PACK1" | cut -d' ' -f1)"
HASH2="$(sha256sum "$PACK2" | cut -d' ' -f1)"
[[ "$HASH1" == "$HASH2" ]] || { echo 'npm pack output is not reproducible' >&2; exit 1; }

cat > "$VERIFY_DIR/expected-contents.txt" <<'EOF'
package/README.md
package/compatibility.json
package/dist/manifest.js
package/dist/worker.js
package/package.json
EOF
tar -tzf "$PACK2" | sort > "$VERIFY_DIR/actual-contents.txt"
cmp "$VERIFY_DIR/expected-contents.txt" "$VERIFY_DIR/actual-contents.txt"

mkdir -p "$VERIFY_DIR/extracted"
tar -xzf "$PACK2" -C "$VERIFY_DIR/extracted"
FORBIDDEN_HITS="$VERIFY_DIR/forbidden-material.txt"
FILTERED_HITS="$VERIFY_DIR/forbidden-material-filtered.txt"

grep -RInE 'wandora_mastra_spike|127\.0\.0\.1:3140|company-test-only|synthetic-test-only|-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----|service_role|x-wandora-paperclip-run-token' \
  "$VERIFY_DIR/extracted/package" >"$FORBIDDEN_HITS" || true

# Paperclip v2026.916.0's bundled public SDK contains one literal placeholder
# used by upstream SDK code. Exclude only that exact known placeholder hit from
# dist/worker.js; any other private-key marker or forbidden material still fails.
awk '
  index($0, "/package/dist/worker.js:") &&
  index($0, "placeholder: \"-----BEGIN RSA PRIVATE KEY-----\",") { next }
  { print }
' "$FORBIDDEN_HITS" >"$FILTERED_HITS"

if [[ -s "$FILTERED_HITS" ]]; then
  cat "$FILTERED_HITS" >&2
  echo 'forbidden laboratory/credential material found in installable artifact' >&2
  exit 1
fi

cp "$PACK2" "$ROOT/artifacts/"
printf '%s  %s\n' "$HASH2" "$(basename "$PACK2")" > "$ROOT/artifacts/package-sha256.txt"
cat > "$ROOT/artifacts/provenance.txt" <<EOF
wandora_source_sha=${WANDORA_SOURCE_SHA:-unversioned}
paperclip_source_commit=$EXPECTED_COMMIT
paperclip_image="$(node -e "const c=require('$ROOT/compatibility.json'); process.stdout.write(c.paperclipImage)")"
paperclip_patches="$(node -e "const c=require('$ROOT/compatibility.json'); process.stdout.write((c.paperclipPatches||[]).join(','))")"
plugin_package=$(basename "$PACK2")
plugin_package_sha256=$HASH2
EOF

printf 'WANDORA_ORGANIZATION_ADAPTER_PLUGIN_PACKAGE_V1_OK\n'
printf 'package_sha256=%s\n' "$HASH2"
