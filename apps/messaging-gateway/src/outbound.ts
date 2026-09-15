import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RECIPIENT_RE = /^\+?[1-9]\d{7,14}$/;
const IDEMPOTENCY_RE = /^[A-Za-z0-9._:-]{8,255}$/;

export type OutboundTextCommand = {
  connectionId: string;
  recipient: string;
  text: string;
  idempotencyKey: string;
};

export type OutboundTextAccepted = {
  accepted: true;
  requestId: string;
};

export type OutboundTextOutcome =
  | { kind: 'accepted'; result: OutboundTextAccepted }
  | { kind: 'connection-mismatch' }
  | { kind: 'idempotency-conflict' }
  | { kind: 'delivery-uncertain' };

type Attempt =
  | { state: 'pending'; fingerprint: string }
  | { state: 'uncertain'; fingerprint: string }
  | { state: 'succeeded'; fingerprint: string; result: OutboundTextAccepted };

export class OutboundValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutboundValidationError';
  }
}

export function parseOutboundTextCommand(value: unknown): OutboundTextCommand {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new OutboundValidationError('Outbound command must be an object.');
  }
  const raw = value as Record<string, unknown>;
  const connectionId = typeof raw.connectionId === 'string' ? raw.connectionId.toLowerCase() : '';
  const recipient = typeof raw.recipient === 'string' ? raw.recipient : '';
  const text = typeof raw.text === 'string' ? raw.text : '';
  const idempotencyKey = typeof raw.idempotencyKey === 'string' ? raw.idempotencyKey : '';

  if (!UUID_RE.test(connectionId)) throw new OutboundValidationError('connectionId must be a canonical UUID.');
  if (!RECIPIENT_RE.test(recipient)) throw new OutboundValidationError('recipient must be E.164-like.');
  if (text.length > 12_000 || text.trim().length === 0) {
    throw new OutboundValidationError('text must contain 1 to 12000 characters.');
  }
  if (!IDEMPOTENCY_RE.test(idempotencyKey)) {
    throw new OutboundValidationError('idempotencyKey is invalid.');
  }

  return { connectionId, recipient, text, idempotencyKey };
}

export function signCoreOutbound(secret: string, timestamp: string, rawBody: string): string {
  const digest = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  return `sha256=${digest}`;
}

export function verifyCoreOutboundSignature(args: {
  secret: string;
  timestamp: string | undefined;
  signature: string | undefined;
  rawBody: string;
  nowMs: number;
  maxSkewSeconds?: number;
}): boolean {
  if (!args.timestamp || !args.signature || !/^\d{10}$/.test(args.timestamp)) return false;
  const timestampSeconds = Number(args.timestamp);
  const nowSeconds = Math.floor(args.nowMs / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > (args.maxSkewSeconds ?? 300)) return false;

  const expected = signCoreOutbound(args.secret, args.timestamp, args.rawBody);
  const actualBuffer = Buffer.from(args.signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function fingerprint(command: OutboundTextCommand): string {
  return createHash('sha256')
    .update(JSON.stringify({
      connectionId: command.connectionId,
      recipient: command.recipient,
      text: command.text,
    }))
    .digest('hex');
}

export type EvolutionOutboundSenderDeps = {
  connectionId: string;
  instanceName: string;
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRememberedAttempts?: number;
};

export function createEvolutionOutboundSender(deps: EvolutionOutboundSenderDeps) {
  const attempts = new Map<string, Attempt>();
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? 5_000;
  const maxRememberedAttempts = deps.maxRememberedAttempts ?? 10_000;
  const baseUrl = deps.baseUrl.replace(/\/$/, '');

  const makeRoom = (): boolean => {
    if (attempts.size < maxRememberedAttempts) return true;
    for (const [key, attempt] of attempts) {
      if (attempt.state === 'succeeded') {
        attempts.delete(key);
        if (attempts.size < maxRememberedAttempts) return true;
      }
    }
    return false;
  };

  return async (command: OutboundTextCommand): Promise<OutboundTextOutcome> => {
    if (command.connectionId !== deps.connectionId) return { kind: 'connection-mismatch' };

    const commandFingerprint = fingerprint(command);
    const existing = attempts.get(command.idempotencyKey);
    if (existing) {
      if (existing.fingerprint !== commandFingerprint) return { kind: 'idempotency-conflict' };
      if (existing.state === 'succeeded') return { kind: 'accepted', result: existing.result };
      return { kind: 'delivery-uncertain' };
    }

    if (!makeRoom()) {
      // The durable Core attempt is authoritative. If this defensive cache is saturated
      // with unresolved attempts, fail closed rather than risk another provider call.
      return { kind: 'delivery-uncertain' };
    }

    attempts.set(command.idempotencyKey, { state: 'pending', fingerprint: commandFingerprint });
    const number = command.recipient.replace(/\D/g, '');

    let response: Response;
    try {
      response = await fetchImpl(
        `${baseUrl}/message/sendText/${encodeURIComponent(deps.instanceName)}`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            apikey: deps.apiKey,
          },
          body: JSON.stringify({ number, text: command.text }),
          signal: AbortSignal.timeout(timeoutMs),
        },
      );
    } catch {
      attempts.set(command.idempotencyKey, { state: 'uncertain', fingerprint: commandFingerprint });
      return { kind: 'delivery-uncertain' };
    }

    if (!response.ok) {
      attempts.set(command.idempotencyKey, { state: 'uncertain', fingerprint: commandFingerprint });
      return { kind: 'delivery-uncertain' };
    }

    const result: OutboundTextAccepted = {
      accepted: true,
      requestId: command.idempotencyKey,
    };
    attempts.set(command.idempotencyKey, {
      state: 'succeeded',
      fingerprint: commandFingerprint,
      result,
    });
    return { kind: 'accepted', result };
  };
}
