import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadMessagingGatewayConfig } from '../src/config.js';
import { signCoreOutbound, type OutboundTextCommand, type OutboundTextOutcome } from '../src/outbound.js';
import { createMessagingGatewayServer } from '../src/server.js';

const evolutionSecret = 'evolution-webhook-secret-that-is-long-enough-12345';
const ingressSecret = 'gateway-core-secret-that-is-long-enough-123456789';
const outboundSecret = 'core-gateway-outbound-secret-that-is-long-enough-1234';
const evolutionApiKey = 'evolution-api-key-that-is-long-enough-123456789';
const organizationId = '11111111-1111-1111-1111-111111111111';
const connectionId = '22222222-2222-2222-2222-222222222222';
const nowSeconds = 1_789_430_400;
const nowMs = nowSeconds * 1000;

const command: OutboundTextCommand = {
  connectionId,
  recipient: '+5551999999999',
  text: 'Olá!',
  idempotencyKey: 'proposal:12345678',
};

async function listen(server: Server): Promise<string> {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('test server did not bind TCP');
  return `http://127.0.0.1:${address.port}`;
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

function serverFixture(sendText?: (input: OutboundTextCommand) => Promise<OutboundTextOutcome>) {
  const outbound = sendText ? { secret: outboundSecret, sendText } : undefined;
  return createMessagingGatewayServer({
    evolutionInstance: 'wandora-lab-01',
    evolutionWebhookJwtKey: evolutionSecret,
    organizationId,
    connectionId,
    forwardToCore: async () => ({ kind: 'accepted', status: 202 }),
    ...(outbound ? { outbound } : {}),
    now: () => nowMs,
  });
}

async function postOutbound(
  baseUrl: string,
  payload: unknown,
  options: { secret?: string; timestamp?: string } = {},
): Promise<Response> {
  const rawBody = JSON.stringify(payload);
  const timestamp = options.timestamp ?? String(nowSeconds);
  const secret = options.secret ?? outboundSecret;
  return fetch(`${baseUrl}/internal/v1/core/outbound/text`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-wandora-timestamp': timestamp,
      'x-wandora-signature': signCoreOutbound(secret, timestamp, rawBody),
    },
    body: rawBody,
  });
}

test('outbound is disabled by default and requires no outbound credentials', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wandora-outbound-config-'));
  const evolutionFile = join(dir, 'evolution-jwt');
  const ingressFile = join(dir, 'core-ingress');
  try {
    await writeFile(evolutionFile, evolutionSecret, { mode: 0o600 });
    await writeFile(ingressFile, ingressSecret, { mode: 0o600 });
    const config = await loadMessagingGatewayConfig({
      PORT: '8787',
      WANDORA_EVOLUTION_INSTANCE: 'wandora-lab-01',
      WANDORA_ORGANIZATION_ID: organizationId,
      WANDORA_CONNECTION_ID: connectionId,
      WANDORA_EVOLUTION_WEBHOOK_JWT_KEY_FILE: evolutionFile,
      WANDORA_CORE_INGRESS_SECRET_FILE: ingressFile,
    });
    assert.equal(config.outbound, undefined);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }

  const server = serverFixture();
  const baseUrl = await listen(server);
  try {
    assert.equal((await postOutbound(baseUrl, command)).status, 404);
  } finally {
    await close(server);
  }
});

test('enabled outbound config requires file secrets and the private Evolution target', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wandora-outbound-config-'));
  const evolutionFile = join(dir, 'evolution-jwt');
  const ingressFile = join(dir, 'core-ingress');
  const outboundFile = join(dir, 'core-outbound');
  const apiKeyFile = join(dir, 'evolution-api-key');
  try {
    await Promise.all([
      writeFile(evolutionFile, evolutionSecret, { mode: 0o600 }),
      writeFile(ingressFile, ingressSecret, { mode: 0o600 }),
      writeFile(outboundFile, outboundSecret, { mode: 0o600 }),
      writeFile(apiKeyFile, evolutionApiKey, { mode: 0o600 }),
    ]);
    const env: NodeJS.ProcessEnv = {
      PORT: '8787',
      WANDORA_EVOLUTION_INSTANCE: 'wandora-lab-01',
      WANDORA_ORGANIZATION_ID: organizationId,
      WANDORA_CONNECTION_ID: connectionId,
      WANDORA_EVOLUTION_WEBHOOK_JWT_KEY_FILE: evolutionFile,
      WANDORA_CORE_INGRESS_SECRET_FILE: ingressFile,
      WANDORA_GATEWAY_OUTBOUND_ENABLED: 'true',
      WANDORA_CORE_OUTBOUND_SECRET_FILE: outboundFile,
      WANDORA_EVOLUTION_API_KEY_FILE: apiKeyFile,
      WANDORA_EVOLUTION_BASE_URL: 'http://wandora-evolution:8080',
    };

    const config = await loadMessagingGatewayConfig(env);
    assert.equal(config.outbound?.coreOutboundSecret, outboundSecret);
    assert.equal(config.outbound?.evolutionApiKey, evolutionApiKey);
    assert.equal(config.outbound?.evolutionBaseUrl, 'http://wandora-evolution:8080/');

    await assert.rejects(
      loadMessagingGatewayConfig({ ...env, WANDORA_CORE_OUTBOUND_SECRET_FILE: undefined }),
      /WANDORA_CORE_OUTBOUND_SECRET_FILE is required/,
    );
    await assert.rejects(
      loadMessagingGatewayConfig({ ...env, WANDORA_EVOLUTION_API_KEY_FILE: undefined }),
      /WANDORA_EVOLUTION_API_KEY_FILE is required/,
    );
    await assert.rejects(
      loadMessagingGatewayConfig({ ...env, WANDORA_EVOLUTION_BASE_URL: 'https://provider.example.com' }),
      /private canonical Evolution service/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('private outbound route authenticates Core HMAC before sending', async () => {
  let calls = 0;
  const server = serverFixture(async (input) => {
    calls += 1;
    assert.deepEqual(input, command);
    return { kind: 'accepted', result: { accepted: true, requestId: input.idempotencyKey } };
  });
  const baseUrl = await listen(server);
  try {
    assert.equal((await postOutbound(baseUrl, command, { secret: 'wrong-secret-that-is-long-enough-123456789' })).status, 401);
    assert.equal((await postOutbound(baseUrl, command, { timestamp: String(nowSeconds - 301) })).status, 401);
    assert.equal(calls, 0);

    const accepted = await postOutbound(baseUrl, command);
    assert.equal(accepted.status, 200);
    assert.deepEqual(await accepted.json(), { accepted: true, requestId: command.idempotencyKey });
    assert.equal(calls, 1);
  } finally {
    await close(server);
  }
});

test('malformed outbound input fails before sender and uncertain result is explicitly non-retryable', async () => {
  let calls = 0;
  let outcome: OutboundTextOutcome = { kind: 'delivery-uncertain' };
  const server = serverFixture(async () => {
    calls += 1;
    return outcome;
  });
  const baseUrl = await listen(server);
  try {
    const invalid = await postOutbound(baseUrl, { ...command, recipient: 'invalid' });
    assert.equal(invalid.status, 400);
    assert.equal(calls, 0);

    const uncertain = await postOutbound(baseUrl, command);
    assert.equal(uncertain.status, 502);
    assert.deepEqual(await uncertain.json(), {
      accepted: false,
      retry: false,
      reason: 'delivery-uncertain',
    });
    assert.equal(calls, 1);

    outcome = { kind: 'connection-mismatch' };
    const mismatch = await postOutbound(baseUrl, { ...command, idempotencyKey: 'proposal:87654321' });
    assert.equal(mismatch.status, 422);
    assert.deepEqual(await mismatch.json(), {
      accepted: false,
      retry: false,
      reason: 'connection-mismatch',
    });
  } finally {
    await close(server);
  }
});
