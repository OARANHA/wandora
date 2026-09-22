import type { Pool, PoolClient } from 'pg';
import type {
  AssignedTask,
  RuntimeGroundingProjection,
  RuntimeGroundingStatement,
} from './task-runtime.js';

type GroundingRow = {
  entry_type: 'fact' | 'rule';
  content: string;
  provenance_type: 'owner_statement' | 'approved_source' | 'approved_correction';
  source_ref: string | null;
  source_label: string | null;
};

const MAX_RUNTIME_GROUNDING_ENTRIES = 200;

export class OrganizationGroundingProjectionOverflowError extends Error {
  constructor() {
    super('Organization grounding exceeds the bounded runtime projection.');
    this.name = 'OrganizationGroundingProjectionOverflowError';
  }
}

export interface OrganizationGroundingProjection {
  project(
    organizationId: string,
    workContext: AssignedTask,
  ): Promise<RuntimeGroundingProjection>;
}
const statement = (row: GroundingRow): RuntimeGroundingStatement => ({
  content: row.content,
  provenance: {
    type: row.provenance_type,
    sourceRef: row.source_ref,
    sourceLabel: row.source_label,
  },
});

export class PostgresOrganizationGroundingProjection
implements OrganizationGroundingProjection {
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
    workContext: AssignedTask,
  ): Promise<RuntimeGroundingProjection> {
    const rows = await this.scoped(organizationId, async (client) => {
      const result = await client.query<GroundingRow>(
        `SELECT entry_type, content, provenance_type, source_ref, source_label
           FROM wandora.organization_grounding_entries
          WHERE organization_id = $1
            AND status = 'active'
          ORDER BY created_at ASC, id ASC
          LIMIT $2`,
        [organizationId, MAX_RUNTIME_GROUNDING_ENTRIES + 1],
      );
      return result.rows;
    });

    if (rows.length > MAX_RUNTIME_GROUNDING_ENTRIES) {
      throw new OrganizationGroundingProjectionOverflowError();
    }

    return {
      officialFacts: rows
        .filter((row) => row.entry_type === 'fact')
        .map(statement),
      houseRules: rows
        .filter((row) => row.entry_type === 'rule')
        .map(statement),
      workContext: {
        title: workContext.title,
        description: workContext.description,
      },
    };
  }
}
