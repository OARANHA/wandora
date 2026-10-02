import type { PluginAgentsClient } from '@paperclipai/plugin-sdk';
import { CATALOG_EMPLOYEE_TEMPLATE, CATALOG_KEY } from './catalog.js';

const EMPLOYEE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function dynamicEmployeeResourceKey(employeeId: string): string {
  const normalized = employeeId.trim().toLowerCase();
  if (!EMPLOYEE_UUID.test(normalized)) throw new Error('dynamic_employee_invalid_employee_id');
  return `wandora-digital-employee:${normalized}`;
}

export async function ensureDynamicCatalogEmployee(
  agents: PluginAgentsClient,
  input: { companyId: string; employeeId: string; catalogKey: string },
): Promise<{ providerAgentRef: string }> {
  if (!input.companyId.trim()) throw new Error('dynamic_employee_invalid_company');
  if (input.catalogKey !== CATALOG_KEY) throw new Error('dynamic_employee_unknown_catalog');
  const resourceKey = dynamicEmployeeResourceKey(input.employeeId);

  const resolution = await agents.managed.ensureDynamic({
    companyId: input.companyId,
    resourceKey,
    spec: {
      name: CATALOG_EMPLOYEE_TEMPLATE.displayName,
      role: CATALOG_EMPLOYEE_TEMPLATE.role,
      title: CATALOG_EMPLOYEE_TEMPLATE.title,
      capabilities: CATALOG_EMPLOYEE_TEMPLATE.capabilities,
      adapterType: CATALOG_EMPLOYEE_TEMPLATE.adapterType,
      adapterConfig: {},
      runtimeConfig: {},
      permissions: { canCreateAgents: false },
      budgetMonthlyCents: CATALOG_EMPLOYEE_TEMPLATE.budgetMonthlyCents,
      initialStatus: CATALOG_EMPLOYEE_TEMPLATE.initialStatus,
    },
  });

  if (
    resolution.resourceKind !== 'agent'
    || resolution.resourceKey !== resourceKey
    || resolution.companyId !== input.companyId
    || typeof resolution.agentId !== 'string'
    || !resolution.agentId.trim()
    || resolution.agent.id !== resolution.agentId
    || resolution.agent.companyId !== input.companyId
  ) throw new Error('dynamic_employee_provider_correlation_invalid');

  if (resolution.agent.status !== 'paused') {
    throw new Error('dynamic_employee_not_ready');
  }

  return { providerAgentRef: resolution.agentId };
}
