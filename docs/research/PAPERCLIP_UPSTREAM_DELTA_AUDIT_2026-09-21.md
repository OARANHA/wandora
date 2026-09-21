# Paperclip Upstream Delta Audit — v2026.916.0 to master

Date: 2026-09-21
Status: **Research checkpoint — current master is radar, not production authority**

## Compared revisions

```text
Wandora production Paperclip source
  dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
  release v2026.916.0

Upstream master observed during audit
  8813a501058b29ae293fee7e94038a737d7d1594
```

The upstream repository is fast-moving. Every future use of this document must re-check master by SHA.

## Why this delta is reviewed instead of re-auditing old material blindly

The existing Wandora `PAPERCLIP_CAPABILITY_MAP.md` already audited the production/pinned capability family extensively.

This delta focuses on documentation and implementation direction that changed **after** the production source revision.

## Material documentation changes observed

Changed/new upstream material includes:

- agent personas;
- eval families and evidence discipline;
- Runner-created skills;
- chat connector UX;
- GitHub review bots;
- Railway runtime/direct operations;
- remote MCP live acceptance;
- independent MCP connectors;
- Composio broker retirement;
- distribution-supplied plugins;
- plugin specification/authoring;
- execution semantics;
- observability;
- AI Connections;
- adapter documentation;
- public API overview/routines/deployment docs.

## Findings by capability family

### 1. External adapters — direction reinforced, no architectural reversal

Current master documentation continues to recommend external adapter plugins for most custom runtimes because they are independently versioned and do not require Paperclip source modification.

It formalizes adapter result fields for:

- usage;
- provider;
- model;
- cost;
- session state.

**Wandora decision:** keep `wandora_mastra` as the Paperclip-side runtime integration. Do not move Mastra logic into Paperclip core.

Disposition: **REUSE / KEEP**.

### 2. Paperclip plugin model — stronger extension surface, higher lock-in risk if misused

Current master distinguishes:

- **platform modules** for low-level trusted host integration such as adapters/storage/secrets/run logs;
- **plugins** for additive connector/workspace/automation/UI capability.

Distribution plugins can be supplied by a downstream image with content-addressed integrity and normal plugin capability/health lifecycle.

The full plugin spec still documents current implementation caveats and future-scope behavior.

**Wandora decision:**

- use Paperclip plugins when the capability belongs inside the Paperclip operational control plane;
- do not make Wandora customer APIs or core domain types depend on plugin IDs, UI slots or plugin database shape;
- distribution plugins remain **FUTURE** until a pinned Paperclip upgrade qualifies them.

Disposition: **ADAPT / FUTURE depending on exact feature**.

### 3. MCP / Connections — upstream is converging on one governed access plane

Current master work for Zapier, Arcade, Composio and Executor explicitly reuses:

- existing connection identity;
- existing credentials/vault;
- catalog discovery;
- agent grants;
- per-tool permissions;
- sessions;
- policy;
- approval;
- audit.

It explicitly avoids a separate connection model/database and warns against automatically replaying writes with ambiguous outcomes.

Composio's older broker path is being retired in favor of direct MCP.

**Wandora decision:** do not build a second generic organizational connector/grant/MCP policy system. Qualify Paperclip's Tool Gateway/Connections before product adoption. Preserve Wandora's independent external-effect policy.

Disposition:
- live generic foundation: **QUARANTINE → ADAPT after qualification**;
- new provider-specific master journeys: **FUTURE**.

### 4. GitHub review agents — reuse pattern is more important than the feature

Current master routes GitHub PR/issue/review events through ordinary Paperclip tasks, runs, permissions, budgets and activity. Reviews are a projection, not a separate execution scheduler.

The PR rationale explicitly rejects creating a separate review scheduler.

**Wandora decision:** adopt the design lesson now: new work ingress should normally become ordinary provider work, not a parallel scheduler/task engine.

The GitHub review feature itself is not a current Wandora requirement.

Disposition: **FUTURE feature / REUSE design pattern now**.

### 5. Railway runtime — fixed governed operations instead of a parallel service

Current master Railway work reuses OAuth resolution, run/agent/company/grant isolation, policy, argument snapshots and auditing inside the MCP Gateway.

It deliberately avoids:

- a second HTTP service;
- a new plugin;
- a new database schema;
- arbitrary provider CLI/GraphQL exposure.

**Wandora decision:** strong evidence for keeping provider operations behind governed tool capabilities rather than building one-off Wandora provider daemons.

Disposition: **FUTURE capability / architecture lesson now**.

### 6. Runner-created skills — reinforces one skills authority

Current master Runner can create a reusable company skill through the same company skill library/policy/storage. It does not create another runtime-local catalog.

Creation is idempotent and inherits authenticated company/task/agent/run identity.

**Wandora decision:** strengthens the existing authority:
- Paperclip = organizational skills catalog/policy;
- runtime = materialization/execution;
- Wandora = customer semantics/entitlement only if exposed.

Disposition: **DO NOT BUILD a second organizational skills catalog**.

### 7. Evals — separate evaluation evidence from production authority

Current master distinguishes:

- Runner Evals for bounded provider/runtime protocol qualification;
- Product E2E Evals for real browser/server/database/runner/product workflows.

It explicitly says partial campaigns should not be merged into a misleading score and that immutable attempt evidence is the source of truth.

**Wandora decision:** useful methodology, not a reason to make Paperclip the authority for Wandora product acceptance. Reuse the evidence discipline; keep Wandora's acceptance gates product-owned.

Disposition: **FUTURE/layered methodology**.

### 8. Agent personas — visual identity, not Wandora employee identity

Current master adds persisted Paperclip visual appearance/palette identity and explicitly preserves it through export/import.

**Wandora decision:** this is Paperclip UI/presentation state. Wandora customer identity remains stable Wandora employee identity. Do not couple Ana's product identity/avatar contract to Paperclip persona IDs unless a future UI integration has a concrete requirement.

Disposition: **IGNORE for core / FUTURE projection at most**.

### 9. AI Connections — increasingly mature credential/account authority

Current master expands a structured model for:

- personal responsible-user provider accounts;
- shared accounts;
- human audience;
- agent access;
- encrypted grant secret refs;
- reconnect/revocation;
- provider identity;
- runtime-isolated credential homes;
- active-run attribution.

It also explicitly separates AI runtime-auth connections from tool/MCP connections.

The live v916 API already exposes `ai-connections` routes, but the newer behavior is still upstream delta and must not be back-projected into live semantics without source qualification.

**Wandora decision:**

- platform-paid Wandora model key remains Wandora-owned;
- tenant/BYOK and responsible-user credentials are strong candidates for Paperclip authority where the work is Paperclip-governed;
- never make Paperclip AI Connection IDs the Wandora customer credential identity;
- future adoption requires a dedicated live-version contract audit.

Disposition: **ADAPT candidate; current broader master behavior = FUTURE**.

### 10. Chat connectors — growing quickly, remain product-boundary sensitive

Current master is actively extending Slack/GitHub and other chat connectors with identity linking, task-backed conversations and governed tools.

Paperclip itself remains task-centric even when conversation surfaces are richer.

**Wandora decision:** do not replace Wandora Messaging Gateway/Evolution merely because Paperclip offers chat ingress/egress. For Wandora, WhatsApp/email/ERP external effects remain core product/effect-policy concerns.

Paperclip connectors may later be useful as:

- additional work ingress;
- internal operator channels;
- provider-scoped task communication.

Disposition: **FUTURE / QUARANTINE for customer messaging replacement**.

### 11. Cases and Pipelines — major live capability blind spot, but experimental

The live v916 OpenAPI already exposes substantial Cases/Pipelines APIs.

Pinned source proves:

- `enableCases=false` by default;
- `enablePipelines=false` by default;
- Cases are described as durable work products tasks create and iterate on;
- Pipelines model definitions, stages, transitions, intake variables, case leases, blockers, review, documents, outputs, automations and upstream drift;
- both are managed experimental features.

**Wandora decision:** do not activate/adopt now. Also do not build a generic Wandora case/pipeline/workflow engine without first proving these primitives cannot satisfy a concrete Wandora-owned requirement.

Disposition: **QUARANTINE + DO NOT BUILD generic duplicate**.

### 12. Hot restart — useful upstream direction, not current production contract

Current master documents one-shot live-run adoption across server restart with a persisted report and lost-run detection.

Our current v916 production promotion contract uses the already-proven process-local Task Drain and controlled Paperclip restart.

**Wandora decision:** do not import master hot-restart assumptions into v916. Reassess on a future pinned Paperclip upgrade.

Disposition: **FUTURE**.

## Strong upstream pattern

Across the reviewed delta, Paperclip repeatedly prefers:

```text
existing task/run
+ existing identity
+ existing grant/policy
+ existing approval
+ existing audit
```

over:

```text
new scheduler
+ new permission system
+ new connection database
+ new execution engine
```

This is compatible with Wandora's reuse gate.

## Immediate Wandora implications

### Adopt now

- native Task Drain in the adapter promotion runbook, with correct process-local semantics;
- provider/API contract inventory via OpenAPI;
- explicit portability/exit matrix;
- negative tests preventing provider IDs/names from leaking to customer surfaces.

### Record as localized debt, do not refactor blindly

- `OrganizationAdapterProvider.provider: 'paperclip'`;
- Paperclip-specific private execution bridge/config.

These are acceptable private provider integrations today. Generalize them only when the audit identifies a concrete second provider or a portability gate that benefits immediately.

### Do not build

No new generic Wandora:

- task/run engine;
- scheduler/routine engine;
- watchdog;
- skills catalog;
- task approval engine;
- operational budget ledger;
- Paperclip-agent secret vault;
- generic connector/MCP grant engine;
- case/pipeline engine;
- model router.

### Keep Wandora-owned

- customer identity/tenant membership;
- stable digital employee identity and catalog semantics;
- work request/result product contract;
- customer pricing/plan/margin/entitlement;
- retention/privacy/compliance policy;
- external-effect authorization;
- messaging gateway/provider custody;
- platform-paid model secret;
- provider-neutral bindings/receipts needed for migration/reconciliation.

## Revisit trigger

Re-run this delta audit when:

- a new Paperclip release is proposed for production;
- a Wandora feature request overlaps a Paperclip capability family;
- a second control-plane provider is evaluated;
- Paperclip plugin/connector APIs become a desired customer dependency.

Current master alone never authorizes production adoption.
