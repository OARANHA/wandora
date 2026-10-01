import { performance } from 'node:perf_hooks';

export type MessagingLatencyStage = 'whatsapp.gateway_ingress' | 'whatsapp.outbound';
export type MessagingLatencyOutcome = 'success' | 'error';

export type MessagingLatencyEvent = {
  event: 'wandora.latency.v1';
  path: 'whatsapp-messaging-v1';
  stage: MessagingLatencyStage;
  durationMs: number;
  outcome: MessagingLatencyOutcome;
  correlationId?: string;
};

export type MessagingLatencyRecorder = (event: MessagingLatencyEvent) => void;

export function messagingMonotonicNow(): number {
  return performance.now();
}

export function emitMessagingLatency(
  recorder: MessagingLatencyRecorder | undefined,
  input: Omit<MessagingLatencyEvent, 'event' | 'path' | 'durationMs'> & { durationMs: number },
): void {
  if (!recorder) return;
  const rawDuration = input.durationMs;
  const durationMs = !Number.isFinite(rawDuration) || rawDuration <= 0
    ? 0
    : Math.round(rawDuration * 1_000) / 1_000;
  const event: MessagingLatencyEvent = {
    event: 'wandora.latency.v1',
    path: 'whatsapp-messaging-v1',
    stage: input.stage,
    durationMs,
    outcome: input.outcome,
    ...(input.correlationId ? { correlationId: input.correlationId } : {}),
  };
  try {
    recorder(event);
  } catch {
    // Observability must never change delivery semantics.
  }
}

export function createConsoleMessagingLatencyRecorder(): MessagingLatencyRecorder {
  return (event) => {
    console.log(JSON.stringify(event));
  };
}
