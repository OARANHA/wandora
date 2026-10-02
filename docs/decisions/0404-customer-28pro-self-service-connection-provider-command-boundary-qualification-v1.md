# ADR 0404 — Customer 28PRO Self-Service Connection Provider Command Boundary Qualification V1

Status: **BOUNDARY QUALIFIED / PAPERCLIP NATIVE LIFECYCLE REUSE REQUIRED / CREDENTIAL-SET REPLACEMENT BLOCKER OPEN / DOCUMENTATION ONLY / NO PRODUCTION EFFECT**

Date: 2026-10-02

## Context

ADR 0403 qualified the urgent Customer 28PRO Integration + Fiscal Read + Supervised DANFE Delivery vertical and selected **Customer 28PRO Self-Service Connection V1** as the first customer-product slice.

The customer-facing goal remains:

`Empresa → Integrações → 28PRO`

with owner/admin operations for:

- connect/configure;
- test connection;
- update credentials;
- disconnect;
- secret-free status/health/capability projection.

The browser may submit the three customer credentials in an authenticated configuration operation:

- `App`;
- `User`;
- `Authorization-Token`.

Those values must never become Wandora durable state, browser readback, model context, employee state or customer-facing read data.

This ADR qualifies only the **provider command boundary**. It does not implement Web/Core routes, Paperclip host code, secret mutation, provider calls, migrations or production changes.

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply implementation internalization.

## REAL NOW

Fresh reconciliation after ADR 0403 proved:

- ADR 0403 / PR #402 completed 9/9 relevant PR workflows GREEN;
- PR #402 was merged by squash;
- current `main = d730581d950a133cb488e3b15f0d1a7ac810bff1`;
- Dynamic Managed Employee PRs #396 → #401 remain a separate stack and are not a dependency of this slice;
- the live/customer 28PRO provider state already exists from ADR 0216 and remains Paperclip-owned;
- no production mutation, secret change or provider call was used to qualify this boundary.

Relevant current Paperclip source remains pinned for accepted provider behavior at:

- release: `v2026.916.1`;
- commit: `d554c4789ed3930f8a53ac9fdf6503b3187097da`.

## PROVEN EVIDENCE

### 1. Paperclip already owns the complete Connection lifecycle domain

The pinned Paperclip server exposes and internally implements:

- app/connection creation through `connectGalleryApp(...)`;
- explicit reconnect/credential replacement through `reconnectGalleryApp(...)`;
- connection health checks;
- connection removal/archive;
- organization/user/agent grants;
- installs;
- Tool Profiles/policies;
- catalog/runtime state;
- company-scoped secret custody.

The Board-facing HTTP routes are not the desired Wandora integration boundary. They are authorized with Paperclip Board/company/connection-manager authority.

Therefore the existence of these routes proves **Paperclip capability**, not permission to copy their authority into Wandora Core or the customer browser.

### 2. Paperclip native connect already creates and rolls back provider-owned secrets

Pinned `toolAccessService.connectGalleryApp(...)`:

- accepts credential input at setup time;
- creates `local_encrypted` company secrets inside Paperclip;
- stores only credential refs on the Connection/grant;
- tracks secrets created by the attempt;
- removes newly created secrets on failed setup rollback;
- preserves Connection identity for explicit resume/reconnect paths;
- maintains grants and credential bindings inside Paperclip.

This is strong evidence against adding any Wandora secret-create lifecycle.

### 3. Paperclip native reconnect rotates existing refs, but a three-secret logical transaction is not proven

Pinned `reconnectGalleryApp(...)` resolves credential fields and, for each provided existing ref, invokes Paperclip `secrets.rotate(...)`.

For 28PRO there are three required values.

The reviewed implementation performs those rotations sequentially before later Connection update/health work.

This proves native credential replacement capability per secret.

It does **not** prove all-or-nothing replacement of the complete three-secret 28PRO credential set.

A failure after one or two successful rotations could leave a mixed set unless a higher-level guarantee is proven.

Therefore this ADR must not expose the pinned reconnect method directly as the customer “Atualizar credenciais” contract.

### 4. The alternative reconnect path also has an unproven cleanup property

`connectGalleryApp(...)` with `reconnectConnectionId` creates new secrets and has substantial identity/grant/Connection rollback behavior for a failed attempt.

That is safer than assuming a partial successful setup.

However, the reviewed pinned success path does not prove that superseded old connection-owned secrets are always retired as part of a successful multi-secret replacement.

Therefore this alternative also cannot yet be labelled the final customer credential-set replacement primitive.

### 5. The pinned AppDefinition local_stdio credential-path behavior has a known compatibility gap

Pinned `v2026.916.1` `credentialFieldsFor(...)` calls:

`credentialConfigPath(field)`

without method context.

The later upstream Paperclip source now calls:

`credentialConfigPath(field, method)`

and explicitly maps:

`local_stdio + keyPlacement.location=env → env.<KEY>`.

This is corroborating provider evidence that the correct responsibility belongs in Paperclip's connection/AppDefinition implementation.

It does not authorize silently replacing the accepted pin or assuming the backport is already qualified.

### 6. Existing Prorevest state predates the desired self-service declaration

The already activated 28PRO Connection is provider-owned and historically qualified with:

- application key `wandora.vendaerp-readonly-v1`;
- approved local stdio template `wandora.vendaerp-readonly-v1-r1`;
- shared organization credential policy/grant;
- exact existing install/profile state;
- exactly three secret refs projected to:
  - `env.VENDAERP_AUTHORIZATION_TOKEN`;
  - `env.VENDAERP_USER`;
  - `env.VENDAERP_APP`.

It must not be replaced merely because a new customer UX is added.

A second Connection or second credential set would violate the Reuse Gate.

### 7. Wandora already has the safe provider-host RPC precedent

The retained ADR 0281 Paperclip host operational-read extension proves the accepted pattern:

- explicit plugin manifest capability;
- worker → host RPC;
- host-enforced invocation-company scope;
- Paperclip service layer as source of truth;
- no Board credential crossing into Core/plugin;
- fail-closed cross-company checks;
- bounded provider-neutral/sanitized response.

That pattern can be reused for a future **managed Connection command**, without making the Organization Adapter a Board proxy.

### 8. Organization Adapter already has a company-scoped authenticated Core boundary

The existing Organization Adapter uses a Paperclip-custodied company-scoped HMAC secret for Wandora-originated commands.

This provides an existing Core → provider-adapter trust boundary.

No second credential system is required to carry a self-service Connection command.

## GAPS

### 1. There is no narrow plugin host mutation capability for a managed business-system Connection

The Board API is too broad.

The current plugin SDK exposes no generic Connection lifecycle mutation client suitable for this Wandora boundary.

The accepted solution therefore needs a **narrow Paperclip-host-owned command capability**, not a Board token.

### 2. The 28PRO declaration is not yet qualified as a pinned local_stdio AppDefinition/managed declaration

A future code candidate must prove that the exact approved read-only MCP/template and exactly three env credential slots can be represented without accepting arbitrary transport/configuration from the customer.

### 3. Legacy Prorevest adoption is not yet implemented or proven

Before self-service mutation of the existing live Connection, provider-side code must prove that it can safely recognize and adopt that exact Connection without changing its secrets, grants, installs, profile or identity.

### 4. Three-secret credential-set replacement is an explicit blocker

Neither reviewed pinned reconnect path proves the complete desired property set:

- one logical replacement operation;
- no hidden partial-success-as-success;
- exact old/new secret cleanup semantics;
- bounded rollback/reconciliation;
- safe uncertain handling.

This blocker must be resolved before a customer-facing **Atualizar credenciais** command is implemented.

### 5. Secret-bearing command idempotency/uncertainty needs an operational receipt contract

A provider command can fail after the effect happened but before the caller received the result.

Blind retry is not acceptable.

The code slice needs a non-secret operational receipt/fingerprint strategy and explicit uncertain state.

## CAPABILITY AUTHORITY / REUSE GATE

### Wandora owns

- customer-facing name **28PRO**;
- owner/admin product admission;
- customer command semantics;
- tenant binding;
- correlation/idempotency semantics at the Wandora boundary;
- provider-neutral connection status/health/capability projection;
- customer-safe error/status presentation.

### Paperclip owns

- Connection identity and lifecycle;
- secret creation/rotation/removal;
- grants;
- installs;
- Tool Profiles/policies;
- catalog/runtime state;
- connection health;
- provider-side cleanup/audit;
- host capability enforcement.

### Organization Adapter owns only the replaceable provider boundary

Organization Adapter may:

- verify the existing Wandora company HMAC;
- validate one bounded command contract;
- call a capability-gated Paperclip host RPC;
- return a secret-free receipt/projection.

It must not become:

- a secret store;
- a Connection registry;
- a grant registry;
- a Board proxy;
- a generic tool/URL/transport configurator.

### No new Wandora durable integration state is justified

The current Integration Capability Plane remains a projection.

Paperclip-owned state remains source of truth for operational Connection state.

If a future slice claims a new Wandora durable integration identity is required, that need must be proven separately.

## DECISION

### 1. Reuse Paperclip native lifecycle; do not proxy Board APIs

Wandora Web/Core must never receive a Paperclip Board credential merely to configure 28PRO.

The future path is:

`authenticated owner/admin Web → Core → existing company HMAC → Organization Adapter → capability-gated Paperclip host command → native Paperclip services`.

### 2. Add a narrow declaration-bound host command capability, not generic admin authority

The future Paperclip provider delta may expose an explicit plugin host capability for managed Connection commands.

The host must enforce invocation-company scope.

The caller must not be able to choose arbitrary:

- URL;
- transport;
- stdio command;
- template ID;
- secret ID;
- provider Connection ID;
- grant/profile ID;
- provider config key;
- tool catalog entry.

The command must resolve a provider-side predeclared integration identity.

For this V1 the only admitted declaration is the qualified **28PRO read-only business-system Connection**.

### 3. The 28PRO provider declaration is immutable from customer input

The provider-side declaration must bind:

- approved local_stdio VendaERP read-only adapter;
- approved template;
- exactly three credential fields;
- exact env projections:
  - `VENDAERP_AUTHORIZATION_TOKEN`;
  - `VENDAERP_USER`;
  - `VENDAERP_APP`.

The customer supplies only the credential values.

No ERP endpoint, HTTP method or adapter command is customer-configurable.

### 4. Qualify the local_stdio AppDefinition env-path compatibility provider-side

The next code slice may retain/backport the later upstream method-aware credential path behavior against the accepted Paperclip pin.

The implementation must prove, in disposable tests, that local_stdio + env key placement yields the exact three expected `env.*` refs.

If not, stop.

### 5. Legacy Prorevest requires exact adoption before self-service mutation

A provider-owned adoption operation may add only the non-secret declaration/method identity needed for future native lifecycle reuse.

Before doing so it must prove exactly one matching current Connection and exact invariants for:

- company;
- application identity;
- approved local_stdio template;
- connection purpose;
- shared credential policy;
- exact three expected env refs;
- non-duplicated organization grant;
- existing installs/profile compatibility.

Adoption must preserve:

- Connection identity;
- existing secret IDs and refs;
- current grants;
- current installs;
- current profile/policies.

Adoption must not:

- resolve plaintext secret values;
- rotate credentials;
- create replacement secrets;
- call VendaERP.

Zero matches, multiple matches or any incompatible state fails closed.

### 6. New Connection creation may use native Paperclip connect only after disposable proof

The future code slice must prove that the declaration/native lifecycle creates:

- one Connection;
- one expected credential identity/set;
- one shared organization grant;
- no duplicate Connection or secret subsystem;
- the exact approved local_stdio runtime shape.

No customer connection is created in this ADR.

### 7. Employee assignment remains explicit and separate from organization Connection identity

A 28PRO Connection belongs to the organization.

It must not infer:

- first employee;
- only employee;
- employee named Ana;
- catalog singleton.

Legacy Prorevest preserves its already-qualified install/profile.

For a new Connection, any employee install/profile assignment requires an exact authorized canonical employee target and remains Paperclip operational state.

This keeps the self-service integration compatible with future multi-employee work without depending on PRs #396–#401.

### 8. Health/Test reuses Paperclip health, but real testing remains a separate external effect

The host command may expose a secret-free health operation.

A real provider connection test can make an external read.

Therefore implementation qualification uses disposable/synthetic provider behavior only.

A future real customer **Testar conexão** action requires the normal explicit production-effect gate.

### 9. Disconnect must delegate to native Paperclip removal/cleanup

The next code slice must prove, with disposable state, that removal of the qualified 28PRO shape correctly handles:

- Connection state;
- grants;
- installs;
- catalog/runtime state;
- connection-owned credential material.

No separate Wandora revoke lifecycle is authorized.

### 10. Credential update remains blocked until a provider-owned credential-set primitive is proven

This ADR does **not** authorize wiring the current pinned `reconnectGalleryApp` or `reconnectConnectionId` directly to the customer update action.

The next code qualification must first prove a Paperclip-owned logical credential-set replacement primitive for all three required values.

Required semantics:

- one logical customer operation;
- exact complete three-value set;
- no successful response after a partial set replacement;
- old/new secret cleanup or rollback semantics proven;
- interruption/transport ambiguity becomes explicit needs-attention/uncertain state;
- no automatic blind retry;
- no plaintext readback;
- no Wandora-held recovery copy.

The implementation mechanism is deliberately not frozen here.

It may use:

- a newer upstream Paperclip primitive;
- a narrow provider-side backport;
- transactional ref swap + cleanup;
- another Paperclip-owned implementation whose semantics are proven.

If those semantics cannot be proven safely, **Atualizar credenciais remains blocked**.

### 11. Secret-bearing request data is transient only

The allowed secret-bearing path is:

`browser → authenticated Core request → Organization Adapter HMAC request → Paperclip host`.

The three values must never be written to:

- localStorage;
- Wandora DB;
- Wandora logs;
- Organization Adapter logs;
- `plugin.state` payloads;
- model prompts/context;
- employee configuration;
- customer read APIs;
- command receipts.

If an operational idempotency receipt is required, it may retain only:

- correlation/idempotency identity;
- a keyed-HMAC fingerprint;
- non-secret operation/state/result metadata.

An ambiguous in-flight receipt must not be automatically replayed.

### 12. Read/status continues through existing projection

Customer-facing read state should reuse the existing Integration Capability Projection / operational-read boundary.

Examples of safe projected state:

- disconnected;
- connected;
- needs attention;
- health status;
- provider-neutral business capabilities.

It must not return:

- secret refs;
- provider Connection IDs;
- grant/profile/catalog IDs;
- credential values.

## SECOND ADVERSARIAL REVIEW

The first review of the proposed implementation-oriented decision returned:

- `deep_review = 0.80`;
- `proceed_fast = 0.10`;
- `block = 0.07`;
- `split_task = 0.03`.

The deep review exposed two important unsupported assumptions:

1. direct multi-secret `reconnectGalleryApp` does not prove the three-secret set update is atomic;
2. `connectGalleryApp(reconnectConnectionId)` has rollback evidence for a failed new attempt, but the reviewed pinned success path did not prove retirement of superseded old secrets.

The decision was narrowed so neither path is declared customer-ready.

A revised review selected `proceed_fast`, but with low confidence because credential-set implementation remained intentionally unresolved.

The final review evaluated **only this documentation action**, with credential-set replacement explicitly recorded as a blocker rather than an assumed solution. It returned:

- `proceed_fast = 0.86`;
- `deep_review = 0.09`;
- `block = 0.05`;
- `split_task = 0.00`;
- confidence `0.80`.

This ADR records only the narrowed, evidence-backed boundary.

## Next executable slice

**Paperclip Managed Connection Command Host Capability V1 — CODE ONLY / DISPOSABLE TESTS / NO PRODUCTION EFFECT**

That code slice must prove, before any customer-facing Web/Core self-service implementation:

1. exact accepted Paperclip pin/provenance;
2. explicit manifest capability and host-worker method;
3. invocation-company scope enforcement;
4. declaration-only 28PRO admission;
5. no arbitrary URL/transport/template/provider-ID input;
6. local_stdio env credential-path compatibility;
7. exact legacy Prorevest adoption invariants without secret mutation;
8. exact new Connection shape in disposable state;
9. no secret logging/readback/persistence outside Paperclip;
10. bounded idempotency/uncertain behavior;
11. native disconnect cleanup;
12. a safe provider-owned three-secret credential-set replacement primitive.

If item 12 does not close GREEN, customer **Atualizar credenciais** remains unavailable and the slice must not disguise partial provider behavior as success.

## Explicit NO-GO

This ADR does not authorize:

- customer-facing self-service code;
- Paperclip host mutation code;
- live adoption of the Prorevest Connection;
- secret creation;
- secret rotation;
- secret deletion;
- provider test call;
- VendaERP call;
- migration;
- production deploy;
- Paperclip restart;
- dynamic-employee changes;
- outbound;
- merge without normal CI/review.

No production or provider effect occurred in this qualification.
