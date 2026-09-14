import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeEvolutionInbound } from '../src/evolution/normalize-inbound.js';
import { acceptInboundOnce, InMemoryEventReceiptStore } from '../src/runtime/idempotency.js';

const rawWebhook = {
  event: 'messages.upsert',
  instance: 'provider-instance-42',
  server_url: 'http://provider-internal:8080',
  apikey: 'provider-secret-never-leak',
  date_time: '2026-09-13T22:10:00.000Z',
  data: {
    key: {
      id: '3EB0ABCDEF123456',
      remoteJid: '5551999999999@s.whatsapp.net',
      fromMe: false,
    },
    messageTimestamp: 1789337400,
    message: { conversation: '  Olá, Wandora!  ' },
  },
};

test('normalizes Evolution webhook into a Wandora-owned inbound event', () => {
  const event = normalizeEvolutionInbound('conn_acme_whatsapp', rawWebhook);
  assert.equal(event.connectionId, 'conn_acme_whatsapp');
  assert.equal(event.sender, '+5551999999999');
  assert.equal(event.text, 'Olá, Wandora!');
  assert.match(event.eventId, /^evt_[a-f0-9]{32}$/);
  const serialized = JSON.stringify(event);
  assert.equal(serialized.includes('provider-instance-42'), false);
  assert.equal(serialized.includes('provider-secret-never-leak'), false);
  assert.equal(serialized.includes('provider-internal'), false);
});

test('derives a stable event id and accepts a duplicate only once', async () => {
  const first = normalizeEvolutionInbound('conn_acme_whatsapp', rawWebhook);
  const duplicate = normalizeEvolutionInbound('conn_acme_whatsapp', structuredClone(rawWebhook));
  assert.equal(first.eventId, duplicate.eventId);

  const receipts = new InMemoryEventReceiptStore();
  assert.deepEqual(await acceptInboundOnce(first, receipts), first);
  assert.equal(await acceptInboundOnce(duplicate, receipts), null);
});

test('rejects outbound echoes and unsupported events', () => {
  const echo = structuredClone(rawWebhook);
  echo.data.key.fromMe = true;
  assert.throws(() => normalizeEvolutionInbound('conn', echo));
  assert.throws(() => normalizeEvolutionInbound('conn', { ...rawWebhook, event: 'contacts.update' }));
});
