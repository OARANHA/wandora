#!/usr/bin/env node
import fs from "node:fs";

const entrypointPath = "scripts/operations/managed-admin-semantic-fast-read-custody-metadata-v1.sh";
const source = fs.readFileSync(entrypointPath, "utf8");

const exactPaths = [
  "/opt/wandora/stacks/core/secrets/wandora_typesafe_jev_api_key",
  "/opt/wandora/stacks/core/secrets/wandora_fast_read_intent_hmac",
  "/opt/wandora/stacks/core/secrets/wandora_model_provider_api_key",
];

const discoveredPaths = [...source.matchAll(/\/opt\/wandora\/stacks\/core\/secrets\/[A-Za-z0-9_.-]+/g)].map(
  (match) => match[0],
);
if (JSON.stringify(discoveredPaths) !== JSON.stringify(exactPaths)) {
  throw new Error(`custody_metadata_exact_paths_mismatch:${JSON.stringify(discoveredPaths)}`);
}

const required = [
  '[[ "$#" -eq 0 ]]',
  '[[ "${EUID}" -eq 0 ]]',
  'SELF="/usr/local/sbin/wandora-semantic-fast-read-custody-metadata-v1"',
  '/usr/bin/readlink -f -- "$0"',
  'root|root|755|regular file',
  "readonly SECRET_PATHS=(",
  '[[ ! -L "$path" && -f "$path" ]]',
  "/usr/bin/stat -c '%U|%G|%a|%F' -- \"$path\"",
  'wandora-admin|wandora-ops|640|regular file',
  'mode=0640 type=regular_file',
  '[[ "${#rows[@]}" -eq 3 ]]',
  'SEMANTIC_FAST_READ_CUSTODY_METADATA_V1_OK',
];

const missing = required.filter((item) => !source.includes(item));
if (missing.length) {
  throw new Error(`custody_metadata_entrypoint_missing:${JSON.stringify(missing)}`);
}

if ((source.match(/\/usr\/bin\/stat\b/g) ?? []).length !== 2) {
  throw new Error("custody_metadata_stat_surface_count");
}

if ((source.match(/SEMANTIC_FAST_READ_CUSTODY_METADATA_V1_OK/g) ?? []).length !== 1) {
  throw new Error("custody_metadata_terminal_marker_count");
}

const validationIndex = source.indexOf('[[ "${#rows[@]}" -eq 3 ]]');
const outputIndex = source.indexOf("printf '%s\\n' \"${rows[@]}\"");
if (validationIndex < 0 || outputIndex < validationIndex) {
  throw new Error("custody_metadata_output_before_full_validation");
}

const forbidden = [
  '"$@"',
  '"$1"',
  "${1",
  "/usr/bin/cat",
  "/bin/cat",
  "/usr/bin/cp",
  "/bin/cp",
  "/usr/bin/mv",
  "/bin/mv",
  "/usr/bin/dd",
  "/bin/dd",
  "sha256sum",
  "sha1sum",
  "md5sum",
  "hash-object",
  "openssl",
  "base64",
  "/usr/bin/xxd",
  "/usr/bin/od",
  "/usr/bin/strings",
  "curl ",
  "wget ",
  "ssh ",
  "scp ",
  "rsync ",
  "docker ",
  "systemctl ",
  "journalctl ",
  "sudo ",
  "eval ",
  "source ",
  "target_agent_",
  "host_admin_apply",
];

const present = forbidden.filter((item) => source.includes(item));
if (present.length) {
  throw new Error(`custody_metadata_entrypoint_forbidden:${JSON.stringify(present)}`);
}

if (source.includes("read -") || source.includes("read <") || source.includes("< \"$path\"")) {
  throw new Error("custody_metadata_content_read_surface");
}

console.log("WANDORA_ADR0339_CUSTODY_METADATA_ENTRYPOINT_OK");
