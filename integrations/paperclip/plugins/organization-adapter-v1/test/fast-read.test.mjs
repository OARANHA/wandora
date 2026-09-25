import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeFastReadPrompt, ensureManagedCatalogEmployeeFastRead } from '../.test-build/fast-read.mjs';

const COMPANY = '11111111-1111-4111-8111-111111111111';
const AGENT = '22222222-2222-4222-8222-222222222222';
const CORRELATION = '33333333-3333-4333-8333-333333333333';

function harness({ stored = null, status = 'idle' } = {}) {
  let invokeCalls = 0;
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
        return { runId: '44444444-4444-4444-8444-444444444444' };
      },
    },
    state: {
      get: async () => stored,
      set: async (_key, value) => { writes.push(value); },
    },
  };
  return { ctx, writes, invokeCalls: () => invokeCalls };
}

const input = {
  companyId: COMPANY,
  correlationId: CORRELATION,
  intentToken: 'wfri1.test.signature',
  request: 'Qual o preço do produto?',
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
  assert.equal(result.runId, '44444444-4444-4444-8444-444444444444');
  assert.equal(h.invokeCalls(), 1);
  assert.equal(h.writes.length, 2);
  assert.equal(h.writes[0].status, 'dispatching');
  assert.equal(h.writes[1].status, 'dispatched');
});

test('duplicate correlation returns the original run and never invokes twice', async () => {
  const first = harness();
  const initial = await ensureManagedCatalogEmployeeFastRead(first.ctx, input);
  const receipt = first.writes.at(-1);
  assert.equal(initial.runId, '44444444-4444-4444-8444-444444444444');

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
  assert.equal(result.runId, '44444444-4444-4444-8444-444444444444');
  assert.equal(h.invokeCalls(), 1);
});
