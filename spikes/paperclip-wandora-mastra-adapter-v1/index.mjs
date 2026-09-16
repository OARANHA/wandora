import { createHmac } from 'node:crypto';

function requiredString(value, code) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) throw new Error(code);
  return normalized;
}

function optionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function taskContext(context) {
  const issue = context?.paperclipIssue && typeof context.paperclipIssue === 'object'
    ? context.paperclipIssue
    : {};
  return {
    issueId: optionalString(issue.id),
    identifier: optionalString(issue.identifier),
    title: optionalString(issue.title),
    description: optionalString(issue.description),
    workMode: optionalString(issue.workMode),
    wakeReason: optionalString(context?.wakeReason),
    wakeCommentId: optionalString(context?.wakeCommentId ?? context?.commentId),
  };
}

function sign(secret, timestamp, body) {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

export function createServerAdapter() {
  return {
    type: 'wandora_mastra_spike',
    supportsLocalAgentJwt: true,
    models: [],
    agentConfigurationDoc: 'Disposable contract spike for Paperclip control plane -> private Wandora execution bridge -> Mastra.',
    async testEnvironment() {
      return {
        adapterType: 'wandora_mastra_spike',
        status: 'pass',
        checks: [{ code: 'contract-spike', level: 'info', message: 'Wandora adapter contract is loadable.' }],
        testedAt: new Date().toISOString(),
      };
    },
    async execute(ctx) {
      const endpoint = requiredString(ctx.config?.url, 'wandora_endpoint_required');
      const bridgeSecret = requiredString(process.env.WANDORA_PAPERCLIP_BRIDGE_SECRET, 'wandora_bridge_secret_required');
      const runToken = requiredString(ctx.authToken, 'paperclip_run_token_required');
      const timestamp = String(Date.now());
      const body = JSON.stringify({
        paperclipAgentId: ctx.agent.id,
        paperclipCompanyId: ctx.agent.companyId,
        paperclipRunId: ctx.runId,
        task: taskContext(ctx.context),
      });
      const signature = sign(bridgeSecret, timestamp, body);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-wandora-paperclip-timestamp': timestamp,
          'x-wandora-paperclip-signature': `sha256=${signature}`,
          'x-wandora-paperclip-run-token': runToken,
        },
        body,
      });
      if (!res.ok) throw new Error(`wandora_execution_failed_${res.status}`);
      const result = await res.json();
      return {
        exitCode: 0,
        signal: null,
        timedOut: false,
        provider: 'wandora',
        model: typeof result.model === 'string' ? result.model : null,
        summary: typeof result.summary === 'string' ? result.summary : 'Wandora execution accepted',
        resultJson: { executionId: result.executionId ?? null },
      };
    },
  };
}
