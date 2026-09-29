import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createVendaErpFastReadCapabilityAdapter,
  VENDAERP_FAST_READ_CAPABILITIES,
} from '../src/business-system/vendaerp-fast-read.js';

function tool(name: string, execute: (input: unknown) => Promise<unknown>) {
  return {
    name,
    title: name,
    description: 'synthetic authorized read tool',
    inputSchema: { type: 'object' },
    execute,
  };
}

test('VendaERP Fast Read adapter maps search and price only from the exact existing product read tool', () => {
  const adapter = createVendaErpFastReadCapabilityAdapter();
  assert.deepEqual(VENDAERP_FAST_READ_CAPABILITIES, [
    'business.products.search',
    'business.products.price',
  ]);
  assert.deepEqual(adapter.capabilitiesFor(tool('vendaerp_search_products', async () => [])), [
    'business.products.search',
    'business.products.price',
  ]);
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

test('unsupported capability and malformed provider result fail closed without retry', async () => {
  let calls = 0;
  const adapter = createVendaErpFastReadCapabilityAdapter();
  await assert.rejects(adapter.execute({
    tool: tool('vendaerp_search_products', async () => {
      calls += 1;
      return [];
    }),
    capability: 'business.stock.read',
    request: 'Qual o estoque?',
    selector: null,
  }), /vendaerp_fast_read_capability_unavailable/);
  assert.equal(calls, 0);

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
