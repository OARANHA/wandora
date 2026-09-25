import type { EmployeeContext, OrganizationId } from '../ana/contracts.js';

export type AssignedTask = {
  title: string;
  description: string | null;
};

export type RuntimeGroundingStatement = {
  content: string;
  provenance: {
    type: 'owner_statement' | 'approved_source' | 'approved_correction';
    sourceLabel: string | null;
  };
};

export type RuntimeEmployeeGuidanceStatement = {
  type: 'responsibility' | 'behavior' | 'practice';
  content: string;
  provenance: {
    type: 'owner_statement' | 'approved_evidence' | 'approved_correction';
    sourceLabel: string | null;
  };
};

export type RuntimeOrganizationGroundingProjection = {
  officialFacts: RuntimeGroundingStatement[];
  houseRules: RuntimeGroundingStatement[];
  workContext: AssignedTask;
};

export type RuntimeGroundingProjection = RuntimeOrganizationGroundingProjection & {
  employeeGuidance: RuntimeEmployeeGuidanceStatement[];
};

export type RuntimeReadTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (parameters: unknown) => Promise<unknown>;
};

export type AssignedTaskInput = {
  organizationId: OrganizationId;
  employee: EmployeeContext;
  task: AssignedTask;
  grounding: RuntimeGroundingProjection;
  readTools?: RuntimeReadTool[];
};

export type NormalizedExecutionUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  cachedInputTokens: number | null;
  totalTokens: number | null;
};

export type AssignedTaskResult = {
  model: string;
  summary: string;
  usage: NormalizedExecutionUsage;
};

export interface AgentTaskRuntime {
  executeAssignedTask(input: AssignedTaskInput): Promise<AssignedTaskResult>;
}
