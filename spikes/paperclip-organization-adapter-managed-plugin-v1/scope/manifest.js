const manifest = {
  id: "wandora.control-plane-scope-proof",
  apiVersion: 1,
  version: "0.1.0",
  displayName: "Wandora Control Plane Scope Proof",
  description: "Disposable proof that proactive managed-agent calls are limited to configured companies.",
  author: "Wandora",
  categories: ["automation", "connector"],
  capabilities: ["agents.managed", "webhooks.receive"],
  entrypoints: { worker: "./dist/worker.js" },
  instanceConfigSchema: {
    type: "object",
    required: ["enabled"],
    properties: { enabled: { type: "boolean" } },
    additionalProperties: false
  },
  webhooks: [{
    endpointKey: "scope-probe",
    displayName: "Scope Probe",
    description: "Attempts managed reconciliation for a requested target company."
  }],
  agents: [{
    agentKey: "scope-probe-agent",
    displayName: "Scope Probe Agent",
    role: "proof",
    title: "Disposable Scope Proof",
    capabilities: "No production capability.",
    adapterType: "wandora_mastra_spike",
    adapterConfig: { url: "http://127.0.0.1:3140/execute" },
    status: "paused",
    budgetMonthlyCents: 0
  }]
};

export default manifest;
