import type { OutboundTextResult } from '../contracts/messaging-gateway.js';

export type OutboundAttempt =
  | { state: 'pending'; fingerprint: string }
  | { state: 'uncertain'; fingerprint: string }
  | { state: 'succeeded'; fingerprint: string; result: OutboundTextResult };

export type BeginAttemptResult =
  | { kind: 'started' }
  | { kind: 'existing'; attempt: OutboundAttempt };

export interface OutboundAttemptStore {
  begin(key: string, fingerprint: string): Promise<BeginAttemptResult>;
  markUncertain(key: string, fingerprint: string): Promise<void>;
  markSucceeded(key: string, fingerprint: string, result: OutboundTextResult): Promise<void>;
}

export class InMemoryOutboundAttemptStore implements OutboundAttemptStore {
  private readonly attempts = new Map<string, OutboundAttempt>();

  async begin(key: string, fingerprint: string): Promise<BeginAttemptResult> {
    const existing = this.attempts.get(key);
    if (existing) return { kind: 'existing', attempt: existing };
    this.attempts.set(key, { state: 'pending', fingerprint });
    return { kind: 'started' };
  }

  async markUncertain(key: string, fingerprint: string): Promise<void> {
    this.attempts.set(key, { state: 'uncertain', fingerprint });
  }

  async markSucceeded(
    key: string,
    fingerprint: string,
    result: OutboundTextResult,
  ): Promise<void> {
    this.attempts.set(key, { state: 'succeeded', fingerprint, result });
  }
}
