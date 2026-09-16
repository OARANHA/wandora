import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import { PlatformOperatorVerifier } from '../src/auth.mjs';

const { publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const jwk = publicKey.export({ format: 'jwk' });
const duplicate = { ...jwk, kid: 'duplicate-kid', alg: 'ES256', use: 'sig' };

test('duplicate JWKS key IDs fail closed', async () => {
  const verifier = new PlatformOperatorVerifier({
    jwksUrl: 'https://supabase.wandora.test/auth/v1/.well-known/jwks.json',
    issuer: 'https://supabase.wandora.test/auth/v1',
    audience: 'authenticated',
    subjects: new Set(['platform-operator']),
    fetchImpl: async () => new Response(JSON.stringify({ keys: [duplicate, duplicate] }), { status: 200 }),
    now: () => 1_800_000_000_000,
  });

  await assert.rejects(() => verifier.keys(), (error) => error.code === 'jwks-unavailable');
});
