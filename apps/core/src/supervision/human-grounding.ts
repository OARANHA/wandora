import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import {
  HumanAccessError,
  HumanNotFoundError,
  type HumanSessionContext,
  type HumanSupervisionReadService,
} from './human-read.js';

export type GroundingEntryType = 'fact' | 'rule';
export type GroundingProvenanceType = 'owner_statement' | 'approved_source' | 'approved_correction';
export type GroundingStatus = 'active' | 'retired';

export type HumanGroundingEntry = {
  id: string;
  type: GroundingEntryType;
  content: string;
  provenance: {
    type: GroundingProvenanceType;
    sourceRef: string | null;
    sourceLabel: string | null;
  };
  supersedesEntryId: string | null;
  status: GroundingStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateGroundingInput = {
  organizationId: string;
  authorization: string | undefined;
  idempotencyKey: string;
  entryType: GroundingEntryType;
  content: string;
  provenanceType: Exclude<GroundingProvenanceType, 'approved_correction'>;
  sourceRef: string | null;
  sourceLabel: string | null;
};

export type CorrectGroundingInput = {
  organizationId: string;
  authorization: string | undefined;
  idempotencyKey: string;
  entryId: string;
  content: string;
  sourceRef: string;
  sourceLabel: string | null;
};

export type RetireGroundingInput = {
  organizationId: string;
  authorization: string | undefined;
  idempotencyKey: string;
  entryId: string;
};

export class HumanGroundingConflictError extends Error {
  constructor(
    readonly code: 'idempotency-conflict' | 'grounding-not-active',
    message: string,
  ) {
    super(message);
    this.name = 'HumanGroundingConflictError';
  }
}

type GroundingRow = {
  id: string;
  entry_type: GroundingEntryType;
  content: string;
  provenance_type: GroundingProvenanceType;
  source_ref: string | null;
  source_label: string | null;
  supersedes_entry_id: string | null;
  status: GroundingStatus;
  created_by_user_id: string;
  created_at: Date;
  updated_at: Date;
};

function mapGroundingRow(row: GroundingRow): HumanGroundingEntry {
  return {
    id: row.id,
    type: row.entry_type,
    content: row.content,
    provenance: {
      type: row.provenance_type,
      sourceRef: row.source_ref,
      sourceLabel: row.source_label,
    },
    supersedesEntryId: row.supersedes_entry_id,
    status: row.status,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function deterministicMutationId(parts: string[]): string {
  const digest = Buffer.from(createHash('sha256').update(parts.join('\u0000')).digest().subarray(0, 16));
  digest[6] = ((digest[6] ?? 0) & 0x0f) | 0x50;
  digest[8] = ((digest[8] ?? 0) & 0x3f) | 0x80;
  const hex = digest.toString('hex');
  return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
}

export class HumanGroundingService {
  constructor(
    private readonly pool: Pool,
    private readonly humanRead: HumanSupervisionReadService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private membership(
    session: HumanSessionContext,
    organizationId: string,
  ): HumanSessionContext['organizations'][number] {
    const membership = session.organizations.find((candidate) => candidate.id === organizationId);
    if (!membership) {
      throw new HumanAccessError('forbidden', 'Organization access is not allowed.');
    }
    return membership;
  }

  private async scoped<T>(
    organizationId: string,
    readOnly: boolean,
    fn: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query(readOnly ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN');
      await client.query(`SELECT set_config('wandora.organization_id', $1, true)`, [organizationId]);
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw this.mapDatabaseError(error);
    } finally {
      client.release();
    }
  }

  private mapDatabaseError(error: unknown): unknown {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('grounding_mutation_forbidden') || message.includes('grounding_tenant_mismatch')) {
      return new HumanAccessError('forbidden', 'Grounding mutation is not allowed.');
    }
    if (message.includes('grounding_not_found')) {
      return new HumanNotFoundError();
    }
    if (message.includes('grounding_idempotency_conflict')) {
      return new HumanGroundingConflictError('idempotency-conflict', 'Idempotency key conflicts with existing grounding state.');
    }
    if (message.includes('grounding_not_active')) {
      return new HumanGroundingConflictError('grounding-not-active', 'Only active grounding can be corrected.');
    }
    return error;
  }

  private async getEntry(
    client: PoolClient,
    organizationId: string,
    entryId: string,
  ): Promise<HumanGroundingEntry> {
    const result = await client.query<GroundingRow>(
      `SELECT id::text,
              entry_type,
              content,
              provenance_type,
              source_ref,
              source_label,
              supersedes_entry_id::text,
              status,
              created_by_user_id::text,
              created_at,
              updated_at
         FROM wandora.organization_grounding_entries
        WHERE organization_id = $1 AND id = $2
        LIMIT 1`,
      [organizationId, entryId],
    );
    const row = result.rows[0];
    if (!row) throw new HumanNotFoundError();
    return mapGroundingRow(row);
  }

  async list(
    authorization: string | undefined,
    organizationId: string,
  ): Promise<HumanGroundingEntry[]> {
    const session = await this.humanRead.getSessionContext(authorization);
    this.membership(session, organizationId);

    return this.scoped(organizationId, true, async (client) => {
      const result = await client.query<GroundingRow>(
        `SELECT id::text,
                entry_type,
                content,
                provenance_type,
                source_ref,
                source_label,
                supersedes_entry_id::text,
                status,
                created_by_user_id::text,
                created_at,
                updated_at
           FROM wandora.organization_grounding_entries
          WHERE organization_id = $1
          ORDER BY created_at ASC, id ASC
          LIMIT 500`,
        [organizationId],
      );
      return result.rows.map(mapGroundingRow);
    });
  }

  async create(input: CreateGroundingInput): Promise<HumanGroundingEntry> {
    const session = await this.humanRead.getSessionContext(input.authorization);
    const membership = this.membership(session, input.organizationId);
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      throw new HumanAccessError('forbidden', 'Only an active owner or admin may change Regras da Casa.');
    }

    const entryId = deterministicMutationId([
      'organization-grounding-create-v1',
      input.organizationId,
      input.idempotencyKey,
    ]);

    return this.scoped(input.organizationId, false, async (client) => {
      await client.query(
        `SELECT wandora.create_organization_grounding_entry(
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
         )`,
        [
          input.organizationId,
          entryId,
          session.user.id,
          input.entryType,
          input.content,
          input.provenanceType,
          input.sourceRef,
          input.sourceLabel,
          input.idempotencyKey,
          this.now(),
        ],
      );
      return this.getEntry(client, input.organizationId, entryId);
    });
  }

  async retire(input: RetireGroundingInput): Promise<HumanGroundingEntry> {
    const session = await this.humanRead.getSessionContext(input.authorization);
    const membership = this.membership(session, input.organizationId);
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      throw new HumanAccessError('forbidden', 'Only an active owner or admin may change Regras da Casa.');
    }

    return this.scoped(input.organizationId, false, async (client) => {
      await client.query(
        `SELECT wandora.retire_organization_grounding_entry($1, $2, $3, $4, $5)`,
        [input.organizationId, input.entryId, session.user.id, input.idempotencyKey, this.now()],
      );
      return this.getEntry(client, input.organizationId, input.entryId);
    });
  }

  async correct(input: CorrectGroundingInput): Promise<HumanGroundingEntry> {
    const session = await this.humanRead.getSessionContext(input.authorization);
    const membership = this.membership(session, input.organizationId);
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      throw new HumanAccessError('forbidden', 'Only an active owner or admin may change Regras da Casa.');
    }

    const replacementEntryId = deterministicMutationId([
      'organization-grounding-correct-v1',
      input.organizationId,
      input.entryId,
      input.idempotencyKey,
    ]);

    return this.scoped(input.organizationId, false, async (client) => {
      await client.query(
        `SELECT wandora.correct_organization_grounding_entry(
           $1, $2, $3, $4, $5, $6, $7, $8, $9
         )`,
        [
          input.organizationId,
          input.entryId,
          replacementEntryId,
          session.user.id,
          input.content,
          input.sourceRef,
          input.sourceLabel,
          input.idempotencyKey,
          this.now(),
        ],
      );
      return this.getEntry(client, input.organizationId, replacementEntryId);
    });
  }
}

[executed on device: wandora-vps-01 (4f062e11-0f3c-4c6e-8f71-7d6136c1bee9)]