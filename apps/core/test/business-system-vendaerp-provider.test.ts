import assert from 'node:assert/strict';
import test from 'node:test';
import { BusinessSystemProviderError, VendaErpReadProvider } from '../src/business-system/vendaerp-provider.js';

const credentials = { authorizationToken: 'token-value', user: 'user@example.com', app: 'wandora' };

function providerWith(handler: (url: URL, init?: RequestInit) => Response | Promise<Response>) {
  return new VendaErpReadProvider({
    baseUrl: 'https://erp.example', credentials,
    fetchImpl: async (input, init) => handler(new URL(String(input)), init),
  });
}

test('VendaERP adapter sends required credentials and probes without exposing provider schema', async () => {
  let headers: Headers | undefined;
  const provider = providerWith((_url, init) => { headers = new Headers(init?.headers); return new Response('', { status: 200 }); });
  assert.deepEqual(await provider.probe(), { connected: true });
  assert.equal(headers?.get('Authorization-Token'), 'token-value');
  assert.equal(headers?.get('User'), 'user@example.com');
  assert.equal(headers?.get('App'), 'wandora');
});

test('VendaERP product search maps only provider-neutral product fields', async () => {
  let called = '';
  const provider = providerWith((url) => {
    called = url.toString();
    return new Response(JSON.stringify([{
      id: 'provider-product-1', codigo: 'P-1', nome: 'Produto Teste', ean: '7890000000000',
      categoria: 'Categoria', marca: 'Marca', estoqueUnidade: 'UN', precoVenda: 123.45,
      precoMinimoVenda: 110, estoqueSaldo: 7, ncm: 'provider-only', grupoTributario: 'provider-only',
    }]), { status: 200 });
  });
  assert.deepEqual(await provider.searchProducts({ name: 'Produto', pageSize: 20 }), [{
    externalRef: 'provider-product-1', code: 'P-1', name: 'Produto Teste', barcode: '7890000000000',
    category: 'Categoria', brand: 'Marca', unit: 'UN', salePrice: 123.45, minimumSalePrice: 110, stockBalance: 7,
  }]);
  assert.equal(called.includes('/api/request/Produtos/Pesquisar'), true);
  assert.equal(called.includes('nome=Produto'), true);
  assert.equal(called.includes('pageSize=20'), true);
});

test('VendaERP adapter maps stock, price tables, parties and orders', async () => {
  const provider = providerWith((url) => {
    if (url.pathname.endsWith('/Produtos/GetSaldo')) return new Response(JSON.stringify([{ deposito: 'Principal', saldo: 4, lastUpdate: '2026-09-23T00:00:00Z' }]), { status: 200 });
    if (url.pathname.endsWith('/TabelasPreco/Pesquisar')) return new Response(JSON.stringify([{ id: 'table-1', nome: 'Varejo', exibirNoPDV: true }]), { status: 200 });
    if (url.pathname.endsWith('/TabelasPreco/Produtos')) return new Response(JSON.stringify([{ codigoProduto: 'P-1', produto: 'Produto Teste', precoVenda: 99.9, precoCusto: 50 }]), { status: 200 });
    if (url.pathname.endsWith('/Pessoas/Pesquisar')) return new Response(JSON.stringify([{ id: 'party-1', nomeFantasia: 'Cliente Teste', razaoSocial: 'Cliente Teste Ltda', cnpJ_CPF: '00000000000191', email: 'cliente@example.com', celular: '51999999999', cliente: true, fonecedor: false, senha: 'must-not-leak' }]), { status: 200 });
    if (url.pathname.endsWith('/Pedidos/Pesquisar')) return new Response(JSON.stringify([{ id: 'order-1', codigo: 42, cliente: 'Cliente Teste', status: 'Aberto', valorFinal: 250, data: '2026-09-23T10:00:00Z', numeroNFe: null, chaveAcessoNFe: 'must-not-leak' }]), { status: 200 });
    throw new Error('unexpected path ' + url.pathname);
  });
  assert.deepEqual(await provider.getProductStock({ productCode: 'P-1', location: 'Principal' }), [{ location: 'Principal', quantity: 4, lastUpdatedAt: '2026-09-23T00:00:00Z' }]);
  assert.deepEqual(await provider.listPriceTables(), [{ externalRef: 'table-1', name: 'Varejo' }]);
  assert.deepEqual(await provider.searchPriceTableProducts({ priceTableExternalRef: 'table-1' }), [{ productCode: 'P-1', productName: 'Produto Teste', salePrice: 99.9 }]);
  assert.deepEqual(await provider.searchParties({ customer: true }), [{ externalRef: 'party-1', displayName: 'Cliente Teste', legalName: 'Cliente Teste Ltda', taxId: '00000000000191', email: 'cliente@example.com', phone: '51999999999', customer: true, supplier: false }]);
  assert.deepEqual(await provider.searchOrders({ code: 42 }), [{ externalRef: 'order-1', code: 42, customerName: 'Cliente Teste', status: 'Aberto', total: 250, createdAt: '2026-09-23T10:00:00Z' }]);
});

test('VendaERP adapter has no automatic retry and classifies provider failures', async () => {
  for (const [status, code] of [[401, 'unauthorized'], [403, 'unauthorized'], [429, 'rate-limited'], [500, 'provider-unavailable']] as const) {
    let calls = 0;
    const provider = providerWith(() => { calls += 1; return new Response('{}', { status }); });
    await assert.rejects(provider.probe(), (error: unknown) => error instanceof BusinessSystemProviderError && error.code === code);
    assert.equal(calls, 1);
  }
});

test('VendaERP adapter rejects non-HTTPS base URL and unsafe pagination locally', async () => {
  assert.throws(() => new VendaErpReadProvider({ baseUrl: 'http://erp.example', credentials }), (error: unknown) => error instanceof BusinessSystemProviderError && error.code === 'invalid-input');
  const provider = providerWith(() => new Response('[]', { status: 200 }));
  await assert.rejects(provider.searchProducts({ pageSize: 101 }), (error: unknown) => error instanceof BusinessSystemProviderError && error.code === 'invalid-input');
});
