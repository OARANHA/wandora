import assert from 'node:assert/strict';
import test from 'node:test';
import { activateManagedCatalogEmployee } from '../.test-build/activation.mjs';

function resolution(status, agentId = 'agent-test-only') {
  if (status === 'missing') return { status: 'missing', agentId: null, agent: null };
  return { status: 'resolved', agentId, agent: { id: agentId, status } };
}
function harness(states) {
  const queue = [...states];
  const calls = { get: 0, resume: 0 };
  return {
    calls,
    agents: {
      managed: { async get() { calls.get += 1; const next = queue.shift(); if (!next) throw new Error('unexpected_get'); return resolution(next); } },
      async resume(agentId, companyId) { calls.resume += 1; assert.equal(agentId, 'agent-test-only'); assert.equal(companyId, 'company-test-only'); return { id: agentId, status: 'idle' }; },
    },
  };
}
test('paused employee resumes once and exact readback must be idle', async () => {
  const h = harness(['paused', 'idle']);
  assert.deepEqual(await activateManagedCatalogEmployee(h.agents, 'company-test-only'), { status: 'idle' });
  assert.deepEqual(h.calls, { get: 2, resume: 1 });
});
test('already-idle employee converges without resume', async () => {
  const h = harness(['idle', 'idle']);
  await activateManagedCatalogEmployee(h.agents, 'company-test-only');
  assert.deepEqual(h.calls, { get: 2, resume: 0 });
});
test('missing and unexpected states fail closed without resume', async () => {
  for (const state of ['missing', 'running', 'terminated', 'pending_approval', 'error']) {
    const h = harness([state]);
    await assert.rejects(activateManagedCatalogEmployee(h.agents, 'company-test-only'), /managed_employee_(missing|unexpected_state)/);
    assert.equal(h.calls.resume, 0);
  }
});
test('provider still paused after resume fails closed', async () => {
  const h = harness(['paused', 'paused']);
  await assert.rejects(activateManagedCatalogEmployee(h.agents, 'company-test-only'), /activation_not_converged/);
  assert.deepEqual(h.calls, { get: 2, resume: 1 });
});
