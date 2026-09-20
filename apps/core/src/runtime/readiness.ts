import type { Pool } from 'pg';
import type { RuntimeReadiness } from './server.js';

export function createRuntimeReadinessChecker(
  pool: Pool | undefined,
  options: {
    organizationAdapterEnabled?: boolean;
    customerHireEnabled?: boolean;
    customerWorkEnabled?: boolean;
    paperclipExecutionBridgeEnabled?: boolean;
  } = {},
): () => Promise<RuntimeReadiness> {
  return async (): Promise<RuntimeReadiness> => {
    if (!pool) return { ready: false, reason: 'standby' };

    try {
      const result = await pool.query<{ current_user: string; organization_scope: string | null }>(
        `SELECT current_user::text AS current_user,
                wandora.current_core_organization_id()::text AS organization_scope`,
      );
      const row = result.rows[0];
      if (!row || row.current_user !== 'wandora_core_runtime') {
        return { ready: false, reason: 'unexpected-database-role' };
      }
      if (row.organization_scope !== null) {
        return { ready: false, reason: 'tenant-scope-leak' };
      }
    } catch {
      return { ready: false, reason: 'database-unavailable' };
    }

    if (options.organizationAdapterEnabled) {
      try {
        await pool.query(`
          SELECT 1 FROM wandora_private.control_plane_provider_bindings LIMIT 0;
          SELECT 1 FROM wandora_private.digital_employee_provider_bindings LIMIT 0;
          SELECT 1 FROM wandora_private.digital_employee_hire_operations LIMIT 0;
        `);
      } catch {
        return {
          ready: false,
          reason: 'organization-adapter-database-boundary-unavailable',
        };
      }
    }

    if (options.customerHireEnabled) {
      try {
        await pool.query(`
          SELECT 1
            FROM wandora_private.digital_employee_catalog_hire_eligibility
           LIMIT 0;
        `);
      } catch {
        return {
          ready: false,
          reason: 'customer-hire-eligibility-database-boundary-unavailable',
        };
      }
    }

    if (options.customerWorkEnabled) {
      try {
        await pool.query(`
          SELECT 1
            FROM wandora_private.digital_employee_work_operations
           LIMIT 0;
        `);
      } catch {
        return {
          ready: false,
          reason: 'customer-work-database-boundary-unavailable',
        };
      }
    }

    if (options.paperclipExecutionBridgeEnabled) {
      try {
        await pool.query(`
          SELECT wandora_private.resolve_paperclip_execution_organization(
            'wandora-readiness-probe:paperclip-execution-bridge:v1'
          )::text AS organization_id;
        `);
      } catch {
        return {
          ready: false,
          reason: 'paperclip-execution-bridge-database-boundary-unavailable',
        };
      }
    }

    return { ready: true };
  };
}
