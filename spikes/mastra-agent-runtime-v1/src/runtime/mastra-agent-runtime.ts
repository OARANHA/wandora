import type {
  AgentRuntime,
  WandoraRuntimeRequest,
  WandoraRuntimeResult,
} from '../contracts/agent-runtime.js';
import { mastra } from '../mastra/index.js';
import { normalizeContactOutputSchema } from '../mastra/normalize-contact-tool.js';

export class MastraAgentRuntime implements AgentRuntime {
  async execute(request: WandoraRuntimeRequest): Promise<WandoraRuntimeResult> {
    const workflow = mastra.getWorkflow('normalizeContact');
    const run = await workflow.createRun();
    const result = await run.start({ inputData: request.payload });

    if (result.status !== 'success') {
      throw new Error(`Agent runtime failed with status: ${result.status}`);
    }

    return {
      ok: true,
      operation: request.operation,
      output: normalizeContactOutputSchema.parse(result.result),
    };
  }
}
