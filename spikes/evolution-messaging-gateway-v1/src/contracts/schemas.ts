import { z } from 'zod';

export const outboundTextMessageSchema = z.object({
  connectionId: z.string().min(1),
  recipient: z.string().regex(/^\+?[1-9]\d{7,14}$/),
  text: z.string().min(1),
  idempotencyKey: z.string().min(8),
});

export const inboundTextEventSchema = z.object({
  eventId: z.string().regex(/^evt_[a-f0-9]{32}$/),
  connectionId: z.string().min(1),
  sender: z.string().regex(/^\+?[1-9]\d{7,14}$/),
  text: z.string().min(1),
  occurredAt: z.string().datetime(),
});
