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

const PRODUCT_CAPABILITIES = new Set<BusinessCapability>([
  'business.products.search',
  'business.products.price',
]);

const selectorSchema = z.object({
  kind: z.literal('product'),
  by: z.enum(['name', 'code', 'barcode']),
  value: z.string().trim().min(1).max(MAX_SELECTOR_CHARS),
}).strict();

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
  'Extract at most one product selector from the customer request.',
  'Return only schema-constrained structured output.',
  'A selector is allowed only when one product is explicitly and uniquely identifiable from the request.',
  'Use by=name for an explicit product name, by=code for an explicit product code, and by=barcode for an explicit barcode.',
  'Preserve the product value semantically; only surrounding whitespace may be removed.',
  'Do not invent, fuzzy-match, rank, expand, translate, case-normalize, or consult any external catalog.',
  'If no product is identified, return selector=null and ambiguity=missing_entity.',
  'If multiple products are requested or identity is ambiguous, return selector=null and ambiguity=multiple_matches.',
  'If the request relies on a vague reference whose product identity is not explicit, return selector=null and ambiguity=vague_reference.',
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
    if (!PRODUCT_CAPABILITIES.has(input.capability)) {
      throw new Error('mastra_mistral_selector_unsupported_capability');
    }

    const signal = AbortSignal.timeout(this.timeoutMs);
    let rawDecision: unknown;
    try {
      rawDecision = await this.generateImpl({
        request,
        capability: input.capability,
        signal,
      });
    } catch {
      if (signal.aborted) {
        throw new Error('mastra_mistral_selector_timeout');
      }
      throw new Error('mastra_mistral_selector_unavailable');
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
