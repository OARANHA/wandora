import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';

const TYPE = 'wandora_mastra';
const CANONICAL_BRIDGE_URL = 'http://wandora-core:8788/internal/v1/paperclip/execution';
const MAX_SECRET_LENGTH = 8192;
const MAX_TASK_TEXT = 12000;

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

function reviewedTask(context) {
  const issue = context?.paperclipIssue && typeof context.paperclipIssue === 'object'
    ? context.paperclipIssue
    : {};
  return {
    issueId: optionalString(issue.id, 255),
    identifier: optionalString(issue.identifier, 255),
    title: optionalString(issue.title),
    description: optionalString(issue.description),
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

function sign(secret, timestamp, rawBody) {
  return createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
}

function successPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('wandora_execution_invalid_success');
  }
  const executionId = requiredString(value.executionId, 'wandora_execution_id_missing', 255);
  const model = typeof value.model === 'string' && value.model.trim() ? value.model.trim() : null;
  const summary = typeof value.summary === 'string' && value.summary.trim()
    ? value.summary.trim().slice(0, 12000)
    : 'Wandora execution accepted';
  return { executionId, model, summary };
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
      const timestamp = String(Math.floor(Date.now() / 1000));
      const rawBody = JSON.stringify({
        paperclipAgentId,
        paperclipCompanyId,
        paperclipRunId,
        task: reviewedTask(ctx.context),
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
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        throw new Error('wandora_execution_unavailable');
      }
      if (!response.ok) throw new Error(`wandora_execution_failed_${response.status}`);

      const result = successPayload(await response.json());
      return {
        exitCode: 0,
        signal: null,
        timedOut: false,
        provider: 'wandora',
        model: result.model,
        summary: result.summary,
        resultJson: { executionId: result.executionId },
      };
    },
  };
}
