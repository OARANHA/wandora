import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const upstreamRoot = resolve(process.argv[2] ?? ".paperclip");
const here = dirname(fileURLToPath(import.meta.url));
const patchPath = resolve(
  here,
  "../patches/v2026.916.1-fast-read-run-result-read-v1.patch",
);

const expectedUpstream = "d554c4789ed3930f8a53ac9fdf6503b3187097da";
const expectedPatchSha = "b8d0473ab7ae51ddc417ad0ed8ef182ddf6a95a5ef6f56e1e4295731afca1c31";

const patchSha = createHash("sha256").update(readFileSync(patchPath)).digest("hex");
assert.equal(patchSha, expectedPatchSha, "retained patch digest drift");

const head = execFileSync("git", ["-C", upstreamRoot, "rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
assert.equal(head, expectedUpstream, "unexpected Paperclip upstream commit");

const modified = execFileSync(
  "git",
  ["-C", upstreamRoot, "diff", "--name-only"],
  { encoding: "utf8" },
).trim().split("\n").filter(Boolean);
const untracked = execFileSync(
  "git",
  ["-C", upstreamRoot, "ls-files", "--others", "--exclude-standard"],
  { encoding: "utf8" },
).trim().split("\n").filter(Boolean);
const changed = [...new Set([...modified, ...untracked])].sort();

const expectedChanged = [
  "packages/plugins/sdk/src/host-client-factory.ts",
  "packages/plugins/sdk/src/protocol.ts",
  "packages/plugins/sdk/src/testing.ts",
  "packages/plugins/sdk/src/types.ts",
  "packages/plugins/sdk/src/worker-rpc-host.ts",
  "packages/plugins/sdk/tests/host-client-factory.test.ts",
  "packages/shared/src/constants.ts",
  "server/src/__tests__/plugin-agent-run-read.test.ts",
  "server/src/services/plugin-host-services.ts",
].sort();

assert.deepEqual(changed, expectedChanged, "patch touched an unqualified Paperclip surface");

const read = (path) => readFileSync(resolve(upstreamRoot, path), "utf8");

const constants = read("packages/shared/src/constants.ts");
assert.match(constants, /"agent\.runs\.read"/);

const factory = read("packages/plugins/sdk/src/host-client-factory.ts");
assert.match(factory, /"agentRuns\.get": "agent\.runs\.read"/);
assert.match(factory, /requireInvocationCompanyScope\(method, params, context\)/);

const types = read("packages/plugins/sdk/src/types.ts");
const typeStart = types.indexOf("export interface PluginAgentRunReadResult");
const typeEnd = types.indexOf("/**\n * `ctx.approvals`", typeStart);
assert.ok(typeStart >= 0 && typeEnd > typeStart, "bounded agent-run result types not found");
const typeSlice = types.slice(typeStart, typeEnd);
for (const forbiddenProperty of [
  "logRef",
  "logStore",
  "stdout",
  "stderr",
  "error",
  "errorCode",
  "contextSnapshot",
  "processPid",
  "processGroupId",
  "sessionIdBefore",
  "sessionIdAfter",
  "externalRunId",
  "providerMetadata",
  "costUsd",
  "credential",
  "secret",
]) {
  const propertyPattern = new RegExp("^\\s*" + forbiddenProperty + "\\??\\s*:", "mi");
  assert.doesNotMatch(
    typeSlice,
    propertyPattern,
    "forbidden field " + forbiddenProperty + " leaked into run-read contract",
  );
}

const hostServices = read("server/src/services/plugin-host-services.ts");
const hostStart = hostServices.indexOf("agentRuns: {\n      async get");
const hostEnd = hostServices.indexOf("\n\n    state: {", hostStart);
assert.ok(hostStart >= 0 && hostEnd > hostStart, "agent-run host service not found");
const hostSlice = hostServices.slice(hostStart, hostEnd);
assert.match(hostSlice, /heartbeat\.getRun\(params\.runId\)/);
assert.match(hostSlice, /run\.companyId !== companyId/);
assert.match(hostSlice, /run\.agentId !== agent\.id/);
assert.doesNotMatch(hostSlice, /heartbeatRuns|db\.select|db\.insert|db\.update|db\.delete/);
assert.doesNotMatch(
  hostSlice,
  /logRef|logStore|stdout|stderr|errorCode|contextSnapshot|processPid|processGroupId|sessionIdBefore|sessionIdAfter|externalRunId|costUsd/,
);

const focusedTest = read("server/src/__tests__/plugin-agent-run-read.test.ts");
assert.match(focusedTest, /companyB/);
assert.match(focusedTest, /agentB/);
assert.match(focusedTest, /resolves\.toBeNull/);
assert.match(focusedTest, /status: "running"/);
assert.match(focusedTest, /must-not-cross/);

execFileSync("git", ["-C", upstreamRoot, "diff", "--check"], {
  stdio: "inherit",
});

console.log("PAPERCLIP_FAST_READ_RUN_RESULT_READ_V1_STATIC_OK");
console.log("upstream=" + expectedUpstream);
console.log("patch_sha256=" + expectedPatchSha);
console.log("changed_files=" + expectedChanged.length);
