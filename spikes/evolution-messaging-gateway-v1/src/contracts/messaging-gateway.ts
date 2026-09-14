export type OutboundTextMessage = {
  connectionId: string;
  recipient: string;
  text: string;
  idempotencyKey: string;
};

export type OutboundTextResult = {
  accepted: true;
  requestId: string;
};

export type InboundTextEvent = {
  eventId: string;
  connectionId: string;
  sender: string;
  text: string;
  occurredAt: string;
};

export interface MessagingGateway {
  sendText(message: OutboundTextMessage): Promise<OutboundTextResult>;
}
