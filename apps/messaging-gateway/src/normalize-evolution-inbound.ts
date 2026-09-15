import { createHash } from 'node:crypto';
import {
  IgnoredEvolutionEvent,
  InvalidEvolutionEvent,
  type InboundTextEvent,
} from './contracts.js';

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : undefined;
}

function textFrom(message: JsonRecord): string | undefined {
  const conversation = message.conversation;
  if (typeof conversation === 'string') return conversation;
  const extended = record(message.extendedTextMessage);
  return typeof extended?.text === 'string' ? extended.text : undefined;
}

function phoneFrom(data: JsonRecord): string {
  const key = record(data.key) ?? {};
  const candidate = key.remoteJidAlt ?? key.remoteJid;
  const remote = typeof candidate === 'string' ? candidate : '';
  if (!remote) throw new InvalidEvolutionEvent('missing-sender');
  if (remote.endsWith('@g.us') || remote === 'status@broadcast') {
    throw new IgnoredEvolutionEvent('unsupported-sender');
  }
  const value = remote.split('@')[0]?.replace(/\D/g, '') ?? '';
  if (!value) throw new InvalidEvolutionEvent('missing-sender-phone');
  const sender = `+${value}`;
  if (!/^\+[1-9]\d{7,14}$/.test(sender)) {
    throw new InvalidEvolutionEvent('invalid-sender-phone');
  }
  return sender;
}

function occurredAt(payload: JsonRecord, data: JsonRecord): string {
  const timestamp = data.messageTimestamp;
  const seconds = typeof timestamp === 'number' || typeof timestamp === 'string'
    ? Number(timestamp)
    : Number.NaN;
  if (Number.isFinite(seconds) && seconds > 0) {
    return new Date(seconds * 1000).toISOString();
  }

  const fallback = payload.date_time;
  const parsed = new Date(typeof fallback === 'string' ? fallback : '');
  if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString();
  throw new InvalidEvolutionEvent('missing-event-timestamp');
}

export function normalizeEvolutionInbound(
  connectionId: string,
  payload: unknown,
): InboundTextEvent {
  const raw = record(payload);
  if (!raw) throw new InvalidEvolutionEvent('invalid-provider-payload');
  if (raw.event !== 'messages.upsert') throw new IgnoredEvolutionEvent('unsupported-event');

  const data = record(raw.data) ?? {};
  const key = record(data.key) ?? {};
  if (key.fromMe === true) throw new IgnoredEvolutionEvent('outbound-echo');

  const providerMessageId = typeof key.id === 'string' ? key.id : '';
  if (!providerMessageId) throw new InvalidEvolutionEvent('missing-provider-message-id');

  const message = record(data.message) ?? {};
  const text = textFrom(message)?.trim();
  if (!text) throw new IgnoredEvolutionEvent('unsupported-non-text-message');
  if (text.length > 12_000) throw new InvalidEvolutionEvent('message-too-long');

  const digest = createHash('sha256')
    .update(`${connectionId}|messages.upsert|${providerMessageId}`)
    .digest('hex')
    .slice(0, 32);

  return {
    eventId: `evt_${digest}`,
    connectionId,
    sender: phoneFrom(data),
    text,
    occurredAt: occurredAt(raw, data),
  };
}
