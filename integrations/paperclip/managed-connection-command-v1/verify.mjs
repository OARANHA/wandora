import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const upstreamRoot = resolve(process.argv[2] ?? ".paperclip");
const here = dirname(fileURLToPath(import.meta.url));

const hostReadPatch = resolve(
  here,
  "../patches/v2026.916.1-host-operational-read-v1.patch",
);
const commandPatch = resolve(
  here,
  "../patches/v2026.916.1-managed-connection-command-v1.patch",
);

const expectedUpstream = "d554c4789ed3930f8a53ac9fdf6503b3187097da";
const expectedHostReadSha =
  "fc0ce000b2fa5051f10fb71cfece71df17e9b4953779486d951b3f2990cd8bfb";
const expectedCommandSha =
  "9b28a5990d48b93a265048f4972c92d3320b1c61669ced8a10c2878ce5a5f8b7";

const sha256 = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

assert.equal(sha256(hostReadPatch), expectedHostReadSha, "host-read patch digest drift");
assert.equal(sha256(commandPatch), expectedCommandSha, "managed-command patch digest drift");

const head = execFileSync("git", ["-C", upstreamRoot, "rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
assert.equal(head, expectedUpstream, "unexpected Paperclip upstream commit");

const modified = execFileSync(
  "git",
  ["-C", upstreamRoot, "diff", "--name-only"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);
const untracked = execFileSync(
  "git",
  ["-C", upstreamRoot, "ls-files", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);
const changed = [...new Set([...modified, ...untracked])].sort();

const expectedChanged = [
  "packages/plugins/sdk/src/host-client-factory.ts",
  "packages/plugins/sdk/src/protocol.ts",
  "packages/plugins/sdk/src/testing.ts",
  "packages/plugins/sdk/src/types.ts",
  "packages/plugins/sdk/src/worker-rpc-host.ts",
  "packages/plugins/sdk/tests/host-client-factory.test.ts",
  "packages/shared/src/constants.ts",
  "server/src/__tests__/plugin-tool-access-managed-connection.test.ts",
  "server/src/__tests__/plugin-tool-access-operational-read.test.ts",
  "server/src/services/plugin-host-services.ts",
  "server/src/services/tool-access.ts",
].sort();
assert.deepEqual(changed, expectedChanged, "patch chain touched an unqualified Paperclip surface");

const read = (path) => readFileSync(resolve(upstreamRoot, path), "utf8");

const constants = read("packages/shared/src/constants.ts");
assert.match(constants, /"tools\.operational\.read"/);
assert.match(constants, /"tools\.connections\.managed"/);

const factory = read("packages/plugins/sdk/src/host-client-factory.ts");
assert.match(
  factory,
  /"toolAccess\.manageDeclaredConnection": "tools\.connections\.managed"/,
);
assert.match(factory, /requireInvocationCompanyScope\(method, params, context\)/);

const types = read("packages/plugins/sdk/src/types.ts");
const commandStart = types.indexOf("export type PluginManagedConnectionOperation");
const commandEnd = types.indexOf("/**\n * ctx.toolAccess", commandStart);
assert.ok(commandStart >= 0 && commandEnd > commandStart, "managed command types not found");
const commandTypes = types.slice(commandStart, commandEnd);
for (const operation of [
  '"inspect"',
  '"replace_credentials"',
  '"health"',
  '"disconnect"',
]) {
  assert.ok(commandTypes.includes(operation), "missing operation " + operation);
}
assert.doesNotMatch(commandTypes, /"configure"|"create"|"adopt"/);

const resultStart = commandTypes.indexOf(
  "export interface PluginManagedConnectionCommandResult",
);
assert.ok(resultStart >= 0, "managed command result type missing");
const resultSlice = commandTypes.slice(resultStart);
for (const forbidden of [
  "connectionId",
  "applicationId",
  "grantId",
  "profileId",
  "catalogEntryId",
  "secretId",
  "credentialSecretRefs",
  "credentialValues",
]) {
  assert.doesNotMatch(
    resultSlice,
    new RegExp("^\\s*" + forbidden + "\\??\\s*:", "m"),
    "forbidden result field " + forbidden,
  );
}

const host = read("server/src/services/plugin-host-services.ts");
assert.match(host, /wandora\.organization-adapter-v1/);
assert.match(host, /wandora\.28pro\.vendaerp-readonly-v1/);
assert.match(host, /wandora\.vendaerp-readonly-v1-r1/);
for (const envKey of [
  "VENDAERP_AUTHORIZATION_TOKEN",
  "VENDAERP_USER",
  "VENDAERP_APP",
]) {
  assert.ok(host.includes(envKey), "missing fixed env key " + envKey);
}
for (const toolName of [
  "vendaerp_probe",
  "vendaerp_list_companies",
  "vendaerp_search_products",
  "vendaerp_get_product_stock",
  "vendaerp_list_price_tables",
  "vendaerp_search_price_table_products",
  "vendaerp_search_parties",
  "vendaerp_search_orders",
]) {
  assert.ok(host.includes(toolName), "missing fixed read tool " + toolName);
}

const manageStart = host.indexOf("async manageDeclaredConnection(params)");
const stateStart = host.indexOf("\n    state: {", manageStart);
assert.ok(manageStart >= 0 && stateStart > manageStart, "managed command host service missing");
const manageSlice = host.slice(manageStart, stateStart);
assert.match(manageSlice, /pluginKey !== WANDORA_ORGANIZATION_ADAPTER_PLUGIN_KEY/);
assert.match(manageSlice, /db\.transaction\(async \(tx\)/);
assert.match(manageSlice, /secretService\(tx\)/);
assert.match(manageSlice, /expectedLatestVersion/);
assert.match(manageSlice, /\.for\("update"\)/);
assert.match(manageSlice, /companyConnectionRefs/);
assert.match(manageSlice, /companyGrantRefs/);
assert.match(manageSlice, /companySecretBindings/);
assert.match(manageSlice, /tool_connection\.credentials_replaced/);
assert.match(manageSlice, /toolAccess\.checkHealth\(/);
assert.match(manageSlice, /toolAccess\.archiveConnection\(/);
assert.doesNotMatch(manageSlice, /connectGalleryApp|reconnectGalleryApp|finishGalleryAppConnection/);

const managedTest = read(
  "server/src/__tests__/plugin-tool-access-managed-connection.test.ts",
);
assert.match(managedTest, /latestVersion === 2/);
assert.match(managedTest, /preexisting-conflict/);
assert.match(managedTest, /latestVersion === 1/);
assert.match(managedTest, /operation: "health"/);
assert.match(managedTest, /operation: "disconnect"/);
assert.match(managedTest, /not\.toContain\(values\.authorizationToken\)/);
assert.match(managedTest, /tool_connection\.credentials_replaced/);

const sdkTest = read("packages/plugins/sdk/tests/host-client-factory.test.ts");
assert.match(sdkTest, /tools\.connections\.managed/);
assert.match(sdkTest, /InvocationScopeDeniedError/);

execFileSync("git", ["-C", upstreamRoot, "diff", "--check"], {
  stdio: "inherit",
});

console.log("PAPERCLIP_MANAGED_CONNECTION_COMMAND_V1_STATIC_OK");
console.log("upstream=" + expectedUpstream);
console.log("host_read_patch_sha256=" + expectedHostReadSha);
console.log("managed_command_patch_sha256=" + expectedCommandSha);
console.log("changed_files=" + expectedChanged.length);
