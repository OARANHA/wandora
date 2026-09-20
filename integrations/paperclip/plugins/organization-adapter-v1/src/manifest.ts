import type { PaperclipPluginManifestV1 } from '@paperclipai/plugin-sdk';
import { CATALOG_KEY, EXECUTION_ADAPTER_TYPE } from './catalog.js';

const manifest: PaperclipPluginManifestV1 = {
  id: 'wandora.organization-adapter-v1',
  apiVersion: 1,
  version: '0.2.0',
  displayName: 'Wandora Organization Adapter V1',
  description: 'Headless company-scoped managed catalog employee adapter for Wandora.',
  author: 'Wandora',
  categories: ['automation', 'connector'],
  capabilities: ['agents.managed', 'agents.resume', 'webhooks.receive', 'secrets.read-ref'],
  entrypoints: { worker: './dist/worker.js' },
  instanceConfigSchema: {
    type: 'object',
    required: ['hmacSecret'],
    properties: {
      hmacSecret: {
        format: 'secret-ref',
        title: 'Wandora inbound HMAC secret',
        description: 'Company-scoped Paperclip secret reference. Raw HMAC material is never stored in plugin config.',
      },
    },
    additionalProperties: false,
  },
  webhooks: [
    {
      endpointKey: 'employee-reconcile',
      displayName: 'Employee Reconcile',
      description: 'Accepts signed Wandora catalog employee reconcile requests.',
    },
    {
      endpointKey: 'employee-activate',
      displayName: 'Employee Activate',
      description: 'Convergently resumes the existing managed catalog employee without invoking work.',
    },
  ],
  agents: [{
    agentKey: CATALOG_KEY,
    displayName: 'Ana',
    role: 'commercial-assistant',
    title: 'Assistente Comercial Digital',
    capabilities: 'Atendimento comercial supervisionado pela Wandora.',
    adapterType: EXECUTION_ADAPTER_TYPE,
    status: 'paused',
    budgetMonthlyCents: 0,
  }],
};

export default manifest;
