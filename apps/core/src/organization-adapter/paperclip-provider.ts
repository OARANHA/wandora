import { createHash, createHmac } from 'node:crypto';
import type { OrganizationAdapterProvider } from './contracts.js';

export const PAPERCLIP_ORGANIZATION_ADAPTER_PLUGIN_KEY = 'wandora.organization-adapter-v1';

export class PaperclipOrganizationAdapterUncertainError extends Error {
  constructor(message = 'Paperclip managed reconciliation state is uncertain.') {
    super(message);
    this.name = 'PaperclipOrganizationAdapterUncertainError';
  }
}

export function signPaperclipOrganizationAdapterRequest(secret: string, timestamp: string, rawBody: string): string {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return `sha256=${digest}`;
}

export function paperclipManagedAgentRef(providerCompanyRef: string, catalogKey: string): string {
  const digest = createHash('sha256')
    .update(JSON.stringify([PAPERCLIP_ORGANIZATION_ADAPTER_PLUGIN_KEY, providerCompanyRef, catalogKey]))
    .digest('hex');
  return `managed:v1:${digest}`;
}

function validateEndpoint(value: string): URL {
  const endpoint = new URL(value);
  if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password) {
    throw new RangeError('paperclip_organization_adapter_invalid_webhook_url');
  }
  return endpoint;
}

export function createPaperclipOrganizationAdapterProvider(deps: {
  webhookUrl: string;
  activationWebhookUrl?: string;
  resolveHmacSecret: (providerCompanyRef: string) => Promise<string>;
  fetchImpl?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
}): OrganizationAdapterProvider {
  const reconcileEndpoint = validateEndpoint(deps.webhookUrl);
  const activationEndpoint = deps.activationWebhookUrl ? validateEndpoint(deps.activationWebhookUrl) : undefined;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? (() => Date.now());
  const timeoutMs = deps.timeoutMs ?? 5_000;

  const call = async (
    endpoint: URL,
    input: { providerCompanyRef: string; catalogKey: string },
  ): Promise<{ providerAgentRef: string }> => {
    if (!input.providerCompanyRef.trim() || input.providerCompanyRef.length > 255) {
      throw new RangeError('paperclip_organization_adapter_invalid_company_ref');
    }
    if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(input.catalogKey)) {
      throw new RangeError('paperclip_organization_adapter_invalid_catalog_key');
    }

    const secret = await deps.resolveHmacSecret(input.providerCompanyRef);
    if (typeof secret !== 'string' || secret.length === 0 || secret.length > 8_192) {
      throw new Error('paperclip_organization_adapter_hmac_secret_unavailable');
    }

    const rawBody = JSON.stringify({ companyId: input.providerCompanyRef, catalogKey: input.catalogKey });
    const timestamp = String(Math.floor(now() / 1_000));
    const signature = signPaperclipOrganizationAdapterRequest(secret, timestamp, rawBody);

    let response: Response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-wandora-timestamp': timestamp,
          'x-wandora-signature': signature,
        },
        body: rawBody,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new PaperclipOrganizationAdapterUncertainError();
    }

    if (response.status !== 200) {
      throw new PaperclipOrganizationAdapterUncertainError(
        `Paperclip returned HTTP ${response.status}; managed state is uncertain.`,
      );
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new PaperclipOrganizationAdapterUncertainError('Paperclip returned an invalid success payload.');
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new PaperclipOrganizationAdapterUncertainError('Paperclip success correlation is invalid.');
    }
    const record = payload as Record<string, unknown>;
    if (record.status !== 'success' || typeof record.deliveryId !== 'string' || !record.deliveryId.trim()) {
      throw new PaperclipOrganizationAdapterUncertainError('Paperclip success correlation is invalid.');
    }

    return { providerAgentRef: paperclipManagedAgentRef(input.providerCompanyRef, input.catalogKey) };
  };

  const provider: OrganizationAdapterProvider = {
    provider: 'paperclip',
    reconcileCatalogEmployee: (input) => call(reconcileEndpoint, input),
  };
  if (activationEndpoint) {
    provider.activateCatalogEmployee = (input) => call(activationEndpoint, input);
  }
  return provider;
}
