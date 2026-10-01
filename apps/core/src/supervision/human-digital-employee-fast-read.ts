import { randomUUID } from 'node:crypto';
import {
  emitFastReadLatency,
  fastReadMonotonicNow,
  type FastReadLatencyRecorder,
  type FastReadLatencyStage,
} from '../latency.js';
import {
  gateDeterministicRead,
  validateSemanticSelectorDecision,
  type BusinessCapability,
  type SemanticDecisionProvider,
  type SemanticRouteDecision,
  type SemanticRouteGateReason,
  type SemanticRoutePolicy,
  type SemanticSelectorProvider,
} from '../semantic-routing/contracts.js';
import { issueFastReadIntent } from '../semantic-routing/fast-read-intent.js';
import type {
  OrganizationAdapterFastReadBridge,
  OrganizationAdapterFastReadResult,
} from '../organization-adapter/contracts.js';

export type HumanFastReadDispatchResult = OrganizationAdapterFastReadResult;
export type HumanFastReadBridge = OrganizationAdapterFastReadBridge;

export type SemanticFastReadRolloutPolicy = {
  targets: readonly {
    organizationId: string;
    employeeId: string;
  }[];
  capabilities: readonly BusinessCapability[];
};

export type HumanFastReadAdmissionResult =
  | {
      kind: 'completed';
      correlationId: string;
      model: 'wandora-deterministic-read-v1';
      summary: string;
      usage: HumanFastReadDispatchResult['usage'];
    }
  | {
      kind: 'clarification';
      prompt: string;
    }
  | {
      kind: 'fallback';
      reason: SemanticRouteGateReason | 'rollout-not-enabled';
    };

function boundedRequest(value: string): string {
  const request = value.trim();
  if (!request || request.length > 12_000) throw new Error('invalid-fast-read-request');
  return request;
}

function requireDeterministicResult(
  result: HumanFastReadDispatchResult,
): asserts result is HumanFastReadDispatchResult & { model: 'wandora-deterministic-read-v1' } {
  if (
    result.model !== 'wandora-deterministic-read-v1'
    || typeof result.summary !== 'string'
    || !result.summary.trim()
    || result.summary.length > 12_000
    || result.usage.inputTokens !== 0
    || result.usage.outputTokens !== 0
    || result.usage.cachedInputTokens !== 0
    || result.usage.totalTokens !== 0
  ) {
    throw new Error('invalid-fast-read-result');
  }
}

function stockClarification(
  decision: SemanticRouteDecision,
  reason: SemanticRouteGateReason,
): HumanFastReadAdmissionResult | null {
  if (
    decision.capability !== 'business.stock.read'
    || ![
      'needs-more-context',
      'ambiguous',
      'missing-selector',
      'invalid-selector',
      'selector-not-applicable',
    ].includes(reason)
  ) return null;

  return {
    kind: 'clarification',
    prompt: 'Para consultar estoque com segurança, informe um único código de produto e um único depósito/local de estoque.',
  };
}

export class HumanDigitalEmployeeFastReadService {
  constructor(private readonly deps: {
    bridge: HumanFastReadBridge;
    semanticDecisionProvider: SemanticDecisionProvider;
    semanticSelectorProvider?: SemanticSelectorProvider;
    policy: SemanticRoutePolicy;
    intentSecret: string;
    rolloutPolicy?: SemanticFastReadRolloutPolicy;
    createCorrelationId?: () => string;
    now?: () => number;
    recordLatency?: FastReadLatencyRecorder;
    monotonicNow?: () => number;
  }) {}

  async execute(input: {
    organizationId: string;
    actorUserId: string;
    employeeId: string;
    request: string;
  }): Promise<HumanFastReadAdmissionResult> {
    const request = boundedRequest(input.request);
    const rolloutCapabilities = this.deps.rolloutPolicy
      ? this.deps.rolloutPolicy.targets.some((target) => (
          target.organizationId.toLowerCase() === input.organizationId.toLowerCase()
          && target.employeeId.toLowerCase() === input.employeeId.toLowerCase()
        ))
        ? this.deps.rolloutPolicy.capabilities
        : null
      : undefined;
    if (rolloutCapabilities === null) {
      return { kind: 'fallback', reason: 'rollout-not-enabled' };
    }

    const correlationId = (this.deps.createCorrelationId ?? randomUUID)();
    const monotonicNow = this.deps.monotonicNow ?? fastReadMonotonicNow;
    const timed = async <T>(
      stage: FastReadLatencyStage,
      operation: () => Promise<T>,
    ): Promise<T> => {
      const startedAt = monotonicNow();
      try {
        const value = await operation();
        emitFastReadLatency(this.deps.recordLatency, {
          stage,
          durationMs: monotonicNow() - startedAt,
          outcome: 'success',
          correlationId,
        });
        return value;
      } catch (error) {
        emitFastReadLatency(this.deps.recordLatency, {
          stage,
          durationMs: monotonicNow() - startedAt,
          outcome: 'error',
          correlationId,
        });
        throw error;
      }
    };

    const operationalCapabilities = await timed(
      'core.capability_projection',
      () => this.deps.bridge.getAvailableCapabilities({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        employeeId: input.employeeId,
      }),
    );
    const availableCapabilities = rolloutCapabilities === undefined
      ? operationalCapabilities
      : operationalCapabilities.filter((capability) => rolloutCapabilities.includes(capability));
    if (rolloutCapabilities !== undefined && availableCapabilities.length === 0) {
      return { kind: 'fallback', reason: 'capability-not-advertised' };
    }

    let decision = await timed(
      'jev.semantic_decision',
      () => this.deps.semanticDecisionProvider.decide({
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        request,
        availableCapabilities,
      }),
    );
    let gate = gateDeterministicRead(decision, availableCapabilities, this.deps.policy);

    if (
      !gate.allowed
      && gate.reason === 'missing-selector'
      && decision.capability
      && this.deps.semanticSelectorProvider
    ) {
      const selectorDecision = await timed(
        'semantic.product_selector',
        () => this.deps.semanticSelectorProvider!.select({
          organizationId: input.organizationId,
          employeeId: input.employeeId,
          request,
          capability: decision.capability!,
        }),
      );
      if (!validateSemanticSelectorDecision(selectorDecision)) {
        return { kind: 'fallback', reason: 'invalid-selector' };
      }

      decision = {
        ...decision,
        selector: selectorDecision.selector,
        confidence: Math.min(decision.confidence, selectorDecision.confidence),
        ambiguity: selectorDecision.ambiguity === 'none'
          ? decision.ambiguity
          : selectorDecision.ambiguity,
      } satisfies SemanticRouteDecision;
      gate = gateDeterministicRead(decision, availableCapabilities, this.deps.policy);
    }

    if (!gate.allowed) {
      return stockClarification(decision, gate.reason)
        ?? { kind: 'fallback', reason: gate.reason };
    }

    const nowMs = (this.deps.now ?? Date.now)();
    const intentToken = issueFastReadIntent({
      secret: this.deps.intentSecret,
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      correlationId,
      request,
      decision,
      availableCapabilities,
      policy: this.deps.policy,
      nowMs,
    });

    const result = await timed(
      'paperclip.dispatch_roundtrip',
      () => this.deps.bridge.dispatchFastRead({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        employeeId: input.employeeId,
        correlationId,
        intentToken,
        request,
      }),
    );
    requireDeterministicResult(result);

    return {
      kind: 'completed',
      correlationId,
      model: result.model,
      summary: result.summary.trim(),
      usage: result.usage,
    };
  }
}
