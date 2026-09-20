import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { Pool } from 'pg';
import {
  DigitalEmployeeActivationError,
  type OrganizationAdapterProvider,
} from '../src/organization-adapter/contracts.js';
import { paperclipManagedAgentRef } from '../src/organization-adapter/paperclip-provider.js';
import { OrganizationAdapterService } from '../src/organization-adapter/service.js';
import { HumanAccessError, HumanNotFoundError } from '../src/supervision/human-read.js';

const ORG_A = '81000000-0000-4000-8000-0000000000a1';
const ORG_B = '81000000-0000-4000-8000-0000000000b1';
const USER = '82000000-0000-4000-8000-0000000000a1';
const EMPLOYEE = '83000000-0000-4000-8000-0000000000a1';
const COMPANY_A = '84000000-0000-4000-8000-0000000000a1';
const CATALOG = 'ana-commercial-v1';
const runtimePool = new Pool({ connectionString: process.env.DATABASE_URL });
const fixturePool = new Pool({ connectionString: process.env.FIXTURE_DATABASE_URL });
after(async () => { await Promise.all([runtimePool.end(), fixturePool.end()]); });

class ActivationProvider implements OrganizationAdapterProvider {
  readonly provider = 'paperclip' as const;
  readonly lifecycle = new Map<string, 'paused' | 'idle' | 'running'>();
  activationCalls = 0;
  failAfterResumeOnce = false;
  unavailable = false;

  async reconcileCatalogEmployee(input: { providerCompanyRef: string; catalogKey: string }) {
    const ref = paperclipManagedAgentRef(input.providerCompanyRef, input.catalogKey);
    this.lifecycle.set(ref, 'paused');
    return { providerAgentRef: ref };
  }

  async activateCatalogEmployee(input: { providerCompanyRef: string; catalogKey: string }) {
    this.activationCalls += 1;
    const ref = paperclipManagedAgentRef(input.providerCompanyRef, input.catalogKey);
    if (this.unavailable || !this.lifecycle.has(ref)) throw new Error('provider_unavailable_or_missing');
    const state = this.lifecycle.get(ref);
    if (state === 'running') throw new Error('unexpected_provider_state');
    if (state === 'paused') this.lifecycle.set(ref, 'idle');
    if (this.failAfterResumeOnce) {
      this.failAfterResumeOnce = false;
      throw new Error('synthetic_timeout_after_provider_commit');
    }
    return { providerAgentRef: ref };
  }
}

async function resetFixture(role: 'owner' | 'admin' | 'member' = 'owner'): Promise<string> {
  await fixturePool.query(`TRUNCATE
    wandora_private.digital_employee_catalog_hire_eligibility,
    wandora_private.digital_employee_provider_bindings,
    wandora_private.digital_employee_hire_operations,
    wandora_private.control_plane_provider_bindings,
    wandora.digital_employees,
    wandora.memberships, wandora.user_identities, wandora.users,
    wandora.organizations RESTART IDENTITY CASCADE`);
  await fixturePool.query(
    `INSERT INTO wandora.organizations(id,slug,display_name,status) VALUES
       ($1,'activation-a','Activation A','active'),($2,'activation-b','Activation B','active')`,
    [ORG_A, ORG_B],
  );
  await fixturePool.query(`INSERT INTO wandora.users(id,display_name) VALUES ($1,'Owner')`, [USER]);
  await fixturePool.query(
    `INSERT INTO wandora.memberships(organization_id,user_id,role,status) VALUES ($1,$2,$3,'active')`,
    [ORG_A, USER, role],
  );
  const providerRef = paperclipManagedAgentRef(COMPANY_A, CATALOG);
  await fixturePool.query(
    `INSERT INTO wandora.digital_employees(id,organization_id,display_name,role,status,autonomy_mode)
     VALUES ($1,$2,'Ana','commercial-assistant','paused','supervised')`,
    [EMPLOYEE, ORG_A],
  );
  await fixturePool.query(
    `INSERT INTO wandora_private.control_plane_provider_bindings(organization_id,provider,provider_company_ref)
     VALUES ($1,'paperclip',$2)`,
    [ORG_A, COMPANY_A],
  );
  await fixturePool.query(
    `INSERT INTO wandora_private.digital_employee_provider_bindings(organization_id,employee_id,provider,provider_agent_ref)
     VALUES ($1,$2,'paperclip',$3)`,
    [ORG_A, EMPLOYEE, providerRef],
  );
  await fixturePool.query(
    `INSERT INTO wandora_private.digital_employee_hire_operations
       (organization_id,idempotency_key,request_hash,employee_id,provider,catalog_key,provider_company_ref,status,provider_agent_ref,completed_at)
     VALUES ($1,'activation-hire',$2,$3,'paperclip',$4,$5,'completed',$6,now())`,
    [ORG_A, 'a'.repeat(64), EMPLOYEE, CATALOG, COMPANY_A, providerRef],
  );
  return providerRef;
}

const makeService = (provider: ActivationProvider) => new OrganizationAdapterService(runtimePool, provider);

test('paused provider converges to idle before Wandora becomes active', async () => {
  const ref = await resetFixture();
  const provider = new ActivationProvider();
  provider.lifecycle.set(ref, 'paused');
  const result = await makeService(provider).activateCatalogEmployee({ organizationId: ORG_A, actorUserId: USER, employeeId: EMPLOYEE });
  assert.equal(result.status, 'active');
  assert.equal(provider.lifecycle.get(ref), 'idle');
  assert.equal(provider.activationCalls, 1);
  const local = await fixturePool.query(`SELECT status::text AS status FROM wandora.digital_employees WHERE id=$1`, [EMPLOYEE]);
  assert.equal(local.rows[0]?.status, 'active');
});

test('provider already idle reconciles to active without creating another provider resource', async () => {
  const ref = await resetFixture();
  const provider = new ActivationProvider();
  provider.lifecycle.set(ref, 'idle');
  const result = await makeService(provider).activateCatalogEmployee({ organizationId: ORG_A, actorUserId: USER, employeeId: EMPLOYEE });
  assert.equal(result.status, 'active');
  assert.equal(provider.lifecycle.size, 1);
  assert.equal(provider.activationCalls, 1);
});

test('timeout after provider resume is recovered by the same convergent activation contract', async () => {
  const ref = await resetFixture();
  const provider = new ActivationProvider();
  provider.lifecycle.set(ref, 'paused');
  provider.failAfterResumeOnce = true;
  const result = await makeService(provider).activateCatalogEmployee({ organizationId: ORG_A, actorUserId: USER, employeeId: EMPLOYEE });
  assert.equal(result.status, 'active');
  assert.equal(provider.lifecycle.get(ref), 'idle');
  assert.equal(provider.activationCalls, 2);
});

test('duplicate concurrent activation requests serialize on the employee and produce one provider transition', async () => {
  const ref = await resetFixture();
  const provider = new ActivationProvider();
  provider.lifecycle.set(ref, 'paused');
  const service = makeService(provider);
  const [a, b] = await Promise.all([
    service.activateCatalogEmployee({ organizationId: ORG_A, actorUserId: USER, employeeId: EMPLOYEE }),
    service.activateCatalogEmployee({ organizationId: ORG_A, actorUserId: USER, employeeId: EMPLOYEE }),
  ]);
  assert.equal(a.status, 'active');
  assert.equal(b.status, 'active');
  assert.equal(provider.activationCalls, 1);
});

test('unavailable, missing or unexpected provider state never marks Wandora active', async () => {
  for (const mode of ['unavailable', 'missing', 'running'] as const) {
    const ref = await resetFixture();
    const provider = new ActivationProvider();
    if (mode === 'unavailable') { provider.lifecycle.set(ref, 'paused'); provider.unavailable = true; }
    if (mode === 'running') provider.lifecycle.set(ref, 'running');
    const service = makeService(provider);
    await assert.rejects(
      service.activateCatalogEmployee({ organizationId: ORG_A, actorUserId: USER, employeeId: EMPLOYEE }),
      (error: unknown) => error instanceof DigitalEmployeeActivationError && error.code === 'provider-activation-uncertain',
    );
    const local = await fixturePool.query(`SELECT status::text AS status FROM wandora.digital_employees WHERE id=$1`, [EMPLOYEE]);
    assert.equal(local.rows[0]?.status, 'paused');
  }
});

test('wrong tenant, wrong employee and non-owner fail before provider effect', async () => {
  const ref = await resetFixture('member');
  const provider = new ActivationProvider();
  provider.lifecycle.set(ref, 'paused');
  const service = makeService(provider);
  await assert.rejects(
    service.activateCatalogEmployee({ organizationId: ORG_A, actorUserId: USER, employeeId: EMPLOYEE }),
    (error: unknown) => error instanceof HumanAccessError,
  );
  assert.equal(provider.activationCalls, 0);

  await resetFixture('owner');
  await assert.rejects(
    makeService(provider).activateCatalogEmployee({ organizationId: ORG_B, actorUserId: USER, employeeId: EMPLOYEE }),
    (error: unknown) => error instanceof HumanAccessError,
  );
  await assert.rejects(
    makeService(provider).activateCatalogEmployee({
      organizationId: ORG_A,
      actorUserId: USER,
      employeeId: '83000000-0000-4000-8000-0000000000ff',
    }),
    (error: unknown) => error instanceof HumanNotFoundError,
  );
  assert.equal(provider.activationCalls, 0);
});

test('missing completed hire or employee binding fails before provider effect and control binding cannot orphan dependents', async () => {
  for (const table of ['wandora_private.digital_employee_hire_operations', 'wandora_private.digital_employee_provider_bindings']) {
    const ref = await resetFixture();
    const provider = new ActivationProvider();
    provider.lifecycle.set(ref, 'paused');
    await fixturePool.query(`DELETE FROM ${table} WHERE organization_id=$1`, [ORG_A]);
    await assert.rejects(
      makeService(provider).activateCatalogEmployee({ organizationId: ORG_A, actorUserId: USER, employeeId: EMPLOYEE }),
      (error: unknown) => error instanceof DigitalEmployeeActivationError && error.code === 'employee-not-activatable',
    );
    assert.equal(provider.activationCalls, 0);
  }

  const ref = await resetFixture();
  const provider = new ActivationProvider();
  provider.lifecycle.set(ref, 'paused');
  await assert.rejects(
    fixturePool.query(
      `DELETE FROM wandora_private.control_plane_provider_bindings
        WHERE organization_id=$1 AND provider='paperclip'`,
      [ORG_A],
    ),
    (error: unknown) => (
      typeof error === 'object'
      && error !== null
      && 'code' in error
      && error.code === '23503'
    ),
  );
  assert.equal(provider.activationCalls, 0);
});
