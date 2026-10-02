import type { PaperclipPluginManifestV1 } from '@paperclipai/plugin-sdk';
import { CATALOG_EMPLOYEE_TEMPLATE, CATALOG_KEY, EXECUTION_ADAPTER_TYPE } from './catalog.js';

const manifest: PaperclipPluginManifestV1 = {
  id: 'wandora.organization-adapter-v1',
  apiVersion: 1,
  version: '0.7.0',
  displayName: 'Wandora Organization Adapter V1',
  description: 'Headless company-scoped managed catalog employee adapter for Wandora.',
  author: 'Wandora',
  categories: ['automation', 'connector'],
  capabilities: ['agents.managed', 'agents.managed.dynamic', 'agents.resume', 'agents.invoke', 'agent.runs.read', 'issues.read', 'issues.create', 'issues.wakeup', 'plugin.state.read', 'plugin.state.write', 'webhooks.receive', 'secrets.read-ref', 'tools.operational.read'],
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
      endpointKey: 'employee-ensure-dynamic',
      displayName: 'Dynamic Employee Ensure',
      description: 'Ensures one paused provider Agent for a canonical Wandora digital-employee instance.',
    },
    {
      endpointKey: 'employee-activate',
      displayName: 'Employee Activate',
      description: 'Convergently resumes the existing managed catalog employee without invoking work.',
    },
    {
      endpointKey: 'employee-work',
      displayName: 'Employee Work',
      description: 'Ensures one Wandora-originated supervised work issue and one fail-closed dispatch receipt.',
    },
    {
      endpointKey: 'employee-capabilities',
      displayName: 'Employee Capabilities',
      description: 'Returns a bounded provider-neutral projection of currently available business capabilities for the managed employee.',
    },
    {
      endpointKey: 'employee-fast-read',
      displayName: 'Employee Fast Read',
      description: 'Dispatches one issue-less Wandora-authorized deterministic read through the managed employee.',
    },
  ],
  agents: [{
    agentKey: CATALOG_KEY,
    displayName: CATALOG_EMPLOYEE_TEMPLATE.displayName,
    role: CATALOG_EMPLOYEE_TEMPLATE.role,
    title: CATALOG_EMPLOYEE_TEMPLATE.title,
    capabilities: CATALOG_EMPLOYEE_TEMPLATE.capabilities,
    adapterType: EXECUTION_ADAPTER_TYPE,
    status: CATALOG_EMPLOYEE_TEMPLATE.initialStatus,
    budgetMonthlyCents: CATALOG_EMPLOYEE_TEMPLATE.budgetMonthlyCents,
  }],
};

export default manifest;