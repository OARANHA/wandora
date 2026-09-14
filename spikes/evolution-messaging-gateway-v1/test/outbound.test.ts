import assert from 'node:assert/strict';
import test from 'node:test';
import { EvolutionMessagingGateway } from '../src/evolution/evolution-messaging-gateway.js';
import type { HttpRequest } from '../src/evolution/provider.js';
import { InMemoryOutboundAttemptStore } from '../src/runtime/outbound-idempotency.js';

function fixture(status = 201, throws = false) {
  let captured: HttpRequest | undefined;
  let calls = 0;
  const gateway = new EvolutionMessagingGateway(
    {
      async resolve(connectionId) {
        assert.equal(connectionId, 'conn_acme_whatsapp');
        return {
          instanceName: 'evo_internal_123',
          baseUrl: 'http://wandora-evolution:8080/',
          apiKey: 'secret-evolution-key',
        };
      },
    },
    {
      async request(input) {
        calls += 1;
        captured = input;
        if (throws) throw new Error('timeout');
        return { status, body: { key: { id: 'provider-message-id' } } };
      },
    },
    new InMemoryOutboundAttemptStore(),
  );
  return { gateway, captured: () => captured, calls: () => calls };
}

const message = {
  connectionId: 'conn_acme_whatsapp',
  recipient: '+5551999999999',
  text: 'Olá!',
  idempotencyKey: 'msgreq_12345678',
} as const;

test('maps Wandora sendText to Evolution without leaking provider internals', async () => {
  const { gateway, captured } = fixture();
  const result = await gateway.sendText(message);

  assert.deepEqual(result, { accepted: true, requestId: 'msgreq_12345678' });
  assert.deepEqual(captured(), {
    url: 'http://wandora-evolution:8080/message/sendText/evo_internal_123',
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: 'secret-evolution-key' },
    body: JSON.stringify({ number: '5551999999999', text: 'Olá!' }),
  });

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('evo_internal_123'), false);
  assert.equal(serialized.includes('secret-evolution-key'), false);
  assert.equal(serialized.includes('provider-message-id'), false);
});

test('returns the stored result instead of sending a successful request twice', async () => {
  const { gateway, calls } = fixture();
  const first = await gateway.sendText(message);
  const second = await gateway.sendText(message);
  assert.deepEqual(second, first);
  assert.equal(calls(), 1);
});

test('refuses key reuse with different outbound content', async () => {
  const { gateway, calls } = fixture();
  await gateway.sendText(message);
  await assert.rejects(
    gateway.sendText({ ...message, text: 'Mensagem diferente' }),
    /reused with different outbound content/,
  );
  assert.equal(calls(), 1);
});

test('rejects invalid Wandora outbound input before provider call', async () => {
  const { gateway, captured } = fixture();
  await assert.rejects(gateway.sendText({ ...message, recipient: 'not-a-phone' }));
  assert.equal(captured(), undefined);
});

test('keeps ambiguous provider failure uncertain and blocks automatic resend', async () => {
  const { gateway, calls } = fixture(201, true);
  await assert.rejects(gateway.sendText(message), /delivery state is uncertain/);
  await assert.rejects(gateway.sendText(message), /automatic retry refused/);
  assert.equal(calls(), 1);
});

test('non-success provider HTTP result is treated as uncertain', async () => {
  const { gateway, calls } = fixture(503);
  await assert.rejects(gateway.sendText(message), /HTTP 503.*uncertain/);
  await assert.rejects(gateway.sendText(message), /automatic retry refused/);
  assert.equal(calls(), 1);
});
