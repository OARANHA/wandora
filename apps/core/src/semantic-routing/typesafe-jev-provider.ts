import {
  BUSINESS_CAPABILITIES,
  type BusinessCapability,
  type SemanticDecisionInput,
  type SemanticDecisionProvider,
  type SemanticExecutionMode,
  type SemanticPresentationMode,
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

const PRESENTATIONS = [
  'facts',
  'safe_contact_preview',
  'contact_destination_qualification',
] as const satisfies readonly SemanticPresentationMode[];

const CAPABILITY_DESCRIPTIONS: Record<BusinessCapability, string> = {
  'business.products.search': 'Read-only search or bounded listing of products.',
  'business.products.price': 'Read-only lookup of product price information.',
  'business.stock.read': 'Read-only lookup of stock quantity for one explicit product code in one explicit stock location or deposit.',
  'business.price_tables.list': 'Read-only listing of available price tables.',
  'business.price_tables.products.read': 'Read-only lookup of products in a price table.',
  'business.parties.search': 'Read-only search for customers, suppliers, or other parties.',
  'business.orders.search': 'Read-only search for existing orders.',
  'business.orders.customer_contact.read': 'Read-only linkage from one exact order code to registered customer contact availability and contact kinds. It may also support an explicitly requested deterministic non-sending customer message preview or a no-send destination/channel qualification projection without automatically selecting a destination or inferring a channel.',
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
    presentation: {
      type: 'choice',
      instructions: 'Choose the bounded customer presentation. safe_contact_preview is only for an explicitly requested message draft/preview. contact_destination_qualification is only for an explicitly requested destination/channel qualification. Both are allowed only with business.orders.customer_contact.read and neither authorizes send.',
      criteria: {
        facts: 'Return only the normal deterministic facts for the selected read.',
        safe_contact_preview: 'Return the same authorized contact facts plus a deterministic message preview clearly marked NOT SENT. This never chooses a destination, proves WhatsApp, or authorizes outbound.',
        contact_destination_qualification: 'Return a no-send qualification projection over the exact order customer contacts. Registered telephone/mobile are only candidates. Never infer mobile=WhatsApp, telephone=SMS/voice, select the first/only contact, or claim a channel is qualified without explicit messaging-provider evidence.',
      },
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
      instructions: 'Is material business context missing from the customer request itself such that deterministic read admission should stop before selector extraction? Do not treat the absence of a structured selector object as missing context when the request explicitly names or identifies one product; selector materialization is handled separately after route admission.',
      criteria: {
        true: 'The customer request itself omits material business context or entity identity required to know what should be read.',
        false: 'The customer request itself is sufficiently specific for the selected read. For product search/price, an explicitly stated product name, code, or barcode counts as present even if it still needs separate structured selector extraction. For business.stock.read V1, both an explicit product code and an explicit stock location/deposit are required.',
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
      instructions: 'Classify ambiguity only from the customer request itself. Do not infer ambiguity merely because an external catalog may contain duplicate rows or multiple records with the same explicit product name, code, or barcode; downstream deterministic lookup and exact-match post-filtering handle provider-side multiplicity.',
      criteria: {
        none: 'The request explicitly identifies one product name, code, or barcode, or otherwise contains no material ambiguity. Possible duplicate records in the external catalog do not make the request itself ambiguous.',
        missing_entity: 'A required product/entity or identifier is missing from the request.',
        multiple_matches: 'The request itself explicitly names or asks between multiple products/entities/values, so more than one target is requested or equally intended before any provider lookup.',
        vague_reference: 'The request uses a vague reference whose target cannot be identified from the request itself.',
        unknown: 'Request-level ambiguity cannot be classified safely.',
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
    const presentation = choiceAnswer(payload.answers, 'presentation', PRESENTATIONS);
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
      presentation: presentation.choice as SemanticPresentationMode,
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
