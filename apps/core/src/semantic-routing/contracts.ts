export const BUSINESS_CAPABILITIES = [
  'business.products.search',
  'business.products.price',
  'business.stock.read',
  'business.price_tables.list',
  'business.price_tables.products.read',
  'business.parties.search',
  'business.orders.search',
  'business.orders.customer_contact.read',
  'business.companies.list',
  'business.connection.probe',
] as const;

export type BusinessCapability = typeof BUSINESS_CAPABILITIES[number];

export const PRODUCT_SELECTOR_FIELDS = ['name', 'code', 'barcode'] as const;
export type ProductSelectorField = typeof PRODUCT_SELECTOR_FIELDS[number];

export type ProductSelector = {
  kind: 'product';
  by: ProductSelectorField;
  value: string;
};

export const PARTY_SELECTOR_ROLES = ['customer', 'supplier'] as const;
export type PartySelectorRole = typeof PARTY_SELECTOR_ROLES[number];

export type PartySelector = {
  kind: 'party';
  by: 'name';
  value: string;
  role: PartySelectorRole;
};

export type StockSelector = {
  kind: 'stock';
  product: {
    kind: 'product';
    by: 'code';
    value: string;
  };
  location: string;
};

export type OrderSelector = {
  kind: 'order';
  by: 'code';
  value: number;
};

export type SemanticSelector = ProductSelector | PartySelector | StockSelector | OrderSelector;

export const SEMANTIC_PRESENTATION_MODES = ['facts', 'safe_contact_preview'] as const;
export type SemanticPresentationMode = typeof SEMANTIC_PRESENTATION_MODES[number];

export function canonicalSemanticPresentationMode(value: unknown): SemanticPresentationMode | null {
  return typeof value === 'string'
    && (SEMANTIC_PRESENTATION_MODES as readonly string[]).includes(value)
    ? value as SemanticPresentationMode
    : null;
}

function canonicalProductSelector(value: unknown): ProductSelector | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const selector = value as Record<string, unknown>;
  if (
    selector.kind !== 'product'
    || typeof selector.by !== 'string'
    || !PRODUCT_SELECTOR_FIELDS.includes(selector.by as ProductSelectorField)
    || typeof selector.value !== 'string'
  ) return null;
  const normalized = selector.value.trim();
  if (!normalized || normalized.length > 512) return null;
  return {
    kind: 'product',
    by: selector.by as ProductSelectorField,
    value: normalized,
  };
}

function canonicalPartySelector(value: unknown): PartySelector | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const selector = value as Record<string, unknown>;
  if (
    selector.kind !== 'party'
    || selector.by !== 'name'
    || typeof selector.value !== 'string'
    || typeof selector.role !== 'string'
    || !PARTY_SELECTOR_ROLES.includes(selector.role as PartySelectorRole)
  ) return null;
  const normalized = selector.value.trim();
  if (!normalized || normalized.length > 512) return null;
  return {
    kind: 'party',
    by: 'name',
    value: normalized,
    role: selector.role as PartySelectorRole,
  };
}

function canonicalOrderSelector(value: unknown): OrderSelector | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const selector = value as Record<string, unknown>;
  if (
    selector.kind !== 'order'
    || selector.by !== 'code'
    || typeof selector.value !== 'number'
    || !Number.isSafeInteger(selector.value)
    || selector.value < 1
  ) return null;
  return {
    kind: 'order',
    by: 'code',
    value: selector.value,
  };
}

export function canonicalSemanticSelector(value: unknown): SemanticSelector | null {
  const product = canonicalProductSelector(value);
  if (product) return product;
  const party = canonicalPartySelector(value);
  if (party) return party;
  const order = canonicalOrderSelector(value);
  if (order) return order;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const selector = value as Record<string, unknown>;
  if (
    selector.kind !== 'stock'
    || typeof selector.location !== 'string'
  ) return null;
  const stockProduct = canonicalProductSelector(selector.product);
  const location = selector.location.trim();
  if (
    !stockProduct
    || stockProduct.by !== 'code'
    || !location
    || location.length > 512
  ) return null;
  return {
    kind: 'stock',
    product: {
      kind: 'product',
      by: 'code',
      value: stockProduct.value,
    },
    location,
  };
}

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
  selector?: SemanticSelector | null;
  presentation?: SemanticPresentationMode | null;
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

export type SemanticSelectorInput = {
  organizationId: string;
  employeeId: string;
  request: string;
  capability: BusinessCapability;
};

export type SemanticSelectorDecision = {
  selector: SemanticSelector | null;
  confidence: number;
  ambiguity: SemanticAmbiguity;
  providerEvidence?: {
    provider: string;
    model: string | null;
  };
};

export interface SemanticSelectorProvider {
  select(input: SemanticSelectorInput): Promise<SemanticSelectorDecision>;
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
  | 'ambiguous'
  | 'missing-selector'
  | 'invalid-selector'
  | 'selector-not-applicable'
  | 'invalid-presentation'
  | 'presentation-not-applicable';

export type SemanticRouteGate =
  | {
      allowed: true;
      capability: BusinessCapability;
      selector: SemanticSelector | null;
      presentation: SemanticPresentationMode;
    }
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

export function validateSemanticSelectorDecision(
  decision: SemanticSelectorDecision,
): boolean {
  return probability(decision.confidence)
    && [
      'none',
      'missing_entity',
      'multiple_matches',
      'vague_reference',
      'unknown',
    ].includes(decision.ambiguity);
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

  const suppliedPresentation = decision.presentation;
  const presentation = suppliedPresentation === undefined || suppliedPresentation === null
    ? 'facts'
    : canonicalSemanticPresentationMode(suppliedPresentation);
  if (!presentation) {
    return { allowed: false, reason: 'invalid-presentation' };
  }
  if (
    presentation === 'safe_contact_preview'
    && decision.capability !== 'business.orders.customer_contact.read'
  ) {
    return { allowed: false, reason: 'presentation-not-applicable' };
  }

  const suppliedSelector = decision.selector;
  const selector = suppliedSelector === undefined || suppliedSelector === null
    ? null
    : canonicalSemanticSelector(suppliedSelector);
  if (suppliedSelector !== undefined && suppliedSelector !== null && !selector) {
    return { allowed: false, reason: 'invalid-selector' };
  }
  if (
    (decision.capability === 'business.products.price'
      || decision.capability === 'business.stock.read'
      || decision.capability === 'business.parties.search'
      || decision.capability === 'business.orders.search'
      || decision.capability === 'business.orders.customer_contact.read')
    && !selector
  ) {
    return { allowed: false, reason: 'missing-selector' };
  }
  if (
    selector?.kind === 'product'
    && decision.capability !== 'business.products.search'
    && decision.capability !== 'business.products.price'
  ) {
    return { allowed: false, reason: 'selector-not-applicable' };
  }
  if (selector?.kind === 'stock' && decision.capability !== 'business.stock.read') {
    return { allowed: false, reason: 'selector-not-applicable' };
  }
  if (selector?.kind === 'party' && decision.capability !== 'business.parties.search') {
    return { allowed: false, reason: 'selector-not-applicable' };
  }
  if (
    selector?.kind === 'order'
    && decision.capability !== 'business.orders.search'
    && decision.capability !== 'business.orders.customer_contact.read'
  ) {
    return { allowed: false, reason: 'selector-not-applicable' };
  }

  return { allowed: true, capability: decision.capability, selector, presentation };
}
