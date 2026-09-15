import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { verifyEvolutionWebhookJwt } from '../src/evolution-jwt.js';

function token(secret: string, claims: Record<string, unknown>, header: Record<string, unknown> = { alg: 'HS256', typ: 'JWT' }): string {
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  return `Bearer ${encodedHeader}.${encodedPayload}.${signature}`;
}

const secret = 'evolution-test-secret-that-is-long-enough-123456';
const nowSeconds = 1_789_430_400;
const nowMs = nowSeconds * 1000;

function claims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    iat: nowSeconds,
    exp: nowSeconds + 600,
    app: 'evolution',
    action: 'webhook',
    ...overrides,
  };
}

test('accepts the Evolution 2.3.7 webhook JWT shape', () => {
  assert.deepEqual(
    verifyEvolutionWebhookJwt(token(secret, claims()), secret, nowMs),
    { iat: nowSeconds, exp: nowSeconds + 600, app: 'evolution', action: 'webhook' },
  );
});

test('rejects forged, expired, future and overlong tokens', () => {
  assert.equal(verifyEvolutionWebhookJwt(token('wrong-secret', claims()), secret, nowMs), undefined);
  assert.equal(verifyEvolutionWebhookJwt(token(secret, claims({ exp: nowSeconds - 31 })), secret, nowMs), undefined);
  assert.equal(verifyEvolutionWebhookJwt(token(secret, claims({ iat: nowSeconds + 31, exp: nowSeconds + 631 })), secret, nowMs), undefined);
  assert.equal(verifyEvolutionWebhookJwt(token(secret, claims({ exp: nowSeconds + 661 })), secret, nowMs), undefined);
});

test('rejects wrong issuer semantics or JWT algorithm', () => {
  assert.equal(verifyEvolutionWebhookJwt(token(secret, claims({ app: 'other' })), secret, nowMs), undefined);
  assert.equal(verifyEvolutionWebhookJwt(token(secret, claims({ action: 'other' })), secret, nowMs), undefined);
  assert.equal(verifyEvolutionWebhookJwt(token(secret, claims(), { alg: 'HS512', typ: 'JWT' }), secret, nowMs), undefined);
  assert.equal(verifyEvolutionWebhookJwt('Basic abc', secret, nowMs), undefined);
});
