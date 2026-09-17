# Wandora Organization Adapter — Paperclip Plugin V1

Canonical production-installable package source for the Paperclip side of Wandora's Organization Adapter V1.

Merging this package does **not** install or configure it in production. Live Paperclip installation, per-company `secret_ref` configuration, HMAC custody, migrations 010/011 and Core Organization Adapter activation remain separate reviewed operational gates.

## Contract

- plugin id: `wandora.organization-adapter-v1`
- webhook: `employee-reconcile`
- company-scoped HMAC through Paperclip `secret_ref`
- managed catalog operation: `agents.managed.reconcile()`
- initial catalog key: `ana-commercial-v1`
- managed employee starts `paused`, budget `0`
- execution adapter identifier: `wandora_mastra`
- no execution endpoint, credential, company identifier or provider secret is embedded
- arbitrary/custom employees and direct `agent-hires` fallback are out of scope

Compatibility is pinned in `compatibility.json`.

`@paperclipai/plugin-sdk@1.0.0` is not currently available from the npm registry. The verification/build gate therefore compiles against the SDK from the exact pinned Paperclip source commit and bundles that SDK into the worker artifact. The final installable tarball has no runtime npm dependency on the unpublished SDK package.
