const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLUGIN_KEY = 'wandora.organization-adapter-v1';
const CATALOG_KEY = 'ana-commercial-v1';

export class PaperclipRunIdentityError extends Error {
  constructor(readonly code: 'unavailable' | 'invalid') {
    super(code === 'unavailable' ? 'Paperclip run identity is unavailable.' : 'Paperclip run identity is invalid.');
    this.name = 'PaperclipRunIdentityError';
  }
}

export type PaperclipRunIdentity = {
  paperclipAgentId: string;
  paperclipCompanyId: string;
  catalogKey: typeof CATALOG_KEY;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createPaperclipRunIdentityClient(deps: {
  agentMeUrl: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}) {
  const endpoint = new URL(deps.agentMeUrl);
  if (
    endpoint.protocol !== 'http:'
    || endpoint.hostname !== 'wandora-paperclip'
    || endpoint.port !== '3100'
    || endpoint.pathname !== '/api/agents/me'
    || endpoint.username
    || endpoint.password
    || endpoint.search
    || endpoint.hash
  ) {
    throw new RangeError('paperclip_agent_me_url_not_canonical');
  }
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? 5_000;

  return async (input: {
    runToken: string;
    paperclipRunId: string;
    paperclipAgentId: string;
    paperclipCompanyId: string;
  }): Promise<PaperclipRunIdentity> => {
    if (
      !input.runToken.trim()
      || input.runToken.length > 16_384
      || !UUID_RE.test(input.paperclipRunId)
      || !UUID_RE.test(input.paperclipAgentId)
      || !UUID_RE.test(input.paperclipCompanyId)
    ) {
      throw new PaperclipRunIdentityError('invalid');
    }

    let response: Response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'GET',
        headers: {
          authorization: `Bearer ${input.runToken}`,
          'x-paperclip-run-id': input.paperclipRunId,
          accept: 'application/json',
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new PaperclipRunIdentityError('unavailable');
    }
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      throw new PaperclipRunIdentityError('invalid');
    }
    if (response.status !== 200) throw new PaperclipRunIdentityError('unavailable');

    let value: unknown;
    try {
      value = await response.json();
    } catch {
      throw new PaperclipRunIdentityError('unavailable');
    }
    if (!isRecord(value)) throw new PaperclipRunIdentityError('invalid');

    const id = String(value.id ?? '');
    const companyId = String(value.companyId ?? '');
    if (
      id !== input.paperclipAgentId
      || companyId !== input.paperclipCompanyId
      || !UUID_RE.test(id)
      || !UUID_RE.test(companyId)
    ) {
      throw new PaperclipRunIdentityError('invalid');
    }

    const metadata = isRecord(value.metadata) ? value.metadata : {};
    const managed = isRecord(metadata.pluginManagedAgent) ? metadata.pluginManagedAgent : {};
    if (
      managed.pluginKey !== PLUGIN_KEY
      || managed.agentKey !== CATALOG_KEY
      || value.role !== 'commercial-assistant'
      || value.name !== 'Ana'
    ) {
      throw new PaperclipRunIdentityError('invalid');
    }

    return {
      paperclipAgentId: id,
      paperclipCompanyId: companyId,
      catalogKey: CATALOG_KEY,
    };
  };
}
