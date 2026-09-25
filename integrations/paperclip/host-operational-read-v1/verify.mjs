import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const upstreamRoot = resolve(process.argv[2] ?? ".paperclip");
const here = dirname(fileURLToPath(import.meta.url));
const wandoraRoot = resolve(here, "../../..");
const patchPath = resolve(
  here,
  "../patches/v2026.916.1-host-operational-read-v1.patch",
);

const expectedUpstream = "d554c4789ed3930f8a53ac9fdf6503b3187097da";
const expectedPatchSha = "fc0ce000b2fa5051f10fb71cfece71df17e9b4953779486d951b3f2990cd8bfb";

const patchSha = createHash("sha256").update(readFileSync(patchPath)).digest("hex");
assert.equal(patchSha, expectedPatchSha, "retained patch digest drift");

const head = execFileSync("git", ["-C", upstreamRoot, "rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
assert.equal(head, expectedUpstream, "unexpected Paperclip upstream commit");

const changed = execFileSync(
  "git",
  ["-C", upstreamRoot, "diff", "--name-only"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean)
  .sort();

const expectedChanged = [
  "packages/plugins/sdk/src/host-client-factory.ts",
  "packages/plugins/sdk/src/protocol.ts",
  "packages/plugins/sdk/src/testing.ts",
  "packages/plugins/sdk/src/types.ts",
  "packages/plugins/sdk/src/worker-rpc-host.ts",
  "packages/plugins/sdk/tests/host-client-factory.test.ts",
  "packages/shared/src/constants.ts",
  "server/src/__tests__/plugin-tool-access-operational-read.test.ts",
  "server/src/services/plugin-host-services.ts",
  "server/src/services/tool-access.ts",
].sort();

assert.deepEqual(changed, expectedChanged, "patch touched an unqualified Paperclip surface");

const read = (path) => readFileSync(resolve(upstreamRoot, path), "utf8");

const constants = read("packages/shared/src/constants.ts");
assert.match(constants, /"tools\.operational\.read"/);

const factory = read("packages/plugins/sdk/src/host-client-factory.ts");
assert.match(
  factory,
  /"toolAccess\.readOperationalSnapshot": "tools\.operational\.read"/,
);
assert.match(factory, /requireInvocationCompanyScope\(method, params, context\)/);

const types = read("packages/plugins/sdk/src/types.ts");
assert.match(types, /interface PluginToolAccessOperationalSnapshot/);
assert.match(types, /interface PluginToolAccessClient/);
const snapshotStart = types.indexOf("export interface PluginToolAccessOperationalTool");
const snapshotEnd = types.indexOf(
  "export interface PluginAuthorizationClient",
  snapshotStart,
);
assert.ok(
  snapshotStart >= 0 && snapshotEnd > snapshotStart,
  "operational snapshot types not found",
);
const snapshotSection = types.slice(snapshotStart, snapshotEnd);

for (const forbiddenProperty of [
  "connectionId",
  "catalogEntryId",
  "grantId",
  "profileId",
  "secretId",
  "credentialSecretRefs",
]) {
  const propertyPattern = new RegExp(
    "^\\s*" + forbiddenProperty + "\\??\\s*:",
    "m",
  );
  assert.doesNotMatch(
    snapshotSection,
    propertyPattern,
    "forbidden field " + forbiddenProperty + " leaked into plugin snapshot",
  );
}

const hostServices = read("server/src/services/plugin-host-services.ts");
const hostStart = hostServices.indexOf(
  "toolAccess: {\n      async readOperationalSnapshot",
);
const hostEnd = hostServices.indexOf("\n\n    state: {", hostStart);
assert.ok(hostStart >= 0 && hostEnd > hostStart, "operational snapshot host service not found");
const hostSlice = hostServices.slice(hostStart, hostEnd);
assert.match(hostSlice, /toolAccess\.listCatalogCached\(/);
assert.doesNotMatch(hostSlice, /toolAccess\.listCatalog\(/);
assert.doesNotMatch(
  hostSlice,
  /credentialSecretRefs|secretId|grantId|profileId|catalogEntryId/,
);

const toolAccess = read("server/src/services/tool-access.ts");
const cacheStart = toolAccess.indexOf("listCatalogCached: async");
const liveStart = toolAccess.indexOf("listCatalog: async", cacheStart);
assert.ok(cacheStart >= 0 && liveStart > cacheStart, "cache-only catalog reader not found");
const cacheSlice = toolAccess.slice(cacheStart, liveStart);
assert.doesNotMatch(cacheSlice, /refreshCatalog|singleFlight|remoteHttp|fetch\(/);
assert.match(cacheSlice, /toolCatalogEntries/);

const focusedTest = read(
  "server/src/__tests__/plugin-tool-access-operational-read.test.ts",
);
assert.match(focusedTest, /Agent not found/);
assert.match(focusedTest, /companyB/);
assert.match(focusedTest, /credential\|secretRef/);

execFileSync("git", ["-C", upstreamRoot, "diff", "--check"], {
  stdio: "inherit",
});

console.log("PAPERCLIP_HOST_OPERATIONAL_READ_V1_STATIC_OK");
console.log("upstream=" + expectedUpstream);
console.log("patch_sha256=" + expectedPatchSha);
console.log("changed_files=" + expectedChanged.length);
