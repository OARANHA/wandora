#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PAPERCLIP_ROOT="${1:?usage: verify.sh /path/to/patched-paperclip}"
PAPERCLIP_ROOT="$(cd "$PAPERCLIP_ROOT" && pwd)"

EXPECTED_COMMIT="d554c4789ed3930f8a53ac9fdf6503b3187097da"
ACTUAL_COMMIT="$(git -C "$PAPERCLIP_ROOT" rev-parse HEAD)"
[[ "$ACTUAL_COMMIT" == "$EXPECTED_COMMIT" ]] || {
  echo "Paperclip source mismatch: expected $EXPECTED_COMMIT, got $ACTUAL_COMMIT" >&2
  exit 1
}

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

BUILD_DIR="$PLUGIN_ROOT/.attestation-build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

cat > "$BUILD_DIR/tsconfig.json" <<JSON
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
  "include": [
    "$SCRIPT_DIR/integration-capability.ts",
    "$PLUGIN_ROOT/src/catalog.ts"
  ]
}
JSON

"$TSC" -p "$BUILD_DIR/tsconfig.json"
"$ESBUILD" "$SCRIPT_DIR/integration-capability.ts" \
  --bundle --platform=node --format=esm --target=node24 \
  --outfile="$BUILD_DIR/integration-capability.mjs" \
  --alias:@paperclipai/plugin-sdk="$SDK_JS"

node --test "$SCRIPT_DIR/integration-capability.test.mjs"
node --check "$BUILD_DIR/integration-capability.mjs"

echo WANDORA_INTEGRATION_CAPABILITY_PROJECTION_ATTESTATION_V1_OK
