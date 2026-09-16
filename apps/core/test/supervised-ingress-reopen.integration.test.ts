import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { Pool } from 'pg';
import { MastraDeterministicAgentRuntime } from '../src/agent-runtime/mastra-deterministic.js';
import { CoreStateError, PostgresAnaRepository } from '../src/ana/postgres-repository.js';
import { AnaSupervisedIngressService } from '../src/ana/supervised-ingress.js';

const ORG = '00000000-0000-0000-0000-0000000000b1';
const CONN = '20000000-0000-0000-0000-0000000000b1';
const EMP = '30000000-0000-0000-0000-0000000000b1';
const SENDER = '+555190104506';
const T1 = '2026-09-16T06:00:00.000Z';
const T2 = '2026-09-16T06:01:00.000Z';

const runtimePool = new Pool({ connectionString: process.env.DATABASE_URL });
const fixturePool = new Pool({ connectionString: process.env.FIXTURE_DATABASE_URL });
const repository = new PostgresAnaRepository(runtimePool);

after(async () => {
  await Promise.all([runtimePool.end(), fixturePool.end()]);
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
     VALUES ($1, 'reopen-proof', 'Reopen Proof')`, [ORG]);
  await fixturePool.query(
    `INSERT INTO wandora.messaging_connections (id, organization_id, channel, label)
     VALUES ($1, $2, 'whatsapp', 'WhatsApp')`, [CONN, ORG]);
  await fixturePool.query(
    `INSERT INTO wandora.digital_employees
       (id, organization_id, display_name, role, autonomy_mode)
     VALUES ($1, $2, 'Ana', 'commercial-assistant', 'supervised')`, [EMP, ORG]);
}
function service(now: string) {
  return new AnaSupervisedIngressService({
    repository,
    pool: runtimePool,
    runtime: new MastraDeterministicAgentRuntime(),
    now: () => now,
  });
}

function event(id: string, text: string, occurredAt: string) {
  return { eventId: id, connectionId: CONN, sender: SENDER, text, occurredAt };
}

async function value(sql: string, params: unknown[] = []): Promise<string> {
  const result = await fixturePool.query<{ value: string }>(sql, params);
  return result.rows[0]!.value;
}

async function seedFirstAttentionRequired(): Promise<{ workId: string }> {
  const first = await service(T1).handle(
    ORG,
    event('evt_reopen_first_0000000000000001', 'Primeira mensagem.', T1),
  );
  assert.equal(first.result.status, 'supervision-required');
  const workId = await value(
    `SELECT id::text AS value FROM wandora.work_items WHERE organization_id = $1`, [ORG]);
  assert.equal(await value(
    `SELECT status::text AS value FROM wandora.work_items WHERE id = $1`, [workId]),
  'attention-required');
  return { workId };
}
test('new inbound reuses attention-required work and refreshes supervision', async () => {
  await resetFixture();
  const { workId } = await seedFirstAttentionRequired();
  const second = await service(T2).handle(
    ORG,
    event('evt_reopen_attention_00000000000002', 'Nova mensagem do cliente.', T2),
  );
  assert.equal(second.result.status, 'supervision-required');
  assert.equal(await value(`SELECT count(*)::text AS value FROM wandora.work_items`), '1');
  assert.equal(await value(`SELECT id::text AS value FROM wandora.work_items LIMIT 1`), workId);
  assert.equal(await value(`SELECT status::text AS value FROM wandora.work_items LIMIT 1`), 'attention-required');
  assert.equal(await value(`SELECT count(*)::text AS value FROM wandora.messages`), '2');
  assert.equal(await value(`SELECT count(*)::text AS value FROM wandora.work_proposals`), '2');
  assert.equal(await value(
    `SELECT status::text AS value FROM wandora_private.inbound_event_receipts
      WHERE event_id = 'evt_reopen_attention_00000000000002'`), 'completed');
});

test('new inbound reopens waiting-customer work without creating a duplicate work', async () => {
  await resetFixture();
  const { workId } = await seedFirstAttentionRequired();
  await fixturePool.query(
    `UPDATE wandora.work_items SET status = 'waiting-customer' WHERE id = $1`, [workId]);
  const second = await service(T2).handle(
    ORG,
    event('evt_reopen_waiting_0000000000000002', 'Cliente respondeu.', T2),
  );
  assert.equal(second.result.status, 'supervision-required');
  assert.equal(await value(`SELECT count(*)::text AS value FROM wandora.work_items`), '1');
  assert.equal(await value(`SELECT status::text AS value FROM wandora.work_items LIMIT 1`), 'attention-required');
  assert.equal(await value(`SELECT count(*)::text AS value FROM wandora.work_proposals`), '2');
});

test('new inbound does not erase a waiting-approval boundary', async () => {
  await resetFixture();
  const { workId } = await seedFirstAttentionRequired();
  await fixturePool.query(
    `UPDATE wandora.work_items SET status = 'waiting-approval' WHERE id = $1`, [workId]);
  await assert.rejects(
    () => service(T2).handle(
      ORG,
      event('evt_reopen_approval_0000000000000002', 'Nova informação.', T2),
    ),
    (error: unknown) => error instanceof CoreStateError
      && error.code === 'supervised_work_state_conflict',
  );
  assert.equal(await value(`SELECT status::text AS value FROM wandora.work_items LIMIT 1`), 'waiting-approval');
  assert.equal(await value(`SELECT count(*)::text AS value FROM wandora.work_proposals`), '1');
  assert.equal(await value(
    `SELECT status::text AS value FROM wandora_private.inbound_event_receipts
      WHERE event_id = 'evt_reopen_approval_0000000000000002'`), 'failed');
});
