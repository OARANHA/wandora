import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import test from 'node:test';
import { loadRuntimeConfig } from '../src/runtime/config.js';
import { createRuntimeServer } from '../src/runtime/server.js';

async function withServer(
  checkReady: () => Promise<{ ready: true } | { ready: false; reason: 'standby' }>,
  fn: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createRuntimeServer({ mode: 'standby', checkReady });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('runtime test server did not bind TCP');
  try {
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test('WANDORA CORE PRIVATE RUNTIME V1', async (t) => {
  await t.test('standby mode requires no database credential', async () => {
    const config = await loadRuntimeConfig({ WANDORA_CORE_MODE: 'standby', PORT: '8788' });
    assert.deepEqual(config, { mode: 'standby', port: 8788 });
  });

  await t.test('database mode accepts only the canonical runtime role and reads password from file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wandora-core-runtime-'));
    const secret = join(dir, 'db-password');
    try {
      await writeFile(secret, 'synthetic-test-password\n', { mode: 0o600 });
      const config = await loadRuntimeConfig({
        WANDORA_CORE_MODE: 'database',
        WANDORA_CORE_DB_PASSWORD_FILE: secret,
        WANDORA_CORE_DB_HOST: 'wandora-postgres',
      });
      assert.equal(config.mode, 'database');
      assert.equal(config.database?.user, 'wandora_core_runtime');
      assert.equal(config.database?.password, 'synthetic-test-password');
      assert.equal(config.database?.host, 'wandora-postgres');
      assert.equal(config.gatewayIngress, undefined);

      await assert.rejects(
        loadRuntimeConfig({
          WANDORA_CORE_MODE: 'database',
          WANDORA_CORE_DB_USER: 'supabase_admin',
          WANDORA_CORE_DB_PASSWORD_FILE: secret,
        }),
        /must be wandora_core_runtime/,
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  await t.test('health stays healthy while standby readiness stays closed', async () => {
    await withServer(async () => ({ ready: false, reason: 'standby' }), async (baseUrl) => {
      const health = await fetch(`${baseUrl}/healthz`);
      assert.equal(health.status, 200);
      assert.deepEqual(await health.json(), {
        status: 'ok', service: 'wandora-core', mode: 'standby',
      });

      const ready = await fetch(`${baseUrl}/readyz`);
      assert.equal(ready.status, 503);
      assert.deepEqual(await ready.json(), {
        status: 'not-ready', service: 'wandora-core', reason: 'standby',
      });

      const closedIngress = await fetch(`${baseUrl}/internal/v1/gateway/inbound`, {
        method: 'POST',
        body: '{}',
      });
      assert.equal(closedIngress.status, 404);
    });
  });

  await t.test('readiness opens only when its dependency proof succeeds', async () => {
    await withServer(async () => ({ ready: true }), async (baseUrl) => {
      const ready = await fetch(`${baseUrl}/readyz`);
      assert.equal(ready.status, 200);
      assert.deepEqual(await ready.json(), { status: 'ready', service: 'wandora-core' });

      assert.equal((await fetch(`${baseUrl}/missing`)).status, 404);
      assert.equal((await fetch(`${baseUrl}/healthz`, { method: 'POST' })).status, 405);
    });
  });
});
