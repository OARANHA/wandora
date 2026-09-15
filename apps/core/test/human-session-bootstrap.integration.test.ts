import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { Pool } from 'pg';
import { HumanAuthError, type HumanTokenVerifier } from '../src/human-auth/es256-jwks.js';
import { HumanAccessError, HumanSupervisionReadService } from '../src/supervision/human-read.js';

const ORG_A = '00000000-0000-0000-0000-0000000000a1';
const ORG_B = '00000000-0000-0000-0000-0000000000b1';
const USER = '10000000-0000-0000-0000-0000000000a1';
const SUBJECT = 'supabase-bootstrap-subject-a';

const runtimePool = new Pool({ connectionString: process.env.DATABASE_URL });
const fixturePool = new Pool({ connectionString: process.env.FIXTURE_DATABASE_URL });

after(async () => {
  await Promise.all([runtimePool.end(), fixturePool.end()]);
});

const verifier = (subject = SUBJECT): HumanTokenVerifier => ({
  async verifyAuthorization(authorization) {
    if (authorization !== 'Bearer valid') {
      throw new HumanAuthError('invalid-token', 'invalid fixture token');
    }
    return { subject };
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
    `INSERT INTO wandora.organizations (id, slug, display_name, status)
     VALUES ($1, 'org-a', 'Org A', 'active'), ($2, 'org-b', 'Org B', 'active')`,
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
     VALUES ($1, $3, 'owner', 'active'), ($2, $3, 'admin', 'suspended')`,
    [ORG_A, ORG_B, USER],
  );
}

test('session bootstrap exposes only canonical user and active organizations', async () => {
  await resetFixture();
  const service = new HumanSupervisionReadService(runtimePool, verifier());
  const session = await service.getSessionContext('Bearer valid');

  assert.deepEqual(session, {
    user: { id: USER, name: 'Gestor A' },
    organizations: [{ id: ORG_A, slug: 'org-a', name: 'Org A', role: 'owner' }],
  });
  const encoded = JSON.stringify(session);
  assert.equal(encoded.includes(SUBJECT), false);
  assert.equal(encoded.includes('supabase'), false);
});

test('bootstrap returns every active membership and excludes suspended organizations', async () => {
  await resetFixture();
  await fixturePool.query(
    `UPDATE wandora.memberships SET status = 'active' WHERE organization_id = $1 AND user_id = $2`,
    [ORG_B, USER],
  );

  const service = new HumanSupervisionReadService(runtimePool, verifier());
  const both = await service.getSessionContext('Bearer valid');
  assert.deepEqual(both.organizations, [
    { id: ORG_A, slug: 'org-a', name: 'Org A', role: 'owner' },
    { id: ORG_B, slug: 'org-b', name: 'Org B', role: 'admin' },
  ]);

  await fixturePool.query(`UPDATE wandora.organizations SET status = 'suspended' WHERE id = $1`, [ORG_B]);
  const filtered = await service.getSessionContext('Bearer valid');
  assert.deepEqual(filtered.organizations, [
    { id: ORG_A, slug: 'org-a', name: 'Org A', role: 'owner' },
  ]);
});

test('linked human without an active organization remains a valid session', async () => {
  await resetFixture();
  await fixturePool.query(
    `UPDATE wandora.memberships SET status = 'suspended' WHERE user_id = $1`,
    [USER],
  );
  const service = new HumanSupervisionReadService(runtimePool, verifier());
  const session = await service.getSessionContext('Bearer valid');
  assert.equal(session.user.id, USER);
  assert.deepEqual(session.organizations, []);
});

test('unknown identity and invalid bearer token fail before product context is returned', async () => {
  await resetFixture();
  const unknown = new HumanSupervisionReadService(runtimePool, verifier('unknown-bootstrap-subject'));
  await assert.rejects(
    unknown.getSessionContext('Bearer valid'),
    (error: unknown) => error instanceof HumanAccessError && error.code === 'identity-unlinked',
  );

  const service = new HumanSupervisionReadService(runtimePool, verifier());
  await assert.rejects(
    service.getSessionContext('Bearer invalid'),
    (error: unknown) => error instanceof HumanAuthError && error.code === 'invalid-token',
  );
});
