import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { Pool } from 'pg';
import type {
  AgentRuntime,
  EmployeeProposal,
  MessagingGateway,
  OutboundTextMessage,
  PlannerInput,
} from '../src/ana/contracts.js';
import { CoreStateError, PostgresAnaRepository } from '../src/ana/postgres-repository.js';
import { AnaInboundService } from '../src/ana/service.js';

const ORG_A = '00000000-0000-0000-0000-0000000000a1';
const ORG_B = '00000000-0000-0000-0000-0000000000b1';
const OWNER_A = '10000000-0000-0000-0000-0000000000a1';
const OWNER_B = '10000000-0000-0000-0000-0000000000b1';
const CONN_A = '20000000-0000-0000-0000-0000000000a1';
const CONN_B = '20000000-0000-0000-0000-0000000000b1';
const EMP_A = '30000000-0000-0000-0000-0000000000a1';
const EMP_B = '30000000-0000-0000-0000-0000000000b1';
const NOW = '2026-09-14T08:00:00.000Z';

const runtimePool = new Pool({ connectionString: process.env.DATABASE_URL });
const fixturePool = new Pool({ connectionString: process.env.FIXTURE_DATABASE_URL });
const repository = new PostgresAnaRepository(runtimePool);
after(async () => {
  await Promise.all([runtimePool.end(), fixturePool.end()]);
});

class FakeRuntime implements AgentRuntime {
  calls = 0;
  constructor(private readonly fn: (input: PlannerInput, call: number) => EmployeeProposal | Promise<EmployeeProposal>) {}

  async proposeCommercialReply(input: PlannerInput): Promise<EmployeeProposal> {
    this.calls += 1;
    return this.fn(input, this.calls);
  }
}

class FakeMessaging implements MessagingGateway {
  calls: OutboundTextMessage[] = [];
  fail = false;

  async sendText(message: OutboundTextMessage): Promise<{ accepted: true; requestId: string }> {
    this.calls.push(message);
    if (this.fail) throw new Error('synthetic transport failure');
    return { accepted: true, requestId: `req-${this.calls.length}` };
  }
}

const safeProposal = (): EmployeeProposal => ({
  kind: 'send-text',
  text: 'Olá! Posso entender melhor o que você procura?',
  commitment: 'none',
  rationale: 'Qualificação inicial sem compromisso comercial.',
});

const approvalProposal = (): EmployeeProposal => ({
  kind: 'send-text',
  text: 'Posso oferecer 10% de desconto para fechar hoje.',
  commitment: 'discount',
  rationale: 'Cliente pediu uma condição comercial especial.',
});

const event = (eventId: string, connectionId = CONN_A, text = 'Olá, gostaria de saber mais.') => ({
  eventId,
  connectionId,
  sender: '+5551999999999',
  text,
  occurredAt: NOW,
});

async function resetFixture(): Promise<void> {
  await fixturePool.query(`TRUNCATE
    wandora_private.outbound_attempts,
    wandora_private.inbound_event_receipts,
    wandora.audit_records, wandora.approvals, wandora.messages,
    wandora.work_items, wandora.conversations, wandora.contacts,
    wandora.digital_employees, wandora.messaging_connections,
    wandora.memberships, wandora.user_identities, wandora.users,
    wandora.organizations RESTART IDENTITY CASCADE`);

  await fixturePool.query(`INSERT INTO wandora.organizations (id, slug, display_name) VALUES
    ($1, 'org-a', 'Org A'), ($2, 'org-b', 'Org B')`, [ORG_A, ORG_B]);
  await fixturePool.query(`INSERT INTO wandora.users (id, display_name) VALUES
    ($1, 'Owner A'), ($2, 'Owner B')`, [OWNER_A, OWNER_B]);
  await fixturePool.query(`INSERT INTO wandora.memberships (organization_id, user_id, role) VALUES
    ($1, $2, 'owner'), ($3, $4, 'owner')`, [ORG_A, OWNER_A, ORG_B, OWNER_B]);
  await fixturePool.query(`INSERT INTO wandora.messaging_connections
    (id, organization_id, channel, label) VALUES
    ($1, $2, 'whatsapp', 'WhatsApp A'), ($3, $4, 'whatsapp', 'WhatsApp B')`,
    [CONN_A, ORG_A, CONN_B, ORG_B]);
  await fixturePool.query(`INSERT INTO wandora.digital_employees
    (id, organization_id, display_name, role) VALUES
    ($1, $2, 'Ana', 'commercial-assistant'),
    ($3, $4, 'Ana B', 'commercial-assistant')`, [EMP_A, ORG_A, EMP_B, ORG_B]);
}

function service(runtime: FakeRuntime, messaging: FakeMessaging): AnaInboundService {
  return new AnaInboundService({
    repository,
    runtime,
    messaging,
    now: () => NOW,
  });
}

async function scalar(sql: string, params: unknown[] = []): Promise<string> {
  const result = await fixturePool.query<{ value: string }>(sql, params);
  return result.rows[0]!.value;
}

test('ANA VERTICAL SLICE V1 durable service', async (t) => {
  await t.test('runtime RLS is transaction-local and hides other tenants', async () => {
    await resetFixture();
    const client = await runtimePool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('wandora.organization_id', $1, true)`, [ORG_A]);
      const visible = await client.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM wandora.messaging_connections`,
      );
      assert.equal(visible.rows[0]!.count, 1);
      const hidden = await client.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM wandora.messaging_connections WHERE id = $1`, [CONN_B],
      );
      assert.equal(hidden.rows[0]!.count, 0);
      await client.query('COMMIT');
      const noScope = await client.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM wandora.messaging_connections`,
      );
      assert.equal(noScope.rows[0]!.count, 0);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  });

  await t.test('runtime audit writer rejects cross-tenant append', async () => {
    await resetFixture();
    const client = await runtimePool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('wandora.organization_id', $1, true)`, [ORG_A]);
      await assert.rejects(
        client.query(
          `SELECT wandora.append_core_audit(
             $1, 'system', 'wandora-core', 'inbound-accepted',
             'conversation', 'synthetic-subject', 'synthetic-correlation', now())`,
          [ORG_B],
        ),
        /wandora_core_tenant_mismatch/,
      );
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
    assert.equal(await scalar(
      `SELECT count(*)::text AS value FROM wandora.audit_records WHERE organization_id = $1`, [ORG_B]), '0');
  });

  await t.test('safe inbound reply persists once and duplicate event is replay-safe', async () => {
    await resetFixture();
    const runtime = new FakeRuntime(() => safeProposal());
    const messaging = new FakeMessaging();
    const ana = service(runtime, messaging);

    const first = await ana.handle(ORG_A, event('evt-safe-1'));
    assert.equal(first.status, 'replied');
    const second = await ana.handle(ORG_A, event('evt-safe-1'));
    assert.deepEqual(second, first);
    assert.equal(runtime.calls, 1);
    assert.equal(messaging.calls.length, 1);

    assert.deepEqual(await repository.getCounts(ORG_A), {
      contacts: 1, conversations: 1, workItems: 1, approvals: 0, messages: 2,
    });
    assert.equal(await scalar(
      `SELECT count(*)::text AS value FROM wandora.audit_records WHERE organization_id = $1`, [ORG_A]), '2');
  });

  await t.test('approval-required path sends only after authorized human approval', async () => {
    await resetFixture();
    const runtime = new FakeRuntime(() => approvalProposal());
    const messaging = new FakeMessaging();
    const ana = service(runtime, messaging);

    const pending = await ana.handle(ORG_A, event('evt-approval-1'));
    assert.equal(pending.status, 'approval-required');
    if (pending.status !== 'approval-required') throw new Error('unexpected status');
    assert.equal(messaging.calls.length, 0);

    const approved = await ana.decideApproval({
      organizationId: ORG_A,
      approvalId: pending.approvalId,
      actorUserId: OWNER_A,
      decision: 'approve',
    });
    assert.equal(approved.status, 'replied');
    assert.equal(messaging.calls.length, 1);

    const repeated = await ana.decideApproval({
      organizationId: ORG_A, approvalId: pending.approvalId,
      actorUserId: OWNER_A, decision: 'approve',
    });
    assert.deepEqual(repeated, approved);
    assert.equal(messaging.calls.length, 1);
  });

  await t.test('rejected approval is durable, idempotent and never sends', async () => {
    await resetFixture();
    const runtime = new FakeRuntime(() => approvalProposal());
    const messaging = new FakeMessaging();
    const ana = service(runtime, messaging);

    const pending = await ana.handle(ORG_A, event('evt-reject-1'));
    assert.equal(pending.status, 'approval-required');
    if (pending.status !== 'approval-required') throw new Error('unexpected status');

    const rejected = await ana.decideApproval({
      organizationId: ORG_A, approvalId: pending.approvalId,
      actorUserId: OWNER_A, decision: 'reject',
    });
    assert.equal(rejected.status, 'approval-rejected');
    assert.equal(messaging.calls.length, 0);

    const repeated = await ana.decideApproval({
      organizationId: ORG_A, approvalId: pending.approvalId,
      actorUserId: OWNER_A, decision: 'reject',
    });
    assert.deepEqual(repeated, rejected);
    const duplicate = await ana.handle(ORG_A, event('evt-reject-1'));
    assert.deepEqual(duplicate, rejected);
    assert.equal(messaging.calls.length, 0);
  });

  await t.test('other-tenant human cannot decide approval', async () => {
    await resetFixture();
    const runtime = new FakeRuntime(() => approvalProposal());
    const messaging = new FakeMessaging();
    const ana = service(runtime, messaging);

    const pending = await ana.handle(ORG_A, event('evt-authz-1'));
    assert.equal(pending.status, 'approval-required');
    if (pending.status !== 'approval-required') throw new Error('unexpected status');

    await assert.rejects(
      ana.decideApproval({
        organizationId: ORG_A, approvalId: pending.approvalId,
        actorUserId: OWNER_B, decision: 'approve',
      }),
      (error: unknown) => error instanceof CoreStateError && error.code === 'approval_actor_unauthorized',
    );
    assert.equal(messaging.calls.length, 0);
    assert.equal(await scalar(
      `SELECT status::text AS value FROM wandora.approvals WHERE id = $1`, [pending.approvalId]), 'pending');
  });

  await t.test('ambiguous gateway failure becomes durable delivery-uncertain and never retries', async () => {
    await resetFixture();
    const runtime = new FakeRuntime(() => safeProposal());
    const messaging = new FakeMessaging();
    messaging.fail = true;
    const ana = service(runtime, messaging);

    const first = await ana.handle(ORG_A, event('evt-uncertain-1'));
    assert.equal(first.status, 'delivery-uncertain');
    assert.equal(messaging.calls.length, 1);
    const duplicate = await ana.handle(ORG_A, event('evt-uncertain-1'));
    assert.deepEqual(duplicate, first);
    assert.equal(messaging.calls.length, 1);

    assert.equal(await scalar(
      `SELECT status::text AS value FROM wandora.work_items WHERE organization_id = $1`, [ORG_A]),
      'attention-required');
    assert.equal(await scalar(
      `SELECT status::text AS value FROM wandora_private.outbound_attempts WHERE organization_id = $1`, [ORG_A]),
      'uncertain');
  });

  await t.test('foreign or disabled connection fails before customer state is created', async () => {
    await resetFixture();
    const runtime = new FakeRuntime(() => safeProposal());
    const messaging = new FakeMessaging();
    const ana = service(runtime, messaging);

    await assert.rejects(
      ana.handle(ORG_A, event('evt-cross-connection', CONN_B)),
      (error: unknown) => error instanceof CoreStateError && error.code === 'connection_unavailable',
    );
    await fixturePool.query(`UPDATE wandora.messaging_connections SET status = 'disabled' WHERE id = $1`, [CONN_A]);
    await assert.rejects(
      ana.handle(ORG_A, event('evt-disabled-connection')),
      (error: unknown) => error instanceof CoreStateError && error.code === 'connection_unavailable',
    );
    assert.deepEqual(await repository.getCounts(ORG_A), {
      contacts: 0, conversations: 0, workItems: 0, approvals: 0, messages: 0,
    });
    assert.equal(runtime.calls, 0);
    assert.equal(messaging.calls.length, 0);
  });

  await t.test('paused employee fails before customer state is created', async () => {
    await resetFixture();
    await fixturePool.query(`UPDATE wandora.digital_employees SET status = 'paused' WHERE id = $1`, [EMP_A]);
    const runtime = new FakeRuntime(() => safeProposal());
    const messaging = new FakeMessaging();
    const ana = service(runtime, messaging);

    await assert.rejects(
      ana.handle(ORG_A, event('evt-paused-employee')),
      (error: unknown) => error instanceof CoreStateError && error.code === 'employee_unavailable',
    );
    assert.deepEqual(await repository.getCounts(ORG_A), {
      contacts: 0, conversations: 0, workItems: 0, approvals: 0, messages: 0,
    });
    assert.equal(runtime.calls, 0);
    assert.equal(messaging.calls.length, 0);
  });

  await t.test('processing receipt returns event-in-progress instead of racing a duplicate insert', async () => {
    await resetFixture();
    await fixturePool.query(`INSERT INTO wandora_private.inbound_event_receipts
      (organization_id, event_id, messaging_connection_id, status, received_at)
      VALUES ($1, $2, $3, 'processing', $4)`, [ORG_A, 'evt-processing', CONN_A, NOW]);
    const runtime = new FakeRuntime(() => safeProposal());
    const messaging = new FakeMessaging();
    const ana = service(runtime, messaging);

    await assert.rejects(
      ana.handle(ORG_A, event('evt-processing')),
      (error: unknown) => error instanceof CoreStateError && error.code === 'event_in_progress',
    );
    assert.equal(runtime.calls, 0);
    assert.equal(messaging.calls.length, 0);
  });

  await t.test('runtime failure marks receipt failed and same event can be safely retried', async () => {
    await resetFixture();
    const runtime = new FakeRuntime((_input, call) => {
      if (call === 1) throw new Error('synthetic model failure');
      return safeProposal();
    });
    const messaging = new FakeMessaging();
    const ana = service(runtime, messaging);

    await assert.rejects(ana.handle(ORG_A, event('evt-runtime-retry')),
      /synthetic model failure/);
    assert.equal(await scalar(
      `SELECT status::text AS value FROM wandora_private.inbound_event_receipts
        WHERE organization_id = $1 AND event_id = $2`, [ORG_A, 'evt-runtime-retry']), 'failed');

    const retried = await ana.handle(ORG_A, event('evt-runtime-retry'));
    assert.equal(retried.status, 'replied');
    assert.equal(runtime.calls, 2);
    assert.equal(messaging.calls.length, 1);
    assert.deepEqual(await repository.getCounts(ORG_A), {
      contacts: 1, conversations: 1, workItems: 1, approvals: 0, messages: 2,
    });
  });
});
