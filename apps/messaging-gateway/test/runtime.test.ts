import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadMessagingGatewayConfig } from '../src/config.js';
import { createCoreIngressClient, signCoreIngress } from '../src/core-client.js';
import {
  CoreUnavailableError,
  type CoreForwardOutcome,
  type CoreInboundEnvelope,
} from '../src/contracts.js';
import { createMessagingGatewayServer } from '../src/server.js';

const evolutionSecret = 'evolution-webhook-secret-that-is-long-enough-12345';
const coreSecret = 'gateway-core-secret-that-is-long-enough-123456789';
const organizationId = '11111111-1111-1111-1111-111111111111';
const connectionId = '22222222-2222-2222-2222-222222222222';
const instance = 'wandora-lab-01';
const nowSeconds = 1_789_430_400;
const nowMs = nowSeconds * 1000;

function evolutionAuthorization(secret = evolutionSecret): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iat: nowSeconds,
    exp: nowSeconds + 600,
    app: 'evolution',
    action: 'webhook',
  })).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `Bearer ${header}.${payload}.${signature}`;
}

function webhook(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    event: 'messages.upsert',
    instance,
    server_url: 'http://evolution:8080',
    apikey: 'must-never-cross-gateway',
    date_time: '2026-09-14T00:33:20.000Z',
    data: {
      key: {
        id: '3EB0ABCDEF123456',
        remoteJid: '5551999999999@s.whatsapp.net',
        fromMe: false,
      },
      messageTimestamp: 1_789_336_400,
      message: { conversation: 'Olá, Wandora!' },
    },
    ...overrides,
  };
}

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

async function postWebhook(baseUrl: string, payload: unknown, authorization = evolutionAuthorization()): Promise<Response> {
  return fetch(`${baseUrl}/providers/evolution/webhook`, {
    method: 'POST',
    headers: {
      authorization,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

test('runtime config reads both credentials only from files and pins private Core route', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wandora-gateway-'));
  const evolutionFile = join(dir, 'evolution-jwt');
  const coreFile = join(dir, 'core-hmac');
  try {
    await writeFile(evolutionFile, `${evolutionSecret}\n`, { mode: 0o600 });
    await writeFile(coreFile, `${coreSecret}\n`, { mode: 0o600 });
    const env: NodeJS.ProcessEnv = {
      PORT: '8787',
      WANDORA_EVOLUTION_INSTANCE: instance,
      WANDORA_ORGANIZATION_ID: organizationId,
      WANDORA_CONNECTION_ID: connectionId,
      WANDORA_EVOLUTION_WEBHOOK_JWT_KEY_FILE: evolutionFile,
      WANDORA_CORE_INGRESS_SECRET_FILE: coreFile,
    };
    const config = await loadMessagingGatewayConfig(env);
    assert.equal(config.evolutionWebhookJwtKey, evolutionSecret);
    assert.equal(config.coreIngressSecret, coreSecret);
    assert.equal(config.coreIngressUrl, 'http://wandora-core:8788/internal/v1/gateway/inbound');

    await assert.rejects(
      loadMessagingGatewayConfig({ ...env, WANDORA_CORE_INGRESS_URL: 'https://api.wandora.com.br/internal/v1/gateway/inbound' }),
      /private canonical Core ingress route/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Core client signs the exact Wandora envelope and maps accepted status', async () => {
  let receivedBody = '';
  let receivedTimestamp = '';
  let receivedSignature = '';
  const receiver = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    receivedBody = Buffer.concat(chunks).toString('utf8');
    receivedTimestamp = String(request.headers['x-wandora-timestamp'] ?? '');
    receivedSignature = String(request.headers['x-wandora-signature'] ?? '');
    response.writeHead(202).end();
  });
  const baseUrl = await listen(receiver);
  try {
    const client = createCoreIngressClient({
      url: `${baseUrl}/internal/v1/gateway/inbound`,
      secret: coreSecret,
      now: () => nowMs,
    });
    const envelope: CoreInboundEnvelope = {
      organizationId,
      event: {
        eventId: 'evt_0123456789abcdef0123456789abcdef',
        connectionId,
        sender: '+5551999999999',
        text: 'Olá',
        occurredAt: '2026-09-14T00:33:20.000Z',
      },
    };
    assert.deepEqual(await client(envelope), { kind: 'accepted', status: 202 });
    assert.equal(receivedBody, JSON.stringify(envelope));
    assert.equal(receivedTimestamp, String(nowSeconds));
    assert.equal(receivedSignature, signCoreIngress(coreSecret, String(nowSeconds), receivedBody));
  } finally {
    await close(receiver);
  }
});

test('valid Evolution webhook becomes one provider-neutral Core envelope', async () => {
  const forwarded: CoreInboundEnvelope[] = [];
  const server = createMessagingGatewayServer({
    evolutionInstance: instance,
    evolutionWebhookJwtKey: evolutionSecret,
    organizationId,
    connectionId,
    now: () => nowMs,
    forwardToCore: async (envelope) => {
      forwarded.push(envelope);
      return { kind: 'accepted', status: 202 };
    },
  });
  const baseUrl = await listen(server);
  try {
    const health = await fetch(`${baseUrl}/healthz`);
    assert.equal(health.status, 200);

    const response = await postWebhook(baseUrl, webhook());
    assert.equal(response.status, 200);
    assert.equal(forwarded.length, 1);
    const serialized = JSON.stringify(forwarded[0]);
    assert.equal(serialized.includes('wandora-lab-01'), false);
    assert.equal(serialized.includes('must-never-cross-gateway'), false);
    assert.equal(serialized.includes('@s.whatsapp.net'), false);
    assert.equal(forwarded[0]?.organizationId, organizationId);
    assert.equal(forwarded[0]?.event.connectionId, connectionId);
  } finally {
    await close(server);
  }
});

test('provider authentication and instance binding fail before Core', async () => {
  let calls = 0;
  const server = createMessagingGatewayServer({
    evolutionInstance: instance,
    evolutionWebhookJwtKey: evolutionSecret,
    organizationId,
    connectionId,
    now: () => nowMs,
    forwardToCore: async () => {
      calls += 1;
      return { kind: 'accepted', status: 202 };
    },
  });
  const baseUrl = await listen(server);
  try {
    assert.equal((await postWebhook(baseUrl, webhook(), evolutionAuthorization('wrong-secret-that-is-long-enough-123456'))).status, 401);
    assert.equal((await postWebhook(baseUrl, webhook({ instance: 'unexpected-instance' }))).status, 403);
    assert.equal(calls, 0);
  } finally {
    await close(server);
  }
});

test('ignored provider events return 204 while malformed events are non-retryable', async () => {
  let calls = 0;
  const server = createMessagingGatewayServer({
    evolutionInstance: instance,
    evolutionWebhookJwtKey: evolutionSecret,
    organizationId,
    connectionId,
    now: () => nowMs,
    forwardToCore: async () => {
      calls += 1;
      return { kind: 'accepted', status: 202 };
    },
  });
  const baseUrl = await listen(server);
  try {
    const echo = webhook();
    const data = echo.data as { key: { fromMe: boolean } };
    data.key.fromMe = true;
    assert.equal((await postWebhook(baseUrl, echo)).status, 204);

    const malformed = webhook();
    const malformedData = malformed.data as { key: { id: string } };
    malformedData.key.id = '';
    assert.equal((await postWebhook(baseUrl, malformed)).status, 400);
    assert.equal(calls, 0);
  } finally {
    await close(server);
  }
});

test('Core processing and outage remain retryable while canonical rejection is terminal', async () => {
  let outcome: CoreForwardOutcome | 'unavailable' = { kind: 'processing', status: 409 };
  const server = createMessagingGatewayServer({
    evolutionInstance: instance,
    evolutionWebhookJwtKey: evolutionSecret,
    organizationId,
    connectionId,
    now: () => nowMs,
    forwardToCore: async () => {
      if (outcome === 'unavailable') throw new CoreUnavailableError();
      return outcome;
    },
  });
  const baseUrl = await listen(server);
  try {
    assert.equal((await postWebhook(baseUrl, webhook())).status, 409);
    outcome = { kind: 'permanent-rejection', status: 422 };
    assert.equal((await postWebhook(baseUrl, webhook())).status, 422);
    outcome = 'unavailable';
    assert.equal((await postWebhook(baseUrl, webhook())).status, 503);
  } finally {
    await close(server);
  }
});
