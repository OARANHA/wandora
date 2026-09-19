import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { RuntimeMode } from './config.js';
import type {
  GatewayIngressRequest,
  GatewayIngressResponse,
} from './gateway-ingress.js';
import type {
  PaperclipExecutionRequest,
  PaperclipExecutionResponse,
} from '../paperclip-execution/handler.js';
import {
  isHumanDigitalEmployeeHirePath,
  isHumanSendProposalPath,
  type HumanSupervisionRequest,
  type HumanSupervisionResponse,
} from './human-supervision.js';

export type RuntimeReadiness =
  | { ready: true }
  | {
      ready: false;
      reason:
        | 'standby'
        | 'database-unavailable'
        | 'unexpected-database-role'
        | 'tenant-scope-leak'
        | 'organization-adapter-database-boundary-unavailable'
        | 'customer-hire-eligibility-database-boundary-unavailable';
    };

export type RuntimeServerDeps = {
  mode: RuntimeMode;
  checkReady: () => Promise<RuntimeReadiness>;
  handleGatewayInbound?: (request: GatewayIngressRequest) => Promise<GatewayIngressResponse>;
  handlePaperclipExecution?: (request: PaperclipExecutionRequest) => Promise<PaperclipExecutionResponse>;
  handleHumanSupervision?: (request: HumanSupervisionRequest) => Promise<HumanSupervisionResponse>;
};

const writeJson = (
  response: ServerResponse,
  status: number,
  payload: Record<string, unknown>,
): void => {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(`${JSON.stringify(payload)}\n`);
};

const header = (request: IncomingMessage, name: string): string | undefined => {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
};

class PayloadTooLargeError extends Error {}

async function readBody(request: IncomingMessage, maxBytes = 65_536): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) throw new PayloadTooLargeError();
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function createRuntimeServer(deps: RuntimeServerDeps): Server {
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://wandora-core.local');

    if (url.pathname === '/internal/v1/gateway/inbound') {
      if (request.method !== 'POST') {
        writeJson(response, 405, { error: 'method-not-allowed' });
        return;
      }
      if (!deps.handleGatewayInbound) {
        writeJson(response, 404, { error: 'not-found' });
        return;
      }

      try {
        const rawBody = await readBody(request);
        const result = await deps.handleGatewayInbound({
          rawBody,
          timestamp: header(request, 'x-wandora-timestamp'),
          signature: header(request, 'x-wandora-signature'),
        });
        writeJson(response, result.status, result.body);
      } catch (error) {
        if (error instanceof PayloadTooLargeError) {
          writeJson(response, 413, { error: 'payload-too-large' });
        } else {
          writeJson(response, 500, { error: 'internal-error' });
        }
      }
      return;
    }

    if (url.pathname === '/internal/v1/paperclip/execution') {
      if (request.method !== 'POST') {
        writeJson(response, 405, { error: 'method-not-allowed' });
        return;
      }
      if (!deps.handlePaperclipExecution) {
        writeJson(response, 404, { error: 'not-found' });
        return;
      }
      try {
        const rawBody = await readBody(request, 32_768);
        const result = await deps.handlePaperclipExecution({
          rawBody,
          timestamp: header(request, 'x-wandora-paperclip-timestamp'),
          signature: header(request, 'x-wandora-paperclip-signature'),
          runToken: header(request, 'x-wandora-paperclip-run-token'),
        });
        writeJson(response, result.status, result.body);
      } catch (error) {
        if (error instanceof PayloadTooLargeError) {
          writeJson(response, 413, { error: 'payload-too-large' });
        } else {
          writeJson(response, 500, { error: 'internal-error' });
        }
      }
      return;
    }

    if (url.pathname === '/api/v1/me' || url.pathname.startsWith('/api/v1/organizations/')) {
      if (!deps.handleHumanSupervision) {
        writeJson(response, 404, { error: 'not-found' });
        return;
      }
      try {
        const humanPostBody = request.method === 'POST'
          && (isHumanSendProposalPath(url.pathname) || isHumanDigitalEmployeeHirePath(url.pathname));
        const rawBody = humanPostBody ? await readBody(request, 2_048) : undefined;
        const result = await deps.handleHumanSupervision({
          method: request.method,
          pathname: url.pathname,
          authorization: header(request, 'authorization'),
          idempotencyKey: header(request, 'idempotency-key'),
          rawBody,
        });
        writeJson(response, result.status, result.body);
      } catch (error) {
        if (error instanceof PayloadTooLargeError) {
          writeJson(response, 413, { error: 'payload-too-large' });
        } else {
          writeJson(response, 500, { error: 'internal-error' });
        }
      }
      return;
    }

    if (request.method !== 'GET') {
      writeJson(response, 405, { error: 'method-not-allowed' });
      return;
    }
    if (url.pathname === '/healthz') {
      writeJson(response, 200, {
        status: 'ok',
        service: 'wandora-core',
        mode: deps.mode,
      });
      return;
    }

    if (url.pathname === '/readyz') {
      try {
        const readiness = await deps.checkReady();
        if (readiness.ready) {
          writeJson(response, 200, { status: 'ready', service: 'wandora-core' });
        } else {
          writeJson(response, 503, {
            status: 'not-ready',
            service: 'wandora-core',
            reason: readiness.reason,
          });
        }
      } catch {
        writeJson(response, 503, {
          status: 'not-ready',
          service: 'wandora-core',
          reason: 'database-unavailable',
        });
      }
      return;
    }

    writeJson(response, 404, { error: 'not-found' });
  });
}
