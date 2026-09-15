import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadRuntimeConfig } from '../src/runtime/config.js';
import { createRuntimeServer } from '../src/runtime/server.js';

const ORG = '00000000-0000-0000-0000-0000000000a1';

async function withServer(fn: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = createRuntimeServer({
    mode: 'database',
    checkReady: async () => ({ ready: true }),
    handleHumanSupervision: async (request) => ({
      status: request.authorization === 'Bearer fixture' ? 200 : 401,
      body: request.authorization === 'Bearer fixture'
        ? { items: [{ path: request.pathname }] }
        : { error: 'unauthorized' },
    }),
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('server did not bind');
  try {
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test('Human API is opt-in, database-only and requires explicit Auth trust config', async () => {
  await assert.rejects(
    loadRuntimeConfig({
      WANDORA_CORE_MODE: 'standby',
      WANDORA_HUMAN_API_ENABLED: 'true',
    }),
    /cannot be enabled while Wandora Core is in standby/,
  );

  const dir = await mkdtemp(join(tmpdir(), 'wandora-human-api-'));
  const dbSecret = join(dir, 'db-password');
  try {
    await writeFile(dbSecret, 'synthetic-test-password\n', { mode: 0o600 });
    await assert.rejects(
      loadRuntimeConfig({
        WANDORA_CORE_MODE: 'database',
        WANDORA_CORE_DB_PASSWORD_FILE: dbSecret,
        WANDORA_HUMAN_API_ENABLED: 'true',
      }),
      /WANDORA_AUTH_JWKS_URL is required/,
    );

    const config = await loadRuntimeConfig({
      WANDORA_CORE_MODE: 'database',
      WANDORA_CORE_DB_PASSWORD_FILE: dbSecret,
      WANDORA_HUMAN_API_ENABLED: 'true',
      WANDORA_AUTH_JWKS_URL: 'https://supabase.wandora.com.br/auth/v1/.well-known/jwks.json',
      WANDORA_AUTH_ISSUER: 'https://supabase.wandora.com.br/auth/v1',
      WANDORA_AUTH_AUDIENCE: 'authenticated',
    });
    assert.deepEqual(config.humanApi, {
      jwksUrl: 'https://supabase.wandora.com.br/auth/v1/.well-known/jwks.json',
      issuer: 'https://supabase.wandora.com.br/auth/v1',
      audience: 'authenticated',
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Runtime forwards only organization human API namespace to human handler', async () => {
  await withServer(async (baseUrl) => {
    const allowed = await fetch(
      `${baseUrl}/api/v1/organizations/${ORG}/work/attention-required`,
      { headers: { authorization: 'Bearer fixture' } },
    );
    assert.equal(allowed.status, 200);
    const body = await allowed.json() as { items: Array<{ path: string }> };
    assert.equal(body.items[0]?.path, `/api/v1/organizations/${ORG}/work/attention-required`);

    const missingToken = await fetch(`${baseUrl}/api/v1/organizations/${ORG}/work/attention-required`);
    assert.equal(missingToken.status, 401);

    assert.equal((await fetch(`${baseUrl}/api/v1/session`)).status, 404);
    assert.equal((await fetch(`${baseUrl}/internal/v1/gateway/inbound`)).status, 405);
  });
});
