import type { RuntimeReadTool } from './task-runtime.js';
import type {
  DeterministicReadBinding,
  DeterministicReadNormalizedResult,
} from './deterministic-read.js';
import type { BusinessCapability, SemanticSelector } from '../semantic-routing/contracts.js';

export type RuntimeReadCapabilityAdapter = {
  capabilitiesFor(tool: RuntimeReadTool): readonly BusinessCapability[];
  execute(input: {
    tool: RuntimeReadTool;
    capability: BusinessCapability;
    request: string;
    selector: SemanticSelector | null;
  }): Promise<DeterministicReadNormalizedResult>;
};

export function createDeterministicReadBindingsFromAuthorizedTools(
  tools: readonly RuntimeReadTool[],
  adapter: RuntimeReadCapabilityAdapter,
): DeterministicReadBinding[] {
  const bindings: DeterministicReadBinding[] = [];
  for (const tool of tools) {
    const capabilities = adapter.capabilitiesFor(tool);
    const seen = new Set<BusinessCapability>();
    for (const capability of capabilities) {
      if (seen.has(capability)) continue;
      seen.add(capability);
      bindings.push({
        capability,
        execute: (request, selector) => adapter.execute({ tool, capability, request, selector }),
      });
    }
  }
  return bindings;
}
