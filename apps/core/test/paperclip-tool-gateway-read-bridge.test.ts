import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPaperclipToolGatewayReadBridge,
  PaperclipToolGatewayReadBridgeError,
} from '../src/paperclip-execution/tool-gateway-read-bridge.js';

const RUN = '71111111-1111-4111-8111-111111111111';
const CONNECTION = '72222222-2222-4222-8222-222222222222';
const CATALOG = '73333333-3333-4333-8333-333333333333';

test('Paperclip read bridge exposes only authorized connection-backed read tools', async () => {
  const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith('/api/tool-gateway/sessions')) {
      return new Response(JSON.stringify({
        sessionId: 'session-1',
        token: 'ephemeral-gateway-token',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/api/tool-gateway/tools')) {
      return new Response(JSON.stringify([
        {
          name: 'vendaerp_search_products',
          displayName: 'VendaERP Search Products',
          description: 'Read products.',
          parametersSchema: {
            type: 'object',
            properties: { name: { type: 'string' } },
            additionalProperties: false,
          },
          pluginId: 'paperclip-gateway',
          providerType: 'mcp_local_stdio',
          risk: 'read',
          connectionId: CONNECTION,
          catalogEntryId: CATALOG,
        },
        {
          name: 'dangerous_write',
          displayName: 'Dangerous Write',
          description: 'Must not cross the bridge.',
          parametersSchema: { type: 'object' },
          pluginId: 'paperclip-gateway',
          providerType: 'mcp_local_stdio',
          risk: 'write',
          connectionId: CONNECTION,
          catalogEntryId: CATALOG,
        },
        {
          name: 'paperclip-self:list_my_issues',
          displayName: 'List issues',
          description: 'Internal Paperclip tool.',
          parametersSchema: { type: 'object' },
          pluginId: 'paperclip-self',
          providerType: 'paperclip_self',
          risk: 'read',
        },
      ]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/api/tool-gateway/tools/call')) {
      return new Response(JSON.stringify({
        invocationId: 'invocation-success',
        status: 'completed',
        tool: 'vendaerp_search_products',
        result: {
          content: 'ignored fallback',
          data: { items: [{ code: 'P1', name: 'Tinta' }] },
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error('unexpected request');
  };

  const bridge = createPaperclipToolGatewayReadBridge({
    agentMeUrl: 'http://wandora-paperclip:3100/api/agents/me',
    fetchImpl,
  });
  const tools = await bridge({
    runToken: 'opaque-run-token',
    paperclipRunId: RUN,
  });

  assert.equal(tools.length, 1);
  assert.equal(tools[0]?.name, 'vendaerp_search_products');
  assert.deepEqual(tools[0]?.inputSchema, {
    type: 'object',
    properties: { name: { type: 'string' } },
    additionalProperties: false,
  });

  const result = await tools[0]!.execute({ name: 'Tinta' });
  assert.deepEqual(result, { items: [{ code: 'P1', name: 'Tinta' }] });
  assert.equal(requests.length, 3);

  const sessionHeaders = requests[0]!.init?.headers as Record<string, string>;
  assert.equal(sessionHeaders.authorization, 'Bearer opaque-run-token');
  assert.equal(sessionHeaders['x-paperclip-run-id'], RUN);

  const listHeaders = requests[1]!.init?.headers as Record<string, string>;
  assert.equal(listHeaders['x-paperclip-tool-gateway-token'], 'ephemeral-gateway-token');
  assert.equal(JSON.stringify(requests[1]).includes('opaque-run-token'), false);

  const callHeaders = requests[2]!.init?.headers as Record<string, string>;
  assert.equal(callHeaders['x-paperclip-tool-gateway-token'], 'ephemeral-gateway-token');
  assert.equal(JSON.stringify(requests[2]).includes('opaque-run-token'), false);
  assert.deepEqual(JSON.parse(String(requests[2]!.init?.body)), {
    tool: 'vendaerp_search_products',
    parameters: { name: 'Tinta' },
    timeoutMs: 5000,
  });
});

test('Paperclip read bridge fails closed on noncanonical endpoints and denied gateway calls', async () => {
  assert.throws(
    () => createPaperclipToolGatewayReadBridge({
      agentMeUrl: 'https://paperclip.example/api/agents/me',
    }),
    /paperclip_agent_me_url_not_canonical/,
  );

  const bridge = createPaperclipToolGatewayReadBridge({
    agentMeUrl: 'http://wandora-paperclip:3100/api/agents/me',
    fetchImpl: async () => new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 }),
  });
  await assert.rejects(
    bridge({ runToken: 'opaque-run-token', paperclipRunId: RUN }),
    (error: unknown) => error instanceof PaperclipToolGatewayReadBridgeError && error.code === 'denied',
  );
});


test('Paperclip read bridge collapses identical read calls per run while preserving distinct reads', async () => {
  const callBodies: string[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith('/api/tool-gateway/sessions')) {
      return new Response(JSON.stringify({
        sessionId: 'session-dedupe',
        token: 'ephemeral-gateway-token',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/api/tool-gateway/tools')) {
      return new Response(JSON.stringify([{
        name: 'vendaerp_search_products',
        displayName: 'VendaERP Search Products',
        description: 'Read products.',
        parametersSchema: { type: 'object' },
        providerType: 'mcp_local_stdio',
        risk: 'read',
        connectionId: CONNECTION,
        catalogEntryId: CATALOG,
      }]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/api/tool-gateway/tools/call')) {
      callBodies.push(String(init?.body));
      return new Response(JSON.stringify({
        data: { items: [{ code: 'P1' }] },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error('unexpected request');
  };

  const bridge = createPaperclipToolGatewayReadBridge({
    agentMeUrl: 'http://wandora-paperclip:3100/api/agents/me',
    fetchImpl,
  });
  const tools = await bridge({
    runToken: 'opaque-run-token',
    paperclipRunId: RUN,
  });
  const tool = tools[0]!;

  const firstParameters = { name: 'Tinta', filters: { brand: 'A', active: true } };
  const sameParametersDifferentOrder = { filters: { active: true, brand: 'A' }, name: 'Tinta' };
  const [first, duplicate] = await Promise.all([
    tool.execute(firstParameters),
    tool.execute(sameParametersDifferentOrder),
  ]);

  assert.deepEqual(first, { items: [{ code: 'P1' }] });
  assert.deepEqual(duplicate, first);
  assert.equal(callBodies.length, 1);

  await tool.execute({ name: 'Tinta Azul' });
  assert.equal(callBodies.length, 2);
});

test('Paperclip read bridge does not retry an identical denied read call inside one run', async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/api/tool-gateway/sessions')) {
      return new Response(JSON.stringify({
        sessionId: 'session-denied-dedupe',
        token: 'ephemeral-gateway-token',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/api/tool-gateway/tools')) {
      return new Response(JSON.stringify([{
        name: 'vendaerp_probe',
        displayName: 'VendaERP Probe',
        description: 'Read connection health.',
        parametersSchema: { type: 'object' },
        providerType: 'mcp_local_stdio',
        risk: 'read',
        connectionId: CONNECTION,
        catalogEntryId: CATALOG,
      }]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/api/tool-gateway/tools/call')) {
      calls += 1;
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
    }
    throw new Error('unexpected request');
  };

  const bridge = createPaperclipToolGatewayReadBridge({
    agentMeUrl: 'http://wandora-paperclip:3100/api/agents/me',
    fetchImpl,
  });
  const tools = await bridge({
    runToken: 'opaque-run-token',
    paperclipRunId: RUN,
  });

  await assert.rejects(tools[0]!.execute({}), (error: unknown) =>
    error instanceof PaperclipToolGatewayReadBridgeError && error.code === 'denied');
  await assert.rejects(tools[0]!.execute({}), (error: unknown) =>
    error instanceof PaperclipToolGatewayReadBridgeError && error.code === 'denied');
  assert.equal(calls, 1);
});


test('Paperclip read bridge fails closed on a non-completed Tool Gateway execution envelope', async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/api/tool-gateway/sessions')) {
      return new Response(JSON.stringify({
        sessionId: 'session-envelope-pending',
        token: 'ephemeral-gateway-token',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/api/tool-gateway/tools')) {
      return new Response(JSON.stringify([{
        name: 'vendaerp_search_products',
        displayName: 'VendaERP Search Products',
        description: 'Read products.',
        parametersSchema: { type: 'object' },
        providerType: 'mcp_local_stdio',
        risk: 'read',
        connectionId: CONNECTION,
        catalogEntryId: CATALOG,
      }]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/api/tool-gateway/tools/call')) {
      return new Response(JSON.stringify({
        invocationId: 'invocation-pending',
        status: 'pending',
        tool: 'vendaerp_search_products',
        result: null,
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error('unexpected request');
  };

  const bridge = createPaperclipToolGatewayReadBridge({
    agentMeUrl: 'http://wandora-paperclip:3100/api/agents/me',
    fetchImpl,
  });
  const tools = await bridge({ runToken: 'opaque-run-token', paperclipRunId: RUN });

  await assert.rejects(tools[0]!.execute({ pageSize: 5, skip: 0 }), (error: unknown) =>
    error instanceof PaperclipToolGatewayReadBridgeError && error.code === 'tool-failed');
});

test('Paperclip read bridge fails closed and collapses repeated MCP isError results', async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/api/tool-gateway/sessions')) {
      return new Response(JSON.stringify({
        sessionId: 'session-mcp-error',
        token: 'ephemeral-gateway-token',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/api/tool-gateway/tools')) {
      return new Response(JSON.stringify([{
        name: 'vendaerp_search_products',
        displayName: 'VendaERP Search Products',
        description: 'Read products.',
        parametersSchema: { type: 'object' },
        providerType: 'mcp_local_stdio',
        risk: 'read',
        connectionId: CONNECTION,
        catalogEntryId: CATALOG,
      }]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/api/tool-gateway/tools/call')) {
      calls += 1;
      return new Response(JSON.stringify({
        invocationId: 'invocation-mcp-error',
        status: 'completed',
        tool: 'vendaerp_search_products',
        result: {
          content: '{"error":"provider-unavailable"}',
          data: {
            content: [{ type: 'text', text: '{"error":"provider-unavailable"}' }],
            structuredContent: { error: { code: 'provider-unavailable' } },
            isError: true,
            transport: 'local_stdio',
            spawnedLocalProcess: true,
          },
          error: 'MCP tool returned an error result',
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    throw new Error('unexpected request');
  };

  const bridge = createPaperclipToolGatewayReadBridge({
    agentMeUrl: 'http://wandora-paperclip:3100/api/agents/me',
    fetchImpl,
  });
  const tools = await bridge({
    runToken: 'opaque-run-token',
    paperclipRunId: RUN,
  });

  await assert.rejects(tools[0]!.execute({ pageSize: 5, skip: 0 }), (error: unknown) =>
    error instanceof PaperclipToolGatewayReadBridgeError && error.code === 'tool-failed');
  await assert.rejects(tools[0]!.execute({ skip: 0, pageSize: 5 }), (error: unknown) =>
    error instanceof PaperclipToolGatewayReadBridgeError && error.code === 'tool-failed');
  assert.equal(calls, 1);
});