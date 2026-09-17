import type { PluginContext } from '@paperclipai/plugin-sdk';
import { definePlugin, runWorker } from '@paperclipai/plugin-sdk';
import { CATALOG_KEY } from './catalog.js';
import {
  parseReconcileWebhook,
  requireFreshTimestamp,
  requireHmacSecret,
  verifySignature,
} from './contract.js';

let pluginContext: PluginContext | null = null;

type SecretRef = { type: 'secret_ref'; secretId: string };

function isSecretRef(value: unknown): value is SecretRef {
  return Boolean(
    value
      && typeof value === 'object'
      && !Array.isArray(value)
      && (value as Record<string, unknown>).type === 'secret_ref'
      && typeof (value as Record<string, unknown>).secretId === 'string'
      && ((value as Record<string, unknown>).secretId as string).trim().length > 0
  );
}

async function resolveCompanyHmacSecret(ctx: PluginContext, companyId: string): Promise<string> {
  const config = await ctx.config.get(companyId);
  const ref = config?.hmacSecret;
  if (!isSecretRef(ref)) throw new Error('wandora_hmac_secret_not_configured');
  return requireHmacSecret(await ctx.secrets.resolve(ref, { companyId, configPath: 'hmacSecret' }));
}

const plugin = definePlugin({
  multiCompanyConfig: true,
  async setup(ctx) {
    pluginContext = ctx;
    ctx.logger.info('wandora_organization_adapter_ready');
  },
  async onWebhook(input) {
    if (!pluginContext) throw new Error('plugin_not_ready');

    const request = parseReconcileWebhook(input);
    requireFreshTimestamp(request.timestamp);
    const secret = await resolveCompanyHmacSecret(pluginContext, request.companyId);
    if (!verifySignature(secret, request.timestamp, request.rawBody, request.signature)) {
      throw new Error('invalid_wandora_signature');
    }

    await pluginContext.agents.managed.reconcile(CATALOG_KEY, request.companyId);
  },
  async onHealth() {
    return { status: 'ok', message: 'Wandora Organization Adapter V1 ready' };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
