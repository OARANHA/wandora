import assert from 'node:assert/strict';
import test from 'node:test';
import {
  encodeFastReadPrompt,
  ensureManagedCatalogEmployeeFastRead,
  waitForManagedCatalogEmployeeFastReadResult,
} from '../.test-build/fast-read.mjs';

const COMPANY = '11111111-1111-4111-8111-111111111111';
const AGENT = '22222222-2222-4222-8222-222222222222';
const CORRELATION = '33333333-3333-4333-8333-333333333333';
const RUN = '44444444-4444-4444-8444-444444444444';

function harness({ stored = null, status = 'idle', runReads = [] } = {}) {
  let invokeCalls = 0;
  let readCalls = 0;
  const writes = [];
  const ctx = {
    agents: {
      managed: {
        get: async () => ({
          status: 'resolved',
          agentId: AGENT,
          agent: { id: AGENT, status },
        }),
      },
      invoke: async (_agentId, _companyId, opts) => {
        invokeCalls += 1;
        assert.match(opts.prompt, /^WANDORA_FAST_READ_V1 /);
        assert.equal(opts.reason, 'wandora_fast_read_v1');
        return { runId: RUN };
      },
    },
    agentRuns: {
      get: async (input) => {
        assert.deepEqual(input, { companyId: COMPANY, agentId: AGENT, runId: RUN });
        const value = runReads[Math.min(readCalls, Math.max(0, runReads.length - 1))] ?? {
          runId: RUN,
          status: 'running',
          result: null,
          usage: null,
        };
        readCalls += 1;
        return value;
      },
    },
    state: {
      get: async () => stored,
      set: async (_key, value) => { writes.push(value); },
    },
  };
  return {
    ctx,
    writes,
    invokeCalls: () => invokeCalls,
    readCalls: () => readCalls,
  };
}

const input = {
  companyId: COMPANY,
  correlationId: CORRELATION,
  intentToken: 'wfri1.test.signature',
  request: 'Qual o preço do produto?',
};

const succeededRun = {
  runId: RUN,
  status: 'succeeded',
  result: {
    model: 'wandora-deterministic-read-v1',
    summary: 'Produto A: R$ 10,00',
    executionId: 'fast_fixture',
  },
  usage: {
    inputTokens: 0,
    outputTokens: 0,
    cachedInputTokens: 0,
    totalTokens: 0,
  },
};

test('encodes provider-neutral fast-read prompt without concrete tool name', () => {
  const prompt = encodeFastReadPrompt(input);
  assert.match(prompt, /^WANDORA_FAST_READ_V1 /);
  assert.equal(prompt.includes('vendaerp'), false);
  assert.equal(prompt.includes('kv_get'), false);
});

test('dispatches exactly one issue-less agent invoke and records the Paperclip-owned receipt', async () => {
  const h = harness();
  const result = await ensureManagedCatalogEmployeeFastRead(h.ctx, input);
  assert.equal(result.runId, RUN);
  assert.equal(result.agentId, AGENT);
  assert.equal(h.invokeCalls(), 1);
  assert.equal(h.writes.length, 2);
  assert.equal(h.writes[0].status, 'dispatching');
  assert.equal(h.writes[1].status, 'dispatched');
});

test('duplicate correlation returns the original run and never invokes twice', async () => {
  const first = harness();
  const initial = await ensureManagedCatalogEmployeeFastRead(first.ctx, input);
  const receipt = first.writes.at(-1);
  assert.equal(initial.runId, RUN);

  const second = harness({ stored: receipt, status: 'error' });
  const replay = await ensureManagedCatalogEmployeeFastRead(second.ctx, input);
  assert.equal(replay.runId, initial.runId);
  assert.equal(second.invokeCalls(), 0);
  assert.equal(second.writes.length, 0);
});

test('same correlation with changed intent fails closed', async () => {
  const first = harness();
  await ensureManagedCatalogEmployeeFastRead(first.ctx, input);
  const second = harness({ stored: first.writes.at(-1) });
  await assert.rejects(
    ensureManagedCatalogEmployeeFastRead(second.ctx, { ...input, intentToken: 'wfri1.changed.signature' }),
    /fast_read_dispatch_receipt_conflict/,
  );
  assert.equal(second.invokeCalls(), 0);
});

test('delegates employee lifecycle admission to Paperclip agents.invoke', async () => {
  const h = harness({ status: 'error' });
  const result = await ensureManagedCatalogEmployeeFastRead(h.ctx, input);
  assert.equal(result.runId, RUN);
  assert.equal(h.invokeCalls(), 1);
});

test('observes one Paperclip-owned run until deterministic success without reinvoking', async () => {
  const h = harness({
    runReads: [
      { runId: RUN, status: 'queued', result: null, usage: null },
      { runId: RUN, status: 'running', result: null, usage: null },
      succeededRun,
    ],
  });
  const sleeps = [];
  const result = await waitForManagedCatalogEmployeeFastReadResult(h.ctx, input, {
    maxAttempts: 3,
    pollIntervalMs: 0,
    sleep: async (ms) => { sleeps.push(ms); },
  });
  assert.equal(result.runId, RUN);
  assert.equal(result.model, 'wandora-deterministic-read-v1');
  assert.equal(result.summary, 'Produto A: R$ 10,00');
  assert.deepEqual(result.usage, succeededRun.usage);
  assert.equal(h.invokeCalls(), 1);
  assert.equal(h.readCalls(), 3);
  assert.deepEqual(sleeps, [0, 0]);
});

test('duplicate correlation observes the original run and never invokes again', async () => {
  const first = harness();
  await ensureManagedCatalogEmployeeFastRead(first.ctx, input);
  const receipt = first.writes.at(-1);
  const second = harness({ stored: receipt, runReads: [succeededRun] });
  const result = await waitForManagedCatalogEmployeeFastReadResult(second.ctx, input, {
    maxAttempts: 1,
    pollIntervalMs: 0,
  });
  assert.equal(result.runId, RUN);
  assert.equal(second.invokeCalls(), 0);
  assert.equal(second.readCalls(), 1);
});

test('bounded wait times out without a second invoke', async () => {
  const h = harness({
    runReads: [
      { runId: RUN, status: 'queued', result: null, usage: null },
      { runId: RUN, status: 'running', result: null, usage: null },
    ],
  });
  await assert.rejects(
    waitForManagedCatalogEmployeeFastReadResult(h.ctx, input, {
      maxAttempts: 2,
      pollIntervalMs: 0,
      sleep: async () => {},
    }),
    /fast_read_result_timeout/,
  );
  assert.equal(h.invokeCalls(), 1);
  assert.equal(h.readCalls(), 2);
});

test('provider retry state fails closed and never reinvokes', async () => {
  const h = harness({
    runReads: [{ runId: RUN, status: 'scheduled_retry', result: null, usage: null }],
  });
  await assert.rejects(
    waitForManagedCatalogEmployeeFastReadResult(h.ctx, input, {
      maxAttempts: 1,
      pollIntervalMs: 0,
    }),
    /fast_read_run_scheduled_retry/,
  );
  assert.equal(h.invokeCalls(), 1);
  assert.equal(h.readCalls(), 1);
});

test('missing or malformed terminal result fails closed', async () => {
  const h = harness({
    runReads: [{ runId: RUN, status: 'succeeded', result: null, usage: null }],
  });
  await assert.rejects(
    waitForManagedCatalogEmployeeFastReadResult(h.ctx, input, {
      maxAttempts: 1,
      pollIntervalMs: 0,
    }),
    /fast_read_result_invalid/,
  );
  assert.equal(h.invokeCalls(), 1);
});
