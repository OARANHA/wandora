import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ensureManagedCatalogEmployeeWork,
  WORK_ORIGIN_KIND,
  WORK_STATE_NAMESPACE,
  workDescription,
} from '../.test-build/work.mjs';

const COMPANY = '11111111-1111-4111-8111-111111111111';
const WORK = '22222222-2222-4222-8222-222222222222';
const AGENT = '33333333-3333-4333-8333-333333333333';
const ISSUE = '44444444-4444-4444-8444-444444444444';
const RUN = '55555555-5555-4555-8555-555555555555';

function harness(options = {}) {
  const state = new Map();
  const issues = options.issues ? [...options.issues] : [];
  const calls = { getAgent: 0, list: 0, create: 0, wake: 0, stateGet: 0, stateSet: 0 };
  const ctx = {
    agents: {
      managed: {
        async get() {
          calls.getAgent += 1;
          const status = options.agentStatus ?? 'idle';
          return {
            status: 'resolved',
            agentId: AGENT,
            agent: { id: AGENT, status },
          };
        },
      },
    },
    issues: {
      async list(input) {
        calls.list += 1;
        assert.equal(input.originKind, WORK_ORIGIN_KIND);
        assert.equal(input.originId, WORK);
        return issues.filter((issue) => issue.originKind === input.originKind && issue.originId === input.originId);
      },
      async create(input) {
        calls.create += 1;
        const issue = {
          id: ISSUE,
          originKind: input.originKind,
          originId: input.originId,
          title: input.title,
          description: input.description,
          assigneeAgentId: input.assigneeAgentId,
          status: input.status,
        };
        issues.push(issue);
        return issue;
      },
      async requestWakeup(issueId, companyId, optionsInput) {
        calls.wake += 1;
        assert.equal(issueId, ISSUE);
        assert.equal(companyId, COMPANY);
        assert.equal(optionsInput.reason, 'wandora_customer_work_v1');
        assert.equal(optionsInput.idempotencyKey, `wandora-work:${WORK}`);
        return options.wakeResult ?? { queued: true, runId: RUN };
      },
    },
    state: {
      async get(key) {
        calls.stateGet += 1;
        assert.equal(key.scopeKind, 'company');
        assert.equal(key.scopeId, COMPANY);
        assert.equal(key.namespace, WORK_STATE_NAMESPACE);
        return state.get(key.stateKey) ?? null;
      },
      async set(key, value) {
        calls.stateSet += 1;
        state.set(key.stateKey, value);
      },
    },
  };
  return { ctx, calls, state, issues };
}

const input = {
  companyId: COMPANY,
  workId: WORK,
  title: 'Preparar resumo',
  description: 'Preparar um resumo interno supervisionado.',
};

test('creates exactly one provider issue and durable dispatch receipt', async () => {
  const h = harness();
  await ensureManagedCatalogEmployeeWork(h.ctx, input);
  assert.deepEqual(h.calls, {
    getAgent: 1,
    list: 1,
    create: 1,
    wake: 1,
    stateGet: 1,
    stateSet: 2,
  });
  assert.equal(h.issues[0].description, workDescription(WORK, input.description));
  const receipt = h.state.get(WORK);
  assert.equal(receipt.status, 'dispatched');
  assert.equal(receipt.runId, RUN);
});

test('replay of dispatched work is read-only and never wakes twice', async () => {
  const h = harness();
  await ensureManagedCatalogEmployeeWork(h.ctx, input);
  h.calls.getAgent = h.calls.list = h.calls.create = h.calls.wake = h.calls.stateGet = h.calls.stateSet = 0;
  await ensureManagedCatalogEmployeeWork(h.ctx, input);
  assert.equal(h.calls.create, 0);
  assert.equal(h.calls.wake, 0);
  assert.equal(h.calls.stateSet, 0);
});

test('dispatching receipt fails closed instead of retrying an ambiguous wake', async () => {
  const existingIssue = {
    id: ISSUE,
    originKind: WORK_ORIGIN_KIND,
    originId: WORK,
    title: input.title,
    description: workDescription(WORK, input.description),
    assigneeAgentId: AGENT,
    status: 'todo',
  };
  const h = harness({ issues: [existingIssue] });
  const hashSource = await import('node:crypto');
  const hash = hashSource.createHash('sha256')
    .update(JSON.stringify(['wandora-paperclip-customer-work-v1', WORK, input.title, input.description]))
    .digest('hex');
  h.state.set(WORK, {
    schema: 'wandora.work_dispatch_receipt.v1',
    workId: WORK,
    requestHash: hash,
    issueId: ISSUE,
    status: 'dispatching',
  });
  await assert.rejects(
    ensureManagedCatalogEmployeeWork(h.ctx, input),
    /customer_work_dispatch_uncertain/,
  );
  assert.equal(h.calls.create, 0);
  assert.equal(h.calls.wake, 0);
});

test('non-idle managed employee cannot receive new work', async () => {
  const h = harness({ agentStatus: 'running' });
  await assert.rejects(
    ensureManagedCatalogEmployeeWork(h.ctx, input),
    /managed_employee_not_idle:running/,
  );
  assert.equal(h.calls.create, 0);
  assert.equal(h.calls.wake, 0);
});
