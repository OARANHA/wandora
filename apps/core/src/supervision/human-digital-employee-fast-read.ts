import { randomUUID } from 'node:crypto';
import {
  gateDeterministicRead,
  type BusinessCapability,
  type SemanticDecisionProvider,
  type SemanticRouteGateReason,
  type SemanticRoutePolicy,
} from '../semantic-routing/contracts.js';
import { issueFastReadIntent } from '../semantic-routing/fast-read-intent.js';

export type HumanFastReadDispatchResult = {
  model: string;
  summary: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
    totalTokens: number;
  };
};

export type HumanFastReadBridge = {
  getAvailableCapabilities(input: {
    organizationId: string;
    actorUserId: string;
    employeeId: string;
  }): Promise<BusinessCapability[]>;
  dispatchFastRead(input: {
    organizationId: string;
    actorUserId: string;
    employeeId: string;
    correlationId: string;
    intentToken: string;
    request: string;
  }): Promise<HumanFastReadDispatchResult>;
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
      kind: 'fallback';
      reason: SemanticRouteGateReason;
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

export class HumanDigitalEmployeeFastReadService {
  constructor(private readonly deps: {
    bridge: HumanFastReadBridge;
    semanticDecisionProvider: SemanticDecisionProvider;
    policy: SemanticRoutePolicy;
    intentSecret: string;
    createCorrelationId?: () => string;
    now?: () => number;
  }) {}

  async execute(input: {
    organizationId: string;
    actorUserId: string;
    employeeId: string;
    request: string;
  }): Promise<HumanFastReadAdmissionResult> {
    const request = boundedRequest(input.request);
    const availableCapabilities = await this.deps.bridge.getAvailableCapabilities({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      employeeId: input.employeeId,
    });

    const decision = await this.deps.semanticDecisionProvider.decide({
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      request,
      availableCapabilities,
    });
    const gate = gateDeterministicRead(decision, availableCapabilities, this.deps.policy);
    if (!gate.allowed) return { kind: 'fallback', reason: gate.reason };

    const correlationId = (this.deps.createCorrelationId ?? randomUUID)();
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

    const result = await this.deps.bridge.dispatchFastRead({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      employeeId: input.employeeId,
      correlationId,
      intentToken,
      request,
    });
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
