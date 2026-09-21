import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { HumanAccessError, HumanNotFoundError } from '../supervision/human-read.js';
import { paperclipManagedAgentRef } from './paperclip-provider.js';
import {
  DigitalEmployeeActivationError,
  DigitalEmployeeWorkError,
  OrganizationAdapterConflictError,
  OrganizationAdapterUnavailableError,
  WANDORA_CATALOG_V1,
  type CatalogEmployeeDefinition,
  type CatalogEmployeeResult,
  type DigitalEmployeeWorkResult,
  type OrganizationAdapterProvider,
  type PreparedDigitalEmployeeWorkExecution,
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

type WorkOperationStatus =
  | 'planned'
  | 'submitting'
  | 'submitted'
  | 'uncertain'
  | 'executing'
  | 'result_recorded'
  | 'execution_uncertain';

type WorkOperationRow = {
  id: string;
  employee_id: string;
  created_by_user_id: string;
  idempotency_key: string;
  request_hash: string;
  title: string;
  description: string;
  provider: string;
  catalog_key: string;
  provider_company_ref: string;
  provider_agent_ref: string;
  status: WorkOperationStatus;
  provider_run_ref: string | null;
  execution_id: string | null;
  result_model: string | null;
  result_summary: string | null;
  created_at: Date;
  updated_at: Date;
};

type WorkEmployeeContext = {
  employee_name: string;
  employee_role: 'commercial-assistant';
  employee_autonomy: 'supervised';
  catalog_key: string;
  provider_company_ref: string;
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

const canonicalWorkRequestHash = (input: {
  employeeId: string;
  title: string;
  description: string;
}): string => createHash('sha256')
  .update(JSON.stringify([
    'digital-employee-work-v1',
    input.employeeId,
    input.title,
    input.description,
  ]))
  .digest('hex');

const workState = (status: WorkOperationStatus): DigitalEmployeeWorkResult['state'] => {
  switch (status) {
    case 'planned':
    case 'submitting':
      return 'submitting';
    case 'submitted':
      return 'submitted';
    case 'uncertain':
      return 'uncertain';
    case 'executing':
      return 'executing';
    case 'result_recorded':
      return 'review-ready';
    case 'execution_uncertain':
      return 'execution-uncertain';
  }
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
        if (
          catalogOperation.status !== 'completed'
          && catalogOperation.idempotency_key !== args.idempotencyKey
        ) {
          throw new OrganizationAdapterConflictError(
            'idempotency-conflict',
            'An unfinished catalog hire must be retried with its original idempotency key.',
          );
        }
        return catalogOperation;
      }

      const eligibility = await client.query<{ enabled: boolean }>(
        `SELECT enabled
           FROM wandora_private.digital_employee_catalog_hire_eligibility
          WHERE organization_id = $1
            AND catalog_key = $2
          LIMIT 1`,
        [args.organizationId, args.definition.key],
      );
      if (eligibility.rows[0]?.enabled !== true) {
        throw new OrganizationAdapterUnavailableError(
          'catalog-hire-not-eligible',
          'Catalog hire is not enabled for this organization.',
        );
      }

      const legacyCollision = await client.query<{ employee_id: string }>(
        `SELECT id::text AS employee_id
           FROM wandora.digital_employees
          WHERE organization_id = $1
            AND display_name = $2
            AND role = $3
            AND autonomy_mode = $4
          ORDER BY id
          LIMIT 1`,
        [
          args.organizationId,
          args.definition.displayName,
          args.definition.role,
          args.definition.autonomy,
        ],
      );
      if (legacyCollision.rows[0]) {
        throw new OrganizationAdapterConflictError(
          'catalog-conflict',
          'A matching legacy digital employee exists and requires explicit operator reconciliation before catalog hire.',
        );
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
      || (row.employee_status !== 'active' && row.employee_status !== 'paused')
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
      status: row.employee_status,
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
         VALUES ($1, $2, $3, $4, 'paused', $5)
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
        || employeeRow.status !== 'paused'
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
        status: employeeRow.status,
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

  async activateCatalogEmployee(args: {
    organizationId: string;
    actorUserId: string;
    employeeId: string;
  }): Promise<CatalogEmployeeResult> {
    return this.scopedWrite(args.organizationId, async (client) => {
      await this.requireOwnerOrAdmin(client, args.organizationId, args.actorUserId);

      const activationLock = await client.query<{ employee_status: 'active' | 'paused' | null }>(
        `SELECT wandora_private.lock_catalog_digital_employee_activation_v1($1, $2)
                AS employee_status`,
        [args.organizationId, args.employeeId],
      );

      const employeeResult = await client.query<{
        employee_name: string;
        employee_role: 'commercial-assistant';
        employee_status: 'active' | 'paused';
        employee_autonomy: 'supervised';
      }>(
        `SELECT display_name AS employee_name,
                role::text AS employee_role,
                status::text AS employee_status,
                autonomy_mode::text AS employee_autonomy
           FROM wandora.digital_employees
          WHERE organization_id = $1 AND id = $2`,
        [args.organizationId, args.employeeId],
      );
      const employee = employeeResult.rows[0];
      if (!employee) throw new HumanNotFoundError();

      const lockedStatus = activationLock.rows[0]?.employee_status;
      if (!lockedStatus) {
        throw new DigitalEmployeeActivationError(
          'employee-not-activatable',
          'Digital employee activation preconditions are not satisfied.',
        );
      }
      if (lockedStatus !== employee.employee_status) {
        throw new OrganizationAdapterConflictError(
          'state-inconsistent',
          'Digital employee activation lock state changed unexpectedly.',
        );
      }

      if (employee.employee_status === 'active') {
        return {
          id: args.employeeId,
          name: employee.employee_name,
          role: employee.employee_role,
          status: 'active',
          autonomy: employee.employee_autonomy,
        };
      }
      if (
        employee.employee_status !== 'paused'
        || employee.employee_role !== 'commercial-assistant'
        || employee.employee_autonomy !== 'supervised'
      ) {
        throw new DigitalEmployeeActivationError('employee-not-activatable', 'Digital employee is not activatable.');
      }

      const operationResult = await client.query<{
        catalog_key: string;
        provider_company_ref: string;
        provider_agent_ref: string | null;
      }>(
        `SELECT catalog_key, provider_company_ref, provider_agent_ref
           FROM wandora_private.digital_employee_hire_operations
          WHERE organization_id = $1
            AND employee_id = $2
            AND provider = $3
            AND status = 'completed'
          LIMIT 2`,
        [args.organizationId, args.employeeId, this.provider.provider],
      );
      if (operationResult.rowCount !== 1) {
        throw new DigitalEmployeeActivationError('employee-not-activatable', 'Completed catalog hire is missing or ambiguous.');
      }
      const operation = operationResult.rows[0]!;
      if (!operation.provider_agent_ref) {
        throw new DigitalEmployeeActivationError('employee-not-activatable', 'Completed catalog hire has no provider binding.');
      }

      const definition = this.catalog.get(operation.catalog_key);
      if (
        !definition
        || definition.displayName !== employee.employee_name
        || definition.role !== employee.employee_role
        || definition.autonomy !== employee.employee_autonomy
      ) {
        throw new DigitalEmployeeActivationError('employee-not-activatable', 'Employee does not match the completed catalog hire.');
      }

      const controlResult = await client.query<{ provider_company_ref: string }>(
        `SELECT provider_company_ref
           FROM wandora_private.control_plane_provider_bindings
          WHERE organization_id = $1 AND provider = $2
          LIMIT 2`,
        [args.organizationId, this.provider.provider],
      );
      const bindingResult = await client.query<{ provider_agent_ref: string }>(
        `SELECT provider_agent_ref
           FROM wandora_private.digital_employee_provider_bindings
          WHERE organization_id = $1 AND employee_id = $2 AND provider = $3
          LIMIT 2`,
        [args.organizationId, args.employeeId, this.provider.provider],
      );
      if (controlResult.rowCount !== 1 || bindingResult.rowCount !== 1) {
        throw new DigitalEmployeeActivationError('employee-not-activatable', 'Required provider binding is missing or ambiguous.');
      }

      const providerCompanyRef = controlResult.rows[0]!.provider_company_ref;
      const providerAgentRef = bindingResult.rows[0]!.provider_agent_ref;
      const expectedProviderAgentRef = paperclipManagedAgentRef(providerCompanyRef, operation.catalog_key);
      if (
        operation.provider_company_ref !== providerCompanyRef
        || operation.provider_agent_ref !== providerAgentRef
        || providerAgentRef !== expectedProviderAgentRef
      ) {
        throw new OrganizationAdapterConflictError('state-inconsistent', 'Activation provider bindings are inconsistent.');
      }

      if (!this.provider.activateCatalogEmployee) {
        throw new DigitalEmployeeActivationError('provider-activation-unavailable', 'Provider activation action is unavailable.');
      }

      let activated: { providerAgentRef: string } | undefined;
      for (let attempt = 0; attempt < 2 && !activated; attempt += 1) {
        try {
          activated = await this.provider.activateCatalogEmployee({
            providerCompanyRef,
            catalogKey: operation.catalog_key,
          });
        } catch {
          if (attempt === 1) {
            throw new DigitalEmployeeActivationError(
              'provider-activation-uncertain',
              'Provider activation could not be reconciled; Wandora remains paused.',
            );
          }
        }
      }
      if (!activated || activated.providerAgentRef !== expectedProviderAgentRef) {
        throw new OrganizationAdapterConflictError('state-inconsistent', 'Provider activation correlation is inconsistent.');
      }

      const finalized = await client.query<{ activated: boolean }>(
        `SELECT wandora_private.activate_catalog_digital_employee_projection_v1($1, $2)
                AS activated`,
        [args.organizationId, args.employeeId],
      );
      if (finalized.rows[0]?.activated !== true) {
        throw new DigitalEmployeeActivationError(
          'provider-activation-uncertain',
          'Provider is converged but Wandora activation finalization did not commit.',
        );
      }

      return {
        id: args.employeeId,
        name: employee.employee_name,
        role: employee.employee_role,
        status: 'active',
        autonomy: employee.employee_autonomy,
      };
    });
  }

  private workResult(row: WorkOperationRow): DigitalEmployeeWorkResult {
    return {
      id: row.id,
      employeeId: row.employee_id,
      title: row.title,
      description: row.description,
      state: workState(row.status),
      result: row.status === 'result_recorded'
        && row.result_summary
        && row.result_model
        ? { summary: row.result_summary, model: row.result_model }
        : null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private async requireWorkEmployeeContext(
    client: PoolClient,
    organizationId: string,
    employeeId: string,
  ): Promise<WorkEmployeeContext> {
    const result = await client.query<WorkEmployeeContext>(
      `SELECT de.display_name AS employee_name,
              de.role::text AS employee_role,
              de.autonomy_mode::text AS employee_autonomy,
              h.catalog_key,
              c.provider_company_ref,
              b.provider_agent_ref
         FROM wandora.digital_employees de
         JOIN wandora_private.digital_employee_hire_operations h
           ON h.organization_id = de.organization_id
          AND h.employee_id = de.id
          AND h.provider = $3
          AND h.status = 'completed'
         JOIN wandora_private.control_plane_provider_bindings c
           ON c.organization_id = de.organization_id
          AND c.provider = h.provider
          AND c.provider_company_ref = h.provider_company_ref
         JOIN wandora_private.digital_employee_provider_bindings b
           ON b.organization_id = de.organization_id
          AND b.employee_id = de.id
          AND b.provider = h.provider
          AND b.provider_agent_ref = h.provider_agent_ref
        WHERE de.organization_id = $1
          AND de.id = $2
          AND de.status = 'active'
          AND de.role = 'commercial-assistant'
          AND de.autonomy_mode = 'supervised'
        LIMIT 2`,
      [organizationId, employeeId, this.provider.provider],
    );
    if (result.rowCount !== 1) {
      throw new DigitalEmployeeWorkError(
        'employee-work-unavailable',
        'Digital employee is not available for supervised work.',
      );
    }
    const row = result.rows[0]!;
    const definition = this.catalog.get(row.catalog_key);
    if (
      !definition
      || definition.displayName !== row.employee_name
      || definition.role !== row.employee_role
      || definition.autonomy !== row.employee_autonomy
      || row.provider_agent_ref !== paperclipManagedAgentRef(row.provider_company_ref, row.catalog_key)
    ) {
      throw new OrganizationAdapterConflictError(
        'state-inconsistent',
        'Digital employee work provider bindings are inconsistent.',
      );
    }
    return row;
  }

  private async reserveCatalogEmployeeWork(args: {
    organizationId: string;
    actorUserId: string;
    employeeId: string;
    idempotencyKey: string;
    title: string;
    description: string;
    requestHash: string;
  }): Promise<WorkOperationRow> {
    return this.scopedWrite(args.organizationId, async (client) => {
      await this.requireOwnerOrAdmin(client, args.organizationId, args.actorUserId);
      const context = await this.requireWorkEmployeeContext(
        client,
        args.organizationId,
        args.employeeId,
      );

      const existing = await client.query<WorkOperationRow>(
        `SELECT id::text, employee_id::text, created_by_user_id::text,
                idempotency_key, request_hash, title, description, provider,
                catalog_key, provider_company_ref, provider_agent_ref,
                status::text AS status, provider_run_ref, execution_id,
                result_model, result_summary, created_at, updated_at
           FROM wandora_private.digital_employee_work_operations
          WHERE organization_id = $1 AND idempotency_key = $2
          FOR UPDATE`,
        [args.organizationId, args.idempotencyKey],
      );
      const row = existing.rows[0];
      if (row) {
        if (
          row.request_hash !== args.requestHash
          || row.employee_id !== args.employeeId
          || row.title !== args.title
          || row.description !== args.description
          || row.provider !== this.provider.provider
          || row.catalog_key !== context.catalog_key
          || row.provider_company_ref !== context.provider_company_ref
          || row.provider_agent_ref !== context.provider_agent_ref
        ) {
          throw new OrganizationAdapterConflictError(
            'idempotency-conflict',
            'The idempotency key is already reserved for different work.',
          );
        }
        return row;
      }

      const workId = this.uuid();
      const inserted = await client.query<WorkOperationRow>(
        `INSERT INTO wandora_private.digital_employee_work_operations
           (id, organization_id, employee_id, created_by_user_id,
            idempotency_key, request_hash, title, description, provider,
            catalog_key, provider_company_ref, provider_agent_ref, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'planned')
         RETURNING id::text, employee_id::text, created_by_user_id::text,
                   idempotency_key, request_hash, title, description, provider,
                   catalog_key, provider_company_ref, provider_agent_ref,
                   status::text AS status, provider_run_ref, execution_id,
                   result_model, result_summary, created_at, updated_at`,
        [
          workId,
          args.organizationId,
          args.employeeId,
          args.actorUserId,
          args.idempotencyKey,
          args.requestHash,
          args.title,
          args.description,
          this.provider.provider,
          context.catalog_key,
          context.provider_company_ref,
          context.provider_agent_ref,
        ],
      );
      return inserted.rows[0]!;
    });
  }

  private async reserveCatalogEmployeeWorkWithRaceRetry(args: {
    organizationId: string;
    actorUserId: string;
    employeeId: string;
    idempotencyKey: string;
    title: string;
    description: string;
    requestHash: string;
  }): Promise<WorkOperationRow> {
    try {
      return await this.reserveCatalogEmployeeWork(args);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      return this.reserveCatalogEmployeeWork(args);
    }
  }

  async ensureCatalogEmployeeWork(args: {
    organizationId: string;
    actorUserId: string;
    employeeId: string;
    idempotencyKey: string;
    title: string;
    description: string;
  }): Promise<DigitalEmployeeWorkResult> {
    const idempotencyKey = args.idempotencyKey.trim();
    const title = args.title.trim();
    const description = args.description.trim();
    if (!idempotencyKey || idempotencyKey.length > 255) {
      throw new RangeError('digital_employee_work_invalid_idempotency_key');
    }
    if (!title || title.length > 200) {
      throw new RangeError('digital_employee_work_invalid_title');
    }
    if (!description || description.length > 4000) {
      throw new RangeError('digital_employee_work_invalid_description');
    }

    const requestHash = canonicalWorkRequestHash({
      employeeId: args.employeeId,
      title,
      description,
    });
    const reserved = await this.reserveCatalogEmployeeWorkWithRaceRetry({
      organizationId: args.organizationId,
      actorUserId: args.actorUserId,
      employeeId: args.employeeId,
      idempotencyKey,
      title,
      description,
      requestHash,
    });

    const outcome = await this.scopedWrite(args.organizationId, async (client) => {
      await this.requireOwnerOrAdmin(client, args.organizationId, args.actorUserId);
      const currentResult = await client.query<WorkOperationRow>(
        `SELECT id::text, employee_id::text, created_by_user_id::text,
                idempotency_key, request_hash, title, description, provider,
                catalog_key, provider_company_ref, provider_agent_ref,
                status::text AS status, provider_run_ref, execution_id,
                result_model, result_summary, created_at, updated_at
           FROM wandora_private.digital_employee_work_operations
          WHERE organization_id = $1 AND id = $2
          FOR UPDATE`,
        [args.organizationId, reserved.id],
      );
      const current = currentResult.rows[0];
      if (!current) {
        throw new OrganizationAdapterConflictError(
          'state-inconsistent',
          'Reserved digital employee work disappeared.',
        );
      }
      if (
        current.request_hash !== requestHash
        || current.employee_id !== args.employeeId
        || current.idempotency_key !== idempotencyKey
      ) {
        throw new OrganizationAdapterConflictError(
          'state-inconsistent',
          'Reserved digital employee work changed unexpectedly.',
        );
      }

      if (['submitted', 'executing', 'result_recorded', 'execution_uncertain'].includes(current.status)) {
        return { kind: 'ok' as const, row: current };
      }
      if (!this.provider.ensureCatalogEmployeeWork) {
        throw new DigitalEmployeeWorkError(
          'provider-work-unavailable',
          'Provider work admission is unavailable.',
        );
      }

      await client.query(
        `UPDATE wandora_private.digital_employee_work_operations
            SET status = 'submitting'
          WHERE organization_id = $1 AND id = $2`,
        [args.organizationId, current.id],
      );

      try {
        const providerResult = await this.provider.ensureCatalogEmployeeWork({
          providerCompanyRef: current.provider_company_ref,
          catalogKey: current.catalog_key,
          workId: current.id,
          title: current.title,
          description: current.description,
        });
        if (providerResult.providerAgentRef !== current.provider_agent_ref) {
          throw new OrganizationAdapterConflictError(
            'state-inconsistent',
            'Provider work correlation does not match the bound employee.',
          );
        }
      } catch (error) {
        if (error instanceof OrganizationAdapterConflictError) throw error;
        const uncertain = await client.query<WorkOperationRow>(
          `UPDATE wandora_private.digital_employee_work_operations
              SET status = 'uncertain'
            WHERE organization_id = $1 AND id = $2
            RETURNING id::text, employee_id::text, created_by_user_id::text,
                      idempotency_key, request_hash, title, description, provider,
                      catalog_key, provider_company_ref, provider_agent_ref,
                      status::text AS status, provider_run_ref, execution_id,
                      result_model, result_summary, created_at, updated_at`,
          [args.organizationId, current.id],
        );
        return { kind: 'uncertain' as const, row: uncertain.rows[0]! };
      }

      const submitted = await client.query<WorkOperationRow>(
        `UPDATE wandora_private.digital_employee_work_operations
            SET status = CASE
                  WHEN status IN ('executing','result_recorded','execution_uncertain')
                    THEN status
                  ELSE 'submitted'
                END,
                submitted_at = COALESCE(submitted_at, $3::timestamptz)
          WHERE organization_id = $1 AND id = $2
          RETURNING id::text, employee_id::text, created_by_user_id::text,
                    idempotency_key, request_hash, title, description, provider,
                    catalog_key, provider_company_ref, provider_agent_ref,
                    status::text AS status, provider_run_ref, execution_id,
                    result_model, result_summary, created_at, updated_at`,
        [args.organizationId, current.id, this.now()],
      );
      return { kind: 'ok' as const, row: submitted.rows[0]! };
    });

    if (outcome.kind === 'uncertain') {
      throw new DigitalEmployeeWorkError(
        'provider-work-uncertain',
        'Provider work admission is uncertain. Retry only with the original idempotency key.',
      );
    }
    return this.workResult(outcome.row);
  }

  async listCatalogEmployeeWork(args: {
    organizationId: string;
    actorUserId: string;
    employeeId: string;
  }): Promise<DigitalEmployeeWorkResult[]> {
    return this.scopedWrite(args.organizationId, async (client) => {
      await this.requireOwnerOrAdmin(client, args.organizationId, args.actorUserId);
      await this.requireWorkEmployeeContext(client, args.organizationId, args.employeeId);
      const rows = await client.query<WorkOperationRow>(
        `SELECT id::text, employee_id::text, created_by_user_id::text,
                idempotency_key, request_hash, title, description, provider,
                catalog_key, provider_company_ref, provider_agent_ref,
                status::text AS status, provider_run_ref, execution_id,
                result_model, result_summary, created_at, updated_at
           FROM wandora_private.digital_employee_work_operations
          WHERE organization_id = $1 AND employee_id = $2
          ORDER BY created_at DESC
          LIMIT 50`,
        [args.organizationId, args.employeeId],
      );
      return rows.rows.map((row) => this.workResult(row));
    });
  }

  async prepareCatalogEmployeeWorkExecution(args: {
    organizationId: string;
    employeeId: string;
    workId: string;
    paperclipRunId: string;
    title: string;
    description: string | null;
  }): Promise<PreparedDigitalEmployeeWorkExecution> {
    return this.scopedWrite(args.organizationId, async (client) => {
      const result = await client.query<WorkOperationRow>(
        `SELECT id::text, employee_id::text, created_by_user_id::text,
                idempotency_key, request_hash, title, description, provider,
                catalog_key, provider_company_ref, provider_agent_ref,
                status::text AS status, provider_run_ref, execution_id,
                result_model, result_summary, created_at, updated_at
           FROM wandora_private.digital_employee_work_operations
          WHERE organization_id = $1 AND id = $2 AND employee_id = $3
          FOR UPDATE`,
        [args.organizationId, args.workId, args.employeeId],
      );
      const row = result.rows[0];
      if (
        !row
        || row.title !== args.title
        || row.description !== (args.description ?? '')
      ) {
        throw new DigitalEmployeeWorkError(
          'work-execution-unavailable',
          'Paperclip work does not match the reserved Wandora request.',
        );
      }
      if (row.provider_run_ref && row.provider_run_ref !== args.paperclipRunId) {
        throw new DigitalEmployeeWorkError(
          'work-execution-uncertain',
          'A different provider run is already bound to this work request.',
        );
      }
      if (
        row.status === 'result_recorded'
        && row.provider_run_ref === args.paperclipRunId
        && row.execution_id
        && row.result_model
        && row.result_summary
      ) {
        return {
          kind: 'cached',
          executionId: row.execution_id,
          model: row.result_model,
          summary: row.result_summary,
        };
      }
      if (
        row.provider_run_ref === args.paperclipRunId
        && ['executing', 'execution_uncertain'].includes(row.status)
      ) {
        throw new DigitalEmployeeWorkError(
          'work-execution-uncertain',
          'The exact provider run already has an unresolved Wandora execution receipt.',
        );
      }
      if (!['planned', 'submitting', 'submitted', 'uncertain'].includes(row.status)) {
        throw new DigitalEmployeeWorkError(
          'work-execution-unavailable',
          'Work request is not eligible for execution.',
        );
      }

      await client.query(
        `UPDATE wandora_private.digital_employee_work_operations
            SET provider_run_ref = $3,
                status = 'executing'
          WHERE organization_id = $1 AND id = $2`,
        [args.organizationId, args.workId, args.paperclipRunId],
      );
      return { kind: 'execute' };
    });
  }

  async recordCatalogEmployeeWorkResult(args: {
    organizationId: string;
    employeeId: string;
    workId: string;
    paperclipRunId: string;
    executionId: string;
    model: string;
    summary: string;
  }): Promise<void> {
    await this.scopedWrite(args.organizationId, async (client) => {
      const updated = await client.query(
        `UPDATE wandora_private.digital_employee_work_operations
            SET status = 'result_recorded',
                execution_id = $5,
                result_model = $6,
                result_summary = $7,
                result_recorded_at = $8::timestamptz,
                submitted_at = COALESCE(submitted_at, $8::timestamptz)
          WHERE organization_id = $1
            AND id = $2
            AND employee_id = $3
            AND provider_run_ref = $4
            AND status = 'executing'
          RETURNING id`,
        [
          args.organizationId,
          args.workId,
          args.employeeId,
          args.paperclipRunId,
          args.executionId,
          args.model,
          args.summary,
          this.now(),
        ],
      );
      if (updated.rowCount !== 1) {
        throw new DigitalEmployeeWorkError(
          'work-execution-uncertain',
          'Supervised result projection could not be committed exactly once.',
        );
      }
    });
  }

  async markCatalogEmployeeWorkExecutionUncertain(args: {
    organizationId: string;
    employeeId: string;
    workId: string;
    paperclipRunId: string;
  }): Promise<void> {
    await this.scopedWrite(args.organizationId, async (client) => {
      await client.query(
        `UPDATE wandora_private.digital_employee_work_operations
            SET status = 'execution_uncertain'
          WHERE organization_id = $1
            AND id = $2
            AND employee_id = $3
            AND provider_run_ref = $4
            AND status = 'executing'`,
        [args.organizationId, args.workId, args.employeeId, args.paperclipRunId],
      );
    });
  }

}
