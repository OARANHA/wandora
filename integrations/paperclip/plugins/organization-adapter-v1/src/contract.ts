import { createHmac, timingSafeEqual } from 'node:crypto';
import { CATALOG_KEY } from './catalog.js';

export const MAX_SKEW_SECONDS = 5 * 60;
type HeaderValue = string | string[] | undefined;

function nonEmpty(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function parseCatalogWebhook(input: {
  endpointKey: string;
  expectedEndpointKey: 'employee-reconcile' | 'employee-activate';
  parsedBody?: unknown;
  rawBody: string;
  headers: Record<string, HeaderValue>;
}) {
  if (input.endpointKey !== input.expectedEndpointKey) throw new Error('unknown_endpoint');
  const body = input.parsedBody && typeof input.parsedBody === 'object' && !Array.isArray(input.parsedBody)
    ? input.parsedBody as Record<string, unknown>
    : {};
  if (Object.keys(body).sort().join(',') !== 'catalogKey,companyId') throw new Error('invalid_wandora_request');
  const companyId = nonEmpty(body.companyId);
  const catalogKey = nonEmpty(body.catalogKey);
  const timestamp = nonEmpty(input.headers['x-wandora-timestamp']);
  const signature = nonEmpty(input.headers['x-wandora-signature']);
  if (!companyId || catalogKey !== CATALOG_KEY || !timestamp || !signature) throw new Error('invalid_wandora_request');
  return { companyId, catalogKey: CATALOG_KEY, timestamp, signature, rawBody: input.rawBody };
}

export function parseReconcileWebhook(input: {
  endpointKey: string; parsedBody?: unknown; rawBody: string; headers: Record<string, HeaderValue>;
}) {
  return parseCatalogWebhook({ ...input, expectedEndpointKey: 'employee-reconcile' });
}

export function parseActivationWebhook(input: {
  endpointKey: string; parsedBody?: unknown; rawBody: string; headers: Record<string, HeaderValue>;
}) {
  return parseCatalogWebhook({ ...input, expectedEndpointKey: 'employee-activate' });
}

export function requireFreshTimestamp(timestamp: string, nowSeconds = Math.floor(Date.now() / 1000)): number {
  const numericTimestamp = Number(timestamp);
  if (!Number.isInteger(numericTimestamp) || Math.abs(nowSeconds - numericTimestamp) > MAX_SKEW_SECONDS) {
    throw new Error('stale_wandora_request');
  }
  return numericTimestamp;
}

export function requireHmacSecret(secret: unknown): string {
  if (typeof secret !== 'string' || secret.length < 32 || secret.length > 8_192) throw new Error('wandora_hmac_secret_invalid');
  return secret;
}

export function verifySignature(secret: string, timestamp: string, rawBody: string, signatureHeader: string): boolean {
  const received = signatureHeader.startsWith('sha256=') ? signatureHeader.slice(7) : '';
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const expectedBytes = Buffer.from(expected, 'hex');
  const receivedBytes = Buffer.from(received, 'hex');
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}
