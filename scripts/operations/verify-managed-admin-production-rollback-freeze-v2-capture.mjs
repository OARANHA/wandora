#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";

const helperPath = "scripts/operations/production-rollback-freeze-v2.sh";
const entrypointPath = "scripts/operations/managed-admin-production-rollback-freeze-v2-capture.sh";
const expectedBlob = "849a05971d5f2526b6e8829d5315b4678f169315";

const helper = fs.readFileSync(helperPath);
const gitBlob = crypto
  .createHash("sha1")
  .update(Buffer.from(`blob ${helper.length}\0`, "utf8"))
  .update(helper)
  .digest("hex");

if (gitBlob !== expectedBlob) {
  throw new Error(`canonical_helper_blob_mismatch:${gitBlob}`);
}

const source = fs.readFileSync(entrypointPath, "utf8");

const required = [
  '[[ "$#" -eq 0 ]]',
  '[[ "${EUID}" -eq 0 ]]',
  'SELF="/usr/local/sbin/wandora-rollback-freeze-v2-capture"',
  'HELPER="/usr/local/libexec/wandora/production-rollback-freeze-v2.sh"',
  `EXPECTED_HELPER_GIT_BLOB="${expectedBlob}"`,
  '/usr/bin/readlink -f -- "$0"',
  "root:root:755:regular file",
  "root:root:750:regular file",
  '/usr/bin/git hash-object --no-filters "$HELPER"',
  '/usr/bin/bash -n "$HELPER"',
  'exec /usr/bin/bash "$HELPER"',
];

const missing = required.filter((item) => !source.includes(item));
if (missing.length) {
  throw new Error(`managed_admin_capture_entrypoint_missing:${JSON.stringify(missing)}`);
}

const forbidden = [
  "/opt/wandora/ops-workspace/production-rollback-freeze-v2.sh",
  '"$@"',
  "eval ",
  "sudo ",
  "docker ",
  "systemctl ",
  "target_agent_",
  "host_admin_apply",
  "--precheck-only",
  "ROLLBACK_FREEZE_V2_PRECHECK_OK",
];

const present = forbidden.filter((item) => source.includes(item));
if (present.length) {
  throw new Error(`managed_admin_capture_entrypoint_forbidden:${JSON.stringify(present)}`);
}

if ((source.match(/\bexec\b/g) ?? []).length !== 1) {
  throw new Error("managed_admin_capture_entrypoint_exec_count");
}

if ((source.match(/\/usr\/bin\/bash "\$HELPER"/g) ?? []).length !== 1) {
  throw new Error("managed_admin_capture_helper_bash_reference_count");
}

if (!helper.includes(Buffer.from("ROLLBACK_FREEZE_V2_OK", "utf8"))) {
  throw new Error("canonical_helper_capture_marker_missing");
}
if (!helper.includes(Buffer.from("# First write begins here", "utf8"))) {
  throw new Error("canonical_helper_first_write_boundary_missing");
}

const argsGuard = helper.indexOf(Buffer.from("case \"$#\" in", "utf8"));
const zeroArgCase = helper.indexOf(Buffer.from("0) ;;", "utf8"));
const firstWrite = helper.indexOf(Buffer.from("# First write begins here", "utf8"));
const captureMarker = helper.lastIndexOf(Buffer.from("ROLLBACK_FREEZE_V2_OK", "utf8"));
if (argsGuard < 0 || zeroArgCase < argsGuard || firstWrite < 0 || captureMarker < firstWrite) {
  throw new Error("canonical_helper_zero_arg_capture_contract_invalid");
}

console.log("WANDORA_ADR0314_MANAGED_ADMIN_CAPTURE_ENTRYPOINT_OK");
