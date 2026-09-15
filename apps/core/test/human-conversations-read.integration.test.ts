import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { Pool } from 'pg';
import { HumanAuthError, type HumanTokenVerifier } from '../src/human-auth/es256-jwks.js';
import { HumanAccessError, HumanSupervisionReadService } from '../src/supervision/human-read.js';

const ORG_A = '00000000-0000-0000-0000-0000000000a1';
const ORG_B = '00000000-0000-0000-0000-0000000000b1';
const USER = '10000000-0000-0000-0000-0000000000a1';
const CONN_A = '20000000-0000-0000-0000-0000000000a1';
const CONN_B = '20000000-0000-0000-0000-0000000000b1';
const EMP_A = '30000000-0000-0000-0000-0000000000a1';
const EMP_B = '30000000-0000-0000-0000-0000000000b1';
const CONTACT_A = '40000000-0000-0000-0000-0000000000a1';
const CONTACT_B = '40000000-0000-0000-0000-0000000000b1';
const CONV_A = '50000000-0000-0000-0000-0000000000a1';
const CONV_B = '50000000-0000-0000-0000-0000000000b1';
const WORK_A = '60000000-0000-0000-0000-0000000000a1';
const WORK_B = '60000000-0000-0000-0000-0000000000b1';
const SUBJECT = 'supabase-human-subject-a';
const NOW = '2026-09-15T18:30:00.000Z';

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
    `INSERT INTO wandora.messaging_connections (id, organization_id, channel, label)
     VALUES ($1, $3, 'whatsapp', 'Canal A'), ($2, $4, 'whatsapp', 'Canal B')`,
    [CONN_A, CONN_B, ORG_A, ORG_B],
  );
  await fixturePool.query(
    `INSERT INTO wandora.digital_employees (id, organization_id, display_name, role, autonomy_mode)
     VALUES ($1, $3, 'Ana A', 'commercial-assistant', 'supervised'),
            ($2, $4, 'Ana B', 'commercial-assistant', 'supervised')`,
    [EMP_A, EMP_B, ORG_A, ORG_B],
  );
  await fixturePool.query(
    `INSERT INTO wandora.contacts (id, organization_id, channel, channel_address, display_name)
     VALUES ($1, $3, 'whatsapp', '+5551999990001', 'Cliente A'),
            ($2, $4, 'whatsapp', '+5551999990002', 'Cliente B')`,
    [CONTACT_A, CONTACT_B, ORG_A, ORG_B],
  );
  await fixturePool.query(
    `INSERT INTO wandora.conversations (id, organization_id, messaging_connection_id, contact_id)
     VALUES ($1, $3, $5, $7), ($2, $4, $6, $8)`,
    [CONV_A, CONV_B, ORG_A, ORG_B, CONN_A, CONN_B, CONTACT_A, CONTACT_B],
  );
  await fixturePool.query(
    `INSERT INTO wandora.messages
       (organization_id, conversation_id, direction, body, source_event_id, occurred_at)
     VALUES ($1, $3, 'inbound', 'Mensagem canônica A', 'evt_a_private', $5),
            ($2, $4, 'inbound', 'Segredo da empresa B', 'evt_b_private', $5)`,
    [ORG_A, ORG_B, CONV_A, CONV_B, NOW],
  );
  await fixturePool.query(
    `INSERT INTO wandora.work_items (id, organization_id, employee_id, conversation_id, kind, status)
     VALUES ($1, $3, $5, $7, 'qualify-new-contact', 'attention-required'),
            ($2, $4, $6, $8, 'qualify-new-contact', 'attention-required')`,
    [WORK_A, WORK_B, ORG_A, ORG_B, EMP_A, EMP_B, CONV_A, CONV_B],
  );
}

async function assertScopeReset(): Promise<void> {
  const result = await runtimePool.query<{ scope: string | null }>(
    `SELECT wandora.current_core_organization_id()::text AS scope`,
  );
  assert.equal(result.rows[0]?.scope, null);
}

async function sideEffectCounts(): Promise<[number, number, number]> {
  const approvals = await fixturePool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM wandora.approvals`,
  );
  const attempts = await fixturePool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM wandora_private.outbound_attempts`,
  );
  const outboundMessages = await fixturePool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM wandora.messages WHERE direction = 'outbound'`,
  );
  return [
    Number(approvals.rows[0]?.count ?? 0),
    Number(attempts.rows[0]?.count ?? 0),
    Number(outboundMessages.rows[0]?.count ?? 0),
  ];
}

test('active member lists only selected tenant canonical conversations', async () => {
  await resetFixture();
  const service = new HumanSupervisionReadService(runtimePool, verifier());
  const before = await sideEffectCounts();
  const items = await service.listConversations('Bearer valid', ORG_A);
  const afterCounts = await sideEffectCounts();

  assert.equal(items.length, 1);
  assert.equal(items[0]?.conversation.id, CONV_A);
  assert.equal(items[0]?.conversation.status, 'open');
  assert.equal(items[0]?.contact.label, 'Cliente A');
  assert.equal(items[0]?.employee?.name, 'Ana A');
  assert.equal(items[0]?.latestMessage?.direction, 'inbound');
  assert.equal(items[0]?.latestMessage?.text, 'Mensagem canônica A');
  assert.equal(JSON.stringify(items).includes('Segredo da empresa B'), false);
  assert.equal(JSON.stringify(items).includes('evt_'), false);
  assert.equal(JSON.stringify(items).includes(CONN_A), false);
  assert.deepEqual(afterCounts, before);
  assert.deepEqual(afterCounts, [0, 0, 0]);
  await assertScopeReset();
});

test('conversation read denies cross-tenant and inactive tenant access', async () => {
  await resetFixture();
  const service = new HumanSupervisionReadService(runtimePool, verifier());

  await assert.rejects(
    service.listConversations('Bearer valid', ORG_B),
    (error: unknown) => error instanceof HumanAccessError && error.code === 'forbidden',
  );
  await assertScopeReset();

  await fixturePool.query(
    `UPDATE wandora.memberships SET status = 'suspended' WHERE organization_id = $1 AND user_id = $2`,
    [ORG_A, USER],
  );
  await assert.rejects(
    service.listConversations('Bearer valid', ORG_A),
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
    service.listConversations('Bearer valid', ORG_A),
    (error: unknown) => error instanceof HumanAccessError && error.code === 'forbidden',
  );
  await assertScopeReset();
});

test('conversation read denies unknown identity and invalid bearer token', async () => {
  await resetFixture();
  const unknownService = new HumanSupervisionReadService(runtimePool, verifier('unknown-supabase-subject'));
  await assert.rejects(
    unknownService.listConversations('Bearer valid', ORG_A),
    (error: unknown) => error instanceof HumanAccessError && error.code === 'identity-unlinked',
  );
  await assertScopeReset();

  const service = new HumanSupervisionReadService(runtimePool, verifier());
  await assert.rejects(
    service.listConversations('Bearer invalid', ORG_A),
    (error: unknown) => error instanceof HumanAuthError && error.code === 'invalid-token',
  );
  await assertScopeReset();
});
