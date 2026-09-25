import assert from 'node:assert/strict';
import test from 'node:test';
import { createHumanSupervisionHandler } from '../src/runtime/human-supervision.js';
import {
  HumanDigitalEmployeeGuidanceConflictError,
  type HumanDigitalEmployeeGuidanceService,
} from '../src/supervision/human-digital-employee-guidance.js';
import type { HumanSupervisionReadService } from '../src/supervision/human-read.js';

const ORG = '00000000-0000-0000-0000-0000000000a1';
const EMPLOYEE = '10000000-0000-0000-0000-0000000000a1';
const ENTRY = '30000000-0000-0000-0000-0000000000a1';
const USER = '20000000-0000-0000-0000-0000000000a1';

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
    type: 'behavior' as const,
    content: 'Fale de forma objetiva e acolhedora.',
    provenance: {
      type: 'owner_statement' as const,
      sourceRef: null,
      sourceLabel: null,
    },
    supersedesEntryId: null,
    status: 'active' as const,
    createdByUserId: USER,
    createdAt: '2026-09-25T08:00:00.000Z',
    updatedAt: '2026-09-25T08:00:00.000Z',
  };
}

function handler(guidanceService: HumanDigitalEmployeeGuidanceService) {
  return createHumanSupervisionHandler(
    readService(),
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    guidanceService,
  );
}

test('employee development GET returns only provider-neutral Wandora guidance', async () => {
  const guidance = {
    async list(authorization: string | undefined, organizationId: string, employeeId: string) {
      assert.equal(authorization, 'Bearer fixture');
      assert.equal(organizationId, ORG);
      assert.equal(employeeId, EMPLOYEE);
      return [entry()];
    },
  } as unknown as HumanDigitalEmployeeGuidanceService;

  const response = await handler(guidance)({
    method: 'GET',
    pathname: `/api/v1/organizations/${ORG}/digital-employees/${EMPLOYEE}/development`,
    authorization: 'Bearer fixture',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { items: [entry()] });
  const serialized = JSON.stringify(response.body);
  for (const forbidden of ['paperclip', 'mastra', 'providerAgentId', 'skillId', 'memoryId']) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test('employee development create passes bounded semantic fields and idempotency key', async () => {
  const calls: unknown[] = [];
  const guidance = {
    async create(input: unknown) {
      calls.push(input);
      return entry();
    },
  } as unknown as HumanDigitalEmployeeGuidanceService;

  const response = await handler(guidance)({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/digital-employees/${EMPLOYEE}/development`,
    authorization: 'Bearer fixture',
    idempotencyKey: ' teach-ana-1 ',
    rawBody: JSON.stringify({
      entryType: 'behavior',
      content: ' Fale de forma objetiva e acolhedora. ',
      provenanceType: 'owner_statement',
    }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, [{
    organizationId: ORG,
    employeeId: EMPLOYEE,
    authorization: 'Bearer fixture',
    idempotencyKey: 'teach-ana-1',
    entryType: 'behavior',
    content: 'Fale de forma objetiva e acolhedora.',
    provenanceType: 'owner_statement',
    sourceRef: null,
    sourceLabel: null,
  }]);
});

test('employee development create rejects inferred learning, provider fields and evidence without reference', async () => {
  let calls = 0;
  const guidance = {
    async create() {
      calls += 1;
      throw new Error('must not run');
    },
  } as unknown as HumanDigitalEmployeeGuidanceService;

  const cases = [
    {
      entryType: 'practice',
      content: 'Aprendido automaticamente.',
      provenanceType: 'approved_correction',
      sourceRef: 'work:1',
    },
    {
      entryType: 'practice',
      content: 'Precisa de evidência.',
      provenanceType: 'approved_evidence',
    },
    {
      entryType: 'knowledge',
      content: 'Categoria inexistente.',
      provenanceType: 'owner_statement',
    },
    {
      entryType: 'behavior',
      content: 'Não pode vazar provider.',
      provenanceType: 'owner_statement',
      skillId: 'paperclip-skill-1',
    },
    {
      entryType: 'behavior',
      content: 'Não pode vazar memória.',
      provenanceType: 'owner_statement',
      memoryId: 'mastra-memory-1',
    },
  ];

  for (const body of cases) {
    const response = await handler(guidance)({
      method: 'POST',
      pathname: `/api/v1/organizations/${ORG}/digital-employees/${EMPLOYEE}/development`,
      authorization: 'Bearer fixture',
      idempotencyKey: 'key-1',
      rawBody: JSON.stringify(body),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: 'invalid-employee-development-request' });
  }
  assert.equal(calls, 0);
});

test('employee development correction requires explicit evidence and preserves exact employee scope', async () => {
  const calls: unknown[] = [];
  const guidance = {
    async correct(input: unknown) {
      calls.push(input);
      return {
        ...entry(),
        id: '30000000-0000-0000-0000-0000000000b1',
        content: 'Fale de forma objetiva.',
        provenance: {
          type: 'approved_correction' as const,
          sourceRef: 'work-review:1',
          sourceLabel: 'Revisão do owner',
        },
        supersedesEntryId: ENTRY,
      };
    },
  } as unknown as HumanDigitalEmployeeGuidanceService;

  for (const body of [
    { content: 'Sem evidência.' },
    { content: 'Provider não entra.', sourceRef: 'work-review:1', providerId: 'paperclip' },
  ]) {
    const rejected = await handler(guidance)({
      method: 'POST',
      pathname: `/api/v1/organizations/${ORG}/digital-employees/${EMPLOYEE}/development/${ENTRY}/correct`,
      authorization: 'Bearer fixture',
      idempotencyKey: 'correct-1',
      rawBody: JSON.stringify(body),
    });
    assert.equal(rejected.status, 400);
  }

  const response = await handler(guidance)({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/digital-employees/${EMPLOYEE}/development/${ENTRY}/correct`,
    authorization: 'Bearer fixture',
    idempotencyKey: ' correct-1 ',
    rawBody: JSON.stringify({
      content: ' Fale de forma objetiva. ',
      sourceRef: ' work-review:1 ',
      sourceLabel: ' Revisão do owner ',
    }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, [{
    organizationId: ORG,
    employeeId: EMPLOYEE,
    entryId: ENTRY,
    authorization: 'Bearer fixture',
    idempotencyKey: 'correct-1',
    content: 'Fale de forma objetiva.',
    sourceRef: 'work-review:1',
    sourceLabel: 'Revisão do owner',
  }]);
});

test('employee development retirement has no body and preserves exact employee scope', async () => {
  const calls: unknown[] = [];
  const guidance = {
    async retire(input: unknown) {
      calls.push(input);
      return { ...entry(), status: 'retired' as const };
    },
  } as unknown as HumanDigitalEmployeeGuidanceService;

  const response = await handler(guidance)({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/digital-employees/${EMPLOYEE}/development/${ENTRY}/retire`,
    authorization: 'Bearer fixture',
    idempotencyKey: ' retire-1 ',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, [{
    organizationId: ORG,
    employeeId: EMPLOYEE,
    entryId: ENTRY,
    authorization: 'Bearer fixture',
    idempotencyKey: 'retire-1',
  }]);
});

test('employee development conflicts remain provider-neutral', async () => {
  const guidance = {
    async create() {
      throw new HumanDigitalEmployeeGuidanceConflictError(
        'idempotency-conflict',
        'provider detail must not leak',
      );
    },
  } as unknown as HumanDigitalEmployeeGuidanceService;

  const response = await handler(guidance)({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/digital-employees/${EMPLOYEE}/development`,
    authorization: 'Bearer fixture',
    idempotencyKey: 'key-1',
    rawBody: JSON.stringify({
      entryType: 'responsibility',
      content: 'Qualificar oportunidades comerciais.',
      provenanceType: 'owner_statement',
    }),
  });

  assert.equal(response.status, 409);
  assert.deepEqual(response.body, { error: 'idempotency-conflict' });
});
