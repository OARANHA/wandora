import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { Pool } from 'pg';
import {
  DigitalEmployeeWorkError,
  type OrganizationAdapterProvider,
} from '../src/organization-adapter/contracts.js';
import { paperclipManagedAgentRef } from '../src/organization-adapter/paperclip-provider.js';
import { OrganizationAdapterService } from '../src/organization-adapter/service.js';
import { HumanAccessError } from '../src/supervision/human-read.js';

const ORG = '91000000-0000-4000-8000-0000000000a1';
const USER = '92000000-0000-4000-8000-0000000000a1';
const EMPLOYEE = '93000000-0000-4000-8000-0000000000a1';
const COMPANY = '94000000-0000-4000-8000-0000000000a1';
const CATALOG = 'ana-commercial-v1';

const runtimePool = new Pool({ connectionString: process.env.DATABASE_URL });
const fixturePool = new Pool({ connectionString: process.env.FIXTURE_DATABASE_URL });
after(async () => { await Promise.all([runtimePool.end(), fixturePool.end()]); });

class WorkProvider implements OrganizationAdapterProvider {
  readonly provider = 'paperclip' as const;
  workCalls: Array<Record<string, unknown>> = [];
  fail = false;

  async reconcileCatalogEmployee(input: { providerCompanyRef: string; catalogKey: string }) {
    return { providerAgentRef: paperclipManagedAgentRef(input.providerCompanyRef, input.catalogKey) };
  }

  async ensureCatalogEmployeeWork(input: {
    providerCompanyRef: string;
    catalogKey: string;
    workId: string;
    title: string;
    description: string;
  }) {
    this.workCalls.push(input);
    if (this.fail) throw new Error('synthetic_provider_timeout');
    return {
      providerAgentRef: paperclipManagedAgentRef(input.providerCompanyRef, input.catalogKey),
    };
  }
}

async function resetFixture(role: 'owner' | 'admin' | 'member' = 'owner') {
  await fixturePool.query(`TRUNCATE
    wandora_private.digital_employee_work_operations,
    wandora_private.digital_employee_catalog_hire_eligibility,
    wandora_private.digital_employee_provider_bindings,
    wandora_private.digital_employee_hire_operations,
    wandora_private.control_plane_provider_bindings,
    wandora.digital_employees,
    wandora.memberships, wandora.user_identities, wandora.users,
    wandora.organizations RESTART IDENTITY CASCADE`);

  await fixturePool.query(
    `INSERT INTO wandora.organizations(id,slug,display_name,status)
     VALUES ($1,'work-a','Work A','active')`,
    [ORG],
  );
  await fixturePool.query(
    `INSERT INTO wandora.users(id,display_name) VALUES ($1,'Owner')`,
    [USER],
  );
  await fixturePool.query(
    `INSERT INTO wandora.memberships(organization_id,user_id,role,status)
     VALUES ($1,$2,$3,'active')`,
    [ORG, USER, role],
  );
  const ref = paperclipManagedAgentRef(COMPANY, CATALOG);
  await fixturePool.query(
    `INSERT INTO wandora.digital_employees(id,organization_id,display_name,role,status,autonomy_mode)
     VALUES ($1,$2,'Ana','commercial-assistant','active','supervised')`,
    [EMPLOYEE, ORG],
  );
  await fixturePool.query(
    `INSERT INTO wandora_private.control_plane_provider_bindings
       (organization_id,provider,provider_company_ref)
     VALUES ($1,'paperclip',$2)`,
    [ORG, COMPANY],
  );
  await fixturePool.query(
    `INSERT INTO wandora_private.digital_employee_provider_bindings
       (organization_id,employee_id,provider,provider_agent_ref)
     VALUES ($1,$2,'paperclip',$3)`,
    [ORG, EMPLOYEE, ref],
  );
  await fixturePool.query(
    `INSERT INTO wandora_private.digital_employee_hire_operations
       (organization_id,idempotency_key,request_hash,employee_id,provider,catalog_key,
        provider_company_ref,status,provider_agent_ref,completed_at)
     VALUES ($1,'work-hire',$2,$3,'paperclip',$4,$5,'completed',$6,now())`,
    [ORG, 'a'.repeat(64), EMPLOYEE, CATALOG, COMPANY, ref],
  );
}

test('owner work admission reserves stable Wandora work before one provider effect', async () => {
  await resetFixture();
  const provider = new WorkProvider();
  const service = new OrganizationAdapterService(
    runtimePool,
    provider,
    undefined,
    () => '95000000-0000-4000-8000-0000000000a1',
    () => '2026-09-20T12:00:00.000Z',
  );

  const first = await service.ensureCatalogEmployeeWork({
    organizationId: ORG,
    actorUserId: USER,
    employeeId: EMPLOYEE,
    idempotencyKey: 'stable-work-key',
    title: 'Preparar resumo',
    description: 'Preparar resultado interno supervisionado.',
  });
  const replay = await service.ensureCatalogEmployeeWork({
    organizationId: ORG,
    actorUserId: USER,
    employeeId: EMPLOYEE,
    idempotencyKey: 'stable-work-key',
    title: 'Preparar resumo',
    description: 'Preparar resultado interno supervisionado.',
  });

  assert.equal(first.id, '95000000-0000-4000-8000-0000000000a1');
  assert.equal(replay.id, first.id);
  assert.equal(provider.workCalls.length, 1);
  assert.deepEqual(provider.workCalls[0], {
    providerCompanyRef: COMPANY,
    catalogKey: CATALOG,
    workId: first.id,
    title: 'Preparar resumo',
    description: 'Preparar resultado interno supervisionado.',
  });

  const row = await fixturePool.query(
    `SELECT status::text AS status, provider_run_ref, result_summary
       FROM wandora_private.digital_employee_work_operations
      WHERE organization_id=$1 AND id=$2`,
    [ORG, first.id],
  );
  assert.deepEqual(row.rows[0], {
    status: 'submitted',
    provider_run_ref: null,
    result_summary: null,
  });
});

test('concurrent same-key work admission converges to one work and one provider effect', async () => {
  await resetFixture();
  const provider = new WorkProvider();
  const ids = [
    '95000000-0000-4000-8000-0000000000c1',
    '95000000-0000-4000-8000-0000000000c2',
  ];
  const service = new OrganizationAdapterService(
    runtimePool,
    provider,
    undefined,
    () => ids.shift() ?? '95000000-0000-4000-8000-0000000000cf',
  );
  const input = {
    organizationId: ORG,
    actorUserId: USER,
    employeeId: EMPLOYEE,
    idempotencyKey: 'concurrent-stable-work-key',
    title: 'Preparar resumo concorrente',
    description: 'Resultado interno supervisionado.',
  };

  const [first, second] = await Promise.all([
    service.ensureCatalogEmployeeWork(input),
    service.ensureCatalogEmployeeWork(input),
  ]);

  assert.equal(first.id, second.id);
  assert.equal(provider.workCalls.length, 1);
  const rows = await fixturePool.query(
    `SELECT id::text,status::text AS status
       FROM wandora_private.digital_employee_work_operations
      WHERE organization_id=$1 AND idempotency_key=$2`,
    [ORG, input.idempotencyKey],
  );
  assert.deepEqual(rows.rows, [{ id: first.id, status: 'submitted' }]);
});

test('same idempotency key with changed content fails before provider effect', async () => {
  await resetFixture();
  const provider = new WorkProvider();
  const service = new OrganizationAdapterService(
    runtimePool,
    provider,
    undefined,
    () => '95000000-0000-4000-8000-0000000000a2',
  );

  await service.ensureCatalogEmployeeWork({
    organizationId: ORG,
    actorUserId: USER,
    employeeId: EMPLOYEE,
    idempotencyKey: 'same-key',
    title: 'Resumo A',
    description: 'Descrição A',
  });
  await assert.rejects(
    service.ensureCatalogEmployeeWork({
      organizationId: ORG,
      actorUserId: USER,
      employeeId: EMPLOYEE,
      idempotencyKey: 'same-key',
      title: 'Resumo B',
      description: 'Descrição A',
    }),
    /idempotency key is already reserved for different work/i,
  );
  assert.equal(provider.workCalls.length, 1);
});

test('provider ambiguity persists uncertain and retry never creates a second work id', async () => {
  await resetFixture();
  const provider = new WorkProvider();
  provider.fail = true;
  let uuidCalls = 0;
  const service = new OrganizationAdapterService(
    runtimePool,
    provider,
    undefined,
    () => {
      uuidCalls += 1;
      return '95000000-0000-4000-8000-0000000000a3';
    },
  );
  const input = {
    organizationId: ORG,
    actorUserId: USER,
    employeeId: EMPLOYEE,
    idempotencyKey: 'uncertain-key',
    title: 'Resumo',
    description: 'Resultado interno.',
  };

  await assert.rejects(
    service.ensureCatalogEmployeeWork(input),
    (error: unknown) => error instanceof DigitalEmployeeWorkError
      && error.code === 'provider-work-uncertain',
  );
  await assert.rejects(
    service.ensureCatalogEmployeeWork(input),
    (error: unknown) => error instanceof DigitalEmployeeWorkError
      && error.code === 'provider-work-uncertain',
  );

  assert.equal(uuidCalls, 1);
  assert.equal(provider.workCalls.length, 2);
  const rows = await fixturePool.query(
    `SELECT id::text,status::text AS status
       FROM wandora_private.digital_employee_work_operations
      WHERE organization_id=$1`,
    [ORG],
  );
  assert.deepEqual(rows.rows, [{
    id: '95000000-0000-4000-8000-0000000000a3',
    status: 'uncertain',
  }]);
});

test('member and inactive employee fail before provider effect', async () => {
  await resetFixture('member');
  const provider = new WorkProvider();
  let service = new OrganizationAdapterService(runtimePool, provider);
  await assert.rejects(
    service.ensureCatalogEmployeeWork({
      organizationId: ORG,
      actorUserId: USER,
      employeeId: EMPLOYEE,
      idempotencyKey: 'member-key',
      title: 'Resumo',
      description: 'Resultado interno.',
    }),
    (error: unknown) => error instanceof HumanAccessError,
  );
  assert.equal(provider.workCalls.length, 0);

  await resetFixture('owner');
  await fixturePool.query(
    `UPDATE wandora.digital_employees SET status='paused' WHERE id=$1`,
    [EMPLOYEE],
  );
  service = new OrganizationAdapterService(runtimePool, provider);
  await assert.rejects(
    service.ensureCatalogEmployeeWork({
      organizationId: ORG,
      actorUserId: USER,
      employeeId: EMPLOYEE,
      idempotencyKey: 'paused-key',
      title: 'Resumo',
      description: 'Resultado interno.',
    }),
    (error: unknown) => error instanceof DigitalEmployeeWorkError
      && error.code === 'employee-work-unavailable',
  );
  assert.equal(provider.workCalls.length, 0);
});

test('exact provider run is bound once and supervised result becomes review-ready', async () => {
  await resetFixture();
  const provider = new WorkProvider();
  const service = new OrganizationAdapterService(
    runtimePool,
    provider,
    undefined,
    () => '95000000-0000-4000-8000-0000000000a4',
    () => '2026-09-20T12:00:00.000Z',
  );
  const work = await service.ensureCatalogEmployeeWork({
    organizationId: ORG,
    actorUserId: USER,
    employeeId: EMPLOYEE,
    idempotencyKey: 'execute-key',
    title: 'Resumo',
    description: 'Resultado interno.',
  });

  assert.deepEqual(await service.prepareCatalogEmployeeWorkExecution({
    organizationId: ORG,
    employeeId: EMPLOYEE,
    workId: work.id,
    paperclipRunId: '96000000-0000-4000-8000-0000000000a1',
    title: 'Resumo',
    description: 'Resultado interno.',
  }), { kind: 'execute' });

  await assert.rejects(
    service.prepareCatalogEmployeeWorkExecution({
      organizationId: ORG,
      employeeId: EMPLOYEE,
      workId: work.id,
      paperclipRunId: '96000000-0000-4000-8000-0000000000a2',
      title: 'Resumo',
      description: 'Resultado interno.',
    }),
    (error: unknown) => error instanceof DigitalEmployeeWorkError
      && error.code === 'work-execution-uncertain',
  );

  await service.recordCatalogEmployeeWorkResult({
    organizationId: ORG,
    employeeId: EMPLOYEE,
    workId: work.id,
    paperclipRunId: '96000000-0000-4000-8000-0000000000a1',
    executionId: 'exec_fixture',
    model: 'wandora-supervised-v1',
    summary: 'Resumo pronto para revisão.',
  });

  const listed = await service.listCatalogEmployeeWork({
    organizationId: ORG,
    actorUserId: USER,
    employeeId: EMPLOYEE,
  });
  assert.equal(listed[0]?.state, 'review-ready');
  assert.deepEqual(listed[0]?.result, {
    summary: 'Resumo pronto para revisão.',
    model: 'wandora-supervised-v1',
  });
  assert.deepEqual(await service.prepareCatalogEmployeeWorkExecution({
    organizationId: ORG,
    employeeId: EMPLOYEE,
    workId: work.id,
    paperclipRunId: '96000000-0000-4000-8000-0000000000a1',
    title: 'Resumo',
    description: 'Resultado interno.',
  }), {
    kind: 'cached',
    executionId: 'exec_fixture',
    model: 'wandora-supervised-v1',
    summary: 'Resumo pronto para revisão.',
  });
});
