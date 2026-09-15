import assert from 'node:assert/strict';
import test from 'node:test';
import type { HumanSupervisionReadService } from '../src/supervision/human-read.js';
import { createHumanSupervisionHandler } from '../src/runtime/human-supervision.js';

const ORG = '00000000-0000-0000-0000-0000000000a1';

function handlerWithFixture() {
  const service = {
    async getSessionContext() {
      return { user: { id: 'user-1', name: 'Gestor' }, organizations: [] };
    },
    async listAttentionRequired() {
      return [];
    },
    async listConversations() {
      return [{
        conversation: {
          id: '50000000-0000-0000-0000-0000000000a1',
          status: 'open' as const,
          lastActivityAt: '2026-09-15T18:30:00.000Z',
        },
        contact: { id: '40000000-0000-0000-0000-0000000000a1', label: 'Cliente A' },
        employee: null,
        latestMessage: null,
      }];
    },
  } as unknown as HumanSupervisionReadService;
  return createHumanSupervisionHandler(service);
}

test('only exact conversations list route is accepted', async () => {
  const handler = handlerWithFixture();
  const allowed = await handler({
    method: 'GET',
    pathname: `/api/v1/organizations/${ORG}/conversations`,
    authorization: 'Bearer fixture',
  });
  assert.equal(allowed.status, 200);
  assert.equal(Array.isArray(allowed.body.items), true);

  const invalidId = await handler({
    method: 'GET',
    pathname: '/api/v1/organizations/not-a-uuid/conversations',
    authorization: 'Bearer fixture',
  });
  assert.equal(invalidId.status, 404);

  const unreviewed = await handler({
    method: 'GET',
    pathname: `/api/v1/organizations/${ORG}/conversations/not-reviewed`,
    authorization: 'Bearer fixture',
  });
  assert.equal(unreviewed.status, 404);
});

test('conversations list remains read-only at HTTP boundary', async () => {
  const handler = handlerWithFixture();
  const response = await handler({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/conversations`,
    authorization: 'Bearer fixture',
  });
  assert.equal(response.status, 405);
});
