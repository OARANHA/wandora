# ADR 0390 — Semantic Fast Read Canonical Messaging Connection Assignment Semantics & Cardinality Qualification V1

Date: 2026-10-02

Status: **BLOCKED / CARDINALITY NOT PROVEN / FAIL-CLOSED / DOCUMENTATION ONLY / NO SCHEMA OR RUNTIME IMPLEMENTATION / NO PRODUCTION EFFECT**

## Context

ADR 0389 proved a narrower fact: the pre-Conversation business-context → canonical `messaging_connection_id` decision is Wandora-owned semantic/product authorization rather than provider runtime state.

That proof deliberately did not decide where an assignment should live or what its cardinality should be. This ADR performs that second qualification step. It asks whether the repository already contains a reusable assignment authority, or whether the evidence proves a minimum new Wandora-owned assignment model.

This ADR does **not** reopen ADR 0388. WhatsApp/Baileys provider purity, provider-fact freshness, positive-only evidence semantics and external-effect guarantees remain independent blockers.

## Fresh repository state

Fresh reconciliation before the decision proved:

- `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #389 is open / draft / mergeable / unmerged;
- PR #389 head is `a3415b07ae20c15ebd0d26ddffd55ce0e9bb1370`;
- PR #389 is stacked on PR #388 head `3814c5966eb5563bfd21b0294dc63685bc432a25`, not directly on `main`;
- one exact-head workflow read for `a3415b07...` observed 10/10 workflows completed successfully, with no rerun or polling.

The earlier Semantic Fast Read chain remains stacked and unmerged. No branch in this slice is treated as canonical merely because an older handoff named it.

## Capability Authority / Reuse Gate

The qualification followed ADR 0036 and ADR 0168 before proposing any schema, resolver, service or migration.

Permanent rule:

> Portabilidade = desacoplamento do contrato, não duplicação da implementação. Provider replacement não implica internalização.

The evidence was separated into:

- semantic authority;
- durable product state;
- operational authority;
- provider implementation;
- replacement boundary.

A missing obvious column was not treated as proof of a missing capability.

## Existing Wandora assignment/binding map

### Organization → Messaging Connection

Migration `20260914_001_core_multitenant_auth_v1.sql` defines `wandora.messaging_connections` with:

- canonical UUID identity;
- exactly one owning `organization_id`;
- a provider-neutral `channel`;
- a status;
- no `UNIQUE (organization_id, channel)` constraint.

Therefore the existing structural cardinality is:

`organization 1 → N messaging_connections`

and more than one Connection for the same channel is structurally allowed.

There is no canonical organization-level `default_connection_id`, `primary_connection_id`, preferred sender, channel-purpose assignment or priority ordering.

### Messaging Connection → provider implementation

`wandora_private.messaging_provider_bindings` uses `connection_id` as its primary key and keeps provider identity private.

This is the correct replacement boundary **after** a canonical Wandora Connection has already been selected.

It proves implementation mapping, not business authorization.

A provider binding must therefore never be treated as an assignment by itself.

### Conversation → Messaging Connection

Migration `20260914_002_ana_vertical_slice_v1.sql` makes `conversation.messaging_connection_id` mandatory and tenant-scoped through the composite organization/connection foreign key.

This is a real existing authority once the Conversation exists:

`conversation N → 1 canonical messaging_connection`

The Conversation uniqueness key includes:

`(organization_id, messaging_connection_id, contact_id)`

so the schema permits the same contact to participate in separate Conversations through different Connections.

Therefore existing Conversation state does not imply a global Contact → one Connection affinity.

### Contact → Connection

`wandora.contacts` is keyed by organization + channel + channel address, not by Connection.

There is no Contact → Connection assignment.

Because Conversation identity includes both Contact and Connection, current canonical state is compatible with:

`contact 1 → N conversations → N connections`

subject to actual business activity.

This is evidence against inventing a Contact/customer 1:1 Connection affinity.

### Digital Employee → Connection

`wandora.digital_employees` carries no messaging Connection assignment.

`wandora.work_items` binds an employee to a Conversation. The Connection is therefore inherited from the specific Conversation, not selected from the employee.

The current schema permits the same employee to work across different Conversations that are bound to different Connections.

Current beta routing of one active commercial employee is explicitly documented as proven beta state, not final assignment architecture.

No employee-level messaging cardinality is established.

### Work Item → Connection

A work item has exactly one Conversation, so it derives exactly one Connection **only because the Conversation already has one**.

That derivation is not a pre-Conversation assignment authority.

### Order / Customer / Party Fast Read → Connection

The current Human Fast Read admission receives:

- `organizationId`;
- `actorUserId`;
- `employeeId`;
- `request`.

The signed `wfri1` carries organization, employee, capability, selector, presentation and correlation evidence, but no `messaging_connection_id`.

The qualified order/customer-contact composition resolves:

`exact order code → customer tax identity → exact party/contact candidates`

and deliberately makes no destination selection.

No local canonical Order entity, Party assignment or Customer → Messaging Connection fact exists.

### Company profile / tenant state

`wandora.organization_profiles` contains canonical customer company/legal/contact facts and explicitly does not create messaging/provider state.

It contains no messaging assignment.

### Organization Adapter private mappings

`wandora_private.control_plane_provider_bindings` maps Wandora organization → Paperclip company.

`wandora_private.digital_employee_provider_bindings` maps Wandora employee → Paperclip agent.

Those are private control-plane/provider identity mappings. Neither carries a Wandora Messaging Connection.

### Platform Admin

The current Platform Admin source contains no messaging assignment contract, selector, preference or management route.

Platform Admin therefore does not provide a hidden assignment authority to reuse.

## Human Send requalification

Human Send does not choose a Connection.

Its query traverses:

`work_proposal → work_item → conversation → messaging_connections → contact`

and reads the already-bound `conversation.messaging_connection_id`.

The send is available only when the existing context is simultaneously:

- active employee;
- supervised employee;
- open conversation;
- active Connection;
- WhatsApp Connection;
- exact Connection equality with the configured Human Send outbound Connection;
- valid canonical recipient.

`WANDORA_HUMAN_SEND_PROPOSAL_CONNECTION_ID` is therefore a deployment-time admission/cross-check for the narrow one-Connection V1 path.

It is not a reusable product selector for order/customer/party/employee contexts.

## Messaging Gateway requalification

Messaging Gateway V1 requires process configuration for:

- one `WANDORA_ORGANIZATION_ID`;
- one `WANDORA_CONNECTION_ID`;
- one `WANDORA_EVOLUTION_INSTANCE`.

Inbound normalization receives that already-configured `connectionId` and injects it into the provider-neutral event before Core persists/reuses a Conversation.

Therefore the current inbound sequence is:

`deployment already knows Connection → provider event → Conversation becomes bound`

not:

`business context → generic Connection selector`.

`WANDORA_CONNECTION_ID` is operational deployment routing and must not be transformed into product policy.

Outbound similarly rejects a command whose canonical `connectionId` differs from the single configured Gateway Connection. That is an operational invariant after selection, not the selection itself.

## Paperclip reuse/collision analysis

Pinned Paperclip v2026.916.1 source exposes a mature operational Tool Connection model:

- Tool Connection install target: `company | agent`;
- grant kind: `organization | user | agent`;
- grant status/lifecycle;
- organization grant `isDefault` support;
- agent/company installs;
- Tool Gateway policy/access;
- per-agent effective profile;
- connection purpose including `tool | channel | ai`.

For non-AI service/tool connection resolution, Paperclip can prefer a dedicated active agent identity, then a responsible-user identity, then an organization identity, and it fails closed when a higher-priority tier is ambiguous.

This is valuable **operational authority** for Paperclip-governed Connections.

It does not establish Wandora Messaging Connection semantics because:

1. Wandora canonical authority assigns WhatsApp transport/credential to Messaging Gateway/provider adapter, not Paperclip;
2. there is no accepted mapping from Paperclip Tool Connection IDs to `wandora.messaging_connections.id` for messaging;
3. Paperclip Connection grants answer “may this agent/run use this operational connection/tool identity?”, not “which canonical Wandora messaging account represents this order/customer/conversation?”;
4. Paperclip `isDefault` is provider/control-plane state in a different domain and cannot become a Wandora messaging default by analogy;
5. mirroring those grants/installs into Core would violate ADR 0168.

Paperclip Connections/grants/installs are therefore **reused operationally where already qualified**, but they are not the missing semantic assignment authority.

## Mastra analysis

Mastra remains runtime/tool/workflow execution authority behind the Agent Runtime Adapter.

The Mastra capability map explicitly rejects adopting Mastra or `@mastra/connect` as a competing organizational connection/grant authority.

Fast Read executing through Mastra does not make Messaging Connection assignment a runtime concern.

No Messaging assignment is created in Mastra.

## Candidate model comparison

### Model 1 — Organization + Channel assignment

Evidence supports organization ownership and a channel attribute, but not uniqueness.

Two WhatsApp Connections in one organization are structurally valid today.

No canonical purpose dimension, priority, default or tie-break exists.

Selecting organization + channel alone would therefore invent a default.

**Not proven.**

### Model 2 — Digital Employee assignment

The same employee can work on Conversations carrying different Connections.

No employee → messaging Connection state exists.

Paperclip agent grants are operational and belong to Paperclip Tool Connections, not Wandora Messaging Connections.

Assigning a Connection to Ana merely because Ana executes Fast Read would conflate executor identity with sender/account semantics.

**Not proven.**

### Model 3 — Customer / Party / Contact affinity

Contacts are channel-address identities, not Connection assignments.

The Conversation key permits the same Contact across multiple Connections.

External VendaERP party data has no durable Wandora Messaging affinity.

No owner-approved customer preference or affinity contract exists.

**Not proven.**

### Model 4 — Order / business-context assignment

The current order is an external business-system object reached through deterministic Fast Read, not a canonical Wandora durable entity carrying messaging policy.

No evidence says an order should choose sender/account/channel.

Creating order → Connection state would add product state solely to make provider lookup convenient.

**Not proven.**

### Model 5 — Conversation bootstrap authority

The current inbound design proves one useful invariant: a Conversation is created only after a Connection is already known.

An explicit Connection supplied by an authorized actor/policy at bootstrap could avoid a durable organization/employee/customer/order default.

However, the current Human Fast Read contract has no `conversationId` or `messaging_connection_id` input, and no reviewed actor/policy contract exists that would be authorized to make this explicit selection.

Conversation bootstrap is therefore a plausible future design direction, not a presently proven authority.

**Not proven for the current path.**

### Model 6 — another existing mechanism

No accepted existing mechanism was found.

Runtime configuration, Human Send admission, provider binding, Paperclip grants, employee provider bindings and Gateway instance configuration are all wrong-layer substitutes.

### Model 7 — cardinality not proven

This is the only model fully supported by current evidence.

## Cardinality qualification result

The repository proves these cardinalities:

- Organization → Messaging Connections: **1:N**.
- Canonical Messaging Connection → current private provider binding: **1:0..1** in current mapping representation.
- Conversation → Messaging Connection: **N:1**, mandatory per Conversation.
- Contact → Conversations/Connections: **1:N structurally possible**.
- Employee → Work Items/Conversations/Connections: **1:N structurally possible**, with no Connection assignment.
- Paperclip company/agent → operational Tool Connections: **N**, narrowed by grants/installs/policy and exact operational resolution.
- Order/customer/party Fast Read context → Messaging Connection: **no canonical assignment exists**.

What is **not** proven is the new semantic cardinality required before a pre-Conversation order/customer Fast Read may choose exactly one Messaging Connection.

## Cross-tenant and cross-connection safety

Any future contract must preserve all of the following:

- organization A can never resolve a Connection owned by B;
- provider binding alone never authorizes semantic use;
- inactive Connections fail closed;
- channel mismatch fails closed;
- multiple matching assignments fail closed;
- “first row”, “only active Connection”, Gateway config and provider discovery are forbidden fallbacks;
- employee operational access to multiple Connections must never create implicit semantic selection;
- a customer/party in one organization cannot inherit affinity from another;
- the provider replacement boundary remains the canonical `messaging_connection_id`.

## Deterministic decision

**C — BLOCKED / CARDINALITY NOT PROVEN.**

Wandora owns the missing semantic decision, but current canonical evidence does not prove whether the assignment belongs to:

- organization + channel/purpose;
- employee;
- customer/party/contact;
- order/business context;
- explicit Conversation bootstrap;
- another future Wandora-owned policy.

Therefore this slice must remain fail-closed.

Do not create:

- `default_connection_id`;
- `primary_connection_id`;
- employee → Connection binding;
- customer/contact affinity;
- order → Connection mapping;
- artificial Conversation;
- generic resolver/registry;
- assignment service;
- migration.

## What must be proven before a future B decision

A future slice can move from C to B only after canonical product evidence answers at least:

1. With two active WhatsApp Connections in one organization, what business distinction chooses between them?
2. Is the distinction channel purpose, department/responsibility, employee, customer affinity, interaction/conversation, or explicit human choice?
3. Who is authorized to create/change that selection?
4. Is selection durable product state or explicit per-Conversation/per-interaction input?
5. How is ambiguity represented and resolved without a hidden default?
6. What happens when the selected Connection is disabled/replaced?
7. Does the rule remain correct with multiple employees sharing one line and one employee using multiple lines?
8. Does the rule survive replacing Evolution with another messaging provider?
9. Can explicit Conversation bootstrap satisfy the need without adding durable assignment state?
10. What exact customer/owner product workflow makes the assignment authoritative?

Until those questions have a canonical answer, “simpler to implement” is not evidence.

## Second adversarial review

After the deterministic C decision and before documentation execution, JEV `jev-1.13.0` was asked to attack the decision against the exact repository evidence and the main alternatives.

Result:

- `block = 0.95`;
- `deep_review = 0.03`;
- `proceed_fast = 0.02`;
- `split_task = 0.00`;
- confidence `0.94`.

The review found no accepted assignment authority that invalidates the deterministic C decision.

JEV remains advisory; the decision is grounded in the canonical repository evidence above.

## Execution

Execution for this slice is documentation only.

No code path, schema, migration, resolver, durable state, runtime configuration, provider call or production state is changed.

## Independent blockers preserved

ADR 0388 remains independently blocked.

Resolving Connection assignment in a future slice would still not authorize:

- `onWhatsApp`;
- Evolution/WhatsApp provider lookup;
- provider-effect claims;
- Human Send;
- Messaging Gateway outbound;
- customer send/rollout.

## No-effect record

This slice performs no:

- Evolution/WhatsApp call;
- VendaERP/customer call;
- Human Send;
- Messaging Gateway outbound;
- production/VPS mutation;
- migration;
- Connection creation;
- Evolution instance creation;
- provider discovery;
- secret access/mutation;
- rollout;
- merge.

## Next boundary

The next safe architectural question is not “implement the assignment table”.

It is a separate product-semantics qualification that must provide evidence for the missing **messaging account/line responsibility or explicit bootstrap-selection policy** under a two-Connection scenario.

Only after that evidence exists should a new slice decide whether a minimal durable Wandora assignment is necessary or whether explicit Conversation bootstrap input is sufficient.
