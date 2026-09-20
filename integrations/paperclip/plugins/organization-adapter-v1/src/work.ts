import { createHash } from 'node:crypto';
import type { PluginContext } from '@paperclipai/plugin-sdk';
import { CATALOG_KEY } from './catalog.js';

export const WORK_ORIGIN_KIND =
  'plugin:wandora.organization-adapter-v1:customer-work-v1';
export const WORK_STATE_NAMESPACE = 'wandora-customer-work-v1';

export function workDescription(workId: string, description: string): string {
  return `<!-- wandora-work-v1:${workId} -->\n${description}`;
}

type WorkInput = {
  companyId: string;
  workId: string;
  title: string;
  description: string;
};

type DispatchReceipt = {
  schema: 'wandora.work_dispatch_receipt.v1';
  workId: string;
  requestHash: string;
  issueId: string;
  status: 'dispatching' | 'dispatched';
  runId?: string;
};

const requestHash = (input: WorkInput): string => createHash('sha256')
  .update(JSON.stringify([
    'wandora-paperclip-customer-work-v1',
    input.workId,
    input.title,
    input.description,
  ]))
  .digest('hex');

const receiptKey = (input: WorkInput) => ({
  scopeKind: 'company' as const,
  scopeId: input.companyId,
  namespace: WORK_STATE_NAMESPACE,
  stateKey: input.workId,
});

function asReceipt(value: unknown): DispatchReceipt | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (
    row.schema !== 'wandora.work_dispatch_receipt.v1'
    || typeof row.workId !== 'string'
    || typeof row.requestHash !== 'string'
    || typeof row.issueId !== 'string'
    || (row.status !== 'dispatching' && row.status !== 'dispatched')
    || (row.runId !== undefined && typeof row.runId !== 'string')
  ) return null;
  return row as DispatchReceipt;
}

export async function ensureManagedCatalogEmployeeWork(
  ctx: Pick<PluginContext, 'agents' | 'issues' | 'state'>,
  input: WorkInput,
): Promise<void> {
  const managed = await ctx.agents.managed.get(CATALOG_KEY, input.companyId);
  if (managed.status !== 'resolved' || !managed.agentId || !managed.agent) {
    throw new Error('managed_employee_missing');
  }
  if (managed.agent.status !== 'idle') {
    throw new Error(`managed_employee_not_idle:${managed.agent.status}`);
  }

  const expectedDescription = workDescription(input.workId, input.description);
  const matches = await ctx.issues.list({
    companyId: input.companyId,
    originKind: WORK_ORIGIN_KIND,
    originId: input.workId,
    includePluginOperations: true,
    limit: 2,
    offset: 0,
  });
  if (matches.length > 1) throw new Error('customer_work_issue_ambiguous');

  let issue = matches[0];
  if (!issue) {
    issue = await ctx.issues.create({
      companyId: input.companyId,
      title: input.title,
      description: expectedDescription,
      status: 'todo',
      priority: 'medium',
      assigneeAgentId: managed.agentId,
      originKind: WORK_ORIGIN_KIND,
      originId: input.workId,
    });
  }

  if (
    issue.originKind !== WORK_ORIGIN_KIND
    || issue.originId !== input.workId
    || issue.title !== input.title
    || issue.description !== expectedDescription
    || issue.assigneeAgentId !== managed.agentId
    || ['backlog', 'done', 'cancelled'].includes(issue.status)
  ) {
    throw new Error('customer_work_issue_inconsistent');
  }

  const hash = requestHash(input);
  const key = receiptKey(input);
  const storedValue = await ctx.state.get(key);
  const stored = storedValue === null ? null : asReceipt(storedValue);
  if (storedValue !== null && !stored) {
    throw new Error('customer_work_dispatch_receipt_invalid');
  }
  if (stored) {
    if (
      stored.workId !== input.workId
      || stored.requestHash !== hash
      || stored.issueId !== issue.id
    ) {
      throw new Error('customer_work_dispatch_receipt_conflict');
    }
    if (stored.status === 'dispatched') return;
    throw new Error('customer_work_dispatch_uncertain');
  }

  const dispatching: DispatchReceipt = {
    schema: 'wandora.work_dispatch_receipt.v1',
    workId: input.workId,
    requestHash: hash,
    issueId: issue.id,
    status: 'dispatching',
  };
  await ctx.state.set(key, dispatching);

  const wake = await ctx.issues.requestWakeup(issue.id, input.companyId, {
    reason: 'wandora_customer_work_v1',
    contextSource: 'wandora.organization-adapter-v1.customer-work-v1',
    idempotencyKey: `wandora-work:${input.workId}`,
  });
  if (!wake.queued || !wake.runId) {
    throw new Error('customer_work_dispatch_not_queued');
  }

  await ctx.state.set(key, {
    ...dispatching,
    status: 'dispatched',
    runId: wake.runId,
  } satisfies DispatchReceipt);
}
