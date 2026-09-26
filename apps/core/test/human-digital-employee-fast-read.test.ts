import assert from 'node:assert/strict';
import test from 'node:test';
import { HumanDigitalEmployeeFastReadService } from '../src/supervision/human-digital-employee-fast-read.js';
import type { SemanticRouteDecision } from '../src/semantic-routing/contracts.js';

const ORG = '11111111-1111-4111-8111-111111111111';
const EMPLOYEE = '22222222-2222-4222-8222-222222222222';
const USER = '33333333-3333-4333-8333-333333333333';
const CORRELATION = '44444444-4444-4444-8444-444444444444';
const SECRET = 'synthetic-fast-read-admission-secret-0123456789abcdef';

const POLICY = {
  minimumConfidence: 0.9,
  maximumNeedsMoreContext: 0.1,
  maximumNeedsHumanReview: 0.1,
  minimumNeedsDataOrToolLookup: 0.9,
};

function deterministicDecision(
  overrides: Partial<SemanticRouteDecision> = {},
): SemanticRouteDecision {
  return {
    mode: 'deterministic_read',
    capability: 'business.products.search',
    confidence: 0.99,
    needsDataOrToolLookup: 0.99,
    needsMoreContext: 0.01,
    needsHumanReview: 0.01,
    ambiguity: 'none',
    ...overrides,
  };
}

test('customer Fast Read admission emits one signed intent and returns only zero-token deterministic result', async () => {
  let dispatchCalls = 0;
  const service = new HumanDigitalEmployeeFastReadService({
    intentSecret: SECRET,
    policy: POLICY,
    createCorrelationId: () => CORRELATION,
    now: () => 1_790_000_000_000,
    semanticDecisionProvider: {
      async decide(input) {
        assert.deepEqual(input.availableCapabilities, ['business.products.search']);
        assert.equal(input.organizationId, ORG);
        assert.equal(input.employeeId, EMPLOYEE);
        assert.equal(input.request, 'Liste os primeiros produtos.');
        return deterministicDecision();
      },
    },
    bridge: {
      async getAvailableCapabilities(input) {
        assert.deepEqual(input, {
          organizationId: ORG,
          actorUserId: USER,
          employeeId: EMPLOYEE,
        });
        return ['business.products.search'];
      },
      async dispatchFastRead(input) {
        dispatchCalls += 1;
        assert.equal(input.correlationId, CORRELATION);
        assert.equal(input.request, 'Liste os primeiros produtos.');
        assert.match(input.intentToken, /^wfri1\./);
        return {
          model: 'wandora-deterministic-read-v1',
          summary: 'Primeiros produtos do catálogo.',
          usage: {
            inputTokens: 0,
            outputTokens: 0,
            cachedInputTokens: 0,
            totalTokens: 0,
          },
        };
      },
    },
  });

  const result = await service.execute({
    organizationId: ORG,
    actorUserId: USER,
    employeeId: EMPLOYEE,
    request: '  Liste os primeiros produtos.  ',
  });

  assert.deepEqual(result, {
    kind: 'completed',
    correlationId: CORRELATION,
    model: 'wandora-deterministic-read-v1',
    summary: 'Primeiros produtos do catálogo.',
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
      totalTokens: 0,
    },
  });
  assert.equal(dispatchCalls, 1);
});

test('low-confidence or unavailable semantic decisions fail closed before dispatch', async () => {
  let dispatchCalls = 0;
  const service = new HumanDigitalEmployeeFastReadService({
    intentSecret: SECRET,
    policy: POLICY,
    semanticDecisionProvider: {
      async decide() {
        return deterministicDecision({ confidence: 0.5 });
      },
    },
    bridge: {
      async getAvailableCapabilities() {
        return ['business.products.search'];
      },
      async dispatchFastRead() {
        dispatchCalls += 1;
        throw new Error('must not dispatch');
      },
    },
  });

  assert.deepEqual(await service.execute({
    organizationId: ORG,
    actorUserId: USER,
    employeeId: EMPLOYEE,
    request: 'Liste produtos.',
  }), {
    kind: 'fallback',
    reason: 'low-confidence',
  });
  assert.equal(dispatchCalls, 0);
});

test('capability not projected for the organization fails closed before dispatch', async () => {
  let dispatchCalls = 0;
  const service = new HumanDigitalEmployeeFastReadService({
    intentSecret: SECRET,
    policy: POLICY,
    semanticDecisionProvider: {
      async decide() {
        return deterministicDecision();
      },
    },
    bridge: {
      async getAvailableCapabilities() {
        return [];
      },
      async dispatchFastRead() {
        dispatchCalls += 1;
        throw new Error('must not dispatch');
      },
    },
  });

  assert.deepEqual(await service.execute({
    organizationId: ORG,
    actorUserId: USER,
    employeeId: EMPLOYEE,
    request: 'Liste produtos.',
  }), {
    kind: 'fallback',
    reason: 'capability-not-advertised',
  });
  assert.equal(dispatchCalls, 0);
});

test('non-deterministic or non-zero-token provider result is rejected after dispatch', async () => {
  const service = new HumanDigitalEmployeeFastReadService({
    intentSecret: SECRET,
    policy: POLICY,
    semanticDecisionProvider: { async decide() { return deterministicDecision(); } },
    bridge: {
      async getAvailableCapabilities() {
        return ['business.products.search'];
      },
      async dispatchFastRead() {
        return {
          model: 'unexpected-model',
          summary: 'unsafe',
          usage: {
            inputTokens: 1,
            outputTokens: 0,
            cachedInputTokens: 0,
            totalTokens: 1,
          },
        };
      },
    },
  });

  await assert.rejects(service.execute({
    organizationId: ORG,
    actorUserId: USER,
    employeeId: EMPLOYEE,
    request: 'Liste produtos.',
  }), /invalid-fast-read-result/);
});


test('deterministic provider result with nonzero token usage is rejected', async () => {
  const service = new HumanDigitalEmployeeFastReadService({
    intentSecret: SECRET,
    policy: POLICY,
    semanticDecisionProvider: { async decide() { return deterministicDecision(); } },
    bridge: {
      async getAvailableCapabilities() {
        return ['business.products.search'];
      },
      async dispatchFastRead() {
        return {
          model: 'wandora-deterministic-read-v1',
          summary: 'Would otherwise be valid.',
          usage: {
            inputTokens: 1,
            outputTokens: 0,
            cachedInputTokens: 0,
            totalTokens: 1,
          },
        };
      },
    },
  });

  await assert.rejects(service.execute({
    organizationId: ORG,
    actorUserId: USER,
    employeeId: EMPLOYEE,
    request: 'Liste produtos.',
  }), /invalid-fast-read-result/);
});
