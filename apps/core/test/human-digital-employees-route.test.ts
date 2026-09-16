import assert from 'node:assert/strict';
import test from 'node:test';
import type { HumanDigitalEmployeesReadService } from '../src/supervision/human-digital-employees-read.js';
import type { HumanSupervisionReadService } from '../src/supervision/human-read.js';
import { createHumanSupervisionHandler } from '../src/runtime/human-supervision.js';

const ORG = '00000000-0000-0000-0000-0000000000a1';
const EMPLOYEE = '30000000-0000-0000-0000-0000000000a1';

function handlerWithFixture() {
  const service = {
    async getSessionContext() {
      return { user: { id: 'user-1', name: 'Gestor' }, organizations: [] };
    },
    async listAttentionRequired() {
      return [];
    },
    async listConversations() {
      return [];
    },
    async getConversationDetail() {
      throw new Error('not used');
    },
  } as unknown as HumanSupervisionReadService;

  const digitalEmployeesService = {
    async listDigitalEmployees() {
      return [{
        id: EMPLOYEE,
        name: 'Ana',
        role: 'commercial-assistant' as const,
        status: 'active' as const,
        autonomy: 'supervised' as const,
      }];
    },
  } as unknown as HumanDigitalEmployeesReadService;

  return createHumanSupervisionHandler(service, undefined, digitalEmployeesService);
}

test('only exact UUID digital employees route is accepted', async () => {
  const handler = handlerWithFixture();

  const allowed = await handler({
    method: 'GET',
    pathname: `/api/v1/organizations/${ORG}/digital-employees`,
    authorization: 'Bearer fixture',
  });
  assert.equal(allowed.status, 200);
  assert.deepEqual(allowed.body, {
    items: [{
      id: EMPLOYEE,
      name: 'Ana',
      role: 'commercial-assistant',
      status: 'active',
      autonomy: 'supervised',
    }],
  });

  const invalidId = await handler({
    method: 'GET',
    pathname: '/api/v1/organizations/not-a-uuid/digital-employees',
    authorization: 'Bearer fixture',
  });
  assert.equal(invalidId.status, 404);

  const extraPath = await handler({
    method: 'GET',
    pathname: `/api/v1/organizations/${ORG}/digital-employees/${EMPLOYEE}`,
    authorization: 'Bearer fixture',
  });
  assert.equal(extraPath.status, 404);
});

test('digital employees route remains read-only', async () => {
  const handler = handlerWithFixture();
  const response = await handler({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/digital-employees`,
    authorization: 'Bearer fixture',
  });
  assert.equal(response.status, 405);
});

test('route stays structurally closed when digital employee service is absent', async () => {
  const service = {
    async getSessionContext() {
      return { user: { id: 'user-1', name: 'Gestor' }, organizations: [] };
    },
  } as unknown as HumanSupervisionReadService;
  const handler = createHumanSupervisionHandler(service);

  const response = await handler({
    method: 'GET',
    pathname: `/api/v1/organizations/${ORG}/digital-employees`,
    authorization: 'Bearer fixture',
  });
  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { error: 'not-found' });
});
