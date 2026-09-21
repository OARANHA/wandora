import { Agent } from '@mastra/core/agent';
import { z } from 'zod';
import type { AgentRuntime, EmployeeProposal, PlannerInput } from '../ana/contracts.js';
import type { AgentTaskRuntime, AssignedTaskInput, AssignedTaskResult } from './task-runtime.js';
import { MastraDeterministicAgentRuntime } from './mastra-deterministic.js';

// Wandora does not allow framework telemetry from the customer-processing runtime.
// This must execute before any Mastra module is loaded.
process.env.MASTRA_TELEMETRY_DISABLED = 'true';

const taskInputSchema = z.object({
  title: z.string().trim().min(1).max(12_000),
  description: z.string().trim().min(1).max(12_000).nullable(),
});

const taskOutputSchema = z.object({
  summary: z.string().trim().min(1).max(4_000),
});

export type ApprovedModelRuntimeConfig = {
  providerId: string;
  modelId: string;
  baseUrl: string;
  apiKey: string;
  maxOutputTokens: number;
  requestTimeoutMs: number;
  logicalModel: string;
};

const INTERNAL_TASK_INSTRUCTIONS = [
  'Você é Ana, Assistente Comercial Digital da empresa.',
  'Execute somente trabalho interno e supervisionado para revisão humana.',
  'Não envie mensagens, não realize ações externas e não alegue que realizou uma ação externa.',
  'Se a instrução pedir um efeito externo, produza apenas um rascunho, análise ou plano e deixe claro que o efeito não foi executado.',
  'Não invente fatos, registros, contatos, preços, prazos ou resultados que não estejam no trabalho fornecido.',
  'Use somente o título e a descrição recebidos como contexto desta execução.',
  'Responda em português do Brasil, de forma objetiva e útil para o owner.',
  'Retorne somente o resultado interno no campo summary.',
].join(' ');

export class MastraSupervisedModelAgentRuntime implements AgentRuntime, AgentTaskRuntime {
  private readonly deterministicIngress = new MastraDeterministicAgentRuntime();
  private readonly taskAgent: Agent;

  constructor(private readonly config: ApprovedModelRuntimeConfig) {
    this.taskAgent = new Agent({
      id: 'ana-supervised-model-v1',
      name: 'Ana Supervised Model',
      instructions: INTERNAL_TASK_INSTRUCTIONS,
      model: {
        providerId: config.providerId,
        modelId: config.modelId,
        url: config.baseUrl,
        apiKey: config.apiKey,
      },
      maxRetries: 0,
    });
  }

  async proposeCommercialReply(input: PlannerInput): Promise<EmployeeProposal> {
    // Inbound messaging remains deterministic until a separate provider-data/privacy slice authorizes model egress.
    return this.deterministicIngress.proposeCommercialReply(input);
  }

  async executeAssignedTask(input: AssignedTaskInput): Promise<AssignedTaskResult> {
    if (input.employee.role !== 'commercial-assistant' || input.employee.autonomyMode !== 'supervised') {
      throw new Error('Supervised model runtime requires a supervised commercial-assistant employee.');
    }

    const task = taskInputSchema.parse({
      title: input.task.title,
      description: input.task.description,
    });

    const result = await this.taskAgent.generate(
      [{
        role: 'user',
        content: JSON.stringify({
          title: task.title,
          description: task.description,
        }),
      }],
      {
        maxSteps: 1,
        abortSignal: AbortSignal.timeout(this.config.requestTimeoutMs),
        modelSettings: {
          maxOutputTokens: this.config.maxOutputTokens,
          temperature: 0.2,
        },
        structuredOutput: {
          schema: taskOutputSchema,
        },
      },
    );

    const output = taskOutputSchema.parse(result.object);
    const usage = {
      inputTokens: result.totalUsage?.inputTokens ?? null,
      outputTokens: result.totalUsage?.outputTokens ?? null,
      cachedInputTokens: result.totalUsage?.cachedInputTokens ?? null,
      totalTokens: result.totalUsage?.totalTokens ?? null,
    };
    console.log(JSON.stringify({
      event: 'wandora.agent-runtime.model-usage',
      logicalModel: this.config.logicalModel,
      providerId: this.config.providerId,
      modelId: this.config.modelId,
      ...usage,
    }));

    return {
      model: this.config.logicalModel,
      summary: output.summary,
      usage,
    };
  }
}
