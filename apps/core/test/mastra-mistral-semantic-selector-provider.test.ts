import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MastraMistralSemanticSelectorProvider,
  QUALIFIED_MISTRAL_SELECTOR_MODEL,
  type MastraMistralSelectorGenerate,
} from '../src/semantic-routing/mastra-mistral-selector-provider.js';
import type { BusinessCapability } from '../src/semantic-routing/contracts.js';

const API_KEY = 'mistral_synthetic_selector_qualification_key_123456789';

function input(
  request: string,
  capability: BusinessCapability = 'business.products.price',
) {
  return {
    organizationId: '11111111-1111-4111-8111-111111111111',
    employeeId: '22222222-2222-4222-8222-222222222222',
    request,
    capability,
  };
}

function providerWith(generateImpl: MastraMistralSelectorGenerate, timeoutMs = 3_000) {
  return new MastraMistralSemanticSelectorProvider({
    apiKey: API_KEY,
    timeoutMs,
    generateImpl,
  });
}

for (const example of [
  {
    label: 'name',
    request: 'Qual o preço do PREMIUM PLUS?',
    selector: { kind: 'product', by: 'name', value: 'PREMIUM PLUS' },
  },
  {
    label: 'code',
    request: 'Qual o preço do produto código PR-8842?',
    selector: { kind: 'product', by: 'code', value: 'PR-8842' },
  },
  {
    label: 'barcode',
    request: 'Qual o preço do código de barras 7891234567890?',
    selector: { kind: 'product', by: 'barcode', value: '7891234567890' },
  },
] as const) {
  test(`extracts a bounded product selector by ${example.label}`, async () => {
    let calls = 0;
    const provider = providerWith(async (received) => {
      calls += 1;
      assert.equal(received.request, example.request);
      assert.equal(received.capability, 'business.products.price');
      assert.ok(received.signal instanceof AbortSignal);
      return {
        selector: example.selector,
        confidence: 0.98,
        ambiguity: 'none',
      };
    });

    const decision = await provider.select(input(example.request));
    assert.equal(calls, 1);
    assert.deepEqual(decision, {
      selector: example.selector,
      confidence: 0.98,
      ambiguity: 'none',
      providerEvidence: {
        provider: 'mastra-mistral',
        model: QUALIFIED_MISTRAL_SELECTOR_MODEL,
      },
    });
  });
}

test('sends only bounded request + capability to the generator boundary', async () => {
  const provider = providerWith(async (received) => {
    assert.deepEqual(
      Object.keys(received).sort(),
      ['capability', 'request', 'signal'],
    );
    assert.equal(received.request, 'PREMIUM PLUS');
    assert.equal(received.capability, 'business.products.price');
    return {
      selector: { kind: 'product', by: 'name', value: 'PREMIUM PLUS' },
      confidence: 0.97,
      ambiguity: 'none',
    };
  });

  await provider.select(input('  PREMIUM PLUS  '));
});

test('ambiguous product request returns no selector and blocks downstream admission', async () => {
  const provider = providerWith(async () => ({
    selector: null,
    confidence: 0.62,
    ambiguity: 'multiple_matches',
  }));

  assert.deepEqual(
    await provider.select(input('Qual o preço do PREMIUM PLUS ou PREMIUM FOSCO?')),
    {
      selector: null,
      confidence: 0.62,
      ambiguity: 'multiple_matches',
      providerEvidence: {
        provider: 'mastra-mistral',
        model: QUALIFIED_MISTRAL_SELECTOR_MODEL,
      },
    },
  );
});

test('request with no product selector returns missing_entity', async () => {
  const provider = providerWith(async () => ({
    selector: null,
    confidence: 0.91,
    ambiguity: 'missing_entity',
  }));

  const decision = await provider.select(input('Qual é o preço?'));
  assert.equal(decision.selector, null);
  assert.equal(decision.ambiguity, 'missing_entity');
});

test('malformed structured response fails closed', async () => {
  const provider = providerWith(async () => ({
    selector: { kind: 'product', by: 'name', value: 'PREMIUM PLUS' },
    ambiguity: 'none',
  }));

  await assert.rejects(
    provider.select(input('PREMIUM PLUS')),
    /mastra_mistral_selector_invalid_response/,
  );
});

test('invalid confidence fails closed', async () => {
  const provider = providerWith(async () => ({
    selector: { kind: 'product', by: 'name', value: 'PREMIUM PLUS' },
    confidence: 2,
    ambiguity: 'none',
  }));

  await assert.rejects(
    provider.select(input('PREMIUM PLUS')),
    /mastra_mistral_selector_invalid_response/,
  );
});

test('oversized selector fails closed', async () => {
  const provider = providerWith(async () => ({
    selector: { kind: 'product', by: 'name', value: 'x'.repeat(513) },
    confidence: 0.99,
    ambiguity: 'none',
  }));

  await assert.rejects(
    provider.select(input('produto')),
    /mastra_mistral_selector_invalid_response/,
  );
});

test('unsupported selector field fails closed', async () => {
  const provider = providerWith(async () => ({
    selector: { kind: 'product', by: 'sku', value: 'ABC-1' },
    confidence: 0.99,
    ambiguity: 'none',
  }));

  await assert.rejects(
    provider.select(input('ABC-1')),
    /mastra_mistral_selector_invalid_response/,
  );
});

test('selector with ambiguity is rejected instead of weakening the Wandora gate', async () => {
  const provider = providerWith(async () => ({
    selector: { kind: 'product', by: 'name', value: 'PREMIUM PLUS' },
    confidence: 0.99,
    ambiguity: 'multiple_matches',
  }));

  await assert.rejects(
    provider.select(input('PREMIUM PLUS')),
    /mastra_mistral_selector_invalid_response/,
  );
});

test('missing selector with ambiguity none is rejected', async () => {
  const provider = providerWith(async () => ({
    selector: null,
    confidence: 0.99,
    ambiguity: 'none',
  }));

  await assert.rejects(
    provider.select(input('qual o preço?')),
    /mastra_mistral_selector_invalid_response/,
  );
});

test('provider exception fails closed with zero retry', async () => {
  let calls = 0;
  const provider = providerWith(async () => {
    calls += 1;
    throw new Error('synthetic-provider-failure');
  });

  await assert.rejects(
    provider.select(input('PREMIUM PLUS')),
    /mastra_mistral_selector_unavailable/,
  );
  assert.equal(calls, 1);
});

test('provider timeout aborts one call and performs zero retries', async () => {
  let calls = 0;
  const provider = providerWith(async ({ signal }) => {
    calls += 1;
    return await new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });
  }, 250);

  await assert.rejects(
    provider.select(input('PREMIUM PLUS')),
    /mastra_mistral_selector_timeout/,
  );
  assert.equal(calls, 1);
});

test('unsupported capability fails before any provider call', async () => {
  let calls = 0;
  const provider = providerWith(async () => {
    calls += 1;
    return {
      selector: null,
      confidence: 1,
      ambiguity: 'missing_entity',
    };
  });

  await assert.rejects(
    provider.select(input('qual o estoque?', 'business.stock.read')),
    /mastra_mistral_selector_unsupported_capability/,
  );
  assert.equal(calls, 0);
});

test('invalid constructor configuration fails closed', () => {
  assert.throws(
    () => new MastraMistralSemanticSelectorProvider({
      apiKey: 'short',
      generateImpl: async () => null,
    }),
    /mastra_mistral_selector_invalid_api_key/,
  );
  assert.throws(
    () => new MastraMistralSemanticSelectorProvider({
      apiKey: API_KEY,
      timeoutMs: 11_000,
      generateImpl: async () => null,
    }),
    /mastra_mistral_selector_invalid_timeout/,
  );
});
