import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { OrganizationGroundingProjection } from '../agent-runtime/organization-grounding.js';
import type { AgentTaskRuntime, AssignedTask, NormalizedExecutionUsage, RuntimeReadTool } from '../agent-runtime/task-runtime.js';
import { paperclipManagedAgentRef } from '../organization-adapter/paperclip-provider.js';
import type { PaperclipRunIdentity } from './paperclip-run-identity.js';
import type { OrganizationAdapterService } from '../organization-adapter/service.js';

export class PaperclipExecutionBindingError extends Error {
  constructor(readonly code: 'company-unmapped' | 'employee-unavailable' | 'work-unavailable') {
    super(code === 'company-unmapped'
      ? 'Paperclip company is not mapped to an active Wandora organization.'
      : code === 'employee-unavailable'
        ? 'Mapped Wandora employee is unavailable for execution.'
        : 'Mapped Wandora work is unavailable or execution state is uncertain.');
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
    private readonly groundingProjection: OrganizationGroundingProjection,
    private readonly workProjection?: Pick<
      OrganizationAdapterService,
      | 'prepareCatalogEmployeeWorkExecution'
      | 'recordCatalogEmployeeWorkResult'
      | 'markCatalogEmployeeWorkExecutionUncertain'
    >,
    private readonly readToolBridge?: (input: {
      runToken: string;
      paperclipRunId: string;
      allowedUpstreamToolNames?: string[];
    }) => Promise<RuntimeReadTool[]>,
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
    runToken: string;
    paperclipRunId: string;
    workId?: string | null;
    allowedReadToolNames?: string[] | null;
    task: AssignedTask;
  }): Promise<{ executionId: string; model: string; summary: string; usage: NormalizedExecutionUsage }> {
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

    const executionId = `exec_${createHash('sha256')
      .update(JSON.stringify(['paperclip-run-v1', organizationId, employee.employee_id, input.paperclipRunId]))
      .digest('hex')}`;

    const grounding = await this.groundingProjection.project(organizationId, input.task);

    if (input.workId) {
      if (!this.workProjection) {
        throw new PaperclipExecutionBindingError('work-unavailable');
      }
      try {
        const prepared = await this.workProjection.prepareCatalogEmployeeWorkExecution({
          organizationId,
          employeeId: employee.employee_id,
          workId: input.workId,
          paperclipRunId: input.paperclipRunId,
          title: input.task.title,
          description: input.task.description,
        });
        if (prepared.kind === 'cached') {
          return {
            executionId: prepared.executionId,
            model: prepared.model,
            summary: prepared.summary,
            usage: {
              inputTokens: null,
              outputTokens: null,
              cachedInputTokens: null,
              totalTokens: null,
            },
          };
        }
      } catch {
        throw new PaperclipExecutionBindingError('work-unavailable');
      }
    }

    let result;
    try {
      const readTools = this.readToolBridge
        ? await this.readToolBridge({
            runToken: input.runToken,
            paperclipRunId: input.paperclipRunId,
            ...(input.allowedReadToolNames
              ? { allowedUpstreamToolNames: input.allowedReadToolNames }
              : {}),
          })
        : [];
      result = await this.runtime.executeAssignedTask({
        organizationId,
        employee: {
          id: employee.employee_id,
          organizationId,
          name: employee.display_name,
          role: employee.role,
          autonomyMode: employee.autonomy_mode,
        },
        task: input.task,
        grounding,
        ...(readTools.length > 0 ? { readTools } : {}),
      });
    } catch (error) {
      if (input.workId && this.workProjection) {
        await this.workProjection.markCatalogEmployeeWorkExecutionUncertain({
          organizationId,
          employeeId: employee.employee_id,
          workId: input.workId,
          paperclipRunId: input.paperclipRunId,
        }).catch(() => undefined);
      }
      throw error;
    }

    if (input.workId && this.workProjection) {
      try {
        await this.workProjection.recordCatalogEmployeeWorkResult({
          organizationId,
          employeeId: employee.employee_id,
          workId: input.workId,
          paperclipRunId: input.paperclipRunId,
          executionId,
          model: result.model,
          summary: result.summary,
        });
      } catch {
        await this.workProjection.markCatalogEmployeeWorkExecutionUncertain({
          organizationId,
          employeeId: employee.employee_id,
          workId: input.workId,
          paperclipRunId: input.paperclipRunId,
        }).catch(() => undefined);
        throw new PaperclipExecutionBindingError('work-unavailable');
      }
    }

    return { executionId, model: result.model, summary: result.summary, usage: result.usage };
  }
}
