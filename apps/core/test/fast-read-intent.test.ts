import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FastReadIntentError,
  issueFastReadIntent,
  verifyFastReadIntent,
} from '../src/semantic-routing/fast-read-intent.js';
import { PaperclipFastReadExecutionService } from '../src/paperclip-execution/fast-read.js';

const SECRET = 'fast-read-intent-test-secret-0123456789abcdef0123456789abcdef';
const ORG = '11111111-1111-4111-8111-111111111111';
const EMPLOYEE = '22222222-2222-4222-8222-222222222222';
const CORRELATION = '33333333-3333-4333-8333-333333333333';
const RUN = '44444444-4444-4444-8444-444444444444';
const NOW = 1_800_000_000_000;
const REQUEST = 'Qual o preço do PREMIUM PLUS?';
const DECISION = {
  mode: 'deterministic_read' as const,
  capability: 'business.products.price' as const,
  confidence: 0.99,
  needsDataOrToolLookup: 1,
  needsMoreContext: 0,
  needsHumanReview: 0,
  ambiguity: 'none' as const,
};
const POLICY = {
  minimumConfidence: 0.95,
  maximumNeedsMoreContext: 0.1,
  maximumNeedsHumanReview: 0.1,
  minimumNeedsDataOrToolLookup: 0.9,
};
const IDENTITY = {
  paperclipAgentId: '55555555-5555-4555-8555-555555555555',
  paperclipCompanyId: '66666666-6666-4666-8666-666666666666',
  catalogKey: 'ana-commercial-v1' as const,
};
const BINDING_RESOLVER = {
  resolveExecutionBinding: async () => ({
    organizationId: ORG,
    employee: { employee_id: EMPLOYEE },
  }),
};

function token(ttlSeconds = 60) {
  return issueFastReadIntent({
    secret: SECRET,
    organizationId: ORG,
    employeeId: EMPLOYEE,
    correlationId: CORRELATION,
    request: REQUEST,
    decision: DECISION,
    availableCapabilities: ['business.products.price'],
    policy: POLICY,
    nowMs: NOW,
    ttlSeconds,
  });
}

test('intent issuance reuses the semantic gate and refuses non-authorized decisions', () => {
  assert.match(token(), /^wfri1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.throws(() => issueFastReadIntent({
    secret: SECRET,
    organizationId: ORG,
    employeeId: EMPLOYEE,
    correlationId: CORRELATION,
    request: REQUEST,
    decision: { ...DECISION, confidence: 0.2 },
    availableCapabilities: ['business.products.price'],
    policy: POLICY,
    nowMs: NOW,
  }), (error: unknown) => error instanceof FastReadIntentError && error.code === 'not-authorized');
});

test('intent is stateless, authenticated, expiring, request-bound and correlation-bound', () => {
  const intent = token();
  const claims = verifyFastReadIntent({
    secret: SECRET,
    token: intent,
    request: REQUEST,
    expectedOrganizationId: ORG,
    expectedEmployeeId: EMPLOYEE,
    expectedCorrelationId: CORRELATION,
    nowMs: NOW + 10_000,
  });
  assert.equal(claims.capability, 'business.products.price');

  assert.throws(() => verifyFastReadIntent({
    secret: SECRET,
    token: intent,
    request: 'Qual o estoque?',
    expectedOrganizationId: ORG,
    expectedEmployeeId: EMPLOYEE,
    expectedCorrelationId: CORRELATION,
    nowMs: NOW + 10_000,
  }), (error: unknown) => error instanceof FastReadIntentError && error.code === 'mismatch');

  assert.throws(() => verifyFastReadIntent({
    secret: SECRET,
    token: intent,
    request: REQUEST,
    expectedOrganizationId: ORG,
    expectedEmployeeId: EMPLOYEE,
    expectedCorrelationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    nowMs: NOW + 10_000,
  }), (error: unknown) => error instanceof FastReadIntentError && error.code === 'mismatch');

  assert.throws(() => verifyFastReadIntent({
    secret: SECRET,
    token: intent,
    request: REQUEST,
    expectedOrganizationId: ORG,
    expectedEmployeeId: EMPLOYEE,
    expectedCorrelationId: CORRELATION,
    nowMs: NOW + 61_000,
  }), (error: unknown) => error instanceof FastReadIntentError && error.code === 'expired');
});

test('tampering with the capability is rejected', () => {
  const parts = token().split('.');
  const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'));
  payload.cap = 'business.orders.search';
  const tampered = parts[0] + '.' + Buffer.from(JSON.stringify(payload)).toString('base64url') + '.' + parts[2];
  assert.throws(() => verifyFastReadIntent({
    secret: SECRET,
    token: tampered,
    request: REQUEST,
    expectedOrganizationId: ORG,
    expectedEmployeeId: EMPLOYEE,
    expectedCorrelationId: CORRELATION,
    nowMs: NOW,
  }), (error: unknown) => error instanceof FastReadIntentError && error.code === 'invalid');
});

test('expired intent opens no Tool Gateway session', async () => {
  let bridgeCalls = 0;
  const service = new PaperclipFastReadExecutionService({
    intentSecret: SECRET,
    bindingResolver: BINDING_RESOLVER,
    readToolBridge: async () => {
      bridgeCalls += 1;
      return [];
    },
    capabilityAdapter: {
      capabilitiesFor: () => [],
      execute: async () => ({ kind: 'not_found', message: 'unreachable' }),
    },
  });

  await assert.rejects(service.execute({
    intentToken: token(5),
    correlationId: CORRELATION,
    request: REQUEST,
    identity: IDENTITY,
    paperclipRunId: RUN,
    runToken: 'disposable-paperclip-run-token',
    nowMs: NOW + 6_000,
  }), (error: unknown) => error instanceof FastReadIntentError && error.code === 'expired');
  assert.equal(bridgeCalls, 0);
});

test('service executes exactly one already-authorized read tool with zero model usage', async () => {
  let bridgeCalls = 0;
  let toolCalls = 0;
  const service = new PaperclipFastReadExecutionService({
    intentSecret: SECRET,
    bindingResolver: BINDING_RESOLVER,
    readToolBridge: async () => {
      bridgeCalls += 1;
      return [{
        name: 'synthetic_product_price',
        title: 'Synthetic Product Price',
        description: 'Disposable synthetic read',
        inputSchema: { type: 'object' },
        execute: async () => {
          toolCalls += 1;
          return { name: 'PREMIUM PLUS', price: 'R$ 129,90' };
        },
      }];
    },
    capabilityAdapter: {
      capabilitiesFor: (tool) => tool.name === 'synthetic_product_price'
        ? ['business.products.price']
        : [],
      execute: async ({ tool }) => {
        const value = await tool.execute({});
        assert.deepEqual(value, { name: 'PREMIUM PLUS', price: 'R$ 129,90' });
        return {
          kind: 'facts',
          subject: 'PREMIUM PLUS',
          facts: [{ label: 'Preço', value: 'R$ 129,90' }],
        };
      },
    },
  });

  const result = await service.execute({
    intentToken: token(),
    correlationId: CORRELATION,
    request: REQUEST,
    identity: IDENTITY,
    paperclipRunId: RUN,
    runToken: 'disposable-paperclip-run-token',
    nowMs: NOW + 1_000,
  });

  assert.equal(bridgeCalls, 1);
  assert.equal(toolCalls, 1);
  assert.equal(result.model, 'wandora-deterministic-read-v1');
  assert.equal(result.summary, 'PREMIUM PLUS\nPreço: R$ 129,90');
  assert.deepEqual(result.usage, {
    inputTokens: 0,
    outputTokens: 0,
    cachedInputTokens: 0,
    totalTokens: 0,
  });
  assert.match(result.executionId, /^fast_[a-f0-9]{64}$/);
});

test('missing or duplicate authorized capability fails closed before any tool execution', async () => {
  let toolCalls = 0;
  const runtimeTool = {
    name: 'synthetic_product_price',
    title: 'Synthetic Product Price',
    description: 'Disposable synthetic read',
    inputSchema: { type: 'object' },
    execute: async () => {
      toolCalls += 1;
      return {};
    },
  };
  const capabilityAdapter = {
    capabilitiesFor: (tool: typeof runtimeTool) => tool.name === 'synthetic_product_price'
      ? ['business.products.price' as const]
      : [],
    execute: async () => ({ kind: 'not_found' as const, message: 'unreachable' }),
  };

  for (const tools of [[], [runtimeTool, runtimeTool]]) {
    const service = new PaperclipFastReadExecutionService({
      intentSecret: SECRET,
      bindingResolver: BINDING_RESOLVER,
      readToolBridge: async () => tools,
      capabilityAdapter,
    });
    await assert.rejects(service.execute({
      intentToken: token(),
      correlationId: CORRELATION,
      request: REQUEST,
      identity: IDENTITY,
      paperclipRunId: RUN,
      runToken: 'disposable-paperclip-run-token',
      nowMs: NOW + 1_000,
    }), /fast_read_capability_unavailable/);
  }
  assert.equal(toolCalls, 0);
});
