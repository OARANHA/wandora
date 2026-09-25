import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import {
  TOOL_DEFINITIONS,
  VENDAERP_HOST_SUFFIX,
  VendaErpAdapterError,
  createVendaErpClient,
  executeVendaErpTool,
  vendaErpOriginForTenant,
} from '../server.mjs';

const tenant = 'voepro';
const origin = vendaErpOriginForTenant(tenant);
const credentials = Object.freeze({
  authorizationToken: 'secret-token',
  user: 'secret-user',
  app: 'secret-app',
});

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('publishes exactly eight read-only tools with no transport parameters', () => {
  assert.equal(TOOL_DEFINITIONS.length, 8);
  assert.deepEqual(
    TOOL_DEFINITIONS.map((tool) => tool.name),
    [
      'vendaerp_probe',
      'vendaerp_list_companies',
      'vendaerp_search_products',
      'vendaerp_get_product_stock',
      'vendaerp_list_price_tables',
      'vendaerp_search_price_table_products',
      'vendaerp_search_parties',
      'vendaerp_search_orders',
    ],
  );
  for (const tool of TOOL_DEFINITIONS) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.equal(tool.inputSchema.additionalProperties, false);
    assert.equal('url' in tool.inputSchema.properties, false);
    assert.equal('method' in tool.inputSchema.properties, false);
    assert.equal('tenant' in tool.inputSchema.properties, false);
  }
});

test('derives only VendaERP tenant origins and rejects caller-style URLs', () => {
  assert.equal(VENDAERP_HOST_SUFFIX, '.vendaerp.com.br');
  assert.equal(origin, 'https://voepro.vendaerp.com.br');
  assert.throws(() => vendaErpOriginForTenant('https://evil.example'), /tenant/i);
  assert.throws(() => vendaErpOriginForTenant('voepro.vendaerp.com.br'), /tenant/i);
});

test('uses only the template-bound VendaERP origin, GET and exact credential headers', async () => {
  const calls = [];
  const client = createVendaErpClient({
    tenant,
    credentials,
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return jsonResponse([]);
    },
  });
  await client.searchProducts({
    code: 'ABC',
    name: 'Tinta',
    category: 'Premium',
    brand: 'Marca',
    barcode: '789',
    pageSize: 50,
    skip: 10,
  });

  assert.equal(calls.length, 1);
  const call = calls[0];
  const url = new URL(call.url);
  assert.equal(url.origin, origin);
  assert.equal(url.pathname, '/api/request/Produtos/Pesquisar');
  assert.equal(url.searchParams.get('codigo'), 'ABC');
  assert.equal(url.searchParams.get('nome'), 'Tinta');
  assert.equal(url.searchParams.get('categoria'), 'Premium');
  assert.equal(url.searchParams.get('marca'), 'Marca');
  assert.equal(url.searchParams.get('ean'), '789');
  assert.equal(url.searchParams.get('pageSize'), '50');
  assert.equal(url.searchParams.get('skip'), '10');
  assert.equal(call.init.method, 'GET');
  assert.equal(call.init.redirect, 'error');
  assert.equal(call.init.headers.accept, 'application/json');
  assert.equal(call.init.headers['Authorization-Token'], 'secret-token');
  assert.equal(call.init.headers.User, 'secret-user');
  assert.equal(call.init.headers.App, 'secret-app');
  assert.equal(call.init.headers['user-agent'], 'Wandora-VendaERP-ReadOnly-MCP/1.0');
});

test('uses Produtos/GetAll for unfiltered product listing and keeps Pesquisar for filtered search', async () => {
  const calls = [];
  const client = createVendaErpClient({
    tenant,
    credentials,
    fetchImpl: async (url) => {
      calls.push(new URL(url));
      return jsonResponse([]);
    },
  });

  await client.searchProducts({ pageSize: 5, skip: 0 });
  await client.searchProducts({ name: 'PREMIUM PLUS', pageSize: 5, skip: 0 });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].pathname, '/api/request/Produtos/GetAll');
  assert.equal(calls[0].searchParams.get('pageSize'), '5');
  assert.equal(calls[0].searchParams.get('skip'), '0');
  assert.equal(calls[0].searchParams.has('nome'), false);

  assert.equal(calls[1].pathname, '/api/request/Produtos/Pesquisar');
  assert.equal(calls[1].searchParams.get('nome'), 'PREMIUM PLUS');
  assert.equal(calls[1].searchParams.get('pageSize'), '5');
  assert.equal(calls[1].searchParams.get('skip'), '0');
});

test('projects products into the provider-neutral contract', async () => {
  const client = createVendaErpClient({
    tenant,
    credentials,
    fetchImpl: async () => jsonResponse([{
      id: 'p1',
      codigo: '18L-B',
      nome: 'Tinta B 18L',
      ean: '789000',
      categoria: 'Tintas',
      marca: 'Marca B',
      estoqueUnidade: 'UN',
      precoVenda: 249.9,
      precoMinimoVenda: 229.9,
      estoqueSaldo: 12,
      providerOnly: 'must-not-leak',
    }]),
  });

  assert.deepEqual(await client.searchProducts(), [{
    externalRef: 'p1',
    code: '18L-B',
    name: 'Tinta B 18L',
    barcode: '789000',
    category: 'Tintas',
    brand: 'Marca B',
    unit: 'UN',
    salePrice: 249.9,
    minimumSalePrice: 229.9,
    stockBalance: 12,
  }]);
});

test('projects real VendaERP PascalCase product arrays into the provider-neutral contract', async () => {
  const client = createVendaErpClient({
    tenant,
    credentials,
    fetchImpl: async () => jsonResponse([{
      ID: 'p1',
      Codigo: 'PREMIUM-PLUS',
      Ean: '789123',
      Nome: 'PREMIUM PLUS',
      Categoria: 'Servicos',
      Marca: 'VendaERP',
      PrecoVenda: 199.9,
      PrecoMinimoVenda: 149.9,
      EstoqueSaldo: 7,
      EstoqueUnidade: 'UN',
      UnidadeComercial: 'UN',
      PrecosTabelas: [],
      Categorias: [],
    }]),
  });

  assert.deepEqual(
    await client.searchProducts({ pageSize: 5, skip: 0 }),
    [{
      externalRef: 'p1',
      code: 'PREMIUM-PLUS',
      barcode: '789123',
      name: 'PREMIUM PLUS',
      category: 'Servicos',
      brand: 'VendaERP',
      unit: 'UN',
      salePrice: 199.9,
      minimumSalePrice: 149.9,
      stockBalance: 7,
    }],
  );
});

test('classifies product response failures with safe enumerated reasons', async () => {
  const invalidShape = createVendaErpClient({
    tenant,
    credentials,
    fetchImpl: async () => jsonResponse({ items: [] }),
  });
  await assert.rejects(
    invalidShape.searchProducts(),
    (error) => {
      assert.equal(error instanceof VendaErpAdapterError, true);
      assert.equal(error.code, 'invalid-provider-response');
      assert.equal(error.reason, 'product-list-shape');
      assert.equal(error.shape, 'object-items-array');
      return true;
    },
  );

  const unsafeReason = new VendaErpAdapterError(
    'invalid-provider-response',
    'safe message',
    { reason: 'must-not-leak-provider-detail' },
  );
  assert.equal(unsafeReason.reason, undefined);

  const unsafeShape = new VendaErpAdapterError(
    'invalid-provider-response',
    'safe message',
    { reason: 'product-list-shape', shape: 'must-not-leak-provider-shape' },
  );
  assert.equal(unsafeShape.reason, 'product-list-shape');
  assert.equal(unsafeShape.shape, undefined);

  for (const [body, expectedShape] of [
    [[null], 'array-non-object'],
    [{ Message: 'must-not-log-provider-message' }, 'object-Message'],
    [null, 'null'],
    ['must-not-log-provider-text', 'string'],
  ]) {
    const client = createVendaErpClient({
      tenant,
      credentials,
      fetchImpl: async () => jsonResponse(body),
    });
    await assert.rejects(
      client.searchProducts(),
      (error) => {
        assert.equal(error instanceof VendaErpAdapterError, true);
        assert.equal(error.code, 'invalid-provider-response');
        assert.equal(error.reason, 'product-list-shape');
        assert.equal(error.shape, expectedShape);
        assert.equal(String(error).includes('must-not-log'), false);
        return true;
      },
    );
  }

  const missingName = createVendaErpClient({
    tenant,
    credentials,
    fetchImpl: async () => jsonResponse([{
      id: 'must-not-leak-id',
      codigo: 'must-not-leak-code',
    }]),
  });
  await assert.rejects(
    missingName.searchProducts(),
    (error) => {
      assert.equal(error instanceof VendaErpAdapterError, true);
      assert.equal(error.code, 'invalid-provider-response');
      assert.equal(error.reason, 'product-name-missing');
      assert.equal(String(error).includes('must-not-leak'), false);
      return true;
    },
  );
});

test('maps all eight tools to the frozen read-only endpoint allowlist', async () => {
  const calls = [];
  const bodies = new Map([
    ['/api/request/Public/ping', { ok: true }],
    ['/api/request/Empresas/GetTodasEmpresas', []],
    ['/api/request/Produtos/GetAll', []],
    ['/api/request/Produtos/GetSaldo', []],
    ['/api/request/TabelasPreco/Pesquisar', []],
    ['/api/request/TabelasPreco/Produtos', []],
    ['/api/request/Pessoas/Pesquisar', []],
    ['/api/request/Pedidos/Pesquisar', []],
  ]);
  const fetchImpl = async (url, init) => {
    const parsed = new URL(url);
    calls.push({ path: parsed.pathname, method: init.method });
    return jsonResponse(bodies.get(parsed.pathname));
  };
  const options = { tenant, credentials, fetchImpl };

  await executeVendaErpTool('vendaerp_probe', {}, options);
  await executeVendaErpTool('vendaerp_list_companies', {}, options);
  await executeVendaErpTool('vendaerp_search_products', {}, options);
  await executeVendaErpTool(
    'vendaerp_get_product_stock',
    { productCode: 'P1', location: 'D1' },
    options,
  );
  await executeVendaErpTool('vendaerp_list_price_tables', {}, options);
  await executeVendaErpTool(
    'vendaerp_search_price_table_products',
    { priceTableExternalRef: 'T1' },
    options,
  );
  await executeVendaErpTool('vendaerp_search_parties', {}, options);
  await executeVendaErpTool('vendaerp_search_orders', {}, options);

  assert.deepEqual(calls, [...bodies.keys()].map((path) => ({
    path,
    method: 'GET',
  })));
});

test('rejects unbounded pagination and unknown tools before network access', async () => {
  let calls = 0;
  const options = {
    tenant,
    credentials,
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse([]);
    },
  };
  await assert.rejects(
    executeVendaErpTool(
      'vendaerp_search_products',
      { pageSize: 101 },
      options,
    ),
    (error) => error instanceof VendaErpAdapterError
      && error.code === 'invalid-input',
  );
  await assert.rejects(
    executeVendaErpTool('vendaerp_delete_order', {}, options),
    (error) => error instanceof VendaErpAdapterError
      && error.code === 'invalid-input',
  );
  assert.equal(calls, 0);
});
test('normalizes provider authentication and rate-limit failures', async () => {
  for (const [status, code] of [[401, 'unauthorized'], [403, 'unauthorized'], [429, 'rate-limited'], [500, 'provider-unavailable']]) {
    const client = createVendaErpClient({
      tenant,
      credentials,
      fetchImpl: async () => jsonResponse({ error: 'provider' }, status),
    });
    await assert.rejects(
      client.probe(),
      (error) => error instanceof VendaErpAdapterError && error.code === code,
    );
  }
});

test('does not echo credential values into projected results', async () => {
  const client = createVendaErpClient({
    tenant,
    credentials,
    fetchImpl: async () => jsonResponse([{
      id: 'c1',
      nomeFantasia: 'Cliente',
      authorizationToken: credentials.authorizationToken,
      user: credentials.user,
      app: credentials.app,
    }]),
  });
  const serialized = JSON.stringify(await client.listCompanies());
  assert.equal(serialized.includes(credentials.authorizationToken), false);
  assert.equal(serialized.includes(credentials.user), false);
  assert.equal(serialized.includes(credentials.app), false);
});

test('stdio MCP handshake exposes the same eight tools without provider access', async () => {
  const child = spawn(process.execPath, ['server.mjs', '--tenant', tenant], {
    cwd: new URL('..', import.meta.url),
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const lines = [];
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    lines.push(...chunk.split('\n').filter(Boolean).map((line) => JSON.parse(line)));
  });

  child.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test', version: '1' },
    },
  }) + '\n');
  child.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    method: 'notifications/initialized',
    params: {},
  }) + '\n');
  child.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {},
  }) + '\n');

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('stdio timeout')), 3000);
    const check = setInterval(() => {
      if (lines.some((line) => line.id === 2)) {
        clearTimeout(timer);
        clearInterval(check);
        resolve();
      }
    }, 10);
  });
  child.stdin.end();
  child.kill('SIGTERM');

  const initialized = lines.find((line) => line.id === 1);
  const listed = lines.find((line) => line.id === 2);
  assert.equal(initialized.result.serverInfo.name, 'wandora-vendaerp-readonly');
  assert.equal(listed.result.tools.length, 8);
  assert.deepEqual(
    listed.result.tools.map((tool) => tool.name),
    TOOL_DEFINITIONS.map((tool) => tool.name),
  );
});

test('stdio product parse failure exposes only safe normalized subreason', async () => {
  const serverUrl = new URL('../server.mjs', import.meta.url).href;
  const script = [
    `import { runStdio } from ${JSON.stringify(serverUrl)};`,
    `await runStdio({`,
    `  tenant: ${JSON.stringify(tenant)},`,
    `  credentials: ${JSON.stringify(credentials)},`,
    `  fetchImpl: async () => new Response(JSON.stringify({ items: [{ nome: 'must-not-log-product' }] }), {`,
    `    status: 200,`,
    `    headers: { 'content-type': 'application/json' },`,
    `  }),`,
    `});`,
  ].join('\n');
  const child = spawn(process.execPath, ['--input-type=module', '--eval', script], {
    cwd: new URL('..', import.meta.url),
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const stdout = [];
  const stderr = [];
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => stdout.push(chunk));
  child.stderr.on('data', (chunk) => stderr.push(chunk));

  child.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 10,
    method: 'tools/call',
    params: {
      name: 'vendaerp_search_products',
      arguments: { pageSize: 5, skip: 0 },
    },
  }) + '\n');

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('stdio reason timeout')), 3000);
    const check = setInterval(() => {
      if (stdout.join('').includes('"id":10')) {
        clearTimeout(timer);
        clearInterval(check);
        resolve();
      }
    }, 10);
  });
  child.stdin.end();

  const serializedOut = stdout.join('').trim().split(/\n+/).map(JSON.parse);
  const failedCall = serializedOut.find((line) => line.id === 10);
  assert.equal(failedCall.result.isError, true);
  assert.deepEqual(failedCall.result.structuredContent, {
    error: {
      code: 'invalid-provider-response',
      reason: 'product-list-shape',
      shape: 'object-items-array',
    },
  });
  assert.equal(
    failedCall.result.content[0].text,
    '{"error":"invalid-provider-response"}',
  );

  const serializedErr = stderr.join('');
  assert.match(serializedErr, /"code":"invalid-provider-response"/);
  assert.match(serializedErr, /"reason":"product-list-shape"/);
  assert.match(serializedErr, /"shape":"object-items-array"/);
  assert.equal(serializedErr.includes('must-not-log-product'), false);
  assert.equal(serializedErr.includes('secret-token'), false);
  assert.equal(serializedErr.includes('secret-user'), false);
  assert.equal(serializedErr.includes('secret-app'), false);
});

test('stdio tool failure logs only safe normalized error metadata', async () => {
  const child = spawn(process.execPath, ['server.mjs', '--tenant', tenant], {
    cwd: new URL('..', import.meta.url),
    env: {
      ...process.env,
      VENDAERP_AUTHORIZATION_TOKEN: 'must-not-log-token',
      VENDAERP_USER: 'must-not-log-user',
      VENDAERP_APP: 'must-not-log-app',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const stdout = [];
  const stderr = [];
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => stdout.push(chunk));
  child.stderr.on('data', (chunk) => stderr.push(chunk));

  child.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 9,
    method: 'tools/call',
    params: {
      name: 'vendaerp_search_products',
      arguments: { pageSize: 101, skip: 0 },
    },
  }) + '\n');

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('stdio error log timeout')), 3000);
    const check = setInterval(() => {
      if (stdout.join('').includes('"id":9')) {
        clearTimeout(timer);
        clearInterval(check);
        resolve();
      }
    }, 10);
  });
  child.stdin.end();
  child.kill('SIGTERM');

  const serializedOut = stdout.join('').trim().split(/\n+/).map(JSON.parse);
  const failedCall = serializedOut.find((line) => line.id === 9);
  assert.equal(failedCall.error, undefined);
  assert.equal(failedCall.result.isError, true);
  assert.deepEqual(failedCall.result.structuredContent, {
    error: { code: 'invalid-input' },
  });
  assert.equal(failedCall.result.content[0].text, '{"error":"invalid-input"}');

  const serializedErr = stderr.join('');
  assert.match(serializedErr, /"event":"wandora\.vendaerp-readonly\.tool-error"/);
  assert.match(serializedErr, /"tool":"vendaerp_search_products"/);
  assert.match(serializedErr, /"code":"invalid-input"/);
  assert.equal(serializedErr.includes('must-not-log-token'), false);
  assert.equal(serializedErr.includes('must-not-log-user'), false);
  assert.equal(serializedErr.includes('must-not-log-app'), false);
  assert.equal(serializedErr.includes('pageSize'), false);
});