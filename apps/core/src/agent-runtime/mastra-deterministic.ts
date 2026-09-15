import { Mastra } from '@mastra/core/mastra';
import { createTool } from '@mastra/core/tools';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import type { AgentRuntime, EmployeeProposal, PlannerInput } from '../ana/contracts.js';

const deterministicInputSchema = z.object({
  customerText: z.string().trim().min(1).max(12000),
});

const deterministicProposalSchema = z.object({
  kind: z.literal('send-text'),
  text: z.string().trim().min(1).max(12000),
  commitment: z.literal('none'),
  rationale: z.string().trim().min(1).max(4000),
});

const deterministicProposalTool = createTool({
  id: 'ana-deterministic-supervised-proposal',
  description: 'Create a deterministic supervised qualification proposal without external model calls.',
  inputSchema: deterministicInputSchema,
  outputSchema: deterministicProposalSchema,
  execute: async () => ({
    kind: 'send-text' as const,
    text: 'Olá! Obrigado pelo contato. Para eu entender melhor e te orientar, você pode me contar o que precisa?',
    commitment: 'none' as const,
    rationale: 'Proposta determinística de qualificação inicial, sem compromisso comercial.',
  }),
});

const deterministicProposalWorkflow = createWorkflow({
  id: 'ana-deterministic-supervised-proposal-v1',
  inputSchema: deterministicInputSchema,
  outputSchema: deterministicProposalSchema,
})
  .then(createStep(deterministicProposalTool))
  .commit();

const mastra = new Mastra({
  workflows: {
    anaDeterministicSupervisedProposal: deterministicProposalWorkflow,
  },
});

export class MastraDeterministicAgentRuntime implements AgentRuntime {
  async proposeCommercialReply(input: PlannerInput): Promise<EmployeeProposal> {
    if (input.employee.role !== 'commercial-assistant' || input.employee.autonomyMode !== 'supervised') {
      throw new Error('Deterministic Ana runtime requires a supervised commercial-assistant employee.');
    }

    const workflow = mastra.getWorkflow('anaDeterministicSupervisedProposal');
    const run = await workflow.createRun();
    const result = await run.start({
      inputData: deterministicInputSchema.parse({ customerText: input.customerText }),
    });

    if (result.status !== 'success') {
      throw new Error(`Mastra deterministic proposal failed with status: ${result.status}`);
    }

    return deterministicProposalSchema.parse(result.result);
  }
}
