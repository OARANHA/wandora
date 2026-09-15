import type { Pool, PoolClient } from 'pg';
import type { HumanTokenVerifier } from '../human-auth/es256-jwks.js';

export type HumanAccessFailureCode = 'identity-unlinked' | 'forbidden';

export class HumanAccessError extends Error {
  constructor(readonly code: HumanAccessFailureCode, message: string) {
    super(message);
    this.name = 'HumanAccessError';
  }
}

export type AttentionRequiredWork = {
  work: {
    id: string;
    kind: 'qualify-new-contact';
    status: 'attention-required';
    updatedAt: string;
  };
  employee: {
    id: string;
    name: string;
  };
  contact: {
    id: string;
    label: string;
  };
  conversation: {
    id: string;
  };
  latestCustomerMessage: {
    text: string;
    occurredAt: string;
  } | null;
  proposal: {
    id: string;
    kind: 'send-text';
    text: string;
    rationale: string;
    createdAt: string;
  } | null;
};

type AttentionRow = {
  work_id: string;
  work_kind: 'qualify-new-contact';
  work_status: 'attention-required';
  work_updated_at: Date;
  employee_id: string;
  employee_name: string;
  contact_id: string;
  contact_label: string;
  conversation_id: string;
  message_text: string | null;
  message_occurred_at: Date | null;
  proposal_id: string | null;
  proposal_kind: 'send-text' | null;
  proposal_text: string | null;
  proposal_rationale: string | null;
  proposal_created_at: Date | null;
};

export class HumanSupervisionReadService {
  constructor(
    private readonly pool: Pool,
    private readonly verifier: HumanTokenVerifier,
  ) {}

  private async resolveUserId(subject: string): Promise<string | undefined> {
    const result = await this.pool.query<{ user_id: string | null }>(
      `SELECT wandora.resolve_core_user_id('supabase', $1)::text AS user_id`,
      [subject],
    );
    return result.rows[0]?.user_id ?? undefined;
  }

  private async scoped<T>(
    organizationId: string,
    fn: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
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

  async listAttentionRequired(
    authorization: string | undefined,
    organizationId: string,
  ): Promise<AttentionRequiredWork[]> {
    const identity = await this.verifier.verifyAuthorization(authorization);
    const userId = await this.resolveUserId(identity.subject);
    if (!userId) {
      throw new HumanAccessError('identity-unlinked', 'Authenticated identity is not linked to Wandora.');
    }

    return this.scoped(organizationId, async (client) => {
      const membership = await client.query(
        `SELECT m.role
           FROM wandora.memberships m
           JOIN wandora.organizations o ON o.id = m.organization_id
          WHERE m.organization_id = $1
            AND m.user_id = $2
            AND m.status = 'active'
            AND o.status = 'active'
          LIMIT 1`,
        [organizationId, userId],
      );
      if (membership.rowCount !== 1) {
        throw new HumanAccessError('forbidden', 'Organization access is not allowed.');
      }

      const result = await client.query<AttentionRow>(
        `SELECT wi.id::text AS work_id,
                wi.kind::text AS work_kind,
                wi.status::text AS work_status,
                wi.updated_at AS work_updated_at,
                de.id::text AS employee_id,
                de.display_name AS employee_name,
                ct.id::text AS contact_id,
                COALESCE(NULLIF(BTRIM(ct.display_name), ''), ct.channel_address) AS contact_label,
                cv.id::text AS conversation_id,
                lm.body AS message_text,
                lm.occurred_at AS message_occurred_at,
                lp.id::text AS proposal_id,
                lp.kind::text AS proposal_kind,
                lp.proposed_text AS proposal_text,
                lp.rationale AS proposal_rationale,
                lp.created_at AS proposal_created_at
           FROM wandora.work_items wi
           JOIN wandora.digital_employees de
             ON de.organization_id = wi.organization_id AND de.id = wi.employee_id
           JOIN wandora.conversations cv
             ON cv.organization_id = wi.organization_id AND cv.id = wi.conversation_id
           JOIN wandora.contacts ct
             ON ct.organization_id = wi.organization_id AND ct.id = cv.contact_id
           LEFT JOIN LATERAL (
             SELECT m.body, m.occurred_at
               FROM wandora.messages m
              WHERE m.organization_id = wi.organization_id
                AND m.conversation_id = wi.conversation_id
                AND m.direction = 'inbound'
              ORDER BY m.occurred_at DESC, m.created_at DESC
              LIMIT 1
           ) lm ON true
           LEFT JOIN LATERAL (
             SELECT p.id, p.kind, p.proposed_text, p.rationale, p.created_at
               FROM wandora.work_proposals p
              WHERE p.organization_id = wi.organization_id
                AND p.work_item_id = wi.id
              ORDER BY p.created_at DESC
              LIMIT 1
           ) lp ON true
          WHERE wi.organization_id = $1
            AND wi.status = 'attention-required'
          ORDER BY wi.updated_at DESC
          LIMIT 100`,
        [organizationId],
      );

      return result.rows.map((row) => ({
        work: {
          id: row.work_id,
          kind: row.work_kind,
          status: row.work_status,
          updatedAt: row.work_updated_at.toISOString(),
        },
        employee: { id: row.employee_id, name: row.employee_name },
        contact: { id: row.contact_id, label: row.contact_label },
        conversation: { id: row.conversation_id },
        latestCustomerMessage: row.message_text && row.message_occurred_at
          ? { text: row.message_text, occurredAt: row.message_occurred_at.toISOString() }
          : null,
        proposal: row.proposal_id
          && row.proposal_kind
          && row.proposal_text
          && row.proposal_rationale
          && row.proposal_created_at
          ? {
              id: row.proposal_id,
              kind: row.proposal_kind,
              text: row.proposal_text,
              rationale: row.proposal_rationale,
              createdAt: row.proposal_created_at.toISOString(),
            }
          : null,
      }));
    });
  }
}
