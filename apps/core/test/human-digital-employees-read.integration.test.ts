import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { Pool } from 'pg';
import { HumanAuthError, type HumanTokenVerifier } from '../src/human-auth/es256-jwks.js';
import { HumanDigitalEmployeesReadService } from '../src/supervision/human-digital-employees-read.js';
import { HumanAccessError, HumanSupervisionReadService } from '../src/supervision/human-read.js';

const ORG_A = '00000000-0000-0000-0000-0000000000a1';
const ORG_B = '00000000-0000-0000-0000-0000000000b1';
const USER = '10000000-0000-0000-0000-0000000000a1';
const EMP_A = '30000000-0000-0000-0000-0000000000a1';
const EMP_A_PAUSED = '30000000-0000-0000-0000-0000000000a2';
const EMP_B = '30000000-0000-0000-0000-0000000000b1';
const SUBJECT = 'supabase-human-subject-a';

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

async function resetFixture(): Promise<void> {
  await fixturePool.query(`TRUNCATE
    wandora_private.outbound_attempts,
    wandora_private.inbound_event_receipts,
    wandora.audit_records, wandora.approvals, wandora.work_proposals,
    wandora.messages, wandora.work_items, wandora.conversations, wandora.contacts,
    wandora.digital_employees, wandora.messaging_connections,
    wandora.memberships, wandora.user_identities, wandora.users,
    wandora.organizations RESTART IDENTITY CASCADE`);

  await fixturePool.query(
    `INSERT INTO wandora.organizations (id, slug, display_name)
     VALUES ($1, 'org-a', 'Org A'), ($2, 'org-b', 'Org B')`,
    [ORG_A, ORG_B],
  );
  await fixturePool.query(
    `INSERT INTO wandora.users (id, display_name) VALUES ($1, 'Gestor A')`,
    [USER],
  );
  await fixturePool.query(
    `INSERT INTO wandora.user_identities (user_id, provider, provider_subject)
     VALUES ($1, 'supabase', $2)`,
    [USER, SUBJECT],
  );
  await fixturePool.query(
    `INSERT INTO wandora.memberships (organization_id, user_id, role, status)
     VALUES ($1, $2, 'owner', 'active')`,
    [ORG_A, USER],
  );
  await fixturePool.query(
    `INSERT INTO wandora.digital_employees
       (id, organization_id, display_name, role, status, autonomy_mode)
     VALUES ($1, $4, 'Ana A', 'commercial-assistant', 'active', 'supervised'),
            ($2, $4, 'Bia A', 'commercial-assistant', 'paused', 'supervised'),
            ($3, $5, 'Segredo B', 'commercial-assistant', 'active', 'supervised')`,
    [EMP_A, EMP_A_PAUSED, EMP_B, ORG_A, ORG_B],
  );
}

async function assertScopeReset(): Promise<void> {
  const result = await runtimePool.query<{ scope: string | null }>(
    `SELECT wandora.current_core_organization_id()::text AS scope`,
  );
  assert.equal(result.rows[0]?.scope, null);
}

function service(): HumanDigitalEmployeesReadService {
  const sessionService = new HumanSupervisionReadService(runtimePool, verifier());
  return new HumanDigitalEmployeesReadService(runtimePool, sessionService);
}

test('active member reads only canonical digital employees from selected tenant', async () => {
  await resetFixture();
  const items = await service().listDigitalEmployees('Bearer valid', ORG_A);

  assert.deepEqual(items, [
    {
      id: EMP_A,
      name: 'Ana A',
      role: 'commercial-assistant',
      status: 'active',
      autonomy: 'supervised',
    },
    {
      id: EMP_A_PAUSED,
      name: 'Bia A',
      role: 'commercial-assistant',
      status: 'paused',
      autonomy: 'supervised',
    },
  ]);
  assert.equal(JSON.stringify(items).includes('Segredo B'), false);
  await assertScopeReset();
});

test('cross-tenant, suspended membership and suspended organization fail closed', async () => {
  await resetFixture();
  const reader = service();

  await assert.rejects(
    reader.listDigitalEmployees('Bearer valid', ORG_B),
    (error: unknown) => error instanceof HumanAccessError && error.code === 'forbidden',
  );
  await assertScopeReset();

  await fixturePool.query(
    `UPDATE wandora.memberships SET status = 'suspended' WHERE organization_id = $1 AND user_id = $2`,
    [ORG_A, USER],
  );
  await assert.rejects(
    reader.listDigitalEmployees('Bearer valid', ORG_A),
    (error: unknown) => error instanceof HumanAccessError && error.code === 'forbidden',
  );
  await assertScopeReset();

  await fixturePool.query(
    `UPDATE wandora.memberships SET status = 'active' WHERE organization_id = $1 AND user_id = $2`,
    [ORG_A, USER],
  );
  await fixturePool.query(
    `UPDATE wandora.organizations SET status = 'suspended' WHERE id = $1`,
    [ORG_A],
  );
  await assert.rejects(
    reader.listDigitalEmployees('Bearer valid', ORG_A),
    (error: unknown) => error instanceof HumanAccessError && error.code === 'forbidden',
  );
  await assertScopeReset();
});

test('invalid bearer token is rejected before tenant read', async () => {
  await resetFixture();
  await assert.rejects(
    service().listDigitalEmployees('Bearer invalid', ORG_A),
    (error: unknown) => error instanceof HumanAuthError && error.code === 'invalid-token',
  );
  await assertScopeReset();
});
