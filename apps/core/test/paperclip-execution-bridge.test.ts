import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPaperclipExecutionHandler,
  signPaperclipExecutionRequest,
} from '../src/paperclip-execution/handler.js';
import {
  createPaperclipRunIdentityClient,
  PaperclipRunIdentityError,
} from '../src/paperclip-execution/paperclip-run-identity.js';

const SECRET = 'synthetic-paperclip-bridge-secret-0123456789abcdef';
const NOW = 1_789_770_000_000;
const COMPANY = 'a63f27a8-dbac-4552-a456-b3a21302226b';
const AGENT = 'da6cfc6b-e16f-483a-95f1-bacee8e54365';
const RUN = '71111111-1111-4111-8111-111111111111';
const WORK = '72222222-2222-4222-8222-222222222222';

const body = JSON.stringify({
  paperclipAgentId: AGENT,
  paperclipCompanyId: COMPANY,
  paperclipRunId: RUN,
  task: {
    issueId: 'issue-1',
    identifier: 'MED-1',
    workId: WORK,
    title: 'Qualificar contato',
    description: 'Entender a necessidade do contato.',
    workMode: 'standard',
    wakeReason: 'issue_assigned',
  },
});

test('Paperclip execution handler fails closed before runtime and forwards only reviewed task content', async () => {
  let verifyCalls = 0;
  let executionInput: unknown;
  const verifyRunIdentity = async () => {
    verifyCalls += 1;
    return {
      paperclipAgentId: AGENT,
      paperclipCompanyId: COMPANY,
      catalogKey: 'ana-commercial-v1' as const,
    };
  };
  const service = {
    execute: async (input: unknown) => {
      executionInput = input;
      return { executionId: 'exec_abc', model: 'wandora-supervised-v1', summary: 'accepted' };
    },
  };
  const handler = createPaperclipExecutionHandler({
    secret: SECRET,
    verifyRunIdentity,
    service,
    now: () => NOW,
  });
  const timestamp = String(Math.floor(NOW / 1000));

  const unauthorized = await handler({
    rawBody: body,
    timestamp,
    signature: 'sha256=' + '0'.repeat(64),
    runToken: 'opaque-run-token',
  });
  assert.equal(unauthorized.status, 401);
  assert.equal(verifyCalls, 0);

  const stale = await handler({
    rawBody: body,
    timestamp: String(Number(timestamp) - 301),
    signature: signPaperclipExecutionRequest(SECRET, String(Number(timestamp) - 301), body),
    runToken: 'opaque-run-token',
  });
  assert.equal(stale.status, 401);
  assert.equal(verifyCalls, 0);

  const missingToken = await handler({
    rawBody: body,
    timestamp,
    signature: signPaperclipExecutionRequest(SECRET, timestamp, body),
    runToken: undefined,
  });
  assert.equal(missingToken.status, 401);
  assert.equal(verifyCalls, 0);

  const ok = await handler({
    rawBody: body,
    timestamp,
    signature: signPaperclipExecutionRequest(SECRET, timestamp, body),
    runToken: 'opaque-run-token',
  });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.body, {
    executionId: 'exec_abc',
    model: 'wandora-supervised-v1',
    summary: 'accepted',
  });
  assert.equal(verifyCalls, 1);
  assert.deepEqual(executionInput, {
    identity: {
      paperclipAgentId: AGENT,
      paperclipCompanyId: COMPANY,
      catalogKey: 'ana-commercial-v1',
    },
    paperclipRunId: RUN,
    workId: WORK,
    task: {
      title: 'Qualificar contato',
      description: 'Entender a necessidade do contato.',
    },
  });
  assert.equal(JSON.stringify(executionInput).includes('opaque-run-token'), false);
  assert.equal(JSON.stringify(executionInput).includes('issue-1'), false);
  assert.equal(JSON.stringify(executionInput).includes('MED-1'), false);
});

test('Paperclip run identity is independently checked through the run-scoped token', async () => {
  let seenAuthorization = '';
  let seenRunId = '';
  const client = createPaperclipRunIdentityClient({
    agentMeUrl: 'http://wandora-paperclip:3100/api/agents/me',
    fetchImpl: async (_url, init) => {
      const headers = init?.headers as Record<string, string>;
      seenAuthorization = headers.authorization ?? '';
      seenRunId = headers['x-paperclip-run-id'] ?? '';
      return new Response(JSON.stringify({
        id: AGENT,
        companyId: COMPANY,
        name: 'Ana',
        role: 'commercial-assistant',
        status: 'running',
        metadata: {
          pluginManagedAgent: {
            pluginKey: 'wandora.organization-adapter-v1',
            agentKey: 'ana-commercial-v1',
          },
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });

  const identity = await client({
    runToken: 'opaque-run-token',
    paperclipRunId: RUN,
    paperclipAgentId: AGENT,
    paperclipCompanyId: COMPANY,
  });
  assert.equal(seenAuthorization, 'Bearer opaque-run-token');
  assert.equal(seenRunId, RUN);
  assert.deepEqual(identity, {
    paperclipAgentId: AGENT,
    paperclipCompanyId: COMPANY,
    catalogKey: 'ana-commercial-v1',
  });

  const wrongAgent = createPaperclipRunIdentityClient({
    agentMeUrl: 'http://wandora-paperclip:3100/api/agents/me',
    fetchImpl: async () => new Response(JSON.stringify({
      id: '81111111-1111-4111-8111-111111111111',
      companyId: COMPANY,
      name: 'Ana',
      role: 'commercial-assistant',
      metadata: { pluginManagedAgent: { pluginKey: 'wandora.organization-adapter-v1', agentKey: 'ana-commercial-v1' } },
    }), { status: 200 }),
  });
  await assert.rejects(
    wrongAgent({
      runToken: 'opaque-run-token',
      paperclipRunId: RUN,
      paperclipAgentId: AGENT,
      paperclipCompanyId: COMPANY,
    }),
    (error: unknown) => error instanceof PaperclipRunIdentityError && error.code === 'invalid',
  );
});


test('execution handler rejects malformed Wandora work correlation before identity/runtime', async () => {
  let verifyCalls = 0;
  let executeCalls = 0;
  const invalidBody = JSON.stringify({
    paperclipAgentId: AGENT,
    paperclipCompanyId: COMPANY,
    paperclipRunId: RUN,
    task: {
      workId: 'provider-controlled-not-a-uuid',
      title: 'Qualificar contato',
      description: 'Entender a necessidade.',
    },
  });
  const timestamp = String(Math.floor(NOW / 1000));
  const handler = createPaperclipExecutionHandler({
    secret: SECRET,
    verifyRunIdentity: async () => {
      verifyCalls += 1;
      throw new Error('must not run');
    },
    service: {
      execute: async () => {
        executeCalls += 1;
        throw new Error('must not run');
      },
    },
    now: () => NOW,
  });
  const response = await handler({
    rawBody: invalidBody,
    timestamp,
    signature: signPaperclipExecutionRequest(SECRET, timestamp, invalidBody),
    runToken: 'opaque-run-token',
  });
  assert.deepEqual(response, { status: 400, body: { error: 'invalid-execution-request' } });
  assert.equal(verifyCalls, 0);
  assert.equal(executeCalls, 0);
});
