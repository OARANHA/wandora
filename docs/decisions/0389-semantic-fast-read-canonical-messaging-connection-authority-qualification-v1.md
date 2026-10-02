# ADR 0389 — Semantic Fast Read Canonical Messaging Connection Authority Qualification V1

Date: 2026-10-02

Status: **QUALIFIED / WANDORA-OWNED GAP PROVEN / CONTRACT-AUTHORITY ONLY / NO SCHEMA OR RUNTIME IMPLEMENTATION / NO PROVIDER CALL / NO PRODUCTION EFFECT**.

## Context

ADR 0386 established provider-neutral destination/channel qualification semantics without selecting a destination or messaging Connection. ADR 0387 and ADR 0388 independently kept live provider qualification fail-closed and identified a separate unresolved prerequisite: an order/customer Fast Read has no canonical authority that can say which Wandora messaging Connection, and therefore which provider instance behind the messaging boundary, is semantically the correct one.

This slice isolates only that Connection-authority axis. It does not reopen the separate ADR 0388 WhatsApp/Baileys purity, remote-effect, positive-only or provenance/freshness blockers.

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## REAL NOW

Fresh GitHub reconciliation proved:

- repository `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- Semantic Fast Read is currently stacked through PRs #381 → #382 → #383 → #384 → #385 → #386 → #387 → #388;
- PR #388 is open, draft, mergeable and unmerged;
- PR #388 base is PR #387 head `625166bfb93b7def1f8b95046f5b500ea4408508`;
- PR #388 current head is `3814c5966eb5563bfd21b0294dc63685bc432a25`;
- one exact-head workflow read showed 10/10 observed workflows completed successfully and no failure/pending state;
- no workflow was rerun and no polling was performed.

Runtime/VPS mutation or provider inspection was not required to determine ownership of this semantic binding. The authority question is resolved from canonical schema, contracts and adapter boundaries; this slice therefore performed no runtime mutation or provider call.

## Existing Wandora messaging state

Migration `20260914_001_core_multitenant_auth_v1.sql` already defines:

- `wandora.messaging_connections` as provider-neutral messaging Connection identity owned by exactly one Wandora organization;
- `wandora_private.messaging_provider_bindings` as the private mapping from canonical `connection_id` to provider implementation reference and credential reference.

The current `messaging_connections` shape contains organization, channel, label and status. It intentionally does **not** make `organization_id + channel` unique.

Migration `20260914_002_ana_vertical_slice_v1.sql` defines:

- `wandora.conversations.messaging_connection_id` as a mandatory tenant-scoped FK to `wandora.messaging_connections`;
- one conversation identity as organization + messaging Connection + contact;
- inbound receipts that also retain the canonical messaging Connection.

An exhaustive check of later canonical migrations through migration 020 found no employee/customer/party/order/channel-default → messaging Connection assignment, priority, selector or default-routing state.

Therefore the repository already owns canonical Connection identity and provider binding, but does not own a general non-conversation business-context → Connection assignment.

## How a Conversation gets its Connection

The current Messaging Gateway V1 process is deliberately narrow. Runtime configuration binds exactly:

- one Wandora organization;
- one canonical Wandora `connectionId`;
- one Evolution instance.

`normalizeEvolutionInbound(...)` injects that configured canonical `connectionId` into the normalized inbound event. Core then:

1. validates that `event.connectionId` is an active `wandora.messaging_connections` row;
2. rejects tenant mismatch;
3. persists that exact value in the inbound receipt;
4. creates/reuses the conversation with that exact `messaging_connection_id`.

This is not a generic Connection-selection algorithm. The transport context was already scoped to one Connection before the inbound event reached Core.

## Human Send analysis

Human Send reuses an already-bound Conversation.

`HumanSendProposalService` derives the effect context by joining:

`work_proposal → work_item → conversation → messaging_connections → contact`.

It reads `conversation.messaging_connection_id`, then independently requires:

- active supervised employee;
- open conversation;
- active Connection;
- WhatsApp channel;
- exact equality between the conversation Connection and the configured Human Send outbound Connection;
- valid canonical recipient.

The Human Send runtime also requires `WANDORA_HUMAN_SEND_PROPOSAL_CONNECTION_ID`.

That runtime value is an operational admission/cross-check for the one-Connection V1 Gateway. It is **not** a semantic rule for selecting a Connection from an order, customer, party or employee.

Therefore Human Send proves reuse only when the business context already contains a canonical Conversation bound to a Connection. It does not solve pre-conversation order/customer Fast Read.

## Paperclip, Mastra and provider Reuse Gate

Paperclip Connections/grants/secrets remain operational authority for the specialist connection domains already delegated to Paperclip, especially business-system/tool execution.

The current Organization Adapter operational projection is explicitly business-system oriented. It projects bounded health/readiness/capability evidence and intentionally does not expose Paperclip Connection IDs as Wandora product semantics. No accepted contract maps a Paperclip Connection to `wandora.messaging_connections.id` for this messaging lookup.

Mastra remains runtime/workflow execution implementation and exposes no canonical messaging-Connection selection authority.

Evolution/Baileys remains the current WhatsApp provider implementation behind Messaging Gateway. Evolution instance identity is provider-private operational state and must not become Core business semantics.

The existing private `messaging_provider_bindings` already represents the provider mapping boundary once a canonical Wandora Connection is known. This slice therefore does not authorize a second provider-instance registry, provider mirror, lifecycle manager, cache or discovery subsystem.

## Capability Authority / Reuse Gate result

### Semantic authority

**Wandora Core** owns the meaning of which canonical provider-neutral messaging Connection is authorized for a Wandora business context.

This is product/authorization semantics: replacing Evolution with another provider must not change the customer-facing meaning of which Wandora Connection is selected.

### Durable product state

A durable Wandora Connection identity already exists.

The **missing semantic fact/policy** is an explicit business-context → canonical `messaging_connection_id` assignment or equivalent authoritative rule for non-conversation contexts.

The existence of that gap is proven. Its exact cardinality is **not** yet proven.

This ADR does not decide whether the eventual explicit assignment should be organization/channel-scoped, employee-scoped, customer/party-scoped, order-scoped, conversation-bootstrap-scoped or another product-approved shape.

### Operational authority

Messaging Gateway remains operational authority for provider-neutral messaging adaptation/transport at the messaging boundary.

Human Send remains the later supervised outbound-effect authorization boundary.

Paperclip remains operational authority for its own workforce/run/Connection/grant/secret/tool domains.

Mastra remains runtime execution authority.

### Provider implementation

Evolution API/Baileys is the current WhatsApp provider implementation.

Provider instance/session discovery, lifecycle, login state, cache, credentials and provider registry remain provider/Gateway operational concerns.

### Replacement boundary

The Wandora semantic contract terminates at canonical `messaging_connection_id`.

Mapping that canonical ID to an Evolution instance today, or to another messaging provider tomorrow, remains behind the Messaging Gateway/private provider-binding boundary.

Provider replacement must not require changing the order/customer Fast Read semantic contract.

## Decision

Classification:

**B. WANDORA-OWNED GAP PROVEN**

This is not class A because no existing authority can resolve an arbitrary order/customer/party Fast Read context to exactly one canonical messaging Connection.

This is not class C because ownership of the missing decision is now proven: selecting the canonical Wandora Connection for a Wandora business context is portable product/authorization semantics, while provider instance resolution remains operational/provider-specific.

### Minimum contract required

The smallest future Wandora contract is a **fail-closed canonical Connection resolution contract**, not a provider resolver.

Its invariants are:

1. input is tenant-scoped and composed only from canonical Wandora/business context already authorized by the calling flow;
2. resolution may use only an **explicit Wandora-owned assignment/policy** whose semantics have been separately qualified;
3. result is either:
   - exactly one active canonical `messaging_connection_id` for the requested channel; or
   - unresolved/ambiguous;
4. unresolved, ambiguous, inactive, cross-tenant or channel-mismatched state fails closed;
5. there is no first-row, only-row, first-created, label, employee-name, provider-instance, Gateway-config or implicit-default fallback;
6. the contract never returns Evolution instance names, API keys, provider credentials or raw provider Connection IDs;
7. provider instance mapping remains behind the existing Messaging Gateway/private provider-binding replacement boundary.

The exact durable representation and exact resolution-context cardinality are deliberately deferred. They require a separate product-semantics slice before any migration, column, table, service or runtime wiring is proposed.

## Rejected shortcuts

This qualification explicitly rejects:

- “there is only one Connection today” as authority;
- “there is only one Evolution instance” as authority;
- `WANDORA_CONNECTION_ID` or `WANDORA_HUMAN_SEND_PROPOSAL_CONNECTION_ID` as a global semantic default;
- assigning the Connection to Ana merely because Ana is the current employee;
- deriving Connection from Paperclip Tool Connections;
- selecting the first/only active `messaging_connections` row;
- creating a provider instance registry in Core;
- calling Evolution to discover an instance;
- creating a conversation merely to manufacture a Connection binding;
- reusing Human Send as a read-only resolver.

## Cross-tenant and cross-connection safety

Any future resolver must scope the semantic assignment and returned Connection to the exact Wandora organization and requested channel.

A provider binding or operational Gateway configuration must never be able to upgrade a foreign or otherwise unassigned Connection into semantic authority.

A valid provider mapping without an explicit Wandora business-context assignment is insufficient.

## Second adversarial review

The mandatory second review was run only after the deterministic B decision and before this documentation execution.

JEV `jev-1.13.0` challenged:

- operational configuration being mistaken for semantic authority;
- current single-Connection deployment becoming a permanent contract;
- provider lifecycle/registry duplication;
- over-extending Human Send beyond an existing Conversation;
- Evolution replacement;
- hidden persisted state;
- convenience-driven Wandora state;
- cross-tenant/cross-company/cross-Connection selection.

Result:

- `proceed_fast = 0.73`;
- `deep_review = 0.26`;
- `block = 0.01`;
- `split_task = 0`;
- route confidence `0.64`.

JEV remains advisory. The deterministic repository evidence is the authority.

## Execution

Documentation only.

No table, migration, column, service, resolver implementation, state machine, cache, registry, provider mirror or runtime wiring is created in this slice.

## Validation / no-effect receipt

- real Evolution/Baileys/WhatsApp lookup: **NO**;
- Human Send invocation: **NO**;
- Messaging Gateway outbound: **NO**;
- provider/customer/VendaERP call: **NO**;
- production/VPS mutation: **NO**;
- secret read/copy/move: **NO**;
- provider discovery/instance selection: **NO**;
- new durable state: **NO**;
- migration/schema change: **NO**;
- rollout/canary/merge: **NO**.

## Next safe boundary

A future slice may qualify the **exact Wandora product semantics and cardinality of the explicit business-context → canonical messaging Connection assignment**.

That future slice must remain contract/schema-design first and must not assume organization default, employee ownership, customer affinity or conversation creation.

Only after such an explicit assignment contract is qualified may implementation of durable representation or runtime Connection resolution be considered.

The separate ADR 0388 provider-evidence purity/freshness blockers remain unchanged and unresolved.
