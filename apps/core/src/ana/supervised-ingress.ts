import type { Pool, PoolClient } from 'pg';
import type { InboundProcessingResult, InboundTextEvent, OrganizationId } from './contracts.js';
import { CoreStateError, PostgresAnaRepository } from './postgres-repository.js';

export type SupervisedInboundResult = {
  status: 'supervision-required';
  contactId: string;
  conversationId: string;
  workItemId: string;
};

export type SupervisedInboundOutcome = {
  duplicate: boolean;
  result: InboundProcessingResult | SupervisedInboundResult;
};

export type AnaSupervisedIngressDeps = {
  repository: PostgresAnaRepository;
  pool: Pool;
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

  async handle(
    organizationId: OrganizationId,
    event: InboundTextEvent,
  ): Promise<SupervisedInboundOutcome> {
    const context = await this.deps.repository.acceptInbound(organizationId, event);
    if (context.duplicateResult) {
      return { duplicate: true, result: context.duplicateResult };
    }

    const result: SupervisedInboundResult = {
      status: 'supervision-required',
      contactId: context.contactId,
      conversationId: context.conversationId,
      workItemId: context.workItemId,
    };

    try {
      await this.tx(organizationId, async (client) => {
        const work = await client.query(
          `UPDATE wandora.work_items
              SET status = 'attention-required'
            WHERE organization_id = $1
              AND id = $2
              AND status = 'in-progress'
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
