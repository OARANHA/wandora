import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { Pool } from 'pg';
import { HumanAuthError, type HumanTokenVerifier } from '../src/human-auth/es256-jwks.js';
import { HumanDigitalEmployeesReadService } from '../src/supervision/human-digital-employees-read.js';
import { HumanSupervisionReadService } from '../src/supervision/human-read.js';

const ORG_A = '71000000-0000-4000-8000-0000000000a1';
const USER = '72000000-0000-4000-8000-0000000000a1';
const EMPLOYEE = '73000000-0000-4000-8000-0000000000a1';
const SUBJECT = 'supabase-hire-eligibility-subject-a';

const runtimePool = new Pool({ connectionString: process.env.DATABASE_URL });
const fixturePool = new Pool({ connectionString: process.env.FIXTURE_DATABASE_URL });

after(async () => {
  await Promise.all([runtimePool.end(), fixturePool.end()]);
});

const verifier = (): HumanTokenVerifier => ({
  async verifyAuthorization(authorization) {
    if (authorization !== 'Bearer valid') {
      throw new HumanAuthError('invalid-token', 'invalid fixture token');
    }
    return { subject: SUBJECT };
  },
});

function service(runtimeEnabled = true): HumanDigitalEmployeesReadService {
  return new HumanDigitalEmployeesReadService(
    runtimePool,
    new HumanSupervisionReadService(runtimePool, verifier()),
    runtimeEnabled,
  );
}

async function resetFixture(role: 'owner' | 'admin' | 'member' = 'owner'): Promise<void> {
  await fixturePool.query(`TRUNCATE
    wandora_private.digital_employee_catalog_hire_eligibility,
    wandora_private.digital_employee_provider_bindings,
    wandora_private.digital_employee_hire_operations,
    wandora_private.control_plane_provider_bindings,
    wandora.digital_employees,
    wandora.memberships, wandora.user_identities, wandora.users,
    wandora.organizations RESTART IDENTITY CASCADE`);

  await fixturePool.query(
    `INSERT INTO wandora.organizations (id, slug, display_name)
     VALUES ($1, 'hire-view-a', 'Hire View A')`,
    [ORG_A],
  );
  await fixturePool.query(
    `INSERT INTO wandora.users (id, display_name) VALUES ($1, 'Gestor Hire')`,
    [USER],
  );
  await fixturePool.query(
    `INSERT INTO wandora.user_identities (user_id, provider, provider_subject)
     VALUES ($1, 'supabase', $2)`,
    [USER, SUBJECT],
  );
  await fixturePool.query(
    `INSERT INTO wandora.memberships (organization_id, user_id, role, status)
     VALUES ($1, $2, $3, 'active')`,
    [ORG_A, USER, role],
  );
  await fixturePool.query(
    `INSERT INTO wandora_private.control_plane_provider_bindings
       (organization_id, provider, provider_company_ref)
     VALUES ($1, 'paperclip', 'paperclip-hire-view-a')`,
    [ORG_A],
  );
  await fixturePool.query(
    `INSERT INTO wandora_private.digital_employee_catalog_hire_eligibility
       (organization_id, catalog_key, enabled)
     VALUES ($1, 'ana-commercial-v1', true)`,
    [ORG_A],
  );
}

test('eligible owner sees provider-neutral available catalog hire', async () => {
  await resetFixture('owner');
  const view = await service().getDigitalEmployeesView('Bearer valid', ORG_A);

  assert.deepEqual(view, {
    items: [],
    hire: {
      catalogKey: 'ana-commercial-v1',
      available: true,
      state: 'available',
    },
  });
  const json = JSON.stringify(view);
  assert.equal(json.includes('paperclip'), false);
  assert.equal(json.includes('provider'), false);
  assert.equal(json.includes('secret'), false);
});

test('runtime gate off, eligibility off and member role all project unavailable', async () => {
  await resetFixture('owner');

  const runtimeOff = await service(false).getDigitalEmployeesView('Bearer valid', ORG_A);
  assert.deepEqual(runtimeOff.hire, {
    catalogKey: 'ana-commercial-v1',
    available: false,
    state: 'unavailable',
  });

  await fixturePool.query(
    `UPDATE wandora_private.digital_employee_catalog_hire_eligibility
        SET enabled=false
      WHERE organization_id=$1 AND catalog_key='ana-commercial-v1'`,
    [ORG_A],
  );
  const eligibilityOff = await service().getDigitalEmployeesView('Bearer valid', ORG_A);
  assert.deepEqual(eligibilityOff.hire, {
    catalogKey: 'ana-commercial-v1',
    available: false,
    state: 'unavailable',
  });

  await fixturePool.query(
    `UPDATE wandora_private.digital_employee_catalog_hire_eligibility
        SET enabled=true
      WHERE organization_id=$1 AND catalog_key='ana-commercial-v1'`,
    [ORG_A],
  );
  await fixturePool.query(
    `UPDATE wandora.memberships
        SET role='member'
      WHERE organization_id=$1 AND user_id=$2`,
    [ORG_A, USER],
  );
  const member = await service().getDigitalEmployeesView('Bearer valid', ORG_A);
  assert.deepEqual(member.hire, {
    catalogKey: 'ana-commercial-v1',
    available: false,
    state: 'unavailable',
  });
});

test('matching legacy employee keeps hire unavailable before any provider operation', async () => {
  await resetFixture('owner');
  await fixturePool.query(
    `INSERT INTO wandora.digital_employees
       (id, organization_id, display_name, role, status, autonomy_mode)
     VALUES ($1, $2, 'Ana', 'commercial-assistant', 'active', 'supervised')`,
    [EMPLOYEE, ORG_A],
  );

  const view = await service().getDigitalEmployeesView('Bearer valid', ORG_A);
  assert.equal(view.hire.available, false);
  assert.equal(view.hire.state, 'unavailable');
});

test('unfinished operation projects reconciliation-required even after eligibility is disabled', async () => {
  await resetFixture('owner');
  await fixturePool.query(
    `INSERT INTO wandora_private.digital_employee_hire_operations
       (organization_id, idempotency_key, request_hash, employee_id, provider,
        catalog_key, provider_company_ref, status)
     VALUES ($1, 'hire-view-uncertain', repeat('a',64), $2, 'paperclip',
             'ana-commercial-v1', 'paperclip-hire-view-a', 'uncertain')`,
    [ORG_A, EMPLOYEE],
  );
  await fixturePool.query(
    `UPDATE wandora_private.digital_employee_catalog_hire_eligibility
        SET enabled=false
      WHERE organization_id=$1 AND catalog_key='ana-commercial-v1'`,
    [ORG_A],
  );

  const view = await service().getDigitalEmployeesView('Bearer valid', ORG_A);
  assert.deepEqual(view.hire, {
    catalogKey: 'ana-commercial-v1',
    available: false,
    state: 'reconciliation-required',
  });
});

test('completed catalog operation projects already-hired and preserves canonical employee read', async () => {
  await resetFixture('owner');
  await fixturePool.query(
    `INSERT INTO wandora_private.digital_employee_hire_operations
       (organization_id, idempotency_key, request_hash, employee_id, provider,
        catalog_key, provider_company_ref, status, provider_agent_ref, completed_at)
     VALUES ($1, 'hire-view-completed', repeat('b',64), $2, 'paperclip',
             'ana-commercial-v1', 'paperclip-hire-view-a', 'completed',
             'paperclip-agent-hire-view-a', now())`,
    [ORG_A, EMPLOYEE],
  );
  await fixturePool.query(
    `INSERT INTO wandora.digital_employees
       (id, organization_id, display_name, role, status, autonomy_mode)
     VALUES ($2, $1, 'Ana', 'commercial-assistant', 'paused', 'supervised')`,
    [ORG_A, EMPLOYEE],
  );
  await fixturePool.query(
    `INSERT INTO wandora_private.digital_employee_provider_bindings
       (organization_id, employee_id, provider, provider_agent_ref)
     VALUES ($1, $2, 'paperclip', 'paperclip-agent-hire-view-a')`,
    [ORG_A, EMPLOYEE],
  );
  await fixturePool.query(
    `UPDATE wandora_private.digital_employee_catalog_hire_eligibility
        SET enabled=false
      WHERE organization_id=$1 AND catalog_key='ana-commercial-v1'`,
    [ORG_A],
  );

  const view = await service().getDigitalEmployeesView('Bearer valid', ORG_A);
  assert.deepEqual(view.hire, {
    catalogKey: 'ana-commercial-v1',
    available: false,
    state: 'already-hired',
  });
  assert.deepEqual(view.items, [{
    id: EMPLOYEE,
    name: 'Ana',
    role: 'commercial-assistant',
    status: 'paused',
    autonomy: 'supervised',
    activation: {
      available: false,
      state: 'unavailable',
    },
  }]);
});
