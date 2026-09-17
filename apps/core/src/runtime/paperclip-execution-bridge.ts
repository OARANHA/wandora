import { createHmac, timingSafeEqual } from 'node:crypto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SIGNATURE_RE = /^sha256=([a-f0-9]{64})$/;
const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const CATALOG_KEY_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const MAX_CLOCK_SKEW_SECONDS = 300;
const PAPERCLIP_ADAPTER_TYPE = 'wandora_mastra';
const PAPERCLIP_PLUGIN_KEY = 'wandora.organization-adapter-v1';

export type PaperclipExecutionBridgeRequest = {
  rawBody: string;
  timestamp: string | undefined;
  signature: string | undefined;
  runToken: string | undefined;
};

export type PaperclipExecutionBridgeResponse = {
  status: number;
  body: Record<string, unknown>;
};

export type PaperclipExecutionBridgeDeps = {
  secret: string;
  paperclipBaseUrl: string;
  now?: () => number;
  fetchImpl?: typeof fetch;
};

type PaperclipTaskProjection = {
  issueId: string;
  identifier: string;
  title: string;
  description: string | null;
  workMode: string | null;
  wakeReason: string | null;
  wakeCommentId: string | null;
};

type PaperclipExecutionBody = {
  paperclipAgentId: string;
  paperclipCompanyId: string;
  paperclipRunId: string;
  catalogKey: string;
  task: PaperclipTaskProjection;
};

type JwtClaims = {
  sub: string;
  company_id: string;
  run_id: string;
  adapter_type: string;
};

export function signPaperclipExecutionBridge(
  secret: string,
  timestamp: string,
  rawBody: string,
): string {
  const digest = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  return `sha256=${digest}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowedSet = new Set(allowed);
  return Object.keys(value).every((key) => allowedSet.has(key));
}

function boundedRequiredString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) return undefined;
  return normalized;
}

function boundedOptionalString(value: unknown, maxLength: number): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) return undefined;
  return normalized;
}

function canonicalUuid(value: unknown): string | undefined {
  const normalized = boundedRequiredString(value, 36);
  return normalized && UUID_RE.test(normalized) ? normalized : undefined;
}

function parseExecutionBody(rawBody: string): PaperclipExecutionBody | undefined {
  let value: unknown;
  try {
    value = JSON.parse(rawBody);
  } catch {
    return undefined;
  }

  if (!isRecord(value) || !hasOnlyKeys(value, [
    'paperclipAgentId',
    'paperclipCompanyId',
    'paperclipRunId',
    'catalogKey',
    'task',
  ])) {
    return undefined;
  }

  const paperclipAgentId = canonicalUuid(value.paperclipAgentId);
  const paperclipCompanyId = canonicalUuid(value.paperclipCompanyId);
  const paperclipRunId = canonicalUuid(value.paperclipRunId);
  const catalogKey = boundedRequiredString(value.catalogKey, 64);
  if (
    !paperclipAgentId
    || !paperclipCompanyId
    || !paperclipRunId
    || !catalogKey
    || !CATALOG_KEY_RE.test(catalogKey)
    || !isRecord(value.task)
    || !hasOnlyKeys(value.task, [
      'issueId',
      'identifier',
      'title',
      'description',
      'workMode',
      'wakeReason',
      'wakeCommentId',
    ])
  ) {
    return undefined;
  }

  const issueId = canonicalUuid(value.task.issueId);
  const identifier = boundedRequiredString(value.task.identifier, 128);
  const title = boundedRequiredString(value.task.title, 500);
  const description = boundedOptionalString(value.task.description, 12_000);
  const workMode = boundedOptionalString(value.task.workMode, 64);
  const wakeReason = boundedOptionalString(value.task.wakeReason, 128);
  const wakeCommentId = boundedOptionalString(value.task.wakeCommentId, 128);

  if (
    !issueId
    || !identifier
    || !title
    || description === undefined
    || workMode === undefined
    || wakeReason === undefined
    || wakeCommentId === undefined
  ) {
    return undefined;
  }

  return {
    paperclipAgentId,
    paperclipCompanyId,
    paperclipRunId,
    catalogKey,
    task: {
      issueId,
      identifier,
      title,
      description,
      workMode,
      wakeReason,
      wakeCommentId,
    },
  };
}

function authorized(
  secret: string,
  request: PaperclipExecutionBridgeRequest,
  now: number,
): boolean {
  if (!request.timestamp || !request.signature) return false;
  if (!/^\d{10}$/.test(request.timestamp)) return false;
  const timestampSeconds = Number(request.timestamp);
  if (!Number.isSafeInteger(timestampSeconds)) return false;
  if (Math.abs(Math.floor(now / 1000) - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS) return false;

  const suppliedDigest = SIGNATURE_RE.exec(request.signature)?.[1];
  if (!suppliedDigest) return false;
  const supplied = Buffer.from(suppliedDigest, 'hex');
  const expected = Buffer.from(
    signPaperclipExecutionBridge(secret, request.timestamp, request.rawBody).slice('sha256='.length),
    'hex',
  );
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function normalizedRunToken(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const token = value.trim();
  if (token.length < 32 || token.length > 8_192 || !JWT_RE.test(token)) return undefined;
  return token;
}

function decodeValidatedClaims(token: string): JwtClaims | undefined {
  try {
    const [, payload] = token.split('.');
    if (!payload) return undefined;
    const value: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!isRecord(value)) return undefined;
    const sub = boundedRequiredString(value.sub, 128);
    const companyId = boundedRequiredString(value.company_id, 128);
    const runId = boundedRequiredString(value.run_id, 128);
    const adapterType = boundedRequiredString(value.adapter_type, 128);
    if (!sub || !companyId || !runId || !adapterType) return undefined;
    return { sub, company_id: companyId, run_id: runId, adapter_type: adapterType };
  } catch {
    return undefined;
  }
}

function provenanceMatches(
  agent: unknown,
  body: PaperclipExecutionBody,
): boolean {
  if (!isRecord(agent)) return false;
  if (
    agent.id !== body.paperclipAgentId
    || agent.companyId !== body.paperclipCompanyId
    || agent.adapterType !== PAPERCLIP_ADAPTER_TYPE
    || !isRecord(agent.metadata)
  ) {
    return false;
  }

  const managedResource = agent.metadata.paperclipManagedResource;
  const managedAgent = agent.metadata.pluginManagedAgent;
  if (!isRecord(managedResource) || !isRecord(managedAgent)) return false;

  return managedResource.pluginKey === PAPERCLIP_PLUGIN_KEY
    && managedResource.resourceKind === 'agent'
    && managedResource.resourceKey === body.catalogKey
    && managedAgent.pluginKey === PAPERCLIP_PLUGIN_KEY
    && managedAgent.agentKey === body.catalogKey;
}

export function createPaperclipExecutionBridgeAttestationHandler(
  deps: PaperclipExecutionBridgeDeps,
) {
  const now = deps.now ?? (() => Date.now());
  const fetchImpl = deps.fetchImpl ?? fetch;
  const baseUrl = deps.paperclipBaseUrl.replace(/\/$/, '');

  return async (
    request: PaperclipExecutionBridgeRequest,
  ): Promise<PaperclipExecutionBridgeResponse> => {
    if (!authorized(deps.secret, request, now())) {
      return { status: 401, body: { error: 'unauthorized' } };
    }

    const body = parseExecutionBody(request.rawBody);
    if (!body) {
      return { status: 400, body: { error: 'invalid-execution-request' } };
    }

    const runToken = normalizedRunToken(request.runToken);
    if (!runToken) {
      return { status: 401, body: { error: 'unauthorized' } };
    }

    let paperclipResponse: Response;
    try {
      paperclipResponse = await fetchImpl(`${baseUrl}/api/agents/me`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${runToken}`,
        },
        signal: AbortSignal.timeout(3_000),
      });
    } catch {
      return { status: 503, body: { error: 'paperclip-attestation-unavailable' } };
    }

    if (!paperclipResponse.ok) {
      return { status: 401, body: { error: 'unauthorized' } };
    }

    let agent: unknown;
    try {
      agent = await paperclipResponse.json();
    } catch {
      return { status: 503, body: { error: 'paperclip-attestation-unavailable' } };
    }

    const claims = decodeValidatedClaims(runToken);
    if (
      !claims
      || claims.sub !== body.paperclipAgentId
      || claims.company_id !== body.paperclipCompanyId
      || claims.run_id !== body.paperclipRunId
      || claims.adapter_type !== PAPERCLIP_ADAPTER_TYPE
      || !provenanceMatches(agent, body)
    ) {
      return { status: 403, body: { error: 'paperclip-attestation-mismatch' } };
    }

    // Candidate V1 stops deliberately after authentication + managed-resource attestation.
    // No Wandora employee mapping, Mastra execution, persistence or Paperclip callback is allowed yet.
    return { status: 501, body: { accepted: false, error: 'execution-not-wired' } };
  };
}
