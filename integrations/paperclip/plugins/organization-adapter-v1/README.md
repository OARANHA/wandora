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


## Customer work admission V1

Version 0.3.0 adds a signed company-scoped `employee-work` webhook for Wandora-originated supervised work.

The plugin reuses Paperclip as the durable work authority:

- exact managed employee must be `idle` or carry the historical Paperclip `error` projection; `running` and other states remain blocked by the conservative Wandora pre-admission gate;
- work is materialized as one Paperclip issue with a stable Wandora `originId`;
- the issue is dispatched through `issues.wakeup`, never `agents.invoke`;
- plugin-scoped state stores only a fail-closed dispatch receipt;
- an ambiguous `dispatching` receipt is never retried automatically;
- no customer/browser provider IDs or credentials are accepted.

The work webhook does not enable Human Send, Gateway outbound or any external customer effect.


## Historical error work-admission compatibility — 0.3.1

Version 0.3.1 fixes a false-negative customer-work gate discovered after the first real work. Paperclip v2026.916.0 considers agent `error` invokable, but 0.3.0 required literal `idle` before `issues.requestWakeup`.

0.3.1 accepts only `idle | error` at the Wandora pre-admission layer, keeps `running` and all other states rejected, and still delegates final invokability to Paperclip `issues.requestWakeup` / `heartbeat.wakeup`. It adds no capability, webhook, outbound authority or lifecycle mutation.


## Issue-less Fast Read Dispatch V1 — 0.4.0

Version 0.4.0 adds the code-only `employee-fast-read` admission boundary. The webhook accepts only a Wandora correlation id, signed fast-read intent token and customer request, reusing the existing company-scoped HMAC custody. Concrete provider tool names, credentials and grants are not part of this contract.

The plugin resolves the existing managed employee and uses Paperclip-native `agents.invoke` to create an issue-less operational run. Paperclip `plugin.state` stores only a company-scoped dispatch receipt keyed by the Wandora correlation id so an exact duplicate returns the original run instead of invoking twice; an ambiguous `dispatching` receipt fails closed.

The intent itself remains Wandora-owned and stateless. Core independently verifies that intent after Paperclip run identity resolution and before opening the Tool Gateway. Paperclip remains authority for run lifecycle, Connections/grants/secrets/policies, Tool Gateway authorization and tool-call audit.

This source change does **not** install or promote 0.4.0 in production.
