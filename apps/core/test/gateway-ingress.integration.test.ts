import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after } from 'node:test';
import { Pool } from 'pg';
import { PostgresAnaRepository } from '../src/ana/postgres-repository.js';
import { AnaSupervisedIngressService } from '../src/ana/supervised-ingress.js';
import { loadRuntimeConfig } from '../src/runtime/config.js';
import {
  createGatewayIngressHandler,
  signGatewayIngress,
} from '../src/runtime/gateway-ingress.js';
import { createRuntimeServer } from '../src/runtime/server.js';

const ORG_A = '00000000-0000-0000-0000-0000000000a1';
const ORG_B = '00000000-0000-0000-0000-0000000000b1';
const CONN_A = '20000000-0000-0000-0000-0000000000a1';
const EMP_A = '30000000-0000-0000-0000-0000000000a1';
const NOW = '2026-09-15T00:00:00.000Z';
const NOW_MS = Date.parse(NOW);
const SECRET = 'gateway-test-secret-0123456789abcdef0123456789abcdef';

const runtimePool = new Pool({ connectionString: process.env.DATABASE_URL });
const fixturePool = new Pool({ connectionString: process.env.FIXTURE_DATABASE_URL });
const repository = new PostgresAnaRepository(runtimePool);
const supervised = new AnaSupervisedIngressService({ repository, pool: runtimePool, now: () => NOW });

after(async () => {
  await Promise.all([runtimePool.end(), fixturePool.end()]);
});

async function resetFixture(): Promise<void> {
  await fixturePool.query(`TRUNCATE
    wandora_private.outbound_attempts,
    wandora_private.inbound_event_receipts,
    wandora.audit_records, wandora.approvals, wandora.messages,
    wandora.work_items, wandora.conversations, wandora.contacts,
    wandora.digital_employees, wandora.messaging_connections,
    wandora.memberships, wandora.user_identities, wandora.users,
    wandora.organizations RESTART IDENTITY CASCADE`);

  await fixturePool.query(
    `INSERT INTO wandora.organizations (id, slug, display_name) VALUES
      ($1, 'org-a', 'Org A'), ($2, 'org-b', 'Org B')`,
    [ORG_A, ORG_B],
  );
  await fixturePool.query(
    `INSERT INTO wandora.messaging_connections (id, organization_id, channel, label)
     VALUES ($1, $2, 'whatsapp', 'WhatsApp A')`,
    [CONN_A, ORG_A],
  );
  await fixturePool.query(
    `INSERT INTO wandora.digital_employees (id, organization_id, display_name, role)
     VALUES ($1, $2, 'Ana', 'commercial-assistant')`,
    [EMP_A, ORG_A],
  );
}

function inboundBody(organizationId = ORG_A): string {
  return JSON.stringify({
    organizationId,
    event: {
      eventId: 'evt_0123456789abcdef0123456789abcdef',
      connectionId: CONN_A,
      sender: '+5551999999999',
      text: 'Olá, gostaria de saber mais.',
      occurredAt: NOW,
    },
  });
}

async function withIngressServer(fn: (baseUrl: string) => Promise<void>): Promise<void> {
  const handler = createGatewayIngressHandler({
    secret: SECRET,
    now: () => NOW_MS,
    processInbound: (organizationId, event) => supervised.handle(organizationId, event),
  });
  const server = createRuntimeServer({
    mode: 'database',
    checkReady: async () => ({ ready: true }),
    handleGatewayInbound: handler,
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('test server did not bind TCP');
  try {
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function postSigned(baseUrl: string, rawBody: string, options?: {
  timestamp?: string;
  signature?: string;
}): Promise<Response> {
  const timestamp = options?.timestamp ?? String(Math.floor(NOW_MS / 1000));
  const signature = options?.signature ?? signGatewayIngress(SECRET, timestamp, rawBody);
  return fetch(`${baseUrl}/internal/v1/gateway/inbound`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-wandora-timestamp': timestamp,
      'x-wandora-signature': signature,
    },
    body: rawBody,
  });
}

async function scalar(sql: string, params: unknown[] = []): Promise<string> {
  const result = await fixturePool.query<{ value: string }>(sql, params);
  return result.rows[0]!.value;
}

test('GATEWAY TO CORE SUPERVISED INGRESS V1', async (t) => {
  await t.test('runtime config keeps ingress opt-in and reads its secret from file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wandora-gateway-ingress-'));
    const dbSecret = join(dir, 'db');
    const gatewaySecret = join(dir, 'gateway');
    try {
      await writeFile(dbSecret, 'db-test-password\n', { mode: 0o600 });
      await writeFile(gatewaySecret, `${SECRET}\n`, { mode: 0o600 });
      const config = await loadRuntimeConfig({
        WANDORA_CORE_MODE: 'database',
        WANDORA_CORE_DB_PASSWORD_FILE: dbSecret,
        WANDORA_GATEWAY_INGRESS_ENABLED: 'true',
        WANDORA_GATEWAY_INGRESS_SECRET_FILE: gatewaySecret,
      });
      assert.equal(config.gatewayIngress?.secret, SECRET);
      await assert.rejects(
        loadRuntimeConfig({ WANDORA_CORE_MODE: 'standby', WANDORA_GATEWAY_INGRESS_ENABLED: 'true' }),
        /cannot be enabled while Wandora Core is in standby/,
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  await t.test('signed normalized inbound is persisted once and held for supervision', async () => {
    await resetFixture();
    await withIngressServer(async (baseUrl) => {
      const rawBody = inboundBody();
      const first = await postSigned(baseUrl, rawBody);
      assert.equal(first.status, 202);
      const firstBody = await first.json() as any;
      assert.equal(firstBody.accepted, true);
      assert.equal(firstBody.duplicate, false);
      assert.equal(firstBody.result.status, 'supervision-required');

      const replay = await postSigned(baseUrl, rawBody);
      assert.equal(replay.status, 200);
      const replayBody = await replay.json() as any;
      assert.equal(replayBody.duplicate, true);
      assert.deepEqual(replayBody.result, firstBody.result);
    });

    assert.equal(await scalar(`SELECT count(*)::text AS value FROM wandora.contacts`), '1');
    assert.equal(await scalar(`SELECT count(*)::text AS value FROM wandora.conversations`), '1');
    assert.equal(await scalar(`SELECT count(*)::text AS value FROM wandora.messages`), '1');
    assert.equal(await scalar(`SELECT count(*)::text AS value FROM wandora.approvals`), '0');
    assert.equal(await scalar(`SELECT count(*)::text AS value FROM wandora_private.outbound_attempts`), '0');
    assert.equal(await scalar(`SELECT count(*)::text AS value FROM wandora.audit_records`), '1');
    assert.equal(await scalar(`SELECT status::text AS value FROM wandora.work_items LIMIT 1`), 'attention-required');
    assert.equal(await scalar(`SELECT status::text AS value FROM wandora_private.inbound_event_receipts LIMIT 1`), 'completed');
  });

  await t.test('invalid or stale signatures fail before any durable state', async () => {
    await resetFixture();
    await withIngressServer(async (baseUrl) => {
      const rawBody = inboundBody();
      const invalid = await postSigned(baseUrl, rawBody, { signature: `sha256=${'0'.repeat(64)}` });
      assert.equal(invalid.status, 401);
      const staleTimestamp = String(Math.floor(NOW_MS / 1000) - 301);
      const stale = await postSigned(baseUrl, rawBody, { timestamp: staleTimestamp });
      assert.equal(stale.status, 401);
    });
    assert.equal(await scalar(`SELECT count(*)::text AS value FROM wandora.contacts`), '0');
    assert.equal(await scalar(`SELECT count(*)::text AS value FROM wandora_private.inbound_event_receipts`), '0');
  });

  await t.test('foreign organization cannot claim a canonical connection', async () => {
    await resetFixture();
    await withIngressServer(async (baseUrl) => {
      const response = await postSigned(baseUrl, inboundBody(ORG_B));
      assert.equal(response.status, 422);
      const body = await response.json() as any;
      assert.equal(body.accepted, false);
      assert.equal(body.error, 'connection_unavailable');
    });
    assert.equal(await scalar(`SELECT count(*)::text AS value FROM wandora.contacts`), '0');
    assert.equal(await scalar(`SELECT count(*)::text AS value FROM wandora_private.inbound_event_receipts`), '0');
  });
});
