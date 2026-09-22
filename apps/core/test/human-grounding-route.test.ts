import assert from 'node:assert/strict';
import test from 'node:test';
import { createHumanSupervisionHandler } from '../src/runtime/human-supervision.js';
import {
  HumanGroundingConflictError,
  type HumanGroundingService,
} from '../src/supervision/human-grounding.js';
import type { HumanSupervisionReadService } from '../src/supervision/human-read.js';

const ORG = '00000000-0000-0000-0000-0000000000a1';
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
    type: 'fact' as const,
    content: 'Atendimento de segunda a sexta.',
    provenance: {
      type: 'approved_source' as const,
      sourceRef: 'source:company-profile:v1',
      sourceLabel: 'Perfil oficial',
    },
    supersedesEntryId: null,
    status: 'active' as const,
    createdByUserId: USER,
    createdAt: '2026-09-22T08:00:00.000Z',
    updatedAt: '2026-09-22T08:00:00.000Z',
  };
}

function handler(groundingService: HumanGroundingService) {
  return createHumanSupervisionHandler(
    readService(),
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    groundingService,
  );
}

test('grounding GET returns only provider-neutral Wandora contract', async () => {
  const grounding = {
    async list(authorization: string | undefined, organizationId: string) {
      assert.equal(authorization, 'Bearer fixture');
      assert.equal(organizationId, ORG);
      return [entry()];
    },
  } as unknown as HumanGroundingService;

  const response = await handler(grounding)({
    method: 'GET',
    pathname: `/api/v1/organizations/${ORG}/grounding`,
    authorization: 'Bearer fixture',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { items: [entry()] });
  const serialized = JSON.stringify(response.body);
  assert.equal(serialized.includes('paperclip'), false);
  assert.equal(serialized.includes('mastra'), false);
  assert.equal(serialized.includes('providerId'), false);
});

test('grounding create passes only canonical mutation fields and idempotency key', async () => {
  const calls: unknown[] = [];
  const grounding = {
    async create(input: unknown) {
      calls.push(input);
      return entry();
    },
  } as unknown as HumanGroundingService;

  const response = await handler(grounding)({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/grounding`,
    authorization: 'Bearer fixture',
    idempotencyKey: ' grounding-create-1 ',
    rawBody: JSON.stringify({
      entryType: 'fact',
      content: ' Atendimento de segunda a sexta. ',
      provenanceType: 'approved_source',
      sourceRef: ' source:company-profile:v1 ',
      sourceLabel: ' Perfil oficial ',
    }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, [{
    organizationId: ORG,
    authorization: 'Bearer fixture',
    idempotencyKey: 'grounding-create-1',
    entryType: 'fact',
    content: 'Atendimento de segunda a sexta.',
    provenanceType: 'approved_source',
    sourceRef: 'source:company-profile:v1',
    sourceLabel: 'Perfil oficial',
  }]);
});

test('grounding create rejects inferred correction and provider-shaped extras before service', async () => {
  let calls = 0;
  const grounding = {
    async create() {
      calls += 1;
      throw new Error('must not run');
    },
  } as unknown as HumanGroundingService;

  const cases = [
    {
      entryType: 'fact',
      content: 'Unsupported.',
      provenanceType: 'approved_source',
    },
    {
      entryType: 'fact',
      content: 'Correction cannot be created directly.',
      provenanceType: 'approved_correction',
      sourceRef: 'correction:1',
    },
    {
      entryType: 'fact',
      content: 'No provider IDs.',
      provenanceType: 'owner_statement',
      providerId: 'paperclip-123',
    },
  ];

  for (const body of cases) {
    const response = await handler(grounding)({
      method: 'POST',
      pathname: `/api/v1/organizations/${ORG}/grounding`,
      authorization: 'Bearer fixture',
      idempotencyKey: 'key-1',
      rawBody: JSON.stringify(body),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: 'invalid-grounding-request' });
  }
  assert.equal(calls, 0);
});

test('grounding correction requires explicit evidence and never accepts type/provider selectors', async () => {
  let calls = 0;
  const grounding = {
    async correct() {
      calls += 1;
      return { ...entry(), supersedesEntryId: ENTRY, provenance: { type: 'approved_correction', sourceRef: 'correction:1', sourceLabel: null } };
    },
  } as unknown as HumanGroundingService;

  for (const body of [
    { content: 'Corrected.' },
    { content: 'Corrected.', sourceRef: 'correction:1', entryType: 'rule' },
    { content: 'Corrected.', sourceRef: 'correction:1', providerId: 'mastra-memory-1' },
  ]) {
    const response = await handler(grounding)({
      method: 'POST',
      pathname: `/api/v1/organizations/${ORG}/grounding/${ENTRY}/correct`,
      authorization: 'Bearer fixture',
      idempotencyKey: 'correct-1',
      rawBody: JSON.stringify(body),
    });
    assert.equal(response.status, 400);
  }
  assert.equal(calls, 0);
});

test('grounding correction and retirement preserve exact action contracts', async () => {
  const calls: unknown[] = [];
  const grounding = {
    async correct(input: unknown) {
      calls.push({ kind: 'correct', input });
      return {
        ...entry(),
        id: '30000000-0000-0000-0000-0000000000b1',
        provenance: { type: 'approved_correction' as const, sourceRef: 'correction:1', sourceLabel: 'Owner review' },
        supersedesEntryId: ENTRY,
      };
    },
    async retire(input: unknown) {
      calls.push({ kind: 'retire', input });
      return { ...entry(), status: 'retired' as const };
    },
  } as unknown as HumanGroundingService;

  const corrected = await handler(grounding)({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/grounding/${ENTRY}/correct`,
    authorization: 'Bearer fixture',
    idempotencyKey: ' correct-1 ',
    rawBody: JSON.stringify({
      content: ' Corrected fact. ',
      sourceRef: ' correction:1 ',
      sourceLabel: ' Owner review ',
    }),
  });
  assert.equal(corrected.status, 200);

  const retired = await handler(grounding)({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/grounding/${ENTRY}/retire`,
    authorization: 'Bearer fixture',
    idempotencyKey: ' retire-1 ',
  });
  assert.equal(retired.status, 200);

  assert.deepEqual(calls, [
    {
      kind: 'correct',
      input: {
        organizationId: ORG,
        authorization: 'Bearer fixture',
        idempotencyKey: 'correct-1',
        entryId: ENTRY,
        content: 'Corrected fact.',
        sourceRef: 'correction:1',
        sourceLabel: 'Owner review',
      },
    },
    {
      kind: 'retire',
      input: {
        organizationId: ORG,
        authorization: 'Bearer fixture',
        idempotencyKey: 'retire-1',
        entryId: ENTRY,
      },
    },
  ]);
});

test('grounding mutation conflicts remain provider-neutral', async () => {
  const grounding = {
    async create() {
      throw new HumanGroundingConflictError('idempotency-conflict', 'provider detail must not leak');
    },
  } as unknown as HumanGroundingService;

  const response = await handler(grounding)({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/grounding`,
    authorization: 'Bearer fixture',
    idempotencyKey: 'key-1',
    rawBody: JSON.stringify({
      entryType: 'rule',
      content: 'Never invent company facts.',
      provenanceType: 'owner_statement',
    }),
  });
  assert.equal(response.status, 409);
  assert.deepEqual(response.body, { error: 'idempotency-conflict' });
});

[executed on device: wandora-vps-01 (4f062e11-0f3c-4c6e-8f71-7d6136c1bee9)]

Note: you've used 81% of this month's Desktop Commander usage. Visit https://mcp.desktopcommander.app/ to learn more about usage and resets.