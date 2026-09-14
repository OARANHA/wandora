import { createHash } from 'node:crypto';
import type {
  DigitalEmployee,
  EmployeeProposal,
  InboundProcessingResult,
  InboundTextEvent,
  MessagingConnection,
  OrganizationId,
} from './contracts.js';

const stableId = (prefix: string, ...parts: string[]) =>
  `${prefix}_${createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24)}`;

export type Contact = {
  id: string;
  organizationId: OrganizationId;
  channel: 'whatsapp';
  address: string;
};

export type Conversation = {
  id: string;
  organizationId: OrganizationId;
  connectionId: string;
  contactId: string;
};

export type WorkItem = {
  id: string;
  organizationId: OrganizationId;
  employeeId: string;
  conversationId: string;
  kind: 'qualify-new-contact';
  status: 'in-progress' | 'waiting-approval' | 'waiting-customer';
};

export type Approval = {
  id: string;
  organizationId: OrganizationId;
  employeeId: string;
  workItemId: string;
  proposal: EmployeeProposal;
  status: 'pending';
};

export type MessageRecord = {
  id: string;
  organizationId: OrganizationId;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  text: string;
  occurredAt: string;
};

export type AuditRecord = {
  id: string;
  organizationId: OrganizationId;
  actorType: 'system' | 'digital-employee';
  actorId: string;
  action: 'inbound-accepted' | 'approval-requested' | 'outbound-sent';
  subjectId: string;
  correlationId: string;
  occurredAt: string;
};

export class InMemoryAnaStore {
  readonly connections = new Map<string, MessagingConnection>();
  readonly employees = new Map<string, DigitalEmployee>();
  readonly contacts = new Map<string, Contact>();
  readonly conversations = new Map<string, Conversation>();
  readonly workItems = new Map<string, WorkItem>();
  readonly approvals = new Map<string, Approval>();
  readonly messages = new Map<string, MessageRecord>();
  readonly audits: AuditRecord[] = [];
  readonly eventResults = new Map<string, InboundProcessingResult>();

  addConnection(connection: MessagingConnection) {
    this.connections.set(connection.id, connection);
  }

  addEmployee(employee: DigitalEmployee) {
    this.employees.set(employee.id, employee);
  }

  getConnection(id: string) {
    return this.connections.get(id);
  }

  getActiveCommercialEmployee(organizationId: OrganizationId) {
    return [...this.employees.values()].find(
      (employee) =>
        employee.organizationId === organizationId &&
        employee.role === 'commercial-assistant' &&
        employee.status === 'active',
    );
  }

  findEventResult(organizationId: OrganizationId, eventId: string) {
    return this.eventResults.get(`${organizationId}:${eventId}`);
  }

  saveEventResult(organizationId: OrganizationId, eventId: string, result: InboundProcessingResult) {
    this.eventResults.set(`${organizationId}:${eventId}`, result);
  }

  upsertContact(organizationId: OrganizationId, address: string) {
    const id = stableId('contact', organizationId, 'whatsapp', address);
    const existing = this.contacts.get(id);
    if (existing) return existing;

    const contact: Contact = { id, organizationId, channel: 'whatsapp', address };
    this.contacts.set(id, contact);
    return contact;
  }

  upsertConversation(organizationId: OrganizationId, connectionId: string, contactId: string) {
    const id = stableId('conversation', organizationId, connectionId, contactId);
    const existing = this.conversations.get(id);
    if (existing) return existing;

    const conversation: Conversation = { id, organizationId, connectionId, contactId };
    this.conversations.set(id, conversation);
    return conversation;
  }

  getOrCreateQualificationWorkItem(organizationId: OrganizationId, employeeId: string, conversationId: string) {
    const id = stableId('work', organizationId, employeeId, conversationId, 'qualify-new-contact');
    const existing = this.workItems.get(id);
    if (existing) return existing;

    const workItem: WorkItem = {
      id,
      organizationId,
      employeeId,
      conversationId,
      kind: 'qualify-new-contact',
      status: 'in-progress',
    };
    this.workItems.set(id, workItem);
    return workItem;
  }

  appendInboundMessage(organizationId: OrganizationId, conversationId: string, event: InboundTextEvent) {
    const id = stableId('message', organizationId, event.eventId, 'inbound');
    if (this.messages.has(id)) return this.messages.get(id)!;

    const record: MessageRecord = {
      id,
      organizationId,
      conversationId,
      direction: 'inbound',
      text: event.text,
      occurredAt: event.occurredAt,
    };
    this.messages.set(id, record);
    return record;
  }

  appendOutboundMessage(
    organizationId: OrganizationId,
    conversationId: string,
    eventId: string,
    text: string,
    occurredAt: string,
  ) {
    const id = stableId('message', organizationId, eventId, 'outbound');
    if (this.messages.has(id)) return this.messages.get(id)!;

    const record: MessageRecord = {
      id,
      organizationId,
      conversationId,
      direction: 'outbound',
      text,
      occurredAt,
    };
    this.messages.set(id, record);
    return record;
  }

  createApproval(
    organizationId: OrganizationId,
    employeeId: string,
    workItemId: string,
    eventId: string,
    proposal: EmployeeProposal,
  ) {
    const id = stableId('approval', organizationId, employeeId, workItemId, eventId);
    const existing = this.approvals.get(id);
    if (existing) return existing;

    const approval: Approval = {
      id,
      organizationId,
      employeeId,
      workItemId,
      proposal,
      status: 'pending',
    };
    this.approvals.set(id, approval);
    return approval;
  }

  appendAudit(record: Omit<AuditRecord, 'id'>) {
    const id = stableId(
      'audit',
      record.organizationId,
      record.actorType,
      record.actorId,
      record.action,
      record.subjectId,
      record.correlationId,
      record.occurredAt,
    );
    const existing = this.audits.find((item) => item.id === id);
    if (existing) return existing;

    const audit: AuditRecord = { id, ...record };
    this.audits.push(audit);
    return audit;
  }
}
