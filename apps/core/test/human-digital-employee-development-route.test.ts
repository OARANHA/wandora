import assert from 'node:assert/strict';
import test from 'node:test';
import { createHumanSupervisionHandler } from '../src/runtime/human-supervision.js';
import {
  HumanEmployeeDevelopmentConflictError,
  type HumanDigitalEmployeeDevelopmentService,
} from '../src/supervision/human-digital-employee-development.js';
import type { HumanSupervisionReadService } from '../src/supervision/human-read.js';

const ORG = '91000000-0000-4000-8000-000000000001';
const EMPLOYEE = '92000000-0000-4000-8000-000000000001';
const ENTRY = '93000000-0000-4000-8000-000000000001';
const USER = '94000000-0000-4000-8000-000000000001';

function readService(): HumanSupervisionReadService {
  return {
    async getSessionContext() {
      return {
        user: { id: USER, name: 'Owner' },
        organizations: [{ id: ORG, slug: 'org-a', name: 'Org A', role: 'owner' }],
      };
    },
  } as unknown as HumanSupervisionReadService;
}

function entry() {
  return {
    id: ENTRY,
    employeeId: EMPLOYEE,
    kind: 'practice' as const,
    content: 'Apresentar nome, codigo, preco e estoque.',
    provenance: {
      type: 'approved_learning' as const,
      sourceRef: 'wandora-work:reviewed-1',
      sourceLabel: 'Trabalho revisado',
    },
    supersedesEntryId: null,
    status: 'active' as const,
    createdByUserId: USER,
    createdAt: '2026-09-25T08:00:00.000Z',
    updatedAt: '2026-09-25T08:00:00.000Z',
  };
}

function handler(developmentService: HumanDigitalEmployeeDevelopmentService) {
  return createHumanSupervisionHandler(
    readService(),
    undefined, undefined, undefined, undefined, undefined,
    undefined, undefined, undefined, undefined,
    developmentService,
  );
}

test('employee development GET returns provider-neutral exact employee entries', async () => {
  const service = {
    async list(authorization: string | undefined, organizationId: string, employeeId: string) {
      assert.equal(authorization, 'Bearer fixture');
      assert.equal(organizationId, ORG);
      assert.equal(employeeId, EMPLOYEE);
      return [entry()];
    },
  } as unknown as HumanDigitalEmployeeDevelopmentService;

  const response = await handler(service)({
    method: 'GET',
    pathname: `/api/v1/organizations/${ORG}/digital-employees/${EMPLOYEE}/development`,
    authorization: 'Bearer fixture',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { items: [entry()] });
  const serialized = JSON.stringify(response.body);
  assert.equal(serialized.includes('paperclip'), false);
  assert.equal(serialized.includes('mastra'), false);
  assert.equal(serialized.includes('providerAgentId'), false);
});

test('employee development create accepts bounded owner statement and approved learning evidence', async () => {
  const calls: unknown[] = [];
  const service = {
    async create(input: unknown) {
      calls.push(input);
      return entry();
    },
  } as unknown as HumanDigitalEmployeeDevelopmentService;

  const response = await handler(service)({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/digital-employees/${EMPLOYEE}/development`,
    authorization: 'Bearer fixture',
    idempotencyKey: ' development-create-1 ',
    rawBody: JSON.stringify({
      kind: 'practice',
      content: ' Apresentar nome, codigo, preco e estoque. ',
      provenanceType: 'approved_learning',
      sourceRef: ' wandora-work:reviewed-1 ',
      sourceLabel: ' Trabalho revisado ',
    }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, [{
    organizationId: ORG,
    employeeId: EMPLOYEE,
    authorization: 'Bearer fixture',
    idempotencyKey: 'development-create-1',
    kind: 'practice',
    content: 'Apresentar nome, codigo, preco e estoque.',
    provenanceType: 'approved_learning',
    sourceRef: 'wandora-work:reviewed-1',
    sourceLabel: 'Trabalho revisado',
  }]);
});

test('employee development rejects learning without evidence and provider-shaped extras', async () => {
  let calls = 0;
  const service = {
    async create() { calls += 1; throw new Error('must not run'); },
  } as unknown as HumanDigitalEmployeeDevelopmentService;

  for (const body of [
    { kind: 'practice', content: 'Sem evidencia.', provenanceType: 'approved_learning' },
    { kind: 'knowledge', content: 'Generic knowledge is forbidden.', provenanceType: 'owner_statement' },
    { kind: 'behavior', content: 'No provider ids.', provenanceType: 'owner_statement', providerId: 'paperclip' },
    { kind: 'practice', content: 'No direct correction.', provenanceType: 'approved_correction', sourceRef: 'x' },
  ]) {
    const response = await handler(service)({
      method: 'POST',
      pathname: `/api/v1/organizations/${ORG}/digital-employees/${EMPLOYEE}/development`,
      authorization: 'Bearer fixture',
      idempotencyKey: 'key-1',
      rawBody: JSON.stringify(body),
    });
    assert.equal(response.status, 400);
  }
  assert.equal(calls, 0);
});

test('employee development correction and retirement preserve exact contracts', async () => {
  const calls: unknown[] = [];
  const service = {
    async correct(input: unknown) {
      calls.push({ kind: 'correct', input });
      return { ...entry(), provenance: { type: 'approved_correction' as const, sourceRef: 'review:2', sourceLabel: null }, supersedesEntryId: ENTRY };
    },
    async retire(input: unknown) {
      calls.push({ kind: 'retire', input });
      return { ...entry(), status: 'retired' as const };
    },
  } as unknown as HumanDigitalEmployeeDevelopmentService;

  const corrected = await handler(service)({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/digital-employees/${EMPLOYEE}/development/${ENTRY}/correct`,
    authorization: 'Bearer fixture',
    idempotencyKey: 'correct-1',
    rawBody: JSON.stringify({ content: 'Novo comportamento.', sourceRef: 'review:2', sourceLabel: null }),
  });
  assert.equal(corrected.status, 200);

  const retired = await handler(service)({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/digital-employees/${EMPLOYEE}/development/${ENTRY}/retire`,
    authorization: 'Bearer fixture',
    idempotencyKey: 'retire-1',
  });
  assert.equal(retired.status, 200);
  assert.equal(calls.length, 2);
});

test('employee development conflicts remain provider-neutral', async () => {
  const service = {
    async create() {
      throw new HumanEmployeeDevelopmentConflictError('idempotency-conflict', 'hidden detail');
    },
  } as unknown as HumanDigitalEmployeeDevelopmentService;

  const response = await handler(service)({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/digital-employees/${EMPLOYEE}/development`,
    authorization: 'Bearer fixture',
    idempotencyKey: 'key-1',
    rawBody: JSON.stringify({
      kind: 'behavior',
      content: 'Falar de forma objetiva.',
      provenanceType: 'owner_statement',
    }),
  });
  assert.equal(response.status, 409);
  assert.deepEqual(response.body, { error: 'idempotency-conflict' });
});
