import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { loadExternalAdapterPackage } from '/app/server/src/adapters/plugin-loader.ts';

await writeFile('/tmp/wandora-bridge.hmac', 'synthetic-bridge-secret-0123456789abcdef0123456789abcdef\n');
process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_URL =
  'http://wandora-core:8788/internal/v1/paperclip/execution';
process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE = '/tmp/wandora-bridge.hmac';

let request;
globalThis.fetch = async (url, init) => {
  request = { url: String(url), init };
  return new Response(JSON.stringify({
    executionId: 'exec-live-image-proof',
    model: 'mastra-deterministic',
    summary: 'accepted',
  }), { status: 200, headers: { 'content-type': 'application/json' } });
};

const adapter = await loadExternalAdapterPackage(
  '@wandora/paperclip-adapter-mastra',
  '/app/tmp/wandora-mastra-adapter',
);
assert.equal(adapter.type, 'wandora_mastra');
assert.equal(adapter.supportsLocalAgentJwt, true);

const result = await adapter.execute({
  runId: 'run-proof-1',
  authToken: 'opaque-proof-run-token',
  agent: { id: 'agent-proof-1', companyId: 'company-proof-1', name: 'Ana', adapterType: adapter.type, adapterConfig: {} },
  runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: null },
  config: {},
  context: {
    paperclipIssue: {
      id: 'issue-proof-1',
      identifier: 'PROOF-1',
      title: 'Qualificar contato',
      description: 'Entender a necessidade.',
      workMode: 'standard',
    },
    wakeReason: 'issue_assigned',
    providerInternal: 'must-not-cross',
  },
  onLog: async () => {},
});

assert.equal(result.exitCode, 0);
assert.equal(result.resultJson?.executionId, 'exec-live-image-proof');
assert.equal(String(request.init.body).includes('must-not-cross'), false);
assert.equal(String(request.init.body).includes('opaque-proof-run-token'), false);
assert.equal(request.init.headers['x-wandora-paperclip-run-token'], 'opaque-proof-run-token');
assert.match(request.init.headers['x-wandora-paperclip-signature'], /^sha256=[0-9a-f]{64}$/);

console.log(JSON.stringify({
  loader: 'ok',
  type: adapter.type,
  supportsLocalAgentJwt: adapter.supportsLocalAgentJwt,
  contextMinimized: true,
  runTokenOnlyInHeader: true,
  executionResult: result.resultJson?.executionId,
}));
