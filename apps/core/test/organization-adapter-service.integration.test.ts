import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { Pool } from 'pg';
import {
  OrganizationAdapterConflictError,
  OrganizationAdapterUnavailableError,
  type CatalogEmployeeDefinition,
  type OrganizationAdapterProvider,
} from '../src/organization-adapter/contracts.js';
import { OrganizationAdapterService } from '../src/organization-adapter/service.js';
import { HumanAccessError } from '../src/supervision/human-read.js';

const ORG_A = '51000000-0000-4000-8000-0000000000a1';
const ORG_B = '51000000-0000-4000-8000-0000000000b1';
const USER = '52000000-0000-4000-8000-0000000000a1';
const EMPLOYEE = '53000000-0000-4000-8000-0000000000a1';
const NOW = '2026-09-16T22:00:00.000Z';

const runtimePool = new Pool({ connectionString: process.env.DATABASE_URL });
const fixturePool = new Pool({ connectionString: process.env.FIXTURE_DATABASE_URL });

after(async () => {
  await Promise.all([runtimePool.end(), fixturePool.end()]);
});

class MemoryPaperclipProvider implements OrganizationAdapterProvider {
  readonly provider = 'paperclip' as const;
  readonly calls: Array<{ providerCompanyRef: string; catalogKey: string }> = [];
  readonly resources = new Map<string, string>();
  failAfterCreateOnce = false;

  async reconcileCatalogEmployee(input: { providerCompanyRef: string; catalogKey: string }) {
    this.calls.push(input);
    const key = `${input.providerCompanyRef}:${input.catalogKey}`;
    let providerAgentRef = this.resources.get(key);
    if (!providerAgentRef) {
      providerAgentRef = `managed:${input.providerCompanyRef}:${input.catalogKey}`;
      this.resources.set(key, providerAgentRef);
    }
    if (this.failAfterCreateOnce) {
      this.failAfterCreateOnce = false;
      throw new Error('synthetic_ambiguous_provider_response');
    }
    return { providerAgentRef };
  }
}

const TEST_CATALOG: ReadonlyMap<string, CatalogEmployeeDefinition> = new Map([
  ['ana-commercial-v1', {
    key: 'ana-commercial-v1', displayName: 'Ana', role: 'commercial-assistant', autonomy: 'supervised',
  }],
  ['ana-commercial-v2-test-only', {
    key: 'ana-commercial-v2-test-only', displayName: 'Ana V2 Test', role: 'commercial-assistant', autonomy: 'supervised',
  }],
]);

async function resetFixture(role: 'owner' | 'admin' | 'member' = 'owner'): Promise<void> {
  await fixturePool.query(`TRUNCATE
    wandora_private.digital_employee_provider_bindings,
    wandora_private.digital_employee_hire_operations,
    wandora_private.control_plane_provider_bindings,
    wandora.digital_employees,
    wandora.memberships, wandora.user_identities, wandora.users,
    wandora.organizations RESTART IDENTITY CASCADE`);
  await fixturePool.query(
    `INSERT INTO wandora.organizations(id,slug,display_name) VALUES
       ($1,'adapter-org-a','Adapter Org A'),($2,'adapter-org-b','Adapter Org B')`,
    [ORG_A, ORG_B],
  );
  await fixturePool.query(`INSERT INTO wandora.users(id,display_name) VALUES ($1,'Gestor')`, [USER]);
  await fixturePool.query(
    `INSERT INTO wandora.memberships(organization_id,user_id,role,status)
     VALUES ($1,$2,$3,'active')`,
    [ORG_A, USER, role],
  );
  await fixturePool.query(
    `INSERT INTO wandora_private.control_plane_provider_bindings
       (organization_id,provider,provider_company_ref) VALUES
       ($1,'paperclip','paperclip-company-a'),($2,'paperclip','paperclip-company-b')`,
    [ORG_A, ORG_B],
  );
}

const makeService = (provider: MemoryPaperclipProvider) => new OrganizationAdapterService(
  runtimePool,
  provider,
  TEST_CATALOG,
  () => EMPLOYEE,
  () => NOW,
);

test('owner gets one canonical employee across same-key and new-key replays without provider leakage', async () => {
  await resetFixture();
  const provider = new MemoryPaperclipProvider();
  const service = makeService(provider);

  const first = await service.ensureCatalogEmployee({
    organizationId: ORG_A, actorUserId: USER, catalogKey: 'ana-commercial-v1', idempotencyKey: 'hire-ana-1',
  });
  const replay = await service.ensureCatalogEmployee({
    organizationId: ORG_A, actorUserId: USER, catalogKey: 'ana-commercial-v1', idempotencyKey: 'hire-ana-1',
  });
  const resourceReplay = await service.ensureCatalogEmployee({
    organizationId: ORG_A, actorUserId: USER, catalogKey: 'ana-commercial-v1', idempotencyKey: 'hire-ana-2',
  });

  assert.deepEqual(first, { id: EMPLOYEE, name: 'Ana', role: 'commercial-assistant', status: 'active', autonomy: 'supervised' });
  assert.deepEqual(replay, first);
  assert.deepEqual(resourceReplay, first);
  assert.equal(provider.calls.length, 1);
  assert.deepEqual(Object.keys(first).sort(), ['autonomy', 'id', 'name', 'role', 'status']);

  const counts = await fixturePool.query(
    `SELECT
       (SELECT count(*)::int FROM wandora.digital_employees) AS employees,
       (SELECT count(*)::int FROM wandora_private.digital_employee_provider_bindings) AS bindings,
       (SELECT count(*)::int FROM wandora_private.digital_employee_hire_operations) AS operations`,
  );
  assert.deepEqual(counts.rows[0], { employees: 1, bindings: 1, operations: 1 });
});

test('same idempotency key with a changed canonical request fails before another provider call', async () => {
  await resetFixture();
  const provider = new MemoryPaperclipProvider();
  const service = makeService(provider);
  await service.ensureCatalogEmployee({
    organizationId: ORG_A, actorUserId: USER, catalogKey: 'ana-commercial-v1', idempotencyKey: 'hire-conflict',
  });

  await assert.rejects(
    service.ensureCatalogEmployee({
      organizationId: ORG_A, actorUserId: USER, catalogKey: 'ana-commercial-v2-test-only', idempotencyKey: 'hire-conflict',
    }),
    (error: unknown) => error instanceof OrganizationAdapterConflictError && error.code === 'idempotency-conflict',
  );
  assert.equal(provider.calls.length, 1);
});

test('member and foreign organization fail before journal reservation or provider effect', async () => {
  await resetFixture('member');
  const provider = new MemoryPaperclipProvider();
  const service = makeService(provider);
  await assert.rejects(
    service.ensureCatalogEmployee({
      organizationId: ORG_A, actorUserId: USER, catalogKey: 'ana-commercial-v1', idempotencyKey: 'member-denied',
    }),
    (error: unknown) => error instanceof HumanAccessError && error.code === 'forbidden',
  );

  await fixturePool.query(`UPDATE wandora.memberships SET role='owner' WHERE organization_id=$1 AND user_id=$2`, [ORG_A, USER]);
  await assert.rejects(
    service.ensureCatalogEmployee({
      organizationId: ORG_B, actorUserId: USER, catalogKey: 'ana-commercial-v1', idempotencyKey: 'foreign-denied',
    }),
    (error: unknown) => error instanceof HumanAccessError && error.code === 'forbidden',
  );
  assert.equal(provider.calls.length, 0);
  const operations = await fixturePool.query(`SELECT count(*)::int AS count FROM wandora_private.digital_employee_hire_operations`);
  assert.equal(operations.rows[0]?.count, 0);
});

test('ambiguous provider success is repaired with the frozen company snapshot and the same managed resource', async () => {
  await resetFixture();
  const provider = new MemoryPaperclipProvider();
  provider.failAfterCreateOnce = true;
  const service = makeService(provider);

  await assert.rejects(
    service.ensureCatalogEmployee({
      organizationId: ORG_A, actorUserId: USER, catalogKey: 'ana-commercial-v1', idempotencyKey: 'hire-ambiguous',
    }),
    (error: unknown) => error instanceof OrganizationAdapterUnavailableError && error.code === 'provider-operation-uncertain',
  );

  const afterFailure = await fixturePool.query(
    `SELECT status::text AS status, provider_company_ref,
            (SELECT count(*)::int FROM wandora.digital_employees) AS employee_count
       FROM wandora_private.digital_employee_hire_operations
      WHERE organization_id=$1`,
    [ORG_A],
  );
  assert.deepEqual(afterFailure.rows[0], {
    status: 'uncertain', provider_company_ref: 'paperclip-company-a', employee_count: 0,
  });

  await fixturePool.query(
    `UPDATE wandora_private.control_plane_provider_bindings
        SET provider_company_ref='paperclip-company-a-replaced'
      WHERE organization_id=$1 AND provider='paperclip'`,
    [ORG_A],
  );

  const repaired = await service.ensureCatalogEmployee({
    organizationId: ORG_A, actorUserId: USER, catalogKey: 'ana-commercial-v1', idempotencyKey: 'hire-ambiguous',
  });
  assert.equal(repaired.id, EMPLOYEE);
  assert.equal(provider.calls.length, 2);
  assert.equal(provider.calls[0]?.providerCompanyRef, 'paperclip-company-a');
  assert.equal(provider.calls[1]?.providerCompanyRef, 'paperclip-company-a');
  assert.equal(provider.resources.size, 1);

  const final = await fixturePool.query(
    `SELECT status::text AS status, provider_agent_ref, completed_at IS NOT NULL AS completed
       FROM wandora_private.digital_employee_hire_operations WHERE organization_id=$1`,
    [ORG_A],
  );
  assert.equal(final.rows[0]?.status, 'completed');
  assert.equal(final.rows[0]?.completed, true);
  assert.match(final.rows[0]?.provider_agent_ref ?? '', /^managed:paperclip-company-a:/);
});

test('unknown catalog key fails before durable or provider effects', async () => {
  await resetFixture();
  const provider = new MemoryPaperclipProvider();
  const service = makeService(provider);
  await assert.rejects(
    service.ensureCatalogEmployee({
      organizationId: ORG_A, actorUserId: USER, catalogKey: 'custom-agent', idempotencyKey: 'custom-denied',
    }),
    (error: unknown) => error instanceof OrganizationAdapterUnavailableError && error.code === 'catalog-employee-unknown',
  );
  assert.equal(provider.calls.length, 0);
});
