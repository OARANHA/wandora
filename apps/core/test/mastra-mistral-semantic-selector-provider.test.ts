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

test('extracts a bounded stock selector only from explicit product code + location', async () => {
  const request = 'Quanto tem do produto código 123 no depósito LOJA-01?';
  const provider = providerWith(async (received) => {
    assert.equal(received.request, request);
    assert.equal(received.capability, 'business.stock.read');
    return {
      selector: {
        kind: 'stock',
        product: { kind: 'product', by: 'code', value: '123' },
        location: 'LOJA-01',
      },
      confidence: 0.98,
      ambiguity: 'none',
    };
  });

  assert.deepEqual(await provider.select(input(request, 'business.stock.read')), {
    selector: {
      kind: 'stock',
      product: { kind: 'product', by: 'code', value: '123' },
      location: 'LOJA-01',
    },
    confidence: 0.98,
    ambiguity: 'none',
    providerEvidence: {
      provider: 'mastra-mistral',
      model: QUALIFIED_MISTRAL_SELECTOR_MODEL,
    },
  });
});

test('stock selector fails closed when code/location contract is not satisfied', async () => {
  const nameOnly = providerWith(async () => ({
    selector: {
      kind: 'stock',
      product: { kind: 'product', by: 'name', value: 'PREMIUM PLUS' },
      location: 'LOJA-01',
    },
    confidence: 0.99,
    ambiguity: 'none',
  }));
  await assert.rejects(
    nameOnly.select(input('Tem PREMIUM PLUS na LOJA-01?', 'business.stock.read')),
    /mastra_mistral_selector_invalid_response/,
  );

  const missingLocation = providerWith(async () => ({
    selector: null,
    confidence: 0.95,
    ambiguity: 'missing_entity',
  }));
  const decision = await missingLocation.select(input(
    'Quantas unidades do produto código 123 temos?',
    'business.stock.read',
  ));
  assert.equal(decision.selector, null);
  assert.equal(decision.ambiguity, 'missing_entity');
});

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
    provider.select(input('liste as empresas', 'business.companies.list')),
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


for (const example of [
  {
    label: 'customer',
    request: 'Procure o cliente João Silva.',
    role: 'customer' as const,
  },
  {
    label: 'supplier',
    request: 'Procure o fornecedor Tintas Exemplo.',
    role: 'supplier' as const,
  },
]) {
  test(`extracts a bounded party name + role selector for an explicit ${example.label}`, async () => {
    const provider = providerWith(async (received) => {
      assert.equal(received.request, example.request);
      assert.equal(received.capability, 'business.parties.search');
      return {
        selector: {
          kind: 'party',
          by: 'name',
          value: example.role === 'customer' ? 'João Silva' : 'Tintas Exemplo',
          role: example.role,
        },
        confidence: 0.98,
        ambiguity: 'none',
      };
    });

    const decision = await provider.select(input(example.request, 'business.parties.search'));
    assert.deepEqual(decision.selector, {
      kind: 'party',
      by: 'name',
      value: example.role === 'customer' ? 'João Silva' : 'Tintas Exemplo',
      role: example.role,
    });
    assert.equal(decision.ambiguity, 'none');
  });
}

test('sensitive party identifier request remains fail-closed at the selector boundary', async () => {
  const provider = providerWith(async (received) => {
    assert.equal(received.capability, 'business.parties.search');
    return {
      selector: null,
      confidence: 0.97,
      ambiguity: 'unknown',
    };
  });

  const decision = await provider.select(input(
    'Qual cliente tem o CNPJ 12.345.678/0001-90?',
    'business.parties.search',
  ));
  assert.equal(decision.selector, null);
  assert.equal(decision.ambiguity, 'unknown');
});

test('party selector rejects unsupported roles and selector fields', async () => {
  const invalidRole = providerWith(async () => ({
    selector: { kind: 'party', by: 'name', value: 'João Silva', role: 'prospect' },
    confidence: 0.99,
    ambiguity: 'none',
  }));
  await assert.rejects(
    invalidRole.select(input('Procure João Silva.', 'business.parties.search')),
    /mastra_mistral_selector_invalid_response/,
  );

  const invalidField = providerWith(async () => ({
    selector: { kind: 'party', by: 'document', value: '123', role: 'customer' },
    confidence: 0.99,
    ambiguity: 'none',
  }));
  await assert.rejects(
    invalidField.select(input('Procure o cliente pelo documento 123.', 'business.parties.search')),
    /mastra_mistral_selector_invalid_response/,
  );
});


test('extracts exactly one positive numeric order code for Orders V1', async () => {
  const request = 'Ana, procure o pedido 1542.';
  const provider = providerWith(async (received) => {
    assert.equal(received.request, request);
    assert.equal(received.capability, 'business.orders.search');
    return {
      selector: { kind: 'order', by: 'code', value: 1542 },
      confidence: 0.99,
      ambiguity: 'none',
    };
  });

  assert.deepEqual(await provider.select(input(request, 'business.orders.search')), {
    selector: { kind: 'order', by: 'code', value: 1542 },
    confidence: 0.99,
    ambiguity: 'none',
    providerEvidence: {
      provider: 'mastra-mistral',
      model: QUALIFIED_MISTRAL_SELECTOR_MODEL,
    },
  });
});

test('Orders V1 rejects malformed order codes and keeps non-code lookup fail-closed', async () => {
  for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    const malformed = providerWith(async () => ({
      selector: { kind: 'order', by: 'code', value },
      confidence: 0.99,
      ambiguity: 'none',
    }));
    await assert.rejects(
      malformed.select(input('pedido inválido', 'business.orders.search')),
      /mastra_mistral_selector_invalid_response/,
    );
  }

  const noCode = providerWith(async (received) => {
    assert.equal(received.capability, 'business.orders.search');
    return {
      selector: null,
      confidence: 0.98,
      ambiguity: 'missing_entity',
    };
  });
  const decision = await noCode.select(input(
    'Localize o pedido do cliente Cliente Exemplo.',
    'business.orders.search',
  ));
  assert.equal(decision.selector, null);
  assert.equal(decision.ambiguity, 'missing_entity');
});
