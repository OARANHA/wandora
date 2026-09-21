import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';

const TYPE = 'wandora_mastra';
const CANONICAL_BRIDGE_URL = 'http://wandora-core:8788/internal/v1/paperclip/execution';
const MAX_SECRET_LENGTH = 8192;
const MAX_TASK_TEXT = 12000;
const DEFAULT_BRIDGE_TIMEOUT_MS = 60000;
const MIN_BRIDGE_TIMEOUT_MS = 10000;
const MAX_BRIDGE_TIMEOUT_MS = 120000;
const ISSUE_COMPLETION_TIMEOUT_MS = 5000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requiredString(value, code, max = 4096) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized || normalized.length > max) throw new Error(code);
  return normalized;
}

function optionalString(value, max = MAX_TASK_TEXT) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, max);
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

const WORK_MARKER_RE =
  /^<!-- wandora-work-v1:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}) -->\r?\n?/i;

function reviewedTask(context) {
  const issue = context?.paperclipIssue && typeof context.paperclipIssue === 'object'
    ? context.paperclipIssue
    : {};
  const rawDescription = optionalString(issue.description);
  const match = rawDescription ? WORK_MARKER_RE.exec(rawDescription) : null;
  const workId = match?.[1]?.toLowerCase() ?? null;
  const description = rawDescription && match
    ? optionalString(rawDescription.slice(match[0].length))
    : rawDescription;
  return {
    workId,
    issueId: optionalString(issue.id, 255),
    identifier: optionalString(issue.identifier, 255),
    title: optionalString(issue.title),
    description,
    workMode: optionalString(issue.workMode, 128),
    wakeReason: optionalString(context?.wakeReason, 255),
    wakeCommentId: optionalString(context?.wakeCommentId ?? context?.commentId, 255),
  };
}

async function bridgeSecret(env = process.env) {
  const path = requiredString(
    env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE,
    'wandora_bridge_secret_file_required',
    4096,
  );
  if (!isAbsolute(path)) throw new Error('wandora_bridge_secret_file_must_be_absolute');
  const secret = (await readFile(path, 'utf8')).trim();
  if (secret.length < 32 || secret.length > MAX_SECRET_LENGTH) {
    throw new Error('wandora_bridge_secret_invalid');
  }
  return secret;
}

function bridgeUrl(env = process.env) {
  const value = requiredString(
    env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_URL,
    'wandora_bridge_url_required',
    2048,
  );
  const url = new URL(value);
  if (url.toString() !== CANONICAL_BRIDGE_URL) {
    throw new Error('wandora_bridge_url_not_canonical');
  }
  return url;
}

function bridgeTimeoutMs(env = process.env) {
  const value = Number(env.WANDORA_PAPERCLIP_EXECUTION_BRIDGE_TIMEOUT_MS ?? DEFAULT_BRIDGE_TIMEOUT_MS);
  if (
    !Number.isInteger(value)
    || value < MIN_BRIDGE_TIMEOUT_MS
    || value > MAX_BRIDGE_TIMEOUT_MS
  ) {
    throw new Error('wandora_bridge_timeout_invalid');
  }
  return value;
}

function paperclipIssueUrl(issueId, env = process.env) {
  if (!UUID_RE.test(issueId)) throw new Error('paperclip_work_issue_id_invalid');

  const listenHost = requiredString(
    env.PAPERCLIP_LISTEN_HOST,
    'paperclip_listen_host_required',
    255,
  );
  const listenPort = Number(
    requiredString(
      env.PAPERCLIP_LISTEN_PORT,
      'paperclip_listen_port_required',
      16,
    ),
  );
  if (!Number.isInteger(listenPort) || listenPort < 1 || listenPort > 65535) {
    throw new Error('paperclip_listen_port_invalid');
  }

  // Mirror Paperclip's own buildPaperclipEnv resolveHostForUrl rule:
  // wildcard listeners are reached through localhost for same-process API calls.
  const localHost = listenHost === '0.0.0.0' || listenHost === '::'
    ? 'localhost'
    : listenHost;

  const urlHost = localHost.includes(':') && !localHost.startsWith('[')
    ? `[${localHost}]`
    : localHost;
  return new URL(`http://${urlHost}:${listenPort}/api/issues/${issueId}`);
}

function sign(secret, timestamp, rawBody) {
  return createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
}

function normalizedUsage(value) {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) throw new Error('wandora_execution_invalid_usage');

  const inputTokens = nonNegativeInteger(value.inputTokens);
  const outputTokens = nonNegativeInteger(value.outputTokens);
  const cachedInputTokens = value.cachedInputTokens === null || value.cachedInputTokens === undefined
    ? 0
    : nonNegativeInteger(value.cachedInputTokens);

  if (
    value.inputTokens === null
    && value.outputTokens === null
    && (value.cachedInputTokens === null || value.cachedInputTokens === undefined)
  ) {
    return null;
  }
  if (inputTokens === null || outputTokens === null || cachedInputTokens === null) {
    throw new Error('wandora_execution_invalid_usage');
  }
  return { inputTokens, outputTokens, cachedInputTokens };
}

function successPayload(value) {
  if (!isRecord(value)) {
    throw new Error('wandora_execution_invalid_success');
  }
  const executionId = requiredString(value.executionId, 'wandora_execution_id_missing', 255);
  const model = typeof value.model === 'string' && value.model.trim() ? value.model.trim() : null;
  const summary = typeof value.summary === 'string' && value.summary.trim()
    ? value.summary.trim().slice(0, 12000)
    : 'Wandora execution accepted';
  const usage = normalizedUsage(value.usage);
  return { executionId, model, summary, usage };
}

async function readIssueStatus(url, runToken, paperclipRunId) {
  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${runToken}`,
        'x-paperclip-run-id': paperclipRunId,
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(ISSUE_COMPLETION_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  const value = await response.json().catch(() => null);
  if (!isRecord(value) || typeof value.status !== 'string') return null;
  return value.status;
}

async function patchIssueDoneOnce(url, issueId, runToken, paperclipRunId) {
  let response;
  try {
    response = await fetch(url, {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${runToken}`,
        'x-paperclip-run-id': paperclipRunId,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ status: 'done' }),
      signal: AbortSignal.timeout(ISSUE_COMPLETION_TIMEOUT_MS),
    });
  } catch {
    return 'ambiguous';
  }

  if (!response.ok) {
    if (response.status >= 400 && response.status < 500) {
      throw new Error(`paperclip_issue_completion_failed_${response.status}`);
    }
    return 'ambiguous';
  }

  const value = await response.json().catch(() => null);
  if (isRecord(value) && value.id === issueId && value.status === 'done') {
    return 'done';
  }
  return 'ambiguous';
}

async function completeCustomerWorkIssue(issueId, runToken, paperclipRunId) {
  const url = paperclipIssueUrl(issueId);
  const first = await patchIssueDoneOnce(url, issueId, runToken, paperclipRunId);
  if (first === 'done') return;

  const status = await readIssueStatus(url, runToken, paperclipRunId);
  if (status === 'done') return;
  if (status !== 'todo' && status !== 'in_progress') {
    throw new Error('paperclip_issue_completion_uncertain');
  }

  const second = await patchIssueDoneOnce(url, issueId, runToken, paperclipRunId);
  if (second === 'done') return;

  const confirmed = await readIssueStatus(url, runToken, paperclipRunId);
  if (confirmed !== 'done') {
    throw new Error('paperclip_issue_completion_uncertain');
  }
}

export function createServerAdapter() {
  return {
    type: TYPE,
    supportsLocalAgentJwt: true,
    models: [],
    agentConfigurationDoc:
      'Wandora-managed adapter. Endpoint and HMAC custody are operator-owned and are not configured per agent.',
    async testEnvironment() {
      try {
        bridgeUrl();
        bridgeTimeoutMs();
        paperclipIssueUrl('00000000-0000-4000-8000-000000000001');
        await bridgeSecret();
        return {
          adapterType: TYPE,
          status: 'pass',
          checks: [{ code: 'wandora-bridge-config', level: 'info', message: 'Private Wandora bridge configuration is valid.' }],
          testedAt: new Date().toISOString(),
        };
      } catch (error) {
        return {
          adapterType: TYPE,
          status: 'fail',
          checks: [{ code: 'wandora-bridge-config', level: 'error', message: error instanceof Error ? error.message : String(error) }],
          testedAt: new Date().toISOString(),
        };
      }
    },
    async execute(ctx) {
      const endpoint = bridgeUrl();
      const secret = await bridgeSecret();
      const runToken = requiredString(ctx.authToken, 'paperclip_run_token_required', 16384);
      const paperclipAgentId = requiredString(ctx.agent?.id, 'paperclip_agent_id_required', 255);
      const paperclipCompanyId = requiredString(ctx.agent?.companyId, 'paperclip_company_id_required', 255);
      const paperclipRunId = requiredString(ctx.runId, 'paperclip_run_id_required', 255);
      const task = reviewedTask(ctx.context);
      const timestamp = String(Math.floor(Date.now() / 1000));
      const rawBody = JSON.stringify({
        paperclipAgentId,
        paperclipCompanyId,
        paperclipRunId,
        task,
      });
      const signature = sign(secret, timestamp, rawBody);

      let response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-wandora-paperclip-timestamp': timestamp,
            'x-wandora-paperclip-signature': `sha256=${signature}`,
            'x-wandora-paperclip-run-token': runToken,
          },
          body: rawBody,
          signal: AbortSignal.timeout(bridgeTimeoutMs()),
        });
      } catch {
        throw new Error('wandora_execution_unavailable');
      }
      if (!response.ok) throw new Error(`wandora_execution_failed_${response.status}`);

      const result = successPayload(await response.json());
      if (task.workId) {
        const issueId = requiredString(task.issueId, 'paperclip_work_issue_id_required', 255);
        await completeCustomerWorkIssue(issueId, runToken, paperclipRunId);
      }

      return {
        exitCode: 0,
        signal: null,
        timedOut: false,
        provider: 'wandora',
        model: result.model,
        summary: result.summary,
        ...(result.usage ? { usage: result.usage, usageBasis: 'per_run' } : {}),
        resultJson: { executionId: result.executionId },
      };
    },
  };
}
