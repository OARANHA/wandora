import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createVendaErpFastReadCapabilityAdapter,
  VENDAERP_FAST_READ_CAPABILITIES,
} from '../src/business-system/vendaerp-fast-read.js';

function tool(
  name: string,
  execute: (input: unknown) => Promise<unknown>,
  providerToolName = name,
) {
  return {
    name,
    providerToolName,
    title: name,
    description: 'synthetic authorized read tool',
    inputSchema: { type: 'object' },
    execute,
  };
}

test('VendaERP Fast Read adapter maps product, stock, and party capabilities only from their exact existing read tools', () => {
  const adapter = createVendaErpFastReadCapabilityAdapter();
  assert.deepEqual(VENDAERP_FAST_READ_CAPABILITIES, [
    'business.products.search',
    'business.products.price',
    'business.stock.read',
    'business.parties.search',
  ]);
  assert.deepEqual(adapter.capabilitiesFor(tool(
    'mcp.wandora-vendaerp-read-only-v1-72222222:vendaerp-search-products',
    async () => [],
    'vendaerp_search_products',
  )), [
    'business.products.search',
    'business.products.price',
  ]);
  assert.deepEqual(adapter.capabilitiesFor(tool(
    'vendaerp_search_products',
    async () => [],
    'vendaerp_search_price_table_products',
  )), []);
  assert.deepEqual(adapter.capabilitiesFor(tool(
    'mcp.wandora-vendaerp-read-only-v1-72222222:vendaerp-get-product-stock',
    async () => [],
    'vendaerp_get_product_stock',
  )), ['business.stock.read']);
  assert.deepEqual(adapter.capabilitiesFor(tool(
    'mcp.wandora-vendaerp-read-only-v1-72222222:vendaerp-search-parties',
    async () => [],
    'vendaerp_search_parties',
  )), ['business.parties.search']);
  assert.deepEqual(adapter.capabilitiesFor(tool('prefix:vendaerp_search_products', async () => [])), []);
  assert.deepEqual(adapter.capabilitiesFor(tool('vendaerp_search_price_table_products', async () => [])), []);
});

test('generic product search preserves one bounded first-page read and strips provider-private fields', async () => {
  let calls = 0;
  let input: unknown;
  const adapter = createVendaErpFastReadCapabilityAdapter();
  const result = await adapter.execute({
    tool: tool('vendaerp_search_products', async (value) => {
      calls += 1;
      input = value;
      return [{
        externalRef: 'provider-private-1',
        barcode: '7890000000000',
        minimumSalePrice: 1,
        name: 'PREMIUM PLUS',
        code: '3',
        category: 'Planos',
        brand: '28PRO',
        unit: 'UN',
        salePrice: 890,
        stockBalance: 0,
      }];
    }),
    capability: 'business.products.search',
    request: 'Mostre até cinco produtos do catálogo.',
    selector: null,
  });

  assert.equal(calls, 1);
  assert.deepEqual(input, { pageSize: 5, skip: 0 });
  assert.equal(result.kind, 'facts');
  const rendered = JSON.stringify(result);
  assert.equal(rendered.includes('PREMIUM PLUS'), true);
  assert.equal(rendered.includes('R$'), true);
  assert.equal(rendered.includes('provider-private-1'), false);
  assert.equal(rendered.includes('7890000000000'), false);
  assert.equal(rendered.includes('minimumSalePrice'), false);
});

test('Product Selector + Price attestation uses one existing search call and returns only the exact requested product price', async () => {
  let calls = 0;
  let input: unknown;
  const adapter = createVendaErpFastReadCapabilityAdapter();
  const result = await adapter.execute({
    tool: tool('vendaerp_search_products', async (value) => {
      calls += 1;
      input = value;
      return [
        { name: 'PREMIUM', code: '2', barcode: '7890000000001', salePrice: 99.5 },
        { name: 'PREMIUM PLUS', code: '3', barcode: '7890000000002', salePrice: 129.9 },
      ];
    }),
    capability: 'business.products.price',
    request: 'Qual o preço do PREMIUM PLUS?',
    selector: { kind: 'product', by: 'name', value: 'PREMIUM PLUS' },
  });

  assert.equal(calls, 1);
  assert.deepEqual(input, { name: 'PREMIUM PLUS', pageSize: 5, skip: 0 });
  assert.equal(result.kind, 'facts');
  if (result.kind !== 'facts') throw new Error('expected facts');
  assert.equal(result.subject, 'PREMIUM PLUS');
  assert.deepEqual(result.facts.map((fact) => fact.label), ['Código', 'Preço']);
  assert.equal(result.facts[0]?.value, '3');
  assert.match(result.facts[1]?.value ?? '', /129,90/);
});

test('selector-aware price never trusts the first provider row and fails closed on zero exact matches', async () => {
  let calls = 0;
  const adapter = createVendaErpFastReadCapabilityAdapter();
  const result = await adapter.execute({
    tool: tool('vendaerp_search_products', async () => {
      calls += 1;
      return [{ name: 'PREMIUM', code: '2', salePrice: 99.5 }];
    }),
    capability: 'business.products.price',
    request: 'Qual o preço do PREMIUM PLUS?',
    selector: { kind: 'product', by: 'name', value: 'PREMIUM PLUS' },
  });

  assert.equal(calls, 1);
  assert.deepEqual(result, {
    kind: 'not_found',
    message: 'Nenhum produto corresponde exatamente ao seletor autorizado.',
  });
});

test('multiple exact matches return bounded clarification without a second provider call', async () => {
  let calls = 0;
  const adapter = createVendaErpFastReadCapabilityAdapter();
  const result = await adapter.execute({
    tool: tool('vendaerp_search_products', async () => {
      calls += 1;
      return [
        { name: 'PREMIUM PLUS', code: '3', salePrice: 129.9 },
        { name: 'Premium   Plus', code: '33', salePrice: 139.9 },
      ];
    }),
    capability: 'business.products.price',
    request: 'Qual o preço do premium plus?',
    selector: { kind: 'product', by: 'name', value: 'premium plus' },
  });

  assert.equal(calls, 1);
  assert.deepEqual(result, {
    kind: 'clarification',
    prompt: 'Encontrei mais de um produto correspondente. Qual deles você quer consultar?',
    options: ['PREMIUM PLUS — código 3', 'Premium   Plus — código 33'],
  });
});

test('price without selector is rejected before any tool call', async () => {
  let calls = 0;
  const adapter = createVendaErpFastReadCapabilityAdapter();
  await assert.rejects(adapter.execute({
    tool: tool('vendaerp_search_products', async () => {
      calls += 1;
      return [];
    }),
    capability: 'business.products.price',
    request: 'Qual o preço?',
    selector: null,
  }), /vendaerp_fast_read_selector_required/);
  assert.equal(calls, 0);
});

test('stock read uses exactly one existing stock tool call with explicit code + location', async () => {
  let calls = 0;
  let input: unknown;
  const adapter = createVendaErpFastReadCapabilityAdapter();
  const result = await adapter.execute({
    tool: tool('vendaerp_get_product_stock', async (value) => {
      calls += 1;
      input = value;
      return [{
        location: 'LOJA-01',
        quantity: 7,
        lastUpdatedAt: '2026-10-01T12:00:00Z',
      }];
    }),
    capability: 'business.stock.read',
    request: 'Quanto tem do produto código 123 no depósito LOJA-01?',
    selector: {
      kind: 'stock',
      product: { kind: 'product', by: 'code', value: '123' },
      location: 'LOJA-01',
    },
  });

  assert.equal(calls, 1);
  assert.deepEqual(input, { productCode: '123', location: 'LOJA-01' });
  assert.deepEqual(result, {
    kind: 'facts',
    subject: 'Estoque do produto 123',
    facts: [
      { label: 'Local', value: 'LOJA-01' },
      { label: 'Quantidade', value: '7' },
      { label: 'Atualizado em', value: '2026-10-01T12:00:00Z' },
    ],
  });
});

test('stock read never converts empty or malformed provider results into quantity zero', async () => {
  const adapter = createVendaErpFastReadCapabilityAdapter();
  const empty = await adapter.execute({
    tool: tool('vendaerp_get_product_stock', async () => []),
    capability: 'business.stock.read',
    request: 'Quanto tem do produto código 123 no depósito LOJA-01?',
    selector: {
      kind: 'stock',
      product: { kind: 'product', by: 'code', value: '123' },
      location: 'LOJA-01',
    },
  });
  assert.deepEqual(empty, {
    kind: 'not_found',
    message: 'Nenhum saldo de estoque foi retornado para o produto e local informados.',
  });

  await assert.rejects(adapter.execute({
    tool: tool('vendaerp_get_product_stock', async () => [{
      location: 'LOJA-01',
      quantity: 'not-a-number',
    }]),
    capability: 'business.stock.read',
    request: 'Quanto tem do produto código 123 no depósito LOJA-01?',
    selector: {
      kind: 'stock',
      product: { kind: 'product', by: 'code', value: '123' },
      location: 'LOJA-01',
    },
  }), /vendaerp_fast_read_invalid_stock_result/);
});

test('stock read rejects a missing stock selector before provider execution', async () => {
  let calls = 0;
  const adapter = createVendaErpFastReadCapabilityAdapter();
  await assert.rejects(adapter.execute({
    tool: tool('vendaerp_get_product_stock', async () => {
      calls += 1;
      return [];
    }),
    capability: 'business.stock.read',
    request: 'Tem PREMIUM PLUS em estoque?',
    selector: null,
  }), /vendaerp_fast_read_selector_required/);
  assert.equal(calls, 0);
});

test('unsupported capability and malformed provider result fail closed without retry', async () => {
  let calls = 0;
  const adapter = createVendaErpFastReadCapabilityAdapter();
  let malformedCalls = 0;
  await assert.rejects(adapter.execute({
    tool: tool('vendaerp_search_products', async () => {
      malformedCalls += 1;
      return { items: [] };
    }),
    capability: 'business.products.search',
    request: 'Liste produtos.',
    selector: null,
  }), /vendaerp_fast_read_invalid_product_result/);
  assert.equal(malformedCalls, 1);
});


test('party search uses one bounded existing tool call and renders only safe party identity fields', async () => {
  let calls = 0;
  let input: unknown;
  const adapter = createVendaErpFastReadCapabilityAdapter();
  const result = await adapter.execute({
    tool: tool('vendaerp_search_parties', async (value) => {
      calls += 1;
      input = value;
      return [{
        externalRef: 'provider-party-1',
        displayName: 'João Silva',
        legalName: 'João Silva Comércio Ltda',
        taxId: '12.345.678/0001-90',
        email: 'joao@example.test',
        phone: '51999999999',
        customer: true,
        supplier: false,
        senha: 'must-not-leak',
      }];
    }),
    capability: 'business.parties.search',
    request: 'Procure o cliente João Silva.',
    selector: { kind: 'party', by: 'name', value: 'João Silva', role: 'customer' },
  });

  assert.equal(calls, 1);
  assert.deepEqual(input, {
    displayName: 'João Silva',
    customer: true,
    supplier: false,
    pageSize: 5,
    skip: 0,
  });
  assert.deepEqual(result, {
    kind: 'facts',
    subject: 'João Silva',
    facts: [
      { label: 'Razão social', value: 'João Silva Comércio Ltda' },
      { label: 'Tipo', value: 'Cliente' },
    ],
  });
  const rendered = JSON.stringify(result);
  for (const forbidden of [
    'provider-party-1',
    '12.345.678/0001-90',
    'joao@example.test',
    '51999999999',
    'must-not-leak',
  ]) {
    assert.equal(rendered.includes(forbidden), false);
  }
});

test('party search returns not_found for zero exact matches without a second provider call', async () => {
  let calls = 0;
  const adapter = createVendaErpFastReadCapabilityAdapter();
  const result = await adapter.execute({
    tool: tool('vendaerp_search_parties', async () => {
      calls += 1;
      return [{
        displayName: 'João Souza',
        legalName: 'João Souza Ltda',
        customer: true,
        supplier: false,
      }];
    }),
    capability: 'business.parties.search',
    request: 'Procure o cliente João Silva.',
    selector: { kind: 'party', by: 'name', value: 'João Silva', role: 'customer' },
  });

  assert.equal(calls, 1);
  assert.deepEqual(result, {
    kind: 'not_found',
    message: 'Nenhum cliente ou fornecedor corresponde exatamente ao nome e tipo autorizados.',
  });
});

test('multiple exact party matches return a bounded safe list and never choose the first row', async () => {
  let calls = 0;
  const adapter = createVendaErpFastReadCapabilityAdapter();
  const result = await adapter.execute({
    tool: tool('vendaerp_search_parties', async () => {
      calls += 1;
      return [
        {
          displayName: 'João Silva',
          legalName: 'João Silva Matriz Ltda',
          taxId: 'must-not-leak-1',
          customer: true,
          supplier: false,
        },
        {
          displayName: '  joão   silva ',
          legalName: 'João Silva Filial Ltda',
          taxId: 'must-not-leak-2',
          customer: true,
          supplier: true,
        },
      ];
    }),
    capability: 'business.parties.search',
    request: 'Procure o cliente João Silva.',
    selector: { kind: 'party', by: 'name', value: 'João Silva', role: 'customer' },
  });

  assert.equal(calls, 1);
  assert.deepEqual(result, {
    kind: 'facts',
    subject: 'Cadastros correspondentes',
    facts: [
      {
        label: '1. João Silva',
        value: 'Razão social João Silva Matriz Ltda · Tipo Cliente',
      },
      {
        label: '2. joão   silva',
        value: 'Razão social João Silva Filial Ltda · Tipo Cliente e fornecedor',
      },
    ],
  });
  const rendered = JSON.stringify(result);
  assert.equal(rendered.includes('must-not-leak-1'), false);
  assert.equal(rendered.includes('must-not-leak-2'), false);
});

test('party search rejects missing selector and malformed or over-bounded provider results without retry', async () => {
  const adapter = createVendaErpFastReadCapabilityAdapter();
  let missingSelectorCalls = 0;
  await assert.rejects(adapter.execute({
    tool: tool('vendaerp_search_parties', async () => {
      missingSelectorCalls += 1;
      return [];
    }),
    capability: 'business.parties.search',
    request: 'Procure um cliente.',
    selector: null,
  }), /vendaerp_fast_read_selector_required/);
  assert.equal(missingSelectorCalls, 0);

  let malformedCalls = 0;
  await assert.rejects(adapter.execute({
    tool: tool('vendaerp_search_parties', async () => {
      malformedCalls += 1;
      return [{ customer: true, supplier: false }];
    }),
    capability: 'business.parties.search',
    request: 'Procure o cliente João Silva.',
    selector: { kind: 'party', by: 'name', value: 'João Silva', role: 'customer' },
  }), /vendaerp_fast_read_invalid_party_result/);
  assert.equal(malformedCalls, 1);

  let oversizedCalls = 0;
  await assert.rejects(adapter.execute({
    tool: tool('vendaerp_search_parties', async () => {
      oversizedCalls += 1;
      return Array.from({ length: 6 }, (_, index) => ({
        displayName: `João Silva ${index}`,
        customer: true,
        supplier: false,
      }));
    }),
    capability: 'business.parties.search',
    request: 'Procure o cliente João Silva.',
    selector: { kind: 'party', by: 'name', value: 'João Silva', role: 'customer' },
  }), /vendaerp_fast_read_invalid_party_result/);
  assert.equal(oversizedCalls, 1);
});

test('party capability rejects a non-party tool before provider execution', async () => {
  let calls = 0;
  const adapter = createVendaErpFastReadCapabilityAdapter();
  await assert.rejects(adapter.execute({
    tool: tool(
      'mcp.wandora-vendaerp-read-only-v1:vendaerp-search-products',
      async () => {
        calls += 1;
        return [];
      },
      'vendaerp_search_products',
    ),
    capability: 'business.parties.search',
    request: 'Procure o cliente João Silva.',
    selector: { kind: 'party', by: 'name', value: 'João Silva', role: 'customer' },
  }), /vendaerp_fast_read_capability_unavailable/);
  assert.equal(calls, 0);
});
