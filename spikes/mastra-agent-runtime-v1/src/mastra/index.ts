import { Mastra } from '@mastra/core/mastra';
import { normalizeContactWorkflow } from './normalize-contact-workflow.js';

export const mastra = new Mastra({
  workflows: {
    normalizeContact: normalizeContactWorkflow,
  },
});
