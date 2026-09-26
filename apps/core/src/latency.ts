import { performance } from 'node:perf_hooks';

export type FastReadLatencyStage =
  | 'core.auth_context'
  | 'core.capability_projection'
  | 'jev.semantic_decision'
  | 'paperclip.dispatch_roundtrip'
  | 'paperclip.tool_gateway'
  | 'paperclip.read_tool'
  | 'core.response';

export type FastReadLatencyOutcome = 'success' | 'fallback' | 'error';

export type FastReadLatencyEvent = {
  event: 'wandora.latency.v1';
  path: 'semantic-fast-read-v1';
  stage: FastReadLatencyStage;
  durationMs: number;
  outcome: FastReadLatencyOutcome;
  correlationId?: string;
};

export type FastReadLatencyRecorder = (event: FastReadLatencyEvent) => void;

export function fastReadMonotonicNow(): number {
  return performance.now();
}

function boundedDurationMs(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 1_000) / 1_000;
}

export function emitFastReadLatency(
  recorder: FastReadLatencyRecorder | undefined,
  input: Omit<FastReadLatencyEvent, 'event' | 'path' | 'durationMs'> & { durationMs: number },
): void {
  if (!recorder) return;
  const event: FastReadLatencyEvent = {
    event: 'wandora.latency.v1',
    path: 'semantic-fast-read-v1',
    stage: input.stage,
    durationMs: boundedDurationMs(input.durationMs),
    outcome: input.outcome,
    ...(input.correlationId ? { correlationId: input.correlationId } : {}),
  };
  try {
    recorder(event);
  } catch {
    // Observability must never alter admission/execution semantics.
  }
}

export function createConsoleFastReadLatencyRecorder(): FastReadLatencyRecorder {
  return (event) => {
    console.log(JSON.stringify(event));
  };
}
