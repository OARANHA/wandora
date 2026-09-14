import type { Pool, PoolClient } from 'pg';
import type {
  EmployeeProposal,
  InboundContext,
  InboundProcessingResult,
  InboundTextEvent,
  OrganizationId,
  OutboundPreparation,
} from './contracts.js';

export class CoreStateError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'CoreStateError';
  }
}

const asResult = (value: unknown): InboundProcessingResult => value as InboundProcessingResult;

export type ApprovalDecisionContext = {
  decision: 'approved' | 'rejected';
  approvalId: string;
  eventId: string;
  employeeId: string;
  workItemId: string;
  conversationId: string;
  contactId: string;
  connectionId: string;
  recipient: string;
  proposedText: string;
};

export class PostgresAnaRepository {
  constructor(private readonly pool: Pool) {}

  private async tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async acceptInbound(
    organizationId: OrganizationId,
    event: InboundTextEvent,
  ): Promise<InboundContext> {
    return this.tx(async (client) => {
      const connection = await client.query<{
        id: string;
        organization_id: string;
        status: 'active' | 'disabled';
      }>(
        `SELECT id, organization_id, status
           FROM wandora.messaging_connections
          WHERE id = $1
          FOR SHARE`,
        [event.connectionId],
      );

      const row = connection.rows[0];
      if (!row || row.status !== 'active') {
        throw new CoreStateError('connection_unavailable', 'Messaging connection is unavailable.');
      }
      if (row.organization_id !== organizationId) {
        throw new CoreStateError('tenant_mismatch', 'Messaging connection belongs to another organization.');
      }

      const receipt = await client.query<{ status: string; result: unknown }>(
        `SELECT status, result
           FROM wandora_private.inbound_event_receipts
          WHERE organization_id = $1 AND event_id = $2
          FOR UPDATE`,
        [organizationId, event.eventId],
      );
      const receiptRow = receipt.rows[0];
      if (receiptRow?.status === 'completed' && receiptRow.result) {
        return {
          duplicateResult: asResult(receiptRow.result),
          connectionId: event.connectionId,
          employee: {
            id: '', organizationId, name: '', role: 'commercial-assistant', autonomyMode: 'supervised',
          },
          contactId: '', conversationId: '', workItemId: '',
        };
      }
      if (receiptRow?.status === 'processing') {
        throw new CoreStateError('event_in_progress', 'Inbound event is already being processed.');
      }

      if (receiptRow?.status === 'failed') {
        await client.query(
          `UPDATE wandora_private.inbound_event_receipts
              SET status = 'processing', result = NULL, completed_at = NULL, received_at = $3
            WHERE organization_id = $1 AND event_id = $2`,
          [organizationId, event.eventId, event.occurredAt],
        );
      } else {
        await client.query(
          `INSERT INTO wandora_private.inbound_event_receipts
             (organization_id, event_id, messaging_connection_id, status, received_at)
           VALUES ($1, $2, $3, 'processing', $4)`,
          [organizationId, event.eventId, event.connectionId, event.occurredAt],
        );
      }

      const employeeResult = await client.query<{
        id: string; display_name: string; autonomy_mode: 'supervised';
      }>(
        `SELECT id, display_name, autonomy_mode
           FROM wandora.digital_employees
          WHERE organization_id = $1
            AND role = 'commercial-assistant'
            AND status = 'active'
          ORDER BY created_at ASC
          LIMIT 1
          FOR SHARE`,
        [organizationId],
      );
      const employeeRow = employeeResult.rows[0];
      if (!employeeRow) {
        throw new CoreStateError('employee_unavailable', 'No active commercial employee is assigned.');
      }

      const contact = await client.query<{ id: string }>(
        `INSERT INTO wandora.contacts (organization_id, channel, channel_address)
         VALUES ($1, 'whatsapp', $2)
         ON CONFLICT (organization_id, channel, channel_address)
         DO UPDATE SET updated_at = now()
         RETURNING id`,
        [organizationId, event.sender],
      );
      const contactId = contact.rows[0]!.id;

      const conversation = await client.query<{ id: string }>(
        `INSERT INTO wandora.conversations
           (organization_id, messaging_connection_id, contact_id, status)
         VALUES ($1, $2, $3, 'open')
         ON CONFLICT (organization_id, messaging_connection_id, contact_id)
         DO UPDATE SET updated_at = now()
         RETURNING id`,
        [organizationId, event.connectionId, contactId],
      );
      const conversationId = conversation.rows[0]!.id;

      await client.query(
        `INSERT INTO wandora.messages
           (organization_id, conversation_id, direction, body, source_event_id, occurred_at)
         VALUES ($1, $2, 'inbound', $3, $4, $5)
         ON CONFLICT (organization_id, source_event_id) WHERE direction = 'inbound'
         DO NOTHING`,
        [organizationId, conversationId, event.text, event.eventId, event.occurredAt],
      );

      const work = await client.query<{ id: string }>(
        `INSERT INTO wandora.work_items
           (organization_id, employee_id, conversation_id, kind, status)
         VALUES ($1, $2, $3, 'qualify-new-contact', 'in-progress')
         ON CONFLICT (organization_id, employee_id, conversation_id, kind)
           WHERE status <> 'completed'
         DO UPDATE SET updated_at = now()
         RETURNING id`,
        [organizationId, employeeRow.id, conversationId],
      );
      const workItemId = work.rows[0]!.id;

      await client.query(
        `INSERT INTO wandora.audit_records
           (organization_id, actor_type, actor_id, action, subject_type, subject_id, correlation_id, occurred_at)
         VALUES ($1, 'system', 'wandora-core', 'inbound-accepted', 'conversation', $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [organizationId, conversationId, event.eventId, event.occurredAt],
      );

      return {
        connectionId: event.connectionId,
        employee: {
          id: employeeRow.id,
          organizationId,
          name: employeeRow.display_name,
          role: 'commercial-assistant',
          autonomyMode: employeeRow.autonomy_mode,
        },
        contactId,
        conversationId,
        workItemId,
      };
    });
  }

  async createApprovalAndComplete(args: {
    organizationId: OrganizationId;
    eventId: string;
    employeeId: string;
    workItemId: string;
    contactId: string;
    conversationId: string;
    proposal: EmployeeProposal;
    occurredAt: string;
  }): Promise<InboundProcessingResult> {
    return this.tx(async (client) => {
      const approval = await client.query<{ id: string }>(
        `INSERT INTO wandora.approvals
           (organization_id, employee_id, work_item_id, source_event_id, commitment, proposed_text, rationale)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (organization_id, work_item_id, source_event_id)
         DO UPDATE SET proposed_text = EXCLUDED.proposed_text, rationale = EXCLUDED.rationale
         RETURNING id`,
        [args.organizationId, args.employeeId, args.workItemId, args.eventId,
         args.proposal.commitment, args.proposal.text, args.proposal.rationale],
      );
      const approvalId = approval.rows[0]!.id;

      await client.query(
        `UPDATE wandora.work_items SET status = 'waiting-approval'
          WHERE organization_id = $1 AND id = $2`,
        [args.organizationId, args.workItemId],
      );
      await client.query(
        `INSERT INTO wandora.audit_records
           (organization_id, actor_type, actor_id, action, subject_type, subject_id, correlation_id, occurred_at)
         VALUES ($1, 'digital-employee', $2, 'approval-requested', 'approval', $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [args.organizationId, args.employeeId, approvalId, args.eventId, args.occurredAt],
      );

      const result: InboundProcessingResult = {
        status: 'approval-required',
        contactId: args.contactId,
        conversationId: args.conversationId,
        workItemId: args.workItemId,
        approvalId,
      };

      await client.query(
        `UPDATE wandora_private.inbound_event_receipts
            SET status = 'completed', result = $3::jsonb, completed_at = $4
          WHERE organization_id = $1 AND event_id = $2`,
        [args.organizationId, args.eventId, JSON.stringify(result), args.occurredAt],
      );

      return result;
    });
  }

  async prepareOutbound(args: {
    organizationId: OrganizationId;
    employeeId: string;
    workItemId: string;
    conversationId: string;
    eventId: string;
    idempotencyKey: string;
    body: string;
  }): Promise<OutboundPreparation> {
    return this.tx(async (client) => {
      await client.query(
        `INSERT INTO wandora_private.outbound_attempts
           (organization_id, employee_id, work_item_id, conversation_id,
            source_event_id, idempotency_key, body, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'planned')
         ON CONFLICT (organization_id, idempotency_key) DO NOTHING`,
        [args.organizationId, args.employeeId, args.workItemId, args.conversationId,
         args.eventId, args.idempotencyKey, args.body],
      );

      const attempt = await client.query<{
        employee_id: string;
        work_item_id: string;
        conversation_id: string;
        source_event_id: string;
        body: string;
        status: 'planned' | 'sending' | 'succeeded' | 'uncertain';
        gateway_request_id: string | null;
      }>(
        `SELECT employee_id, work_item_id, conversation_id, source_event_id,
                body, status, gateway_request_id
           FROM wandora_private.outbound_attempts
          WHERE organization_id = $1 AND idempotency_key = $2
          FOR UPDATE`,
        [args.organizationId, args.idempotencyKey],
      );
      const row = attempt.rows[0];
      if (!row) {
        throw new CoreStateError('outbound_attempt_missing', 'Outbound attempt could not be loaded.');
      }

      const conflict =
        row.employee_id !== args.employeeId ||
        row.work_item_id !== args.workItemId ||
        row.conversation_id !== args.conversationId ||
        row.source_event_id !== args.eventId ||
        row.body !== args.body;
      if (conflict) {
        throw new CoreStateError(
          'outbound_idempotency_conflict',
          'Outbound idempotency key was reused with different content or context.',
        );
      }

      if (row.status === 'succeeded') {
        if (!row.gateway_request_id) {
          throw new CoreStateError('outbound_corrupt', 'Succeeded outbound attempt has no gateway request ID.');
        }
        return { status: 'succeeded', gatewayRequestId: row.gateway_request_id } satisfies OutboundPreparation;
      }
      if (row.status === 'sending' || row.status === 'uncertain') {
        return { status: 'uncertain' } satisfies OutboundPreparation;
      }

      await client.query(
        `UPDATE wandora_private.outbound_attempts
            SET status = 'sending'
          WHERE organization_id = $1 AND idempotency_key = $2 AND status = 'planned'`,
        [args.organizationId, args.idempotencyKey],
      );
      return { status: 'ready' } satisfies OutboundPreparation;
    });
  }

  async completeOutboundSuccess(args: {
    organizationId: OrganizationId;
    employeeId: string;
    workItemId: string;
    conversationId: string;
    contactId: string;
    eventId: string;
    idempotencyKey: string;
    body: string;
    gatewayRequestId: string;
    occurredAt: string;
  }): Promise<InboundProcessingResult> {
    return this.tx(async (client) => {
      const updated = await client.query(
        `UPDATE wandora_private.outbound_attempts
            SET status = 'succeeded', gateway_request_id = $3
          WHERE organization_id = $1 AND idempotency_key = $2
            AND status IN ('sending', 'succeeded')`,
        [args.organizationId, args.idempotencyKey, args.gatewayRequestId],
      );
      if (updated.rowCount !== 1) {
        throw new CoreStateError('outbound_not_sendable', 'Outbound attempt is not in a sendable state.');
      }

      await client.query(
        `INSERT INTO wandora.messages
           (organization_id, conversation_id, direction, body, source_event_id, occurred_at)
         VALUES ($1, $2, 'outbound', $3, $4, $5)
         ON CONFLICT (organization_id, source_event_id) WHERE direction = 'outbound'
         DO NOTHING`,
        [args.organizationId, args.conversationId, args.body, args.eventId, args.occurredAt],
      );

      await client.query(
        `UPDATE wandora.work_items SET status = 'waiting-customer'
          WHERE organization_id = $1 AND id = $2`,
        [args.organizationId, args.workItemId],
      );
      await client.query(
        `INSERT INTO wandora.audit_records
           (organization_id, actor_type, actor_id, action, subject_type, subject_id,
            correlation_id, occurred_at)
         VALUES ($1, 'digital-employee', $2, 'outbound-sent', 'conversation', $3, $4, $5)
         ON CONFLICT (organization_id, action, subject_type, subject_id, correlation_id)
         DO NOTHING`,
        [args.organizationId, args.employeeId, args.conversationId, args.eventId, args.occurredAt],
      );

      const result: InboundProcessingResult = {
        status: 'replied',
        contactId: args.contactId,
        conversationId: args.conversationId,
        workItemId: args.workItemId,
        outboundRequestId: args.gatewayRequestId,
      };

      await client.query(
        `UPDATE wandora_private.inbound_event_receipts
            SET status = 'completed', result = $3::jsonb, completed_at = $4
          WHERE organization_id = $1 AND event_id = $2`,
        [args.organizationId, args.eventId, JSON.stringify(result), args.occurredAt],
      );
      return result;
    });
  }

  async completeOutboundUncertain(args: {
    organizationId: OrganizationId;
    employeeId: string;
    workItemId: string;
    conversationId: string;
    contactId: string;
    eventId: string;
    idempotencyKey: string;
    occurredAt: string;
  }): Promise<InboundProcessingResult> {
    return this.tx(async (client) => {
      const attempt = await client.query(
        `UPDATE wandora_private.outbound_attempts
            SET status = 'uncertain'
          WHERE organization_id = $1 AND idempotency_key = $2
            AND status IN ('planned', 'sending', 'uncertain')`,
        [args.organizationId, args.idempotencyKey],
      );
      if (attempt.rowCount !== 1) {
        throw new CoreStateError(
          'outbound_not_uncertain',
          'Outbound attempt cannot be marked uncertain from its current state.',
        );
      }
      await client.query(
        `UPDATE wandora.work_items SET status = 'attention-required'
          WHERE organization_id = $1 AND id = $2`,
        [args.organizationId, args.workItemId],
      );
      await client.query(
        `INSERT INTO wandora.audit_records
           (organization_id, actor_type, actor_id, action, subject_type, subject_id,
            correlation_id, occurred_at)
         VALUES ($1, 'system', 'wandora-core', 'outbound-uncertain', 'conversation', $2, $3, $4)
         ON CONFLICT (organization_id, action, subject_type, subject_id, correlation_id)
         DO NOTHING`,
        [args.organizationId, args.conversationId, args.eventId, args.occurredAt],
      );

      const result: InboundProcessingResult = {
        status: 'delivery-uncertain',
        contactId: args.contactId,
        conversationId: args.conversationId,
        workItemId: args.workItemId,
        idempotencyKey: args.idempotencyKey,
      };
      await client.query(
        `UPDATE wandora_private.inbound_event_receipts
            SET status = 'completed', result = $3::jsonb, completed_at = $4
          WHERE organization_id = $1 AND event_id = $2`,
        [args.organizationId, args.eventId, JSON.stringify(result), args.occurredAt],
      );
      return result;
    });
  }

  async decideApproval(args: {
    organizationId: OrganizationId;
    approvalId: string;
    actorUserId: string;
    decision: 'approve' | 'reject';
    decidedAt: string;
  }): Promise<ApprovalDecisionContext> {
    return this.tx(async (client) => {
      const authority = await client.query<{ role: 'owner' | 'admin' | 'member' }>(
        `SELECT m.role
           FROM wandora.memberships m
           JOIN wandora.organizations o ON o.id = m.organization_id
          WHERE m.organization_id = $1 AND m.user_id = $2
            AND m.status = 'active' AND o.status = 'active'
            AND m.role IN ('owner', 'admin')
          FOR SHARE`,
        [args.organizationId, args.actorUserId],
      );
      if (!authority.rows[0]) {
        throw new CoreStateError('approval_actor_unauthorized', 'Human actor cannot decide this approval.');
      }

      const approval = await client.query<{
        id: string; status: 'pending' | 'approved' | 'rejected' | 'cancelled';
        source_event_id: string; proposed_text: string; employee_id: string;
        work_item_id: string; conversation_id: string; contact_id: string;
        messaging_connection_id: string; channel_address: string;
      }>(
        `SELECT a.id, a.status, a.source_event_id, a.proposed_text, a.employee_id,
                a.work_item_id, w.conversation_id, c.contact_id,
                c.messaging_connection_id, ct.channel_address
           FROM wandora.approvals a
           JOIN wandora.work_items w
             ON w.organization_id = a.organization_id AND w.id = a.work_item_id
           JOIN wandora.conversations c
             ON c.organization_id = w.organization_id AND c.id = w.conversation_id
           JOIN wandora.contacts ct
             ON ct.organization_id = c.organization_id AND ct.id = c.contact_id
          WHERE a.organization_id = $1 AND a.id = $2
          FOR UPDATE OF a, w`,
        [args.organizationId, args.approvalId],
      );
      const row = approval.rows[0];
      if (!row) {
        throw new CoreStateError('approval_missing', 'Approval does not exist in this organization.');
      }

      const targetStatus = args.decision === 'approve' ? 'approved' : 'rejected';
      if (row.status !== 'pending' && row.status !== targetStatus) {
        throw new CoreStateError('approval_already_decided', 'Approval has already been decided differently.');
      }

      if (row.status === 'pending') {
        await client.query(
          `UPDATE wandora.approvals
              SET status = $3, decided_by_user_id = $4, decided_at = $5
            WHERE organization_id = $1 AND id = $2 AND status = 'pending'`,
          [args.organizationId, args.approvalId, targetStatus, args.actorUserId, args.decidedAt],
        );
        await client.query(
          `UPDATE wandora.work_items SET status = 'in-progress'
            WHERE organization_id = $1 AND id = $2`,
          [args.organizationId, row.work_item_id],
        );
        await client.query(
          `INSERT INTO wandora.audit_records
             (organization_id, actor_type, actor_id, action, subject_type, subject_id,
              correlation_id, occurred_at)
           VALUES ($1, 'human', $2, 'approval-decided', 'approval', $3, $4, $5)
           ON CONFLICT (organization_id, action, subject_type, subject_id, correlation_id)
           DO NOTHING`,
          [args.organizationId, args.actorUserId, row.id, row.source_event_id, args.decidedAt],
        );
      }

      if (targetStatus === 'rejected') {
        const result: InboundProcessingResult = {
          status: 'approval-rejected',
          contactId: row.contact_id,
          conversationId: row.conversation_id,
          workItemId: row.work_item_id,
          approvalId: row.id,
        };
        await client.query(
          `UPDATE wandora_private.inbound_event_receipts
              SET status = 'completed', result = $3::jsonb, completed_at = COALESCE(completed_at, $4)
            WHERE organization_id = $1 AND event_id = $2`,
          [args.organizationId, row.source_event_id, JSON.stringify(result), args.decidedAt],
        );
      }

      return {
        decision: targetStatus,
        approvalId: row.id,
        eventId: row.source_event_id,
        employeeId: row.employee_id,
        workItemId: row.work_item_id,
        conversationId: row.conversation_id,
        contactId: row.contact_id,
        connectionId: row.messaging_connection_id,
        recipient: row.channel_address,
        proposedText: row.proposed_text,
      };
    });
  }

  async markInboundFailed(args: {
    organizationId: OrganizationId;
    eventId: string;
  }): Promise<void> {
    await this.pool.query(
      `UPDATE wandora_private.inbound_event_receipts
          SET status = 'failed', result = NULL, completed_at = NULL
        WHERE organization_id = $1 AND event_id = $2 AND status = 'processing'`,
      [args.organizationId, args.eventId],
    );
  }

  async getCounts(organizationId: OrganizationId): Promise<{
    contacts: number;
    conversations: number;
    workItems: number;
    approvals: number;
    messages: number;
  }> {
    const result = await this.pool.query<{
      contacts: string;
      conversations: string;
      work_items: string;
      approvals: string;
      messages: string;
    }>(
      `SELECT
         (SELECT count(*) FROM wandora.contacts WHERE organization_id = $1)::text AS contacts,
         (SELECT count(*) FROM wandora.conversations WHERE organization_id = $1)::text AS conversations,
         (SELECT count(*) FROM wandora.work_items WHERE organization_id = $1)::text AS work_items,
         (SELECT count(*) FROM wandora.approvals WHERE organization_id = $1)::text AS approvals,
         (SELECT count(*) FROM wandora.messages WHERE organization_id = $1)::text AS messages`,
      [organizationId],
    );
    const row = result.rows[0]!;
    return {
      contacts: Number(row.contacts),
      conversations: Number(row.conversations),
      workItems: Number(row.work_items),
      approvals: Number(row.approvals),
      messages: Number(row.messages),
    };
  }
}
