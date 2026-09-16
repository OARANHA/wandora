import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadConfig } from '../src/config.mjs';
import { PlatformOperatorVerifier } from '../src/auth.mjs';
import { createPlatformAdminServer } from '../src/server.mjs';

const issuer = 'https://supabase.wandora.test/auth/v1';
const audience = 'authenticated';
const nowSeconds = 1_800_000_000;
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const jwk = publicKey.export({ format: 'jwk' });
const publicJwk = { ...jwk, kid: 'platform-test-key', alg: 'ES256', use: 'sig' };

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = (subject) => {
  const header = encode({ alg: 'ES256', typ: 'JWT', kid: 'platform-test-key' });
  const payload = encode({ sub: subject, iss: issuer, aud: audience, iat: nowSeconds - 5, exp: nowSeconds + 300 });
  const signature = sign('sha256', Buffer.from(`${header}.${payload}`), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  return `${header}.${payload}.${signature.toString('base64url')}`;
};
const fetchImpl = async () => new Response(JSON.stringify({ keys: [publicJwk] }), { status: 200 });

async function listen(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

async function close(server) { await new Promise((resolve) => server.close(resolve)); }

test('config is standby by default and rejects database credentials', async () => {
  assert.deepEqual(await loadConfig({ PORT: '8790' }), { port: 8790, auth: undefined });
  await assert.rejects(() => loadConfig({ WANDORA_PLATFORM_ADMIN_DB_PASSWORD: 'forbidden' }), /forbidden/);
  await assert.rejects(() => loadConfig({ WANDORA_PLATFORM_ADMIN_DB_PASSWORD_FILE: '/secret' }), /forbidden/);
  await assert.rejects(() => loadConfig({ WANDORA_PLATFORM_ADMIN_DATABASE_URL: 'postgres://x' }), /forbidden/);
});

test('auth config requires a file-backed unique operator allow-list', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wandora-platform-admin-'));
  const file = join(dir, 'operators');
  await writeFile(file, 'operator-a\noperator-b\n');
  const config = await loadConfig({
    WANDORA_PLATFORM_ADMIN_AUTH_ENABLED: 'true',
    WANDORA_AUTH_JWKS_URL: 'https://supabase.wandora.test/auth/v1/.well-known/jwks.json',
    WANDORA_AUTH_ISSUER: issuer,
    WANDORA_AUTH_AUDIENCE: audience,
    WANDORA_PLATFORM_OPERATOR_SUBJECTS_FILE: file,
  });
  assert.deepEqual([...config.auth.subjects], ['operator-a', 'operator-b']);
});

test('valid ES256 identity still needs explicit platform-operator allow-list', async () => {
  const verifier = new PlatformOperatorVerifier({
    jwksUrl: 'https://supabase.wandora.test/auth/v1/.well-known/jwks.json', issuer, audience,
    subjects: new Set(['platform-operator']), fetchImpl, now: () => nowSeconds * 1000,
  });
  assert.deepEqual(await verifier.verify(`Bearer ${token('platform-operator')}`), { subject: 'platform-operator' });
  await assert.rejects(() => verifier.verify(`Bearer ${token('ordinary-tenant-owner')}`), (error) => error.code === 'forbidden');
});

test('standby runtime exposes health only and keeps session route structurally closed', async () => {
  const server = createPlatformAdminServer({ port: 8790, auth: undefined });
  const base = await listen(server);
  try {
    assert.equal((await fetch(`${base}/healthz`)).status, 200);
    assert.equal((await fetch(`${base}/readyz`)).status, 503);
    assert.equal((await fetch(`${base}/internal/v1/platform/session`)).status, 404);
    assert.equal((await fetch(`${base}/anything`)).status, 404);
  } finally { await close(server); }
});

test('enabled private session maps operator auth without any mutation route', async () => {
  const auth = {
    jwksUrl: 'https://supabase.wandora.test/auth/v1/.well-known/jwks.json', issuer, audience,
    subjects: new Set(['platform-operator']), fetchImpl, now: () => nowSeconds * 1000,
  };
  const server = createPlatformAdminServer({ port: 8790, auth });
  const base = await listen(server);
  try {
    assert.equal((await fetch(`${base}/readyz`)).status, 200);
    assert.equal((await fetch(`${base}/internal/v1/platform/session`)).status, 401);
    assert.equal((await fetch(`${base}/internal/v1/platform/session`, { headers: { authorization: `Bearer ${token('ordinary-tenant-owner')}` } })).status, 403);
    const response = await fetch(`${base}/internal/v1/platform/session`, { headers: { authorization: `Bearer ${token('platform-operator')}` } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { platformOperator: true });
    assert.equal((await fetch(`${base}/internal/v1/platform/session`, { method: 'POST', headers: { authorization: `Bearer ${token('platform-operator')}` } })).status, 405);
    assert.equal((await fetch(`${base}/internal/v1/platform/provision`, { method: 'POST' })).status, 404);
  } finally { await close(server); }
});
