import assert from 'node:assert/strict';
import test from 'node:test';
import { createHumanSupervisionHandler } from '../src/runtime/human-supervision.js';
import type { HumanSupervisionReadService } from '../src/supervision/human-read.js';
import {
  HumanSendProposalConflictError,
  HumanSendProposalDeliveryUncertainError,
  type HumanSendProposalService,
} from '../src/supervision/human-send-proposal.js';

const ORG = '00000000-0000-0000-0000-0000000000a1';
const WORK = '60000000-0000-0000-0000-0000000000a1';
const PROPOSAL = '70000000-0000-0000-0000-0000000000a1';
const CONVERSATION = '50000000-0000-0000-0000-0000000000a1';
const CONFIRMATION = `sha256:${'a'.repeat(64)}`;
const READY_ACTION = {
  state: 'ready' as const,
  confirmation: { recipientMasked: '+5551••••0001', text: 'Resposta segura', version: CONFIRMATION },
};

function readService(): HumanSupervisionReadService {
  return {
    async listAttentionRequired() {
      return [{
        work: { id: WORK, kind: 'qualify-new-contact' as const, status: 'attention-required' as const, updatedAt: '2026-09-15T20:00:00.000Z' },
        employee: { id: '30000000-0000-0000-0000-0000000000a1', name: 'Ana' },
        contact: { id: '40000000-0000-0000-0000-0000000000a1', label: 'Cliente A' },
        conversation: { id: CONVERSATION },
        latestCustomerMessage: { text: 'Olá', occurredAt: '2026-09-15T20:00:00.000Z' },
        proposal: {
          id: PROPOSAL,
          kind: 'send-text' as const,
          text: 'Resposta segura',
          rationale: 'Sem compromisso comercial',
          createdAt: '2026-09-15T20:00:00.000Z',
        },
      }];
    },
  } as unknown as HumanSupervisionReadService;
}

test('send route stays hidden when capability is absent', async () => {
  const handler = createHumanSupervisionHandler(readService());
  const response = await handler({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/work/${WORK}/proposals/${PROPOSAL}/send`,
    authorization: 'Bearer fixture',
  });
  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { error: 'not-found' });
});

test('exact enabled POST forwards only canonical selectors and work read gains normalized action state', async () => {
  let captured: unknown;
  const sendService = {
    async getAttentionActionStates() {
      return new Map([[PROPOSAL, READY_ACTION]]);
    },
    async sendProposal(args: unknown) {
      captured = args;
      return { status: 'sent' as const, proposalId: PROPOSAL, conversationId: CONVERSATION };
    },
  } as unknown as HumanSendProposalService;
  const handler = createHumanSupervisionHandler(readService(), sendService);

  const work = await handler({
    method: 'GET',
    pathname: `/api/v1/organizations/${ORG}/work/attention-required`,
    authorization: 'Bearer fixture',
  });
  assert.equal(work.status, 200);
  const items = work.body.items as Array<{ proposal?: { sendAction?: unknown } }>;
  assert.deepEqual(items[0]?.proposal?.sendAction, READY_ACTION);

  const response = await handler({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/work/${WORK}/proposals/${PROPOSAL}/send`,
    authorization: 'Bearer fixture',
    rawBody: JSON.stringify({ confirmationVersion: CONFIRMATION }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: 'sent', proposalId: PROPOSAL, conversationId: CONVERSATION,
  });
  assert.deepEqual(captured, {
    authorization: 'Bearer fixture',
    organizationId: ORG,
    workItemId: WORK,
    proposalId: PROPOSAL,
    confirmationVersion: CONFIRMATION,
  });
});

test('send route rejects missing, malformed or widened confirmation bodies before service call', async () => {
  let calls = 0;
  const sendService = {
    async sendProposal() {
      calls += 1;
      return { status: 'sent' as const, proposalId: PROPOSAL, conversationId: CONVERSATION };
    },
  } as unknown as HumanSendProposalService;
  const handler = createHumanSupervisionHandler(readService(), sendService);
  const base = {
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/work/${WORK}/proposals/${PROPOSAL}/send`,
    authorization: 'Bearer fixture',
  };

  assert.deepEqual(await handler(base), { status: 400, body: { error: 'invalid-confirmation' } });
  assert.deepEqual(await handler({ ...base, rawBody: '{bad' }), { status: 400, body: { error: 'invalid-confirmation' } });
  assert.deepEqual(
    await handler({ ...base, rawBody: JSON.stringify({ confirmationVersion: CONFIRMATION, text: 'override' }) }),
    { status: 400, body: { error: 'invalid-confirmation' } },
  );
  assert.equal(calls, 0);
});

test('send route is exact, UUID-bound and POST-only', async () => {
  const sendService = {
    async sendProposal() {
      return { status: 'sent' as const, proposalId: PROPOSAL, conversationId: CONVERSATION };
    },
  } as unknown as HumanSendProposalService;
  const handler = createHumanSupervisionHandler(readService(), sendService);

  assert.equal((await handler({
    method: 'GET',
    pathname: `/api/v1/organizations/${ORG}/work/${WORK}/proposals/${PROPOSAL}/send`,
    authorization: 'Bearer fixture',
  })).status, 405);
  assert.equal((await handler({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/work/not-a-uuid/proposals/${PROPOSAL}/send`,
    authorization: 'Bearer fixture',
  })).status, 404);
  assert.equal((await handler({
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/work/${WORK}/proposals/${PROPOSAL}/send/again`,
    authorization: 'Bearer fixture',
  })).status, 405);
});

test('stale/unavailable and uncertain effects map to normalized non-success responses', async () => {
  let mode: 'conflict' | 'uncertain' = 'conflict';
  const sendService = {
    async sendProposal() {
      if (mode === 'conflict') {
        throw new HumanSendProposalConflictError('proposal-not-current', 'stale');
      }
      throw new HumanSendProposalDeliveryUncertainError();
    },
  } as unknown as HumanSendProposalService;
  const handler = createHumanSupervisionHandler(readService(), sendService);
  const request = {
    method: 'POST',
    pathname: `/api/v1/organizations/${ORG}/work/${WORK}/proposals/${PROPOSAL}/send`,
    authorization: 'Bearer fixture',
    rawBody: JSON.stringify({ confirmationVersion: CONFIRMATION }),
  };

  const conflict = await handler(request);
  assert.equal(conflict.status, 409);
  assert.deepEqual(conflict.body, { error: 'proposal-not-current' });

  const confirmationService = {
    async sendProposal() {
      throw new HumanSendProposalConflictError('confirmation-stale', 'changed');
    },
  } as unknown as HumanSendProposalService;
  const confirmationHandler = createHumanSupervisionHandler(readService(), confirmationService);
  const confirmationConflict = await confirmationHandler(request);
  assert.equal(confirmationConflict.status, 409);
  assert.deepEqual(confirmationConflict.body, { error: 'confirmation-stale' });

  mode = 'uncertain';
  const uncertain = await handler(request);
  assert.equal(uncertain.status, 409);
  assert.deepEqual(uncertain.body, { error: 'delivery-uncertain', retry: false });
});
