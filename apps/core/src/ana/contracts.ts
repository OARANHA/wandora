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
export type EmployeeContext = {
  id: EmployeeId;
  organizationId: OrganizationId;
  name: string;
  role: 'commercial-assistant';
  autonomyMode: 'supervised';
};

export type PlannerInput = {
  organizationId: OrganizationId;
  employee: EmployeeContext;
  customerText: string;
  customerAddress: string;
};

export interface AgentRuntime {
  proposeCommercialReply(input: PlannerInput): Promise<EmployeeProposal>;
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
      status: 'supervision-required';
      contactId: string;
      conversationId: string;
      workItemId: string;
    }
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
    }
  | {
      status: 'delivery-uncertain';
      contactId: string;
      conversationId: string;
      workItemId: string;
      idempotencyKey: string;
    }
  | {
      status: 'approval-rejected';
      contactId: string;
      conversationId: string;
      workItemId: string;
      approvalId: string;
    };

export type InboundContext = {
  duplicateResult?: InboundProcessingResult;
  connectionId: ConnectionId;
  employee: EmployeeContext;
  contactId: string;
  conversationId: string;
  workItemId: string;
};

export type OutboundPreparation =
  | { status: 'ready' }
  | { status: 'succeeded'; gatewayRequestId: string }
  | { status: 'uncertain' };
