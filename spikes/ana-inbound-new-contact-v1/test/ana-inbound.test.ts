import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  EmployeePlanner,
  EmployeeProposal,
  MessagingGateway,
  OutboundTextMessage,
  PlannerInput,
} from '../src/contracts.js';
import { AnaContractError, AnaInboundService } from '../src/service.js';
import { InMemoryAnaStore } from '../src/store.js';

const ORG_A = 'org_a';
const ORG_B = 'org_b';
const CONNECTION_A = 'connection_a';
const CONNECTION_B = 'connection_b';
const EMPLOYEE_A = 'employee_ana_a';

const event = (overrides: Partial<Parameters<AnaInboundService['handle']>[1]> = {}) => ({
  eventId: 'evt_001',
  connectionId: CONNECTION_A,
  sender: '+5551999999999',
  text: 'Olá, gostaria de saber mais.',
  occurredAt: '2026-09-14T05:00:00.000Z',
  ...overrides,
});

class FixedPlanner implements EmployeePlanner {
  calls = 0;

  constructor(readonly proposal: EmployeeProposal) {}

  async propose(_input: PlannerInput): Promise<EmployeeProposal> {
    this.calls += 1;
    return this.proposal;
  }
}

class RecordingMessaging implements MessagingGateway {
  calls: OutboundTextMessage[] = [];

  async sendText(message: OutboundTextMessage) {
    this.calls.push(message);
    return { accepted: true as const, requestId: `req_${message.idempotencyKey.slice(-12)}` };
  }
}

function setup(proposal: EmployeeProposal) {
  const store = new InMemoryAnaStore();
  store.addConnection({ id: CONNECTION_A, organizationId: ORG_A, status: 'active' });
  store.addConnection({ id: CONNECTION_B, organizationId: ORG_B, status: 'active' });
  store.addEmployee({
    id: EMPLOYEE_A,
    organizationId: ORG_A,
    name: 'Ana',
    role: 'commercial-assistant',
    status: 'active',
  });

  const planner = new FixedPlanner(proposal);
  const messaging = new RecordingMessaging();
  const service = new AnaInboundService({
    store,
    planner,
    messaging,
    now: () => '2026-09-14T05:00:01.000Z',
  });

  return { store, planner, messaging, service };
}

const safeProposal: EmployeeProposal = {
  kind: 'send-text',
  text: 'Olá! Obrigada pelo contato. Posso entender melhor o que você procura?',
  commitment: 'none',
  rationale: 'Acolhimento e qualificação inicial sem compromisso comercial.',
};

test('safe inbound creates contact/conversation/work and replies once', async () => {
  const { store, planner, messaging, service } = setup(safeProposal);

  const result = await service.handle(ORG_A, event());

  assert.equal(result.status, 'replied');
  assert.equal(planner.calls, 1);
  assert.equal(messaging.calls.length, 1);
  assert.equal(store.contacts.size, 1);
  assert.equal(store.conversations.size, 1);
  assert.equal(store.workItems.size, 1);
  assert.equal(store.approvals.size, 0);
  assert.equal(store.messages.size, 2);
  assert.equal(store.audits.length, 2);
  assert.deepEqual(store.audits.map((item) => item.action), ['inbound-accepted', 'outbound-sent']);
  assert.equal(store.audits[1]?.actorId, EMPLOYEE_A);
  assert.equal([...store.workItems.values()][0]?.status, 'waiting-customer');
  assert.equal(messaging.calls[0]?.connectionId, CONNECTION_A);
  assert.equal(messaging.calls[0]?.recipient, '+5551999999999');
  assert.equal('opportunities' in store, false);
});

test('duplicate Wandora event is idempotent and does not reply twice', async () => {
  const { store, planner, messaging, service } = setup(safeProposal);
  const first = await service.handle(ORG_A, event());
  const second = await service.handle(ORG_A, event());

  assert.deepEqual(second, first);
  assert.equal(planner.calls, 1);
  assert.equal(messaging.calls.length, 1);
  assert.equal(store.contacts.size, 1);
  assert.equal(store.conversations.size, 1);
  assert.equal(store.workItems.size, 1);
  assert.equal(store.messages.size, 2);
  assert.equal(store.audits.length, 2);
});

test('commercial commitment is blocked and becomes human approval', async () => {
  const sensitiveProposal: EmployeeProposal = {
    kind: 'send-text',
    text: 'Consigo liberar 15% de desconto para você hoje.',
    commitment: 'discount',
    rationale: 'Cliente pediu condição especial para fechar agora.',
  };
  const { store, messaging, service } = setup(sensitiveProposal);

  const result = await service.handle(ORG_A, event({ text: 'Tem desconto para fechar hoje?' }));

  assert.equal(result.status, 'approval-required');
  assert.equal(messaging.calls.length, 0);
  assert.equal(store.approvals.size, 1);
  assert.equal([...store.workItems.values()][0]?.status, 'waiting-approval');
  assert.equal([...store.approvals.values()][0]?.proposal.commitment, 'discount');
  assert.equal(store.messages.size, 1);
  assert.deepEqual(store.audits.map((item) => item.action), ['inbound-accepted', 'approval-requested']);
});

test('foreign organization cannot route another company messaging connection', async () => {
  const { store, planner, messaging, service } = setup(safeProposal);

  await assert.rejects(
    service.handle(ORG_A, event({ connectionId: CONNECTION_B })),
    (error: unknown) => error instanceof AnaContractError && error.code === 'tenant_mismatch',
  );

  assert.equal(planner.calls, 0);
  assert.equal(messaging.calls.length, 0);
  assert.equal(store.contacts.size, 0);
  assert.equal(store.conversations.size, 0);
  assert.equal(store.workItems.size, 0);
  assert.equal(store.messages.size, 0);
  assert.equal(store.audits.length, 0);
});

test('same customer on a later event reuses contact, conversation and qualification work', async () => {
  const { store, planner, messaging, service } = setup(safeProposal);

  const first = await service.handle(ORG_A, event());
  const second = await service.handle(ORG_A, event({ eventId: 'evt_002', text: 'Quero continuar a conversa.' }));

  assert.equal(store.contacts.size, 1);
  assert.equal(store.conversations.size, 1);
  assert.equal(store.workItems.size, 1);
  assert.equal(first.workItemId, second.workItemId);
  assert.equal(store.messages.size, 4);
  assert.equal(store.audits.length, 4);
  assert.equal(planner.calls, 2);
  assert.equal(messaging.calls.length, 2);
  assert.notEqual(messaging.calls[0]?.idempotencyKey, messaging.calls[1]?.idempotencyKey);
});

test('disabled messaging connection blocks work before any employee action', async () => {
  const { store, planner, messaging, service } = setup(safeProposal);
  const connection = store.connections.get(CONNECTION_A);
  assert.ok(connection);
  connection.status = 'disabled';

  await assert.rejects(
    service.handle(ORG_A, event()),
    (error: unknown) => error instanceof AnaContractError && error.code === 'connection_unavailable',
  );

  assert.equal(planner.calls, 0);
  assert.equal(messaging.calls.length, 0);
  assert.equal(store.contacts.size, 0);
  assert.equal(store.workItems.size, 0);
  assert.equal(store.audits.length, 0);
});

test('paused Ana blocks work before contact state is created', async () => {
  const { store, planner, messaging, service } = setup(safeProposal);
  const employee = store.employees.get(EMPLOYEE_A);
  assert.ok(employee);
  employee.status = 'paused';

  await assert.rejects(
    service.handle(ORG_A, event()),
    (error: unknown) => error instanceof AnaContractError && error.code === 'employee_unavailable',
  );

  assert.equal(planner.calls, 0);
  assert.equal(messaging.calls.length, 0);
  assert.equal(store.contacts.size, 0);
  assert.equal(store.conversations.size, 0);
  assert.equal(store.workItems.size, 0);
  assert.equal(store.audits.length, 0);
});
