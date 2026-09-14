import { createHash } from 'node:crypto';
import type { InboundTextEvent } from '../contracts/messaging-gateway.js';
import { inboundTextEventSchema } from '../contracts/schemas.js';

type Raw = Record<string, any>;

function textFrom(message: Raw): string | undefined {
  return message?.conversation ?? message?.extendedTextMessage?.text;
}

function phoneFrom(data: Raw): string {
  const key = data?.key ?? {};
  const remote = String(key.remoteJidAlt ?? key.remoteJid ?? '');
  if (!remote || remote.endsWith('@g.us')) throw new Error('Unsupported sender JID');
  const value = remote.split('@')[0].replace(/\D/g, '');
  if (!value) throw new Error('Missing sender phone');
  return `+${value}`;
}

function occurredAt(payload: Raw, data: Raw): string {
  const seconds = Number(data?.messageTimestamp);
  if (Number.isFinite(seconds) && seconds > 0) return new Date(seconds * 1000).toISOString();
  const parsed = new Date(String(payload?.date_time ?? ''));
  if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString();
  throw new Error('Missing event timestamp');
}

export function normalizeEvolutionInbound(
  connectionId: string,
  payload: unknown,
): InboundTextEvent {
  const raw = payload as Raw;
  if (raw?.event !== 'messages.upsert') throw new Error('Unsupported Evolution event');
  const data = raw?.data ?? {};
  if (data?.key?.fromMe) throw new Error('Outbound echo is not an inbound customer message');

  const providerMessageId = String(data?.key?.id ?? '');
  if (!providerMessageId) throw new Error('Missing provider message id');
  const text = textFrom(data?.message ?? {});
  if (!text?.trim()) throw new Error('Unsupported non-text message');

  const digest = createHash('sha256')
    .update(`${connectionId}|${raw.event}|${providerMessageId}`)
    .digest('hex')
    .slice(0, 32);

  return inboundTextEventSchema.parse({
    eventId: `evt_${digest}`,
    connectionId,
    sender: phoneFrom(data),
    text: text.trim(),
    occurredAt: occurredAt(raw, data),
  });
}
