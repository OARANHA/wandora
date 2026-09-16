import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPrivateGatewayClient,
  PrivateGatewayDeliveryUncertainError,
  signPrivateGatewayRequest,
} from '../src/messaging/private-gateway.js';

const command = {
  connectionId: '22222222-2222-2222-2222-222222222222',
  recipient: '+5551999999999',
  text: 'Resposta supervisionada',
  idempotencyKey: 'proposal-send:88888888-8888-4888-8888-888888888888',
};
const secret = 'core-gateway-outbound-secret-0123456789abcdef0123456789';
const nowMs = 1_789_430_400_000;
const url = 'http://wandora-messaging-gateway:8787/internal/v1/core/outbound/text';

test('private Gateway client signs exact provider-neutral body and accepts only matching Wandora correlation', async () => {
  let calls = 0;
  let capturedBody = '';
  let capturedHeaders: Record<string, string> = {};
  const client = createPrivateGatewayClient({
    url,
    secret,
    now: () => nowMs,
    fetchImpl: async (input, init) => {
      calls += 1;
      assert.equal(String(input), url);
      assert.equal(init?.method, 'POST');
      capturedBody = String(init?.body ?? '');
      capturedHeaders = init?.headers as Record<string, string>;
      return new Response(JSON.stringify({
        accepted: true,
        requestId: command.idempotencyKey,
        providerMessageId: 'must-be-ignored',
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });

  const result = await client.sendText(command);
  assert.deepEqual(result, { accepted: true, requestId: command.idempotencyKey });
  assert.equal(calls, 1);
  assert.equal(capturedBody, JSON.stringify(command));
  const timestamp = String(Math.floor(nowMs / 1000));
  assert.equal(capturedHeaders['x-wandora-timestamp'], timestamp);
  assert.equal(
    capturedHeaders['x-wandora-signature'],
    signPrivateGatewayRequest(secret, timestamp, capturedBody),
  );
  assert.equal(JSON.stringify(result).includes('providerMessageId'), false);
});

test('transport, non-200 and malformed/mismatched success are all delivery-uncertain', async () => {
  const cases: Array<typeof fetch> = [
    async () => { throw new Error('timeout'); },
    async () => new Response(JSON.stringify({ retry: false }), { status: 502 }),
    async () => new Response('not-json', { status: 200 }),
    async () => new Response(JSON.stringify({ accepted: true, requestId: 'different-key' }), { status: 200 }),
  ];

  for (const fetchImpl of cases) {
    const client = createPrivateGatewayClient({ url, secret, fetchImpl, now: () => nowMs });
    await assert.rejects(
      client.sendText(command),
      (error: unknown) => error instanceof PrivateGatewayDeliveryUncertainError,
    );
  }
});
