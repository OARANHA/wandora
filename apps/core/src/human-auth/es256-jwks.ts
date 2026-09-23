import { createPublicKey, verify as verifySignature, type KeyObject } from 'node:crypto';

export type HumanAuthFailureCode = 'missing-token' | 'invalid-token' | 'jwks-unavailable';

export class HumanAuthError extends Error {
  constructor(readonly code: HumanAuthFailureCode, message: string) {
    super(message);
    this.name = 'HumanAuthError';
  }
}

export type VerifiedHumanIdentity = {
  subject: string;
  email?: string;
};

export interface HumanTokenVerifier {
  verifyAuthorization(authorization: string | undefined): Promise<VerifiedHumanIdentity>;
}

type JsonRecord = Record<string, unknown>;
type FetchLike = typeof fetch;

type CachedJwks = {
  expiresAt: number;
  refreshedAt: number;
  keys: Map<string, KeyObject>;
};

export type Es256JwksVerifierOptions = {
  jwksUrl: string;
  issuer: string;
  audience: string;
  fetchImpl?: FetchLike;
  now?: () => number;
  cacheTtlMs?: number;
  minRefreshIntervalMs?: number;
  requestTimeoutMs?: number;
  clockSkewSeconds?: number;
};

const tokenPart = /^[A-Za-z0-9_-]+$/;

function record(value: unknown): JsonRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : undefined;
}

function decodeJson(part: string): JsonRecord | undefined {
  if (!tokenPart.test(part)) return undefined;
  try {
    return record(JSON.parse(Buffer.from(part, 'base64url').toString('utf8')));
  } catch {
    return undefined;
  }
}

function audienceMatches(value: unknown, expected: string): boolean {
  if (value === expected) return true;
  return Array.isArray(value) && value.some((entry) => entry === expected);
}

export class Es256JwksHumanTokenVerifier implements HumanTokenVerifier {
  private readonly fetchImpl: FetchLike;
  private readonly now: () => number;
  private readonly cacheTtlMs: number;
  private readonly minRefreshIntervalMs: number;
  private readonly requestTimeoutMs: number;
  private readonly clockSkewSeconds: number;
  private cached?: CachedJwks;

  constructor(private readonly options: Es256JwksVerifierOptions) {
    const url = new URL(options.jwksUrl);
    if (url.protocol !== 'https:') {
      throw new Error('Human Auth JWKS URL must use HTTPS.');
    }
    if (!options.issuer.trim() || !options.audience.trim()) {
      throw new Error('Human Auth issuer and audience are required.');
    }
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
    this.cacheTtlMs = options.cacheTtlMs ?? 300_000;
    this.minRefreshIntervalMs = options.minRefreshIntervalMs ?? 30_000;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 3_000;
    this.clockSkewSeconds = options.clockSkewSeconds ?? 30;
  }

  private async loadJwks(force = false): Promise<Map<string, KeyObject>> {
    const now = this.now();
    if (this.cached) {
      if (!force && this.cached.expiresAt > now) return this.cached.keys;
      if (force && now - this.cached.refreshedAt < this.minRefreshIntervalMs) return this.cached.keys;
    }

    let response: Response;
    try {
      response = await this.fetchImpl(this.options.jwksUrl, {
        headers: { accept: 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });
    } catch {
      throw new HumanAuthError('jwks-unavailable', 'Human Auth JWKS could not be reached.');
    }
    if (!response.ok) {
      throw new HumanAuthError('jwks-unavailable', 'Human Auth JWKS returned a non-success response.');
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new HumanAuthError('jwks-unavailable', 'Human Auth JWKS returned invalid JSON.');
    }
    const keysValue = record(payload)?.keys;
    if (!Array.isArray(keysValue) || keysValue.length > 32) {
      throw new HumanAuthError('jwks-unavailable', 'Human Auth JWKS keys are invalid.');
    }

    const keys = new Map<string, KeyObject>();
    for (const value of keysValue) {
      const jwk = record(value);
      if (!jwk) continue;
      if (jwk.kty !== 'EC' || jwk.crv !== 'P-256') continue;
      if (jwk.alg !== undefined && jwk.alg !== 'ES256') continue;
      if (jwk.use !== undefined && jwk.use !== 'sig') continue;
      if (typeof jwk.kid !== 'string' || !jwk.kid || jwk.kid.length > 255) continue;
      if (keys.has(jwk.kid)) {
        throw new HumanAuthError('jwks-unavailable', 'Human Auth JWKS contains duplicate key IDs.');
      }
      try {
        keys.set(jwk.kid, createPublicKey({ key: jwk as JsonWebKey, format: 'jwk' }));
      } catch {
        throw new HumanAuthError('jwks-unavailable', 'Human Auth JWKS contains an invalid EC key.');
      }
    }
    if (keys.size === 0) {
      throw new HumanAuthError('jwks-unavailable', 'Human Auth JWKS has no supported ES256 keys.');
    }

    this.cached = {
      keys,
      refreshedAt: now,
      expiresAt: now + this.cacheTtlMs,
    };
    return keys;
  }

  async verifyAuthorization(authorization: string | undefined): Promise<VerifiedHumanIdentity> {
    if (!authorization) throw new HumanAuthError('missing-token', 'Bearer token is required.');
    const match = /^Bearer\s+([^\s]+)$/.exec(authorization);
    if (!match?.[1]) throw new HumanAuthError('invalid-token', 'Authorization header is invalid.');

    const parts = match[1].split('.');
    if (parts.length !== 3 || parts.some((part) => !part || !tokenPart.test(part))) {
      throw new HumanAuthError('invalid-token', 'JWT format is invalid.');
    }
    const [encodedHeader, encodedPayload, encodedSignature] = parts as [string, string, string];
    const header = decodeJson(encodedHeader);
    const payload = decodeJson(encodedPayload);
    if (!header || !payload || header.alg !== 'ES256' || typeof header.kid !== 'string' || !header.kid) {
      throw new HumanAuthError('invalid-token', 'JWT header is invalid.');
    }
    if ('typ' in header && header.typ !== 'JWT') {
      throw new HumanAuthError('invalid-token', 'JWT type is invalid.');
    }
    if ('crit' in header) {
      throw new HumanAuthError('invalid-token', 'JWT critical extensions are not supported.');
    }

    const subject = payload.sub;
    const exp = payload.exp;
    const iat = payload.iat;
    const nbf = payload.nbf;
    if (typeof subject !== 'string' || subject.length < 1 || subject.length > 255 || payload.iss !== this.options.issuer) {
      throw new HumanAuthError('invalid-token', 'JWT claims are invalid.');
    }
    if (!audienceMatches(payload.aud, this.options.audience)) {
      throw new HumanAuthError('invalid-token', 'JWT audience is invalid.');
    }
    if (!Number.isInteger(exp) || !Number.isInteger(iat)) {
      throw new HumanAuthError('invalid-token', 'JWT time claims are invalid.');
    }
    if (nbf !== undefined && !Number.isInteger(nbf)) {
      throw new HumanAuthError('invalid-token', 'JWT not-before claim is invalid.');
    }

    const nowSeconds = Math.floor(this.now() / 1000);
    if ((exp as number) < nowSeconds - this.clockSkewSeconds
      || (iat as number) > nowSeconds + this.clockSkewSeconds
      || (typeof nbf === 'number' && nbf > nowSeconds + this.clockSkewSeconds)) {
      throw new HumanAuthError('invalid-token', 'JWT is outside its valid time window.');
    }

    let keys = await this.loadJwks();
    let key = keys.get(header.kid);
    if (!key) {
      keys = await this.loadJwks(true);
      key = keys.get(header.kid);
    }
    if (!key) throw new HumanAuthError('invalid-token', 'JWT signing key is unknown.');

    const signature = Buffer.from(encodedSignature, 'base64url');
    if (signature.length !== 64) throw new HumanAuthError('invalid-token', 'JWT ES256 signature is invalid.');
    const verified = verifySignature(
      'sha256',
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      { key, dsaEncoding: 'ieee-p1363' },
      signature,
    );
    if (!verified) throw new HumanAuthError('invalid-token', 'JWT signature is invalid.');

    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    return email ? { subject, email } : { subject };
  }
}
