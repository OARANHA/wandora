import { Agent } from '@mastra/core/agent';
import { z } from 'zod';
import {
  canonicalSemanticSelector,
  type BusinessCapability,
  type SemanticSelectorDecision,
  type SemanticSelectorInput,
  type SemanticSelectorProvider,
} from './contracts.js';

const QUALIFIED_PROVIDER_ID = 'mistral';
export const QUALIFIED_MISTRAL_SELECTOR_MODEL = 'mistral-small-2603';
const QUALIFIED_MISTRAL_BASE_URL = 'https://api.mistral.ai/v1';
const DEFAULT_TIMEOUT_MS = 3_000;
const MAX_REQUEST_CHARS = 12_000;
const MAX_SELECTOR_CHARS = 512;
const MIN_TIMEOUT_MS = 250;
const MAX_TIMEOUT_MS = 10_000;

const SELECTOR_CAPABILITIES = new Set<BusinessCapability>([
  'business.products.search',
  'business.products.price',
  'business.stock.read',
  'business.parties.search',
  'business.orders.search',
  'business.orders.customer_contact.read',
]);

const productSelectorSchema = z.object({
  kind: z.literal('product'),
  by: z.enum(['name', 'code', 'barcode']),
  value: z.string().trim().min(1).max(MAX_SELECTOR_CHARS),
}).strict();

const partySelectorSchema = z.object({
  kind: z.literal('party'),
  by: z.literal('name'),
  value: z.string().trim().min(1).max(MAX_SELECTOR_CHARS),
  role: z.enum(['customer', 'supplier']),
}).strict();

const orderSelectorSchema = z.object({
  kind: z.literal('order'),
  by: z.literal('code'),
  value: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
}).strict();

const stockSelectorSchema = z.object({
  kind: z.literal('stock'),
  product: z.object({
    kind: z.literal('product'),
    by: z.literal('code'),
    value: z.string().trim().min(1).max(MAX_SELECTOR_CHARS),
  }).strict(),
  location: z.string().trim().min(1).max(MAX_SELECTOR_CHARS),
}).strict();

const selectorSchema = z.union([
  productSelectorSchema,
  partySelectorSchema,
  stockSelectorSchema,
  orderSelectorSchema,
]);

const selectorDecisionSchema = z.object({
  selector: selectorSchema.nullable(),
  confidence: z.number().min(0).max(1),
  ambiguity: z.enum([
    'none',
    'missing_entity',
    'multiple_matches',
    'vague_reference',
    'unknown',
  ]),
}).strict();

const SELECTOR_INSTRUCTIONS = [
  'Extract at most one bounded semantic selector from the customer request for the supplied capability.',
  'Return only schema-constrained structured output.',
  'For business.products.search or business.products.price, return kind=product only when one product is explicitly and uniquely identifiable from the request.',
  'For product selectors use by=name for an explicit product name, by=code for an explicit product code, and by=barcode for an explicit barcode.',
  'For business.stock.read V1, return kind=stock only when the request explicitly provides both one product code and one stock location or deposit.',
  'For stock, copy the explicit product code into product.by=code and preserve the explicit stock location or deposit in location.',
  'For business.parties.search V1, return kind=party only for one explicitly named party and exactly one explicit business role: customer or supplier.',
  'For party selectors use by=name, preserve the explicit party name, and map the business role to role=customer or role=supplier.',
  'For business.orders.search or business.orders.customer_contact.read, return kind=order only when the request explicitly provides exactly one numeric order code.',
  'For order selectors use by=code and preserve the explicit positive integer order code as a number.',
  'For business.orders.search, do not emit an order selector for customer name, CPF/CNPJ, status, date/period, invoice/NFe number, phone, address, or unfiltered order listing even if provider fields may exist.',
  'For business.orders.customer_contact.read, the selector is still only the explicit order code; never put CPF/CNPJ, phone, celular, WhatsApp destination, e-mail, address, or provider IDs into the selector.',
  'If the order code is missing, return selector=null and ambiguity=missing_entity. If multiple order codes are requested or equally intended, return selector=null and ambiguity=multiple_matches.',
  'Do not emit a party selector when the request asks for CPF/CNPJ, tax/document identifiers, e-mail, phone, address, or other sensitive party details; return selector=null and ambiguity=unknown.',
  'Do not emit a party selector for document, e-mail, phone, code, city, state, or changed-after lookup even if such provider fields may exist.',
  'If a party name or the customer/supplier role is missing, return selector=null and ambiguity=missing_entity.',
  'A product name or barcode alone is not enough for business.stock.read V1; do not derive or invent a product code.',
  'If stock location or required product code is missing, return selector=null and ambiguity=missing_entity.',
  'Preserve selector values semantically; only surrounding whitespace may be removed.',
  'Do not invent, fuzzy-match, rank, expand, translate, case-normalize, or consult any external catalog.',
  'If no required entity is identified, return selector=null and ambiguity=missing_entity.',
  'If multiple products or multiple locations are requested or equally intended, return selector=null and ambiguity=multiple_matches.',
  'If the request relies on a vague reference whose required target cannot be identified from the request itself, return selector=null and ambiguity=vague_reference.',
  'Use ambiguity=unknown only when none of the narrower ambiguity classes applies.',
  'Use ambiguity=none only when returning one valid selector.',
  'Confidence must be between 0 and 1 and reflects confidence in the selector extraction only.',
].join(' ');

type SelectorGeneratorInput = {
  request: string;
  capability: BusinessCapability;
  signal: AbortSignal;
};

export type MastraMistralSelectorGenerate = (
  input: SelectorGeneratorInput,
) => Promise<unknown>;

export class MastraMistralSemanticSelectorProvider implements SemanticSelectorProvider {
  private readonly timeoutMs: number;
  private readonly generateImpl: MastraMistralSelectorGenerate;

  constructor(input: {
    apiKey: string;
    timeoutMs?: number;
    generateImpl?: MastraMistralSelectorGenerate;
  }) {
    const apiKey = input.apiKey.trim();
    if (apiKey.length < 20 || apiKey.length > 4_096 || /\s/.test(apiKey)) {
      throw new Error('mastra_mistral_selector_invalid_api_key');
    }

    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (!Number.isInteger(timeoutMs) || timeoutMs < MIN_TIMEOUT_MS || timeoutMs > MAX_TIMEOUT_MS) {
      throw new Error('mastra_mistral_selector_invalid_timeout');
    }

    this.timeoutMs = timeoutMs;

    if (input.generateImpl) {
      this.generateImpl = input.generateImpl;
      return;
    }

    const agent = new Agent({
      id: 'wandora-semantic-product-selector-v1',
      name: 'Wandora Semantic Product Selector',
      instructions: SELECTOR_INSTRUCTIONS,
      model: {
        providerId: QUALIFIED_PROVIDER_ID,
        modelId: QUALIFIED_MISTRAL_SELECTOR_MODEL,
        url: QUALIFIED_MISTRAL_BASE_URL,
        apiKey,
      },
      maxRetries: 0,
    });

    this.generateImpl = async ({ request, capability, signal }) => {
      const result = await agent.generate([{
        role: 'user' as const,
        content: JSON.stringify({ request, capability }),
      }], {
        abortSignal: signal,
        maxSteps: 1,
        modelSettings: {
          maxOutputTokens: 200,
          temperature: 0,
        },
        structuredOutput: {
          schema: selectorDecisionSchema,
        },
      });
      return result.object;
    };
  }

  async select(input: SemanticSelectorInput): Promise<SemanticSelectorDecision> {
    const request = input.request.trim();
    if (!request || request.length > MAX_REQUEST_CHARS) {
      throw new Error('mastra_mistral_selector_invalid_request');
    }
    if (!SELECTOR_CAPABILITIES.has(input.capability)) {
      throw new Error('mastra_mistral_selector_unsupported_capability');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let rawDecision: unknown;
    try {
      rawDecision = await this.generateImpl({
        request,
        capability: input.capability,
        signal: controller.signal,
      });
    } catch {
      if (controller.signal.aborted) {
        throw new Error('mastra_mistral_selector_timeout');
      }
      throw new Error('mastra_mistral_selector_unavailable');
    } finally {
      clearTimeout(timeout);
    }

    const parsed = selectorDecisionSchema.safeParse(rawDecision);
    if (!parsed.success) {
      throw new Error('mastra_mistral_selector_invalid_response');
    }

    const selector = parsed.data.selector
      ? canonicalSemanticSelector(parsed.data.selector)
      : null;
    if (parsed.data.selector && !selector) {
      throw new Error('mastra_mistral_selector_invalid_response');
    }
    if ((selector && parsed.data.ambiguity !== 'none')
      || (!selector && parsed.data.ambiguity === 'none')) {
      throw new Error('mastra_mistral_selector_invalid_response');
    }

    return {
      selector,
      confidence: parsed.data.confidence,
      ambiguity: parsed.data.ambiguity,
      providerEvidence: {
        provider: 'mastra-mistral',
        model: QUALIFIED_MISTRAL_SELECTOR_MODEL,
      },
    };
  }
}
