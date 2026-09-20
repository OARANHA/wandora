import type { PluginContext } from '@paperclipai/plugin-sdk';
import { CATALOG_KEY } from './catalog.js';

type ActivationAgents = Pick<PluginContext['agents'], 'managed' | 'resume'>;

function requireManagedAgent(resolution: Awaited<ReturnType<ActivationAgents['managed']['get']>>): { agentId: string; status: string } {
  if (resolution.status === 'missing' || !resolution.agentId || !resolution.agent || resolution.agent.id !== resolution.agentId) {
    throw new Error('managed_employee_missing');
  }
  return { agentId: resolution.agentId, status: resolution.agent.status };
}

export async function activateManagedCatalogEmployee(
  agents: ActivationAgents,
  companyId: string,
): Promise<{ status: 'idle' }> {
  const current = requireManagedAgent(await agents.managed.get(CATALOG_KEY, companyId));
  if (current.status === 'paused') {
    await agents.resume(current.agentId, companyId);
  } else if (current.status !== 'idle') {
    throw new Error('managed_employee_unexpected_state');
  }
  const readback = requireManagedAgent(await agents.managed.get(CATALOG_KEY, companyId));
  if (readback.agentId !== current.agentId || readback.status !== 'idle') throw new Error('managed_employee_activation_not_converged');
  return { status: 'idle' };
}
