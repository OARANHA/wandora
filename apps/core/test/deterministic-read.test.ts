import assert from 'node:assert/strict';
import test from 'node:test';
import { DeterministicReadExecutor } from '../src/agent-runtime/deterministic-read.js';
import type {
  BusinessCapability,
  SemanticRouteDecision,
  SemanticRoutePolicy,
} from '../src/semantic-routing/contracts.js';

const POLICY: SemanticRoutePolicy = {
  minimumConfidence: 0.9,
  maximumNeedsMoreContext: 0.25,
  maximumNeedsHumanReview: 0.2,
  minimumNeedsDataOrToolLookup: 0.8,
};

function decision(overrides: Partial<SemanticRouteDecision> = {}): SemanticRouteDecision {
  return {
    mode: 'deterministic_read',
    capability: 'business.products.price',
    selector: { kind: 'product', by: 'name', value: 'PREMIUM PLUS' },
    confidence: 0.97,
    needsDataOrToolLookup: 0.99,
    needsMoreContext: 0.05,
    needsHumanReview: 0.02,
    ambiguity: 'none',
    providerEvidence: { provider: 'test-provider', model: 'test-model' },
    ...overrides,
  };
}

function binding(capability: BusinessCapability, execute: () => Promise<any>) {
  return {
    capability,
    execute: async (_request: string) => execute(),
  };
}

test('deterministic read executes exactly one capability binding and renders without model usage', async () => {
  let calls = 0;
  const executor = new DeterministicReadExecutor(POLICY);
  const result = await executor.execute({
    request: 'Qual o preço do PREMIUM PLUS?',
    decision: decision(),
    bindings: [
      binding('business.products.price', async () => {
        calls += 1;
        return {
          kind: 'facts' as const,
          subject: 'PREMIUM PLUS',
          facts: [
            { label: 'Preço', value: 'R$ 129,90' },
            { label: 'Tabela', value: 'Site normal' },
          ],
        };
      }),
    ],
  });

  assert.equal(calls, 1);
  assert.deepEqual(result, {
    kind: 'completed',
    capability: 'business.products.price',
    model: 'wandora-deterministic-read-v1',
    summary: 'PREMIUM PLUS\nPreço: R$ 129,90\nTabela: Site normal',
    toolCalls: 1,
    usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, totalTokens: 0 },
  });
});

test('product price without an authorized selector fails closed before any capability binding executes', async () => {
  let calls = 0;
  const executor = new DeterministicReadExecutor(POLICY);
  const result = await executor.execute({
    request: 'Qual o preço?',
    decision: decision({ selector: null }),
    bindings: [
      binding('business.products.price', async () => {
        calls += 1;
        return { kind: 'not_found' as const, message: 'never' };
      }),
    ],
  });

  assert.deepEqual(result, { kind: 'fallback', reason: 'missing-selector', toolCalls: 0 });
  assert.equal(calls, 0);
});

test('low confidence fails out before any capability binding executes', async () => {
  let calls = 0;
  const executor = new DeterministicReadExecutor(POLICY);
  const result = await executor.execute({
    request: 'Qual o preço do site normal?',
    decision: decision({ confidence: 0.61 }),
    bindings: [
      binding('business.products.price', async () => {
        calls += 1;
        return { kind: 'not_found' as const, message: 'never' };
      }),
    ],
  });

  assert.equal(calls, 0);
  assert.deepEqual(result, { kind: 'fallback', reason: 'low-confidence', toolCalls: 0 });
});

test('ambiguous semantic decision never guesses a product or calls a tool', async () => {
  let calls = 0;
  const executor = new DeterministicReadExecutor(POLICY);
  const result = await executor.execute({
    request: 'Qual o preço do site normal?',
    decision: decision({ ambiguity: 'vague_reference', needsMoreContext: 0.8 }),
    bindings: [
      binding('business.products.price', async () => {
        calls += 1;
        return { kind: 'not_found' as const, message: 'never' };
      }),
    ],
  });

  assert.equal(calls, 0);
  assert.equal(result.kind, 'fallback');
  if (result.kind === 'fallback') {
    assert.equal(result.reason, 'needs-more-context');
  }
});

test('capability must be present exactly once in the ephemeral authorized binding set', async () => {
  let calls = 0;
  const executor = new DeterministicReadExecutor(POLICY);
  const execute = async () => {
    calls += 1;
    return { kind: 'not_found' as const, message: 'never' };
  };

  const missing = await executor.execute({
    request: 'Qual o preço do PREMIUM PLUS?',
    decision: decision(),
    bindings: [],
  });
  assert.deepEqual(missing, { kind: 'fallback', reason: 'capability-not-advertised', toolCalls: 0 });

  const duplicate = await executor.execute({
    request: 'Qual o preço do PREMIUM PLUS?',
    decision: decision(),
    bindings: [
      binding('business.products.price', execute),
      binding('business.products.price', execute),
    ],
  });
  assert.deepEqual(duplicate, { kind: 'fallback', reason: 'capability-binding-unavailable', toolCalls: 0 });
  assert.equal(calls, 0);
});

test('deterministic renderer supports bounded clarification returned by a qualified capability binding', async () => {
  const executor = new DeterministicReadExecutor(POLICY);
  const result = await executor.execute({
    request: 'Qual o preço do PREMIUM?',
    decision: decision(),
    bindings: [
      binding('business.products.price', async () => ({
        kind: 'clarification' as const,
        prompt: 'Encontrei mais de um produto. Qual deles você quer consultar?',
        options: ['PREMIUM', 'PREMIUM PLUS'],
      })),
    ],
  });

  assert.equal(result.kind, 'completed');
  if (result.kind === 'completed') {
    assert.equal(
      result.summary,
      'Encontrei mais de um produto. Qual deles você quer consultar?\n1. PREMIUM\n2. PREMIUM PLUS',
    );
    assert.equal(result.toolCalls, 1);
    assert.equal(result.usage.totalTokens, 0);
  }
});

test('human review and generative decisions never enter deterministic execution', async () => {
  let calls = 0;
  const executor = new DeterministicReadExecutor(POLICY);
  const execute = async () => {
    calls += 1;
    return { kind: 'not_found' as const, message: 'never' };
  };

  for (const current of [
    decision({ mode: 'human_review' }),
    decision({ mode: 'generative_reasoning' }),
    decision({ mode: 'unknown' }),
    decision({ needsHumanReview: 0.8 }),
  ]) {
    const result = await executor.execute({
      request: 'Analise e negocie esse pedido.',
      decision: current,
      bindings: [binding('business.products.price', execute)],
    });
    assert.equal(result.kind, 'fallback');
  }
  assert.equal(calls, 0);
});


test('invalid Wandora route policy fails closed before any capability binding executes', async () => {
  let calls = 0;
  const executor = new DeterministicReadExecutor({
    ...POLICY,
    minimumConfidence: -1,
  });
  const result = await executor.execute({
    request: 'Qual o preço do PREMIUM PLUS?',
    decision: decision(),
    bindings: [
      binding('business.products.price', async () => {
        calls += 1;
        return { kind: 'not_found' as const, message: 'never' };
      }),
    ],
  });

  assert.deepEqual(result, { kind: 'fallback', reason: 'invalid-policy', toolCalls: 0 });
  assert.equal(calls, 0);
});
