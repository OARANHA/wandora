import {
  BUSINESS_CAPABILITIES,
  type BusinessCapability,
  type SemanticDecisionInput,
  type SemanticDecisionProvider,
  type SemanticExecutionMode,
  type SemanticAmbiguity,
  type SemanticRouteDecision,
} from './contracts.js';

const TYPESAFE_SYSTEMONE_URL = 'https://api.typesafe.ai/v1/systemone';
const QUALIFIED_MODEL = 'jev-1.13.0';
const DEFAULT_TIMEOUT_MS = 3_000;
const MAX_REQUEST_CHARS = 12_000;
const MAX_RESPONSE_BYTES = 64 * 1024;

const MODES = [
  'deterministic_read',
  'generative_reasoning',
  'human_review',
  'unknown',
] as const satisfies readonly SemanticExecutionMode[];

const AMBIGUITIES = [
  'none',
  'missing_entity',
  'multiple_matches',
  'vague_reference',
  'unknown',
] as const satisfies readonly SemanticAmbiguity[];

const CAPABILITY_DESCRIPTIONS: Record<BusinessCapability, string> = {
  'business.products.search': 'Read-only search or bounded listing of products.',
  'business.products.price': 'Read-only lookup of product price information.',
  'business.stock.read': 'Read-only lookup of product stock or inventory quantity.',
  'business.price_tables.list': 'Read-only listing of available price tables.',
  'business.price_tables.products.read': 'Read-only lookup of products in a price table.',
  'business.parties.search': 'Read-only search for customers, suppliers, or other parties.',
  'business.orders.search': 'Read-only search for existing orders.',
  'business.companies.list': 'Read-only listing of business companies available to the organization.',
  'business.connection.probe': 'Read-only connectivity or availability probe for the business system.',
};

type JsonObject = Record<string, unknown>;

function probability(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertUniqueCapabilities(values: readonly BusinessCapability[]): void {
  if (values.length > BUSINESS_CAPABILITIES.length || new Set(values).size !== values.length) {
    throw new Error('typesafe_jev_invalid_capabilities');
  }
  for (const value of values) {
    if (!BUSINESS_CAPABILITIES.includes(value)) {
      throw new Error('typesafe_jev_invalid_capabilities');
    }
  }
}

function choiceAnswer(
  answers: JsonObject,
  key: string,
  allowed: readonly string[],
): { choice: string; confidence: number } {
  const value = answers[key];
  if (!isObject(value)
    || value.type !== 'choice'
    || typeof value.choice !== 'string'
    || !allowed.includes(value.choice)
    || !probability(value.confidence)
    || !isObject(value.probabilities)
  ) {
    throw new Error('typesafe_jev_invalid_response');
  }
  for (const candidate of allowed) {
    if (!(candidate in value.probabilities) || !probability(value.probabilities[candidate])) {
      throw new Error('typesafe_jev_invalid_response');
    }
  }
  return { choice: value.choice, confidence: value.confidence };
}

function noulAnswer(answers: JsonObject, key: string): number {
  const value = answers[key];
  if (!isObject(value) || value.type !== 'noul' || !probability(value.noul)) {
    throw new Error('typesafe_jev_invalid_response');
  }
  return value.noul;
}

async function readBoundedBody(response: Response): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > MAX_RESPONSE_BYTES) {
      throw new Error('typesafe_jev_response_too_large');
    }
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      if (!part.value) continue;
      total += part.value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error('typesafe_jev_response_too_large');
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }

  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(joined);
}

function buildQuestions(availableCapabilities: readonly BusinessCapability[]): JsonObject {
  const capabilityCriteria: JsonObject = {
    none: 'No advertised capability safely and directly answers this request.',
  };
  for (const capability of availableCapabilities) {
    capabilityCriteria[capability] = CAPABILITY_DESCRIPTIONS[capability];
  }

  return {
    mode: {
      type: 'choice',
      instructions: 'Choose the safest execution mode for the customer request using only the supplied state.',
      criteria: {
        deterministic_read: 'Exactly one advertised read capability can answer the request without generative synthesis, write action, approval, or open-ended agent work.',
        generative_reasoning: 'The request requires synthesis, reasoning, planning, or open-ended agent work beyond one deterministic read.',
        human_review: 'The request requires human approval or review before continuing.',
        unknown: 'The request cannot be classified safely from the supplied state.',
      },
    },
    capability: {
      type: 'choice',
      instructions: 'Choose the single advertised business capability that directly answers the request, or none.',
      criteria: capabilityCriteria,
    },
    needsDataOrToolLookup: {
      type: 'noul',
      instructions: 'Does answering this request require reading current business-system data through a tool or integration?',
      criteria: {
        true: 'Current business-system data must be read.',
        false: 'No current business-system data lookup is required.',
      },
    },
    needsMoreContext: {
      type: 'noul',
      instructions: 'Is material context missing such that the request should not be executed as a deterministic read yet?',
      criteria: {
        true: 'Important context or identification is missing.',
        false: 'The supplied request is sufficiently specific for the selected mode.',
      },
    },
    needsHumanReview: {
      type: 'noul',
      instructions: 'Does this request require a human review or approval before execution?',
      criteria: {
        true: 'Human review or approval is required.',
        false: 'No human review or approval is required for this read-only request.',
      },
    },
    ambiguity: {
      type: 'choice',
      instructions: 'Classify the strongest ambiguity present in the request.',
      criteria: {
        none: 'No material ambiguity blocks deterministic execution.',
        missing_entity: 'A required entity or identifier is missing.',
        multiple_matches: 'The request plausibly refers to multiple entities or values.',
        vague_reference: 'The request contains a vague reference that cannot be resolved safely.',
        unknown: 'Ambiguity cannot be classified safely.',
      },
    },
  };
}

export class TypeSafeJevSemanticDecisionProvider implements SemanticDecisionProvider {
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly apiKey: string;

  constructor(input: {
    apiKey: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  }) {
    const apiKey = input.apiKey.trim();
    if (apiKey.length < 20 || apiKey.length > 4_096 || /\s/.test(apiKey)) {
      throw new Error('typesafe_jev_invalid_api_key');
    }
    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 250 || timeoutMs > 10_000) {
      throw new Error('typesafe_jev_invalid_timeout');
    }
    this.apiKey = apiKey;
    this.fetchImpl = input.fetchImpl ?? fetch;
    this.timeoutMs = timeoutMs;
  }

  async decide(input: SemanticDecisionInput): Promise<SemanticRouteDecision> {
    const request = input.request.trim();
    if (!request || request.length > MAX_REQUEST_CHARS) {
      throw new Error('typesafe_jev_invalid_request');
    }
    assertUniqueCapabilities(input.availableCapabilities);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;

    try {
      response = await this.fetchImpl(TYPESAFE_SYSTEMONE_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          model: QUALIFIED_MODEL,
          state: {
            request,
            availableCapabilities: input.availableCapabilities,
          },
          questions: buildQuestions(input.availableCapabilities),
        }),
        signal: controller.signal,
      });
    } catch {
      throw new Error('typesafe_jev_unavailable');
    } finally {
      clearTimeout(timeout);
    }

    if (response.status !== 200) {
      throw new Error('typesafe_jev_unavailable');
    }

    let payload: unknown;
    try {
      const text = await readBoundedBody(response);
      payload = JSON.parse(text);
    } catch (error) {
      if (error instanceof Error && error.message === 'typesafe_jev_response_too_large') throw error;
      throw new Error('typesafe_jev_invalid_response');
    }

    if (!isObject(payload)
      || typeof payload.model !== 'string'
      || !payload.model
      || payload.model.length > 100
      || !isObject(payload.answers)
      || !isObject(payload.usage)
      || !Number.isInteger(payload.usage.input_tokens)
      || (payload.usage.input_tokens as number) < 0
      || !Number.isInteger(payload.usage.output_tokens)
      || (payload.usage.output_tokens as number) < 0
    ) {
      throw new Error('typesafe_jev_invalid_response');
    }

    const mode = choiceAnswer(payload.answers, 'mode', MODES);
    const capabilityAllowed = ['none', ...input.availableCapabilities];
    const capability = choiceAnswer(payload.answers, 'capability', capabilityAllowed);
    const ambiguity = choiceAnswer(payload.answers, 'ambiguity', AMBIGUITIES);

    const selectedCapability = capability.choice === 'none'
      ? null
      : capability.choice as BusinessCapability;

    const confidence = mode.choice === 'deterministic_read' && selectedCapability
      ? Math.min(mode.confidence, capability.confidence)
      : mode.confidence;

    return {
      mode: mode.choice as SemanticExecutionMode,
      capability: selectedCapability,
      confidence,
      needsDataOrToolLookup: noulAnswer(payload.answers, 'needsDataOrToolLookup'),
      needsMoreContext: noulAnswer(payload.answers, 'needsMoreContext'),
      needsHumanReview: noulAnswer(payload.answers, 'needsHumanReview'),
      ambiguity: ambiguity.choice as SemanticAmbiguity,
      providerEvidence: {
        provider: 'typesafe-jev',
        model: payload.model,
      },
    };
  }
}
