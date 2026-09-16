import { createHmac } from 'node:crypto';

export type PrivateGatewayTextCommand = {
  connectionId: string;
  recipient: string;
  text: string;
  idempotencyKey: string;
};

export type PrivateGatewayTextResult = {
  accepted: true;
  requestId: string;
};

export class PrivateGatewayDeliveryUncertainError extends Error {
  constructor(message = 'Messaging Gateway delivery state is uncertain.') {
    super(message);
    this.name = 'PrivateGatewayDeliveryUncertainError';
  }
}

export type PrivateGatewayClient = {
  sendText(command: PrivateGatewayTextCommand): Promise<PrivateGatewayTextResult>;
};

export function signPrivateGatewayRequest(secret: string, timestamp: string, rawBody: string): string {
  const digest = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  return `sha256=${digest}`;
}

export function createPrivateGatewayClient(deps: {
  url: string;
  secret: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
}): PrivateGatewayClient {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? (() => Date.now());
  const timeoutMs = deps.timeoutMs ?? 5_000;

  return {
    async sendText(command) {
      const rawBody = JSON.stringify(command);
      const timestamp = String(Math.floor(now() / 1000));
      const signature = signPrivateGatewayRequest(deps.secret, timestamp, rawBody);

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
        throw new PrivateGatewayDeliveryUncertainError();
      }

      if (response.status !== 200) {
        throw new PrivateGatewayDeliveryUncertainError(
          `Messaging Gateway returned HTTP ${response.status}; delivery state is uncertain.`,
        );
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new PrivateGatewayDeliveryUncertainError('Messaging Gateway returned an invalid success payload.');
      }

      if (
        typeof payload !== 'object'
        || payload === null
        || Array.isArray(payload)
        || (payload as Record<string, unknown>).accepted !== true
        || typeof (payload as Record<string, unknown>).requestId !== 'string'
        || (payload as Record<string, unknown>).requestId !== command.idempotencyKey
      ) {
        throw new PrivateGatewayDeliveryUncertainError('Messaging Gateway success correlation is invalid.');
      }

      return {
        accepted: true,
        requestId: command.idempotencyKey,
      };
    },
  };
}
