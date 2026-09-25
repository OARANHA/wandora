import type { Pool, PoolClient } from 'pg';
import type { RuntimeEmployeeGuidance } from './task-runtime.js';

type DevelopmentRow = {
  entry_kind: RuntimeEmployeeGuidance['kind'];
  content: string;
  provenance_type: RuntimeEmployeeGuidance['provenance']['type'];
  source_label: string | null;
};

const MAX_RUNTIME_EMPLOYEE_GUIDANCE_ENTRIES = 100;

export class EmployeeDevelopmentProjectionOverflowError extends Error {
  constructor() {
    super('Employee development guidance exceeds the bounded runtime projection.');
    this.name = 'EmployeeDevelopmentProjectionOverflowError';
  }
}

export interface EmployeeDevelopmentProjection {
  project(
    organizationId: string,
    employeeId: string,
  ): Promise<RuntimeEmployeeGuidance[]>;
}

export class PostgresEmployeeDevelopmentProjection
implements EmployeeDevelopmentProjection {
  constructor(private readonly pool: Pool) {}

  private async scoped<T>(
    organizationId: string,
    fn: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
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

  async project(
    organizationId: string,
    employeeId: string,
  ): Promise<RuntimeEmployeeGuidance[]> {
    const rows = await this.scoped(organizationId, async (client) => {
      const result = await client.query<DevelopmentRow>(
        `SELECT entry_kind, content, provenance_type, source_label
           FROM wandora.digital_employee_development_entries
          WHERE organization_id = $1
            AND employee_id = $2
            AND status = 'active'
          ORDER BY created_at ASC, id ASC
          LIMIT $3`,
        [organizationId, employeeId, MAX_RUNTIME_EMPLOYEE_GUIDANCE_ENTRIES + 1],
      );
      return result.rows;
    });

    if (rows.length > MAX_RUNTIME_EMPLOYEE_GUIDANCE_ENTRIES) {
      throw new EmployeeDevelopmentProjectionOverflowError();
    }

    return rows.map((row) => ({
      kind: row.entry_kind,
      content: row.content,
      provenance: {
        type: row.provenance_type,
        sourceLabel: row.source_label,
      },
    }));
  }
}
