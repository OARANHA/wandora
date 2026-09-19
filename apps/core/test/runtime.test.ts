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
    await assert.rejects(
      loadRuntimeConfig({ WANDORA_CORE_MODE: 'standby', WANDORA_AGENT_RUNTIME_MODE: 'mastra-deterministic' }),
      /cannot be enabled while Wandora Core is in standby/,
    );
  });

  await t.test('database mode accepts only the canonical runtime role and keeps Agent Runtime disabled by default', async () => {
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
      assert.equal(config.agentRuntime, undefined);

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

  await t.test('deterministic Mastra mode requires the supervised Gateway boundary and no model secret', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wandora-core-mastra-'));
    const dbSecret = join(dir, 'db-password');
    const gatewaySecret = join(dir, 'gateway-secret');
    try {
      await writeFile(dbSecret, 'synthetic-test-password\n', { mode: 0o600 });
      await writeFile(gatewaySecret, 'gateway-test-secret-0123456789abcdef0123456789abcdef\n', { mode: 0o600 });

      await assert.rejects(
        loadRuntimeConfig({
          WANDORA_CORE_MODE: 'database',
          WANDORA_CORE_DB_PASSWORD_FILE: dbSecret,
          WANDORA_AGENT_RUNTIME_MODE: 'mastra-deterministic',
        }),
        /requires supervised Gateway ingress/,
      );

      const config = await loadRuntimeConfig({
        WANDORA_CORE_MODE: 'database',
        WANDORA_CORE_DB_PASSWORD_FILE: dbSecret,
        WANDORA_GATEWAY_INGRESS_ENABLED: 'true',
        WANDORA_GATEWAY_INGRESS_SECRET_FILE: gatewaySecret,
        WANDORA_AGENT_RUNTIME_MODE: 'mastra-deterministic',
      });
      assert.deepEqual(config.agentRuntime, { mode: 'mastra-deterministic' });
      assert.equal(config.gatewayIngress?.secret.length, 52);
      assert.equal(Object.keys(config).includes('model'), false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  await t.test('Paperclip execution bridge is disabled by default and requires Mastra plus a distinct file-backed HMAC', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wandora-core-paperclip-bridge-'));
    const dbSecret = join(dir, 'db-password');
    const gatewaySecret = join(dir, 'gateway-secret');
    const bridgeSecret = join(dir, 'paperclip-bridge-secret');
    try {
      await writeFile(dbSecret, 'synthetic-test-password\n', { mode: 0o600 });
      await writeFile(gatewaySecret, 'gateway-test-secret-0123456789abcdef0123456789abcdef\n', { mode: 0o600 });
      await writeFile(bridgeSecret, 'paperclip-bridge-secret-0123456789abcdef0123456789abcdef\n', { mode: 0o600 });

      await assert.rejects(
        loadRuntimeConfig({
          WANDORA_CORE_MODE: 'database',
          WANDORA_CORE_DB_PASSWORD_FILE: dbSecret,
          WANDORA_PAPERCLIP_EXECUTION_BRIDGE_ENABLED: 'true',
          WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE: bridgeSecret,
        }),
        /requires an Agent Runtime/,
      );

      const config = await loadRuntimeConfig({
        WANDORA_CORE_MODE: 'database',
        WANDORA_CORE_DB_PASSWORD_FILE: dbSecret,
        WANDORA_GATEWAY_INGRESS_ENABLED: 'true',
        WANDORA_GATEWAY_INGRESS_SECRET_FILE: gatewaySecret,
        WANDORA_AGENT_RUNTIME_MODE: 'mastra-deterministic',
        WANDORA_PAPERCLIP_EXECUTION_BRIDGE_ENABLED: 'true',
        WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE: bridgeSecret,
      });
      assert.equal(config.paperclipExecutionBridge?.agentMeUrl, 'http://wandora-paperclip:3100/api/agents/me');
      assert.equal(config.paperclipExecutionBridge?.secret.startsWith('paperclip-bridge-secret-'), true);

      await assert.rejects(
        loadRuntimeConfig({
          WANDORA_CORE_MODE: 'database',
          WANDORA_CORE_DB_PASSWORD_FILE: dbSecret,
          WANDORA_GATEWAY_INGRESS_ENABLED: 'true',
          WANDORA_GATEWAY_INGRESS_SECRET_FILE: gatewaySecret,
          WANDORA_AGENT_RUNTIME_MODE: 'mastra-deterministic',
          WANDORA_PAPERCLIP_EXECUTION_BRIDGE_ENABLED: 'true',
          WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE: gatewaySecret,
        }),
        /must be distinct from messaging HMAC secrets/,
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

      const closedPaperclipBridge = await fetch(`${baseUrl}/internal/v1/paperclip/execution`, {
        method: 'POST',
        body: '{}',
      });
      assert.equal(closedPaperclipBridge.status, 404);
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
