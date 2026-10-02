import type {
  DeterministicReadBinding,
  DeterministicReadBindingExecution,
  DeterministicReadNormalizedResult,
} from '../agent-runtime/deterministic-read.js';
import type { RuntimeReadCapabilityAdapter } from '../agent-runtime/runtime-read-capability-binding.js';
import type { RuntimeReadTool } from '../agent-runtime/task-runtime.js';
import type {
  BusinessCapability,
  OrderSelector,
  PartySelector,
  ProductSelector,
  SemanticSelector,
  StockSelector,
} from '../semantic-routing/contracts.js';

const VENDAERP_PRODUCT_TOOL = 'vendaerp_search_products';
const VENDAERP_STOCK_TOOL = 'vendaerp_get_product_stock';
const VENDAERP_PARTY_TOOL = 'vendaerp_search_parties';
const VENDAERP_ORDER_TOOL = 'vendaerp_search_orders';
const MAX_PRODUCTS = 5;
const MAX_STOCK_ROWS = 8;
const MAX_PARTIES = 5;
const MAX_ORDERS = 5;

export const VENDAERP_FAST_READ_CAPABILITIES = [
  'business.products.search',
  'business.products.price',
  'business.stock.read',
  'business.parties.search',
  'business.orders.search',
  'business.orders.customer_contact.read',
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

type PartyRow = {
  displayName?: string;
  legalName?: string;
  taxId?: string;
  telephone?: string;
  mobilePhone?: string;
  customer: boolean;
  supplier: boolean;
};

type OrderRow = {
  code: number;
  customerName?: string;
  customerTaxId?: string;
  status?: string;
  invoiceNumber?: string;
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

function optionalBoundedTextField(
  record: Record<string, unknown>,
  key: string,
  max: number,
  errorCode: string,
): string | undefined {
  const raw = record[key];
  if (raw === undefined || raw === null) return undefined;
  const value = boundedText(raw, max);
  if (!value) throw new Error(errorCode);
  return value;
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

function partyRow(value: unknown): PartyRow {
  if (!isRecord(value)) throw new Error('vendaerp_fast_read_invalid_party_result');
  const displayName = boundedText(value.displayName, 160);
  const legalName = boundedText(value.legalName, 200);
  const taxId = optionalBoundedTextField(value, 'taxId', 64, 'vendaerp_fast_read_invalid_party_result');
  const telephone = optionalBoundedTextField(value, 'telephone', 80, 'vendaerp_fast_read_invalid_party_result');
  const mobilePhone = optionalBoundedTextField(value, 'mobilePhone', 80, 'vendaerp_fast_read_invalid_party_result');
  if (!displayName && !legalName) {
    throw new Error('vendaerp_fast_read_invalid_party_result');
  }
  if (typeof value.customer !== 'boolean' || typeof value.supplier !== 'boolean') {
    throw new Error('vendaerp_fast_read_invalid_party_result');
  }
  return {
    ...(displayName ? { displayName } : {}),
    ...(legalName ? { legalName } : {}),
    ...(taxId ? { taxId } : {}),
    ...(telephone ? { telephone } : {}),
    ...(mobilePhone ? { mobilePhone } : {}),
    customer: value.customer,
    supplier: value.supplier,
  };
}

function orderRow(value: unknown): OrderRow {
  if (!isRecord(value)) throw new Error('vendaerp_fast_read_invalid_order_result');
  const code = finiteNumber(value.code);
  if (code === undefined || !Number.isSafeInteger(code) || code < 1) {
    throw new Error('vendaerp_fast_read_invalid_order_result');
  }
  const customerName = boundedText(value.customerName, 200);
  const customerTaxId = optionalBoundedTextField(
    value,
    'customerTaxId',
    64,
    'vendaerp_fast_read_invalid_order_result',
  );
  const status = boundedText(value.status, 120);
  const invoiceNumber = boundedText(value.invoiceNumber, 120);
  return {
    code,
    ...(customerName ? { customerName } : {}),
    ...(customerTaxId ? { customerTaxId } : {}),
    ...(status ? { status } : {}),
    ...(invoiceNumber ? { invoiceNumber } : {}),
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

function exactVendaErpPartyTool(tool: RuntimeReadTool): boolean {
  return tool.providerToolName === VENDAERP_PARTY_TOOL;
}

function exactVendaErpOrderTool(tool: RuntimeReadTool): boolean {
  return tool.providerToolName === VENDAERP_ORDER_TOOL;
}

function productSelector(selector: SemanticSelector | null): ProductSelector | null {
  return selector?.kind === 'product' ? selector : null;
}

function stockSelector(selector: SemanticSelector | null): StockSelector | null {
  return selector?.kind === 'stock' ? selector : null;
}

function partySelector(selector: SemanticSelector | null): PartySelector | null {
  return selector?.kind === 'party' ? selector : null;
}

function orderSelector(selector: SemanticSelector | null): OrderSelector | null {
  return selector?.kind === 'order' ? selector : null;
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

function partyMatches(party: PartyRow, selector: PartySelector): boolean {
  const nameMatches = [party.displayName, party.legalName]
    .filter((value): value is string => typeof value === 'string')
    .some((value) => normalizedName(value) === normalizedName(selector.value));
  if (!nameMatches) return false;
  return selector.role === 'customer' ? party.customer : party.supplier;
}

function partyRoleLabel(party: PartyRow): string {
  if (party.customer && party.supplier) return 'Cliente e fornecedor';
  if (party.customer) return 'Cliente';
  if (party.supplier) return 'Fornecedor';
  return 'Sem classificação comercial';
}

function partyFact(party: PartyRow, index: number): { label: string; value: string } {
  const display = party.displayName ?? party.legalName!;
  const details: string[] = [];
  if (party.legalName && normalizedName(party.legalName) !== normalizedName(display)) {
    details.push(`Razão social ${party.legalName}`);
  }
  details.push(`Tipo ${partyRoleLabel(party)}`);
  return {
    label: `${index + 1}. ${display}`,
    value: details.join(' · '),
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


function normalizedTaxId(value: string): string | null {
  const digits = value.normalize('NFKC').replace(/\D/g, '');
  return digits.length === 11 || digits.length === 14 ? digits : null;
}

function contactKinds(party: PartyRow): string[] {
  return [
    ...(party.telephone ? ['Telefone'] : []),
    ...(party.mobilePhone ? ['Celular'] : []),
  ];
}

function counted(
  result: DeterministicReadNormalizedResult,
  toolCalls: 1 | 2,
): DeterministicReadBindingExecution {
  return { result, toolCalls };
}

function createOrderCustomerContactBindings(
  tools: readonly RuntimeReadTool[],
): readonly DeterministicReadBinding[] {
  const orderTools = tools.filter(exactVendaErpOrderTool);
  const partyTools = tools.filter(exactVendaErpPartyTool);
  if (orderTools.length !== 1 || partyTools.length !== 1) return [];

  const orderTool = orderTools[0]!;
  const partyTool = partyTools[0]!;

  return [{
    capability: 'business.orders.customer_contact.read',
    async execute(_request, selector) {
      const selectedOrder = orderSelector(selector);
      if (!selectedOrder) throw new Error('vendaerp_fast_read_selector_required');

      const rawOrders = await orderTool.execute({
        code: selectedOrder.value,
        pageSize: MAX_ORDERS,
        skip: 0,
      });
      if (!Array.isArray(rawOrders) || rawOrders.length > MAX_ORDERS) {
        throw new Error('vendaerp_fast_read_invalid_order_result');
      }
      const exactOrders = rawOrders.map(orderRow).filter((order) => order.code === selectedOrder.value);
      if (exactOrders.length === 0) {
        return counted({
          kind: 'not_found',
          message: 'Nenhum pedido corresponde exatamente ao código autorizado.',
        }, 1);
      }
      if (exactOrders.length > 1) {
        return counted({
          kind: 'clarification',
          prompt: 'A consulta retornou mais de um registro com o mesmo código de pedido. Não vou escolher automaticamente.',
          options: ['Revise o código do pedido no VendaERP antes de tentar novamente.'],
        }, 1);
      }

      const order = exactOrders[0]!;
      const customerTaxId = order.customerTaxId;
      const customerIdentity = customerTaxId ? normalizedTaxId(customerTaxId) : null;
      if (!customerTaxId || !customerIdentity) {
        return counted({
          kind: 'clarification',
          prompt: 'O pedido foi identificado, mas não trouxe um CPF/CNPJ de cliente utilizável para confirmar o cadastro de contato.',
          options: ['Revise o vínculo do cliente no VendaERP antes de tentar novamente.'],
        }, 1);
      }

      const rawParties = await partyTool.execute({
        taxId: customerTaxId,
        customer: true,
        pageSize: MAX_PARTIES,
        skip: 0,
      });
      if (!Array.isArray(rawParties) || rawParties.length > MAX_PARTIES) {
        throw new Error('vendaerp_fast_read_invalid_party_result');
      }
      const exactParties = rawParties.map(partyRow).filter((party) =>
        party.customer
        && typeof party.taxId === 'string'
        && normalizedTaxId(party.taxId) === customerIdentity);

      if (exactParties.length === 0) {
        return counted({
          kind: 'not_found',
          message: 'Nenhum cadastro de cliente corresponde exatamente à identidade do cliente vinculada ao pedido.',
        }, 2);
      }
      if (exactParties.length > 1) {
        return counted({
          kind: 'clarification',
          prompt: 'Mais de um cadastro de cliente corresponde à identidade do pedido. Não vou escolher automaticamente.',
          options: ['Revise os cadastros duplicados do cliente no VendaERP antes de tentar novamente.'],
        }, 2);
      }

      const party = exactParties[0]!;
      const kinds = contactKinds(party);
      return counted({
        kind: 'facts',
        subject: `Pedido ${order.code}`,
        facts: [
          { label: 'Cliente', value: party.displayName ?? party.legalName! },
          { label: 'Contato cadastrado', value: kinds.length > 0 ? 'Sim' : 'Não' },
          ...(kinds.length > 0 ? [{ label: 'Tipos disponíveis', value: kinds.join(' e ') }] : []),
        ],
      }, 2);
    },
  }];
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
      if (exactVendaErpPartyTool(tool)) {
        return ['business.parties.search'];
      }
      if (exactVendaErpOrderTool(tool)) {
        return ['business.orders.search'];
      }
      return [];
    },

    composedBindingsFor(tools) {
      return createOrderCustomerContactBindings(tools);
    },

    async execute({ tool, capability, selector }): Promise<DeterministicReadNormalizedResult> {
      if (capability === 'business.orders.search') {
        if (!exactVendaErpOrderTool(tool)) {
          throw new Error('vendaerp_fast_read_capability_unavailable');
        }
        const selectedOrder = orderSelector(selector);
        if (!selectedOrder) {
          throw new Error('vendaerp_fast_read_selector_required');
        }

        const result = await tool.execute({
          code: selectedOrder.value,
          pageSize: MAX_ORDERS,
          skip: 0,
        });
        if (!Array.isArray(result) || result.length > MAX_ORDERS) {
          throw new Error('vendaerp_fast_read_invalid_order_result');
        }
        const orders = result.map(orderRow);
        const exactMatches = orders.filter((order) => order.code === selectedOrder.value);
        if (exactMatches.length === 0) {
          return {
            kind: 'not_found',
            message: 'Nenhum pedido corresponde exatamente ao código autorizado.',
          };
        }
        if (exactMatches.length > 1) {
          return {
            kind: 'clarification',
            prompt: 'A consulta retornou mais de um registro com o mesmo código de pedido. Não vou escolher automaticamente.',
            options: ['Revise o código do pedido no VendaERP antes de tentar novamente.'],
          };
        }

        const order = exactMatches[0]!;
        return {
          kind: 'facts',
          subject: `Pedido ${order.code}`,
          facts: [
            { label: 'Código', value: String(order.code) },
            ...(order.customerName ? [{ label: 'Cliente', value: order.customerName }] : []),
            ...(order.status ? [{ label: 'Status', value: order.status }] : []),
            {
              label: 'Nota fiscal',
              value: order.invoiceNumber ?? 'Não informada no resultado desta consulta.',
            },
          ],
        };
      }

      if (capability === 'business.parties.search') {
        if (!exactVendaErpPartyTool(tool)) {
          throw new Error('vendaerp_fast_read_capability_unavailable');
        }
        const selectedParty = partySelector(selector);
        if (!selectedParty) {
          throw new Error('vendaerp_fast_read_selector_required');
        }

        const result = await tool.execute({
          displayName: selectedParty.value,
          customer: selectedParty.role === 'customer',
          supplier: selectedParty.role === 'supplier',
          pageSize: MAX_PARTIES,
          skip: 0,
        });
        if (!Array.isArray(result) || result.length > MAX_PARTIES) {
          throw new Error('vendaerp_fast_read_invalid_party_result');
        }
        const parties = result.map(partyRow);
        const exactMatches = parties.filter((party) => partyMatches(party, selectedParty));
        if (exactMatches.length === 0) {
          return {
            kind: 'not_found',
            message: 'Nenhum cliente ou fornecedor corresponde exatamente ao nome e tipo autorizados.',
          };
        }
        if (exactMatches.length === 1) {
          const party = exactMatches[0]!;
          const subject = party.displayName ?? party.legalName!;
          const facts = [
            ...(party.legalName && normalizedName(party.legalName) !== normalizedName(subject)
              ? [{ label: 'Razão social', value: party.legalName }]
              : []),
            { label: 'Tipo', value: partyRoleLabel(party) },
          ];
          return {
            kind: 'facts',
            subject,
            facts,
          };
        }
        return {
          kind: 'facts',
          subject: 'Cadastros correspondentes',
          facts: exactMatches.map(partyFact),
        };
      }

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
