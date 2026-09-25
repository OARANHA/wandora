import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import {
  HumanAccessError,
  HumanNotFoundError,
  type HumanSessionContext,
  type HumanSupervisionReadService,
} from './human-read.js';

export type EmployeeGuidanceType = 'responsibility' | 'behavior' | 'practice';
export type EmployeeGuidanceProvenanceType = 'owner_statement' | 'approved_evidence' | 'approved_correction';
export type EmployeeGuidanceStatus = 'active' | 'retired';

export type HumanDigitalEmployeeGuidanceEntry = {
  id: string;
  employeeId: string;
  type: EmployeeGuidanceType;
  content: string;
  provenance: {
    type: EmployeeGuidanceProvenanceType;
    sourceRef: string | null;
    sourceLabel: string | null;
  };
  supersedesEntryId: string | null;
  status: EmployeeGuidanceStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateEmployeeGuidanceInput = {
  organizationId: string;
  employeeId: string;
  authorization: string | undefined;
  idempotencyKey: string;
  entryType: EmployeeGuidanceType;
  content: string;
  provenanceType: Exclude<EmployeeGuidanceProvenanceType, 'approved_correction'>;
  sourceRef: string | null;
  sourceLabel: string | null;
};

export type CorrectEmployeeGuidanceInput = {
  organizationId: string;
  employeeId: string;
  authorization: string | undefined;
  idempotencyKey: string;
  entryId: string;
  content: string;
  sourceRef: string;
  sourceLabel: string | null;
};

export type RetireEmployeeGuidanceInput = {
  organizationId: string;
  employeeId: string;
  authorization: string | undefined;
  idempotencyKey: string;
  entryId: string;
};

export class HumanDigitalEmployeeGuidanceConflictError extends Error {
  constructor(
    readonly code: 'idempotency-conflict' | 'guidance-not-active',
    message: string,
  ) {
    super(message);
    this.name = 'HumanDigitalEmployeeGuidanceConflictError';
  }
}

type GuidanceRow = {
  id: string;
  employee_id: string;
  entry_type: EmployeeGuidanceType;
  content: string;
  provenance_type: EmployeeGuidanceProvenanceType;
  source_ref: string | null;
  source_label: string | null;
  supersedes_entry_id: string | null;
  status: EmployeeGuidanceStatus;
  created_by_user_id: string;
  created_at: Date;
  updated_at: Date;
};

function mapRow(row: GuidanceRow): HumanDigitalEmployeeGuidanceEntry {
  return {
    id: row.id,
    employeeId: row.employee_id,
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

export class HumanDigitalEmployeeGuidanceService {
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
    if (!membership) throw new HumanAccessError('forbidden', 'Organization access is not allowed.');
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
    if (
      message.includes('employee_guidance_mutation_forbidden')
      || message.includes('employee_guidance_tenant_mismatch')
    ) {
      return new HumanAccessError('forbidden', 'Employee development mutation is not allowed.');
    }
    if (
      message.includes('employee_guidance_not_found')
      || message.includes('employee_guidance_employee_not_found')
    ) {
      return new HumanNotFoundError();
    }
    if (message.includes('employee_guidance_idempotency_conflict')) {
      return new HumanDigitalEmployeeGuidanceConflictError(
        'idempotency-conflict',
        'Idempotency key conflicts with existing employee guidance state.',
      );
    }
    if (message.includes('employee_guidance_not_active')) {
      return new HumanDigitalEmployeeGuidanceConflictError(
        'guidance-not-active',
        'Only active employee guidance can be changed.',
      );
    }
    return error;
  }

  private async requireEmployee(
    client: PoolClient,
    organizationId: string,
    employeeId: string,
  ): Promise<void> {
    const result = await client.query(
      `SELECT 1
         FROM wandora.digital_employees
        WHERE organization_id = $1
          AND id = $2
        LIMIT 1`,
      [organizationId, employeeId],
    );
    if (!result.rowCount) throw new HumanNotFoundError();
  }

  private async getEntry(
    client: PoolClient,
    organizationId: string,
    employeeId: string,
    entryId: string,
  ): Promise<HumanDigitalEmployeeGuidanceEntry> {
    const result = await client.query<GuidanceRow>(
      `SELECT id::text,
              employee_id::text,
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
         FROM wandora.digital_employee_guidance_entries
        WHERE organization_id = $1
          AND employee_id = $2
          AND id = $3
        LIMIT 1`,
      [organizationId, employeeId, entryId],
    );
    const row = result.rows[0];
    if (!row) throw new HumanNotFoundError();
    return mapRow(row);
  }

  async list(
    authorization: string | undefined,
    organizationId: string,
    employeeId: string,
  ): Promise<HumanDigitalEmployeeGuidanceEntry[]> {
    const session = await this.humanRead.getSessionContext(authorization);
    this.membership(session, organizationId);

    return this.scoped(organizationId, true, async (client) => {
      await this.requireEmployee(client, organizationId, employeeId);
      const result = await client.query<GuidanceRow>(
        `SELECT id::text,
                employee_id::text,
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
           FROM wandora.digital_employee_guidance_entries
          WHERE organization_id = $1
            AND employee_id = $2
          ORDER BY created_at ASC, id ASC
          LIMIT 500`,
        [organizationId, employeeId],
      );
      return result.rows.map(mapRow);
    });
  }

  async create(input: CreateEmployeeGuidanceInput): Promise<HumanDigitalEmployeeGuidanceEntry> {
    const session = await this.humanRead.getSessionContext(input.authorization);
    const membership = this.membership(session, input.organizationId);
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      throw new HumanAccessError('forbidden', 'Only an active owner or admin may teach a digital employee.');
    }

    const entryId = deterministicMutationId([
      'digital-employee-guidance-create-v1',
      input.organizationId,
      input.employeeId,
      input.idempotencyKey,
    ]);

    return this.scoped(input.organizationId, false, async (client) => {
      await client.query(
        `SELECT wandora.create_digital_employee_guidance_entry(
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
         )`,
        [
          input.organizationId,
          input.employeeId,
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
      return this.getEntry(client, input.organizationId, input.employeeId, entryId);
    });
  }

  async retire(input: RetireEmployeeGuidanceInput): Promise<HumanDigitalEmployeeGuidanceEntry> {
    const session = await this.humanRead.getSessionContext(input.authorization);
    const membership = this.membership(session, input.organizationId);
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      throw new HumanAccessError('forbidden', 'Only an active owner or admin may change employee learning.');
    }

    return this.scoped(input.organizationId, false, async (client) => {
      await client.query(
        `SELECT wandora.retire_digital_employee_guidance_entry($1, $2, $3, $4, $5, $6)`,
        [
          input.organizationId,
          input.employeeId,
          input.entryId,
          session.user.id,
          input.idempotencyKey,
          this.now(),
        ],
      );
      return this.getEntry(client, input.organizationId, input.employeeId, input.entryId);
    });
  }

  async correct(input: CorrectEmployeeGuidanceInput): Promise<HumanDigitalEmployeeGuidanceEntry> {
    const session = await this.humanRead.getSessionContext(input.authorization);
    const membership = this.membership(session, input.organizationId);
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      throw new HumanAccessError('forbidden', 'Only an active owner or admin may change employee learning.');
    }

    const replacementEntryId = deterministicMutationId([
      'digital-employee-guidance-correct-v1',
      input.organizationId,
      input.employeeId,
      input.entryId,
      input.idempotencyKey,
    ]);

    return this.scoped(input.organizationId, false, async (client) => {
      await client.query(
        `SELECT wandora.correct_digital_employee_guidance_entry(
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
         )`,
        [
          input.organizationId,
          input.employeeId,
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
      return this.getEntry(client, input.organizationId, input.employeeId, replacementEntryId);
    });
  }
}
