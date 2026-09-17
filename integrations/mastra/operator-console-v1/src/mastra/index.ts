import { Mastra } from '@mastra/core/mastra';
import { createTool } from '@mastra/core/tools';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

process.env.MASTRA_TELEMETRY_DISABLED = 'true';

const inputSchema = z.object({
  customerText: z.string().trim().min(1).max(12000),
});

const proposalSchema = z.object({
  kind: z.literal('send-text'),
  text: z.string().trim().min(1).max(12000),
  commitment: z.literal('none'),
  rationale: z.string().trim().min(1).max(4000),
});

const deterministicProposalTool = createTool({
  id: 'ana-deterministic-supervised-proposal',
  description: 'Operator-only deterministic smoke of the current supervised Ana workflow. No model or external tool call is performed.',
  inputSchema,
  outputSchema: proposalSchema,
  execute: async () => ({
    kind: 'send-text' as const,
    text: 'Olá! Obrigado pelo contato. Para eu entender melhor e te orientar, você pode me contar o que precisa?',
    commitment: 'none' as const,
    rationale: 'Proposta determinística de qualificação inicial, sem compromisso comercial.',
  }),
});

const deterministicProposalWorkflow = createWorkflow({
  id: 'ana-deterministic-supervised-proposal-v1',
  inputSchema,
  outputSchema: proposalSchema,
})
  .then(createStep(deterministicProposalTool))
  .commit();

export const mastra = new Mastra({
  workflows: {
    anaDeterministicSupervisedProposal: deterministicProposalWorkflow,
  },
});
