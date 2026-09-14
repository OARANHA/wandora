import type { InboundTextEvent } from '../contracts/messaging-gateway.js';

export interface EventReceiptStore {
  claim(eventId: string): Promise<boolean>;
}

export class InMemoryEventReceiptStore implements EventReceiptStore {
  private readonly seen = new Set<string>();

  async claim(eventId: string): Promise<boolean> {
    if (this.seen.has(eventId)) return false;
    this.seen.add(eventId);
    return true;
  }
}

export async function acceptInboundOnce(
  event: InboundTextEvent,
  receipts: EventReceiptStore,
): Promise<InboundTextEvent | null> {
  return (await receipts.claim(event.eventId)) ? event : null;
}
