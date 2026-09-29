import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import {
  CoreUnavailableError,
  IgnoredEvolutionEvent,
  InvalidEvolutionEvent,
  type CoreForwardOutcome,
  type CoreInboundEnvelope,
} from './contracts.js';
import { verifyEvolutionWebhookJwt } from './evolution-jwt.js';
import {
  emitMessagingLatency,
  messagingMonotonicNow,
  type MessagingLatencyRecorder,
} from './latency.js';
import { normalizeEvolutionInbound } from './normalize-evolution-inbound.js';
import {
  OutboundValidationError,
  parseOutboundTextCommand,
  verifyCoreOutboundSignature,
  type OutboundTextCommand,
  type OutboundTextOutcome,
} from './outbound.js';

export type MessagingGatewayServerDeps = {
  evolutionInstance: string;
  evolutionWebhookJwtKey: string;
  organizationId: string;
  connectionId: string;
  forwardToCore: (envelope: CoreInboundEnvelope) => Promise<CoreForwardOutcome>;
  outbound?: {
    secret: string;
    sendText: (command: OutboundTextCommand) => Promise<OutboundTextOutcome>;
  };
  now?: () => number;
  recordLatency?: MessagingLatencyRecorder;
  monotonicNow?: () => number;
};

class PayloadTooLargeError extends Error {}

function writeJson(response: ServerResponse, status: number, payload: Record<string, unknown>): void {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(`${JSON.stringify(payload)}\n`);
}

async function readBody(request: IncomingMessage, maxBytes = 1_048_576): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) throw new PayloadTooLargeError();
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function mapCoreOutcome(response: ServerResponse, outcome: CoreForwardOutcome): void {
  if (outcome.kind === 'accepted') {
    writeJson(response, 200, { accepted: true });
    return;
  }
  if (outcome.kind === 'processing') {
    writeJson(response, 409, { accepted: false, retry: true, reason: 'event-processing' });
    return;
  }
  writeJson(response, 422, { accepted: false, retry: false, reason: 'canonical-rejection' });
}

function mapOutboundOutcome(response: ServerResponse, outcome: OutboundTextOutcome): void {
  if (outcome.kind === 'accepted') {
    writeJson(response, 200, outcome.result);
    return;
  }
  if (outcome.kind === 'connection-mismatch') {
    writeJson(response, 422, { accepted: false, retry: false, reason: 'connection-mismatch' });
    return;
  }
  if (outcome.kind === 'idempotency-conflict') {
    writeJson(response, 409, { accepted: false, retry: false, reason: 'idempotency-conflict' });
    return;
  }
  writeJson(response, 502, { accepted: false, retry: false, reason: 'delivery-uncertain' });
}

export function createMessagingGatewayServer(deps: MessagingGatewayServerDeps): Server {
  const now = deps.now ?? (() => Date.now());

  return createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://wandora-messaging-gateway.local');

    if (request.method === 'GET' && url.pathname === '/healthz') {
      writeJson(response, 200, { status: 'ok', service: 'wandora-messaging-gateway' });
      return;
    }

    if (url.pathname === '/internal/v1/core/outbound/text') {
      if (!deps.outbound) {
        writeJson(response, 404, { error: 'not-found' });
        return;
      }
      if (request.method !== 'POST') {
        writeJson(response, 405, { error: 'method-not-allowed' });
        return;
      }

      let rawBody: string;
      try {
        rawBody = await readBody(request, 65_536);
      } catch (error) {
        if (error instanceof PayloadTooLargeError) {
          writeJson(response, 413, { error: 'payload-too-large' });
        } else {
          writeJson(response, 500, { error: 'internal-error' });
        }
        return;
      }

      const timestamp = firstHeader(request.headers['x-wandora-timestamp']);
      const signature = firstHeader(request.headers['x-wandora-signature']);
      if (!verifyCoreOutboundSignature({
        secret: deps.outbound.secret,
        timestamp,
        signature,
        rawBody,
        nowMs: now(),
      })) {
        writeJson(response, 401, { error: 'unauthorized-core-outbound' });
        return;
      }

      let payload: unknown;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        writeJson(response, 400, { error: 'invalid-json' });
        return;
      }

      let command: OutboundTextCommand;
      try {
        command = parseOutboundTextCommand(payload);
      } catch (error) {
        if (error instanceof OutboundValidationError) {
          writeJson(response, 400, { error: 'invalid-outbound-command' });
        } else {
          writeJson(response, 500, { error: 'internal-error' });
        }
        return;
      }

      try {
        mapOutboundOutcome(response, await deps.outbound.sendText(command));
      } catch {
        writeJson(response, 502, { accepted: false, retry: false, reason: 'delivery-uncertain' });
      }
      return;
    }

    if (url.pathname !== '/providers/evolution/webhook') {
      writeJson(response, 404, { error: 'not-found' });
      return;
    }
    if (request.method !== 'POST') {
      writeJson(response, 405, { error: 'method-not-allowed' });
      return;
    }

    const ingressStartedAt = (deps.monotonicNow ?? messagingMonotonicNow)();
    const authorization = firstHeader(request.headers.authorization);
    if (!verifyEvolutionWebhookJwt(authorization, deps.evolutionWebhookJwtKey, now())) {
      writeJson(response, 401, { error: 'unauthorized-provider-webhook' });
      return;
    }

    let rawBody: string;
    try {
      rawBody = await readBody(request);
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        writeJson(response, 413, { error: 'payload-too-large' });
      } else {
        writeJson(response, 500, { error: 'internal-error' });
      }
      return;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      writeJson(response, 400, { error: 'invalid-json' });
      return;
    }

    const raw = asRecord(payload);
    if (!raw || raw.instance !== deps.evolutionInstance) {
      writeJson(response, 403, { error: 'unexpected-provider-instance' });
      return;
    }

    let event;
    try {
      event = normalizeEvolutionInbound(deps.connectionId, payload);
    } catch (error) {
      if (error instanceof IgnoredEvolutionEvent) {
        response.writeHead(204, { 'cache-control': 'no-store' });
        response.end();
        return;
      }
      if (error instanceof InvalidEvolutionEvent) {
        writeJson(response, 400, { error: 'invalid-provider-event', reason: error.reason });
        return;
      }
      writeJson(response, 500, { error: 'internal-error' });
      return;
    }

    try {
      const outcome = await deps.forwardToCore({
        organizationId: deps.organizationId,
        event,
      });
      emitMessagingLatency(deps.recordLatency, {
        stage: 'whatsapp.gateway_ingress',
        durationMs: (deps.monotonicNow ?? messagingMonotonicNow)() - ingressStartedAt,
        outcome: 'success',
        correlationId: event.eventId,
      });
      mapCoreOutcome(response, outcome);
    } catch (error) {
      emitMessagingLatency(deps.recordLatency, {
        stage: 'whatsapp.gateway_ingress',
        durationMs: (deps.monotonicNow ?? messagingMonotonicNow)() - ingressStartedAt,
        outcome: 'error',
        correlationId: event.eventId,
      });
      if (error instanceof CoreUnavailableError) {
        writeJson(response, 503, { accepted: false, retry: true, reason: 'core-unavailable' });
      } else {
        writeJson(response, 500, { accepted: false, retry: true, reason: 'internal-error' });
      }
    }
  });
}
