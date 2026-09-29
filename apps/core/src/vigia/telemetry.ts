import { randomBytes } from 'node:crypto';

export type VigiaTelemetryClientConfig = {
  baseUrl: string;
  projectSlug: string;
  apiKey: string;
  requestTimeoutMs: number;
};

export type CompletedWorkTelemetryInput = {
  organizationId: string;
  employeeId: string;
  workId: string;
  paperclipRunId: string;
  executionId: string;
  model: string;
  startedAtMs: number;
  completedAtMs: number;
};

export interface CompletedWorkTelemetry {
  recordCompleted(input: CompletedWorkTelemetryInput): Promise<{ traceId: string }>;
}

type FetchLike = typeof fetch;

const stringAttribute = (key: string, value: string) => ({
  key,
  value: { stringValue: value },
});

export class VigiaPublicTelemetryClient implements CompletedWorkTelemetry {
  constructor(
    private readonly config: VigiaTelemetryClientConfig,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly randomBytesImpl: (size: number) => Buffer = randomBytes,
  ) {}

  private headers(contentType?: string): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      'X-Vigia-Project': this.config.projectSlug,
      ...(contentType ? { 'Content-Type': contentType } : {}),
    };
  }

  private async post(path: string, body: string): Promise<Response> {
    return this.fetchImpl(`${this.config.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers('application/json'),
      body,
      signal: AbortSignal.timeout(this.config.requestTimeoutMs),
    });
  }

  private async waitForTrace(traceId: string): Promise<void> {
    const path = `/v1/projects/${encodeURIComponent(this.config.projectSlug)}/traces/${traceId}`;
    for (const delayMs of [0, 100, 250, 500, 1_000]) {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      const response = await this.fetchImpl(`${this.config.baseUrl}${path}`, {
        method: 'GET',
        headers: this.headers(),
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
      });
      if (response.status === 200) return;
      if (response.status !== 404) {
        throw new Error(`Vigia trace lookup failed with HTTP ${response.status}.`);
      }
    }
    throw new Error('Vigia trace was not readable after OTLP ingest.');
  }

  async recordCompleted(input: CompletedWorkTelemetryInput): Promise<{ traceId: string }> {
    const traceId = this.randomBytesImpl(16).toString('hex');
    const spanId = this.randomBytesImpl(8).toString('hex');
    const startedAtUnixNano = (BigInt(Math.trunc(input.startedAtMs)) * 1_000_000n).toString();
    const completedAtUnixNano = (BigInt(Math.trunc(input.completedAtMs)) * 1_000_000n).toString();

    const otlpBody = JSON.stringify({
      resourceSpans: [{
        resource: {
          attributes: [
            stringAttribute('service.name', 'wandora-core'),
            stringAttribute('service.namespace', 'wandora'),
            stringAttribute('deployment.environment', 'production'),
          ],
        },
        scopeSpans: [{
          scope: { name: 'wandora.vigia', version: '1.0' },
          spans: [{
            traceId,
            spanId,
            name: 'wandora.digital_employee.work',
            kind: 1,
            startTimeUnixNano: startedAtUnixNano,
            endTimeUnixNano: completedAtUnixNano,
            attributes: [
              stringAttribute('wandora.organization.id', input.organizationId),
              stringAttribute('wandora.employee.id', input.employeeId),
              stringAttribute('wandora.work.id', input.workId),
              stringAttribute('wandora.paperclip.run_id', input.paperclipRunId),
              stringAttribute('wandora.execution.id', input.executionId),
              stringAttribute('gen_ai.request.model', input.model),
            ],
            status: { code: 1 },
          }],
        }],
      }],
    });

    const ingest = await this.post('/v1/traces', otlpBody);
    if (!ingest.ok) {
      throw new Error(`Vigia OTLP ingest failed with HTTP ${ingest.status}.`);
    }

    await this.waitForTrace(traceId);

    const eventBody = JSON.stringify({
      traceId,
      event: 'work_completed',
      success: true,
      label: 'Trabalho concluído',
      occurredAt: new Date(input.completedAtMs).toISOString(),
      metadata: {
        source: 'wandora',
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        workId: input.workId,
        paperclipRunId: input.paperclipRunId,
        executionId: input.executionId,
        model: input.model,
      },
    });

    const businessEvent = await this.post(
      `/v1/projects/${encodeURIComponent(this.config.projectSlug)}/events`,
      eventBody,
    );
    if (businessEvent.status !== 201) {
      throw new Error(`Vigia Business Event failed with HTTP ${businessEvent.status}.`);
    }

    return { traceId };
  }
}
