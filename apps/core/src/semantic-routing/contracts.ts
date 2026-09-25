export const BUSINESS_CAPABILITIES = [
  'business.products.search',
  'business.products.price',
  'business.stock.read',
  'business.price_tables.list',
  'business.price_tables.products.read',
  'business.parties.search',
  'business.orders.search',
  'business.companies.list',
  'business.connection.probe',
] as const;

export type BusinessCapability = typeof BUSINESS_CAPABILITIES[number];

export type SemanticExecutionMode =
  | 'deterministic_read'
  | 'generative_reasoning'
  | 'human_review'
  | 'unknown';

export type SemanticAmbiguity =
  | 'none'
  | 'missing_entity'
  | 'multiple_matches'
  | 'vague_reference'
  | 'unknown';

export type SemanticRouteDecision = {
  mode: SemanticExecutionMode;
  capability: BusinessCapability | null;
  confidence: number;
  needsDataOrToolLookup: number;
  needsMoreContext: number;
  needsHumanReview: number;
  ambiguity: SemanticAmbiguity;
  providerEvidence?: {
    provider: string;
    model: string | null;
  };
};

export type SemanticDecisionInput = {
  organizationId: string;
  employeeId: string;
  request: string;
  availableCapabilities: BusinessCapability[];
};

export interface SemanticDecisionProvider {
  decide(input: SemanticDecisionInput): Promise<SemanticRouteDecision>;
}

export type SemanticRoutePolicy = {
  minimumConfidence: number;
  maximumNeedsMoreContext: number;
  maximumNeedsHumanReview: number;
  minimumNeedsDataOrToolLookup: number;
};

export type SemanticRouteGateReason =
  | 'invalid-policy'
  | 'not-deterministic-read'
  | 'missing-capability'
  | 'capability-not-advertised'
  | 'low-confidence'
  | 'needs-more-context'
  | 'needs-human-review'
  | 'no-tool-lookup-needed'
  | 'ambiguous';

export type SemanticRouteGate =
  | { allowed: true; capability: BusinessCapability }
  | { allowed: false; reason: SemanticRouteGateReason };

function probability(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

export function validateSemanticRouteDecision(decision: SemanticRouteDecision): boolean {
  return probability(decision.confidence)
    && probability(decision.needsDataOrToolLookup)
    && probability(decision.needsMoreContext)
    && probability(decision.needsHumanReview);
}

export function validateSemanticRoutePolicy(policy: SemanticRoutePolicy): boolean {
  return probability(policy.minimumConfidence)
    && probability(policy.maximumNeedsMoreContext)
    && probability(policy.maximumNeedsHumanReview)
    && probability(policy.minimumNeedsDataOrToolLookup);
}

export function gateDeterministicRead(
  decision: SemanticRouteDecision,
  availableCapabilities: readonly BusinessCapability[],
  policy: SemanticRoutePolicy,
): SemanticRouteGate {
  if (!validateSemanticRoutePolicy(policy)) {
    return { allowed: false, reason: 'invalid-policy' };
  }
  if (!validateSemanticRouteDecision(decision)) {
    return { allowed: false, reason: 'low-confidence' };
  }
  if (decision.mode !== 'deterministic_read') {
    return { allowed: false, reason: 'not-deterministic-read' };
  }
  if (!decision.capability) {
    return { allowed: false, reason: 'missing-capability' };
  }
  if (!availableCapabilities.includes(decision.capability)) {
    return { allowed: false, reason: 'capability-not-advertised' };
  }
  if (decision.confidence < policy.minimumConfidence) {
    return { allowed: false, reason: 'low-confidence' };
  }
  if (decision.needsMoreContext > policy.maximumNeedsMoreContext) {
    return { allowed: false, reason: 'needs-more-context' };
  }
  if (decision.needsHumanReview > policy.maximumNeedsHumanReview) {
    return { allowed: false, reason: 'needs-human-review' };
  }
  if (decision.needsDataOrToolLookup < policy.minimumNeedsDataOrToolLookup) {
    return { allowed: false, reason: 'no-tool-lookup-needed' };
  }
  if (decision.ambiguity !== 'none') {
    return { allowed: false, reason: 'ambiguous' };
  }
  return { allowed: true, capability: decision.capability };
}
