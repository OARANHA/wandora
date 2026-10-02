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

## Capability projection + bounded terminal Fast Read — 0.5.0

Version 0.5.0 adds the signed `employee-capabilities` projection and completes the bounded synchronous `employee-fast-read` response path qualified by ADRs 0281–0286.

`employee-capabilities` projects only Wandora `BusinessCapability` semantics from current Paperclip-owned operational evidence. It does not persist a Wandora integration registry or mirror Connection/catalog/grant/health state.

`employee-fast-read` still invokes at most once for a new Wandora correlation id. It then observes only the exact Paperclip-owned run through the qualified bounded run-result read boundary. The returned webhook payload is limited to run correlation plus deterministic model/summary/usage evidence; Core's Paperclip adapter validates that correlation and removes provider run identity before returning the Wandora-owned `{ model, summary, usage }` result.

Paperclip remains operational authority for run lifecycle, connection/grant/secret/catalog state, Tool Gateway authorization/audit and terminal run state. Timeout, malformed result, non-success terminal state or uncertain provider transport fails closed.

The Core runtime adapter reuses the existing company-scoped HMAC secret custody and derives the two sibling webhook routes from the canonical Organization Adapter route; 0.5.0 adds no second credential/configuration subsystem.

This source/candidate qualification does **not** install or promote 0.5.0 or Paperclip v2026.916.1 in production.


## Board-scoped operational read projection — 0.6.0

Version 0.6.0 adds one operator-only read projection through Paperclip's existing authenticated plugin data bridge. It does not add a Wandora operational registry or a second Paperclip API.

The data key `operational-read` accepts only the Paperclip host-authorized company scope, resolves the fixed managed catalog employee, and reuses `ctx.toolAccess.readOperationalSnapshot`. The response is bounded to current runtime health plus mapped Connection/tool operational flags required for qualification: Connection status/enabled/health, organization grant presence, agent install presence, and read-tool status/risk/read-write/destructive/effective-profile evidence.

Paperclip object IDs, raw grants/profiles/catalog records, provider metadata, credential material and secret references are not returned. The handler does not persist a snapshot and uses Paperclip's cached catalog operational read; it does not call the connected business system.

Paperclip's host remains the authority that authenticates Board access and injects the authorized company scope. The worker rejects missing scope and all additional caller parameters, and the package CI verifies the pinned Paperclip host/worker anti-spoofing contract.

The production 0.5.0 package remains an immutable released artifact and is not overwritten by this source. Version 0.6.0 is the new package identity for the additive `operational-read` surface. Production promotion remains a separate reviewed effect. This source qualification does **not** open Semantic Fast Read attestation, call VendaERP, or enable any outbound/customer effect.

### Immutable 0.6.0 promotion block

The exact 0.6.0 package qualified by ADR 0335 remains immutable and promotion-blocked. Its bytes and candidate identity must not be replaced or reused for corrected code.

## Operational-read bridge compatibility — 0.6.1

Version 0.6.1 fixes only the `operational-read` data-handler compatibility with the pinned Paperclip `getData` envelope discovered by ADR 0335.

The pinned Paperclip host remains the company-scope authority. The URL-keyed data route authorizes the requested company, passes the authorized `companyId` separately from caller `params`, and supplies `renderEnvironment: null` when the caller does not provide render metadata. The worker merges caller params first, then overwrites them with host `companyId` and host `renderEnvironment`.

The handler therefore accepts only:

- one valid host-authorized `companyId`;
- the optional host bridge metadata field `renderEnvironment`, which must be exactly `null`.

Any additional selector/key, or any non-null `renderEnvironment`, still fails closed with `operator_operational_read_invalid_company_scope`. The operational projection, fixed managed Ana lookup, `ctx.toolAccess.readOperationalSnapshot` call and output allowlist are unchanged.

0.6.1 is a new immutable package identity. It does not modify/reuse 0.6.0, does not promote itself, does not call VendaERP, and does not open Semantic Fast Read or outbound/customer effects.

## Dynamic managed employee provider bridge — 0.7.0

Version 0.7.0 is a distinct code-only candidate built against the qualified
Paperclip dynamic-managed Agent provider profile. The production 0.6.1 package
and its static `employee-reconcile` path remain immutable historical behavior.

0.7.0 adds the explicit `agents.managed.dynamic` capability and a sibling
signed webhook, `employee-ensure-dynamic`. It derives the provider resource
key solely from the canonical Wandora `digital_employees.id` UUID and builds
the create-only Agent spec from the catalog template with
`initialStatus = paused` and budget `0`.

The webhook returns only the actual private provider Agent reference and only
after provider readback proves that exact Agent is `paused`. Native
`pending_approval` is not projected into Wandora: the webhook fails closed.
Replaying the same ensure after native approval converges to the same Agent and
succeeds only when it is paused.

Core hire, activation, work, capability projection and Fast Read are unchanged
in this slice. No production plugin or Paperclip promotion occurs.
