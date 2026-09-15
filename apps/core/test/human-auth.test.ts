import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import test from 'node:test';
import { Es256JwksHumanTokenVerifier, HumanAuthError } from '../src/human-auth/es256-jwks.js';

const ISSUER = 'https://supabase.wandora.com.br/auth/v1';
const AUDIENCE = 'authenticated';
const NOW_MS = Date.parse('2026-09-15T06:30:00.000Z');

function createFixture(kid = 'fixture-key') {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = publicKey.export({ format: 'jwk' });
  return {
    jwk: { ...jwk, kid, alg: 'ES256', use: 'sig' },
    signToken(payloadOverrides: Record<string, unknown> = {}, headerOverrides: Record<string, unknown> = {}) {
      const header = Buffer.from(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid, ...headerOverrides })).toString('base64url');
      const now = Math.floor(NOW_MS / 1000);
      const payload = Buffer.from(JSON.stringify({
        sub: 'supabase-user-subject-1',
        iss: ISSUER,
        aud: AUDIENCE,
        iat: now - 30,
        exp: now + 300,
        ...payloadOverrides,
      })).toString('base64url');
      const input = `${header}.${payload}`;
      const signature = sign('sha256', Buffer.from(input), {
        key: privateKey,
        dsaEncoding: 'ieee-p1363',
      }).toString('base64url');
      return `${input}.${signature}`;
    },
  };
}

function createVerifier(jwk: JsonWebKey & { kid: string }, calls: { count: number }) {
  return new Es256JwksHumanTokenVerifier({
    jwksUrl: 'https://jwks.test/.well-known/jwks.json',
    issuer: ISSUER,
    audience: AUDIENCE,
    now: () => NOW_MS,
    fetchImpl: async () => {
      calls.count += 1;
      return new Response(JSON.stringify({ keys: [jwk] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });
}

test('valid ES256 access token resolves only its subject and caches JWKS', async () => {
  const fixture = createFixture();
  const calls = { count: 0 };
  const verifier = createVerifier(fixture.jwk as JsonWebKey & { kid: string }, calls);
  const token = fixture.signToken();

  assert.deepEqual(await verifier.verifyAuthorization(`Bearer ${token}`), {
    subject: 'supabase-user-subject-1',
  });
  assert.deepEqual(await verifier.verifyAuthorization(`Bearer ${token}`), {
    subject: 'supabase-user-subject-1',
  });
  assert.equal(calls.count, 1);
});

test('rejects invalid issuer, audience, expiration and future iat', async () => {
  const fixture = createFixture();
  const now = Math.floor(NOW_MS / 1000);
  const verifier = createVerifier(fixture.jwk as JsonWebKey & { kid: string }, { count: 0 });

  for (const token of [
    fixture.signToken({ iss: 'https://evil.invalid' }),
    fixture.signToken({ aud: 'service_role' }),
    fixture.signToken({ exp: now - 60 }),
    fixture.signToken({ iat: now + 60 }),
  ]) {
    await assert.rejects(
      verifier.verifyAuthorization(`Bearer ${token}`),
      (error: unknown) => error instanceof HumanAuthError && error.code === 'invalid-token',
    );
  }
});

test('rejects missing bearer token, unknown signing key and non-ES256 alg', async () => {
  const fixture = createFixture();
  const verifier = createVerifier(fixture.jwk as JsonWebKey & { kid: string }, { count: 0 });

  await assert.rejects(
    verifier.verifyAuthorization(undefined),
    (error: unknown) => error instanceof HumanAuthError && error.code === 'missing-token',
  );
  await assert.rejects(
    verifier.verifyAuthorization(`Bearer ${fixture.signToken({}, { kid: 'unknown-key' })}`),
    (error: unknown) => error instanceof HumanAuthError && error.code === 'invalid-token',
  );
  await assert.rejects(
    verifier.verifyAuthorization(`Bearer ${fixture.signToken({}, { alg: 'HS256' })}`),
    (error: unknown) => error instanceof HumanAuthError && error.code === 'invalid-token',
  );
});

test('JWKS transport failure fails closed as authentication unavailable', async () => {
  const fixture = createFixture();
  const verifier = new Es256JwksHumanTokenVerifier({
    jwksUrl: 'https://jwks.test/.well-known/jwks.json',
    issuer: ISSUER,
    audience: AUDIENCE,
    now: () => NOW_MS,
    fetchImpl: async () => { throw new Error('offline'); },
  });

  await assert.rejects(
    verifier.verifyAuthorization(`Bearer ${fixture.signToken()}`),
    (error: unknown) => error instanceof HumanAuthError && error.code === 'jwks-unavailable',
  );
});
