import type { EmployeeContext, OrganizationId } from '../ana/contracts.js';

export type AssignedTask = {
  title: string;
  description: string | null;
};

export type AssignedTaskInput = {
  organizationId: OrganizationId;
  employee: EmployeeContext;
  task: AssignedTask;
};

export type AssignedTaskResult = {
  model: string;
  summary: string;
};

export interface AgentTaskRuntime {
  executeAssignedTask(input: AssignedTaskInput): Promise<AssignedTaskResult>;
}
