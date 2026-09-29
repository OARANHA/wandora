#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";

const helperPath = "scripts/operations/production-rollback-freeze-v2.sh";
const entrypointPath = "scripts/operations/managed-admin-production-rollback-freeze-v2-precheck.sh";
const expectedBlob = "a48812427b050383def5ba410f333e4b72987744";

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
  'SELF="/usr/local/sbin/wandora-rollback-freeze-v2-precheck"',
  'HELPER="/usr/local/libexec/wandora/production-rollback-freeze-v2.sh"',
  `EXPECTED_HELPER_GIT_BLOB="${expectedBlob}"`,
  '/usr/bin/readlink -f -- "$0"',
  "root:root:755:regular file",
  "root:root:750:regular file",
  '/usr/bin/git hash-object --no-filters "$HELPER"',
  '/usr/bin/bash -n "$HELPER"',
  'exec /usr/bin/bash "$HELPER" --precheck-only',
];

const missing = required.filter((item) => !source.includes(item));
if (missing.length) {
  throw new Error(`managed_admin_precheck_entrypoint_missing:${JSON.stringify(missing)}`);
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
];

const present = forbidden.filter((item) => source.includes(item));
if (present.length) {
  throw new Error(`managed_admin_precheck_entrypoint_forbidden:${JSON.stringify(present)}`);
}

if ((source.match(/\bexec\b/g) ?? []).length !== 1) {
  throw new Error("managed_admin_precheck_entrypoint_exec_count");
}

if ((source.match(/--precheck-only/g) ?? []).length !== 2) {
  throw new Error("managed_admin_precheck_only_marker_count");
}

if (!helper.includes(Buffer.from("if [[ \"${precheck_only}\" != \"true\" && ( -e \"${RECEIPT}\" || -L \"${RECEIPT}\" ) ]]; then", "utf8"))) {
  throw new Error("canonical_helper_receipt_guard_not_capture_only");
}

if (!helper.includes(Buffer.from("ROLLBACK_FREEZE_V2_PRECHECK_OK", "utf8"))) {
  throw new Error("canonical_helper_precheck_marker_missing");
}

const firstWrite = helper.indexOf(Buffer.from("# First write begins here", "utf8"));
const precheckMarker = helper.indexOf(Buffer.from("ROLLBACK_FREEZE_V2_PRECHECK_OK", "utf8"));
if (firstWrite < 0 || precheckMarker < 0 || precheckMarker > firstWrite) {
  throw new Error("canonical_helper_precheck_not_before_first_write");
}

console.log("WANDORA_ADR0310_MANAGED_ADMIN_PRECHECK_ENTRYPOINT_OK");
