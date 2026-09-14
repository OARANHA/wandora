export type OrganizationId = string;
export type ConnectionId = string;
export type EmployeeId = string;

export type InboundTextEvent = {
  eventId: string;
  connectionId: ConnectionId;
  sender: string;
  text: string;
  occurredAt: string;
};

export type MessagingConnection = {
  id: ConnectionId;
  organizationId: OrganizationId;
  status: 'active' | 'disabled';
};

export type DigitalEmployee = {
  id: EmployeeId;
  organizationId: OrganizationId;
  name: string;
  role: 'commercial-assistant';
  status: 'active' | 'paused';
};

export type CommitmentKind =
  | 'none'
  | 'discount'
  | 'special-price'
  | 'delivery-deadline'
  | 'payment-terms'
  | 'contractual';

export type EmployeeProposal = {
  kind: 'send-text';
  text: string;
  commitment: CommitmentKind;
  rationale: string;
};

export type PlannerInput = {
  organizationId: OrganizationId;
  employee: DigitalEmployee;
  customerText: string;
  customerAddress: string;
};

export interface EmployeePlanner {
  propose(input: PlannerInput): Promise<EmployeeProposal>;
}

export type OutboundTextMessage = {
  connectionId: ConnectionId;
  recipient: string;
  text: string;
  idempotencyKey: string;
};

export interface MessagingGateway {
  sendText(message: OutboundTextMessage): Promise<{ accepted: true; requestId: string }>;
}

export type InboundProcessingResult =
  | {
      status: 'replied';
      contactId: string;
      conversationId: string;
      workItemId: string;
      outboundRequestId: string;
    }
  | {
      status: 'approval-required';
      contactId: string;
      conversationId: string;
      workItemId: string;
      approvalId: string;
    };
