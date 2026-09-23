import type { Pool, PoolClient } from 'pg';
import { WANDORA_CATALOG_V1 } from '../organization-adapter/contracts.js';
import { HumanAccessError, type HumanSupervisionReadService } from './human-read.js';

const STARTER_CATALOG_KEY = 'ana-commercial-v1' as const;
const STARTER_PROVIDER = 'paperclip' as const;

export type StarterWorkforceState =
  | 'commercial-activation-required'
  | 'provider-company-required'
  | 'hire-required'
  | 'activation-required'
  | 'ready'
  | 'reconciliation-required';

export type StarterWorkforceReadiness = {
  ready: boolean;
  state: StarterWorkforceState;
  starterProvisioningAllowed: boolean;
  starter: {
    catalogKey: typeof STARTER_CATALOG_KEY;
    name: string;
    status: 'absent' | 'paused' | 'active' | 'unknown';
  };
};

export type StarterWorkforceEvidence = {
  eligibilityEnabled: boolean;
  controlBindingCount: number;
  hireStatus: 'planned' | 'creating' | 'completed' | 'uncertain' | null;
  matchingEmployeeCount: number;
  boundEmployeeCount: number;
  employeeStatus: 'paused' | 'active' | null;
};

export function classifyStarterWorkforce(evidence: StarterWorkforceEvidence): StarterWorkforceReadiness {
  const definition = WANDORA_CATALOG_V1.get(STARTER_CATALOG_KEY);
  if (!definition) throw new Error('starter_catalog_definition_missing');

  const starterStatus = evidence.employeeStatus ?? (evidence.matchingEmployeeCount === 0 ? 'absent' : 'unknown');
  const result = (state: StarterWorkforceState): StarterWorkforceReadiness => ({
    ready: state === 'ready',
    state,
    starterProvisioningAllowed: evidence.eligibilityEnabled,
    starter: { catalogKey: STARTER_CATALOG_KEY, name: definition.displayName, status: starterStatus },
  });

  if (evidence.hireStatus && evidence.hireStatus !== 'completed') return result('reconciliation-required');

  if (evidence.hireStatus === 'completed') {
    if (
      evidence.controlBindingCount !== 1
      || evidence.matchingEmployeeCount !== 1
      || evidence.boundEmployeeCount !== 1
      || !evidence.employeeStatus
    ) return result('reconciliation-required');
    return result(evidence.employeeStatus === 'active' ? 'ready' : 'activation-required');
  }

  if (evidence.matchingEmployeeCount !== 0 || evidence.boundEmployeeCount !== 0) {
    return result('reconciliation-required');
  }
  if (!evidence.eligibilityEnabled) return result('commercial-activation-required');
  if (evidence.controlBindingCount === 0) return result('provider-company-required');
  if (evidence.controlBindingCount !== 1) return result('reconciliation-required');
  return result('hire-required');
}

type EvidenceRow = {
  eligibility_enabled: boolean;
  control_binding_count: number;
  hire_status: StarterWorkforceEvidence['hireStatus'];
  matching_employee_count: number;
  bound_employee_count: number;
  employee_status: StarterWorkforceEvidence['employeeStatus'];
};

export class HumanStarterWorkforceReadinessService {
  constructor(
    private readonly pool: Pool,
    private readonly sessionService: HumanSupervisionReadService,
  ) {}

  private async scoped<T>(organizationId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
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

  async getReadiness(authorization: string | undefined, organizationId: string): Promise<StarterWorkforceReadiness> {
    const session = await this.sessionService.getSessionContext(authorization);
    const organization = session.organizations.find((item) => item.id === organizationId);
    if (!organization) throw new HumanAccessError('forbidden', 'Organization access is not allowed.');

    return this.scoped(organizationId, async (client) => {
      const result = await client.query<EvidenceRow>(
        `SELECT
           COALESCE((
             SELECT e.enabled
               FROM wandora_private.digital_employee_catalog_hire_eligibility e
              WHERE e.organization_id = $1 AND e.catalog_key = $2
              LIMIT 1
           ), false) AS eligibility_enabled,
           (SELECT count(*)::int FROM wandora_private.control_plane_provider_bindings c
             WHERE c.organization_id = $1 AND c.provider = $3) AS control_binding_count,
           (SELECT h.status::text FROM wandora_private.digital_employee_hire_operations h
             WHERE h.organization_id = $1 AND h.provider = $3 AND h.catalog_key = $2
             LIMIT 1) AS hire_status,
           (SELECT count(*)::int FROM wandora.digital_employees de
             WHERE de.organization_id = $1 AND de.display_name = $4 AND de.role = $5 AND de.autonomy_mode = $6) AS matching_employee_count,
           (SELECT count(*)::int
              FROM wandora.digital_employees de
              JOIN wandora_private.digital_employee_provider_bindings b
                ON b.organization_id = de.organization_id AND b.employee_id = de.id AND b.provider = $3
              JOIN wandora_private.digital_employee_hire_operations h
                ON h.organization_id = de.organization_id AND h.employee_id = de.id AND h.provider = b.provider
               AND h.catalog_key = $2 AND h.status = 'completed' AND h.provider_agent_ref = b.provider_agent_ref
             WHERE de.organization_id = $1 AND de.display_name = $4 AND de.role = $5 AND de.autonomy_mode = $6) AS bound_employee_count,
           (SELECT de.status::text
              FROM wandora.digital_employees de
              JOIN wandora_private.digital_employee_provider_bindings b
                ON b.organization_id = de.organization_id AND b.employee_id = de.id AND b.provider = $3
              JOIN wandora_private.digital_employee_hire_operations h
                ON h.organization_id = de.organization_id AND h.employee_id = de.id AND h.provider = b.provider
               AND h.catalog_key = $2 AND h.status = 'completed' AND h.provider_agent_ref = b.provider_agent_ref
             WHERE de.organization_id = $1 AND de.display_name = $4 AND de.role = $5 AND de.autonomy_mode = $6
             ORDER BY de.id
             LIMIT 1) AS employee_status`,
        [organizationId, STARTER_CATALOG_KEY, STARTER_PROVIDER, 'Ana', 'commercial-assistant', 'supervised'],
      );
      const row = result.rows[0];
      if (!row) throw new Error('starter_workforce_evidence_missing');
      return classifyStarterWorkforce({
        eligibilityEnabled: row.eligibility_enabled,
        controlBindingCount: row.control_binding_count,
        hireStatus: row.hire_status,
        matchingEmployeeCount: row.matching_employee_count,
        boundEmployeeCount: row.bound_employee_count,
        employeeStatus: row.employee_status,
      });
    });
  }
}
