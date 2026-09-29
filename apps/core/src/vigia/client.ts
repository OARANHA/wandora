import { randomBytes } from 'node:crypto';

export type VigiaClientConfig = {
  baseUrl: string;
  projectSlug: string;
  apiKey: string;
  requestTimeoutMs: number;
};

export type VigiaWorkCompletedInput = {
  organizationId: string;
  employeeId: string;
  workId: string;
  executionId: string;
  model: string;
  startTimeUnixNano: bigint;
  endTimeUnixNano: bigint;
};

export type VigiaWorkCompletedResult = {
  traceId: string;
};

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

const stringAttribute = (key: string, value: string) => ({
  key,
  value: { stringValue: value },
});

export class VigiaClient {
  constructor(
    private readonly config: VigiaClientConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async recordWorkCompleted(input: VigiaWorkCompletedInput): Promise<VigiaWorkCompletedResult> {
    const traceId = randomBytes(16).toString('hex');
    const spanId = randomBytes(8).toString('hex');
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const commonHeaders = {
      Authorization: `Bearer ${this.config.apiKey}`,
      'X-Vigia-Project': this.config.projectSlug,
    };
    const signal = AbortSignal.timeout(this.config.requestTimeoutMs);

    const traceResponse = await this.fetchImpl(`${baseUrl}/v1/traces`, {
      method: 'POST',
      headers: {
        ...commonHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resourceSpans: [{
          resource: {
            attributes: [
              stringAttribute('service.name', 'wandora-core'),
              stringAttribute('deployment.environment', 'production'),
              stringAttribute('wandora.product', 'wandora'),
            ],
          },
          scopeSpans: [{
            scope: {
              name: 'wandora-vigia',
              version: '1.0',
            },
            spans: [{
              traceId,
              spanId,
              name: 'wandora.digital_employee.work',
              kind: 1,
              startTimeUnixNano: input.startTimeUnixNano.toString(),
              endTimeUnixNano: input.endTimeUnixNano.toString(),
              attributes: [
                stringAttribute('wandora.flow', 'digital_employee_work'),
                stringAttribute('wandora.organization_id', input.organizationId),
                stringAttribute('wandora.employee_id', input.employeeId),
                stringAttribute('wandora.work_id', input.workId),
                stringAttribute('wandora.execution_id', input.executionId),
                stringAttribute('gen_ai.response.model', input.model),
              ],
            }],
          }],
        }],
      }),
      signal,
    });

    if (!traceResponse.ok) {
      throw new Error(`Vigia OTLP trace export failed with HTTP ${traceResponse.status}.`);
    }

    const occurredAt = new Date(Number(input.endTimeUnixNano / 1_000_000n)).toISOString();
    const eventResponse = await this.fetchImpl(
      `${baseUrl}/v1/projects/${encodeURIComponent(this.config.projectSlug)}/events`,
      {
        method: 'POST',
        headers: {
          ...commonHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          traceId,
          event: 'work_completed',
          success: true,
          label: 'Trabalho concluído',
          occurredAt,
          metadata: {
            flow: 'digital_employee_work',
            organizationId: input.organizationId,
            employeeId: input.employeeId,
            workId: input.workId,
            executionId: input.executionId,
            model: input.model,
          },
        }),
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
      },
    );

    if (!eventResponse.ok) {
      throw new Error(`Vigia Business Event export failed with HTTP ${eventResponse.status}.`);
    }

    return { traceId };
  }
}
