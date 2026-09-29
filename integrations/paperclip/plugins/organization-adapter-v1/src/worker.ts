import type { PluginContext, PluginWebhookResponse } from '@paperclipai/plugin-sdk';
import { definePlugin, runWorker } from '@paperclipai/plugin-sdk';
import { activateManagedCatalogEmployee } from './activation.js';
import { CATALOG_KEY } from './catalog.js';
import { parseActivationWebhook, parseCapabilitiesWebhook, parseFastReadWebhook, parseReconcileWebhook, parseWorkWebhook, requireFreshTimestamp, requireHmacSecret, verifySignature } from './contract.js';
import { ensureManagedCatalogEmployeeWork } from './work.js';
import { waitForManagedCatalogEmployeeFastReadResult } from './fast-read.js';
import { readManagedEmployeeIntegrationCapabilityProjection } from './integration-capability.js';

let pluginContext: PluginContext | null = null;
type SecretRef = { type: 'secret_ref'; secretId: string };

function isSecretRef(value: unknown): value is SecretRef {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && (value as Record<string, unknown>).type === 'secret_ref'
    && typeof (value as Record<string, unknown>).secretId === 'string'
    && ((value as Record<string, unknown>).secretId as string).trim().length > 0);
}

async function resolveCompanyHmacSecret(ctx: PluginContext, companyId: string): Promise<string> {
  const config = await ctx.config.get(companyId);
  const ref = config?.hmacSecret;
  if (!isSecretRef(ref)) throw new Error('wandora_hmac_secret_not_configured');
  return requireHmacSecret(await ctx.secrets.resolve(ref, { companyId, configPath: 'hmacSecret' }));
}

async function authenticateRequest(ctx: PluginContext, request: { companyId: string; timestamp: string; signature: string; rawBody: string }): Promise<void> {
  requireFreshTimestamp(request.timestamp);
  const secret = await resolveCompanyHmacSecret(ctx, request.companyId);
  if (!verifySignature(secret, request.timestamp, request.rawBody, request.signature)) throw new Error('invalid_wandora_signature');
}

const plugin = definePlugin({
  multiCompanyConfig: true,
  async setup(ctx) {
    pluginContext = ctx;
    ctx.logger.info('wandora_organization_adapter_ready');
  },
  async onWebhook(input) {
    if (!pluginContext) throw new Error('plugin_not_ready');
    if (input.endpointKey === 'employee-reconcile') {
      const request = parseReconcileWebhook(input);
      await authenticateRequest(pluginContext, request);
      await pluginContext.agents.managed.reconcile(CATALOG_KEY, request.companyId);
      return;
    }
    if (input.endpointKey === 'employee-activate') {
      const request = parseActivationWebhook(input);
      await authenticateRequest(pluginContext, request);
      await activateManagedCatalogEmployee(pluginContext.agents, request.companyId);
      return;
    }
    if (input.endpointKey === 'employee-work') {
      const request = parseWorkWebhook(input);
      await authenticateRequest(pluginContext, request);
      await ensureManagedCatalogEmployeeWork(pluginContext, {
        companyId: request.companyId,
        workId: request.workId,
        title: request.title,
        description: request.description,
      });
      return;
    }
    if (input.endpointKey === 'employee-capabilities') {
      const request = parseCapabilitiesWebhook(input);
      await authenticateRequest(pluginContext, request);
      const integrations = await readManagedEmployeeIntegrationCapabilityProjection(
        pluginContext,
        request.companyId,
      );
      const response: PluginWebhookResponse = {
        integrations: integrations.map((integration) => ({
          integrationKind: integration.integrationKind,
          displayName: integration.displayName,
          connection: {
            health: integration.connection.health,
            readiness: integration.connection.readiness,
          },
          supportedCapabilities: [...integration.supportedCapabilities],
          organizationEnabledCapabilities: [...integration.organizationEnabledCapabilities],
        })),
      };
      return response;
    }
    if (input.endpointKey === 'employee-fast-read') {
      const request = parseFastReadWebhook(input);
      await authenticateRequest(pluginContext, request);
      const result = await waitForManagedCatalogEmployeeFastReadResult(pluginContext, {
        companyId: request.companyId,
        correlationId: request.correlationId,
        intentToken: request.intentToken,
        request: request.request,
      }, {
        recordLatency: (event) => pluginContext?.logger.info(JSON.stringify(event)),
      });
      const response: PluginWebhookResponse = {
        runId: result.runId,
        model: result.model,
        summary: result.summary,
        usage: {
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          cachedInputTokens: result.usage.cachedInputTokens,
          totalTokens: result.usage.totalTokens,
        },
      };
      return response;
    }
    throw new Error('unknown_endpoint');
  },
  async onHealth() {
    return { status: 'ok', message: 'Wandora Organization Adapter V1 ready' };
  },
});
export default plugin;
runWorker(plugin, import.meta.url);
