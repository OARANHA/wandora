import assert from 'node:assert/strict';
import test from 'node:test';
import {
  IgnoredEvolutionEvent,
  InvalidEvolutionEvent,
} from '../src/contracts.js';
import { normalizeEvolutionInbound } from '../src/normalize-evolution-inbound.js';

const connectionId = '22222222-2222-2222-2222-222222222222';

const rawWebhook = {
  event: 'messages.upsert',
  instance: 'provider-instance-42',
  server_url: 'http://provider-internal:8080',
  apikey: 'provider-secret-never-leak',
  date_time: '2026-09-14T00:33:20.000Z',
  data: {
    key: {
      id: '3EB0ABCDEF123456',
      remoteJid: '5551999999999@s.whatsapp.net',
      fromMe: false,
    },
    messageTimestamp: 1_789_336_400,
    message: { conversation: '  Olá, Wandora!  ' },
  },
};

test('normalizes text without leaking provider identifiers or credentials', () => {
  const event = normalizeEvolutionInbound(connectionId, rawWebhook);
  assert.equal(event.connectionId, connectionId);
  assert.equal(event.sender, '+5551999999999');
  assert.equal(event.text, 'Olá, Wandora!');
  assert.match(event.eventId, /^evt_[a-f0-9]{32}$/);

  const serialized = JSON.stringify(event);
  assert.equal(serialized.includes('provider-instance-42'), false);
  assert.equal(serialized.includes('provider-secret-never-leak'), false);
  assert.equal(serialized.includes('provider-internal'), false);
  assert.equal(serialized.includes('3EB0ABCDEF123456'), false);
  assert.equal(serialized.includes('@s.whatsapp.net'), false);
});

test('event id is deterministic for provider retries', () => {
  const first = normalizeEvolutionInbound(connectionId, rawWebhook);
  const duplicate = normalizeEvolutionInbound(connectionId, structuredClone(rawWebhook));
  assert.equal(first.eventId, duplicate.eventId);
});

test('extended text is accepted and timestamps can fall back to date_time', () => {
  const payload = structuredClone(rawWebhook);
  delete (payload.data as { messageTimestamp?: number }).messageTimestamp;
  payload.data.message = { extendedTextMessage: { text: 'Resposta longa' } } as never;
  const event = normalizeEvolutionInbound(connectionId, payload);
  assert.equal(event.text, 'Resposta longa');
  assert.equal(event.occurredAt, '2026-09-14T00:33:20.000Z');
});

test('outbound echoes, groups, status and non-text events are ignored', () => {
  const echo = structuredClone(rawWebhook);
  echo.data.key.fromMe = true;
  assert.throws(() => normalizeEvolutionInbound(connectionId, echo), IgnoredEvolutionEvent);

  const group = structuredClone(rawWebhook);
  group.data.key.remoteJid = '120363000000000000@g.us';
  assert.throws(() => normalizeEvolutionInbound(connectionId, group), IgnoredEvolutionEvent);

  const nonText = structuredClone(rawWebhook);
  nonText.data.message = { imageMessage: { caption: 'image' } } as never;
  assert.throws(() => normalizeEvolutionInbound(connectionId, nonText), IgnoredEvolutionEvent);

  assert.throws(
    () => normalizeEvolutionInbound(connectionId, { ...rawWebhook, event: 'contacts.update' }),
    IgnoredEvolutionEvent,
  );
});

test('malformed canonical input is rejected instead of normalized loosely', () => {
  const missingId = structuredClone(rawWebhook);
  missingId.data.key.id = '';
  assert.throws(() => normalizeEvolutionInbound(connectionId, missingId), InvalidEvolutionEvent);

  const badPhone = structuredClone(rawWebhook);
  badPhone.data.key.remoteJid = 'abc@s.whatsapp.net';
  assert.throws(() => normalizeEvolutionInbound(connectionId, badPhone), InvalidEvolutionEvent);

  const tooLong = structuredClone(rawWebhook);
  tooLong.data.message = { conversation: 'x'.repeat(12_001) };
  assert.throws(() => normalizeEvolutionInbound(connectionId, tooLong), InvalidEvolutionEvent);
});
