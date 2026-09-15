import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { Pool } from 'pg';
import { MastraDeterministicAgentRuntime } from '../src/agent-runtime/mastra-deterministic.js';
import type { AgentRuntime } from '../src/ana/contracts.js';
import { PostgresAnaRepository } from '../src/ana/postgres-repository.js';
import { AnaSupervisedIngressService } from '../src/ana/supervised-ingress.js';

const ORG = '00000000-0000-0000-0000-0000000000a1';
const CONN = '20000000-0000-0000-0000-0000000000a1';
const EMP = '30000000-0000-0000-0000-0000000000a1';
const NOW = '2026-09-15T04:00:00.000Z';

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
     VALUES ($1, 'org-a', 'Org A')`,
    [ORG],
  );
  await fixturePool.query(
    `INSERT INTO wandora.messaging_connections (id, organization_id, channel, label)
     VALUES ($1, $2, 'whatsapp', 'WhatsApp A')`,
    [CONN, ORG],
  );
  await fixturePool.query(
    `INSERT INTO wandora.digital_employees
       (id, organization_id, display_name, role, autonomy_mode)
     VALUES ($1, $2, 'Ana', 'commercial-assistant', 'supervised')`,
    [EMP, ORG],
  );
}

async function scalar(sql: string): Promise<string> {
  const result = await fixturePool.query<{ value: string }>(sql);
  return result.rows[0]!.value;
}

test('MASTRA DETERMINISTIC SUPERVISED PROPOSAL V1', async () => {
  await resetFixture();
  const service = new AnaSupervisedIngressService({
    repository,
    pool: runtimePool,
    runtime: new MastraDeterministicAgentRuntime(),
    now: () => NOW,
  });
  const event = {
    eventId: 'evt_mastra_supervised_0000000000000001',
    connectionId: CONN,
    sender: '+5551999999999',
    text: 'Quero entender como funciona.',
    occurredAt: NOW,
  };

  const first = await service.handle(ORG, event);
  assert.equal(first.duplicate, false);
  assert.equal(first.result.status, 'supervision-required');
  assert.deepEqual(first.result.status === 'supervision-required' ? first.result.proposal : undefined, {
    kind: 'send-text',
    text: 'Olá! Obrigado pelo contato. Para eu entender melhor e te orientar, você pode me contar o que precisa?',
    commitment: 'none',
    rationale: 'Proposta determinística de qualificação inicial, sem compromisso comercial.',
  });

  const replay = await service.handle(ORG, event);
  assert.equal(replay.duplicate, true);
  assert.deepEqual(replay.result, first.result);

  assert.equal(await scalar(`SELECT count(*)::text AS value FROM wandora.messages`), '1');
  assert.equal(await scalar(`SELECT count(*)::text AS value FROM wandora.approvals`), '0');
  assert.equal(await scalar(`SELECT count(*)::text AS value FROM wandora.work_proposals`), '1');
  assert.equal(await scalar(`SELECT count(*)::text AS value FROM wandora_private.outbound_attempts`), '0');
  assert.equal(await scalar(`SELECT status::text AS value FROM wandora.work_items LIMIT 1`), 'attention-required');
  assert.equal(await scalar(`SELECT status::text AS value FROM wandora_private.inbound_event_receipts LIMIT 1`), 'completed');
  assert.equal(await scalar(`SELECT result->>'status' AS value FROM wandora_private.inbound_event_receipts LIMIT 1`), 'supervision-required');
  assert.equal(await scalar(`SELECT result->'proposal'->>'commitment' AS value FROM wandora_private.inbound_event_receipts LIMIT 1`), 'none');
  assert.equal(await scalar(`SELECT commitment::text AS value FROM wandora.work_proposals LIMIT 1`), 'none');
  assert.equal(await scalar(`SELECT kind::text AS value FROM wandora.work_proposals LIMIT 1`), 'send-text');
  assert.equal(await scalar(`SELECT proposed_text AS value FROM wandora.work_proposals LIMIT 1`),
    'Olá! Obrigado pelo contato. Para eu entender melhor e te orientar, você pode me contar o que precisa?');
  assert.equal(await scalar(`SELECT count(*)::text AS value FROM wandora_private.inbound_event_receipts`), '1');
});

test('SUPERVISED INGRESS REFUSES COMMITMENT PROPOSALS', async () => {
  await resetFixture();
  const unsafeRuntime: AgentRuntime = {
    async proposeCommercialReply() {
      return {
        kind: 'send-text',
        text: 'Posso conceder 12% de desconto.',
        commitment: 'discount',
        rationale: 'Cliente pediu condição especial.',
      };
    },
  };
  const service = new AnaSupervisedIngressService({
    repository,
    pool: runtimePool,
    runtime: unsafeRuntime,
    now: () => NOW,
  });

  await assert.rejects(
    () => service.handle(ORG, {
      eventId: 'evt_mastra_supervised_unsafe_00000001',
      connectionId: CONN,
      sender: '+5551888888888',
      text: 'Você consegue me dar desconto?',
      occurredAt: NOW,
    }),
    (error: unknown) => error instanceof Error && error.message.includes('without a commercial commitment'),
  );

  assert.equal(await scalar(`SELECT count(*)::text AS value FROM wandora.work_proposals`), '0');
  assert.equal(await scalar(`SELECT count(*)::text AS value FROM wandora.approvals`), '0');
  assert.equal(await scalar(`SELECT count(*)::text AS value FROM wandora_private.outbound_attempts`), '0');
  assert.equal(await scalar(`SELECT status::text AS value FROM wandora.work_items LIMIT 1`), 'in-progress');
  assert.equal(await scalar(`SELECT status::text AS value FROM wandora_private.inbound_event_receipts LIMIT 1`), 'failed');
});
