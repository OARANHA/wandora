import readline from 'node:readline';

export const VENDAERP_HOST_SUFFIX = '.vendaerp.com.br';
export const DEFAULT_TIMEOUT_MS = 5000;
const TENANT_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const MAX_SECRET = 8192;
const ENV = Object.freeze({
  authorizationToken: 'VENDAERP_AUTHORIZATION_TOKEN',
  user: 'VENDAERP_USER',
  app: 'VENDAERP_APP',
});

export class VendaErpAdapterError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'VendaErpAdapterError';
    this.code = code;
  }
}

function object(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value
    : undefined;
}
function records(value) {
  return Array.isArray(value) && value.every((item) => object(item))
    ? value
    : undefined;
}

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function number(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function bool(value) {
  return value === true;
}

function optional(value, key) {
  return value === undefined ? {} : { [key]: value };
}

function requiredText(value, field, max = MAX_SECRET) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized || normalized.length > max) {
    throw new VendaErpAdapterError('invalid-input', `Invalid ${field}.`);
  }
  return normalized;
}
function page(input = {}) {
  const pageSize = input.pageSize ?? 100;
  const skip = input.skip ?? 0;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new VendaErpAdapterError(
      'invalid-input',
      'pageSize must be an integer from 1 to 100.',
    );
  }
  if (!Number.isInteger(skip) || skip < 0) {
    throw new VendaErpAdapterError(
      'invalid-input',
      'skip must be a non-negative integer.',
    );
  }
  return { pageSize, skip };
}

export function vendaErpOriginForTenant(value) {
  const tenant = requiredText(value, 'tenant', 63).toLowerCase();
  if (!TENANT_RE.test(tenant)) {
    throw new VendaErpAdapterError('invalid-input', 'Invalid VendaERP tenant.');
  }
  return `https://${tenant}${VENDAERP_HOST_SUFFIX}`;
}

export function tenantFromArgv(argv = process.argv.slice(2)) {
  const indexes = argv.reduce((result, item, index) => (
    item === '--tenant' ? [...result, index] : result
  ), []);
  if (indexes.length !== 1) {
    throw new VendaErpAdapterError('invalid-input', 'Exactly one --tenant argument is required.');
  }
  const value = argv[indexes[0] + 1];
  if (!value || value.startsWith('--')) {
    throw new VendaErpAdapterError('invalid-input', 'VendaERP tenant value is required.');
  }
  vendaErpOriginForTenant(value);
  return value.toLowerCase();
}

function credentialsFromEnv(env = process.env) {
  return {
    authorizationToken: requiredText(
      env[ENV.authorizationToken],
      'authorization token',
    ),
    user: requiredText(env[ENV.user], 'user', 512),
    app: requiredText(env[ENV.app], 'app', 512),
  };
}
const PAGE_PROPERTIES = Object.freeze({
  pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 100 },
  skip: { type: 'integer', minimum: 0, default: 0 },
});

function readTool(name, title, description, properties = {}, required = []) {
  return Object.freeze({
    name,
    title,
    description,
    inputSchema: {
      type: 'object',
      properties,
      ...(required.length ? { required } : {}),
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
    },
  });
}

export const TOOL_DEFINITIONS = Object.freeze([
  readTool(
    'vendaerp_probe',
    'VendaERP Probe',
    'Check whether the configured VendaERP read connection is accepted.',
  ),
  readTool(
    'vendaerp_list_companies',
    'VendaERP List Companies',
    'List companies visible to the configured VendaERP account.',
  ),
  readTool(
    'vendaerp_search_products',
    'VendaERP Search Products',
    'Search VendaERP products through the bounded read-only contract.',
    {
      code: { type: 'string' },
      name: { type: 'string' },
      category: { type: 'string' },
      brand: { type: 'string' },
      barcode: { type: 'string' },
      ...PAGE_PROPERTIES,
    },
  ),
  readTool(
    'vendaerp_get_product_stock',
    'VendaERP Get Product Stock',
    'Read product stock for one product code and one location.',
    {
      productCode: { type: 'string', minLength: 1, maxLength: 512 },
      location: { type: 'string', minLength: 1, maxLength: 512 },
    },
    ['productCode', 'location'],
  ),
  readTool(
    'vendaerp_list_price_tables',
    'VendaERP List Price Tables',
    'List VendaERP price tables.',
    { name: { type: 'string' }, ...PAGE_PROPERTIES },
  ),
  readTool(
    'vendaerp_search_price_table_products',
    'VendaERP Search Price Table Products',
    'Search product prices in one VendaERP price table.',
    {
      priceTableExternalRef: { type: 'string', minLength: 1, maxLength: 512 },
      product: { type: 'string' },
      category: { type: 'string' },
      brand: { type: 'string' },
      ...PAGE_PROPERTIES,
    },
    ['priceTableExternalRef'],
  ),
  readTool(
    'vendaerp_search_parties',
    'VendaERP Search Parties',
    'Search customers and suppliers through the bounded read-only contract.',
    {
      displayName: { type: 'string' },
      taxId: { type: 'string' },
      email: { type: 'string' },
      customer: { type: 'boolean' },
      supplier: { type: 'boolean' },
      ...PAGE_PROPERTIES,
    },
  ),
  readTool(
    'vendaerp_search_orders',
    'VendaERP Search Orders',
    'Search VendaERP orders without creating or changing them.',
    {
      code: { type: 'integer' },
      customerName: { type: 'string' },
      customerTaxId: { type: 'string' },
      status: { type: 'string' },
      createdFrom: { type: 'string' },
      createdTo: { type: 'string' },
      ...PAGE_PROPERTIES,
    },
  ),
]);

const TOOL_NAMES = new Set(TOOL_DEFINITIONS.map((tool) => tool.name));

export function createVendaErpClient({
  tenant,
  credentials,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const origin = vendaErpOriginForTenant(tenant);
  const safeCredentials = credentials ?? credentialsFromEnv();
  const normalized = {
    authorizationToken: requiredText(
      safeCredentials.authorizationToken,
      'authorization token',
    ),
    user: requiredText(safeCredentials.user, 'user', 512),
    app: requiredText(safeCredentials.app, 'app', 512),
  };
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 15000) {
    throw new VendaErpAdapterError('invalid-input', 'Invalid request timeout.');
  }

  async function getJson(path, query = {}) {
    if (typeof path !== 'string' || !path.startsWith('/api/request/')) {
      throw new VendaErpAdapterError('invalid-input', 'Invalid provider path.');
    }
    const url = new URL(path, origin);
    if (url.origin !== origin) {
      throw new VendaErpAdapterError('invalid-input', 'Invalid provider origin.');
    }
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    let response;
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Authorization-Token': normalized.authorizationToken,
          User: normalized.user,
          App: normalized.app,
          'user-agent': 'Wandora-VendaERP-ReadOnly-MCP/1.0',
        },
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new VendaErpAdapterError(
        'provider-unavailable',
        'Business system provider is unavailable.',
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new VendaErpAdapterError(
        'unauthorized',
        'Business system credentials were rejected.',
      );
    }
    if (response.status === 429) {
      throw new VendaErpAdapterError(
        'rate-limited',
        'Business system request limit was reached.',
      );
    }
    if (!response.ok) {
      throw new VendaErpAdapterError(
        'provider-unavailable',
        'Business system provider returned an error.',
      );
    }

    const body = await response.text();
    if (!body.trim()) return null;
    try {
      return JSON.parse(body);
    } catch {
      throw new VendaErpAdapterError(
        'invalid-provider-response',
        'Business system provider returned invalid JSON.',
      );
    }
  }
  return {
    async probe() {
      await getJson('/api/request/Public/ping');
      return { connected: true };
    },

    async listCompanies() {
      const rows = records(
        await getJson('/api/request/Empresas/GetTodasEmpresas'),
      );
      if (!rows) {
        throw new VendaErpAdapterError(
          'invalid-provider-response',
          'Business system company response is invalid.',
        );
      }
      return rows.map((row) => ({
        ...optional(text(row.id), 'externalRef'),
        ...optional(text(row.nomeFantasia), 'displayName'),
        ...optional(text(row.razaoSocial), 'legalName'),
        ...optional(text(row.cnpj), 'taxId'),
      }));
    },

    async searchProducts(input = {}) {
      const rows = records(
        await getJson('/api/request/Produtos/Pesquisar', {
          codigo: input.code,
          nome: input.name,
          categoria: input.category,
          marca: input.brand,
          ean: input.barcode,
          ...page(input),
        }),
      );
      if (!rows) {
        throw new VendaErpAdapterError(
          'invalid-provider-response',
          'Business system product response is invalid.',
        );
      }
      return rows.map((row) => {
        const name = text(row.nome);
        if (!name) {
          throw new VendaErpAdapterError(
            'invalid-provider-response',
            'Business system product is missing its name.',
          );
        }
        return {
          name,
          ...optional(text(row.id), 'externalRef'),
          ...optional(text(row.codigo), 'code'),
          ...optional(text(row.ean), 'barcode'),
          ...optional(text(row.categoria), 'category'),
          ...optional(text(row.marca), 'brand'),
          ...optional(
            text(row.estoqueUnidade) ?? text(row.unidadeComercial),
            'unit',
          ),
          ...optional(number(row.precoVenda), 'salePrice'),
          ...optional(number(row.precoMinimoVenda), 'minimumSalePrice'),
          ...optional(number(row.estoqueSaldo), 'stockBalance'),
        };
      });
    },
    async getProductStock(input) {
      const productCode = requiredText(input?.productCode, 'product code', 512);
      const location = requiredText(input?.location, 'location', 512);
      const rows = records(
        await getJson('/api/request/Produtos/GetSaldo', {
          produtoCodigo: productCode,
          deposito: location,
        }),
      );
      if (!rows) {
        throw new VendaErpAdapterError(
          'invalid-provider-response',
          'Business system stock response is invalid.',
        );
      }
      return rows.map((row) => ({
        location: text(row.deposito) ?? location,
        quantity: number(row.saldo) ?? 0,
        ...optional(text(row.lastUpdate), 'lastUpdatedAt'),
      }));
    },

    async listPriceTables(input = {}) {
      const rows = records(
        await getJson('/api/request/TabelasPreco/Pesquisar', {
          nome: input.name,
          ...page(input),
        }),
      );
      if (!rows) {
        throw new VendaErpAdapterError(
          'invalid-provider-response',
          'Business system price-table response is invalid.',
        );
      }
      return rows.map((row) => {
        const name = text(row.nome);
        if (!name) {
          throw new VendaErpAdapterError(
            'invalid-provider-response',
            'Business system price table is missing its name.',
          );
        }
        return { name, ...optional(text(row.id), 'externalRef') };
      });
    },

    async searchPriceTableProducts(input = {}) {
      const rows = records(
        await getJson('/api/request/TabelasPreco/Produtos', {
          tabelaId: requiredText(
            input.priceTableExternalRef,
            'price table reference',
            512,
          ),
          produto: input.product,
          categoria: input.category,
          marca: input.brand,
          ...page(input),
        }),
      );
      if (!rows) {
        throw new VendaErpAdapterError(
          'invalid-provider-response',
          'Business system product-price response is invalid.',
        );
      }
      return rows.map((row) => ({
        ...optional(text(row.codigoProduto), 'productCode'),
        ...optional(text(row.produto), 'productName'),
        ...optional(number(row.precoVenda), 'salePrice'),
      }));
    },

    async searchParties(input = {}) {
      const rows = records(
        await getJson('/api/request/Pessoas/Pesquisar', {
          nomefantasia: input.displayName,
          cpfcnpj: input.taxId,
          email: input.email,
          cliente: input.customer,
          fornecedor: input.supplier,
          ...page(input),
        }),
      );
      if (!rows) {
        throw new VendaErpAdapterError(
          'invalid-provider-response',
          'Business system party response is invalid.',
        );
      }
      return rows.map((row) => ({
        ...optional(text(row.id), 'externalRef'),
        ...optional(text(row.nomeFantasia), 'displayName'),
        ...optional(text(row.razaoSocial), 'legalName'),
        ...optional(text(row.cnpJ_CPF), 'taxId'),
        ...optional(text(row.email), 'email'),
        ...optional(text(row.celular) ?? text(row.telefone), 'phone'),
        customer: bool(row.cliente),
        supplier: bool(row.fornecedor) || bool(row.fonecedor),
      }));
    },
    async searchOrders(input = {}) {
      const rows = records(
        await getJson('/api/request/Pedidos/Pesquisar', {
          codigo: input.code,
          cliente: input.customerName,
          cpf_cnpj: input.customerTaxId,
          status: input.status,
          dataInicial: input.createdFrom,
          dataFinal: input.createdTo,
          filtrarPor: 0,
          ...page(input),
        }),
      );
      if (!rows) {
        throw new VendaErpAdapterError(
          'invalid-provider-response',
          'Business system order response is invalid.',
        );
      }
      return rows.map((row) => {
        const code = number(row.codigo);
        if (code === undefined) {
          throw new VendaErpAdapterError(
            'invalid-provider-response',
            'Business system order is missing its code.',
          );
        }
        return {
          code,
          ...optional(text(row.id), 'externalRef'),
          ...optional(text(row.cliente), 'customerName'),
          ...optional(text(row.status), 'status'),
          ...optional(number(row.valorFinal), 'total'),
          ...optional(text(row.data), 'createdAt'),
          ...optional(text(row.numeroNFe), 'invoiceNumber'),
        };
      });
    },
  };
}

export async function executeVendaErpTool(
  name,
  args = {},
  options = {},
) {
  if (!TOOL_NAMES.has(name)) {
    throw new VendaErpAdapterError('invalid-input', 'Unknown VendaERP tool.');
  }
  if (!object(args)) {
    throw new VendaErpAdapterError(
      'invalid-input',
      'Tool arguments must be an object.',
    );
  }
  const client = createVendaErpClient(options);
  switch (name) {
    case 'vendaerp_probe':
      return client.probe();
    case 'vendaerp_list_companies':
      return client.listCompanies();
    case 'vendaerp_search_products':
      return client.searchProducts(args);
    case 'vendaerp_get_product_stock':
      return client.getProductStock(args);
    case 'vendaerp_list_price_tables':
      return client.listPriceTables(args);
    case 'vendaerp_search_price_table_products':
      return client.searchPriceTableProducts(args);
    case 'vendaerp_search_parties':
      return client.searchParties(args);
    case 'vendaerp_search_orders':
      return client.searchOrders(args);
    default:
      throw new VendaErpAdapterError('invalid-input', 'Unknown VendaERP tool.');
  }
}
function rpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function rpcError(id, error) {
  const safe = error instanceof VendaErpAdapterError
    ? { code: error.code, message: error.message }
    : { code: 'internal-error', message: 'VendaERP tool failed.' };
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: -32000,
      message: safe.message,
      data: { code: safe.code },
    },
  };
}

async function handleMessage(message, options = {}) {
  const id = message?.id;
  if (message?.method === 'initialize') {
    return rpcResult(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: {
        name: 'wandora-vendaerp-readonly',
        version: '1.0.0',
      },
    });
  }
  if (message?.method === 'notifications/initialized') return null;
  if (message?.method === 'tools/list') {
    return rpcResult(id, { tools: TOOL_DEFINITIONS });
  }
  if (message?.method === 'tools/call') {
    const name = text(message?.params?.name);
    if (!name) {
      return rpcError(
        id,
        new VendaErpAdapterError('invalid-input', 'Tool name is required.'),
      );
    }
    try {
      const result = await executeVendaErpTool(
        name,
        message?.params?.arguments ?? {},
        options,
      );
      return rpcResult(id, {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: { data: result },
      });
    } catch (error) {
      return rpcError(id, error);
    }
  }
  return rpcError(
    id,
    new VendaErpAdapterError('invalid-input', 'Unsupported MCP method.'),
  );
}

export async function runStdio(options = {}) {
  const rl = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let message;
    try {
      message = JSON.parse(trimmed);
    } catch {
      process.stdout.write(
        JSON.stringify(rpcError(null, new VendaErpAdapterError(
          'invalid-input',
          'Invalid JSON-RPC payload.',
        ))) + '\n',
      );
      continue;
    }
    const response = await handleMessage(message, options);
    if (response) process.stdout.write(JSON.stringify(response) + '\n');
  }
}

const invokedAsScript =
  process.argv[1] &&
  new URL(import.meta.url).pathname === new URL(
    `file://${process.argv[1]}`,
  ).pathname;

if (invokedAsScript) {
  runStdio({ tenant: tenantFromArgv() }).catch(() => {
    process.exitCode = 1;
  });
}