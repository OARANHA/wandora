import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const normalizeContactInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
});

export const normalizeContactOutputSchema = z.object({
  normalizedName: z.string().min(1),
  normalizedEmail: z.string().email().optional(),
});

export const normalizeContactTool = createTool({
  id: 'normalize-contact',
  description: 'Normalize a contact deterministically.',
  inputSchema: normalizeContactInputSchema,
  outputSchema: normalizeContactOutputSchema,
  execute: async ({ name, email }) => ({
    normalizedName: name.trim().replace(/\s+/g, ' '),
    ...(email ? { normalizedEmail: email.trim().toLowerCase() } : {}),
  }),
});
