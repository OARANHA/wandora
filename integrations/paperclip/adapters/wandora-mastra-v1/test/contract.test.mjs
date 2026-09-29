import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createServerAdapter } from '../index.mjs';

const BRIDGE_URL = 'http://wandora-core:8788/internal/v1/paperclip/execution';
const WORK_ID = '11111111-1111-4111-8111-111111111111';
const ISSUE_ID = '22222222-2222-4222-8222-222222222222';

async function withAdapterEnvironment(run) {
  const dir = await mkdtemp(join(tmpdir(), 'wandora-mastra-adapter-'));
  const secretFile = join(dir, 'bridge.hmac');
  const originalFetch = globalThis.fetch;
  const old = {
    url: process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_URL,
    secret: process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE,
    timeout: process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_TIMEOUT_MS,
    listenHost: process.env.PAPERCLIP_LISTEN_HOST,
    listenPort: process.env.PAPERCLIP_LISTEN_PORT,
  };
  try {
    await writeFile(secretFile, 'synthetic-bridge-secret-0123456789abcdef0123456789abcdef\n');
    process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_URL = BRIDGE_URL;
    process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE = secretFile;
    process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_TIMEOUT_MS = '60000';
    process.env.PAPERCLIP_LISTEN_HOST = '0.0.0.0';
    process.env.PAPERCLIP_LISTEN_PORT = '3100';
    await run();
  } finally {
    globalThis.fetch = originalFetch;
    if (old.url === undefined) delete process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_URL;
    else process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_URL = old.url;
    if (old.secret === undefined) delete process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE;
    else process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE = old.secret;
    if (old.timeout === undefined) delete process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_TIMEOUT_MS;
    else process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_TIMEOUT_MS = old.timeout;
    if (old.listenHost === undefined) delete process.env.PAPERCLIP_LISTEN_HOST;
    else process.env.PAPERCLIP_LISTEN_HOST = old.listenHost;
    if (old.listenPort === undefined) delete process.env.PAPERCLIP_LISTEN_PORT;
    else process.env.PAPERCLIP_LISTEN_PORT = old.listenPort;
    await rm(dir, { recursive: true, force: true });
  }
}

function executionContext(description = `<!-- wandora-work-v1:${WORK_ID} -->\nEntender a necessidade.`) {
  return {
    runId: '33333333-3333-4333-8333-333333333333',
    authToken: 'opaque-run-token-never-in-body',
    agent: {
      id: '44444444-4444-4444-8444-444444444444',
      companyId: '55555555-5555-4555-8555-555555555555',
      name: 'Ana',
      adapterType: 'wandora_mastra',
      adapterConfig: {},
    },
    runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: null },
    config: {},
    context: {
      paperclipIssue: {
        id: ISSUE_ID,
        identifier: 'MED-1',
        title: 'Qualificar contato',
        description,
        workMode: 'standard',
      },
      wakeReason: 'wandora_customer_work_v1',
      managedMcp: { token: 'must-not-cross' },
      providerInternal: 'must-not-cross',
    },
    onLog: async () => {},
  };
}

test('wandora_mastra reports normalized usage and finalizes exact customer-work issue after bridge success', async () => {
  await withAdapterEnvironment(async () => {
    const environment = await createServerAdapter().testEnvironment();
    assert.equal(environment.status, 'pass');

    process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_TIMEOUT_MS = '999';
    const invalidEnvironment = await createServerAdapter().testEnvironment();
    assert.equal(invalidEnvironment.status, 'fail');
    assert.match(invalidEnvironment.checks[0].message, /wandora_bridge_timeout_invalid/);
    process.env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_TIMEOUT_MS = '60000';

    const requests = [];
    globalThis.fetch = async (url, init = {}) => {
      requests.push({ url: String(url), init });
      if (String(url) === BRIDGE_URL) {
        return new Response(JSON.stringify({
          executionId: 'exec_test_1',
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
      assert.equal(String(url), `http://localhost:3100/api/issues/${ISSUE_ID}`);
      assert.equal(init.method, 'PATCH');
      return new Response(JSON.stringify({ id: ISSUE_ID, status: 'done' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const adapter = createServerAdapter();
    assert.equal(adapter.type, 'wandora_mastra');
    assert.equal(adapter.supportsLocalAgentJwt, true);
    const result = await adapter.execute(executionContext());

    assert.equal(result.exitCode, 0);
    assert.deepEqual(result.resultJson, {
      executionId: 'exec_test_1',
      model: 'wandora-supervised-v1',
      summary: 'accepted',
    });
    assert.deepEqual(result.usage, { inputTokens: 11, outputTokens: 7, cachedInputTokens: 2 });
    assert.equal(result.usageBasis, 'per_run');
    assert.equal(requests.length, 2);

    const bridge = requests[0];
    const body = String(bridge.init.body);
    const parsedBody = JSON.parse(body);
    assert.equal(parsedBody.task.workId, WORK_ID);
    assert.equal(parsedBody.task.description, 'Entender a necessidade.');
    assert.equal(body.includes('wandora-work-v1:'), false);
    assert.equal(body.includes('opaque-run-token-never-in-body'), false);
    assert.equal(body.includes('must-not-cross'), false);
    assert.equal(bridge.init.headers['x-wandora-paperclip-run-token'], 'opaque-run-token-never-in-body');
    assert.match(bridge.init.headers['x-wandora-paperclip-signature'], /^sha256=[0-9a-f]{64}$/);

    const completion = requests[1];
    assert.equal(completion.init.headers.authorization, 'Bearer opaque-run-token-never-in-body');
    assert.equal(completion.init.headers['x-paperclip-run-id'], executionContext().runId);
    assert.deepEqual(JSON.parse(String(completion.init.body)), { status: 'done' });
  });
});

test('ambiguous issue completion is read back before any repeat update', async () => {
  await withAdapterEnvironment(async () => {
    const requests = [];
    globalThis.fetch = async (url, init = {}) => {
      requests.push({ url: String(url), init });
      if (String(url) === BRIDGE_URL) {
        return new Response(JSON.stringify({
          executionId: 'exec_test_2',
          model: 'wandora-supervised-v1',
          summary: 'accepted',
          usage: { inputTokens: 3, outputTokens: 2, cachedInputTokens: 0, totalTokens: 5 },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (init.method === 'PATCH') {
        throw new TypeError('synthetic local completion timeout');
      }
      assert.equal(init.method, 'GET');
      return new Response(JSON.stringify({ id: ISSUE_ID, status: 'done' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const result = await createServerAdapter().execute(executionContext());
    assert.equal(result.exitCode, 0);
    assert.deepEqual(requests.map((request) => request.init.method), ['POST', 'PATCH', 'GET']);
  });
});

test('non-customer work preserves legacy lifecycle and does not patch Paperclip issue status', async () => {
  await withAdapterEnvironment(async () => {
    const requests = [];
    globalThis.fetch = async (url, init = {}) => {
      requests.push({ url: String(url), init });
      assert.equal(String(url), BRIDGE_URL);
      return new Response(JSON.stringify({
        executionId: 'exec_test_3',
        model: 'wandora-supervised-v1',
        summary: 'accepted',
        usage: { inputTokens: null, outputTokens: null, cachedInputTokens: null, totalTokens: null },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    };

    const result = await createServerAdapter().execute(executionContext('Sem marcador de customer work.'));
    assert.equal(result.exitCode, 0);
    assert.equal(result.usage, undefined);
    assert.equal(requests.length, 1);
  });
});


test('customer-work read-tool failure blocks the exact Paperclip issue and still fails the adapter', async () => {
  await withAdapterEnvironment(async () => {
    const requests = [];
    globalThis.fetch = async (url, init = {}) => {
      requests.push({ url: String(url), init });
      if (String(url) === BRIDGE_URL) {
        return new Response(JSON.stringify({ error: 'read-tool-failed' }), {
          status: 422,
          headers: { 'content-type': 'application/json' },
        });
      }
      assert.equal(String(url), `http://localhost:3100/api/issues/${ISSUE_ID}`);
      assert.equal(init.method, 'PATCH');
      assert.equal(init.headers.authorization, 'Bearer opaque-run-token-never-in-body');
      assert.equal(init.headers['x-paperclip-run-id'], executionContext().runId);
      assert.deepEqual(JSON.parse(String(init.body)), {
        status: 'blocked',
        unblockDescriptor: {
          owner: { agentId: executionContext().agent.id },
          action: 'Resolve the read-tool failure, then create a fresh explicitly authorized Wandora customer work if another read is required.',
        },
      });
      return new Response(JSON.stringify({ id: ISSUE_ID, status: 'blocked' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    await assert.rejects(
      createServerAdapter().execute(executionContext()),
      /wandora_execution_failed_422/,
    );
    assert.deepEqual(requests.map((request) => request.init.method), ['POST', 'PATCH']);
  });
});

test('ambiguous read-tool failure blocking reads the issue before any repeat mutation', async () => {
  await withAdapterEnvironment(async () => {
    const requests = [];
    globalThis.fetch = async (url, init = {}) => {
      requests.push({ url: String(url), init });
      if (String(url) === BRIDGE_URL) {
        return new Response(JSON.stringify({ error: 'read-tool-failed' }), {
          status: 422,
          headers: { 'content-type': 'application/json' },
        });
      }
      assert.equal(String(url), `http://localhost:3100/api/issues/${ISSUE_ID}`);
      if (init.method === 'PATCH') throw new TypeError('synthetic local block timeout');
      assert.equal(init.method, 'GET');
      return new Response(JSON.stringify({ id: ISSUE_ID, status: 'blocked' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    await assert.rejects(
      createServerAdapter().execute(executionContext()),
      /wandora_execution_failed_422/,
    );
    assert.deepEqual(requests.map((request) => request.init.method), ['POST', 'PATCH', 'GET']);
  });
});

test('ambiguous read-tool blocking repeats at most once only after readback proves work is still active', async () => {
  await withAdapterEnvironment(async () => {
    const requests = [];
    let issueCalls = 0;
    globalThis.fetch = async (url, init = {}) => {
      requests.push({ url: String(url), init });
      if (String(url) === BRIDGE_URL) {
        return new Response(JSON.stringify({ error: 'read-tool-failed' }), {
          status: 422,
          headers: { 'content-type': 'application/json' },
        });
      }
      assert.equal(String(url), `http://localhost:3100/api/issues/${ISSUE_ID}`);
      issueCalls += 1;
      if (issueCalls === 1) {
        assert.equal(init.method, 'PATCH');
        throw new TypeError('synthetic first block timeout');
      }
      if (issueCalls === 2) {
        assert.equal(init.method, 'GET');
        return new Response(JSON.stringify({ id: ISSUE_ID, status: 'in_progress' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      assert.equal(issueCalls, 3);
      assert.equal(init.method, 'PATCH');
      return new Response(JSON.stringify({ id: ISSUE_ID, status: 'blocked' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    await assert.rejects(
      createServerAdapter().execute(executionContext()),
      /wandora_execution_failed_422/,
    );
    assert.deepEqual(
      requests.map((request) => request.init.method),
      ['POST', 'PATCH', 'GET', 'PATCH'],
    );
  });
});

test('definitive Paperclip 4xx while blocking fails closed without readback or repeat mutation', async () => {
  await withAdapterEnvironment(async () => {
    const requests = [];
    globalThis.fetch = async (url, init = {}) => {
      requests.push({ url: String(url), init });
      if (String(url) === BRIDGE_URL) {
        return new Response(JSON.stringify({ error: 'read-tool-failed' }), {
          status: 422,
          headers: { 'content-type': 'application/json' },
        });
      }
      assert.equal(String(url), `http://localhost:3100/api/issues/${ISSUE_ID}`);
      assert.equal(init.method, 'PATCH');
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      });
    };

    await assert.rejects(
      createServerAdapter().execute(executionContext()),
      /paperclip_issue_block_failed_403/,
    );
    assert.deepEqual(requests.map((request) => request.init.method), ['POST', 'PATCH']);
  });
});

test('unrelated customer-work 422 does not claim a read-tool blocker disposition', async () => {
  await withAdapterEnvironment(async () => {
    const requests = [];
    globalThis.fetch = async (url, init = {}) => {
      requests.push({ url: String(url), init });
      assert.equal(String(url), BRIDGE_URL);
      return new Response(JSON.stringify({ error: 'employee-unavailable' }), {
        status: 422,
        headers: { 'content-type': 'application/json' },
      });
    };

    await assert.rejects(
      createServerAdapter().execute(executionContext()),
      /wandora_execution_failed_422/,
    );
    assert.equal(requests.length, 1);
  });
});

test('non-customer work read-tool failure preserves legacy lifecycle without issue mutation', async () => {
  await withAdapterEnvironment(async () => {
    const requests = [];
    globalThis.fetch = async (url, init = {}) => {
      requests.push({ url: String(url), init });
      assert.equal(String(url), BRIDGE_URL);
      return new Response(JSON.stringify({ error: 'read-tool-failed' }), {
        status: 422,
        headers: { 'content-type': 'application/json' },
      });
    };

    await assert.rejects(
      createServerAdapter().execute(executionContext('Sem marcador de customer work.')),
      /wandora_execution_failed_422/,
    );
    assert.equal(requests.length, 1);
  });
});


test('issue-less plugin invoke fast-read wake is transported to Core without Paperclip issue mutation', async () => {
  await withAdapterEnvironment(async () => {
    const envelope = {
      version: 1,
      correlationId: '33333333-3333-4333-8333-333333333333',
      intentToken: 'wfri1.synthetic.signature',
      request: 'Qual o preço do PREMIUM PLUS?',
    };
    const context = executionContext();
    delete context.context.paperclipIssue;
    context.context.wakeReason = 'wandora_fast_read_v1';
    context.context.paperclipWake = {
      agentMessage: {
        text: 'WANDORA_FAST_READ_V1 ' + Buffer.from(JSON.stringify(envelope)).toString('base64url'),
        source: 'plugin_invoke',
        pluginKey: 'wandora.organization-adapter-v1',
      },
    };

    const requests = [];
    globalThis.fetch = async (url, init = {}) => {
      requests.push({ url: String(url), init });
      assert.equal(String(url), BRIDGE_URL);
      return new Response(JSON.stringify({
        executionId: 'fast_disposable_1',
        model: 'wandora-deterministic-read-v1',
        summary: 'PREMIUM PLUS\nPreço: R$ 129,90',
        usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, totalTokens: 0 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    };

    const result = await createServerAdapter().execute(context);
    assert.equal(result.exitCode, 0);
    assert.equal(result.model, 'wandora-deterministic-read-v1');
    assert.deepEqual(result.resultJson, {
      executionId: 'fast_disposable_1',
      model: 'wandora-deterministic-read-v1',
      summary: 'PREMIUM PLUS\nPreço: R$ 129,90',
    });
    assert.deepEqual(result.usage, { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 });
    assert.equal(requests.length, 1);

    const body = JSON.parse(String(requests[0].init.body));
    assert.equal(body.task.workId, null);
    assert.equal(body.task.issueId, null);
    assert.equal(body.task.title, envelope.request);
    assert.equal(body.task.description, null);
    assert.deepEqual(body.fastRead, {
      intentToken: envelope.intentToken,
      correlationId: envelope.correlationId,
    });
  });
});

test('malformed fast-read plugin invoke transport is rejected before the Core bridge', async () => {
  await withAdapterEnvironment(async () => {
    const context = executionContext();
    delete context.context.paperclipIssue;
    context.context.wakeReason = 'wandora_fast_read_v1';
    context.context.paperclipWake = {
      agentMessage: {
        text: 'WANDORA_FAST_READ_V1 not-valid-base64-json',
        source: 'plugin_invoke',
        pluginKey: 'wandora.organization-adapter-v1',
      },
    };
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      throw new Error('must not be called');
    };
    await assert.rejects(
      createServerAdapter().execute(context),
      /wandora_fast_read_wake_invalid/,
    );
    assert.equal(calls, 0);
  });
});
