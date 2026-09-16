import type { Pool, PoolClient } from 'pg';
import type {
  AgentRuntime,
  EmployeeProposal,
  InboundProcessingResult,
  InboundTextEvent,
  OrganizationId,
} from './contracts.js';
import { CoreStateError, PostgresAnaRepository } from './postgres-repository.js';

export type SupervisedInboundResult = Extract<
  InboundProcessingResult,
  { status: 'supervision-required' }
>;

export type SupervisedInboundOutcome = {
  duplicate: boolean;
  result: InboundProcessingResult | SupervisedInboundResult;
};

export type AnaSupervisedIngressDeps = {
  repository: PostgresAnaRepository;
  pool: Pool;
  runtime?: AgentRuntime;
  now?: () => string;
};

export class AnaSupervisedIngressService {
  private readonly now: () => string;

  constructor(private readonly deps: AnaSupervisedIngressDeps) {
    this.now = deps.now ?? (() => new Date().toISOString());
  }

  private async tx<T>(
    organizationId: OrganizationId,
    fn: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.deps.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `SELECT set_config('wandora.organization_id', $1, true)`,
        [organizationId],
      );
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

  private async propose(
    organizationId: OrganizationId,
    event: InboundTextEvent,
    employee: Parameters<AgentRuntime['proposeCommercialReply']>[0]['employee'],
  ): Promise<EmployeeProposal | undefined> {
    if (!this.deps.runtime) return undefined;

    try {
      const proposal = await this.deps.runtime.proposeCommercialReply({
        organizationId,
        employee,
        customerText: event.text,
        customerAddress: event.sender,
      });
      if (proposal.kind !== 'send-text' || proposal.text.trim().length === 0) {
        throw new CoreStateError(
          'invalid_supervised_proposal',
          'Agent Runtime returned an invalid supervised text proposal.',
        );
      }
      if (proposal.commitment !== 'none') {
        throw new CoreStateError(
          'supervised_proposal_requires_approval',
          'Supervised ingress accepts only proposals without a commercial commitment.',
        );
      }
      return proposal;
    } catch (error) {
      await this.deps.repository
        .markInboundFailed({ organizationId, eventId: event.eventId })
        .catch(() => undefined);
      throw error;
    }
  }

  async handle(
    organizationId: OrganizationId,
    event: InboundTextEvent,
  ): Promise<SupervisedInboundOutcome> {
    const context = await this.deps.repository.acceptInbound(organizationId, event);
    if (context.duplicateResult) {
      return { duplicate: true, result: context.duplicateResult };
    }

    const proposal = await this.propose(organizationId, event, context.employee);
    const result: SupervisedInboundResult = {
      status: 'supervision-required',
      contactId: context.contactId,
      conversationId: context.conversationId,
      workItemId: context.workItemId,
      ...(proposal ? { proposal } : {}),
    };

    try {
      await this.tx(organizationId, async (client) => {
        if (proposal) {
          const persistedProposal = await client.query(
            `INSERT INTO wandora.work_proposals
               (organization_id, employee_id, work_item_id, conversation_id,
                source_event_id, kind, proposed_text, commitment, rationale)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [
              organizationId,
              context.employee.id,
              context.workItemId,
              context.conversationId,
              event.eventId,
              proposal.kind,
              proposal.text,
              proposal.commitment,
              proposal.rationale,
            ],
          );
          if (persistedProposal.rowCount !== 1) {
            throw new CoreStateError(
              'supervised_proposal_persist_failed',
              'Supervised proposal could not be stored canonically.',
            );
          }
        }

        const work = await client.query(
          `UPDATE wandora.work_items
              SET status = 'attention-required'
            WHERE organization_id = $1
              AND id = $2
              AND status IN ('in-progress', 'attention-required', 'waiting-customer')
          RETURNING id`,
          [organizationId, context.workItemId],
        );
        if (work.rowCount !== 1) {
          throw new CoreStateError(
            'supervised_work_state_conflict',
            'Qualification work could not enter supervised attention state.',
          );
        }

        const receipt = await client.query(
          `UPDATE wandora_private.inbound_event_receipts
              SET status = 'completed',
                  result = $3::jsonb,
                  completed_at = $4
            WHERE organization_id = $1
              AND event_id = $2
              AND status = 'processing'
          RETURNING event_id`,
          [organizationId, event.eventId, JSON.stringify(result), this.now()],
        );
        if (receipt.rowCount !== 1) {
          throw new CoreStateError(
            'supervised_receipt_state_conflict',
            'Inbound receipt could not be completed for supervision.',
          );
        }
      });
    } catch (error) {
      await this.deps.repository
        .markInboundFailed({ organizationId, eventId: event.eventId })
        .catch(() => undefined);
      throw error;
    }

    return { duplicate: false, result };
  }
}
