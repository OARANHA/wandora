const manifest = {
  id: "wandora.control-plane-proof-secretref",
  apiVersion: 1,
  version: "0.1.0",
  displayName: "Wandora Control Plane SecretRef Proof",
  description: "Disposable headless proof for company-scoped managed employee reconciliation using Paperclip secret refs.",
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
        title: "Wandora inbound HMAC secret",
        description: "Company-scoped Paperclip secret reference; raw secret values are never persisted in plugin config."
      }
    },
    additionalProperties: false
  },
  webhooks: [{
    endpointKey: "employee-reconcile",
    displayName: "Employee Reconcile",
    description: "Accepts signed Wandora employee reconcile requests."
  }],
  agents: [{
    agentKey: "ana-commercial-secretref",
    displayName: "Ana SecretRef Proof",
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
