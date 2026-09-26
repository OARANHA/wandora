import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import {
  BUSINESS_CAPABILITIES,
  canonicalSemanticSelector,
  gateDeterministicRead,
  type BusinessCapability,
  type SemanticSelector,
  type SemanticRouteDecision,
  type SemanticRoutePolicy,
} from './contracts.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIGEST_RE = /^[a-f0-9]{64}$/;
const TOKEN_RE = /^wfri1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/;
const MAX_TOKEN_BYTES = 8192;

export type FastReadIntentClaims = {
  version: 1;
  organizationId: string;
  employeeId: string;
  capability: BusinessCapability;
  selector: SemanticSelector | null;
  correlationId: string;
  requestDigest: string;
  issuedAt: number;
  expiresAt: number;
};

export class FastReadIntentError extends Error {
  constructor(readonly code: 'invalid' | 'expired' | 'mismatch' | 'not-authorized') {
    super(code);
    this.name = 'FastReadIntentError';
  }
}

function canonicalUuid(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!UUID_RE.test(normalized)) throw new FastReadIntentError('invalid');
  return normalized;
}

function canonicalRequest(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 12_000) throw new FastReadIntentError('invalid');
  return normalized;
}

function requestDigest(value: string): string {
  return createHash('sha256').update(canonicalRequest(value), 'utf8').digest('hex');
}

function secretBuffer(secret: string): Buffer {
  const normalized = secret.trim();
  if (normalized.length < 32 || normalized.length > 8192) throw new FastReadIntentError('invalid');
  return Buffer.from(normalized, 'utf8');
}

function encode(claims: FastReadIntentClaims): string {
  const payload: Record<string, unknown> = {
    v: 1,
    org: claims.organizationId,
    emp: claims.employeeId,
    cap: claims.capability,
    cid: claims.correlationId,
    req: claims.requestDigest,
    iat: claims.issuedAt,
    exp: claims.expiresAt,
  };
  if (claims.selector) payload.sel = claims.selector;
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function signature(secret: string, payload: string): string {
  return createHmac('sha256', secretBuffer(secret))
    .update(`wfri1.${payload}`, 'utf8')
    .digest('base64url');
}

function decode(payload: string): FastReadIntentClaims {
  let value: Record<string, unknown>;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error();
    value = parsed as Record<string, unknown>;
  } catch {
    throw new FastReadIntentError('invalid');
  }

  const capability = typeof value.cap === 'string'
    && (BUSINESS_CAPABILITIES as readonly string[]).includes(value.cap)
    ? value.cap as BusinessCapability
    : null;
  const selector = value.sel === undefined ? null : canonicalSemanticSelector(value.sel);
  if (
    value.v !== 1
    || typeof value.org !== 'string'
    || typeof value.emp !== 'string'
    || typeof value.cid !== 'string'
    || !capability
    || (value.sel !== undefined && !selector)
    || typeof value.req !== 'string'
    || !DIGEST_RE.test(value.req)
    || !Number.isSafeInteger(value.iat)
    || !Number.isSafeInteger(value.exp)
  ) throw new FastReadIntentError('invalid');

  return {
    version: 1,
    organizationId: canonicalUuid(value.org),
    employeeId: canonicalUuid(value.emp),
    capability,
    selector,
    correlationId: canonicalUuid(value.cid),
    requestDigest: value.req,
    issuedAt: value.iat as number,
    expiresAt: value.exp as number,
  };
}

export function issueFastReadIntent(input: {
  secret: string;
  organizationId: string;
  employeeId: string;
  correlationId: string;
  request: string;
  decision: SemanticRouteDecision;
  availableCapabilities: readonly BusinessCapability[];
  policy: SemanticRoutePolicy;
  nowMs?: number;
  ttlSeconds?: number;
}): string {
  const gate = gateDeterministicRead(input.decision, input.availableCapabilities, input.policy);
  if (!gate.allowed) throw new FastReadIntentError('not-authorized');

  const ttlSeconds = input.ttlSeconds ?? 60;
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 5 || ttlSeconds > 300) {
    throw new FastReadIntentError('invalid');
  }
  const issuedAt = Math.floor((input.nowMs ?? Date.now()) / 1000);
  const claims: FastReadIntentClaims = {
    version: 1,
    organizationId: canonicalUuid(input.organizationId),
    employeeId: canonicalUuid(input.employeeId),
    capability: gate.capability,
    selector: gate.selector,
    correlationId: canonicalUuid(input.correlationId),
    requestDigest: requestDigest(input.request),
    issuedAt,
    expiresAt: issuedAt + ttlSeconds,
  };
  const payload = encode(claims);
  return `wfri1.${payload}.${signature(input.secret, payload)}`;
}

export function verifyFastReadIntent(input: {
  secret: string;
  token: string;
  request: string;
  expectedOrganizationId: string;
  expectedEmployeeId: string;
  expectedCorrelationId: string;
  nowMs?: number;
  maxTtlSeconds?: number;
  maxClockSkewSeconds?: number;
}): FastReadIntentClaims {
  const token = input.token.trim();
  if (!token || Buffer.byteLength(token, 'utf8') > MAX_TOKEN_BYTES) throw new FastReadIntentError('invalid');
  const match = TOKEN_RE.exec(token);
  if (!match?.[1] || !match[2]) throw new FastReadIntentError('invalid');

  const expected = Buffer.from(signature(input.secret, match[1]), 'base64url');
  const supplied = Buffer.from(match[2], 'base64url');
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    throw new FastReadIntentError('invalid');
  }

  const claims = decode(match[1]);
  const maxTtl = input.maxTtlSeconds ?? 300;
  const skew = input.maxClockSkewSeconds ?? 5;
  if (
    !Number.isInteger(maxTtl)
    || maxTtl < 5
    || maxTtl > 300
    || !Number.isInteger(skew)
    || skew < 0
    || skew > 30
  ) throw new FastReadIntentError('invalid');

  const now = Math.floor((input.nowMs ?? Date.now()) / 1000);
  if (
    claims.expiresAt <= claims.issuedAt
    || claims.expiresAt - claims.issuedAt > maxTtl
    || claims.issuedAt > now + skew
  ) throw new FastReadIntentError('invalid');
  if (claims.expiresAt < now) throw new FastReadIntentError('expired');

  if (
    claims.organizationId !== canonicalUuid(input.expectedOrganizationId)
    || claims.employeeId !== canonicalUuid(input.expectedEmployeeId)
    || claims.correlationId !== canonicalUuid(input.expectedCorrelationId)
    || claims.requestDigest !== requestDigest(input.request)
  ) throw new FastReadIntentError('mismatch');

  return claims;
}
