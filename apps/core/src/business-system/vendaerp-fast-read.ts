import type { DeterministicReadNormalizedResult } from '../agent-runtime/deterministic-read.js';
import type { RuntimeReadCapabilityAdapter } from '../agent-runtime/runtime-read-capability-binding.js';
import type { RuntimeReadTool } from '../agent-runtime/task-runtime.js';
import type {
  BusinessCapability,
  ProductSelector,
  SemanticSelector,
  StockSelector,
} from '../semantic-routing/contracts.js';

const VENDAERP_PRODUCT_TOOL = 'vendaerp_search_products';
const VENDAERP_STOCK_TOOL = 'vendaerp_get_product_stock';
const MAX_PRODUCTS = 5;
const MAX_STOCK_ROWS = 8;

export const VENDAERP_FAST_READ_CAPABILITIES = [
  'business.products.search',
  'business.products.price',
  'business.stock.read',
] as const satisfies readonly BusinessCapability[];

type ProductRow = {
  name: string;
  code?: string;
  barcode?: string;
  category?: string;
  brand?: string;
  unit?: string;
  salePrice?: number;
};

type StockRow = {
  location: string;
  quantity: number;
  lastUpdatedAt?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized || normalized.length > max) return undefined;
  return normalized;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function brl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function productRow(value: unknown): ProductRow {
  if (!isRecord(value)) throw new Error('vendaerp_fast_read_invalid_product_result');
  const name = boundedText(value.name, 160);
  if (!name) throw new Error('vendaerp_fast_read_invalid_product_result');

  const code = boundedText(value.code, 80);
  const barcode = boundedText(value.barcode, 128);
  const category = boundedText(value.category, 120);
  const brand = boundedText(value.brand, 120);
  const unit = boundedText(value.unit, 40);
  const salePrice = finiteNumber(value.salePrice);

  return {
    name,
    ...(code ? { code } : {}),
    ...(barcode ? { barcode } : {}),
    ...(category ? { category } : {}),
    ...(brand ? { brand } : {}),
    ...(unit ? { unit } : {}),
    ...(salePrice !== undefined ? { salePrice } : {}),
  };
}

function stockRow(value: unknown): StockRow {
  if (!isRecord(value)) throw new Error('vendaerp_fast_read_invalid_stock_result');
  const location = boundedText(value.location, 512);
  const quantity = finiteNumber(value.quantity);
  const lastUpdatedAt = boundedText(value.lastUpdatedAt, 128);
  if (!location || quantity === undefined) {
    throw new Error('vendaerp_fast_read_invalid_stock_result');
  }
  return {
    location,
    quantity,
    ...(lastUpdatedAt ? { lastUpdatedAt } : {}),
  };
}

function productFact(product: ProductRow, index: number): { label: string; value: string } {
  const details: string[] = [];
  if (product.code) details.push(`Código ${product.code}`);
  if (product.category) details.push(`Categoria ${product.category}`);
  if (product.brand) details.push(`Marca ${product.brand}`);
  if (product.unit) details.push(`Unidade ${product.unit}`);
  if (product.salePrice !== undefined) details.push(`Preço ${brl(product.salePrice)}`);


  return {
    label: `${index + 1}. ${product.name}`,
    value: details.length > 0 ? details.join(' · ') : 'Sem detalhes comerciais adicionais.',
  };
}

function exactVendaErpProductTool(tool: RuntimeReadTool): boolean {
  return tool.providerToolName === VENDAERP_PRODUCT_TOOL;
}

function exactVendaErpStockTool(tool: RuntimeReadTool): boolean {
  return tool.providerToolName === VENDAERP_STOCK_TOOL;
}

function productSelector(selector: SemanticSelector | null): ProductSelector | null {
  return selector?.kind === 'product' ? selector : null;
}

function stockSelector(selector: SemanticSelector | null): StockSelector | null {
  return selector?.kind === 'stock' ? selector : null;
}

function normalizedName(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

function selectorMatches(product: ProductRow, selector: ProductSelector): boolean {
  switch (selector.by) {
    case 'name':
      return normalizedName(product.name) === normalizedName(selector.value);
    case 'code':
      return product.code === selector.value;
    case 'barcode':
      return product.barcode === selector.value;
  }
}

function selectorInput(selector: ProductSelector): Record<string, unknown> {
  return {
    [selector.by]: selector.value,
    pageSize: MAX_PRODUCTS,
    skip: 0,
  };
}

function clarificationOption(product: ProductRow): string {
  return product.code ? `${product.name} — código ${product.code}` : product.name;
}

function selectedProductResult(
  product: ProductRow,
  capability: BusinessCapability,
): DeterministicReadNormalizedResult {
  if (capability === 'business.products.price') {
    if (product.salePrice === undefined) {
      return {
        kind: 'not_found',
        message: 'O produto foi identificado, mas o preço de venda não está disponível.',
      };
    }
    return {
      kind: 'facts',
      subject: product.name,
      facts: [
        ...(product.code ? [{ label: 'Código', value: product.code }] : []),
        { label: 'Preço', value: brl(product.salePrice) },
      ],
    };
  }

  return {
    kind: 'facts',
    subject: 'Produto selecionado',
    facts: [productFact(product, 0)],
  };
}

export function createVendaErpFastReadCapabilityAdapter(): RuntimeReadCapabilityAdapter {
  return {
    capabilitiesFor(tool) {
      if (exactVendaErpProductTool(tool)) {
        return ['business.products.search', 'business.products.price'];
      }
      if (exactVendaErpStockTool(tool)) {
        return ['business.stock.read'];
      }
      return [];
    },

    async execute({ tool, capability, selector }): Promise<DeterministicReadNormalizedResult> {
      if (capability === 'business.stock.read') {
        if (!exactVendaErpStockTool(tool)) {
          throw new Error('vendaerp_fast_read_capability_unavailable');
        }
        const selectedStock = stockSelector(selector);
        if (!selectedStock) {
          throw new Error('vendaerp_fast_read_selector_required');
        }

        const result = await tool.execute({
          productCode: selectedStock.product.value,
          location: selectedStock.location,
        });
        if (!Array.isArray(result) || result.length > MAX_STOCK_ROWS) {
          throw new Error('vendaerp_fast_read_invalid_stock_result');
        }
        const rows = result.map(stockRow);
        if (rows.length === 0) {
          return {
            kind: 'not_found',
            message: 'Nenhum saldo de estoque foi retornado para o produto e local informados.',
          };
        }
        if (rows.length > 1) {
          return {
            kind: 'clarification',
            prompt: 'A consulta retornou mais de um saldo de estoque. Qual local você quer considerar?',
            options: rows.map((row) => row.location).slice(0, MAX_STOCK_ROWS),
          };
        }

        const row = rows[0]!;
        return {
          kind: 'facts',
          subject: `Estoque do produto ${selectedStock.product.value}`,
          facts: [
            { label: 'Local', value: row.location },
            { label: 'Quantidade', value: String(row.quantity) },
            ...(row.lastUpdatedAt ? [{ label: 'Atualizado em', value: row.lastUpdatedAt }] : []),
          ],
        };
      }

      if (
        (capability !== 'business.products.search' && capability !== 'business.products.price')
        || !exactVendaErpProductTool(tool)
      ) {
        throw new Error('vendaerp_fast_read_capability_unavailable');
      }

      const selected = productSelector(selector);
      if (capability === 'business.products.price' && !selected) {
        throw new Error('vendaerp_fast_read_selector_required');
      }

      const result = await tool.execute(
        selected
          ? selectorInput(selected)
          : { pageSize: MAX_PRODUCTS, skip: 0 },
      );
      if (!Array.isArray(result)) {
        throw new Error('vendaerp_fast_read_invalid_product_result');
      }

      const products = result.slice(0, MAX_PRODUCTS).map(productRow);
      if (!selected) {
        if (products.length === 0) {
          return {
            kind: 'not_found',
            message: 'Nenhum produto foi retornado pela consulta limitada do catálogo.',
          };
        }
        return {
          kind: 'facts',
          subject: 'Primeiros produtos do catálogo',
          facts: products.map(productFact),
        };
      }

      const exactMatches = products.filter((product) => selectorMatches(product, selected));
      if (exactMatches.length === 0) {
        return {
          kind: 'not_found',
          message: 'Nenhum produto corresponde exatamente ao seletor autorizado.',
        };
      }
      if (exactMatches.length > 1) {
        return {
          kind: 'clarification',
          prompt: 'Encontrei mais de um produto correspondente. Qual deles você quer consultar?',
          options: exactMatches.map(clarificationOption),
        };
      }

      return selectedProductResult(exactMatches[0]!, capability);
    },
  };
}
