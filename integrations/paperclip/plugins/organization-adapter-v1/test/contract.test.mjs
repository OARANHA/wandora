import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import {
  parseActivationWebhook,
  parseReconcileWebhook,
  requireFreshTimestamp,
  requireHmacSecret,
  verifySignature,
} from '../.test-build/contract.mjs';

const secret = 'synthetic-test-only-hmac-material-0123456789';
const timestamp = '1789650000';
const body = JSON.stringify({ companyId: 'company-test-only', catalogKey: 'ana-commercial-v1' });
const signature = `sha256=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;

test('accepts exact catalog request and valid HMAC', () => {
  const req = parseReconcileWebhook({
    endpointKey: 'employee-reconcile',
    parsedBody: JSON.parse(body),
    rawBody: body,
    headers: {
      'x-wandora-timestamp': timestamp,
      'x-wandora-signature': signature,
    },
  });
  assert.equal(req.catalogKey, 'ana-commercial-v1');
  assert.equal(verifySignature(secret, timestamp, body, signature), true);
});

test('rejects body tampering and wrong catalog key', () => {
  assert.equal(verifySignature(secret, timestamp, `${body} `, signature), false);
  assert.throws(() => parseReconcileWebhook({
    endpointKey: 'employee-reconcile',
    parsedBody: { companyId: 'company-test-only', catalogKey: 'other' },
    rawBody: body,
    headers: {
      'x-wandora-timestamp': timestamp,
      'x-wandora-signature': signature,
    },
  }), /invalid_wandora_request/);
});

test('rejects stale and non-integer timestamps', () => {
  assert.throws(() => requireFreshTimestamp(timestamp, Number(timestamp) + 301), /stale_wandora_request/);
  assert.throws(() => requireFreshTimestamp('1.5', 1), /stale_wandora_request/);
});

test('rejects weak HMAC material and malformed signatures', () => {
  assert.throws(() => requireHmacSecret('too-short'), /wandora_hmac_secret_invalid/);
  assert.equal(verifySignature(secret, timestamp, body, 'sha256=xyz'), false);
});

test('rejects ambiguous repeated signature headers', () => {
  assert.throws(() => parseReconcileWebhook({
    endpointKey: 'employee-reconcile',
    parsedBody: JSON.parse(body),
    rawBody: body,
    headers: {
      'x-wandora-timestamp': timestamp,
      'x-wandora-signature': [signature, signature],
    },
  }), /invalid_wandora_request/);
});

test('activation accepts only the fixed catalog shape and rejects raw provider identifiers', () => {
  const req = parseActivationWebhook({
    endpointKey: 'employee-activate',
    parsedBody: JSON.parse(body),
    rawBody: body,
    headers: { 'x-wandora-timestamp': timestamp, 'x-wandora-signature': signature },
  });
  assert.equal(req.catalogKey, 'ana-commercial-v1');
  assert.throws(() => parseActivationWebhook({
    endpointKey: 'employee-activate',
    parsedBody: { ...JSON.parse(body), agentId: 'raw-provider-agent-id' },
    rawBody: body,
    headers: { 'x-wandora-timestamp': timestamp, 'x-wandora-signature': signature },
  }), /invalid_wandora_request/);
});
