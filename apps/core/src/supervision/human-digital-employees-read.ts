import type { Pool, PoolClient } from 'pg';
import { HumanAccessError, type HumanSupervisionReadService } from './human-read.js';

export type HumanDigitalEmployee = {
  id: string;
  name: string;
  role: 'commercial-assistant';
  status: 'active' | 'paused';
  autonomy: 'supervised';
};

type DigitalEmployeeRow = {
  employee_id: string;
  employee_name: string;
  employee_role: 'commercial-assistant';
  employee_status: 'active' | 'paused';
  employee_autonomy: 'supervised';
};

export class HumanDigitalEmployeesReadService {
  constructor(
    private readonly pool: Pool,
    private readonly sessionService: HumanSupervisionReadService,
  ) {}

  private async scoped<T>(
    organizationId: string,
    fn: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
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
      `SELECT 1
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

  async listDigitalEmployees(
    authorization: string | undefined,
    organizationId: string,
  ): Promise<HumanDigitalEmployee[]> {
    const session = await this.sessionService.getSessionContext(authorization);

    return this.scoped(organizationId, async (client) => {
      await this.requireActiveMembership(client, organizationId, session.user.id);

      const result = await client.query<DigitalEmployeeRow>(
        `SELECT de.id::text AS employee_id,
                de.display_name AS employee_name,
                de.role::text AS employee_role,
                de.status::text AS employee_status,
                de.autonomy_mode::text AS employee_autonomy
           FROM wandora.digital_employees de
          WHERE de.organization_id = $1
          ORDER BY de.display_name, de.id`,
        [organizationId],
      );

      return result.rows.map((row) => ({
        id: row.employee_id,
        name: row.employee_name,
        role: row.employee_role,
        status: row.employee_status,
        autonomy: row.employee_autonomy,
      }));
    });
  }
}
