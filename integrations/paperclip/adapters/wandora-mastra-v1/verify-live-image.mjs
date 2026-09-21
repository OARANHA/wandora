import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const paperclipRoot = resolve(process.env.PAPERCLIP_SOURCE_ROOT || '/app');
const adapterRoot = resolve(process.env.WANDORA_ADAPTER_SOURCE_DIR || '/app/tmp/wandora-mastra-adapter');
const loaderUrl = pathToFileURL(resolve(paperclipRoot, 'server/src/adapters/plugin-loader.ts')).href;
const { loadExternalAdapterPackage } = await import(loaderUrl);

await writeFile('/tmp/wandora-bridge.hmac', 'synthetic-bridge-secret-0123456789abcdef0123456789abcdef\n');
process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_URL =
  'http://wandora-core:8788/internal/v1/paperclip/execution';
process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE = '/tmp/wandora-bridge.hmac';
process.env.PORT = '3100';

const issueId = '22222222-2222-4222-8222-222222222222';
const requests = [];
globalThis.fetch = async (url, init = {}) => {
  requests.push({ url: String(url), init });
  if (String(url) === 'http://wandora-core:8788/internal/v1/paperclip/execution') {
    return new Response(JSON.stringify({
      executionId: 'exec-live-image-proof',
      model: 'wandora-supervised-v1',
      summary: 'accepted',
      usage: {
        inputTokens: 11,
        outputTokens: 7,
        cachedInputTokens: 2,
        totalTokens: 18,
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  assert.equal(String(url), `http://127.0.0.1:3100/api/issues/${issueId}`);
  assert.equal(init.method, 'PATCH');
  return new Response(JSON.stringify({ id: issueId, status: 'done' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

const adapter = await loadExternalAdapterPackage(
  '@wandora/paperclip-adapter-mastra',
  adapterRoot,
);
assert.equal(adapter.type, 'wandora_mastra');
assert.equal(adapter.supportsLocalAgentJwt, true);

const result = await adapter.execute({
  runId: '33333333-3333-4333-8333-333333333333',
  authToken: 'opaque-proof-run-token',
  agent: {
    id: '44444444-4444-4444-8444-444444444444',
    companyId: '55555555-5555-4555-8555-555555555555',
    name: 'Ana',
    adapterType: adapter.type,
    adapterConfig: {},
  },
  runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: null },
  config: {},
  context: {
    paperclipIssue: {
      id: issueId,
      identifier: 'PROOF-1',
      title: 'Qualificar contato',
      description: '<!-- wandora-work-v1:11111111-1111-4111-8111-111111111111 -->\nEntender a necessidade.',
      workMode: 'standard',
    },
    wakeReason: 'wandora_customer_work_v1',
    providerInternal: 'must-not-cross',
  },
  onLog: async () => {},
});

assert.equal(result.exitCode, 0);
assert.equal(result.resultJson?.executionId, 'exec-live-image-proof');
assert.deepEqual(result.usage, { inputTokens: 11, outputTokens: 7, cachedInputTokens: 2 });
assert.equal(result.usageBasis, 'per_run');
assert.equal(requests.length, 2);

const bridgeRequest = requests[0];
const reviewedBody = JSON.parse(String(bridgeRequest.init.body));
assert.equal(reviewedBody.task.workId, '11111111-1111-4111-8111-111111111111');
assert.equal(reviewedBody.task.description, 'Entender a necessidade.');
assert.equal(String(bridgeRequest.init.body).includes('wandora-work-v1:'), false);
assert.equal(String(bridgeRequest.init.body).includes('must-not-cross'), false);
assert.equal(String(bridgeRequest.init.body).includes('opaque-proof-run-token'), false);
assert.equal(bridgeRequest.init.headers['x-wandora-paperclip-run-token'], 'opaque-proof-run-token');
assert.match(bridgeRequest.init.headers['x-wandora-paperclip-signature'], /^sha256=[0-9a-f]{64}$/);

const completionRequest = requests[1];
assert.equal(completionRequest.init.headers.authorization, 'Bearer opaque-proof-run-token');
assert.equal(completionRequest.init.headers['x-paperclip-run-id'], '33333333-3333-4333-8333-333333333333');
assert.deepEqual(JSON.parse(String(completionRequest.init.body)), { status: 'done' });

console.log(JSON.stringify({
  loader: 'ok',
  type: adapter.type,
  supportsLocalAgentJwt: adapter.supportsLocalAgentJwt,
  contextMinimized: true,
  runTokenOnlyInHeaders: true,
  exactIssueCompletion: true,
  normalizedUsage: true,
  executionResult: result.resultJson?.executionId,
}));
