import { createHmac, timingSafeEqual } from 'node:crypto';
import type { InboundTextEvent } from '../ana/contracts.js';
import { CoreStateError } from '../ana/postgres-repository.js';
import type { SupervisedInboundOutcome } from '../ana/supervised-ingress.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENT_ID_RE = /^evt_[a-f0-9]{32}$/;
const PHONE_RE = /^\+[1-9]\d{7,14}$/;
const SIGNATURE_RE = /^sha256=([a-f0-9]{64})$/;
const MAX_CLOCK_SKEW_SECONDS = 300;

export type GatewayIngressRequest = {
  rawBody: string;
  timestamp: string | undefined;
  signature: string | undefined;
};

export type GatewayIngressResponse = {
  status: number;
  body: Record<string, unknown>;
};

export type GatewayIngressDeps = {
  secret: string;
  processInbound: (
    organizationId: string,
    event: InboundTextEvent,
  ) => Promise<SupervisedInboundOutcome>;
  now?: () => number;
};

export function signGatewayIngress(secret: string, timestamp: string, rawBody: string): string {
  const digest = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  return `sha256=${digest}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseInboundBody(rawBody: string): { organizationId: string; event: InboundTextEvent } | undefined {
  let value: unknown;
  try {
    value = JSON.parse(rawBody);
  } catch {
    return undefined;
  }
  if (!isRecord(value) || !UUID_RE.test(String(value.organizationId ?? '')) || !isRecord(value.event)) {
    return undefined;
  }

  const event = value.event;
  const eventId = String(event.eventId ?? '');
  const connectionId = String(event.connectionId ?? '');
  const sender = String(event.sender ?? '');
  const text = String(event.text ?? '').trim();
  const occurredAt = String(event.occurredAt ?? '');
  const occurredDate = new Date(occurredAt);

  if (
    !EVENT_ID_RE.test(eventId)
    || !UUID_RE.test(connectionId)
    || !PHONE_RE.test(sender)
    || text.length < 1
    || text.length > 12_000
    || Number.isNaN(occurredDate.valueOf())
  ) {
    return undefined;
  }

  return {
    organizationId: String(value.organizationId),
    event: { eventId, connectionId, sender, text, occurredAt: occurredDate.toISOString() },
  };
}

function authorized(
  secret: string,
  request: GatewayIngressRequest,
  now: number,
): boolean {
  if (!request.timestamp || !request.signature) return false;
  if (!/^\d{10}$/.test(request.timestamp)) return false;
  const timestampSeconds = Number(request.timestamp);
  if (!Number.isSafeInteger(timestampSeconds)) return false;
  if (Math.abs(Math.floor(now / 1000) - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS) return false;

  const match = SIGNATURE_RE.exec(request.signature);
  if (!match) return false;
  const supplied = Buffer.from(match[1], 'hex');
  const expected = Buffer.from(
    signGatewayIngress(secret, request.timestamp, request.rawBody).slice('sha256='.length),
    'hex',
  );
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function createGatewayIngressHandler(deps: GatewayIngressDeps) {
  const now = deps.now ?? (() => Date.now());

  return async (request: GatewayIngressRequest): Promise<GatewayIngressResponse> => {
    if (!authorized(deps.secret, request, now())) {
      return { status: 401, body: { error: 'unauthorized' } };
    }

    const parsed = parseInboundBody(request.rawBody);
    if (!parsed) {
      return { status: 400, body: { error: 'invalid-inbound-event' } };
    }

    try {
      const outcome = await deps.processInbound(parsed.organizationId, parsed.event);
      return {
        status: outcome.duplicate ? 200 : 202,
        body: {
          accepted: true,
          duplicate: outcome.duplicate,
          result: outcome.result,
        },
      };
    } catch (error) {
      if (error instanceof CoreStateError) {
        return {
          status: error.code === 'event_in_progress' ? 409 : 422,
          body: { accepted: false, error: error.code },
        };
      }
      return { status: 500, body: { accepted: false, error: 'internal-error' } };
    }
  };
}
