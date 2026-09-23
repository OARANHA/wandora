import { createHash } from 'node:crypto';
import type { RuntimeReadTool } from '../agent-runtime/task-runtime.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TOKEN = 16_384;
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_SESSION_TTL_MS = 60_000;

export class PaperclipToolGatewayReadBridgeError extends Error {
  constructor(readonly code: 'invalid' | 'denied' | 'unavailable') {
    super(code === 'invalid'
      ? 'Paperclip Tool Gateway input is invalid.'
      : code === 'denied'
        ? 'Paperclip Tool Gateway denied the read operation.'
        : 'Paperclip Tool Gateway is unavailable.');
    this.name = 'PaperclipToolGatewayReadBridgeError';
  }
}

type GatewayDescriptor = {
  name: string;
  displayName: string;
  description: string;
  parametersSchema: Record<string, unknown>;
  providerType: 'mcp_remote_http' | 'mcp_local_stdio';
  risk: 'read';
  connectionId: string;
  catalogEntryId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function canonicalPaperclipOrigin(agentMeUrl: string): string {
  const url = new URL(agentMeUrl);
  if (
    url.protocol !== 'http:'
    || url.hostname !== 'wandora-paperclip'
    || url.port !== '3100'
    || url.pathname !== '/api/agents/me'
    || url.username
    || url.password
    || url.search
    || url.hash
  ) {
    throw new RangeError('paperclip_agent_me_url_not_canonical');
  }
  return url.origin;
}

function readDescriptor(value: unknown): GatewayDescriptor | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.name !== 'string'
    || !value.name.trim()
    || value.name.length > 512
    || typeof value.description !== 'string'
    || typeof value.displayName !== 'string'
    || !isRecord(value.parametersSchema)
    || value.risk !== 'read'
    || (value.providerType !== 'mcp_local_stdio' && value.providerType !== 'mcp_remote_http')
    || typeof value.connectionId !== 'string'
    || !UUID_RE.test(value.connectionId)
    || typeof value.catalogEntryId !== 'string'
    || !UUID_RE.test(value.catalogEntryId)
  ) return undefined;
  return {
    name: value.name,
    displayName: value.displayName,
    description: value.description,
    parametersSchema: value.parametersSchema,
    providerType: value.providerType,
    risk: 'read',
    connectionId: value.connectionId,
    catalogEntryId: value.catalogEntryId,
  };
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new PaperclipToolGatewayReadBridgeError('unavailable');
  }
}

function gatewayFailure(status: number): PaperclipToolGatewayReadBridgeError {
  return new PaperclipToolGatewayReadBridgeError(
    status === 400 || status === 401 || status === 403 || status === 404 || status === 409 || status === 422
      ? 'denied'
      : 'unavailable',
  );
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalJson(entryValue)}`).join(',')}}`;
}

function readCallIdempotencyKey(input: {
  paperclipRunId: string;
  tool: GatewayDescriptor;
  parameters: unknown;
}): string {
  const digest = createHash('sha256')
    .update(canonicalJson({
      runId: input.paperclipRunId,
      catalogEntryId: input.tool.catalogEntryId,
      toolName: input.tool.name,
      parameters: input.parameters ?? {},
    }))
    .digest('hex');
  return `wandora-read-v1:${digest}`;
}

export function createPaperclipToolGatewayReadBridge(deps: {
  agentMeUrl: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  sessionTtlMs?: number;
}) {
  const origin = canonicalPaperclipOrigin(deps.agentMeUrl);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const sessionTtlMs = deps.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 15_000) {
    throw new RangeError('paperclip_tool_gateway_timeout_invalid');
  }
  if (!Number.isInteger(sessionTtlMs) || sessionTtlMs < 10_000 || sessionTtlMs > 300_000) {
    throw new RangeError('paperclip_tool_gateway_ttl_invalid');
  }

  return async (input: {
    runToken: string;
    paperclipRunId: string;
  }): Promise<RuntimeReadTool[]> => {
    if (
      !input.runToken.trim()
      || input.runToken.length > MAX_TOKEN
      || !UUID_RE.test(input.paperclipRunId)
    ) {
      throw new PaperclipToolGatewayReadBridgeError('invalid');
    }

    let sessionResponse: Response;
    try {
      sessionResponse = await fetchImpl(new URL('/api/tool-gateway/sessions', origin), {
        method: 'POST',
        headers: {
          authorization: `Bearer ${input.runToken}`,
          'x-paperclip-run-id': input.paperclipRunId,
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          runId: input.paperclipRunId,
          ttlMs: sessionTtlMs,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new PaperclipToolGatewayReadBridgeError('unavailable');
    }
    if (sessionResponse.status !== 201) throw gatewayFailure(sessionResponse.status);

    const session = await parseJson(sessionResponse);
    if (!isRecord(session) || typeof session.token !== 'string' || !session.token.trim()) {
      throw new PaperclipToolGatewayReadBridgeError('unavailable');
    }
    const gatewayToken = session.token;

    let listResponse: Response;
    try {
      listResponse = await fetchImpl(new URL('/api/tool-gateway/tools', origin), {
        method: 'GET',
        headers: {
          'x-paperclip-tool-gateway-token': gatewayToken,
          accept: 'application/json',
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new PaperclipToolGatewayReadBridgeError('unavailable');
    }
    if (listResponse.status !== 200) throw gatewayFailure(listResponse.status);

    const listed = await parseJson(listResponse);
    if (!Array.isArray(listed)) throw new PaperclipToolGatewayReadBridgeError('unavailable');

    return listed
      .map(readDescriptor)
      .filter((tool): tool is GatewayDescriptor => Boolean(tool))
      .map((tool): RuntimeReadTool => ({
        name: tool.name,
        title: tool.displayName,
        description: tool.description,
        inputSchema: tool.parametersSchema,
        execute: async (parameters: unknown) => {
          let callResponse: Response;
          try {
            callResponse = await fetchImpl(new URL('/api/tool-gateway/tools/call', origin), {
              method: 'POST',
              headers: {
                'x-paperclip-tool-gateway-token': gatewayToken,
                accept: 'application/json',
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                tool: tool.name,
                parameters,
                timeoutMs,
                idempotencyKey: readCallIdempotencyKey({
                  paperclipRunId: input.paperclipRunId,
                  tool,
                  parameters,
                }),
              }),
              signal: AbortSignal.timeout(timeoutMs + 1_000),
            });
          } catch {
            throw new PaperclipToolGatewayReadBridgeError('unavailable');
          }
          if (callResponse.status !== 200) throw gatewayFailure(callResponse.status);
          const result = await parseJson(callResponse);
          if (!isRecord(result)) return result;
          if ('data' in result) return result.data;
          if ('content' in result) return result.content;
          return result;
        },
      }));
  };
}
