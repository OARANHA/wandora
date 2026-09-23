import assert from 'node:assert/strict';
import test from 'node:test';
import type { HumanSupervisionReadService } from '../src/supervision/human-read.js';
import type { HumanStarterWorkforceReadinessService } from '../src/supervision/human-starter-workforce-readiness.js';
import { createHumanSupervisionHandler } from '../src/runtime/human-supervision.js';

const ORG = '00000000-0000-0000-0000-0000000000a1';

const service = {
  async getSessionContext() {
    return { user: { id: 'user-1', name: 'Owner' }, organizations: [{ id: ORG, slug: 'empresa', name: 'Empresa', role: 'owner' as const }] };
  },
  async listAttentionRequired() { return []; },
  async listConversations() { return []; },
  async getConversationDetail() { throw new Error('not used'); },
} as unknown as HumanSupervisionReadService;

test('starter workforce route exposes only provider-neutral readiness', async () => {
  const starter = {
    async getReadiness() {
      return {
        ready: false,
        state: 'provider-company-required' as const,
        starterProvisioningAllowed: true,
        starter: { catalogKey: 'ana-commercial-v1' as const, name: 'Ana', status: 'absent' as const },
      };
    },
  } as unknown as HumanStarterWorkforceReadinessService;

  const handler = createHumanSupervisionHandler(
    service, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, starter,
  );
  const response = await handler({
    method: 'GET',
    pathname: `/api/v1/organizations/${ORG}/starter-workforce`,
    authorization: 'Bearer fixture',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    readiness: {
      ready: false,
      state: 'provider-company-required',
      starterProvisioningAllowed: true,
      starter: { catalogKey: 'ana-commercial-v1', name: 'Ana', status: 'absent' },
    },
  });
  const serialized = JSON.stringify(response.body);
  assert.equal(serialized.includes('paperclip'), false);
  assert.equal(serialized.includes('providerCompany'), false);
  assert.equal(serialized.includes('secret'), false);
});

test('starter workforce route is GET-only and closed without readiness service', async () => {
  const closed = createHumanSupervisionHandler(service);
  assert.deepEqual(await closed({
    method: 'GET', pathname: `/api/v1/organizations/${ORG}/starter-workforce`, authorization: 'Bearer fixture',
  }), { status: 404, body: { error: 'not-found' } });

  const starter = { async getReadiness() { throw new Error('must not run'); } } as unknown as HumanStarterWorkforceReadinessService;
  const handler = createHumanSupervisionHandler(
    service, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, starter,
  );
  assert.deepEqual(await handler({
    method: 'POST', pathname: `/api/v1/organizations/${ORG}/starter-workforce`, authorization: 'Bearer fixture',
  }), { status: 405, body: { error: 'method-not-allowed' } });
});
