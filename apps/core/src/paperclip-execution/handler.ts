import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AssignedTask } from '../agent-runtime/task-runtime.js';
import { PaperclipExecutionBindingError, type PaperclipExecutionService } from './service.js';
import { PaperclipToolGatewayReadBridgeError } from './tool-gateway-read-bridge.js';
import {
  PaperclipRunIdentityError,
  type PaperclipRunIdentity,
} from './paperclip-run-identity.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGNATURE_RE = /^sha256=([a-f0-9]{64})$/;
const MAX_CLOCK_SKEW_SECONDS = 300;

export type PaperclipExecutionRequest = {
  rawBody: string;
  timestamp: string | undefined;
  signature: string | undefined;
  runToken: string | undefined;
};

export type PaperclipExecutionResponse = {
  status: number;
  body: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown, max: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > max) return null;
  return normalized;
}

function parseBody(rawBody: string): {
  paperclipAgentId: string;
  paperclipCompanyId: string;
  paperclipRunId: string;
  workId: string | null;
  task: AssignedTask;
} | undefined {
  let value: unknown;
  try { value = JSON.parse(rawBody); } catch { return undefined; }
  if (!isRecord(value) || !isRecord(value.task)) return undefined;

  const paperclipAgentId = String(value.paperclipAgentId ?? '');
  const paperclipCompanyId = String(value.paperclipCompanyId ?? '');
  const paperclipRunId = String(value.paperclipRunId ?? '');
  if (!UUID_RE.test(paperclipAgentId) || !UUID_RE.test(paperclipCompanyId) || !UUID_RE.test(paperclipRunId)) {
    return undefined;
  }

  const title = optionalText(value.task.title, 12_000);
  const description = optionalText(value.task.description, 12_000);
  const suppliedWorkId = value.task.workId;
  const workId = suppliedWorkId === null || suppliedWorkId === undefined
    ? null
    : String(suppliedWorkId).trim().toLowerCase();
  if (!title && !description) return undefined;
  if (workId !== null && !UUID_RE.test(workId)) return undefined;

  return {
    paperclipAgentId,
    paperclipCompanyId,
    paperclipRunId,
    workId,
    task: { title: title ?? description!, description },
  };
}

export function signPaperclipExecutionRequest(secret: string, timestamp: string, rawBody: string): string {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return `sha256=${digest}`;
}

function authorized(secret: string, request: PaperclipExecutionRequest, now: number): boolean {
  if (!request.timestamp || !request.signature) return false;
  if (!/^\d{10}$/.test(request.timestamp)) return false;
  const seconds = Number(request.timestamp);
  if (!Number.isSafeInteger(seconds)) return false;
  if (Math.abs(Math.floor(now / 1000) - seconds) > MAX_CLOCK_SKEW_SECONDS) return false;
  const match = SIGNATURE_RE.exec(request.signature);
  if (!match?.[1]) return false;
  const supplied = Buffer.from(match[1], 'hex');
  const expected = Buffer.from(
    signPaperclipExecutionRequest(secret, request.timestamp, request.rawBody).slice(7),
    'hex',
  );
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function createPaperclipExecutionHandler(deps: {
  secret: string;
  verifyRunIdentity: (input: {
    runToken: string;
    paperclipRunId: string;
    paperclipAgentId: string;
    paperclipCompanyId: string;
  }) => Promise<PaperclipRunIdentity>;
  service: Pick<PaperclipExecutionService, 'execute'>;
  now?: () => number;
}) {
  const now = deps.now ?? (() => Date.now());
  return async (request: PaperclipExecutionRequest): Promise<PaperclipExecutionResponse> => {
    if (!authorized(deps.secret, request, now())) {
      return { status: 401, body: { error: 'unauthorized' } };
    }
    const runToken = request.runToken?.trim();
    if (!runToken || runToken.length > 16_384) {
      return { status: 401, body: { error: 'unauthorized' } };
    }
    const parsed = parseBody(request.rawBody);
    if (!parsed) return { status: 400, body: { error: 'invalid-execution-request' } };

    try {
      const identity = await deps.verifyRunIdentity({
        runToken,
        paperclipRunId: parsed.paperclipRunId,
        paperclipAgentId: parsed.paperclipAgentId,
        paperclipCompanyId: parsed.paperclipCompanyId,
      });
      const result = await deps.service.execute({
        identity,
        runToken,
        paperclipRunId: parsed.paperclipRunId,
        workId: parsed.workId,
        task: parsed.task,
      });
      return { status: 200, body: result };
    } catch (error) {
      if (error instanceof PaperclipRunIdentityError) {
        return {
          status: error.code === 'invalid' ? 401 : 503,
          body: { error: error.code === 'invalid' ? 'unauthorized' : 'paperclip-identity-unavailable' },
        };
      }
      if (error instanceof PaperclipExecutionBindingError) {
        return { status: 409, body: { error: 'employee-execution-unavailable' } };
      }
      if (error instanceof PaperclipToolGatewayReadBridgeError && error.code === 'tool-failed') {
        return { status: 422, body: { error: 'read-tool-failed' } };
      }
      return { status: 500, body: { error: 'internal-error' } };
    }
  };
}
