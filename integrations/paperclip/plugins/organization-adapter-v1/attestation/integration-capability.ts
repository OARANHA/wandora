import type { PluginContext } from '@paperclipai/plugin-sdk';
import { CATALOG_KEY } from '../src/catalog.js';

type OperationalSnapshot = Awaited<
  ReturnType<PluginContext['toolAccess']['readOperationalSnapshot']>
>;
type OperationalConnection = OperationalSnapshot['connections'][number];
type OperationalTool = OperationalConnection['tools'][number];

export type WandoraBusinessCapability =
  | 'business.products.search'
  | 'business.products.price'
  | 'business.stock.read'
  | 'business.price_tables.list'
  | 'business.price_tables.products.read'
  | 'business.parties.search'
  | 'business.orders.search'
  | 'business.companies.list'
  | 'business.connection.probe';

export type IntegrationOperationalSnapshot = {
  integrationKind: 'business_system';
  displayName: string;
  connection: {
    health: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    readiness: 'ready' | 'not_ready' | 'unknown';
  };
  supportedCapabilities: WandoraBusinessCapability[];
  organizationEnabledCapabilities: WandoraBusinessCapability[];
};

const PROVIDER_TOOL_CAPABILITY_ENTRIES = [
  ['vendaerp_probe', ['business.connection.probe']],
  ['vendaerp_list_companies', ['business.companies.list']],
  ['vendaerp_search_products', ['business.products.search', 'business.products.price']],
  ['vendaerp_get_product_stock', ['business.stock.read']],
  ['vendaerp_list_price_tables', ['business.price_tables.list']],
  ['vendaerp_search_price_table_products', [
    'business.price_tables.products.read',
    'business.products.price',
  ]],
  ['vendaerp_search_parties', ['business.parties.search']],
  ['vendaerp_search_orders', ['business.orders.search']],
] as const satisfies readonly (readonly [string, readonly WandoraBusinessCapability[]])[];

const PROVIDER_TOOL_CAPABILITY_MAP = new Map<string, readonly WandoraBusinessCapability[]>(
  PROVIDER_TOOL_CAPABILITY_ENTRIES,
);

export const ADAPTER_MAPPED_BUSINESS_CAPABILITIES = Object.freeze(
  Array.from(new Set(PROVIDER_TOOL_CAPABILITY_ENTRIES.flatMap(([, capabilities]) => capabilities))),
) as readonly WandoraBusinessCapability[];

function mappedCapabilities(toolName: string): readonly WandoraBusinessCapability[] {
  return PROVIDER_TOOL_CAPABILITY_MAP.get(toolName) ?? [];
}

function providerReadSemantic(tool: OperationalTool): boolean {
  return tool.status !== 'removed'
    && tool.riskLevel === 'read'
    && tool.isReadOnly === true
    && tool.isWrite === false
    && tool.isDestructive === false;
}

function operationallyAvailableReadTool(tool: OperationalTool): boolean {
  return tool.status === 'active'
    && providerReadSemantic(tool)
    && tool.allowedByEffectiveProfile === true;
}

function normalizeHealth(
  runtimeHealth: OperationalSnapshot['runtimeHealth'],
  connection: OperationalConnection,
): IntegrationOperationalSnapshot['connection']['health'] {
  if (runtimeHealth === 'critical') return 'unhealthy';
  if (connection.healthStatus === 'failed'
    || connection.healthStatus === 'error'
    || connection.healthStatus === 'missing_secret') return 'unhealthy';
  if (runtimeHealth === 'degraded' || connection.healthStatus === 'degraded') return 'degraded';
  if (connection.healthStatus === 'healthy' || connection.healthStatus === 'ok') return 'healthy';
  return 'unknown';
}

function connectionOperationallyReady(
  runtimeHealth: OperationalSnapshot['runtimeHealth'],
  connection: OperationalConnection,
): boolean {
  if (runtimeHealth !== 'ok') return false;
  if (connection.status !== 'active' || !connection.enabled) return false;
  if (connection.healthStatus !== 'healthy' && connection.healthStatus !== 'ok') return false;
  if (!connection.organizationGrantActive || !connection.installedForAgent) return false;
  return connection.tools.some((tool) =>
    mappedCapabilities(tool.toolName).length > 0
    && operationallyAvailableReadTool(tool));
}

function canonicalizeCapabilities(
  capabilities: Iterable<WandoraBusinessCapability>,
): WandoraBusinessCapability[] {
  const selected = new Set(capabilities);
  return ADAPTER_MAPPED_BUSINESS_CAPABILITIES.filter((capability) => selected.has(capability));
}

export function normalizePaperclipOperationalSnapshot(
  snapshot: OperationalSnapshot,
): IntegrationOperationalSnapshot[] {
  return snapshot.connections.flatMap((connection) => {
    const relevantTools = connection.tools.filter(
      (tool) => mappedCapabilities(tool.toolName).length > 0,
    );
    if (relevantTools.length === 0) return [];

    const supported = canonicalizeCapabilities(
      relevantTools
        .filter(providerReadSemantic)
        .flatMap((tool) => mappedCapabilities(tool.toolName)),
    );

    const ready = connectionOperationallyReady(snapshot.runtimeHealth, connection);
    const enabled = ready
      ? canonicalizeCapabilities(
        relevantTools
          .filter(operationallyAvailableReadTool)
          .flatMap((tool) => mappedCapabilities(tool.toolName)),
      )
      : [];

    return [{
      integrationKind: 'business_system',
      displayName: connection.displayName,
      connection: {
        health: normalizeHealth(snapshot.runtimeHealth, connection),
        readiness: ready ? 'ready' : 'not_ready',
      },
      supportedCapabilities: supported,
      organizationEnabledCapabilities: enabled,
    }];
  });
}

type OperationalReadContext = Pick<PluginContext, 'agents' | 'toolAccess'>;

export async function readManagedEmployeeIntegrationCapabilityProjection(
  ctx: OperationalReadContext,
  companyId: string,
): Promise<IntegrationOperationalSnapshot[]> {
  const managed = await ctx.agents.managed.get(CATALOG_KEY, companyId);
  if (managed.status !== 'resolved' || !managed.agentId || !managed.agent) {
    throw new Error('managed_employee_missing');
  }

  const snapshot = await ctx.toolAccess.readOperationalSnapshot({
    companyId,
    agentId: managed.agentId,
  });

  return normalizePaperclipOperationalSnapshot(snapshot);
}
