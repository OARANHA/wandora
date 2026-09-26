import type { DeterministicReadNormalizedResult } from '../agent-runtime/deterministic-read.js';
import type { RuntimeReadCapabilityAdapter } from '../agent-runtime/runtime-read-capability-binding.js';
import type { RuntimeReadTool } from '../agent-runtime/task-runtime.js';
import type { BusinessCapability } from '../semantic-routing/contracts.js';

const VENDAERP_PRODUCT_TOOL = 'vendaerp_search_products';
const MAX_PRODUCTS = 5;

export const VENDAERP_FAST_READ_CAPABILITIES = [
  'business.products.search',
] as const satisfies readonly BusinessCapability[];

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

function productFact(value: unknown, index: number): { label: string; value: string } {
  if (!isRecord(value)) throw new Error('vendaerp_fast_read_invalid_product_result');
  const name = boundedText(value.name, 80);
  if (!name) throw new Error('vendaerp_fast_read_invalid_product_result');

  const details: string[] = [];
  const code = boundedText(value.code, 80);
  const category = boundedText(value.category, 120);
  const brand = boundedText(value.brand, 120);
  const unit = boundedText(value.unit, 40);
  const salePrice = finiteNumber(value.salePrice);
  const stockBalance = finiteNumber(value.stockBalance);

  if (code) details.push(`Código ${code}`);
  if (category) details.push(`Categoria ${category}`);
  if (brand) details.push(`Marca ${brand}`);
  if (unit) details.push(`Unidade ${unit}`);
  if (salePrice !== undefined) details.push(`Preço ${brl(salePrice)}`);
  if (stockBalance !== undefined) details.push(`Estoque ${stockBalance}`);

  return {
    label: `${index + 1}. ${name}`,
    value: details.length > 0 ? details.join(' · ') : 'Sem detalhes comerciais adicionais.',
  };
}

function exactVendaErpProductTool(tool: RuntimeReadTool): boolean {
  return tool.name === VENDAERP_PRODUCT_TOOL;
}

export function createVendaErpFastReadCapabilityAdapter(): RuntimeReadCapabilityAdapter {
  return {
    capabilitiesFor(tool) {
      return exactVendaErpProductTool(tool)
        ? VENDAERP_FAST_READ_CAPABILITIES
        : [];
    },

    async execute({ tool, capability }): Promise<DeterministicReadNormalizedResult> {
      if (
        capability !== 'business.products.search'
        || !exactVendaErpProductTool(tool)
      ) {
        throw new Error('vendaerp_fast_read_capability_unavailable');
      }

      const result = await tool.execute({ pageSize: MAX_PRODUCTS, skip: 0 });
      if (!Array.isArray(result)) {
        throw new Error('vendaerp_fast_read_invalid_product_result');
      }
      if (result.length === 0) {
        return {
          kind: 'not_found',
          message: 'Nenhum produto foi retornado pela consulta limitada do catálogo.',
        };
      }

      return {
        kind: 'facts',
        subject: 'Primeiros produtos do catálogo',
        facts: result.slice(0, MAX_PRODUCTS).map(productFact),
      };
    },
  };
}
