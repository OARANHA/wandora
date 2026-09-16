import { createServer } from 'node:http';
import { PlatformAuthError, PlatformOperatorVerifier } from './auth.mjs';

const json = (response, status, body) => {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  });
  response.end(payload);
};

export function createPlatformAdminServer(config) {
  const verifier = config.auth ? new PlatformOperatorVerifier(config.auth) : undefined;

  return createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://platform-admin.internal');

    if (request.method === 'GET' && url.pathname === '/healthz') {
      json(response, 200, { status: 'healthy' });
      return;
    }
    if (request.method === 'GET' && url.pathname === '/readyz') {
      json(response, config.auth ? 200 : 503, { status: config.auth ? 'ready' : 'standby' });
      return;
    }

    if (url.pathname !== '/internal/v1/platform/session') {
      json(response, 404, { error: 'not-found' });
      return;
    }
    if (!verifier) {
      json(response, 404, { error: 'not-found' });
      return;
    }
    if (request.method !== 'GET') {
      json(response, 405, { error: 'method-not-allowed' });
      return;
    }

    try {
      await verifier.verify(request.headers.authorization);
      json(response, 200, { platformOperator: true });
    } catch (error) {
      if (error instanceof PlatformAuthError) {
        if (error.code === 'jwks-unavailable') json(response, 503, { error: 'authentication-unavailable' });
        else if (error.code === 'forbidden') json(response, 403, { error: 'forbidden' });
        else json(response, 401, { error: 'unauthorized' });
        return;
      }
      json(response, 500, { error: 'internal-error' });
    }
  });
}
