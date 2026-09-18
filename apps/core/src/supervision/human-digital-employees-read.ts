import type { Pool, PoolClient } from 'pg';
import { WANDORA_CATALOG_V1 } from '../organization-adapter/contracts.js';
import { HumanAccessError, type HumanSupervisionReadService } from './human-read.js';

const CUSTOMER_HIRE_CATALOG_KEY = 'ana-commercial-v1' as const;
const CUSTOMER_HIRE_PROVIDER = 'paperclip' as const;

export type HumanDigitalEmployee = {
  id: string;
  name: string;
  role: 'commercial-assistant';
  status: 'active' | 'paused';
  autonomy: 'supervised';
};

export type HumanDigitalEmployeeHireAvailability = {
  catalogKey: typeof CUSTOMER_HIRE_CATALOG_KEY;
  available: boolean;
  state: 'available' | 'already-hired' | 'unavailable';
};

export type HumanDigitalEmployeesView = {
  items: HumanDigitalEmployee[];
  hire: HumanDigitalEmployeeHireAvailability;
};

type DigitalEmployeeRow = {
  employee_id: string;
  employee_name: string;
  employee_role: 'commercial-assistant';
  employee_status: 'active' | 'paused';
  employee_autonomy: 'supervised';
};

type MembershipRole = 'owner' | 'admin' | 'member';

export class HumanDigitalEmployeesReadService {
  constructor(
    private readonly pool: Pool,
    private readonly sessionService: HumanSupervisionReadService,
    private readonly catalogHireRuntimeEnabled = false,
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
  ): Promise<MembershipRole> {
    const membership = await client.query<{ role: MembershipRole }>(
      `SELECT m.role::text AS role
         FROM wandora.memberships m
         JOIN wandora.organizations o ON o.id = m.organization_id
        WHERE m.organization_id = $1
          AND m.user_id = $2
          AND m.status = 'active'
          AND o.status = 'active'
        LIMIT 1`,
      [organizationId, userId],
    );
    const role = membership.rows[0]?.role;
    if (!role) {
      throw new HumanAccessError('forbidden', 'Organization access is not allowed.');
    }
    return role;
  }

  private async getHireAvailability(
    client: PoolClient,
    organizationId: string,
    role: MembershipRole,
  ): Promise<HumanDigitalEmployeeHireAvailability> {
    const unavailable = (): HumanDigitalEmployeeHireAvailability => ({
      catalogKey: CUSTOMER_HIRE_CATALOG_KEY,
      available: false,
      state: 'unavailable',
    });

    if (!this.catalogHireRuntimeEnabled || (role !== 'owner' && role !== 'admin')) {
      return unavailable();
    }

    const existingOperation = await client.query<{ status: 'planned' | 'creating' | 'completed' | 'uncertain' }>(
      `SELECT status::text AS status
         FROM wandora_private.digital_employee_hire_operations
        WHERE organization_id = $1
          AND provider = $2
          AND catalog_key = $3
        LIMIT 1`,
      [organizationId, CUSTOMER_HIRE_PROVIDER, CUSTOMER_HIRE_CATALOG_KEY],
    );
    const operationStatus = existingOperation.rows[0]?.status;
    if (operationStatus === 'completed') {
      return {
        catalogKey: CUSTOMER_HIRE_CATALOG_KEY,
        available: false,
        state: 'already-hired',
      };
    }
    if (operationStatus) {
      return {
        catalogKey: CUSTOMER_HIRE_CATALOG_KEY,
        available: true,
        state: 'available',
      };
    }

    const eligibility = await client.query<{ enabled: boolean }>(
      `SELECT enabled
         FROM wandora_private.digital_employee_catalog_hire_eligibility
        WHERE organization_id = $1
          AND catalog_key = $2
        LIMIT 1`,
      [organizationId, CUSTOMER_HIRE_CATALOG_KEY],
    );
    if (eligibility.rows[0]?.enabled !== true) {
      return unavailable();
    }

    const definition = WANDORA_CATALOG_V1.get(CUSTOMER_HIRE_CATALOG_KEY);
    if (!definition) return unavailable();

    const legacyCollision = await client.query(
      `SELECT 1
         FROM wandora.digital_employees
        WHERE organization_id = $1
          AND display_name = $2
          AND role = $3
          AND autonomy_mode = $4
        LIMIT 1`,
      [organizationId, definition.displayName, definition.role, definition.autonomy],
    );
    if (legacyCollision.rowCount) {
      return unavailable();
    }

    const binding = await client.query(
      `SELECT 1
         FROM wandora_private.control_plane_provider_bindings
        WHERE organization_id = $1
          AND provider = $2
        LIMIT 1`,
      [organizationId, CUSTOMER_HIRE_PROVIDER],
    );
    if (binding.rowCount !== 1) {
      return unavailable();
    }

    return {
      catalogKey: CUSTOMER_HIRE_CATALOG_KEY,
      available: true,
      state: 'available',
    };
  }

  async getDigitalEmployeesView(
    authorization: string | undefined,
    organizationId: string,
  ): Promise<HumanDigitalEmployeesView> {
    const session = await this.sessionService.getSessionContext(authorization);

    return this.scoped(organizationId, async (client) => {
      const role = await this.requireActiveMembership(client, organizationId, session.user.id);

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

      const items = result.rows.map((row) => ({
        id: row.employee_id,
        name: row.employee_name,
        role: row.employee_role,
        status: row.employee_status,
        autonomy: row.employee_autonomy,
      }));

      return {
        items,
        hire: await this.getHireAvailability(client, organizationId, role),
      };
    });
  }

  async listDigitalEmployees(
    authorization: string | undefined,
    organizationId: string,
  ): Promise<HumanDigitalEmployee[]> {
    return (await this.getDigitalEmployeesView(authorization, organizationId)).items;
  }
}
