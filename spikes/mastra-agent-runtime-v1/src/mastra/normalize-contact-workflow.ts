import { createStep, createWorkflow } from '@mastra/core/workflows';
import {
  normalizeContactInputSchema,
  normalizeContactOutputSchema,
  normalizeContactTool,
} from './normalize-contact-tool.js';

const normalizeContactStep = createStep(normalizeContactTool);

export const normalizeContactWorkflow = createWorkflow({
  id: 'normalize-contact-v1',
  inputSchema: normalizeContactInputSchema,
  outputSchema: normalizeContactOutputSchema,
})
  .then(normalizeContactStep)
  .commit();
