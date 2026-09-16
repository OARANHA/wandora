import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { Pool } from 'pg';
import { HumanAuthError, type HumanTokenVerifier } from '../src/human-auth/es256-jwks.js';
import type { PrivateGatewayClient, PrivateGatewayTextCommand } from '../src/messaging/private-gateway.js';
import { HumanAccessError } from '../src/supervision/human-read.js';
import {
  HumanSendProposalConflictError,
  HumanSendProposalDeliveryUncertainError,
  HumanSendProposalService,
} from '../src/supervision/human-send-proposal.js';

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
const PROPOSAL_A = '70000000-0000-0000-0000-0000000000a1';
const PROPOSAL_B = '70000000-0000-0000-0000-0000000000b1';
const EVENT_A = 'evt_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const EVENT_B = 'evt_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const EVENT_NEW = 'evt_cccccccccccccccccccccccccccccccc';
const SUBJECT = 'supabase-human-send-subject-a';
const NOW = '2026-09-15T20:00:00.000Z';
const LATER = '2026-09-15T20:01:00.000Z';
const DUMMY_CONFIRMATION = `sha256:${'0'.repeat(64)}`;

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

function successfulGateway(captured: PrivateGatewayTextCommand[] = []): PrivateGatewayClient {
  return {
    async sendText(command) {
      captured.push(command);
      return { accepted: true, requestId: command.idempotencyKey };
    },
  };
}


async function readyConfirmation(
  service: HumanSendProposalService,
  organizationId = ORG_A,
  proposalId = PROPOSAL_A,
): Promise<{ recipientMasked: string; text: string; version: string }> {
  const states = await service.getAttentionActionStates({
    authorization: 'Bearer valid', organizationId, proposalIds: [proposalId],
  });
  const action = states.get(proposalId);
  assert.equal(action?.state, 'ready');
  if (!action || action.state !== 'ready') throw new Error('Expected ready confirmation.');
  assert.match(action.confirmation.version, /^sha256:[0-9a-f]{64}$/);
  return action.confirmation;
}

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
     VALUES ($1, $3, 'whatsapp', 'WhatsApp A'), ($2, $4, 'whatsapp', 'WhatsApp B')`,
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
     VALUES ($1, $3, 'inbound', 'Preciso de ajuda com a empresa A', $5, $7),
            ($2, $4, 'inbound', 'Segredo da empresa B', $6, $7)`,
    [ORG_A, ORG_B, CONV_A, CONV_B, EVENT_A, EVENT_B, NOW],
  );
  await fixturePool.query(
    `INSERT INTO wandora.work_items (id, organization_id, employee_id, conversation_id, kind, status)
     VALUES ($1, $3, $5, $7, 'qualify-new-contact', 'attention-required'),
            ($2, $4, $6, $8, 'qualify-new-contact', 'attention-required')`,
    [WORK_A, WORK_B, ORG_A, ORG_B, EMP_A, EMP_B, CONV_A, CONV_B],
  );
  await fixturePool.query(
    `INSERT INTO wandora.work_proposals
       (id, organization_id, employee_id, work_item_id, conversation_id, source_event_id,
        kind, proposed_text, commitment, rationale, created_at)
     VALUES ($1, $3, $5, $7, $9, $11, 'send-text', 'Resposta segura A', 'none', 'Qualificação A', $13),
            ($2, $4, $6, $8, $10, $12, 'send-text', 'Resposta secreta B', 'none', 'Qualificação B', $13)`,
    [PROPOSAL_A, PROPOSAL_B, ORG_A, ORG_B, EMP_A, EMP_B, WORK_A, WORK_B,
     CONV_A, CONV_B, EVENT_A, EVENT_B, NOW],
  );
  await fixturePool.query(
    `INSERT INTO wandora_private.inbound_event_receipts
       (organization_id, event_id, messaging_connection_id, status, result, received_at, completed_at)
     VALUES ($1, $2, $3, 'completed', $4::jsonb, $5, $5)`,
    [ORG_A, EVENT_A, CONN_A, JSON.stringify({ status: 'supervision-required' }), NOW],
  );
}

async function assertScopeReset(): Promise<void> {
  const result = await runtimePool.query<{ scope: string | null }>(
    `SELECT wandora.current_core_organization_id()::text AS scope`,
  );
  assert.equal(result.rows[0]?.scope, null);
}

test('owner sends only the canonical proposal and replay never calls Gateway twice', async () => {
  await resetFixture();
  const calls: PrivateGatewayTextCommand[] = [];
  const service = new HumanSendProposalService(runtimePool, verifier(), successfulGateway(calls), CONN_A, () => NOW);

  const confirmation = await readyConfirmation(service);
  assert.equal(confirmation.text, 'Resposta segura A');
  assert.match(confirmation.recipientMasked, /^\+5551.*0001$/);

  const first = await service.sendProposal({
    authorization: 'Bearer valid', organizationId: ORG_A, workItemId: WORK_A, proposalId: PROPOSAL_A,
    confirmationVersion: confirmation.version,
  });
  const second = await service.sendProposal({
    authorization: 'Bearer valid', organizationId: ORG_A, workItemId: WORK_A, proposalId: PROPOSAL_A,
    confirmationVersion: confirmation.version,
  });
  assert.deepEqual(second, first);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    connectionId: CONN_A,
    recipient: '+5551999990001',
    text: 'Resposta segura A',
    idempotencyKey: `proposal-send:${PROPOSAL_A}`,
  });

  const attempt = await fixturePool.query(
    `SELECT status::text AS status, proposal_id::text AS proposal_id,
            requested_by_user_id::text AS requested_by_user_id, gateway_request_id
       FROM wandora_private.outbound_attempts WHERE organization_id = $1`,
    [ORG_A],
  );
  assert.deepEqual(attempt.rows, [{
    status: 'succeeded', proposal_id: PROPOSAL_A,
    requested_by_user_id: USER, gateway_request_id: `proposal-send:${PROPOSAL_A}`,
  }]);

  const outbound = await fixturePool.query(
    `SELECT body, source_event_id FROM wandora.messages
      WHERE organization_id = $1 AND direction = 'outbound'`,
    [ORG_A],
  );
  assert.deepEqual(outbound.rows, [{
    body: 'Resposta segura A', source_event_id: `proposal-send:${PROPOSAL_A}`,
  }]);

  const work = await fixturePool.query(`SELECT status::text AS status FROM wandora.work_items WHERE id = $1`, [WORK_A]);
  assert.equal(work.rows[0]?.status, 'waiting-customer');

  const audits = await fixturePool.query(
    `SELECT actor_type::text AS actor_type, actor_id, action::text AS action, correlation_id
       FROM wandora.audit_records WHERE organization_id = $1 ORDER BY created_at, id`,
    [ORG_A],
  );
  assert.deepEqual(audits.rows.map((row) => row.action), ['proposal-send-requested', 'outbound-sent']);
  assert.equal(audits.rows[0]?.actor_type, 'human');
  assert.equal(audits.rows[0]?.actor_id, USER);
  assert.equal(audits.rows[0]?.correlation_id, `proposal-send:${PROPOSAL_A}`);

  const receipt = await fixturePool.query(
    `SELECT result FROM wandora_private.inbound_event_receipts WHERE organization_id = $1 AND event_id = $2`,
    [ORG_A, EVENT_A],
  );
  assert.deepEqual(receipt.rows[0]?.result, { status: 'supervision-required' });
  await assertScopeReset();
});

test('member, foreign tenant, suspended membership and suspended organization fail before Gateway', async () => {
  await resetFixture();
  const calls: PrivateGatewayTextCommand[] = [];
  const service = new HumanSendProposalService(runtimePool, verifier(), successfulGateway(calls), CONN_A, () => NOW);

  await fixturePool.query(`UPDATE wandora.memberships SET role = 'member' WHERE organization_id = $1 AND user_id = $2`, [ORG_A, USER]);
  await assert.rejects(
    service.sendProposal({ authorization: 'Bearer valid', organizationId: ORG_A, workItemId: WORK_A, proposalId: PROPOSAL_A, confirmationVersion: DUMMY_CONFIRMATION }),
    (error: unknown) => error instanceof HumanAccessError && error.code === 'forbidden',
  );

  await fixturePool.query(`UPDATE wandora.memberships SET role = 'owner' WHERE organization_id = $1 AND user_id = $2`, [ORG_A, USER]);
  await assert.rejects(
    service.sendProposal({ authorization: 'Bearer valid', organizationId: ORG_B, workItemId: WORK_B, proposalId: PROPOSAL_B, confirmationVersion: DUMMY_CONFIRMATION }),
    (error: unknown) => error instanceof HumanAccessError && error.code === 'forbidden',
  );

  await fixturePool.query(`UPDATE wandora.memberships SET status = 'suspended' WHERE organization_id = $1 AND user_id = $2`, [ORG_A, USER]);
  await assert.rejects(
    service.sendProposal({ authorization: 'Bearer valid', organizationId: ORG_A, workItemId: WORK_A, proposalId: PROPOSAL_A, confirmationVersion: DUMMY_CONFIRMATION }),
    (error: unknown) => error instanceof HumanAccessError && error.code === 'forbidden',
  );

  await fixturePool.query(`UPDATE wandora.memberships SET status = 'active' WHERE organization_id = $1 AND user_id = $2`, [ORG_A, USER]);
  await fixturePool.query(`UPDATE wandora.organizations SET status = 'suspended' WHERE id = $1`, [ORG_A]);
  await assert.rejects(
    service.sendProposal({ authorization: 'Bearer valid', organizationId: ORG_A, workItemId: WORK_A, proposalId: PROPOSAL_A, confirmationVersion: DUMMY_CONFIRMATION }),
    (error: unknown) => error instanceof HumanAccessError && error.code === 'forbidden',
  );

  assert.equal(calls.length, 0);
  const attempts = await fixturePool.query(`SELECT count(*)::int AS count FROM wandora_private.outbound_attempts`);
  assert.equal(attempts.rows[0]?.count, 0);
  await assertScopeReset();
});

test('stale proposal and configured-connection mismatch fail closed before durable attempt', async () => {
  await resetFixture();
  const calls: PrivateGatewayTextCommand[] = [];
  const service = new HumanSendProposalService(runtimePool, verifier(), successfulGateway(calls), CONN_A, () => NOW);

  await fixturePool.query(
    `INSERT INTO wandora.messages
       (organization_id, conversation_id, direction, body, source_event_id, occurred_at)
     VALUES ($1, $2, 'inbound', 'Mensagem mais nova', $3, $4)`,
    [ORG_A, CONV_A, EVENT_NEW, LATER],
  );
  await assert.rejects(
    service.sendProposal({ authorization: 'Bearer valid', organizationId: ORG_A, workItemId: WORK_A, proposalId: PROPOSAL_A, confirmationVersion: DUMMY_CONFIRMATION }),
    (error: unknown) => error instanceof HumanSendProposalConflictError && error.code === 'proposal-not-current',
  );
  assert.equal(calls.length, 0);

  await resetFixture();
  const wrongConnectionService = new HumanSendProposalService(
    runtimePool, verifier(), successfulGateway(calls), CONN_B, () => NOW,
  );
  await assert.rejects(
    wrongConnectionService.sendProposal({ authorization: 'Bearer valid', organizationId: ORG_A, workItemId: WORK_A, proposalId: PROPOSAL_A, confirmationVersion: DUMMY_CONFIRMATION }),
    (error: unknown) => error instanceof HumanSendProposalConflictError && error.code === 'send-unavailable',
  );
  assert.equal(calls.length, 0);
  const attempts = await fixturePool.query(`SELECT count(*)::int AS count FROM wandora_private.outbound_attempts`);
  assert.equal(attempts.rows[0]?.count, 0);
});

test('canonical confirmation binds reviewed effect and stale recipient fails before durable attempt', async () => {
  await resetFixture();
  const calls: PrivateGatewayTextCommand[] = [];
  const service = new HumanSendProposalService(runtimePool, verifier(), successfulGateway(calls), CONN_A, () => NOW);
  const reviewed = await readyConfirmation(service);

  await fixturePool.query(
    `UPDATE wandora.contacts SET channel_address = '+5551888880001' WHERE organization_id = $1 AND id = $2`,
    [ORG_A, CONTACT_A],
  );

  await assert.rejects(
    service.sendProposal({
      authorization: 'Bearer valid', organizationId: ORG_A, workItemId: WORK_A, proposalId: PROPOSAL_A,
      confirmationVersion: reviewed.version,
    }),
    (error: unknown) => error instanceof HumanSendProposalConflictError && error.code === 'confirmation-stale',
  );
  assert.equal(calls.length, 0);
  const before = await fixturePool.query(`SELECT count(*)::int AS count FROM wandora_private.outbound_attempts`);
  assert.equal(before.rows[0]?.count, 0);

  const refreshed = await readyConfirmation(service);
  assert.notEqual(refreshed.version, reviewed.version);
  assert.equal(refreshed.text, reviewed.text);
  assert.match(refreshed.recipientMasked, /^\+5551.*0001$/);

  await service.sendProposal({
    authorization: 'Bearer valid', organizationId: ORG_A, workItemId: WORK_A, proposalId: PROPOSAL_A,
    confirmationVersion: refreshed.version,
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.recipient, '+5551888880001');
  assert.equal(calls[0]?.text, 'Resposta segura A');
});

test('ambiguous Gateway delivery becomes durable uncertain and replay never calls Gateway again', async () => {
  await resetFixture();
  let calls = 0;
  const gateway: PrivateGatewayClient = {
    async sendText() {
      calls += 1;
      throw new Error('provider timeout');
    },
  };
  const service = new HumanSendProposalService(runtimePool, verifier(), gateway, CONN_A, () => NOW);
  const confirmation = await readyConfirmation(service);

  await assert.rejects(
    service.sendProposal({ authorization: 'Bearer valid', organizationId: ORG_A, workItemId: WORK_A, proposalId: PROPOSAL_A, confirmationVersion: confirmation.version }),
    (error: unknown) => error instanceof HumanSendProposalDeliveryUncertainError,
  );
  await assert.rejects(
    service.sendProposal({ authorization: 'Bearer valid', organizationId: ORG_A, workItemId: WORK_A, proposalId: PROPOSAL_A, confirmationVersion: confirmation.version }),
    (error: unknown) => error instanceof HumanSendProposalDeliveryUncertainError,
  );
  assert.equal(calls, 1);

  const attempt = await fixturePool.query(
    `SELECT status::text AS status FROM wandora_private.outbound_attempts
      WHERE organization_id = $1 AND proposal_id = $2`,
    [ORG_A, PROPOSAL_A],
  );
  assert.equal(attempt.rows[0]?.status, 'uncertain');
  const outbound = await fixturePool.query(
    `SELECT count(*)::int AS count FROM wandora.messages
      WHERE organization_id = $1 AND direction = 'outbound'`,
    [ORG_A],
  );
  assert.equal(outbound.rows[0]?.count, 0);
  const work = await fixturePool.query(`SELECT status::text AS status FROM wandora.work_items WHERE id = $1`, [WORK_A]);
  assert.equal(work.rows[0]?.status, 'attention-required');
  const uncertainAudit = await fixturePool.query(
    `SELECT count(*)::int AS count FROM wandora.audit_records
      WHERE organization_id = $1 AND action = 'outbound-uncertain'`,
    [ORG_A],
  );
  assert.equal(uncertainAudit.rows[0]?.count, 1);

  const states = await service.getAttentionActionStates({
    authorization: 'Bearer valid', organizationId: ORG_A, proposalIds: [PROPOSAL_A],
  });
  assert.deepEqual(states.get(PROPOSAL_A), { state: 'delivery-uncertain' });
});

test('new inbound arriving during provider call keeps newer supervision state after old send completes', async () => {
  await resetFixture();
  let releaseGateway!: () => void;
  let markGatewayCalled!: () => void;
  const gatewayCalled = new Promise<void>((resolve) => { markGatewayCalled = resolve; });
  const gateway: PrivateGatewayClient = {
    async sendText(command) {
      markGatewayCalled();
      await new Promise<void>((resolve) => { releaseGateway = resolve; });
      return { accepted: true, requestId: command.idempotencyKey };
    },
  };
  const service = new HumanSendProposalService(runtimePool, verifier(), gateway, CONN_A, () => NOW);
  const confirmation = await readyConfirmation(service);

  const pending = service.sendProposal({
    authorization: 'Bearer valid', organizationId: ORG_A, workItemId: WORK_A, proposalId: PROPOSAL_A,
    confirmationVersion: confirmation.version,
  });
  await gatewayCalled;

  const proposalNew = '70000000-0000-0000-0000-0000000000c1';
  await fixturePool.query(
    `INSERT INTO wandora.messages
       (organization_id, conversation_id, direction, body, source_event_id, occurred_at)
     VALUES ($1, $2, 'inbound', 'Chegou enquanto enviava', $3, $4)`,
    [ORG_A, CONV_A, EVENT_NEW, LATER],
  );
  await fixturePool.query(
    `INSERT INTO wandora.work_proposals
       (id, organization_id, employee_id, work_item_id, conversation_id, source_event_id,
        kind, proposed_text, commitment, rationale, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'send-text', 'Resposta nova', 'none', 'Novo contexto', $7)`,
    [proposalNew, ORG_A, EMP_A, WORK_A, CONV_A, EVENT_NEW, LATER],
  );
  await fixturePool.query(
    `UPDATE wandora.work_items SET status = 'attention-required', updated_at = $2
      WHERE organization_id = $1 AND id = $3`,
    [ORG_A, LATER, WORK_A],
  );

  releaseGateway();
  const result = await pending;
  assert.equal(result.status, 'sent');

  const work = await fixturePool.query(`SELECT status::text AS status FROM wandora.work_items WHERE id = $1`, [WORK_A]);
  assert.equal(work.rows[0]?.status, 'attention-required');
  const outbound = await fixturePool.query(
    `SELECT count(*)::int AS count FROM wandora.messages
      WHERE organization_id = $1 AND direction = 'outbound'`,
    [ORG_A],
  );
  assert.equal(outbound.rows[0]?.count, 1);
});
