import { createHash } from 'node:crypto';
import type { PluginContext } from '@paperclipai/plugin-sdk';
import { CATALOG_KEY } from './catalog.js';

export const FAST_READ_STATE_NAMESPACE = 'wandora-fast-read-dispatch-v1';
export const FAST_READ_REASON = 'wandora_fast_read_v1';
export const FAST_READ_PROMPT_PREFIX = 'WANDORA_FAST_READ_V1 ';

type FastReadInput = {
  companyId: string;
  correlationId: string;
  intentToken: string;
  request: string;
};

type FastReadDispatchReceipt = {
  schema: 'wandora.fast_read_dispatch_receipt.v1';
  correlationId: string;
  requestHash: string;
  status: 'dispatching' | 'dispatched';
  runId?: string;
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
): Promise<{ runId: string }> {
  const managed = await ctx.agents.managed.get(CATALOG_KEY, input.companyId);
  if (managed.status !== 'resolved' || !managed.agentId || !managed.agent) {
    throw new Error('managed_employee_missing');
  }
  if (managed.agent.status !== 'idle') {
    throw new Error('managed_employee_not_ready:' + managed.agent.status);
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
    if (stored.status === 'dispatched' && stored.runId) return { runId: stored.runId };
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

  return { runId: result.runId };
}
