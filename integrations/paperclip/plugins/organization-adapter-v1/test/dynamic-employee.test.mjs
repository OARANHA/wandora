import assert from 'node:assert/strict';
import test from 'node:test';
import { dynamicEmployeeResourceKey, ensureDynamicCatalogEmployee } from '../.test-build/dynamic-employee.mjs';

const COMPANY = 'company-test-only';
const EMPLOYEE_A = '11111111-1111-4111-8111-111111111111';
const EMPLOYEE_B = '22222222-2222-4222-8222-222222222222';

function resolution({ employeeId, agentId, status = 'paused', lifecycle = 'created' }) {
  const resourceKey = dynamicEmployeeResourceKey(employeeId);
  return {
    pluginKey: 'wandora.organization-adapter-v1',
    resourceKind: 'agent',
    resourceKey,
    companyId: COMPANY,
    agentId,
    agent: { id: agentId, companyId: COMPANY, status },
    status: lifecycle,
    approvalId: status === 'pending_approval' ? 'approval-test-only' : null,
    creationFingerprint: 'fingerprint-test-only',
  };
}

function harness(sequence) {
  const queue = [...sequence];
  const calls = [];
  return {
    calls,
    agents: {
      managed: {
        async ensureDynamic(input) {
          calls.push(input);
          const next = queue.shift();
          if (!next) throw new Error('unexpected_ensure');
          return next;
        },
      },
    },
  };
}

test('resource key is derived only from canonical employee UUID', () => {
  assert.equal(dynamicEmployeeResourceKey(EMPLOYEE_A), `wandora-digital-employee:${EMPLOYEE_A}`);
  assert.equal(
    dynamicEmployeeResourceKey('AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA'),
    'wandora-digital-employee:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  );
  assert.throws(() => dynamicEmployeeResourceKey('ana-commercial-v1'), /invalid_employee_id/);
});

test('paused ensure returns actual private provider Agent ref with bounded create spec', async () => {
  const h = harness([resolution({ employeeId: EMPLOYEE_A, agentId: 'agent-a' })]);
  assert.deepEqual(await ensureDynamicCatalogEmployee(h.agents, {
    companyId: COMPANY, employeeId: EMPLOYEE_A, catalogKey: 'ana-commercial-v1',
  }), { providerAgentRef: 'agent-a' });
  assert.equal(h.calls[0].resourceKey, dynamicEmployeeResourceKey(EMPLOYEE_A));
  assert.deepEqual(h.calls[0].spec, {
    name: 'Ana',
    role: 'commercial-assistant',
    title: 'Assistente Comercial Digital',
    capabilities: 'Atendimento comercial supervisionado pela Wandora.',
    adapterType: 'wandora_mastra',
    adapterConfig: {},
    runtimeConfig: {},
    permissions: { canCreateAgents: false },
    budgetMonthlyCents: 0,
    initialStatus: 'paused',
  });
});

test('same employee replay converges to same provider Agent', async () => {
  const h = harness([
    resolution({ employeeId: EMPLOYEE_A, agentId: 'agent-a', lifecycle: 'created' }),
    resolution({ employeeId: EMPLOYEE_A, agentId: 'agent-a', lifecycle: 'resolved' }),
  ]);
  const input = { companyId: COMPANY, employeeId: EMPLOYEE_A, catalogKey: 'ana-commercial-v1' };
  assert.deepEqual(await ensureDynamicCatalogEmployee(h.agents, input), await ensureDynamicCatalogEmployee(h.agents, input));
  assert.equal(h.calls[0].resourceKey, h.calls[1].resourceKey);
});

test('two employee UUIDs using same catalog template use distinct resource keys', async () => {
  const h = harness([
    resolution({ employeeId: EMPLOYEE_A, agentId: 'agent-a' }),
    resolution({ employeeId: EMPLOYEE_B, agentId: 'agent-b' }),
  ]);
  await ensureDynamicCatalogEmployee(h.agents, { companyId: COMPANY, employeeId: EMPLOYEE_A, catalogKey: 'ana-commercial-v1' });
  await ensureDynamicCatalogEmployee(h.agents, { companyId: COMPANY, employeeId: EMPLOYEE_B, catalogKey: 'ana-commercial-v1' });
  assert.notEqual(h.calls[0].resourceKey, h.calls[1].resourceKey);
});

test('board approval fails closed until replay proves same Agent paused', async () => {
  const h = harness([
    resolution({ employeeId: EMPLOYEE_A, agentId: 'agent-a', status: 'pending_approval' }),
    resolution({ employeeId: EMPLOYEE_A, agentId: 'agent-a', status: 'paused', lifecycle: 'resolved' }),
  ]);
  const input = { companyId: COMPANY, employeeId: EMPLOYEE_A, catalogKey: 'ana-commercial-v1' };
  await assert.rejects(ensureDynamicCatalogEmployee(h.agents, input), /dynamic_employee_not_ready/);
  assert.deepEqual(await ensureDynamicCatalogEmployee(h.agents, input), { providerAgentRef: 'agent-a' });
  assert.equal(h.calls[0].resourceKey, h.calls[1].resourceKey);
});

test('unexpected provider correlation or state fails closed', async () => {
  const wrongCompany = resolution({ employeeId: EMPLOYEE_A, agentId: 'agent-a' });
  wrongCompany.companyId = 'other-company';
  for (const entry of [
    wrongCompany,
    resolution({ employeeId: EMPLOYEE_A, agentId: 'agent-a', status: 'idle' }),
  ]) {
    const h = harness([entry]);
    await assert.rejects(
      ensureDynamicCatalogEmployee(h.agents, { companyId: COMPANY, employeeId: EMPLOYEE_A, catalogKey: 'ana-commercial-v1' }),
      /dynamic_employee_(provider_correlation_invalid|not_ready)/,
    );
  }
});
