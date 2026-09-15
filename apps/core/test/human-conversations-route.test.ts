import assert from 'node:assert/strict';
import test from 'node:test';
import { HumanNotFoundError, type HumanSupervisionReadService } from '../src/supervision/human-read.js';
import { createHumanSupervisionHandler } from '../src/runtime/human-supervision.js';

const ORG = '00000000-0000-0000-0000-0000000000a1';
const CONVERSATION = '50000000-0000-0000-0000-0000000000a1';

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
          id: CONVERSATION,
          status: 'open' as const,
          lastActivityAt: '2026-09-15T18:30:00.000Z',
        },
        contact: { id: '40000000-0000-0000-0000-0000000000a1', label: 'Cliente A' },
        employee: null,
        latestMessage: null,
      }];
    },
    async getConversationDetail() {
      return {
        conversation: {
          id: CONVERSATION,
          status: 'open' as const,
          lastActivityAt: '2026-09-15T18:30:00.000Z',
        },
        contact: { id: '40000000-0000-0000-0000-0000000000a1', label: 'Cliente A' },
        employee: null,
        messages: [{
          direction: 'inbound' as const,
          text: 'Mensagem A',
          occurredAt: '2026-09-15T18:30:00.000Z',
        }],
        hasEarlierMessages: false,
      };
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
    pathname: `/api/v1/organizations/${ORG}/conversations/not-reviewed/extra`,
    authorization: 'Bearer fixture',
  });
  assert.equal(unreviewed.status, 404);
});

test('only exact UUID conversation detail route is accepted', async () => {
  const handler = handlerWithFixture();
  const allowed = await handler({
    method: 'GET',
    pathname: `/api/v1/organizations/${ORG}/conversations/${CONVERSATION}`,
    authorization: 'Bearer fixture',
  });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body.hasEarlierMessages, false);
  assert.equal(Array.isArray(allowed.body.messages), true);

  const invalidConversation = await handler({
    method: 'GET',
    pathname: `/api/v1/organizations/${ORG}/conversations/not-a-uuid`,
    authorization: 'Bearer fixture',
  });
  assert.equal(invalidConversation.status, 404);

  const extraPath = await handler({
    method: 'GET',
    pathname: `/api/v1/organizations/${ORG}/conversations/${CONVERSATION}/messages`,
    authorization: 'Bearer fixture',
  });
  assert.equal(extraPath.status, 404);
});

test('conversation detail not-found is mapped to a generic 404', async () => {
  const service = {
    async getConversationDetail() {
      throw new HumanNotFoundError();
    },
  } as unknown as HumanSupervisionReadService;
  const handler = createHumanSupervisionHandler(service);

  const response = await handler({
    method: 'GET',
    pathname: `/api/v1/organizations/${ORG}/conversations/${CONVERSATION}`,
    authorization: 'Bearer fixture',
  });
  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { error: 'not-found' });
});

test('conversation reads remain read-only at HTTP boundary', async () => {
  const handler = handlerWithFixture();
  const listResponse = await handler({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/conversations`,
    authorization: 'Bearer fixture',
  });
  assert.equal(listResponse.status, 405);

  const detailResponse = await handler({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/conversations/${CONVERSATION}`,
    authorization: 'Bearer fixture',
  });
  assert.equal(detailResponse.status, 405);
});
