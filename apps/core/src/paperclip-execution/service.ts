import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { AgentTaskRuntime, AssignedTask } from '../agent-runtime/task-runtime.js';
import { paperclipManagedAgentRef } from '../organization-adapter/paperclip-provider.js';
import type { PaperclipRunIdentity } from './paperclip-run-identity.js';

export class PaperclipExecutionBindingError extends Error {
  constructor(readonly code: 'company-unmapped' | 'employee-unavailable') {
    super(code === 'company-unmapped'
      ? 'Paperclip company is not mapped to an active Wandora organization.'
      : 'Mapped Wandora employee is unavailable for execution.');
    this.name = 'PaperclipExecutionBindingError';
  }
}

type EmployeeRow = {
  employee_id: string;
  display_name: string;
  role: 'commercial-assistant';
  autonomy_mode: 'supervised';
};

export class PaperclipExecutionService {
  constructor(
    private readonly pool: Pool,
    private readonly runtime: AgentTaskRuntime,
  ) {}

  private async resolveOrganization(providerCompanyRef: string): Promise<string> {
    const result = await this.pool.query<{ organization_id: string | null }>(
      `SELECT wandora_private.resolve_paperclip_execution_organization($1)::text AS organization_id`,
      [providerCompanyRef],
    );
    const organizationId = result.rows[0]?.organization_id;
    if (!organizationId) throw new PaperclipExecutionBindingError('company-unmapped');
    return organizationId;
  }

  private async scoped<T>(organizationId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN READ ONLY');
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

  async execute(input: {
    identity: PaperclipRunIdentity;
    paperclipRunId: string;
    task: AssignedTask;
  }): Promise<{ executionId: string; model: string; summary: string }> {
    const organizationId = await this.resolveOrganization(input.identity.paperclipCompanyId);
    const providerAgentRef = paperclipManagedAgentRef(
      input.identity.paperclipCompanyId,
      input.identity.catalogKey,
    );

    const employee = await this.scoped(organizationId, async (client) => {
      const result = await client.query<EmployeeRow>(
        `SELECT de.id::text AS employee_id, de.display_name, de.role::text AS role,
                de.autonomy_mode::text AS autonomy_mode
           FROM wandora.digital_employees de
           JOIN wandora_private.digital_employee_provider_bindings b
             ON b.organization_id = de.organization_id
            AND b.employee_id = de.id
            AND b.provider = 'paperclip'
          WHERE de.organization_id = $1
            AND b.provider_agent_ref = $2
            AND de.status = 'active'
            AND de.role = 'commercial-assistant'
            AND de.autonomy_mode = 'supervised'
          LIMIT 1`,
        [organizationId, providerAgentRef],
      );
      return result.rows[0];
    });
    if (!employee) throw new PaperclipExecutionBindingError('employee-unavailable');

    const result = await this.runtime.executeAssignedTask({
      organizationId,
      employee: {
        id: employee.employee_id,
        organizationId,
        name: employee.display_name,
        role: employee.role,
        autonomyMode: employee.autonomy_mode,
      },
      task: input.task,
    });

    const executionId = `exec_${createHash('sha256')
      .update(JSON.stringify(['paperclip-run-v1', organizationId, employee.employee_id, input.paperclipRunId]))
      .digest('hex')}`;

    return { executionId, model: result.model, summary: result.summary };
  }
}
