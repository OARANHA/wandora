import { createHash, createHmac } from 'node:crypto';
import { BUSINESS_CAPABILITIES, type BusinessCapability } from '../semantic-routing/contracts.js';
import type {
  CatalogEmployeeWorkProviderInput,
  OrganizationAdapterFastReadResult,
  OrganizationAdapterProvider,
} from './contracts.js';

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

function validateBaseInput(input: { providerCompanyRef: string; catalogKey: string }): void {
  if (!input.providerCompanyRef.trim() || input.providerCompanyRef.length > 255) {
    throw new RangeError('paperclip_organization_adapter_invalid_company_ref');
  }
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(input.catalogKey)) {
    throw new RangeError('paperclip_organization_adapter_invalid_catalog_key');
  }
}

function validateWorkInput(input: CatalogEmployeeWorkProviderInput): void {
  validateBaseInput(input);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.workId)) {
    throw new RangeError('paperclip_organization_adapter_invalid_work_id');
  }
  if (!input.title.trim() || input.title.length > 200) {
    throw new RangeError('paperclip_organization_adapter_invalid_work_title');
  }
  if (!input.description.trim() || input.description.length > 4000) {
    throw new RangeError('paperclip_organization_adapter_invalid_work_description');
  }
}

export function createPaperclipOrganizationAdapterProvider(deps: {
  webhookUrl: string;
  activationWebhookUrl?: string;
  workWebhookUrl?: string;
  capabilitiesWebhookUrl?: string;
  fastReadWebhookUrl?: string;
  resolveHmacSecret: (providerCompanyRef: string) => Promise<string>;
  fetchImpl?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
}): OrganizationAdapterProvider {
  const reconcileEndpoint = validateEndpoint(deps.webhookUrl);
  const activationEndpoint = deps.activationWebhookUrl ? validateEndpoint(deps.activationWebhookUrl) : undefined;
  const workEndpoint = deps.workWebhookUrl ? validateEndpoint(deps.workWebhookUrl) : undefined;
  const capabilitiesEndpoint = deps.capabilitiesWebhookUrl ? validateEndpoint(deps.capabilitiesWebhookUrl) : undefined;
  const fastReadEndpoint = deps.fastReadWebhookUrl ? validateEndpoint(deps.fastReadWebhookUrl) : undefined;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? (() => Date.now());
  const timeoutMs = deps.timeoutMs ?? 5_000;

  const signedJsonCall = async (
    endpoint: URL,
    input: { providerCompanyRef: string; catalogKey: string },
    body: Record<string, string>,
  ): Promise<Record<string, unknown>> => {
    validateBaseInput(input);
    const secret = await deps.resolveHmacSecret(input.providerCompanyRef);
    if (typeof secret !== 'string' || secret.length === 0 || secret.length > 8_192) {
      throw new Error('paperclip_organization_adapter_hmac_secret_unavailable');
    }
    const rawBody = JSON.stringify(body);
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
    try { payload = await response.json(); } catch {
      throw new PaperclipOrganizationAdapterUncertainError('Paperclip returned an invalid success payload.');
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new PaperclipOrganizationAdapterUncertainError('Paperclip success payload is invalid.');
    }
    return payload as Record<string, unknown>;
  };

  const call = async (
    endpoint: URL,
    input: { providerCompanyRef: string; catalogKey: string },
    body: Record<string, string>,
  ): Promise<{ providerAgentRef: string }> => {
    const record = await signedJsonCall(endpoint, input, body);
    if (record.status !== 'success' || typeof record.deliveryId !== 'string' || !record.deliveryId.trim()) {
      throw new PaperclipOrganizationAdapterUncertainError('Paperclip success correlation is invalid.');
    }
    return { providerAgentRef: paperclipManagedAgentRef(input.providerCompanyRef, input.catalogKey) };
  };

  const parseCapabilities = (record: Record<string, unknown>): BusinessCapability[] => {
    if (Object.keys(record).sort().join(',') !== 'integrations' || !Array.isArray(record.integrations)) {
      throw new PaperclipOrganizationAdapterUncertainError('Paperclip capability projection is malformed.');
    }
    const allowed = new Set<string>(BUSINESS_CAPABILITIES);
    const selected = new Set<BusinessCapability>();
    for (const integration of record.integrations) {
      if (!integration || typeof integration !== 'object' || Array.isArray(integration)) {
        throw new PaperclipOrganizationAdapterUncertainError('Paperclip capability projection is malformed.');
      }
      const enabled = (integration as Record<string, unknown>).organizationEnabledCapabilities;
      if (!Array.isArray(enabled)) {
        throw new PaperclipOrganizationAdapterUncertainError('Paperclip capability projection is malformed.');
      }
      for (const capability of enabled) {
        if (typeof capability !== 'string' || !allowed.has(capability)) {
          throw new PaperclipOrganizationAdapterUncertainError('Paperclip capability projection is malformed.');
        }
        selected.add(capability as BusinessCapability);
      }
    }
    return BUSINESS_CAPABILITIES.filter((capability) => selected.has(capability));
  };

  const parseFastReadResult = (record: Record<string, unknown>): OrganizationAdapterFastReadResult => {
    if (Object.keys(record).sort().join(',') !== 'model,runId,summary,usage') {
      throw new PaperclipOrganizationAdapterUncertainError('Paperclip Fast Read result is malformed.');
    }
    if (typeof record.runId !== 'string' || !record.runId.trim()
      || typeof record.model !== 'string' || !record.model.trim()
      || typeof record.summary !== 'string' || !record.summary.trim() || record.summary.length > 12_000
      || !record.usage || typeof record.usage !== 'object' || Array.isArray(record.usage)) {
      throw new PaperclipOrganizationAdapterUncertainError('Paperclip Fast Read result is malformed.');
    }
    const usage = record.usage as Record<string, unknown>;
    if (Object.keys(usage).sort().join(',') !== 'cachedInputTokens,inputTokens,outputTokens,totalTokens') {
      throw new PaperclipOrganizationAdapterUncertainError('Paperclip Fast Read usage is malformed.');
    }
    const numbers = [usage.inputTokens, usage.outputTokens, usage.cachedInputTokens, usage.totalTokens];
    if (numbers.some((value) => !Number.isInteger(value) || (value as number) < 0)) {
      throw new PaperclipOrganizationAdapterUncertainError('Paperclip Fast Read usage is malformed.');
    }
    return {
      model: record.model,
      summary: record.summary,
      usage: {
        inputTokens: usage.inputTokens as number,
        outputTokens: usage.outputTokens as number,
        cachedInputTokens: usage.cachedInputTokens as number,
        totalTokens: usage.totalTokens as number,
      },
    };
  };

  const provider: OrganizationAdapterProvider = {
    provider: 'paperclip',
    reconcileCatalogEmployee: (input) => call(
      reconcileEndpoint,
      input,
      { companyId: input.providerCompanyRef, catalogKey: input.catalogKey },
    ),
  };
  if (activationEndpoint) {
    provider.activateCatalogEmployee = (input) => call(
      activationEndpoint,
      input,
      { companyId: input.providerCompanyRef, catalogKey: input.catalogKey },
    );
  }
  if (workEndpoint) {
    provider.ensureCatalogEmployeeWork = (input) => {
      validateWorkInput(input);
      return call(
        workEndpoint,
        input,
        {
          companyId: input.providerCompanyRef,
          catalogKey: input.catalogKey,
          workId: input.workId,
          title: input.title,
          description: input.description,
        },
      );
    };
  }
  if (capabilitiesEndpoint) {
    provider.getCatalogEmployeeAvailableCapabilities = async (input) => parseCapabilities(await signedJsonCall(
      capabilitiesEndpoint,
      input,
      { companyId: input.providerCompanyRef, catalogKey: input.catalogKey },
    ));
  }
  if (fastReadEndpoint) {
    provider.dispatchCatalogEmployeeFastRead = async (input) => {
      validateBaseInput(input);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.correlationId)) {
        throw new RangeError('paperclip_organization_adapter_invalid_fast_read_correlation');
      }
      if (!input.intentToken.trim() || input.intentToken.length > 8_192) {
        throw new RangeError('paperclip_organization_adapter_invalid_fast_read_intent');
      }
      if (!input.request.trim() || input.request.length > 12_000) {
        throw new RangeError('paperclip_organization_adapter_invalid_fast_read_request');
      }
      return parseFastReadResult(await signedJsonCall(
        fastReadEndpoint,
        input,
        {
          companyId: input.providerCompanyRef,
          catalogKey: input.catalogKey,
          correlationId: input.correlationId,
          intentToken: input.intentToken,
          request: input.request,
        },
      ));
    };
  }
  return provider;
}
