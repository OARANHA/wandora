import { createServer, type Server, type ServerResponse } from 'node:http';
import type { RuntimeMode } from './config.js';

export type RuntimeReadiness =
  | { ready: true }
  | { ready: false; reason: 'standby' | 'database-unavailable' | 'unexpected-database-role' | 'tenant-scope-leak' };

export type RuntimeServerDeps = {
  mode: RuntimeMode;
  checkReady: () => Promise<RuntimeReadiness>;
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

export function createRuntimeServer(deps: RuntimeServerDeps): Server {
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://wandora-core.local');

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
