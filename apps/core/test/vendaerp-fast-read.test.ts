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

test('VendaERP Fast Read adapter advertises only the exact proven bounded product catalog capability', () => {
  const adapter = createVendaErpFastReadCapabilityAdapter();
  assert.deepEqual(VENDAERP_FAST_READ_CAPABILITIES, ['business.products.search']);
  assert.deepEqual(adapter.capabilitiesFor(tool('vendaerp_search_products', async () => [])), ['business.products.search']);
  assert.deepEqual(adapter.capabilitiesFor(tool('prefix:vendaerp_search_products', async () => [])), []);
  assert.deepEqual(adapter.capabilitiesFor(tool('vendaerp_get_product_stock', async () => [])), []);
});

test('VendaERP Fast Read adapter executes exactly one bounded first-page product read and strips provider-private fields', async () => {
  let calls = 0;
  let input: unknown;
  const adapter = createVendaErpFastReadCapabilityAdapter();
  const result = await adapter.execute({
    tool: tool('vendaerp_search_products', async (value) => {
      calls += 1;
      input = value;
      return [
        {
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
        },
        {
          name: 'USUÁRIO ADICIONAL',
          code: '4',
          salePrice: 48,
          stockBalance: 0,
        },
      ];
    }),
    capability: 'business.products.search',
    request: 'Mostre até cinco produtos do catálogo.',
  });

  assert.equal(calls, 1);
  assert.deepEqual(input, { pageSize: 5, skip: 0 });
  assert.equal(result.kind, 'facts');
  if (result.kind !== 'facts') throw new Error('expected facts');
  assert.equal(result.subject, 'Primeiros produtos do catálogo');
  assert.equal(result.facts.length, 2);
  const rendered = JSON.stringify(result);
  assert.equal(rendered.includes('PREMIUM PLUS'), true);
  assert.equal(rendered.includes('R$'), true);
  assert.equal(rendered.includes('provider-private-1'), false);
  assert.equal(rendered.includes('7890000000000'), false);
  assert.equal(rendered.includes('minimumSalePrice'), false);
});

test('VendaERP Fast Read adapter returns bounded not-found and never retries malformed results', async () => {
  const adapter = createVendaErpFastReadCapabilityAdapter();

  const empty = await adapter.execute({
    tool: tool('vendaerp_search_products', async () => []),
    capability: 'business.products.search',
    request: 'Liste produtos.',
  });
  assert.deepEqual(empty, {
    kind: 'not_found',
    message: 'Nenhum produto foi retornado pela consulta limitada do catálogo.',
  });

  let malformedCalls = 0;
  await assert.rejects(
    adapter.execute({
      tool: tool('vendaerp_search_products', async () => {
        malformedCalls += 1;
        return { items: [] };
      }),
      capability: 'business.products.search',
      request: 'Liste produtos.',
    }),
    /vendaerp_fast_read_invalid_product_result/,
  );
  assert.equal(malformedCalls, 1);
});

test('VendaERP Fast Read adapter rejects unsupported semantic capability before any tool call', async () => {
  let calls = 0;
  const adapter = createVendaErpFastReadCapabilityAdapter();
  await assert.rejects(
    adapter.execute({
      tool: tool('vendaerp_search_products', async () => {
        calls += 1;
        return [];
      }),
      capability: 'business.products.price',
      request: 'Qual o preço?',
    }),
    /vendaerp_fast_read_capability_unavailable/,
  );
  assert.equal(calls, 0);
});
