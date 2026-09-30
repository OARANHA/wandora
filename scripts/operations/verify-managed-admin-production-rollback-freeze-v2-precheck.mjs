#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";

const helperPath = "scripts/operations/production-rollback-freeze-v2.sh";
const entrypointPath = "scripts/operations/managed-admin-production-rollback-freeze-v2-precheck.sh";
const expectedBlob = "13b5eb89e3a223372e50b8302f257bd70fc5e3f9";

const helper = fs.readFileSync(helperPath);
const gitBlob = crypto
  .createHash("sha1")
  .update(Buffer.from(`blob ${helper.length}\0`, "utf8"))
  .update(helper)
  .digest("hex");

if (gitBlob !== expectedBlob) {
  throw new Error(`canonical_helper_blob_mismatch:${gitBlob}`);
}

const helperText = helper.toString("utf8");
const currentCoreContract = [
  'CORE_IMAGE="wandora/core:organization-adapter-candidate-a49504c7c41e"',
  'CORE_IMAGE_ID="sha256:ec37d2f730e0069521745fc620085f5d2353dc583117808d955f9e6975604005"',
  'CORE_REVISION="a49504c7c41ee255fa25cc3944ef0f718cc9a696"',
  'RECEIPT="/opt/wandora/ops-workspace/production-rollback-freeze-v2-a49504c7c41ee255fa25cc3944ef0f718cc9a696.metadata"',
  'root="${BACKUP_PARENT}/paperclip-v9161-fast-read-rollback-freeze-v2-a49504c7c41e-${stamp}"',
];
currentCoreContract.push(
  'OA_VERSION="0.6.1"',
  'OA_PATH="/paperclip/operator-packages/wandora-organization-adapter-v1/80373a61f08d87772c3aab738ffa6905bddcb49c783e9574c1540247cb3b258f/package"',
  'VIGIA="/opt/wandora/ops-workspace/.credentials/vigia-core-production"',
  'fail "Vigia overlay missing"',
  'assert_regular_secret_meta "${VIGIA}" "wandora-exec"',
  'safe_secret_meta_line vigia "${VIGIA}"',
);
const missingCurrentCoreContract = currentCoreContract.filter((item) => !helperText.includes(item));
if (missingCurrentCoreContract.length) {
  throw new Error(`canonical_helper_current_core_contract_missing:${JSON.stringify(missingCurrentCoreContract)}`);
}

const historicalOrStaleCurrentAnchors = [
  'CORE_IMAGE="wandora/core:organization-adapter-candidate-14534e57256f"',
  'CORE_IMAGE_ID="sha256:ac253a9479338f0d47954937209323229314ef513125a71dd266558b3bfe1c8b"',
  'CORE_REVISION="14534e57256f0a73c49feb3944a1068921468f94"',
  'RECEIPT="/opt/wandora/ops-workspace/production-rollback-freeze-v2-14534e57256f0a73c49feb3944a1068921468f94.metadata"',
  'root="${BACKUP_PARENT}/paperclip-v9161-fast-read-rollback-freeze-v2-14534e57256f-${stamp}"',
  'CORE_IMAGE="wandora/core:organization-adapter-candidate-e4c7c36bb109"',
  'CORE_IMAGE_ID="sha256:ee5db7ffa1114b78670e713f374801730ab556d33a02183e19ef87742c121846"',
  'CORE_REVISION="e4c7c36bb1091ba38d39b85fa259bae94553fc52"',
  'RECEIPT="/opt/wandora/ops-workspace/production-rollback-freeze-v2-e4c7c36bb1091ba38d39b85fa259bae94553fc52.metadata"',
  'CORE_IMAGE="wandora/core:organization-adapter-candidate-2c2142237c9c"',
  'CORE_IMAGE_ID="sha256:d3ed5494c03c0720419387befc54f6f6cb124e5407fc619150ecf3dde03dfed7"',
  'CORE_REVISION="2c2142237c9cccc1f7a90d6ae056cd12cc5f4754"',
  'RECEIPT="/opt/wandora/ops-workspace/production-rollback-freeze-v2.metadata"',
  'CORE_IMAGE="wandora/core:organization-adapter-candidate-b2cffbb54089"',
  'CORE_IMAGE_ID="sha256:15a2eca7f74c4e6f7f6ea07bb461d6b711dffd0a70807a3f8e7773f6e6a27c49"',
  'CORE_REVISION="b2cffbb54089212844ef177827e7a616b1008144"',
  'OA_VERSION="0.5.0"',
  'OA_PATH="/paperclip/operator-packages/wandora-organization-adapter-v1/f4e733613e72e771eb18361dbdbf420c810c5b8bbe31361a64040a2081cc2ae2/package"',
  'RECEIPT="/opt/wandora/ops-workspace/production-rollback-freeze-v2-b2cffbb54089212844ef177827e7a616b1008144.metadata"',
];
const presentHistoricalOrStaleCurrentAnchors = historicalOrStaleCurrentAnchors.filter((item) => helperText.includes(item));
if (presentHistoricalOrStaleCurrentAnchors.length) {
  throw new Error(`canonical_helper_historical_or_stale_anchor_present:${JSON.stringify(presentHistoricalOrStaleCurrentAnchors)}`);
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
