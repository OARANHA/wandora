const manifest = {
  id: "wandora.organization-adapter-v1",
  apiVersion: 1,
  version: "0.1.0",
  displayName: "Wandora Organization Adapter V1",
  description: "Headless company-scoped managed catalog employee adapter.",
  author: "Wandora",
  categories: ["automation", "connector"],
  capabilities: ["agents.managed", "webhooks.receive", "secrets.read-ref"],
  entrypoints: { worker: "./dist/worker.js" },
  instanceConfigSchema: {
    type: "object",
    required: ["hmacSecret"],
    properties: {
      hmacSecret: {
        format: "secret-ref",
        title: "Wandora inbound HMAC secret"
      }
    },
    additionalProperties: false
  },
  webhooks: [{ endpointKey: "employee-reconcile", displayName: "Employee Reconcile" }],
  agents: [{
    agentKey: "ana-commercial-v1",
    displayName: "Ana",
    role: "commercial-assistant",
    title: "Assistente Comercial Digital",
    capabilities: "Atendimento comercial supervisionado pela Wandora.",
    adapterType: "wandora_mastra_spike",
    adapterConfig: { url: "http://127.0.0.1:3140/execute" },
    status: "paused",
    budgetMonthlyCents: 0
  }]
};

export default manifest;
