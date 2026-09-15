import { createHmac, timingSafeEqual } from 'node:crypto';

const JWT_RE = /^Bearer\s+([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/;
const MAX_TOKEN_LIFETIME_SECONDS = 660;
const CLOCK_SKEW_SECONDS = 30;

export type EvolutionWebhookClaims = {
  iat: number;
  exp: number;
  app: 'evolution';
  action: 'webhook';
};

function decodeJsonPart(part: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}

export function verifyEvolutionWebhookJwt(
  authorization: string | undefined,
  secret: string,
  nowMs = Date.now(),
): EvolutionWebhookClaims | undefined {
  if (!authorization) return undefined;
  const match = JWT_RE.exec(authorization);
  if (!match) return undefined;

  const [, encodedHeader, encodedPayload, encodedSignature] = match;
  if (!encodedHeader || !encodedPayload || !encodedSignature) return undefined;

  const header = decodeJsonPart(encodedHeader);
  const payload = decodeJsonPart(encodedPayload);
  if (!header || !payload || header.alg !== 'HS256') return undefined;
  if ('typ' in header && header.typ !== 'JWT') return undefined;

  const supplied = Buffer.from(encodedSignature, 'base64url');
  const expected = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return undefined;

  const iat = payload.iat;
  const exp = payload.exp;
  if (!Number.isInteger(iat) || !Number.isInteger(exp)) return undefined;
  if (typeof iat !== 'number' || typeof exp !== 'number') return undefined;
  if (payload.app !== 'evolution' || payload.action !== 'webhook') return undefined;
  if (exp <= iat || exp - iat > MAX_TOKEN_LIFETIME_SECONDS) return undefined;

  const nowSeconds = Math.floor(nowMs / 1000);
  if (iat > nowSeconds + CLOCK_SKEW_SECONDS) return undefined;
  if (exp < nowSeconds - CLOCK_SKEW_SECONDS) return undefined;

  return { iat, exp, app: 'evolution', action: 'webhook' };
}
