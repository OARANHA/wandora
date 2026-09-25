import { createHash } from 'node:crypto';
import type { RuntimeReadTool } from '../agent-runtime/task-runtime.js';
import { DeterministicReadExecutor } from '../agent-runtime/deterministic-read.js';
import {
  createDeterministicReadBindingsFromAuthorizedTools,
  type RuntimeReadCapabilityAdapter,
} from '../agent-runtime/runtime-read-capability-binding.js';
import { verifyFastReadIntent } from '../semantic-routing/fast-read-intent.js';
import type { PaperclipRunIdentity } from './paperclip-run-identity.js';

export class PaperclipFastReadExecutionService {
  private readonly executor = new DeterministicReadExecutor({
    minimumConfidence: 1,
    maximumNeedsMoreContext: 0,
    maximumNeedsHumanReview: 0,
    minimumNeedsDataOrToolLookup: 1,
  });

  constructor(private readonly deps: {
    intentSecret: string;
    bindingResolver: {
      resolveExecutionBinding(identity: PaperclipRunIdentity): Promise<{
        organizationId: string;
        employee: { employee_id: string };
      }>;
    };
    readToolBridge: (input: {
      runToken: string;
      paperclipRunId: string;
    }) => Promise<RuntimeReadTool[]>;
    capabilityAdapter: RuntimeReadCapabilityAdapter;
  }) {}

  async execute(input: {
    intentToken: string;
    correlationId: string;
    request: string;
    identity: PaperclipRunIdentity;
    paperclipRunId: string;
    runToken: string;
    nowMs?: number;
  }): Promise<{
    executionId: string;
    model: string;
    summary: string;
    usage: {
      inputTokens: number;
      outputTokens: number;
      cachedInputTokens: number;
      totalTokens: number;
    };
  }> {
    const binding = await this.deps.bindingResolver.resolveExecutionBinding(input.identity);

    const intent = verifyFastReadIntent({
      secret: this.deps.intentSecret,
      token: input.intentToken,
      request: input.request,
      expectedOrganizationId: binding.organizationId,
      expectedEmployeeId: binding.employee.employee_id,
      expectedCorrelationId: input.correlationId,
      ...(input.nowMs === undefined ? {} : { nowMs: input.nowMs }),
    });

    const tools = await this.deps.readToolBridge({
      runToken: input.runToken,
      paperclipRunId: input.paperclipRunId,
    });
    const bindings = createDeterministicReadBindingsFromAuthorizedTools(
      tools,
      this.deps.capabilityAdapter,
    );

    const result = await this.executor.executeAuthorizedIntent({
      request: input.request,
      capability: intent.capability,
      bindings,
    });
    if (result.kind !== 'completed') {
      throw new Error('fast_read_capability_unavailable');
    }

    return {
      executionId: 'fast_' + createHash('sha256')
        .update(JSON.stringify([
          'wandora-fast-read-v1',
          intent.correlationId,
          input.paperclipRunId,
          binding.organizationId,
          binding.employee.employee_id,
        ]))
        .digest('hex'),
      model: result.model,
      summary: result.summary,
      usage: result.usage,
    };
  }
}
