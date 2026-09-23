import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = process.argv[2];
if (!source) {
  throw new Error('usage: node verify-paperclip-v916.mjs <paperclip-source>');
}

const expected = 'dffc2b3ca1b9e88fa21cb17493083e682dffd1ca';
const head = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();
if (head !== expected) {
  throw new Error(`paperclip_pin_mismatch: expected ${expected}, got ${head}`);
}

const gateway = readFileSync(
  path.join(source, 'server/src/services/tool-gateway.ts'),
  'utf8',
);
const routes = readFileSync(
  path.join(source, 'server/src/routes/tool-gateway.ts'),
  'utf8',
);

const invariants = [
  ['local_stdio is a connected gateway transport',
    'inArray(toolConnections.transport, ["mcp_remote", "local_stdio"])'],
  ['approved stdio template resolution exists',
    'resolveLocalStdioRuntimeTemplate'],
  ['grant secret env projection exists',
    'ref.configPath === `env.${key}`'],
  ['grant is re-resolved for local stdio execution',
    'const grant = await resolveConnectionGrant(input.session, input.connection);'],
  ['local stdio process is spawned from approved template',
    'spawn(input.template.command, input.template.args'],
  ['local stdio execution uses MCP tools/call',
    'input.protocolMethod ?? "tools/call"'],
];

for (const [label, needle] of invariants) {
  if (!gateway.includes(needle)) {
    throw new Error(`paperclip_contract_missing: ${label}`);
  }
}

for (const [label, needle] of [
  ['run-scoped gateway session route', 'router.post("/tool-gateway/sessions"'],
  ['gateway tool-list route', 'router.get("/tool-gateway/tools"'],
  ['gateway tool-call route', 'router.post("/tool-gateway/tools/call"'],
]) {
  if (!routes.includes(needle)) {
    throw new Error(`paperclip_route_missing: ${label}`);
  }
}

console.log('WANDORA_PAPERCLIP_V916_LOCAL_STDIO_CONTRACT_OK');