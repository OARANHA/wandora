import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OrganizationAdapterConflictError,
  OrganizationAdapterUnavailableError,
} from '../src/organization-adapter/contracts.js';
import type { OrganizationAdapterService } from '../src/organization-adapter/service.js';
import { DigitalEmployeeActivationError } from '../src/organization-adapter/contracts.js';
import type { HumanDigitalEmployeeActivationService } from '../src/supervision/human-digital-employee-activation.js';
import type { HumanDigitalEmployeesReadService } from '../src/supervision/human-digital-employees-read.js';
import { HumanAccessError, type HumanSupervisionReadService } from '../src/supervision/human-read.js';
import { createHumanSupervisionHandler } from '../src/runtime/human-supervision.js';

const ORG = '00000000-0000-0000-0000-0000000000a1';
const EMPLOYEE = '30000000-0000-0000-0000-0000000000a1';
const USER = '20000000-0000-0000-0000-0000000000a1';

function baseServices() {
  const service = {
    async getSessionContext() {
      return { user: { id: USER, name: 'Gestor' }, organizations: [] };
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
    async getDigitalEmployeesView() {
      return {
        items: [{
          id: EMPLOYEE,
          name: 'Ana',
          role: 'commercial-assistant' as const,
          status: 'paused' as const,
          autonomy: 'supervised' as const,
        }],
        hire: {
          catalogKey: 'ana-commercial-v1' as const,
          available: false,
          state: 'already-hired' as const,
        },
      };
    },
  } as unknown as HumanDigitalEmployeesReadService;

  return { service, digitalEmployeesService };
}

test('exact UUID digital employees GET remains canonical read-only projection', async () => {
  const { service, digitalEmployeesService } = baseServices();
  const handler = createHumanSupervisionHandler(service, undefined, digitalEmployeesService);

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
      status: 'paused',
      autonomy: 'supervised',
    }],
    hire: {
      catalogKey: 'ana-commercial-v1',
      available: false,
      state: 'already-hired',
    },
  });
  assert.equal(JSON.stringify(allowed.body).includes('paperclip'), false);
  assert.equal(JSON.stringify(allowed.body).includes('provider'), false);
  assert.equal(JSON.stringify(allowed.body).includes('secret'), false);

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

test('customer hire POST is structurally closed when the explicit hire service gate is absent', async () => {
  const { service, digitalEmployeesService } = baseServices();
  const handler = createHumanSupervisionHandler(service, undefined, digitalEmployeesService);

  const response = await handler({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/digital-employees`,
    authorization: 'Bearer fixture',
    idempotencyKey: 'hire-1',
    rawBody: JSON.stringify({ catalogKey: 'ana-commercial-v1' }),
  });
  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { error: 'not-found' });
});

test('enabled customer hire passes only canonical actor, tenant, catalog key and idempotency key', async () => {
  const { service, digitalEmployeesService } = baseServices();
  const calls: unknown[] = [];
  const hireService = {
    async ensureCatalogEmployee(input: unknown) {
      calls.push(input);
      return {
        id: EMPLOYEE,
        name: 'Ana',
        role: 'commercial-assistant' as const,
        status: 'paused' as const,
        autonomy: 'supervised' as const,
      };
    },
  } as unknown as OrganizationAdapterService;
  const handler = createHumanSupervisionHandler(
    service,
    undefined,
    digitalEmployeesService,
    hireService,
  );

  const response = await handler({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/digital-employees`,
    authorization: 'Bearer fixture',
    idempotencyKey: ' stable-hire-key ',
    rawBody: JSON.stringify({ catalogKey: 'ana-commercial-v1' }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    employee: {
      id: EMPLOYEE,
      name: 'Ana',
      role: 'commercial-assistant',
      status: 'paused',
      autonomy: 'supervised',
    },
  });
  assert.deepEqual(calls, [{
    organizationId: ORG,
    actorUserId: USER,
    catalogKey: 'ana-commercial-v1',
    idempotencyKey: 'stable-hire-key',
  }]);
  assert.equal(JSON.stringify(response.body).includes('provider'), false);
  assert.equal(JSON.stringify(response.body).includes('secret'), false);
});

test('customer hire validates exact body and idempotency boundary before the adapter effect', async () => {
  const { service, digitalEmployeesService } = baseServices();
  let calls = 0;
  const hireService = {
    async ensureCatalogEmployee() {
      calls += 1;
      throw new Error('must not run');
    },
  } as unknown as OrganizationAdapterService;
  const handler = createHumanSupervisionHandler(
    service,
    undefined,
    digitalEmployeesService,
    hireService,
  );

  for (const request of [
    { idempotencyKey: undefined, rawBody: JSON.stringify({ catalogKey: 'ana-commercial-v1' }) },
    { idempotencyKey: '', rawBody: JSON.stringify({ catalogKey: 'ana-commercial-v1' }) },
    { idempotencyKey: 'hire-1', rawBody: '{}' },
    { idempotencyKey: 'hire-1', rawBody: JSON.stringify({ catalogKey: 'ana-commercial-v1', provider: 'paperclip' }) },
    { idempotencyKey: 'hire-1', rawBody: JSON.stringify({ catalogKey: 'INVALID KEY' }) },
  ]) {
    const response = await handler({
      method: 'POST',
      pathname: `/api/v1/organizations/${ORG}/digital-employees`,
      authorization: 'Bearer fixture',
      ...request,
    });
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: 'invalid-hire-request' });
  }
  assert.equal(calls, 0);
});

test('customer hire maps authorization, conflict and unavailable outcomes without provider leakage', async () => {
  const { service, digitalEmployeesService } = baseServices();
  const cases: Array<{
    error: Error;
    status: number;
    body: Record<string, unknown>;
  }> = [
    {
      error: new HumanAccessError('forbidden', 'denied'),
      status: 403,
      body: { error: 'forbidden' },
    },
    {
      error: new OrganizationAdapterConflictError('idempotency-conflict', 'conflict'),
      status: 409,
      body: { error: 'idempotency-conflict' },
    },
    {
      error: new OrganizationAdapterUnavailableError('catalog-employee-unknown', 'missing'),
      status: 404,
      body: { error: 'employee-not-available' },
    },
    {
      error: new OrganizationAdapterUnavailableError('catalog-hire-not-eligible', 'private policy detail'),
      status: 404,
      body: { error: 'employee-not-available' },
    },
    {
      error: new OrganizationAdapterUnavailableError('provider-not-configured', 'provider detail'),
      status: 503,
      body: { error: 'employee-hiring-unavailable' },
    },
    {
      error: new OrganizationAdapterUnavailableError('provider-operation-uncertain', 'provider detail'),
      status: 409,
      body: { error: 'employee-hiring-uncertain', retry: 'same-idempotency-key' },
    },
  ];

  for (const scenario of cases) {
    const hireService = {
      async ensureCatalogEmployee() {
        throw scenario.error;
      },
    } as unknown as OrganizationAdapterService;
    const handler = createHumanSupervisionHandler(
      service,
      undefined,
      digitalEmployeesService,
      hireService,
    );
    const response = await handler({
      method: 'POST',
      pathname: `/api/v1/organizations/${ORG}/digital-employees`,
      authorization: 'Bearer fixture',
      idempotencyKey: 'hire-errors',
      rawBody: JSON.stringify({ catalogKey: 'ana-commercial-v1' }),
    });
    assert.equal(response.status, scenario.status);
    assert.deepEqual(response.body, scenario.body);
    assert.equal(JSON.stringify(response.body).includes('paperclip'), false);
  }
});

test('unsupported methods and absent read service stay closed', async () => {
  const { service, digitalEmployeesService } = baseServices();
  const handler = createHumanSupervisionHandler(service, undefined, digitalEmployeesService);

  const patch = await handler({
    method: 'PATCH',
    pathname: `/api/v1/organizations/${ORG}/digital-employees`,
    authorization: 'Bearer fixture',
  });
  assert.equal(patch.status, 405);

  const noReadHandler = createHumanSupervisionHandler(service);
  const response = await noReadHandler({
    method: 'GET',
    pathname: `/api/v1/organizations/${ORG}/digital-employees`,
    authorization: 'Bearer fixture',
  });
  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { error: 'not-found' });
});

test('activation route passes only authenticated actor + exact Wandora tenant/employee and no provider selector', async () => {
  const { service, digitalEmployeesService } = baseServices();
  const calls: unknown[] = [];
  const activationService = {
    async activate(input: unknown) {
      calls.push(input);
      return { id: EMPLOYEE, name: 'Ana', role: 'commercial-assistant', status: 'active', autonomy: 'supervised' };
    },
  } as unknown as HumanDigitalEmployeeActivationService;
  const handler = createHumanSupervisionHandler(service, undefined, digitalEmployeesService, undefined, activationService);

  const response = await handler({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/digital-employees/${EMPLOYEE}/activate`,
    authorization: 'Bearer fixture',
    rawBody: '',
  });
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [{ organizationId: ORG, actorUserId: USER, employeeId: EMPLOYEE }]);
  assert.equal(JSON.stringify(response.body).includes('provider'), false);
});

test('activation rejects raw request bodies/provider ids before the activation service', async () => {
  const { service, digitalEmployeesService } = baseServices();
  let calls = 0;
  const activationService = {
    async activate() { calls += 1; throw new Error('must not run'); },
  } as unknown as HumanDigitalEmployeeActivationService;
  const handler = createHumanSupervisionHandler(service, undefined, digitalEmployeesService, undefined, activationService);

  const response = await handler({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/digital-employees/${EMPLOYEE}/activate`,
    authorization: 'Bearer fixture',
    rawBody: JSON.stringify({ providerAgentId: 'paperclip-agent-forbidden' }),
  });
  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { error: 'invalid-activation-request' });
  assert.equal(calls, 0);
});

test('activation route stays closed without runtime activation wiring and maps fail-closed outcomes', async () => {
  const { service, digitalEmployeesService } = baseServices();
  const path = `/api/v1/organizations/${ORG}/digital-employees/${EMPLOYEE}/activate`;
  const closed = createHumanSupervisionHandler(service, undefined, digitalEmployeesService);
  assert.deepEqual(await closed({ method: 'POST', pathname: path, authorization: 'Bearer fixture', rawBody: '' }), {
    status: 404, body: { error: 'not-found' },
  });

  const cases = [
    ['employee-not-activatable', 409, { error: 'employee-not-activatable' }],
    ['provider-activation-uncertain', 409, { error: 'employee-activation-uncertain', retry: 'same-activation-contract' }],
    ['provider-activation-unavailable', 503, { error: 'employee-activation-unavailable' }],
    ['runtime-not-ready', 503, { error: 'employee-activation-unavailable' }],
  ] as const;
  for (const [code, status, body] of cases) {
    const activationService = {
      async activate() { throw new DigitalEmployeeActivationError(code, code); },
    } as unknown as HumanDigitalEmployeeActivationService;
    const handler = createHumanSupervisionHandler(service, undefined, digitalEmployeesService, undefined, activationService);
    const response = await handler({ method: 'POST', pathname: path, authorization: 'Bearer fixture', rawBody: '' });
    assert.equal(response.status, status);
    assert.deepEqual(response.body, body);
  }
});
