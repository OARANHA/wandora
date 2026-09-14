import { createServer } from 'node:http';
import { normalizeEvolutionInbound } from './evolution/normalize-inbound.js';
import { acceptInboundOnce, InMemoryEventReceiptStore } from './runtime/idempotency.js';

const port = Number(process.env.PORT ?? '8787');
const providerInstance = process.env.EVOLUTION_INSTANCE ?? 'wandora-lab-01';
const connectionId = process.env.WANDORA_CONNECTION_ID ?? 'whatsapp-lab-01';
const receipts = new InMemoryEventReceiptStore();

function json(res: any, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return json(res, 200, { ok: true, service: 'wandora-messaging-gateway-lab' });
  }

  if (req.method !== 'POST' || req.url !== '/providers/evolution/webhook') {
    return json(res, 404, { error: 'not_found' });
  }

  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (raw.length > 1_000_000) return json(res, 413, { error: 'payload_too_large' });
  try {
    const payload = JSON.parse(raw);
    if (payload?.instance !== providerInstance) {
      console.warn(JSON.stringify({ kind: 'provider_instance_mismatch' }));
      return json(res, 202, { accepted: false, reason: 'instance_mismatch' });
    }

    try {
      const event = normalizeEvolutionInbound(connectionId, payload);
      const accepted = await acceptInboundOnce(event, receipts);
      if (!accepted) {
        console.log(JSON.stringify({ kind: 'duplicate', eventId: event.eventId }));
        return json(res, 200, { accepted: true, duplicate: true });
      }

      console.log(JSON.stringify({
        kind: 'wandora_inbound_text',
        event: accepted,
      }));
      return json(res, 200, { accepted: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unsupported_event';
      console.log(JSON.stringify({ kind: 'ignored', reason: message }));
      return json(res, 200, { accepted: true, ignored: true });
    }
  } catch {
    return json(res, 400, { error: 'invalid_json' });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(JSON.stringify({ kind: 'ready', port, providerInstance, connectionId }));
});
