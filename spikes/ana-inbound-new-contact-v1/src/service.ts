import { createHash } from 'node:crypto';
import type {
  EmployeePlanner,
  InboundProcessingResult,
  InboundTextEvent,
  MessagingGateway,
  OrganizationId,
} from './contracts.js';
import { evaluateProposal } from './policy.js';
import { InMemoryAnaStore } from './store.js';

export class AnaContractError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'AnaContractError';
  }
}

export type AnaInboundServiceDeps = {
  store: InMemoryAnaStore;
  planner: EmployeePlanner;
  messaging: MessagingGateway;
  now?: () => string;
};

const outboundKey = (organizationId: string, eventId: string) =>
  `out_${createHash('sha256').update(`${organizationId}|${eventId}|ana-reply-v1`).digest('hex')}`;

export class AnaInboundService {
  private readonly now: () => string;

  constructor(private readonly deps: AnaInboundServiceDeps) {
    this.now = deps.now ?? (() => new Date().toISOString());
  }

  async handle(
    organizationId: OrganizationId,
    event: InboundTextEvent,
  ): Promise<InboundProcessingResult> {
    const connection = this.deps.store.getConnection(event.connectionId);
    if (!connection || connection.status !== 'active') {
      throw new AnaContractError('connection_unavailable', 'Messaging connection is unavailable.');
    }
    if (connection.organizationId !== organizationId) {
      throw new AnaContractError('tenant_mismatch', 'Messaging connection belongs to another organization.');
    }

    const existing = this.deps.store.findEventResult(organizationId, event.eventId);
    if (existing) return existing;

    const employee = this.deps.store.getActiveCommercialEmployee(organizationId);
    if (!employee) {
      throw new AnaContractError('employee_unavailable', 'No active commercial employee is assigned.');
    }

    const contact = this.deps.store.upsertContact(organizationId, event.sender);
    const conversation = this.deps.store.upsertConversation(
      organizationId,
      connection.id,
      contact.id,
    );
    this.deps.store.appendInboundMessage(organizationId, conversation.id, event);
    this.deps.store.appendAudit({
      organizationId,
      actorType: 'system',
      actorId: 'wandora-core',
      action: 'inbound-accepted',
      subjectId: conversation.id,
      correlationId: event.eventId,
      occurredAt: event.occurredAt,
    });

    const workItem = this.deps.store.getOrCreateQualificationWorkItem(
      organizationId,
      employee.id,
      conversation.id,
    );

    const proposal = await this.deps.planner.propose({
      organizationId,
      employee,
      customerText: event.text,
      customerAddress: event.sender,
    });

    if (proposal.kind !== 'send-text' || proposal.text.trim().length === 0) {
      throw new AnaContractError('invalid_proposal', 'Employee proposal is not a valid outbound text action.');
    }

    const decision = evaluateProposal(proposal);
    if (decision.decision === 'require-approval') {
      workItem.status = 'waiting-approval';
      const approval = this.deps.store.createApproval(
        organizationId,
        employee.id,
        workItem.id,
        event.eventId,
        proposal,
      );
      this.deps.store.appendAudit({
        organizationId,
        actorType: 'digital-employee',
        actorId: employee.id,
        action: 'approval-requested',
        subjectId: approval.id,
        correlationId: event.eventId,
        occurredAt: this.now(),
      });
      const result: InboundProcessingResult = {
        status: 'approval-required',
        contactId: contact.id,
        conversationId: conversation.id,
        workItemId: workItem.id,
        approvalId: approval.id,
      };
      this.deps.store.saveEventResult(organizationId, event.eventId, result);
      return result;
    }

    const outbound = await this.deps.messaging.sendText({
      connectionId: connection.id,
      recipient: event.sender,
      text: proposal.text,
      idempotencyKey: outboundKey(organizationId, event.eventId),
    });
    const outboundOccurredAt = this.now();
    this.deps.store.appendOutboundMessage(
      organizationId,
      conversation.id,
      event.eventId,
      proposal.text,
      outboundOccurredAt,
    );
    this.deps.store.appendAudit({
      organizationId,
      actorType: 'digital-employee',
      actorId: employee.id,
      action: 'outbound-sent',
      subjectId: conversation.id,
      correlationId: event.eventId,
      occurredAt: outboundOccurredAt,
    });
    workItem.status = 'waiting-customer';

    const result: InboundProcessingResult = {
      status: 'replied',
      contactId: contact.id,
      conversationId: conversation.id,
      workItemId: workItem.id,
      outboundRequestId: outbound.requestId,
    };
    this.deps.store.saveEventResult(organizationId, event.eventId, result);
    return result;
  }
}
