import http from 'node:http';
import { createRequire } from 'node:module';
import { createPaperclipExecutionHandler } from '/app/dist/paperclip-execution/handler.js';
import { createPaperclipRunIdentityClient } from '/app/dist/paperclip-execution/paperclip-run-identity.js';
import { createPaperclipToolGatewayReadBridge } from '/app/dist/paperclip-execution/tool-gateway-read-bridge.js';
import { PaperclipExecutionService } from '/app/dist/paperclip-execution/service.js';
import { PaperclipFastReadExecutionService } from '/app/dist/paperclip-execution/fast-read.js';

const require = createRequire('/app/package.json');
const { Pool } = require('pg');

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_required`);
  return value;
};

const pool = new Pool({
  host: required('WANDORA_CORE_DB_HOST'),
  port: Number(process.env.WANDORA_CORE_DB_PORT ?? '5432'),
  database: required('WANDORA_CORE_DB_NAME'),
  user: required('WANDORA_CORE_DB_USER'),
  password: required('WANDORA_CORE_DB_PASSWORD'),
  max: 2,
});

const agentMeUrl = 'http://wandora-paperclip:3100/api/agents/me';
const bridgeSecret = required('WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET');
const intentSecret = required('WANDORA_FAST_READ_INTENT_SECRET');
let agenticCalls = 0;

const bindingResolver = new PaperclipExecutionService(
  pool,
  { executeAssignedTask: async () => { agenticCalls += 1; throw new Error('agent_runtime_must_not_run'); } },
  { project: async () => { throw new Error('grounding_must_not_run'); } },
);

const readToolBridge = createPaperclipToolGatewayReadBridge({ agentMeUrl });
const fastReadServiceInner = new PaperclipFastReadExecutionService({
  intentSecret,
  bindingResolver,
  readToolBridge,
  capabilityAdapter: {
    capabilitiesFor(tool) {
      return tool.name === 'get_value' || tool.name.endsWith(':get_value')
        ? ['business.products.price']
        : [];
    },
    async execute({ tool, selector }) {
      if (
        selector?.kind !== 'product'
        || selector.by !== 'name'
        || selector.value !== 'PREMIUM PLUS'
      ) {
        throw new Error('disposable_fast_read_selector_missing');
      }
      const value = await tool.execute({ key: 'project' });
      const rendered = typeof value === 'string' ? value : JSON.stringify(value);
      return {
        kind: 'facts',
        subject: 'Synthetic Paperclip fixture',
        facts: [{ label: 'Valor', value: rendered }],
      };
    },
  },
});

const fastReadService = {
  async execute(input) {
    try {
      return await fastReadServiceInner.execute(input);
    } catch (error) {
      console.error('FAST_READ_CORE_EXECUTION_ERROR', error instanceof Error ? error.stack ?? error.message : String(error));
      throw error;
    }
  },
};

const normalService = {
  execute: async () => { agenticCalls += 1; throw new Error('normal_agentic_service_must_not_run'); },
};

const handler = createPaperclipExecutionHandler({
  secret: bridgeSecret,
  verifyRunIdentity: createPaperclipRunIdentityClient({ agentMeUrl }),
  service: normalService,
  fastReadService,
});

const server = http.createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/healthz') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok', agenticCalls }));
    return;
  }
  if (request.method !== 'POST' || request.url !== '/internal/v1/paperclip/execution') {
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end('{"error":"not_found"}');
    return;
  }

  let rawBody = '';
  for await (const chunk of request) rawBody += chunk;
  const result = await handler({
    rawBody,
    timestamp: typeof request.headers['x-wandora-paperclip-timestamp'] === 'string'
      ? request.headers['x-wandora-paperclip-timestamp'] : undefined,
    signature: typeof request.headers['x-wandora-paperclip-signature'] === 'string'
      ? request.headers['x-wandora-paperclip-signature'] : undefined,
    runToken: typeof request.headers['x-wandora-paperclip-run-token'] === 'string'
      ? request.headers['x-wandora-paperclip-run-token'] : undefined,
  });
  response.writeHead(result.status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(result.body));
});

server.listen(8788, '0.0.0.0');

const shutdown = async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
};
process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());
