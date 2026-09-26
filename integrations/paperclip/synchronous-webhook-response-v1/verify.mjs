import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? ".paperclip");
const read = (file) => readFileSync(path.join(root, file), "utf8");

const changed = execFileSync("git", ["-C", root, "status", "--porcelain"], {
  encoding: "utf8",
}).split("\n").filter((line) => line.trim().length > 0).map((line) => line.slice(3));

const expected = [
  "packages/plugins/sdk/src/define-plugin.ts",
  "packages/plugins/sdk/src/index.ts",
  "packages/plugins/sdk/src/protocol.ts",
  "packages/plugins/sdk/src/worker-rpc-host.ts",
  "packages/plugins/sdk/tests/worker-rpc-host-webhook.test.ts",
  "server/src/__tests__/plugin-webhook-response-routes.test.ts",
  "server/src/routes/plugins.ts",
].sort();

const actual = [...changed].sort();
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(`unexpected patched files: ${actual.join(", ")}`);
}

const definition = read("packages/plugins/sdk/src/define-plugin.ts");
const protocol = read("packages/plugins/sdk/src/protocol.ts");
const worker = read("packages/plugins/sdk/src/worker-rpc-host.ts");
const routes = read("server/src/routes/plugins.ts");

const required = [
  [definition, "PLUGIN_WEBHOOK_RESPONSE_MAX_BYTES = 16 * 1024"],
  [definition, "Promise<PluginWebhookResponse | void>"],
  [protocol, "result: PluginWebhookResponse | null"],
  [worker, "Plugin webhook response must be a JSON object"],
  [worker, "Plugin webhook response is too large"],
  [routes, "PLUGIN_WEBHOOK_RESPONSE_MAX_BYTES"],
  [routes, "res.status(200).json(webhookResponse)"],
  [routes, 'throw unprocessable("Webhook-scoped plugin API routes require a signature verifier and are not enabled")'],
];

for (const [source, marker] of required) {
  if (!source.includes(marker)) throw new Error(`missing marker: ${marker}`);
}

if (/apiRoutes[\s\S]{0,300}auth:\s*["']webhook["'][\s\S]{0,300}(enabled|verifier)/i.test(routes)) {
  throw new Error("scoped apiRoutes webhook auth must remain disabled");
}

console.log("Paperclip synchronous webhook response v1 static verification passed");
