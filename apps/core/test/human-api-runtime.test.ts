import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadRuntimeConfig } from '../src/runtime/config.js';
import { createRuntimeServer } from '../src/runtime/server.js';

const ORG = '00000000-0000-0000-0000-0000000000a1';
const ENTRY = '00000000-0000-0000-0000-0000000000b1';

async function withServer(fn: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = createRuntimeServer({
    mode: 'database',
    checkReady: async () => ({ ready: true }),
    handleHumanSupervision: async (request) => ({
      status: request.authorization === 'Bearer fixture' ? 200 : 401,
      body: request.authorization === 'Bearer fixture'
        ? request.pathname === '/api/v1/me'
          ? { user: { id: 'user-1', name: 'Gestor' }, organizations: [] }
          : { items: [{
              path: request.pathname,
              method: request.method,
              idempotencyKey: request.idempotencyKey ?? '',
              rawBody: request.rawBody ?? '',
            }] }
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

test('Runtime forwards only reviewed Human API namespaces to human handler', async () => {
  await withServer(async (baseUrl) => {
    const session = await fetch(`${baseUrl}/api/v1/me`, {
      headers: { authorization: 'Bearer fixture' },
    });
    assert.equal(session.status, 200);
    const sessionBody = await session.json() as { user: { name: string }; organizations: unknown[] };
    assert.equal(sessionBody.user.name, 'Gestor');
    assert.deepEqual(sessionBody.organizations, []);
    assert.equal((await fetch(`${baseUrl}/api/v1/me`)).status, 401);

    const allowed = await fetch(
      `${baseUrl}/api/v1/organizations/${ORG}/work/attention-required`,
      { headers: { authorization: 'Bearer fixture' } },
    );
    assert.equal(allowed.status, 200);
    const body = await allowed.json() as { items: Array<{ path: string }> };
    assert.equal(body.items[0]?.path, `/api/v1/organizations/${ORG}/work/attention-required`);

    const hireBody = JSON.stringify({ catalogKey: 'ana-commercial-v1' });
    const hire = await fetch(
      `${baseUrl}/api/v1/organizations/${ORG}/digital-employees`,
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer fixture',
          'content-type': 'application/json',
          'idempotency-key': 'hire-runtime-boundary',
        },
        body: hireBody,
      },
    );
    assert.equal(hire.status, 200);
    const hireResponse = await hire.json() as {
      items: Array<{ path: string; method: string; idempotencyKey: string; rawBody: string }>;
    };
    assert.deepEqual(hireResponse.items[0], {
      path: `/api/v1/organizations/${ORG}/digital-employees`,
      method: 'POST',
      idempotencyKey: 'hire-runtime-boundary',
      rawBody: hireBody,
    });

    const groundingBody = JSON.stringify({
      entryType: 'fact',
      content: 'Informação confirmada',
      provenanceType: 'owner_statement',
      sourceRef: null,
      sourceLabel: null,
    });
    const grounding = await fetch(
      `${baseUrl}/api/v1/organizations/${ORG}/grounding`,
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer fixture',
          'content-type': 'application/json',
          'idempotency-key': 'grounding-runtime-boundary',
        },
        body: groundingBody,
      },
    );
    assert.equal(grounding.status, 200);
    const groundingResponse = await grounding.json() as {
      items: Array<{ path: string; method: string; idempotencyKey: string; rawBody: string }>;
    };
    assert.deepEqual(groundingResponse.items[0], {
      path: `/api/v1/organizations/${ORG}/grounding`,
      method: 'POST',
      idempotencyKey: 'grounding-runtime-boundary',
      rawBody: groundingBody,
    });

    const correctionBody = JSON.stringify({
      content: 'Informação corrigida',
      sourceRef: 'wandora:customer-work-operation:fixture',
      sourceLabel: 'Correção aprovada',
    });
    const correction = await fetch(
      `${baseUrl}/api/v1/organizations/${ORG}/grounding/${ENTRY}/correct`,
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer fixture',
          'content-type': 'application/json',
          'idempotency-key': 'grounding-correct-runtime-boundary',
        },
        body: correctionBody,
      },
    );
    assert.equal(correction.status, 200);
    const correctionResponse = await correction.json() as {
      items: Array<{ path: string; method: string; idempotencyKey: string; rawBody: string }>;
    };
    assert.deepEqual(correctionResponse.items[0], {
      path: `/api/v1/organizations/${ORG}/grounding/${ENTRY}/correct`,
      method: 'POST',
      idempotencyKey: 'grounding-correct-runtime-boundary',
      rawBody: correctionBody,
    });

    const missingToken = await fetch(`${baseUrl}/api/v1/organizations/${ORG}/work/attention-required`);
    assert.equal(missingToken.status, 401);

    assert.equal((await fetch(`${baseUrl}/api/v1/session`)).status, 404);
    assert.equal((await fetch(`${baseUrl}/internal/v1/gateway/inbound`)).status, 405);
  });
});
