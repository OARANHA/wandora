import { createPublicKey, verify as verifySignature } from 'node:crypto';

export class PlatformAuthError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PlatformAuthError';
    this.code = code;
  }
}

const tokenPart = /^[A-Za-z0-9_-]+$/;
const record = (value) => typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined;

function decodeJson(part) {
  if (!tokenPart.test(part)) return undefined;
  try { return record(JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))); } catch { return undefined; }
}

const audienceMatches = (value, expected) => value === expected || (Array.isArray(value) && value.includes(expected));

export class PlatformOperatorVerifier {
  constructor(options) {
    this.options = options;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
    this.cached = undefined;
  }

  async keys(force = false) {
    const now = this.now();
    if (this.cached && !force && this.cached.expiresAt > now) return this.cached.keys;
    if (this.cached && force && now - this.cached.refreshedAt < 30_000) return this.cached.keys;

    let response;
    try {
      response = await this.fetchImpl(this.options.jwksUrl, {
        headers: { accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(3000),
      });
    } catch {
      throw new PlatformAuthError('jwks-unavailable', 'Platform Auth JWKS could not be reached.');
    }
    if (!response.ok) throw new PlatformAuthError('jwks-unavailable', 'Platform Auth JWKS failed.');
    let payload;
    try { payload = await response.json(); } catch { throw new PlatformAuthError('jwks-unavailable', 'Platform Auth JWKS is invalid.'); }
    if (!Array.isArray(record(payload)?.keys) || payload.keys.length > 32) {
      throw new PlatformAuthError('jwks-unavailable', 'Platform Auth JWKS keys are invalid.');
    }
    const keys = new Map();
    for (const value of payload.keys) {
      const jwk = record(value);
      if (!jwk || jwk.kty !== 'EC' || jwk.crv !== 'P-256' || (jwk.alg && jwk.alg !== 'ES256')) continue;
      if (typeof jwk.kid !== 'string' || !jwk.kid || keys.has(jwk.kid)) continue;
      try { keys.set(jwk.kid, createPublicKey({ key: jwk, format: 'jwk' })); } catch { /* ignore invalid key */ }
    }
    if (!keys.size) throw new PlatformAuthError('jwks-unavailable', 'Platform Auth JWKS has no ES256 key.');
    this.cached = { keys, refreshedAt: now, expiresAt: now + 300_000 };
    return keys;
  }

  async verify(authorization) {
    const match = /^Bearer\s+([^\s]+)$/.exec(authorization ?? '');
    if (!match?.[1]) throw new PlatformAuthError('unauthorized', 'Bearer token is required.');
    const parts = match[1].split('.');
    if (parts.length !== 3 || parts.some((part) => !part || !tokenPart.test(part))) throw new PlatformAuthError('unauthorized', 'JWT is invalid.');
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = decodeJson(encodedHeader);
    const payload = decodeJson(encodedPayload);
    if (!header || !payload || header.alg !== 'ES256' || typeof header.kid !== 'string' || 'crit' in header) {
      throw new PlatformAuthError('unauthorized', 'JWT header is invalid.');
    }
    if (payload.iss !== this.options.issuer || !audienceMatches(payload.aud, this.options.audience)
      || typeof payload.sub !== 'string' || payload.sub.length < 1 || payload.sub.length > 255
      || !Number.isInteger(payload.exp) || !Number.isInteger(payload.iat)) {
      throw new PlatformAuthError('unauthorized', 'JWT claims are invalid.');
    }
    const now = Math.floor(this.now() / 1000);
    if (payload.exp < now - 30 || payload.iat > now + 30 || (payload.nbf !== undefined && (!Number.isInteger(payload.nbf) || payload.nbf > now + 30))) {
      throw new PlatformAuthError('unauthorized', 'JWT is outside its valid time window.');
    }
    let keys = await this.keys();
    let key = keys.get(header.kid);
    if (!key) { keys = await this.keys(true); key = keys.get(header.kid); }
    if (!key) throw new PlatformAuthError('unauthorized', 'JWT signing key is unknown.');
    const signature = Buffer.from(encodedSignature, 'base64url');
    if (signature.length !== 64 || !verifySignature('sha256', Buffer.from(`${encodedHeader}.${encodedPayload}`), { key, dsaEncoding: 'ieee-p1363' }, signature)) {
      throw new PlatformAuthError('unauthorized', 'JWT signature is invalid.');
    }
    if (!this.options.subjects.has(payload.sub)) throw new PlatformAuthError('forbidden', 'Identity is not a Platform Operator.');
    return { subject: payload.sub };
  }
}
