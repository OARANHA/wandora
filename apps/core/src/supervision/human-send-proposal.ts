import type { Pool, PoolClient } from 'pg';
import type { HumanTokenVerifier } from '../human-auth/es256-jwks.js';
import type { PrivateGatewayClient } from '../messaging/private-gateway.js';
import { HumanAccessError, HumanNotFoundError } from './human-read.js';

const RECIPIENT_RE = /^\+?[1-9]\d{7,14}$/;

export type HumanSendProposalConflictCode = 'proposal-not-current' | 'send-unavailable';

export class HumanSendProposalConflictError extends Error {
  constructor(readonly code: HumanSendProposalConflictCode, message: string) {
    super(message);
    this.name = 'HumanSendProposalConflictError';
  }
}

export class HumanSendProposalDeliveryUncertainError extends Error {
  constructor(message = 'Delivery state is uncertain and must not be retried automatically.') {
    super(message);
    this.name = 'HumanSendProposalDeliveryUncertainError';
  }
}

export type HumanSendProposalResult = {
  status: 'sent';
  proposalId: string;
  conversationId: string;
};

type ProposalContextRow = {
  proposal_id: string;
  proposal_kind: 'send-text';
  proposal_text: string;
  proposal_commitment: 'none';
  proposal_source_event_id: string;
  latest_proposal_id: string;
  work_item_id: string;
  work_status: 'in-progress' | 'waiting-approval' | 'waiting-customer' | 'attention-required' | 'completed';
  employee_id: string;
  employee_status: 'active' | 'paused';
  employee_autonomy_mode: 'supervised';
  conversation_id: string;
  conversation_status: 'open' | 'closed';
  connection_id: string;
  connection_status: 'active' | 'disabled';
  connection_channel: 'whatsapp';
  recipient: string;
  latest_message_direction: 'inbound' | 'outbound' | null;
  latest_message_source_event_id: string | null;
};

type AttemptRow = {
  proposal_id: string | null;
  requested_by_user_id: string | null;
  employee_id: string;
  work_item_id: string;
  conversation_id: string;
  source_event_id: string;
  idempotency_key: string;
  body: string;
  status: 'planned' | 'sending' | 'succeeded' | 'uncertain';
  gateway_request_id: string | null;
};

type PreparedSend = {
  kind: 'ready';
  organizationId: string;
  proposalId: string;
  actorUserId: string;
  employeeId: string;
  workItemId: string;
  conversationId: string;
  sourceEventId: string;
  connectionId: string;
  recipient: string;
  text: string;
  idempotencyKey: string;
};

type ExistingSuccess = {
  kind: 'succeeded';
  result: HumanSendProposalResult;
};

type Preparation = PreparedSend | ExistingSuccess;

const proposalIdempotencyKey = (proposalId: string): string => `proposal-send:${proposalId}`;

export class HumanSendProposalService {
  private readonly now: () => string;

  constructor(
    private readonly pool: Pool,
    private readonly verifier: HumanTokenVerifier,
    private readonly gateway: PrivateGatewayClient,
    private readonly outboundConnectionId: string,
    now?: () => string,
  ) {
    this.now = now ?? (() => new Date().toISOString());
  }

  private async resolveUserId(subject: string): Promise<string | undefined> {
    const result = await this.pool.query<{ user_id: string | null }>(
      `SELECT wandora.resolve_core_user_id('supabase', $1)::text AS user_id`,
      [subject],
    );
    return result.rows[0]?.user_id ?? undefined;
  }

  private async authenticateUser(authorization: string | undefined): Promise<string> {
    const identity = await this.verifier.verifyAuthorization(authorization);
    const userId = await this.resolveUserId(identity.subject);
    if (!userId) {
      throw new HumanAccessError('identity-unlinked', 'Authenticated identity is not linked to Wandora.');
    }
    return userId;
  }

  private async scopedWrite<T>(organizationId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('wandora.organization_id', $1, true)`, [organizationId]);
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  private async requireOwnerOrAdmin(
    client: PoolClient,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const membership = await client.query(
      `SELECT m.role
         FROM wandora.memberships m
         JOIN wandora.organizations o ON o.id = m.organization_id
        WHERE m.organization_id = $1
          AND m.user_id = $2
          AND m.status = 'active'
          AND o.status = 'active'
          AND m.role IN ('owner', 'admin')
        LIMIT 1`,
      [organizationId, userId],
    );
    if (membership.rowCount !== 1) {
      throw new HumanAccessError('forbidden', 'Human actor cannot send supervised proposals for this organization.');
    }
  }

  private async prepare(
    organizationId: string,
    workItemId: string,
    proposalId: string,
    actorUserId: string,
  ): Promise<Preparation> {
    const idempotencyKey = proposalIdempotencyKey(proposalId);
    const requestedAt = this.now();

    return this.scopedWrite(organizationId, async (client) => {
      await this.requireOwnerOrAdmin(client, organizationId, actorUserId);

      const contextResult = await client.query<ProposalContextRow>(
        `SELECT p.id::text AS proposal_id,
                p.kind::text AS proposal_kind,
                p.proposed_text AS proposal_text,
                p.commitment::text AS proposal_commitment,
                p.source_event_id AS proposal_source_event_id,
                lp.id::text AS latest_proposal_id,
                wi.id::text AS work_item_id,
                wi.status::text AS work_status,
                de.id::text AS employee_id,
                de.status::text AS employee_status,
                de.autonomy_mode::text AS employee_autonomy_mode,
                cv.id::text AS conversation_id,
                cv.status::text AS conversation_status,
                mc.id::text AS connection_id,
                mc.status::text AS connection_status,
                mc.channel::text AS connection_channel,
                ct.channel_address AS recipient,
                lm.direction::text AS latest_message_direction,
                lm.source_event_id AS latest_message_source_event_id
           FROM wandora.work_proposals p
           JOIN wandora.work_items wi
             ON wi.organization_id = p.organization_id AND wi.id = p.work_item_id
           JOIN wandora.digital_employees de
             ON de.organization_id = wi.organization_id AND de.id = wi.employee_id
           JOIN wandora.conversations cv
             ON cv.organization_id = wi.organization_id AND cv.id = wi.conversation_id
           JOIN wandora.messaging_connections mc
             ON mc.organization_id = cv.organization_id AND mc.id = cv.messaging_connection_id
           JOIN wandora.contacts ct
             ON ct.organization_id = cv.organization_id AND ct.id = cv.contact_id
           JOIN LATERAL (
             SELECT p2.id
               FROM wandora.work_proposals p2
              WHERE p2.organization_id = wi.organization_id
                AND p2.work_item_id = wi.id
              ORDER BY p2.created_at DESC, p2.id DESC
              LIMIT 1
           ) lp ON true
           LEFT JOIN LATERAL (
             SELECT m.direction, m.source_event_id
               FROM wandora.messages m
              WHERE m.organization_id = cv.organization_id
                AND m.conversation_id = cv.id
              ORDER BY m.occurred_at DESC, m.created_at DESC, m.id DESC
              LIMIT 1
           ) lm ON true
          WHERE p.organization_id = $1
            AND p.id = $2
            AND wi.id = $3
          FOR UPDATE OF wi`,
        [organizationId, proposalId, workItemId],
      );
      const context = contextResult.rows[0];
      if (!context) throw new HumanNotFoundError();

      const attemptResult = await client.query<AttemptRow>(
        `SELECT proposal_id::text AS proposal_id,
                requested_by_user_id::text AS requested_by_user_id,
                employee_id::text AS employee_id,
                work_item_id::text AS work_item_id,
                conversation_id::text AS conversation_id,
                source_event_id,
                idempotency_key,
                body,
                status::text AS status,
                gateway_request_id
           FROM wandora_private.outbound_attempts
          WHERE organization_id = $1
            AND (proposal_id = $2 OR idempotency_key = $3)
          FOR UPDATE`,
        [organizationId, proposalId, idempotencyKey],
      );
      const attempt = attemptResult.rows[0];
      if (attempt) {
        const matches = attempt.proposal_id === proposalId
          && attempt.employee_id === context.employee_id
          && attempt.work_item_id === context.work_item_id
          && attempt.conversation_id === context.conversation_id
          && attempt.source_event_id === context.proposal_source_event_id
          && attempt.idempotency_key === idempotencyKey
          && attempt.body === context.proposal_text;
        if (!matches) throw new Error('Human proposal outbound attempt context is inconsistent.');

        if (attempt.status === 'succeeded' && attempt.gateway_request_id) {
          return {
            kind: 'succeeded',
            result: {
              status: 'sent',
              proposalId,
              conversationId: context.conversation_id,
            },
          };
        }
        throw new HumanSendProposalDeliveryUncertainError();
      }

      const proposalCurrent = context.work_status === 'attention-required'
        && context.proposal_kind === 'send-text'
        && context.proposal_commitment === 'none'
        && context.latest_proposal_id === proposalId
        && context.latest_message_direction === 'inbound'
        && context.latest_message_source_event_id === context.proposal_source_event_id;
      if (!proposalCurrent) {
        throw new HumanSendProposalConflictError(
          'proposal-not-current',
          'The proposal is no longer the current response for this work item.',
        );
      }

      const channelAvailable = context.employee_status === 'active'
        && context.employee_autonomy_mode === 'supervised'
        && context.conversation_status === 'open'
        && context.connection_status === 'active'
        && context.connection_channel === 'whatsapp'
        && context.connection_id === this.outboundConnectionId
        && RECIPIENT_RE.test(context.recipient);
      if (!channelAvailable) {
        throw new HumanSendProposalConflictError(
          'send-unavailable',
          'The canonical messaging channel is not available for supervised send.',
        );
      }

      await client.query(
        `INSERT INTO wandora_private.outbound_attempts
           (organization_id, employee_id, work_item_id, conversation_id,
            source_event_id, idempotency_key, body, status, proposal_id, requested_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'sending', $8, $9)`,
        [organizationId, context.employee_id, context.work_item_id, context.conversation_id,
         context.proposal_source_event_id, idempotencyKey, context.proposal_text, proposalId, actorUserId],
      );

      await client.query(
        `SELECT wandora.append_core_audit(
           $1, 'human'::wandora.audit_actor_type, $2,
           'proposal-send-requested'::wandora.audit_action, 'work-proposal', $3, $4, $5
         )`,
        [organizationId, actorUserId, proposalId, idempotencyKey, requestedAt],
      );

      return {
        kind: 'ready',
        organizationId,
        proposalId,
        actorUserId,
        employeeId: context.employee_id,
        workItemId: context.work_item_id,
        conversationId: context.conversation_id,
        sourceEventId: context.proposal_source_event_id,
        connectionId: context.connection_id,
        recipient: context.recipient,
        text: context.proposal_text,
        idempotencyKey,
      };
    });
  }

  private async completeSuccess(prepared: PreparedSend, gatewayRequestId: string): Promise<HumanSendProposalResult> {
    const occurredAt = this.now();
    return this.scopedWrite(prepared.organizationId, async (client) => {
      const attemptResult = await client.query<AttemptRow>(
        `SELECT proposal_id::text AS proposal_id,
                requested_by_user_id::text AS requested_by_user_id,
                employee_id::text AS employee_id,
                work_item_id::text AS work_item_id,
                conversation_id::text AS conversation_id,
                source_event_id,
                idempotency_key,
                body,
                status::text AS status,
                gateway_request_id
           FROM wandora_private.outbound_attempts
          WHERE organization_id = $1 AND idempotency_key = $2
          FOR UPDATE`,
        [prepared.organizationId, prepared.idempotencyKey],
      );
      const attempt = attemptResult.rows[0];
      if (!attempt) throw new Error('Human proposal outbound attempt is missing during completion.');
      if (attempt.status === 'succeeded') {
        return {
          status: 'sent',
          proposalId: prepared.proposalId,
          conversationId: prepared.conversationId,
        };
      }
      if (attempt.status !== 'sending') throw new HumanSendProposalDeliveryUncertainError();

      const currentResult = await client.query<{
        work_status: string;
        latest_proposal_id: string | null;
        latest_inbound_source_event_id: string | null;
      }>(
        `SELECT wi.status::text AS work_status,
                lp.id::text AS latest_proposal_id,
                lm.source_event_id AS latest_inbound_source_event_id
           FROM wandora.work_items wi
           LEFT JOIN LATERAL (
             SELECT p.id
               FROM wandora.work_proposals p
              WHERE p.organization_id = wi.organization_id
                AND p.work_item_id = wi.id
              ORDER BY p.created_at DESC, p.id DESC
              LIMIT 1
           ) lp ON true
           LEFT JOIN LATERAL (
             SELECT m.source_event_id
               FROM wandora.messages m
              WHERE m.organization_id = wi.organization_id
                AND m.conversation_id = wi.conversation_id
                AND m.direction = 'inbound'
              ORDER BY m.occurred_at DESC, m.created_at DESC, m.id DESC
              LIMIT 1
           ) lm ON true
          WHERE wi.organization_id = $1 AND wi.id = $2
          FOR UPDATE OF wi`,
        [prepared.organizationId, prepared.workItemId],
      );
      const current = currentResult.rows[0];
      if (!current) throw new Error('Human proposal work item is missing during completion.');

      const updated = await client.query(
        `UPDATE wandora_private.outbound_attempts
            SET status = 'succeeded', gateway_request_id = $3
          WHERE organization_id = $1 AND idempotency_key = $2 AND status = 'sending'`,
        [prepared.organizationId, prepared.idempotencyKey, gatewayRequestId],
      );
      if (updated.rowCount !== 1) throw new HumanSendProposalDeliveryUncertainError();

      await client.query(
        `INSERT INTO wandora.messages
           (organization_id, conversation_id, direction, body, source_event_id, occurred_at)
         VALUES ($1, $2, 'outbound', $3, $4, $5)
         ON CONFLICT (organization_id, source_event_id) WHERE direction = 'outbound'
         DO NOTHING`,
        [prepared.organizationId, prepared.conversationId, prepared.text, prepared.idempotencyKey, occurredAt],
      );

      const sameSupervisionContext = current.work_status === 'attention-required'
        && current.latest_proposal_id === prepared.proposalId
        && current.latest_inbound_source_event_id === prepared.sourceEventId;
      if (sameSupervisionContext) {
        await client.query(
          `UPDATE wandora.work_items SET status = 'waiting-customer'
            WHERE organization_id = $1 AND id = $2 AND status = 'attention-required'`,
          [prepared.organizationId, prepared.workItemId],
        );
      }

      await client.query(
        `SELECT wandora.append_core_audit(
           $1, 'system'::wandora.audit_actor_type, 'wandora-core',
           'outbound-sent'::wandora.audit_action, 'conversation', $2, $3, $4
         )`,
        [prepared.organizationId, prepared.conversationId, prepared.idempotencyKey, occurredAt],
      );

      return {
        status: 'sent',
        proposalId: prepared.proposalId,
        conversationId: prepared.conversationId,
      };
    });
  }

  private async completeUncertain(prepared: PreparedSend): Promise<void> {
    const occurredAt = this.now();
    await this.scopedWrite(prepared.organizationId, async (client) => {
      const updated = await client.query(
        `UPDATE wandora_private.outbound_attempts
            SET status = 'uncertain'
          WHERE organization_id = $1 AND idempotency_key = $2
            AND status IN ('planned', 'sending', 'uncertain')`,
        [prepared.organizationId, prepared.idempotencyKey],
      );
      if (updated.rowCount !== 1) {
        const existing = await client.query<{ status: string }>(
          `SELECT status::text AS status
             FROM wandora_private.outbound_attempts
            WHERE organization_id = $1 AND idempotency_key = $2`,
          [prepared.organizationId, prepared.idempotencyKey],
        );
        if (existing.rows[0]?.status !== 'succeeded') {
          throw new Error('Human proposal outbound attempt cannot be marked uncertain.');
        }
        return;
      }

      await client.query(
        `SELECT wandora.append_core_audit(
           $1, 'system'::wandora.audit_actor_type, 'wandora-core',
           'outbound-uncertain'::wandora.audit_action, 'conversation', $2, $3, $4
         )`,
        [prepared.organizationId, prepared.conversationId, prepared.idempotencyKey, occurredAt],
      );
    });
  }

  async sendProposal(args: {
    authorization: string | undefined;
    organizationId: string;
    workItemId: string;
    proposalId: string;
  }): Promise<HumanSendProposalResult> {
    const actorUserId = await this.authenticateUser(args.authorization);
    const preparation = await this.prepare(
      args.organizationId,
      args.workItemId,
      args.proposalId,
      actorUserId,
    );
    if (preparation.kind === 'succeeded') return preparation.result;

    let gatewayRequestId: string;
    try {
      const gatewayResult = await this.gateway.sendText({
        connectionId: preparation.connectionId,
        recipient: preparation.recipient,
        text: preparation.text,
        idempotencyKey: preparation.idempotencyKey,
      });
      gatewayRequestId = gatewayResult.requestId;
    } catch {
      await this.completeUncertain(preparation).catch(() => undefined);
      throw new HumanSendProposalDeliveryUncertainError();
    }

    try {
      return await this.completeSuccess(preparation, gatewayRequestId);
    } catch {
      try {
        return await this.completeSuccess(preparation, gatewayRequestId);
      } catch {
        await this.completeUncertain(preparation).catch(() => undefined);
        throw new HumanSendProposalDeliveryUncertainError();
      }
    }
  }
}
