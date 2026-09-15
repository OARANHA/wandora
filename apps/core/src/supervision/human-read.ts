import type { Pool, PoolClient } from 'pg';
import type { HumanTokenVerifier } from '../human-auth/es256-jwks.js';

export type HumanAccessFailureCode = 'identity-unlinked' | 'forbidden';

export class HumanAccessError extends Error {
  constructor(readonly code: HumanAccessFailureCode, message: string) {
    super(message);
    this.name = 'HumanAccessError';
  }
}

export class HumanNotFoundError extends Error {
  constructor(message = 'Requested resource was not found.') {
    super(message);
    this.name = 'HumanNotFoundError';
  }
}

export type HumanSessionContext = {
  user: {
    id: string;
    name: string;
  };
  organizations: Array<{
    id: string;
    slug: string;
    name: string;
    role: 'owner' | 'admin' | 'member';
  }>;
};

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

export type ConversationListItem = {
  conversation: {
    id: string;
    status: 'open' | 'closed';
    lastActivityAt: string;
  };
  contact: {
    id: string;
    label: string;
  };
  employee: {
    id: string;
    name: string;
  } | null;
  latestMessage: {
    direction: 'inbound' | 'outbound';
    text: string;
    occurredAt: string;
  } | null;
};

export type ConversationDetail = {
  conversation: {
    id: string;
    status: 'open' | 'closed';
    lastActivityAt: string;
  };
  contact: {
    id: string;
    label: string;
  };
  employee: {
    id: string;
    name: string;
  } | null;
  messages: Array<{
    direction: 'inbound' | 'outbound';
    text: string;
    occurredAt: string;
  }>;
  hasEarlierMessages: boolean;
};

type HumanSessionRow = {
  user_id: string;
  user_display_name: string;
  organization_id: string | null;
  organization_slug: string | null;
  organization_display_name: string | null;
  membership_role: 'owner' | 'admin' | 'member' | null;
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

type ConversationRow = {
  conversation_id: string;
  conversation_status: 'open' | 'closed';
  last_activity_at: Date;
  contact_id: string;
  contact_label: string;
  employee_id: string | null;
  employee_name: string | null;
  message_direction: 'inbound' | 'outbound' | null;
  message_text: string | null;
  message_occurred_at: Date | null;
};

type ConversationDetailRow = {
  conversation_id: string;
  conversation_status: 'open' | 'closed';
  last_activity_at: Date;
  contact_id: string;
  contact_label: string;
  employee_id: string | null;
  employee_name: string | null;
};

type ConversationMessageRow = {
  message_direction: 'inbound' | 'outbound';
  message_text: string;
  message_occurred_at: Date;
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

  async getSessionContext(authorization: string | undefined): Promise<HumanSessionContext> {
    const identity = await this.verifier.verifyAuthorization(authorization);
    const result = await this.pool.query<HumanSessionRow>(
      `SELECT user_id::text AS user_id,
              user_display_name,
              organization_id::text AS organization_id,
              organization_slug,
              organization_display_name,
              membership_role::text AS membership_role
         FROM wandora.resolve_core_human_session('supabase', $1)`,
      [identity.subject],
    );
    const first = result.rows[0];
    if (!first) {
      throw new HumanAccessError('identity-unlinked', 'Authenticated identity is not linked to Wandora.');
    }

    const organizations = result.rows.flatMap((row) => (
      row.organization_id
      && row.organization_slug
      && row.organization_display_name
      && row.membership_role
        ? [{
            id: row.organization_id,
            slug: row.organization_slug,
            name: row.organization_display_name,
            role: row.membership_role,
          }]
        : []
    ));

    return {
      user: { id: first.user_id, name: first.user_display_name },
      organizations,
    };
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

  private async requireActiveMembership(
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
        LIMIT 1`,
      [organizationId, userId],
    );
    if (membership.rowCount !== 1) {
      throw new HumanAccessError('forbidden', 'Organization access is not allowed.');
    }
  }

  private async authenticateUser(authorization: string | undefined): Promise<string> {
    const identity = await this.verifier.verifyAuthorization(authorization);
    const userId = await this.resolveUserId(identity.subject);
    if (!userId) {
      throw new HumanAccessError('identity-unlinked', 'Authenticated identity is not linked to Wandora.');
    }
    return userId;
  }

  async listAttentionRequired(
    authorization: string | undefined,
    organizationId: string,
  ): Promise<AttentionRequiredWork[]> {
    const userId = await this.authenticateUser(authorization);

    return this.scoped(organizationId, async (client) => {
      await this.requireActiveMembership(client, organizationId, userId);

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

  async listConversations(
    authorization: string | undefined,
    organizationId: string,
  ): Promise<ConversationListItem[]> {
    const userId = await this.authenticateUser(authorization);

    return this.scoped(organizationId, async (client) => {
      await this.requireActiveMembership(client, organizationId, userId);

      const result = await client.query<ConversationRow>(
        `SELECT cv.id::text AS conversation_id,
                cv.status::text AS conversation_status,
                GREATEST(cv.updated_at, COALESCE(lm.occurred_at, cv.updated_at)) AS last_activity_at,
                ct.id::text AS contact_id,
                COALESCE(NULLIF(BTRIM(ct.display_name), ''), ct.channel_address) AS contact_label,
                aw.employee_id,
                aw.employee_name,
                lm.direction::text AS message_direction,
                lm.body AS message_text,
                lm.occurred_at AS message_occurred_at
           FROM wandora.conversations cv
           JOIN wandora.contacts ct
             ON ct.organization_id = cv.organization_id AND ct.id = cv.contact_id
           LEFT JOIN LATERAL (
             SELECT de.id::text AS employee_id, de.display_name AS employee_name
               FROM wandora.work_items wi
               JOIN wandora.digital_employees de
                 ON de.organization_id = wi.organization_id AND de.id = wi.employee_id
              WHERE wi.organization_id = cv.organization_id
                AND wi.conversation_id = cv.id
                AND wi.status <> 'completed'
              ORDER BY wi.updated_at DESC, wi.created_at DESC
              LIMIT 1
           ) aw ON true
           LEFT JOIN LATERAL (
             SELECT m.direction, m.body, m.occurred_at
               FROM wandora.messages m
              WHERE m.organization_id = cv.organization_id
                AND m.conversation_id = cv.id
              ORDER BY m.occurred_at DESC, m.created_at DESC, m.id DESC
              LIMIT 1
           ) lm ON true
          WHERE cv.organization_id = $1
          ORDER BY last_activity_at DESC, cv.id
          LIMIT 100`,
        [organizationId],
      );

      return result.rows.map((row) => ({
        conversation: {
          id: row.conversation_id,
          status: row.conversation_status,
          lastActivityAt: row.last_activity_at.toISOString(),
        },
        contact: { id: row.contact_id, label: row.contact_label },
        employee: row.employee_id && row.employee_name
          ? { id: row.employee_id, name: row.employee_name }
          : null,
        latestMessage: row.message_direction && row.message_text && row.message_occurred_at
          ? {
              direction: row.message_direction,
              text: row.message_text,
              occurredAt: row.message_occurred_at.toISOString(),
            }
          : null,
      }));
    });
  }

  async getConversationDetail(
    authorization: string | undefined,
    organizationId: string,
    conversationId: string,
  ): Promise<ConversationDetail> {
    const userId = await this.authenticateUser(authorization);

    return this.scoped(organizationId, async (client) => {
      await this.requireActiveMembership(client, organizationId, userId);

      const detailResult = await client.query<ConversationDetailRow>(
        `SELECT cv.id::text AS conversation_id,
                cv.status::text AS conversation_status,
                GREATEST(cv.updated_at, COALESCE(lm.occurred_at, cv.updated_at)) AS last_activity_at,
                ct.id::text AS contact_id,
                COALESCE(NULLIF(BTRIM(ct.display_name), ''), ct.channel_address) AS contact_label,
                aw.employee_id,
                aw.employee_name
           FROM wandora.conversations cv
           JOIN wandora.contacts ct
             ON ct.organization_id = cv.organization_id AND ct.id = cv.contact_id
           LEFT JOIN LATERAL (
             SELECT de.id::text AS employee_id, de.display_name AS employee_name
               FROM wandora.work_items wi
               JOIN wandora.digital_employees de
                 ON de.organization_id = wi.organization_id AND de.id = wi.employee_id
              WHERE wi.organization_id = cv.organization_id
                AND wi.conversation_id = cv.id
                AND wi.status <> 'completed'
              ORDER BY wi.updated_at DESC, wi.created_at DESC
              LIMIT 1
           ) aw ON true
           LEFT JOIN LATERAL (
             SELECT m.occurred_at
               FROM wandora.messages m
              WHERE m.organization_id = cv.organization_id
                AND m.conversation_id = cv.id
              ORDER BY m.occurred_at DESC, m.created_at DESC, m.id DESC
              LIMIT 1
           ) lm ON true
          WHERE cv.organization_id = $1
            AND cv.id = $2
          LIMIT 1`,
        [organizationId, conversationId],
      );

      const detail = detailResult.rows[0];
      if (!detail) {
        throw new HumanNotFoundError();
      }

      const messageResult = await client.query<ConversationMessageRow>(
        `SELECT m.direction::text AS message_direction,
                m.body AS message_text,
                m.occurred_at AS message_occurred_at
           FROM wandora.messages m
          WHERE m.organization_id = $1
            AND m.conversation_id = $2
          ORDER BY m.occurred_at DESC, m.created_at DESC, m.id DESC
          LIMIT 101`,
        [organizationId, conversationId],
      );

      const hasEarlierMessages = messageResult.rows.length > 100;
      const messages = messageResult.rows
        .slice(0, 100)
        .reverse()
        .map((row) => ({
          direction: row.message_direction,
          text: row.message_text,
          occurredAt: row.message_occurred_at.toISOString(),
        }));

      return {
        conversation: {
          id: detail.conversation_id,
          status: detail.conversation_status,
          lastActivityAt: detail.last_activity_at.toISOString(),
        },
        contact: { id: detail.contact_id, label: detail.contact_label },
        employee: detail.employee_id && detail.employee_name
          ? { id: detail.employee_id, name: detail.employee_name }
          : null,
        messages,
        hasEarlierMessages,
      };
    });
  }
}
