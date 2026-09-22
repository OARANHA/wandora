import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { Pool } from 'pg';
import type { AssignedTask, AssignedTaskInput } from '../src/agent-runtime/task-runtime.js';
import { paperclipManagedAgentRef } from '../src/organization-adapter/paperclip-provider.js';
import {
  PaperclipExecutionBindingError,
  PaperclipExecutionService,
} from '../src/paperclip-execution/service.js';

const ORG = '71000000-0000-4000-8000-0000000000a1';
const EMPLOYEE = '72000000-0000-4000-8000-0000000000a1';
const COMPANY = '73000000-0000-4000-8000-0000000000a1';
const AGENT = '74000000-0000-4000-8000-0000000000a1';
const RUN = '75000000-0000-4000-8000-0000000000a1';
const runtimePool = new Pool({ connectionString: process.env.DATABASE_URL });
const fixturePool = new Pool({ connectionString: process.env.FIXTURE_DATABASE_URL });

const emptyGroundingProjection = {
  async project(_organizationId: string, workContext: AssignedTask) {
    return {
      officialFacts: [],
      houseRules: [],
      workContext,
    };
  },
};

after(async () => {
  await Promise.all([runtimePool.end(), fixturePool.end()]);
});

async function resetFixture(status: 'paused' | 'active') {
  await fixturePool.query(`TRUNCATE
    wandora_private.digital_employee_provider_bindings,
    wandora_private.digital_employee_hire_operations,
    wandora_private.control_plane_provider_bindings,
    wandora.digital_employees,
    wandora.memberships, wandora.user_identities, wandora.users,
    wandora.organizations RESTART IDENTITY CASCADE`);
  await fixturePool.query(
    `INSERT INTO wandora.organizations(id,slug,display_name,status)
     VALUES ($1,'bridge-org','Bridge Org','active')`,
    [ORG],
  );
  await fixturePool.query(
    `INSERT INTO wandora_private.control_plane_provider_bindings
       (organization_id,provider,provider_company_ref)
     VALUES ($1,'paperclip',$2)`,
    [ORG, COMPANY],
  );
  await fixturePool.query(
    `INSERT INTO wandora.digital_employees
       (id,organization_id,display_name,role,status,autonomy_mode)
     VALUES ($1,$2,'Ana','commercial-assistant',$3,'supervised')`,
    [EMPLOYEE, ORG, status],
  );
  await fixturePool.query(
    `INSERT INTO wandora_private.digital_employee_provider_bindings
       (organization_id,employee_id,provider,provider_agent_ref)
     VALUES ($1,$2,'paperclip',$3)`,
    [ORG, EMPLOYEE, paperclipManagedAgentRef(COMPANY, 'ana-commercial-v1')],
  );
}

test('private execution requires the canonical Wandora employee to be active', async () => {
  await resetFixture('paused');
  let runtimeCalls = 0;
  const service = new PaperclipExecutionService(runtimePool, {
    executeAssignedTask: async () => {
      runtimeCalls += 1;
      return { model: 'test', summary: 'should-not-run', usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, totalTokens: 0 } };
    },
  }, emptyGroundingProjection);

  await assert.rejects(
    service.execute({
      identity: { paperclipAgentId: AGENT, paperclipCompanyId: COMPANY, catalogKey: 'ana-commercial-v1' },
      paperclipRunId: RUN,
      task: { title: 'Qualificar', description: 'Contato' },
    }),
    (error: unknown) => error instanceof PaperclipExecutionBindingError && error.code === 'employee-unavailable',
  );
  assert.equal(runtimeCalls, 0);
});

test('active exact binding reaches AgentTaskRuntime without provider identifiers', async () => {
  await resetFixture('active');
  let received: AssignedTaskInput | undefined;
  const service = new PaperclipExecutionService(runtimePool, {
    executeAssignedTask: async (input) => {
      received = input;
      return { model: 'wandora-supervised-v1', summary: 'Proposta supervisionada', usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, totalTokens: 0 } };
    },
  }, emptyGroundingProjection);

  const result = await service.execute({
    identity: { paperclipAgentId: AGENT, paperclipCompanyId: COMPANY, catalogKey: 'ana-commercial-v1' },
    paperclipRunId: RUN,
    task: { title: 'Qualificar', description: 'Entender necessidade' },
  });

  assert.equal(result.model, 'wandora-supervised-v1');
  assert.equal(result.summary, 'Proposta supervisionada');
  assert.deepEqual(result.usage, { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, totalTokens: 0 });
  assert.match(result.executionId, /^exec_[0-9a-f]{64}$/);
  assert.deepEqual(received, {
    organizationId: ORG,
    employee: {
      id: EMPLOYEE,
      organizationId: ORG,
      name: 'Ana',
      role: 'commercial-assistant',
      autonomyMode: 'supervised',
    },
    task: { title: 'Qualificar', description: 'Entender necessidade' },
    grounding: {
      officialFacts: [],
      houseRules: [],
      workContext: { title: 'Qualificar', description: 'Entender necessidade' },
    },
  });
  assert.equal(JSON.stringify(received).includes(COMPANY), false);
  assert.equal(JSON.stringify(received).includes(AGENT), false);
  assert.equal(JSON.stringify(received).includes(RUN), false);
});


test('Wandora work correlation is verified and result is committed without entering AgentTaskRuntime input', async () => {
  await resetFixture('active');
  const WORK = '76000000-0000-4000-8000-0000000000a1';
  let received: AssignedTaskInput | undefined;
  const preparation: unknown[] = [];
  const recorded: unknown[] = [];
  const service = new PaperclipExecutionService(
    runtimePool,
    {
      executeAssignedTask: async (input) => {
        received = input;
        return { model: 'wandora-supervised-v1', summary: 'Resultado supervisionado', usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, totalTokens: 0 } };
      },
    },
    emptyGroundingProjection,
    {
      async prepareCatalogEmployeeWorkExecution(input) {
        preparation.push(input);
        return { kind: 'execute' as const };
      },
      async recordCatalogEmployeeWorkResult(input) {
        recorded.push(input);
      },
      async markCatalogEmployeeWorkExecutionUncertain() {
        throw new Error('must not mark uncertain');
      },
    },
  );

  const result = await service.execute({
    identity: { paperclipAgentId: AGENT, paperclipCompanyId: COMPANY, catalogKey: 'ana-commercial-v1' },
    paperclipRunId: RUN,
    workId: WORK,
    task: { title: 'Preparar resumo', description: 'Somente resultado interno.' },
  });

  assert.deepEqual(preparation, [{
    organizationId: ORG,
    employeeId: EMPLOYEE,
    workId: WORK,
    paperclipRunId: RUN,
    title: 'Preparar resumo',
    description: 'Somente resultado interno.',
  }]);
  assert.equal(JSON.stringify(received).includes(WORK), false);
  assert.equal(JSON.stringify(received).includes(RUN), false);
  assert.equal(JSON.stringify(received).includes(COMPANY), false);
  assert.equal(JSON.stringify(received).includes(AGENT), false);
  assert.equal(recorded.length, 1);
  assert.deepEqual(recorded[0], {
    organizationId: ORG,
    employeeId: EMPLOYEE,
    workId: WORK,
    paperclipRunId: RUN,
    executionId: result.executionId,
    model: 'wandora-supervised-v1',
    summary: 'Resultado supervisionado',
  });
});

test('cached exact work result prevents a duplicate AgentTaskRuntime execution', async () => {
  await resetFixture('active');
  const WORK = '76000000-0000-4000-8000-0000000000a2';
  let runtimeCalls = 0;
  let recordCalls = 0;
  const service = new PaperclipExecutionService(
    runtimePool,
    {
      executeAssignedTask: async () => {
        runtimeCalls += 1;
        return { model: 'unexpected', summary: 'unexpected', usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, totalTokens: 0 } };
      },
    },
    {
      async project() {
        throw new Error('cached replay must not reload grounding');
      },
    },
    {
      async prepareCatalogEmployeeWorkExecution() {
        return {
          kind: 'cached' as const,
          executionId: 'exec_cached',
          model: 'wandora-supervised-v1',
          summary: 'Resultado já registrado',
        };
      },
      async recordCatalogEmployeeWorkResult() {
        recordCalls += 1;
      },
      async markCatalogEmployeeWorkExecutionUncertain() {
        throw new Error('must not mark uncertain');
      },
    },
  );

  const result = await service.execute({
    identity: { paperclipAgentId: AGENT, paperclipCompanyId: COMPANY, catalogKey: 'ana-commercial-v1' },
    paperclipRunId: RUN,
    workId: WORK,
    task: { title: 'Preparar resumo', description: 'Somente resultado interno.' },
  });
  assert.deepEqual(result, {
    executionId: 'exec_cached',
    model: 'wandora-supervised-v1',
    summary: 'Resultado já registrado',
    usage: { inputTokens: null, outputTokens: null, cachedInputTokens: null, totalTokens: null },
  });
  assert.equal(runtimeCalls, 0);
  assert.equal(recordCalls, 0);
});

test('grounding failure stops before AgentTaskRuntime and marks a newly reserved work uncertain', async () => {
  await resetFixture('active');
  const WORK = '76000000-0000-4000-8000-0000000000a4';
  let runtimeCalls = 0;
  const uncertain: unknown[] = [];
  const service = new PaperclipExecutionService(
    runtimePool,
    {
      executeAssignedTask: async () => {
        runtimeCalls += 1;
        throw new Error('must not execute runtime');
      },
    },
    {
      async project() {
        throw new Error('synthetic grounding unavailable');
      },
    },
    {
      async prepareCatalogEmployeeWorkExecution() {
        return { kind: 'execute' as const };
      },
      async recordCatalogEmployeeWorkResult() {
        throw new Error('must not record');
      },
      async markCatalogEmployeeWorkExecutionUncertain(input) {
        uncertain.push(input);
      },
    },
  );

  await assert.rejects(
    service.execute({
      identity: { paperclipAgentId: AGENT, paperclipCompanyId: COMPANY, catalogKey: 'ana-commercial-v1' },
      paperclipRunId: RUN,
      workId: WORK,
      task: { title: 'Preparar resumo', description: 'Grounding obrigatório.' },
    }),
    /synthetic grounding unavailable/,
  );
  assert.equal(runtimeCalls, 0);
  assert.equal(uncertain.length, 1);
});

test('runtime failure marks exact work execution uncertain and never retries inside the bridge', async () => {
  await resetFixture('active');
  const WORK = '76000000-0000-4000-8000-0000000000a3';
  let runtimeCalls = 0;
  const uncertain: unknown[] = [];
  const service = new PaperclipExecutionService(
    runtimePool,
    {
      executeAssignedTask: async () => {
        runtimeCalls += 1;
        throw new Error('synthetic model failure');
      },
    },
    emptyGroundingProjection,
    {
      async prepareCatalogEmployeeWorkExecution() {
        return { kind: 'execute' as const };
      },
      async recordCatalogEmployeeWorkResult() {
        throw new Error('must not record');
      },
      async markCatalogEmployeeWorkExecutionUncertain(input) {
        uncertain.push(input);
      },
    },
  );

  await assert.rejects(
    service.execute({
      identity: { paperclipAgentId: AGENT, paperclipCompanyId: COMPANY, catalogKey: 'ana-commercial-v1' },
      paperclipRunId: RUN,
      workId: WORK,
      task: { title: 'Preparar resumo', description: 'Somente resultado interno.' },
    }),
    /synthetic model failure/,
  );
  assert.equal(runtimeCalls, 1);
  assert.deepEqual(uncertain, [{
    organizationId: ORG,
    employeeId: EMPLOYEE,
    workId: WORK,
    paperclipRunId: RUN,
  }]);
});
