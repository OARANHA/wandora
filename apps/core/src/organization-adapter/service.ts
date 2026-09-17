import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { HumanAccessError } from '../supervision/human-read.js';
import {
  OrganizationAdapterConflictError,
  OrganizationAdapterUnavailableError,
  WANDORA_CATALOG_V1,
  type CatalogEmployeeDefinition,
  type CatalogEmployeeResult,
  type OrganizationAdapterProvider,
} from './contracts.js';

type OperationStatus = 'planned' | 'creating' | 'completed' | 'uncertain';

type OperationRow = {
  idempotency_key: string;
  request_hash: string;
  employee_id: string;
  provider: string;
  catalog_key: string;
  provider_company_ref: string;
  status: OperationStatus;
  provider_agent_ref: string | null;
};

type EmployeeRow = {
  employee_id: string;
  employee_name: string;
  employee_role: 'commercial-assistant';
  employee_status: 'active' | 'paused';
  employee_autonomy: 'supervised';
  provider_agent_ref: string;
};

const canonicalRequestHash = (definition: CatalogEmployeeDefinition): string => {
  const canonical = [
    'organization-adapter-catalog-hire-v1',
    definition.key,
    definition.displayName,
    definition.role,
    definition.autonomy,
  ];
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
};

const isUniqueViolation = (error: unknown): boolean => (
  typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
);

export class OrganizationAdapterService {
  constructor(
    private readonly pool: Pool,
    private readonly provider: OrganizationAdapterProvider,
    private readonly catalog: ReadonlyMap<string, CatalogEmployeeDefinition> = WANDORA_CATALOG_V1,
    private readonly uuid: () => string = randomUUID,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  private async scopedWrite<T>(organizationId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
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

  private async requireOwnerOrAdmin(
    client: PoolClient,
    organizationId: string,
    actorUserId: string,
  ): Promise<void> {
    const membership = await client.query<{ role: 'owner' | 'admin' | 'member' }>(
      `SELECT m.role::text AS role
         FROM wandora.memberships m
         JOIN wandora.organizations o ON o.id = m.organization_id
        WHERE m.organization_id = $1
          AND m.user_id = $2
          AND m.status = 'active'
          AND o.status = 'active'
        LIMIT 1`,
      [organizationId, actorUserId],
    );
    const role = membership.rows[0]?.role;
    if (role !== 'owner' && role !== 'admin') {
      throw new HumanAccessError('forbidden', 'Human actor cannot manage digital employees for this organization.');
    }
  }

  private assertOperationContext(
    operation: OperationRow,
    expected: Pick<OperationRow, 'request_hash' | 'employee_id' | 'provider' | 'catalog_key' | 'provider_company_ref'>,
  ): void {
    if (
      operation.request_hash !== expected.request_hash
      || operation.employee_id !== expected.employee_id
      || operation.provider !== expected.provider
      || operation.catalog_key !== expected.catalog_key
      || operation.provider_company_ref !== expected.provider_company_ref
    ) {
      throw new OrganizationAdapterConflictError(
        'state-inconsistent',
        'Reserved organization-adapter operation changed unexpectedly.',
      );
    }
  }

  private async reserveOperation(args: {
    organizationId: string;
    actorUserId: string;
    idempotencyKey: string;
    definition: CatalogEmployeeDefinition;
    requestHash: string;
  }): Promise<OperationRow> {
    return this.scopedWrite(args.organizationId, async (client) => {
      await this.requireOwnerOrAdmin(client, args.organizationId, args.actorUserId);

      const byKey = await client.query<OperationRow>(
        `SELECT idempotency_key, request_hash, employee_id::text, provider, catalog_key,
                provider_company_ref, status::text AS status, provider_agent_ref
           FROM wandora_private.digital_employee_hire_operations
          WHERE organization_id = $1 AND idempotency_key = $2
          FOR UPDATE`,
        [args.organizationId, args.idempotencyKey],
      );
      const keyed = byKey.rows[0];
      if (keyed) {
        if (keyed.provider !== this.provider.provider) {
          throw new OrganizationAdapterConflictError(
            'state-inconsistent',
            'The idempotency key belongs to a different provider operation.',
          );
        }
        if (keyed.request_hash !== args.requestHash || keyed.catalog_key !== args.definition.key) {
          throw new OrganizationAdapterConflictError(
            'idempotency-conflict',
            'The idempotency key is already reserved for a different canonical request.',
          );
        }
        return keyed;
      }

      const byCatalog = await client.query<OperationRow>(
        `SELECT idempotency_key, request_hash, employee_id::text, provider, catalog_key,
                provider_company_ref, status::text AS status, provider_agent_ref
           FROM wandora_private.digital_employee_hire_operations
          WHERE organization_id = $1 AND provider = $2 AND catalog_key = $3
          FOR UPDATE`,
        [args.organizationId, this.provider.provider, args.definition.key],
      );
      const catalogOperation = byCatalog.rows[0];
      if (catalogOperation) {
        if (catalogOperation.request_hash !== args.requestHash) {
          throw new OrganizationAdapterConflictError(
            'catalog-conflict',
            'The catalog employee is already reserved with a different canonical definition.',
          );
        }
        return catalogOperation;
      }

      const binding = await client.query<{ provider_company_ref: string }>(
        `SELECT provider_company_ref
           FROM wandora_private.control_plane_provider_bindings
          WHERE organization_id = $1 AND provider = $2`,
        [args.organizationId, this.provider.provider],
      );
      const providerCompanyRef = binding.rows[0]?.provider_company_ref;
      if (!providerCompanyRef) {
        throw new OrganizationAdapterUnavailableError(
          'provider-not-configured',
          'The organization control-plane provider is not configured.',
        );
      }

      const employeeId = this.uuid();
      const inserted = await client.query<OperationRow>(
        `INSERT INTO wandora_private.digital_employee_hire_operations
           (organization_id, idempotency_key, request_hash, employee_id, provider,
            catalog_key, provider_company_ref, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'planned')
         RETURNING idempotency_key, request_hash, employee_id::text, provider, catalog_key,
                   provider_company_ref, status::text AS status, provider_agent_ref`,
        [
          args.organizationId,
          args.idempotencyKey,
          args.requestHash,
          employeeId,
          this.provider.provider,
          args.definition.key,
          providerCompanyRef,
        ],
      );
      const operation = inserted.rows[0];
      if (!operation) throw new Error('organization_adapter_operation_insert_failed');
      return operation;
    });
  }

  private async reserveOperationWithRaceRetry(args: {
    organizationId: string;
    actorUserId: string;
    idempotencyKey: string;
    definition: CatalogEmployeeDefinition;
    requestHash: string;
  }): Promise<OperationRow> {
    try {
      return await this.reserveOperation(args);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      return this.reserveOperation(args);
    }
  }

  private async markCreating(organizationId: string, operation: OperationRow): Promise<OperationRow> {
    return this.scopedWrite(organizationId, async (client) => {
      const result = await client.query<OperationRow>(
        `UPDATE wandora_private.digital_employee_hire_operations
            SET status = CASE WHEN status = 'completed' THEN status ELSE 'creating' END
          WHERE organization_id = $1 AND idempotency_key = $2
          RETURNING idempotency_key, request_hash, employee_id::text, provider, catalog_key,
                    provider_company_ref, status::text AS status, provider_agent_ref`,
        [organizationId, operation.idempotency_key],
      );
      const current = result.rows[0];
      if (!current) {
        throw new OrganizationAdapterConflictError('state-inconsistent', 'Reserved operation disappeared.');
      }
      this.assertOperationContext(current, operation);
      return current;
    });
  }

  private async markUncertain(organizationId: string, idempotencyKey: string): Promise<void> {
    await this.scopedWrite(organizationId, async (client) => {
      await client.query(
        `UPDATE wandora_private.digital_employee_hire_operations
            SET status = 'uncertain'
          WHERE organization_id = $1
            AND idempotency_key = $2
            AND status <> 'completed'`,
        [organizationId, idempotencyKey],
      );
    });
  }

  private async loadOperation(organizationId: string, idempotencyKey: string): Promise<OperationRow | undefined> {
    return this.scopedWrite(organizationId, async (client) => {
      const result = await client.query<OperationRow>(
        `SELECT idempotency_key, request_hash, employee_id::text, provider, catalog_key,
                provider_company_ref, status::text AS status, provider_agent_ref
           FROM wandora_private.digital_employee_hire_operations
          WHERE organization_id = $1 AND idempotency_key = $2`,
        [organizationId, idempotencyKey],
      );
      return result.rows[0];
    });
  }

  private async readCompletedResult(
    client: PoolClient,
    organizationId: string,
    operation: OperationRow,
    definition: CatalogEmployeeDefinition,
  ): Promise<CatalogEmployeeResult> {
    if (operation.provider !== this.provider.provider) {
      throw new OrganizationAdapterConflictError('state-inconsistent', 'Completed operation provider is inconsistent.');
    }
    const result = await client.query<EmployeeRow>(
      `SELECT de.id::text AS employee_id,
              de.display_name AS employee_name,
              de.role::text AS employee_role,
              de.status::text AS employee_status,
              de.autonomy_mode::text AS employee_autonomy,
              depb.provider_agent_ref
         FROM wandora.digital_employees de
         JOIN wandora_private.digital_employee_provider_bindings depb
           ON depb.organization_id = de.organization_id
          AND depb.employee_id = de.id
          AND depb.provider = $3
        WHERE de.organization_id = $1 AND de.id = $2`,
      [organizationId, operation.employee_id, this.provider.provider],
    );
    const row = result.rows[0];
    if (
      !row
      || operation.status !== 'completed'
      || !operation.provider_agent_ref
      || row.provider_agent_ref !== operation.provider_agent_ref
      || row.employee_name !== definition.displayName
      || row.employee_role !== definition.role
      || row.employee_status !== 'active'
      || row.employee_autonomy !== definition.autonomy
    ) {
      throw new OrganizationAdapterConflictError(
        'state-inconsistent',
        'Completed organization-adapter state is inconsistent.',
      );
    }
    return {
      id: row.employee_id,
      name: row.employee_name,
      role: row.employee_role,
      status: 'active',
      autonomy: row.employee_autonomy,
    };
  }

  private async completedResult(
    organizationId: string,
    operation: OperationRow,
    definition: CatalogEmployeeDefinition,
  ): Promise<CatalogEmployeeResult> {
    return this.scopedWrite(
      organizationId,
      (client) => this.readCompletedResult(client, organizationId, operation, definition),
    );
  }

  private async finalize(args: {
    organizationId: string;
    operation: OperationRow;
    definition: CatalogEmployeeDefinition;
    providerAgentRef: string;
  }): Promise<CatalogEmployeeResult> {
    return this.scopedWrite(args.organizationId, async (client) => {
      const locked = await client.query<OperationRow>(
        `SELECT idempotency_key, request_hash, employee_id::text, provider, catalog_key,
                provider_company_ref, status::text AS status, provider_agent_ref
           FROM wandora_private.digital_employee_hire_operations
          WHERE organization_id = $1 AND idempotency_key = $2
          FOR UPDATE`,
        [args.organizationId, args.operation.idempotency_key],
      );
      const current = locked.rows[0];
      if (!current) {
        throw new OrganizationAdapterConflictError('state-inconsistent', 'Reserved operation disappeared.');
      }
      this.assertOperationContext(current, args.operation);
      if (current.status === 'completed') {
        return this.readCompletedResult(client, args.organizationId, current, args.definition);
      }

      const existingProviderRef = await client.query<{ employee_id: string }>(
        `SELECT employee_id::text
           FROM wandora_private.digital_employee_provider_bindings
          WHERE provider = $1 AND provider_agent_ref = $2`,
        [this.provider.provider, args.providerAgentRef],
      );
      const providerRefBinding = existingProviderRef.rows[0];
      if (providerRefBinding && providerRefBinding.employee_id !== current.employee_id) {
        throw new OrganizationAdapterConflictError(
          'state-inconsistent',
          'Provider agent is already bound to a different Wandora employee in this tenant scope.',
        );
      }

      await client.query(
        `INSERT INTO wandora.digital_employees
           (id, organization_id, display_name, role, status, autonomy_mode)
         VALUES ($1, $2, $3, $4, 'active', $5)
         ON CONFLICT (id) DO NOTHING`,
        [
          current.employee_id,
          args.organizationId,
          args.definition.displayName,
          args.definition.role,
          args.definition.autonomy,
        ],
      );

      const employee = await client.query<{
        display_name: string;
        role: 'commercial-assistant';
        status: 'active' | 'paused';
        autonomy_mode: 'supervised';
      }>(
        `SELECT display_name, role::text AS role, status::text AS status, autonomy_mode::text AS autonomy_mode
           FROM wandora.digital_employees
          WHERE organization_id = $1 AND id = $2`,
        [args.organizationId, current.employee_id],
      );
      const employeeRow = employee.rows[0];
      if (
        !employeeRow
        || employeeRow.display_name !== args.definition.displayName
        || employeeRow.role !== args.definition.role
        || employeeRow.status !== 'active'
        || employeeRow.autonomy_mode !== args.definition.autonomy
      ) {
        throw new OrganizationAdapterConflictError('state-inconsistent', 'Reserved employee state is inconsistent.');
      }

      const existingEmployeeBinding = await client.query<{ provider_agent_ref: string }>(
        `SELECT provider_agent_ref
           FROM wandora_private.digital_employee_provider_bindings
          WHERE organization_id = $1 AND employee_id = $2 AND provider = $3`,
        [args.organizationId, current.employee_id, this.provider.provider],
      );
      const boundRef = existingEmployeeBinding.rows[0]?.provider_agent_ref;
      if (boundRef && boundRef !== args.providerAgentRef) {
        throw new OrganizationAdapterConflictError(
          'state-inconsistent',
          'Reserved employee is already bound to a different provider agent.',
        );
      }
      if (!boundRef) {
        await client.query(
          `INSERT INTO wandora_private.digital_employee_provider_bindings
             (organization_id, employee_id, provider, provider_agent_ref)
           VALUES ($1, $2, $3, $4)`,
          [args.organizationId, current.employee_id, this.provider.provider, args.providerAgentRef],
        );
      }

      await client.query(
        `UPDATE wandora_private.digital_employee_hire_operations
            SET status = 'completed', provider_agent_ref = $3, completed_at = $4
          WHERE organization_id = $1 AND idempotency_key = $2`,
        [args.organizationId, current.idempotency_key, args.providerAgentRef, this.now()],
      );

      return {
        id: current.employee_id,
        name: args.definition.displayName,
        role: args.definition.role,
        status: 'active',
        autonomy: args.definition.autonomy,
      };
    });
  }

  private async recoverCompletedResult(args: {
    organizationId: string;
    idempotencyKey: string;
    definition: CatalogEmployeeDefinition;
    providerAgentRef: string;
  }): Promise<CatalogEmployeeResult | undefined> {
    const persisted = await this.loadOperation(args.organizationId, args.idempotencyKey);
    if (
      !persisted
      || persisted.status !== 'completed'
      || persisted.provider_agent_ref !== args.providerAgentRef
    ) {
      return undefined;
    }
    return this.completedResult(args.organizationId, persisted, args.definition);
  }

  async ensureCatalogEmployee(args: {
    organizationId: string;
    actorUserId: string;
    catalogKey: string;
    idempotencyKey: string;
  }): Promise<CatalogEmployeeResult> {
    const idempotencyKey = args.idempotencyKey.trim();
    if (!idempotencyKey || idempotencyKey.length > 255) {
      throw new RangeError('organization_adapter_invalid_idempotency_key');
    }
    const definition = this.catalog.get(args.catalogKey);
    if (!definition) {
      throw new OrganizationAdapterUnavailableError(
        'catalog-employee-unknown',
        'The requested catalog employee is not available in this adapter version.',
      );
    }
    const requestHash = canonicalRequestHash(definition);
    let operation = await this.reserveOperationWithRaceRetry({
      organizationId: args.organizationId,
      actorUserId: args.actorUserId,
      idempotencyKey,
      definition,
      requestHash,
    });

    if (operation.status === 'completed') {
      return this.completedResult(args.organizationId, operation, definition);
    }

    operation = await this.markCreating(args.organizationId, operation);
    if (operation.status === 'completed') {
      return this.completedResult(args.organizationId, operation, definition);
    }

    let providerAgentRef: string;
    try {
      const reconciled = await this.provider.reconcileCatalogEmployee({
        providerCompanyRef: operation.provider_company_ref,
        catalogKey: definition.key,
      });
      providerAgentRef = reconciled.providerAgentRef.trim();
      if (!providerAgentRef || providerAgentRef.length > 255) {
        throw new Error('organization_adapter_invalid_provider_agent_ref');
      }
    } catch {
      await this.markUncertain(args.organizationId, operation.idempotency_key);
      throw new OrganizationAdapterUnavailableError(
        'provider-operation-uncertain',
        'Provider reconciliation may have partially succeeded; retry only through the same adapter operation.',
      );
    }

    try {
      return await this.finalize({
        organizationId: args.organizationId,
        operation,
        definition,
        providerAgentRef,
      });
    } catch (error) {
      const recovered = await this.recoverCompletedResult({
        organizationId: args.organizationId,
        idempotencyKey: operation.idempotency_key,
        definition,
        providerAgentRef,
      }).catch(() => undefined);
      if (recovered) return recovered;

      await this.markUncertain(args.organizationId, operation.idempotency_key);
      if (error instanceof OrganizationAdapterConflictError) throw error;
      throw new OrganizationAdapterUnavailableError(
        'provider-operation-uncertain',
        'Provider reconciliation succeeded but local finalization is uncertain.',
      );
    }
  }
}
