import { createHmac } from 'node:crypto';
import {
  CoreUnavailableError,
  type CoreForwardOutcome,
  type CoreInboundEnvelope,
} from './contracts.js';

export type CoreClientDeps = {
  url: string;
  secret: string;
  timeoutMs?: number;
  now?: () => number;
  fetchImpl?: typeof fetch;
};

export function signCoreIngress(secret: string, timestamp: string, rawBody: string): string {
  const digest = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  return `sha256=${digest}`;
}

export function createCoreIngressClient(deps: CoreClientDeps) {
  const now = deps.now ?? (() => Date.now());
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? 5_000;

  return async (envelope: CoreInboundEnvelope): Promise<CoreForwardOutcome> => {
    const rawBody = JSON.stringify(envelope);
    const timestamp = String(Math.floor(now() / 1000));
    const signature = signCoreIngress(deps.secret, timestamp, rawBody);

    let response: Response;
    try {
      response = await fetchImpl(deps.url, {
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
      throw new CoreUnavailableError();
    }

    if (response.status === 200 || response.status === 202) {
      return { kind: 'accepted', status: response.status };
    }
    if (response.status === 409) {
      return { kind: 'processing', status: 409 };
    }
    if (response.status === 422) {
      return { kind: 'permanent-rejection', status: 422 };
    }

    throw new CoreUnavailableError(`Wandora Core returned HTTP ${response.status}.`);
  };
}
