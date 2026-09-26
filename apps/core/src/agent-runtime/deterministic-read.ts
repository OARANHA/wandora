import type {
  BusinessCapability,
  SemanticRouteDecision,
  SemanticSelector,
  SemanticRouteGateReason,
  SemanticRoutePolicy,
} from '../semantic-routing/contracts.js';
import { gateDeterministicRead } from '../semantic-routing/contracts.js';

export type DeterministicReadFact = {
  label: string;
  value: string;
};

export type DeterministicReadNormalizedResult =
  | {
      kind: 'facts';
      subject: string | null;
      facts: DeterministicReadFact[];
    }
  | {
      kind: 'clarification';
      prompt: string;
      options: string[];
    }
  | {
      kind: 'not_found';
      message: string;
    };

export type DeterministicReadBinding = {
  capability: BusinessCapability;
  execute: (
    request: string,
    selector: SemanticSelector | null,
  ) => Promise<DeterministicReadNormalizedResult>;
};

export type DeterministicReadExecution =
  | {
      kind: 'completed';
      capability: BusinessCapability;
      model: 'wandora-deterministic-read-v1';
      summary: string;
      toolCalls: 1;
      usage: {
        inputTokens: 0;
        outputTokens: 0;
        cachedInputTokens: 0;
        totalTokens: 0;
      };
    }
  | {
      kind: 'fallback';
      reason: SemanticRouteGateReason | 'capability-binding-unavailable';
      toolCalls: 0;
    };

function nonEmptyText(value: string, max = 2_000): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > max) {
    throw new Error('deterministic_read_invalid_text');
  }
  return normalized;
}

function render(result: DeterministicReadNormalizedResult): string {
  switch (result.kind) {
    case 'facts': {
      if (result.facts.length === 0 || result.facts.length > 12) {
        throw new Error('deterministic_read_invalid_facts');
      }
      const subject = result.subject ? nonEmptyText(result.subject, 500) : null;
      const lines = result.facts.map((fact) => {
        const label = nonEmptyText(fact.label, 120);
        const value = nonEmptyText(fact.value, 1_000);
        return `${label}: ${value}`;
      });
      return subject ? `${subject}\n${lines.join('\n')}` : lines.join('\n');
    }
    case 'clarification': {
      const prompt = nonEmptyText(result.prompt, 1_000);
      if (result.options.length === 0 || result.options.length > 8) {
        throw new Error('deterministic_read_invalid_options');
      }
      const options = result.options.map((option) => nonEmptyText(option, 300));
      return `${prompt}\n${options.map((option, index) => `${index + 1}. ${option}`).join('\n')}`;
    }
    case 'not_found':
      return nonEmptyText(result.message, 1_000);
  }
}

export class DeterministicReadExecutor {
  constructor(
    private readonly policy: SemanticRoutePolicy,
  ) {}

  private async executeCapability(input: {
    request: string;
    capability: BusinessCapability;
    selector: SemanticSelector | null;
    bindings: readonly DeterministicReadBinding[];
  }): Promise<DeterministicReadExecution> {
    const request = nonEmptyText(input.request, 12_000);
    const matches = input.bindings.filter((binding) => binding.capability === input.capability);
    if (matches.length !== 1) {
      return { kind: 'fallback', reason: 'capability-binding-unavailable', toolCalls: 0 };
    }

    const normalized = await matches[0]!.execute(request, input.selector);
    return {
      kind: 'completed',
      capability: input.capability,
      model: 'wandora-deterministic-read-v1',
      summary: render(normalized),
      toolCalls: 1,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        cachedInputTokens: 0,
        totalTokens: 0,
      },
    };
  }

  async executeAuthorizedIntent(input: {
    request: string;
    capability: BusinessCapability;
    selector: SemanticSelector | null;
    bindings: readonly DeterministicReadBinding[];
  }): Promise<DeterministicReadExecution> {
    return this.executeCapability(input);
  }

  async execute(input: {
    request: string;
    decision: SemanticRouteDecision;
    bindings: readonly DeterministicReadBinding[];
  }): Promise<DeterministicReadExecution> {
    const request = nonEmptyText(input.request, 12_000);
    const availableCapabilities = input.bindings.map((binding) => binding.capability);
    const gate = gateDeterministicRead(input.decision, availableCapabilities, this.policy);
    if (!gate.allowed) {
      return { kind: 'fallback', reason: gate.reason, toolCalls: 0 };
    }

    return this.executeCapability({
      request,
      capability: gate.capability,
      selector: gate.selector,
      bindings: input.bindings,
    });
  }
}
