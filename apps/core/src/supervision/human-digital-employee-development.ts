import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import {
  HumanAccessError,
  HumanNotFoundError,
  type HumanSessionContext,
  type HumanSupervisionReadService,
} from './human-read.js';

export type EmployeeDevelopmentEntryKind = 'responsibility' | 'behavior' | 'practice';
export type EmployeeDevelopmentProvenanceType =
  | 'owner_statement'
  | 'approved_learning'
  | 'approved_correction';
export type EmployeeDevelopmentStatus = 'active' | 'retired';

export type HumanEmployeeDevelopmentEntry = {
  id: string;
  employeeId: string;
  kind: EmployeeDevelopmentEntryKind;
  content: string;
  provenance: {
    type: EmployeeDevelopmentProvenanceType;
    sourceRef: string | null;
    sourceLabel: string | null;
  };
  supersedesEntryId: string | null;
  status: EmployeeDevelopmentStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateEmployeeDevelopmentInput = {
  organizationId: string;
  employeeId: string;
  authorization: string | undefined;
  idempotencyKey: string;
  kind: EmployeeDevelopmentEntryKind;
  content: string;
  provenanceType: Exclude<EmployeeDevelopmentProvenanceType, 'approved_correction'>;
  sourceRef: string | null;
  sourceLabel: string | null;
};

export type CorrectEmployeeDevelopmentInput = {
  organizationId: string;
  employeeId: string;
  authorization: string | undefined;
  idempotencyKey: string;
  entryId: string;
  content: string;
  sourceRef: string;
  sourceLabel: string | null;
};

export type RetireEmployeeDevelopmentInput = {
  organizationId: string;
  employeeId: string;
  authorization: string | undefined;
  idempotencyKey: string;
  entryId: string;
};

export class HumanEmployeeDevelopmentConflictError extends Error {
  constructor(
    readonly code: 'idempotency-conflict' | 'employee-development-not-active',
    message: string,
  ) {
    super(message);
    this.name = 'HumanEmployeeDevelopmentConflictError';
  }
}

type DevelopmentRow = {
  id: string;
  employee_id: string;
  entry_kind: EmployeeDevelopmentEntryKind;
  content: string;
  provenance_type: EmployeeDevelopmentProvenanceType;
  source_ref: string | null;
  source_label: string | null;
  supersedes_entry_id: string | null;
  status: EmployeeDevelopmentStatus;
  created_by_user_id: string;
  created_at: Date;
  updated_at: Date;
};

function mapRow(row: DevelopmentRow): HumanEmployeeDevelopmentEntry {
  return {
    id: row.id,
    employeeId: row.employee_id,
    kind: row.entry_kind,
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

export class HumanDigitalEmployeeDevelopmentService {
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
    if (
      message.includes('employee_development_mutation_forbidden')
      || message.includes('employee_development_tenant_mismatch')
    ) {
      return new HumanAccessError('forbidden', 'Employee development mutation is not allowed.');
    }
    if (
      message.includes('employee_development_not_found')
      || message.includes('employee_development_employee_not_found')
    ) {
      return new HumanNotFoundError();
    }
    if (message.includes('employee_development_idempotency_conflict')) {
      return new HumanEmployeeDevelopmentConflictError(
        'idempotency-conflict',
        'Idempotency key conflicts with existing employee development state.',
      );
    }
    if (message.includes('employee_development_not_active')) {
      return new HumanEmployeeDevelopmentConflictError(
        'employee-development-not-active',
        'Only active employee development can be corrected or retired.',
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
  ): Promise<HumanEmployeeDevelopmentEntry> {
    const result = await client.query<DevelopmentRow>(
      `SELECT id::text,
              employee_id::text,
              entry_kind,
              content,
              provenance_type,
              source_ref,
              source_label,
              supersedes_entry_id::text,
              status,
              created_by_user_id::text,
              created_at,
              updated_at
         FROM wandora.digital_employee_development_entries
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
  ): Promise<HumanEmployeeDevelopmentEntry[]> {
    const session = await this.humanRead.getSessionContext(authorization);
    this.membership(session, organizationId);

    return this.scoped(organizationId, true, async (client) => {
      await this.requireEmployee(client, organizationId, employeeId);
      const result = await client.query<DevelopmentRow>(
        `SELECT id::text,
                employee_id::text,
                entry_kind,
                content,
                provenance_type,
                source_ref,
                source_label,
                supersedes_entry_id::text,
                status,
                created_by_user_id::text,
                created_at,
                updated_at
           FROM wandora.digital_employee_development_entries
          WHERE organization_id = $1
            AND employee_id = $2
          ORDER BY created_at ASC, id ASC
          LIMIT 500`,
        [organizationId, employeeId],
      );
      return result.rows.map(mapRow);
    });
  }

  async create(input: CreateEmployeeDevelopmentInput): Promise<HumanEmployeeDevelopmentEntry> {
    const session = await this.humanRead.getSessionContext(input.authorization);
    const membership = this.membership(session, input.organizationId);
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      throw new HumanAccessError('forbidden', 'Only an active owner or admin may change employee development.');
    }

    const entryId = deterministicMutationId([
      'digital-employee-development-create-v1',
      input.organizationId,
      input.employeeId,
      input.idempotencyKey,
    ]);

    return this.scoped(input.organizationId, false, async (client) => {
      await client.query(
        `SELECT wandora.create_digital_employee_development_entry(
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
         )`,
        [
          input.organizationId,
          input.employeeId,
          entryId,
          session.user.id,
          input.kind,
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

  async correct(input: CorrectEmployeeDevelopmentInput): Promise<HumanEmployeeDevelopmentEntry> {
    const session = await this.humanRead.getSessionContext(input.authorization);
    const membership = this.membership(session, input.organizationId);
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      throw new HumanAccessError('forbidden', 'Only an active owner or admin may change employee development.');
    }

    const replacementEntryId = deterministicMutationId([
      'digital-employee-development-correct-v1',
      input.organizationId,
      input.employeeId,
      input.entryId,
      input.idempotencyKey,
    ]);

    return this.scoped(input.organizationId, false, async (client) => {
      await client.query(
        `SELECT wandora.correct_digital_employee_development_entry(
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
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

  async retire(input: RetireEmployeeDevelopmentInput): Promise<HumanEmployeeDevelopmentEntry> {
    const session = await this.humanRead.getSessionContext(input.authorization);
    const membership = this.membership(session, input.organizationId);
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      throw new HumanAccessError('forbidden', 'Only an active owner or admin may change employee development.');
    }

    return this.scoped(input.organizationId, false, async (client) => {
      await client.query(
        `SELECT wandora.retire_digital_employee_development_entry($1,$2,$3,$4,$5,$6)`,
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
}
