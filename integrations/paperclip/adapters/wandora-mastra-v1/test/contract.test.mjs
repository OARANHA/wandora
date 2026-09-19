import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createServerAdapter } from '../index.mjs';

test('wandora_mastra adapter keeps the bridge narrow and file-backed', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wandora-mastra-adapter-'));
  const secretFile = join(dir, 'bridge.hmac');
  const originalFetch = globalThis.fetch;
  const oldUrl = process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_URL;
  const oldSecret = process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE;
  try {
    await writeFile(secretFile, 'synthetic-bridge-secret-0123456789abcdef0123456789abcdef\n');
    process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_URL =
      'http://wandora-core:8788/internal/v1/paperclip/execution';
    process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE = secretFile;

    let received;
    globalThis.fetch = async (url, init) => {
      received = { url: String(url), init };
      return new Response(JSON.stringify({
        executionId: 'exec_test_1',
        model: 'mastra-deterministic',
        summary: 'accepted',
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    };

    const adapter = createServerAdapter();
    assert.equal(adapter.type, 'wandora_mastra');
    assert.equal(adapter.supportsLocalAgentJwt, true);
    const result = await adapter.execute({
      runId: 'run-1',
      authToken: 'opaque-run-token-never-in-body',
      agent: { id: 'agent-1', companyId: 'company-1', name: 'Ana', adapterType: 'wandora_mastra', adapterConfig: {} },
      runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: null },
      config: {},
      context: {
        paperclipIssue: {
          id: 'issue-1',
          identifier: 'MED-1',
          title: 'Qualificar contato',
          description: 'Entender a necessidade.',
          workMode: 'standard',
        },
        wakeReason: 'issue_assigned',
        managedMcp: { token: 'must-not-cross' },
        providerInternal: 'must-not-cross',
      },
      onLog: async () => {},
    });

    assert.equal(result.exitCode, 0);
    assert.equal(result.resultJson.executionId, 'exec_test_1');
    assert.equal(received.url, 'http://wandora-core:8788/internal/v1/paperclip/execution');
    const body = String(received.init.body);
    assert.equal(body.includes('opaque-run-token-never-in-body'), false);
    assert.equal(body.includes('must-not-cross'), false);
    assert.equal(received.init.headers['x-wandora-paperclip-run-token'], 'opaque-run-token-never-in-body');
    assert.match(received.init.headers['x-wandora-paperclip-signature'], /^sha256=[0-9a-f]{64}$/);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldUrl === undefined) delete process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_URL;
    else process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_URL = oldUrl;
    if (oldSecret === undefined) delete process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE;
    else process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE = oldSecret;
    await rm(dir, { recursive: true, force: true });
  }
});
