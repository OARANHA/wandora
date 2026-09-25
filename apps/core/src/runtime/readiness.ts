import type { Pool } from 'pg';
import type { RuntimeReadiness } from './server.js';

export function createRuntimeReadinessChecker(
  pool: Pool | undefined,
  options: {
    organizationAdapterEnabled?: boolean;
    customerCompanyOnboardingEnabled?: boolean;
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

    if (options.customerCompanyOnboardingEnabled) {
      try {
        await pool.query(`
          SELECT 1 FROM wandora.organization_profiles LIMIT 0;
          SELECT to_regprocedure(
            'wandora_private.complete_customer_company_onboarding_v1(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz)'
          ) IS NOT NULL AS onboarding_contract;
          SELECT to_regprocedure(
            'wandora.update_organization_profile_v1(uuid,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,timestamptz)'
          ) IS NOT NULL AS update_contract;
        `);
      } catch {
        return {
          ready: false,
          reason: 'customer-company-onboarding-database-boundary-unavailable',
        };
      }
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

      try {
        await pool.query(`
          SELECT 1
            FROM wandora.organization_grounding_entries
           LIMIT 0;
        `);
      } catch {
        return {
          ready: false,
          reason: 'organization-grounding-runtime-boundary-unavailable',
        };
      }

      try {
        await pool.query(`
          SELECT 1
            FROM wandora.digital_employee_guidance_entries
           LIMIT 0;
        `);
      } catch {
        return {
          ready: false,
          reason: 'digital-employee-guidance-runtime-boundary-unavailable',
        };
      }
    }

    return { ready: true };
  };
}
