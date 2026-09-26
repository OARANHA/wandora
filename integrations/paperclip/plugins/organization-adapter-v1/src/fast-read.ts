import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { PluginContext } from '@paperclipai/plugin-sdk';
import { CATALOG_KEY } from './catalog.js';

export const FAST_READ_STATE_NAMESPACE = 'wandora-fast-read-dispatch-v1';
export const FAST_READ_REASON = 'wandora_fast_read_v1';
export const FAST_READ_PROMPT_PREFIX = 'WANDORA_FAST_READ_V1 ';
export const FAST_READ_RESULT_MAX_ATTEMPTS = 25;
export const FAST_READ_RESULT_POLL_INTERVAL_MS = 200;

type FastReadInput = {
  companyId: string;
  correlationId: string;
  intentToken: string;
  request: string;
};

type FastReadLatencyEvent = {
  event: 'wandora.latency.v1';
  path: 'semantic-fast-read-v1';
  stage: 'paperclip.dispatch' | 'paperclip.terminal_result';
  durationMs: number;
  outcome: 'success' | 'error';
  correlationId: string;
};

type FastReadLatencyRecorder = (event: FastReadLatencyEvent) => void;

type FastReadLatencyOptions = {
  recordLatency?: FastReadLatencyRecorder;
  monotonicNow?: () => number;
};

function emitFastReadLatency(
  recorder: FastReadLatencyRecorder | undefined,
  input: Omit<FastReadLatencyEvent, 'event' | 'path' | 'durationMs'> & { durationMs: number },
): void {
  if (!recorder) return;
  const rawDuration = input.durationMs;
  const durationMs = !Number.isFinite(rawDuration) || rawDuration <= 0
    ? 0
    : Math.round(rawDuration * 1_000) / 1_000;
  try {
    recorder({
      event: 'wandora.latency.v1',
      path: 'semantic-fast-read-v1',
      stage: input.stage,
      durationMs,
      outcome: input.outcome,
      correlationId: canonicalUuid(input.correlationId),
    });
  } catch {
    // Observability must never alter Paperclip execution semantics.
  }
}

type FastReadDispatchReceipt = {
  schema: 'wandora.fast_read_dispatch_receipt.v1';
  correlationId: string;
  requestHash: string;
  status: 'dispatching' | 'dispatched';
  runId?: string;
};

export type FastReadCompletedResult = {
  runId: string;
  model: string;
  summary: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
    totalTokens: number;
  };
};

function canonicalUuid(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized)) {
    throw new Error('fast_read_correlation_invalid');
  }
  return normalized;
}

function requestHash(input: FastReadInput): string {
  return createHash('sha256')
    .update(JSON.stringify([
      'wandora-paperclip-fast-read-v1',
      canonicalUuid(input.correlationId),
      input.intentToken,
      input.request,
    ]))
    .digest('hex');
}

function stateKey(input: FastReadInput) {
  return {
    scopeKind: 'company' as const,
    scopeId: input.companyId,
    namespace: FAST_READ_STATE_NAMESPACE,
    stateKey: canonicalUuid(input.correlationId),
  };
}

function asReceipt(value: unknown): FastReadDispatchReceipt | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (
    row.schema !== 'wandora.fast_read_dispatch_receipt.v1'
    || typeof row.correlationId !== 'string'
    || typeof row.requestHash !== 'string'
    || (row.status !== 'dispatching' && row.status !== 'dispatched')
    || (row.runId !== undefined && typeof row.runId !== 'string')
  ) return null;
  return row as FastReadDispatchReceipt;
}

export function encodeFastReadPrompt(input: Pick<FastReadInput, 'correlationId' | 'intentToken' | 'request'>): string {
  const request = input.request.trim();
  const intentToken = input.intentToken.trim();
  const correlationId = canonicalUuid(input.correlationId);
  if (!request || request.length > 12_000 || !intentToken || intentToken.length > 8_192) {
    throw new Error('fast_read_request_invalid');
  }
  return FAST_READ_PROMPT_PREFIX + Buffer.from(JSON.stringify({
    version: 1,
    correlationId,
    intentToken,
    request,
  }), 'utf8').toString('base64url');
}

export async function ensureManagedCatalogEmployeeFastRead(
  ctx: Pick<PluginContext, 'agents' | 'state'>,
  input: FastReadInput,
  options: FastReadLatencyOptions = {},
): Promise<{ runId: string; agentId: string }> {
  const monotonicNow = options.monotonicNow ?? (() => performance.now());
  const dispatchStartedAt = monotonicNow();
  try {
  const managed = await ctx.agents.managed.get(CATALOG_KEY, input.companyId);
  if (managed.status !== 'resolved' || !managed.agentId || !managed.agent) {
    throw new Error('managed_employee_missing');
  }
  const correlationId = canonicalUuid(input.correlationId);
  const hash = requestHash(input);
  const key = stateKey(input);
  const storedValue = await ctx.state.get(key);
  const stored = storedValue === null ? null : asReceipt(storedValue);
  if (storedValue !== null && !stored) throw new Error('fast_read_dispatch_receipt_invalid');
  if (stored) {
    if (stored.correlationId !== correlationId || stored.requestHash !== hash) {
      throw new Error('fast_read_dispatch_receipt_conflict');
    }
    if (stored.status === 'dispatched' && stored.runId) {
      const reused = { runId: stored.runId, agentId: managed.agentId };
      emitFastReadLatency(options.recordLatency, {
        stage: 'paperclip.dispatch',
        durationMs: monotonicNow() - dispatchStartedAt,
        outcome: 'success',
        correlationId: input.correlationId,
      });
      return reused;
    }
    throw new Error('fast_read_dispatch_uncertain');
  }

  const dispatching: FastReadDispatchReceipt = {
    schema: 'wandora.fast_read_dispatch_receipt.v1',
    correlationId,
    requestHash: hash,
    status: 'dispatching',
  };
  await ctx.state.set(key, dispatching);

  const result = await ctx.agents.invoke(managed.agentId, input.companyId, {
    prompt: encodeFastReadPrompt(input),
    reason: FAST_READ_REASON,
  });
  if (!result.runId) throw new Error('fast_read_dispatch_not_queued');

  await ctx.state.set(key, {
    ...dispatching,
    status: 'dispatched',
    runId: result.runId,
  } satisfies FastReadDispatchReceipt);

  const dispatched = { runId: result.runId, agentId: managed.agentId };
  emitFastReadLatency(options.recordLatency, {
    stage: 'paperclip.dispatch',
    durationMs: monotonicNow() - dispatchStartedAt,
    outcome: 'success',
    correlationId: input.correlationId,
  });
  return dispatched;
  } catch (error) {
    emitFastReadLatency(options.recordLatency, {
      stage: 'paperclip.dispatch',
      durationMs: monotonicNow() - dispatchStartedAt,
      outcome: 'error',
      correlationId: input.correlationId,
    });
    throw error;
  }
}

type WaitOptions = FastReadLatencyOptions & {
  maxAttempts?: number;
  pollIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForManagedCatalogEmployeeFastReadResult(
  ctx: Pick<PluginContext, 'agents' | 'state' | 'agentRuns'>,
  input: FastReadInput,
  options: WaitOptions = {},
): Promise<FastReadCompletedResult> {
  const { runId, agentId } = await ensureManagedCatalogEmployeeFastRead(ctx, input, options);
  const monotonicNow = options.monotonicNow ?? (() => performance.now());
  const terminalStartedAt = monotonicNow();
  try {
  const maxAttempts = options.maxAttempts ?? FAST_READ_RESULT_MAX_ATTEMPTS;
  const pollIntervalMs = options.pollIntervalMs ?? FAST_READ_RESULT_POLL_INTERVAL_MS;
  const sleep = options.sleep ?? defaultSleep;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > FAST_READ_RESULT_MAX_ATTEMPTS) {
    throw new Error('fast_read_wait_attempts_invalid');
  }
  if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 0 || pollIntervalMs > FAST_READ_RESULT_POLL_INTERVAL_MS) {
    throw new Error('fast_read_wait_interval_invalid');
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const run = await ctx.agentRuns.get({
      companyId: input.companyId,
      agentId,
      runId,
    });
    if (!run) throw new Error('fast_read_run_not_found');

    if (run.status === 'succeeded') {
      if (!run.result || !run.usage) throw new Error('fast_read_result_invalid');
      const completed = {
        runId,
        model: run.result.model,
        summary: run.result.summary,
        usage: run.usage,
      };
      emitFastReadLatency(options.recordLatency, {
        stage: 'paperclip.terminal_result',
        durationMs: monotonicNow() - terminalStartedAt,
        outcome: 'success',
        correlationId: input.correlationId,
      });
      return completed;
    }

    if (
      run.status === 'failed'
      || run.status === 'cancelled'
      || run.status === 'timed_out'
      || run.status === 'interrupted'
      || run.status === 'scheduled_retry'
    ) {
      throw new Error(`fast_read_run_${run.status}`);
    }

    if (attempt < maxAttempts) await sleep(pollIntervalMs);
  }

  throw new Error('fast_read_result_timeout');
  } catch (error) {
    emitFastReadLatency(options.recordLatency, {
      stage: 'paperclip.terminal_result',
      durationMs: monotonicNow() - terminalStartedAt,
      outcome: 'error',
      correlationId: input.correlationId,
    });
    throw error;
  }
}
