import type {
  BusinessSystemCompany, BusinessSystemOrder, BusinessSystemPage, BusinessSystemParty,
  BusinessSystemPriceTable, BusinessSystemProduct, BusinessSystemProductPrice,
  BusinessSystemReadProvider, BusinessSystemStockLevel,
} from './contracts.js';

type FetchLike = typeof fetch;
type JsonRecord = Record<string, unknown>;

export type VendaErpCredentials = { authorizationToken: string; user: string; app: string };
export type VendaErpReadProviderOptions = { baseUrl: string; credentials: VendaErpCredentials; fetchImpl?: FetchLike; requestTimeoutMs?: number };
export type BusinessSystemProviderErrorCode = 'invalid-input' | 'unauthorized' | 'rate-limited' | 'provider-unavailable' | 'invalid-provider-response';

export class BusinessSystemProviderError extends Error {
  constructor(readonly code: BusinessSystemProviderErrorCode, message: string) {
    super(message);
    this.name = 'BusinessSystemProviderError';
  }
}

function record(value: unknown): JsonRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as JsonRecord : undefined;
}
function array(value: unknown): JsonRecord[] | undefined {
  return Array.isArray(value) && value.every((item) => record(item)) ? value as JsonRecord[] : undefined;
}
function text(value: unknown): string | undefined { return typeof value === 'string' && value.trim() ? value.trim() : undefined; }
function finiteNumber(value: unknown): number | undefined { return typeof value === 'number' && Number.isFinite(value) ? value : undefined; }
function bool(value: unknown): boolean { return value === true; }
function optional<T>(value: T | undefined, key: string): Record<string, T> { return value === undefined ? {} : { [key]: value }; }
function requireText(value: string, field: string, max = 8192): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new BusinessSystemProviderError('invalid-input', 'Invalid ' + field + '.');
  return normalized;
}
function page(input?: BusinessSystemPage): { pageSize: number; skip: number } {
  const pageSize = input?.pageSize ?? 100;
  const skip = input?.skip ?? 0;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new BusinessSystemProviderError('invalid-input', 'pageSize must be an integer from 1 to 100.');
  if (!Number.isInteger(skip) || skip < 0) throw new BusinessSystemProviderError('invalid-input', 'skip must be a non-negative integer.');
  return { pageSize, skip };
}

export class VendaErpReadProvider implements BusinessSystemReadProvider {
  private readonly baseUrl: URL;
  private readonly credentials: VendaErpCredentials;
  private readonly fetchImpl: FetchLike;
  private readonly requestTimeoutMs: number;

  constructor(options: VendaErpReadProviderOptions) {
    const baseUrl = new URL(options.baseUrl);
    if (baseUrl.protocol !== 'https:') throw new BusinessSystemProviderError('invalid-input', 'VendaERP base URL must use HTTPS.');
    baseUrl.pathname = baseUrl.pathname.replace(/\/$/, '');
    this.baseUrl = baseUrl;
    this.credentials = {
      authorizationToken: requireText(options.credentials.authorizationToken, 'authorization token'),
      user: requireText(options.credentials.user, 'user', 512),
      app: requireText(options.credentials.app, 'app', 512),
    };
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 5000;
  }

  private async getJson(path: string, query: Record<string, string | number | boolean | undefined> = {}): Promise<unknown> {
    const url = new URL(this.baseUrl);
    url.pathname = this.baseUrl.pathname + path;
    for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: { accept: 'application/json', 'Authorization-Token': this.credentials.authorizationToken, User: this.credentials.user, App: this.credentials.app, 'user-agent': 'Wandora-Business-System-Adapter/1.0' },
        redirect: 'error',
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });
    } catch {
      throw new BusinessSystemProviderError('provider-unavailable', 'Business system provider is unavailable.');
    }
    if (response.status === 401 || response.status === 403) throw new BusinessSystemProviderError('unauthorized', 'Business system credentials were rejected.');
    if (response.status === 429) throw new BusinessSystemProviderError('rate-limited', 'Business system request limit was reached.');
    if (!response.ok) throw new BusinessSystemProviderError('provider-unavailable', 'Business system provider returned an error.');
    const body = await response.text();
    if (!body.trim()) return null;
    try { return JSON.parse(body); } catch { throw new BusinessSystemProviderError('invalid-provider-response', 'Business system provider returned invalid JSON.'); }
  }

  async probe(): Promise<{ connected: boolean }> { await this.getJson('/api/request/Public/ping'); return { connected: true }; }

  async listCompanies(): Promise<BusinessSystemCompany[]> {
    const rows = array(await this.getJson('/api/request/Empresas/GetTodasEmpresas'));
    if (!rows) throw new BusinessSystemProviderError('invalid-provider-response', 'Business system company response is invalid.');
    return rows.map((row) => ({ ...optional(text(row.id), 'externalRef'), ...optional(text(row.nomeFantasia), 'displayName'), ...optional(text(row.razaoSocial), 'legalName'), ...optional(text(row.cnpj), 'taxId') }));
  }

  async searchProducts(input: BusinessSystemPage & { code?: string; name?: string; category?: string; brand?: string; barcode?: string } = {}): Promise<BusinessSystemProduct[]> {
    const rows = array(await this.getJson('/api/request/Produtos/Pesquisar', { codigo: input.code, nome: input.name, categoria: input.category, marca: input.brand, ean: input.barcode, ...page(input) }));
    if (!rows) throw new BusinessSystemProviderError('invalid-provider-response', 'Business system product response is invalid.');
    return rows.map((row) => {
      const name = text(row.nome);
      if (!name) throw new BusinessSystemProviderError('invalid-provider-response', 'Business system product is missing its name.');
      return { name, ...optional(text(row.id), 'externalRef'), ...optional(text(row.codigo), 'code'), ...optional(text(row.ean), 'barcode'), ...optional(text(row.categoria), 'category'), ...optional(text(row.marca), 'brand'), ...optional(text(row.estoqueUnidade) ?? text(row.unidadeComercial), 'unit'), ...optional(finiteNumber(row.precoVenda), 'salePrice'), ...optional(finiteNumber(row.precoMinimoVenda), 'minimumSalePrice'), ...optional(finiteNumber(row.estoqueSaldo), 'stockBalance') };
    });
  }

  async getProductStock(input: { productCode: string; location: string }): Promise<BusinessSystemStockLevel[]> {
    const productCode = requireText(input.productCode, 'product code', 512);
    const location = requireText(input.location, 'location', 512);
    const rows = array(await this.getJson('/api/request/Produtos/GetSaldo', { produtoCodigo: productCode, deposito: location }));
    if (!rows) throw new BusinessSystemProviderError('invalid-provider-response', 'Business system stock response is invalid.');
    return rows.map((row) => ({ location: text(row.deposito) ?? location, quantity: finiteNumber(row.saldo) ?? 0, ...optional(text(row.lastUpdate), 'lastUpdatedAt') }));
  }

  async listPriceTables(input: BusinessSystemPage & { name?: string } = {}): Promise<BusinessSystemPriceTable[]> {
    const rows = array(await this.getJson('/api/request/TabelasPreco/Pesquisar', { nome: input.name, ...page(input) }));
    if (!rows) throw new BusinessSystemProviderError('invalid-provider-response', 'Business system price-table response is invalid.');
    return rows.map((row) => { const name = text(row.nome); if (!name) throw new BusinessSystemProviderError('invalid-provider-response', 'Business system price table is missing its name.'); return { name, ...optional(text(row.id), 'externalRef') }; });
  }

  async searchPriceTableProducts(input: BusinessSystemPage & { priceTableExternalRef: string; product?: string; category?: string; brand?: string }): Promise<BusinessSystemProductPrice[]> {
    const rows = array(await this.getJson('/api/request/TabelasPreco/Produtos', { tabelaId: requireText(input.priceTableExternalRef, 'price table reference', 512), produto: input.product, categoria: input.category, marca: input.brand, ...page(input) }));
    if (!rows) throw new BusinessSystemProviderError('invalid-provider-response', 'Business system product-price response is invalid.');
    return rows.map((row) => ({ ...optional(text(row.codigoProduto), 'productCode'), ...optional(text(row.produto), 'productName'), ...optional(finiteNumber(row.precoVenda), 'salePrice') }));
  }

  async searchParties(input: BusinessSystemPage & { displayName?: string; taxId?: string; email?: string; customer?: boolean; supplier?: boolean } = {}): Promise<BusinessSystemParty[]> {
    const rows = array(await this.getJson('/api/request/Pessoas/Pesquisar', { nomefantasia: input.displayName, cpfcnpj: input.taxId, email: input.email, cliente: input.customer, fornecedor: input.supplier, ...page(input) }));
    if (!rows) throw new BusinessSystemProviderError('invalid-provider-response', 'Business system party response is invalid.');
    return rows.map((row) => ({ ...optional(text(row.id), 'externalRef'), ...optional(text(row.nomeFantasia), 'displayName'), ...optional(text(row.razaoSocial), 'legalName'), ...optional(text(row.cnpJ_CPF), 'taxId'), ...optional(text(row.email), 'email'), ...optional(text(row.celular) ?? text(row.telefone), 'phone'), customer: bool(row.cliente), supplier: bool(row.fornecedor) || bool(row.fonecedor) }));
  }

  async searchOrders(input: BusinessSystemPage & { code?: number; customerName?: string; customerTaxId?: string; status?: string; createdFrom?: string; createdTo?: string } = {}): Promise<BusinessSystemOrder[]> {
    const rows = array(await this.getJson('/api/request/Pedidos/Pesquisar', { codigo: input.code, cliente: input.customerName, cpf_cnpj: input.customerTaxId, status: input.status, dataInicial: input.createdFrom, dataFinal: input.createdTo, filtrarPor: 0, ...page(input) }));
    if (!rows) throw new BusinessSystemProviderError('invalid-provider-response', 'Business system order response is invalid.');
    return rows.map((row) => {
      const code = finiteNumber(row.codigo);
      if (code === undefined) throw new BusinessSystemProviderError('invalid-provider-response', 'Business system order is missing its code.');
      return { code, ...optional(text(row.id), 'externalRef'), ...optional(text(row.cliente), 'customerName'), ...optional(text(row.status), 'status'), ...optional(finiteNumber(row.valorFinal), 'total'), ...optional(text(row.data), 'createdAt'), ...optional(text(row.numeroNFe), 'invoiceNumber') };
    });
  }
}
