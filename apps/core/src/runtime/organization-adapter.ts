import type { Pool } from 'pg';
import { OrganizationAdapterService } from '../organization-adapter/service.js';
import { createPaperclipOrganizationAdapterProvider } from '../organization-adapter/paperclip-provider.js';
import { createPaperclipOrganizationAdapterFileSecretResolver } from '../organization-adapter/secret-custody.js';

export type RuntimeOrganizationAdapterConfig = {
  webhookUrl: string;
  activationWebhookUrl?: string;
  workWebhookUrl?: string;
  secretDirectory: string;
};

function siblingWebhookUrl(webhookUrl: string, endpointKey: 'employee-capabilities' | 'employee-fast-read'): string {
  const endpoint = new URL(webhookUrl);
  const parts = endpoint.pathname.split('/');
  parts[parts.length - 1] = endpointKey;
  endpoint.pathname = parts.join('/');
  return endpoint.toString();
}

export function createRuntimeOrganizationAdapter(
  pool: Pool,
  config: RuntimeOrganizationAdapterConfig,
  options: {
    fetchImpl?: typeof fetch;
    now?: () => number;
    readSecretFile?: (path: string) => Promise<string>;
  } = {},
): OrganizationAdapterService {
  const resolveHmacSecret = createPaperclipOrganizationAdapterFileSecretResolver({
    secretDirectory: config.secretDirectory,
    ...(options.readSecretFile ? { readSecretFile: options.readSecretFile } : {}),
  });

  const provider = createPaperclipOrganizationAdapterProvider({
    webhookUrl: config.webhookUrl,
    ...(config.activationWebhookUrl ? { activationWebhookUrl: config.activationWebhookUrl } : {}),
    ...(config.workWebhookUrl ? { workWebhookUrl: config.workWebhookUrl } : {}),
    capabilitiesWebhookUrl: siblingWebhookUrl(config.webhookUrl, 'employee-capabilities'),
    fastReadWebhookUrl: siblingWebhookUrl(config.webhookUrl, 'employee-fast-read'),
    resolveHmacSecret,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    ...(options.now ? { now: options.now } : {}),
  });

  return new OrganizationAdapterService(pool, provider);
}
