import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEvolutionOutboundSender,
  parseOutboundTextCommand,
  signCoreOutbound,
  verifyCoreOutboundSignature,
} from '../src/outbound.js';

const connectionId = '22222222-2222-2222-2222-222222222222';
const command = {
  connectionId,
  recipient: '+5551999999999',
  text: 'Olá!',
  idempotencyKey: 'proposal:12345678',
};

test('parses only bounded provider-neutral outbound commands', () => {
  assert.deepEqual(parseOutboundTextCommand(command), command);
  assert.throws(() => parseOutboundTextCommand({ ...command, connectionId: 'provider-instance' }));
  assert.throws(() => parseOutboundTextCommand({ ...command, recipient: 'not-a-phone' }));
  assert.throws(() => parseOutboundTextCommand({ ...command, text: '   ' }));
  assert.throws(() => parseOutboundTextCommand({ ...command, text: 'x'.repeat(12_001) }));
  assert.throws(() => parseOutboundTextCommand({ ...command, idempotencyKey: 'short' }));
});

test('Core outbound HMAC binds timestamp and raw body and rejects stale signatures', () => {
  const secret = 'core-outbound-secret-that-is-long-enough-123456789';
  const rawBody = JSON.stringify(command);
  const timestamp = '1789430400';
  const signature = signCoreOutbound(secret, timestamp, rawBody);

  assert.equal(verifyCoreOutboundSignature({
    secret,
    timestamp,
    signature,
    rawBody,
    nowMs: 1_789_430_400_000,
  }), true);
  assert.equal(verifyCoreOutboundSignature({
    secret,
    timestamp,
    signature,
    rawBody: `${rawBody} `,
    nowMs: 1_789_430_400_000,
  }), false);
  assert.equal(verifyCoreOutboundSignature({
    secret,
    timestamp,
    signature,
    rawBody,
    nowMs: 1_789_431_000_000,
  }), false);
});

test('maps one provider-neutral request to private Evolution without leaking provider internals', async () => {
  let calls = 0;
  let requestedUrl = '';
  let requestInit: RequestInit | undefined;
  const sender = createEvolutionOutboundSender({
    connectionId,
    instanceName: 'evo-internal-123',
    baseUrl: 'http://wandora-evolution:8080/',
    apiKey: 'private-evolution-api-key',
    fetchImpl: async (input, init) => {
      calls += 1;
      requestedUrl = String(input);
      requestInit = init;
      return new Response(JSON.stringify({ key: { id: 'provider-message-id' } }), { status: 201 });
    },
  });

  const result = await sender(command);
  assert.deepEqual(result, {
    kind: 'accepted',
    result: { accepted: true, requestId: command.idempotencyKey },
  });
  assert.equal(calls, 1);
  assert.equal(requestedUrl, 'http://wandora-evolution:8080/message/sendText/evo-internal-123');
  assert.equal(requestInit?.method, 'POST');
  assert.equal((requestInit?.headers as Record<string, string>)?.apikey, 'private-evolution-api-key');
  assert.equal(requestInit?.body, JSON.stringify({ number: '5551999999999', text: 'Olá!' }));

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('evo-internal-123'), false);
  assert.equal(serialized.includes('private-evolution-api-key'), false);
  assert.equal(serialized.includes('provider-message-id'), false);
});

test('successful duplicate returns stored Wandora result without a second provider call', async () => {
  let calls = 0;
  const sender = createEvolutionOutboundSender({
    connectionId,
    instanceName: 'evo-internal-123',
    baseUrl: 'http://wandora-evolution:8080',
    apiKey: 'private-key',
    fetchImpl: async () => {
      calls += 1;
      return new Response('{}', { status: 200 });
    },
  });

  const first = await sender(command);
  const second = await sender(command);
  assert.deepEqual(second, first);
  assert.equal(calls, 1);
});

test('same idempotency key with different content is rejected without another provider call', async () => {
  let calls = 0;
  const sender = createEvolutionOutboundSender({
    connectionId,
    instanceName: 'evo-internal-123',
    baseUrl: 'http://wandora-evolution:8080',
    apiKey: 'private-key',
    fetchImpl: async () => {
      calls += 1;
      return new Response('{}', { status: 200 });
    },
  });

  await sender(command);
  assert.deepEqual(await sender({ ...command, text: 'Mensagem diferente' }), { kind: 'idempotency-conflict' });
  assert.equal(calls, 1);
});

test('foreign canonical connection is rejected before provider call', async () => {
  let calls = 0;
  const sender = createEvolutionOutboundSender({
    connectionId,
    instanceName: 'evo-internal-123',
    baseUrl: 'http://wandora-evolution:8080',
    apiKey: 'private-key',
    fetchImpl: async () => {
      calls += 1;
      return new Response('{}', { status: 200 });
    },
  });

  assert.deepEqual(await sender({
    ...command,
    connectionId: '33333333-3333-3333-3333-333333333333',
  }), { kind: 'connection-mismatch' });
  assert.equal(calls, 0);
});

test('ambiguous transport failure becomes uncertain and blocks automatic resend', async () => {
  let calls = 0;
  const sender = createEvolutionOutboundSender({
    connectionId,
    instanceName: 'evo-internal-123',
    baseUrl: 'http://wandora-evolution:8080',
    apiKey: 'private-key',
    fetchImpl: async () => {
      calls += 1;
      throw new Error('timeout');
    },
  });

  assert.deepEqual(await sender(command), { kind: 'delivery-uncertain' });
  assert.deepEqual(await sender(command), { kind: 'delivery-uncertain' });
  assert.equal(calls, 1);
});

test('provider non-2xx becomes uncertain and blocks automatic resend', async () => {
  let calls = 0;
  const sender = createEvolutionOutboundSender({
    connectionId,
    instanceName: 'evo-internal-123',
    baseUrl: 'http://wandora-evolution:8080',
    apiKey: 'private-key',
    fetchImpl: async () => {
      calls += 1;
      return new Response('{}', { status: 503 });
    },
  });

  assert.deepEqual(await sender(command), { kind: 'delivery-uncertain' });
  assert.deepEqual(await sender(command), { kind: 'delivery-uncertain' });
  assert.equal(calls, 1);
});

test('pending duplicate and saturated unresolved cache never trigger another provider call', async () => {
  let calls = 0;
  let release: (() => void) | undefined;
  const pendingResponse = new Promise<Response>((resolve) => {
    release = () => resolve(new Response('{}', { status: 200 }));
  });
  const sender = createEvolutionOutboundSender({
    connectionId,
    instanceName: 'evo-internal-123',
    baseUrl: 'http://wandora-evolution:8080',
    apiKey: 'private-key',
    maxRememberedAttempts: 1,
    fetchImpl: async () => {
      calls += 1;
      return await pendingResponse;
    },
  });

  const first = sender(command);
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.deepEqual(await sender(command), { kind: 'delivery-uncertain' });
  assert.deepEqual(await sender({ ...command, idempotencyKey: 'proposal:87654321' }), { kind: 'delivery-uncertain' });
  assert.equal(calls, 1);

  release?.();
  assert.deepEqual(await first, {
    kind: 'accepted',
    result: { accepted: true, requestId: command.idempotencyKey },
  });
});
