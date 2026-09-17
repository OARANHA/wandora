import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPaperclipExecutionBridgeAttestationHandler,
  signPaperclipExecutionBridge,
} from '../src/runtime/paperclip-execution-bridge.js';

const NOW_MS = Date.parse('2026-09-17T06:00:00.000Z');
const SECRET = 'paperclip-bridge-test-secret-0123456789abcdef0123456789abcdef';
const AGENT_ID = '10000000-0000-0000-0000-0000000000a1';
const COMPANY_ID = '20000000-0000-0000-0000-0000000000a1';
const RUN_ID = '30000000-0000-0000-0000-0000000000a1';
const ISSUE_ID = '40000000-0000-0000-0000-0000000000a1';
const CATALOG_KEY = 'ana-commercial-v1';
const TIMESTAMP = String(Math.floor(NOW_MS / 1000));

function jwt(overrides: Record<string, unknown> = {}): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'HS256', typ: 'JWT' }),
    encode({
      sub: AGENT_ID,
      company_id: COMPANY_ID,
      run_id: RUN_ID,
      adapter_type: 'wandora_mastra',
      iat: Math.floor(NOW_MS / 1000) - 10,
      exp: Math.floor(NOW_MS / 1000) + 600,
      ...overrides,
    }),
    'synthetic-signature-for-paperclip-validation-only',
  ].join('.');
}

function requestBody(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    paperclipAgentId: AGENT_ID,
    paperclipCompanyId: COMPANY_ID,
    paperclipRunId: RUN_ID,
    catalogKey: CATALOG_KEY,
    task: {
      issueId: ISSUE_ID,
      identifier: 'WAN-42',
      title: 'Prepare a scoped customer follow-up',
      description: 'Use only reviewed task fields.',
      workMode: 'execution',
      wakeReason: 'assigned',
      wakeCommentId: null,
    },
    ...overrides,
  });
}

function managedAgent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: AGENT_ID,
    companyId: COMPANY_ID,
    adapterType: 'wandora_mastra',
    metadata: {
      paperclipManagedResource: {
        pluginId: 'plugin-1',
        pluginKey: 'wandora.organization-adapter-v1',
        resourceKind: 'agent',
        resourceKey: CATALOG_KEY,
      },
      pluginManagedAgent: {
        pluginId: 'plugin-1',
        pluginKey: 'wandora.organization-adapter-v1',
        agentKey: CATALOG_KEY,
      },
    },
    ...overrides,
  };
}

function signedRequest(rawBody: string, runToken = jwt(), options: {
  timestamp?: string;
  signature?: string;
} = {}) {
  const timestamp = options.timestamp ?? TIMESTAMP;
  return {
    rawBody,
    timestamp,
    signature: options.signature ?? signPaperclipExecutionBridge(SECRET, timestamp, rawBody),
    runToken,
  };
}

function paperclipFetch(agent: unknown, calls: Array<{ url: string; authorization: string | null }>): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    calls.push({
      url: String(input),
      authorization: headers.get('authorization'),
    });
    return new Response(JSON.stringify(agent), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
}

test('PAPERCLIP EXECUTION BRIDGE ATTESTATION CANDIDATE V1', async (t) => {
  await t.test('valid HMAC + Paperclip-validated run JWT + managed provenance stops at execution-not-wired', async () => {
    const calls: Array<{ url: string; authorization: string | null }> = [];
    const token = jwt();
    const handler = createPaperclipExecutionBridgeAttestationHandler({
      secret: SECRET,
      paperclipBaseUrl: 'http://wandora-paperclip:3100',
      now: () => NOW_MS,
      fetchImpl: paperclipFetch(managedAgent(), calls),
    });

    const result = await handler(signedRequest(requestBody(), token));
    assert.deepEqual(result, {
      status: 501,
      body: { accepted: false, error: 'execution-not-wired' },
    });
    assert.deepEqual(calls, [{
      url: 'http://wandora-paperclip:3100/api/agents/me',
      authorization: `Bearer ${token}`,
    }]);
    assert.equal(JSON.stringify(result).includes(token), false);
  });

  await t.test('invalid or stale HMAC fails before Paperclip is called', async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return new Response('{}', { status: 200 });
    }) as typeof fetch;
    const handler = createPaperclipExecutionBridgeAttestationHandler({
      secret: SECRET,
      paperclipBaseUrl: 'http://wandora-paperclip:3100',
      now: () => NOW_MS,
      fetchImpl,
    });
    const body = requestBody();

    const invalid = await handler(signedRequest(body, jwt(), {
      signature: `sha256=${'0'.repeat(64)}`,
    }));
    assert.equal(invalid.status, 401);

    const staleTimestamp = String(Math.floor(NOW_MS / 1000) - 301);
    const stale = await handler(signedRequest(body, jwt(), { timestamp: staleTimestamp }));
    assert.equal(stale.status, 401);
    assert.equal(calls, 0);
  });

  await t.test('request contract rejects unreviewed task fields before token attestation', async () => {
    let calls = 0;
    const handler = createPaperclipExecutionBridgeAttestationHandler({
      secret: SECRET,
      paperclipBaseUrl: 'http://wandora-paperclip:3100',
      now: () => NOW_MS,
      fetchImpl: (async () => {
        calls += 1;
        return new Response('{}', { status: 200 });
      }) as typeof fetch,
    });
    const body = requestBody({
      task: {
        issueId: ISSUE_ID,
        identifier: 'WAN-42',
        title: 'Allowed title',
        description: null,
        workMode: null,
        wakeReason: null,
        wakeCommentId: null,
        providerInternals: { mustNotCross: true },
      },
    });
    const result = await handler(signedRequest(body));
    assert.deepEqual(result, { status: 400, body: { error: 'invalid-execution-request' } });
    assert.equal(calls, 0);
  });

  await t.test('malformed run token fails closed without Paperclip callback', async () => {
    let calls = 0;
    const handler = createPaperclipExecutionBridgeAttestationHandler({
      secret: SECRET,
      paperclipBaseUrl: 'http://wandora-paperclip:3100',
      now: () => NOW_MS,
      fetchImpl: (async () => {
        calls += 1;
        return new Response('{}', { status: 200 });
      }) as typeof fetch,
    });
    const result = await handler(signedRequest(requestBody(), 'not-a-jwt'));
    assert.equal(result.status, 401);
    assert.equal(calls, 0);
  });

  await t.test('Paperclip rejection or unavailability never becomes invented success', async () => {
    const rejected = createPaperclipExecutionBridgeAttestationHandler({
      secret: SECRET,
      paperclipBaseUrl: 'http://wandora-paperclip:3100',
      now: () => NOW_MS,
      fetchImpl: (async () => new Response('{}', { status: 401 })) as typeof fetch,
    });
    assert.deepEqual(await rejected(signedRequest(requestBody())), {
      status: 401,
      body: { error: 'unauthorized' },
    });

    const unavailable = createPaperclipExecutionBridgeAttestationHandler({
      secret: SECRET,
      paperclipBaseUrl: 'http://wandora-paperclip:3100',
      now: () => NOW_MS,
      fetchImpl: (async () => { throw new Error('offline'); }) as typeof fetch,
    });
    assert.deepEqual(await unavailable(signedRequest(requestBody())), {
      status: 503,
      body: { error: 'paperclip-attestation-unavailable' },
    });
  });

  await t.test('JWT identity mismatch fails even after Paperclip accepts the token', async () => {
    const cases = [
      jwt({ sub: '10000000-0000-0000-0000-0000000000b1' }),
      jwt({ company_id: '20000000-0000-0000-0000-0000000000b1' }),
      jwt({ run_id: '30000000-0000-0000-0000-0000000000b1' }),
      jwt({ adapter_type: 'shell' }),
    ];
    for (const token of cases) {
      const handler = createPaperclipExecutionBridgeAttestationHandler({
        secret: SECRET,
        paperclipBaseUrl: 'http://wandora-paperclip:3100',
        now: () => NOW_MS,
        fetchImpl: paperclipFetch(managedAgent(), []),
      });
      const result = await handler(signedRequest(requestBody(), token));
      assert.deepEqual(result, {
        status: 403,
        body: { error: 'paperclip-attestation-mismatch' },
      });
    }
  });

  await t.test('missing, foreign or redacted managed-resource provenance fails closed', async () => {
    const agents = [
      { id: AGENT_ID, companyId: COMPANY_ID, adapterType: 'wandora_mastra' },
      managedAgent({
        metadata: {
          paperclipManagedResource: {
            pluginKey: 'foreign.plugin',
            resourceKind: 'agent',
            resourceKey: CATALOG_KEY,
          },
          pluginManagedAgent: {
            pluginKey: 'foreign.plugin',
            agentKey: CATALOG_KEY,
          },
        },
      }),
      managedAgent({
        metadata: {
          paperclipManagedResource: {
            pluginKey: 'wandora.organization-adapter-v1',
            resourceKind: 'agent',
            resourceKey: 'other-catalog-item',
          },
          pluginManagedAgent: {
            pluginKey: 'wandora.organization-adapter-v1',
            agentKey: 'other-catalog-item',
          },
        },
      }),
    ];

    for (const agent of agents) {
      const handler = createPaperclipExecutionBridgeAttestationHandler({
        secret: SECRET,
        paperclipBaseUrl: 'http://wandora-paperclip:3100',
        now: () => NOW_MS,
        fetchImpl: paperclipFetch(agent, []),
      });
      const result = await handler(signedRequest(requestBody()));
      assert.deepEqual(result, {
        status: 403,
        body: { error: 'paperclip-attestation-mismatch' },
      });
    }
  });
});
