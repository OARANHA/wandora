# Wandora — Capability Authority Map

Status: **Canonical architectural guardrail**

Read with ADR 0036. If a local implementation idea conflicts with this map, stop implementation and resolve the authority boundary before writing code or migrations.

## The one-sentence rule

**Wandora owns the product contract and experience; specialist components lend capabilities through Wandora-owned adapters. Owning the contract does not mean reimplementing the provider's domain inside Wandora.**

## Product topology

```text
CUSTOMER                                  WANDORA OPERATOR
app.wandora.com.br                        Platform Admin
        |                                      |
        +-------------------+------------------+
                            v
                    Wandora Core/API
              contracts + authorization + policy
                 orchestration + stable IDs
                            |
          +-----------------+------------------+------------------+
          |                 |                  |                  |
          v                 v                  v                  v
  Organization Adapter  Agent Runtime      Messaging         Data/Auth
          |              Adapter            Gateway           Boundary
          v                 |                  |                  |
      Paperclip             v                  v                  v
                         Mastra             Evolution          Supabase
                            |
                            v
                    Model/Tool providers
```

Native consoles — Paperclip UI, Mastra Studio, Evolution Manager, Supabase Studio and Portainer — are protected operator/engineering surfaces. They are not the normal customer experience and they do not replace Platform Admin.

## Authority by capability

| Capability | Wandora owns | Specialist capability / implementation |
| --- | --- | --- |
| Customer product experience | vocabulary, UX, authorization, policy, stable product IDs | Wandora Web/Core |
| Platform operation | operator contracts, authorization, audit, coherent cross-tenant controls | Wandora Platform Admin over adapters |
| Human identity/session | canonical Wandora user/membership semantics and authorization | Supabase Auth supplies identity/session |
| Auth transactional e-mail delivery | sender identity choice, rollout/custody policy and customer-access semantics | Supabase Auth creates invite/recovery mail; Resend SMTP supplies transport behind that Auth boundary |
| Wandora durable facts | policy facts, mappings, projections, audit evidence, product state that must survive provider replacement | Supabase PostgreSQL is storage infrastructure |
| Digital-employee organization/control plane | Wandora-facing employee identity/contract, customer policy and replaceability boundary | Paperclip through Organization Adapter, subject to adapter proof |
| Starter digital employee / commercial activation | starter-workforce product semantics, entitlement/policy, readiness projection, effect authorization | reuse Paperclip company + managed employee lifecycle through existing Organization Adapter; no second provisioning engine |
| Agent/workflow execution | Wandora Agent Runtime contract, allowed inputs/outputs and policy | Mastra through Agent Runtime Adapter |
| WhatsApp/messaging transport | provider-neutral connection/send/receive contracts and effect policy | Evolution/Meta/etc through Messaging Gateway |
| Model inference | model-neutral product/runtime contract and policy | Mistral/Chutes/OpenAI/etc behind provider boundary |
| Connected business systems / ERP | provider-neutral business operations, tenant authorization, read/write policy, external-effect authorization | Paperclip Connections/grants/secrets are candidate connection authority; Mastra executes approved tools; VendaERP/other ERPs remain provider adapters |
| Deployment/runtime | desired versioned platform topology in Git | Docker/Compose/Portainer/Traefik/Cloudflare provide infrastructure capability |

## Minimal-state rule

When a specialist component implements a capability, Wandora may still persist what Wandora genuinely owns, for example:

- stable Wandora identifier;
- tenant ownership;
- provider mapping/reference;
- authorization/policy state;
- customer-facing projection/cache where justified;
- audit/reconciliation evidence;
- idempotency/version state required to make adapter operations safe.

This is **not** permission to clone the provider's complete control-plane/runtime domain into PostgreSQL.

## Universal provider pluggability / replacement rule — ADR 0168

**Portability = contract decoupling, not implementation duplication. Provider replacement ≠ capability internalization.**

This rule applies to Paperclip, Mastra, Evolution, model providers and future specialist providers.

For every material provider-backed capability, classify these separately:

| Dimension | Required question |
| --- | --- |
| semantic authority | Who defines the customer/operator meaning? |
| durable product state | What minimum Wandora-owned identity/policy/fact/source-reference/audit/binding must remain portable? |
| operational authority | Who runs/persists the specialist state machine today? |
| provider implementation | Which concrete provider supplies it now? |
| replacement boundary | What adapter/binding/configuration/provider-state migration changes if the provider is replaced? |

A requirement to preserve a customer contract or an official company fact through provider replacement does **not** imply that Wandora should implement the operational engine that consumes it.

Default to delegation for operational mechanics such as:

- control-plane lifecycle and task/run orchestration;
- runtime/execution memory;
- retrieval/RAG execution;
- embeddings, vector search and chunking;
- prompt/context assembly mechanics;
- agent loops/workflow execution;
- runtime skills materialization;
- tool execution.

Wandora may own the provider-neutral semantic contract and minimum durable product state while a specialist provider owns those mechanics.

Before proposing Wandora-native implementation, require explicit evidence that reuse/adapter delegation is insufficient for a Wandora-unique product, security, compliance, reliability or effect-authorization requirement.

The universal Exit Test is:

> If this provider were replaced tomorrow, would customer-facing Wandora contracts stay stable while only adapter/binding/configuration and legitimately provider-owned operational state changed or migrated?

If not, identify the provider coupling. Do not solve it automatically by copying the provider domain into Wandora.

## Mandatory question before new domain code

Before adding a material table/entity/service/workflow/state machine, answer:

> **Is this a Wandora-unique product rule, or are we rebuilding a capability already supplied by an accepted component?**

If the answer is uncertain, the implementation is blocked until the relevant provider/adapter is inspected.

Absence from the current Wandora schema is not evidence that Wandora should own the capability.

## Examples

### “Contratar Ana”

Customer language and authorization are Wandora-owned. The operation must first determine which employee/control-plane capabilities Paperclip already provides and define the Organization Adapter. Wandora may keep a stable employee ID/mapping/policy projection; it must not automatically grow a second agent-control-plane because a local table is convenient.

### “Ana respondeu uma mensagem”

Wandora owns the supervised product contract and policy. Mastra supplies execution through the Agent Runtime Adapter. Evolution supplies transport through Messaging Gateway. Neither provider's IDs become the customer's contract.

### Platform Admin

Platform Admin controls Wandora. It exercises Supabase/Paperclip/Mastra/Evolution capabilities through Wandora contracts/adapters. It is not a stitched collection of provider consoles and it is not a reimplementation of every provider console.

## Current safety hold

The abandoned unmerged `digital_employee_work_assignments` / migration 010 direction is **not authoritative** and must not be revived without explicitly passing ADR 0036's Capability Reuse Gate after Paperclip adapter analysis.

## Paperclip / Mastra capability canonicalization — ADR 0126

Use the maintained provider maps before designing new control-plane/runtime state:

- [Paperclip Capability Map](PAPERCLIP_CAPABILITY_MAP.md)
- [Mastra Capability Map](MASTRA_CAPABILITY_MAP.md)
- [Capability Collision Matrix](CAPABILITY_COLLISION_MATRIX.md)

Current durable split:

- **Paperclip** owns the specialist implementation of company/agent lifecycle, durable organizational tasks/runs, Routines, organizational Skills policy/catalog, control-plane Decisions/Execution Policy, Decision Training, Task Watchdogs/liveness, Paperclip-controlled Connections/grants/secrets, external adapter loading and run-scoped identity.
- **Mastra** owns runtime execution: workflows/tools, execution-local goals/task lists/signals, runtime memory/observability/evals when separately adopted, workspaces/sandbox, runtime skill materialization and token/context guardrails.
- **Wandora** owns customer-facing semantics/stable IDs, tenant authorization, product policy/projections, provider-neutral adapters, external-effect authorization, compliance/effect audit, plans/billing and retention/privacy policy.

A Paperclip approval/connection grant or a Mastra tool hook/skill/signal never authorizes a Wandora-governed external effect by itself.

Paperclip Connections is the leading specialist candidate for organizational connection/grant authority. Do not introduce Mastra `@mastra/connect` or a new Wandora credential/grant subsystem as a competing authority without a superseding ADR.



## Customer-owner one-off work admission — ADR 0137

For the first legitimate active-employee work contract:

| Capability | Authority | Wandora rule |
| --- | --- | --- |
| customer work intent | Wandora | authenticated owner/admin only |
| tenant/employee authorization | Wandora | exact tenant + active/supervised employee |
| stable request idempotency | Wandora | minimum private integration receipt |
| durable issue/task lifecycle | Paperclip | reuse; do not clone |
| assignment + wakeup/run | Paperclip | reuse through company-scoped adapter |
| provider-side dispatch receipt | Paperclip plugin.state | narrow fail-closed receipt only |
| model/workflow execution | Mastra via existing Agent Runtime | reuse |
| exact run identity | Paperclip asserts / Wandora verifies | existing bridge |
| supervised result projection | Wandora | customer-safe projection only |
| external message/action effect | Wandora | separate Human Send/Gateway gates |

Approved candidate Organization Adapter authority for this contract is limited to `issues.read`, `issues.create`, `issues.wakeup`, `plugin.state.read` and `plugin.state.write` in addition to the already-approved lifecycle/webhook/secret-ref capabilities. `agents.invoke` remains forbidden.

The migration-016 journal is explicitly **integration-safety state**, not a task engine. It may store the stable work request, provider/run correlation and supervised result receipt, but Paperclip remains authority for organizational task status, assignment, dependencies, recurrence and run lifecycle.


## AI runtime portability and model-provider authority — ADR 0144

The Agent Runtime Adapter is a stable Wandora boundary; Mastra is its current implementation, not product authority.

- concrete provider/model/base URL: runtime implementation configuration;
- logical profile `wandora-supervised-v1`: Wandora-owned stable execution identity;
- platform-paid model credential: Wandora platform secret, regardless of its current host path;
- normalized token usage: Wandora adapter contract;
- Paperclip company/agent/project budgets: operational control-plane authority;
- runtime-native token/cost guard: execution-plane authority;
- Wandora plan/price/margin/entitlement: commercial product authority.

Future BYOK must reuse qualified Paperclip secret scope/responsible-user and, when appropriate, Connections/grants. No parallel Wandora tenant secret manager is authorized.

A provider permission or runtime tool capability never authorizes a customer-visible external effect; the Wandora effect boundary remains final.

## Provider-neutral runtime risk guard — ADR 0147

ADR 0147 supersedes ADR 0146's provider-specific activation blocker.

- **Agent Runtime contract** = bounded admitted work, exact identity, bounded output/deadline/steps, zero automatic model retry, structured output, fail-closed config, no implicit fallback and no external effect;
- **provider-account controls** = provider-specific commercial/financial defense in depth when applicable; they are not universal Agent Runtime prerequisites;
- **Paperclip budgets** = organizational operational budget authority;
- **Wandora** = stable logical AI/runtime profile plus plan, entitlement, customer price, margin, billing and effect policy.

Mistral Workspace spending limits remain a valid optional provider-account control, but a dedicated capped Mistral Workspace is not required merely to activate a dormant provider-backed runtime. Do not introduce a Wandora provider-pricing table, cost engine, second budget ledger or second model router.

## Provider portability rule — Paperclip Capability & Portability Audit V1

The specialist named in this document is an **operational provider**, not the owner of Wandora's customer semantics.

For every material provider-backed capability distinguish:

```text
semantic authority
  = who defines what the capability means to a Wandora customer/product

operational authority
  = who currently executes/persists the specialist state machine

provider implementation
  = the concrete component currently supplying that authority
```

Example:

```text
customer work semantic contract = Wandora
issue/run operational authority = Paperclip
current provider implementation  = Paperclip
runtime execution contract       = Wandora Agent Runtime
runtime implementation           = Mastra
model provider                    = Mistral today
```

### Mandatory provider Exit Test

Before expanding a Paperclip-backed customer capability, answer:

> If Paperclip were replaced tomorrow, which Wandora contracts would change?

The target answer is:

> only the provider adapter/binding plus migration of provider-owned operational state.

Provider IDs, enums, UI concepts and state machines must not become customer-facing Wandora contracts merely because they are convenient.

### Provider-state rule

Wandora may retain the minimum state needed for:

- stable Wandora identity;
- provider correlation/binding;
- authorization and product policy;
- idempotency/effect receipts;
- customer-safe projections;
- reconciliation/ambiguity recovery;
- compliance/effect audit;
- provider migration/exit.

This does not authorize a shadow copy of provider operational history.

### Adoption-time migration gate

A material new provider capability must document, before customer dependency:

1. its provider-neutral Wandora semantic contract, if any;
2. whether it is available in the exact pinned/live provider version;
3. how configuration/open state is exported;
4. what historical state is intentionally retained or not migrated;
5. secret reauthorization/rotation behavior;
6. its rollback and provider replacement strategy.

If those questions are unresolved, classify the capability as **QUARANTINE** rather than inventing a Wandora duplicate.

### Current Paperclip-specific portability debt

The current persistence model is already provider-neutral through `provider`, `provider_company_ref` and `provider_agent_ref` bindings, and customer Web has a negative provider-leakage verifier.

Two localized internal couplings remain acceptable for the current single-provider deployment:

- `OrganizationAdapterProvider.provider` is currently typed as literal `'paperclip'`;
- the private execution bridge/run-identity integration is Paperclip-specific.

Do not perform a broad abstraction refactor merely for aesthetics. Generalize these boundaries when a second provider, migration rehearsal or concrete portability requirement proves the value.

## Experimental-provider dependency rule

Paperclip's official operator documentation states that an experimental feature:

- is not part of the stable operator contract;
- may change or disappear;
- carries no compatibility, rollback, migration or long-term-support guarantee.

Therefore a Paperclip feature that is marked experimental is **QUARANTINE by default for Wandora**, even when its routes already exist in the production OpenAPI.

Moving an experimental capability into a stable Wandora customer dependency requires a separate ADR proving at least:

1. exact pinned-version semantics;
2. disposable/live qualification appropriate to the risk;
3. provider-neutral Wandora semantic boundary;
4. migration/export strategy independent of Paperclip's compatibility promise;
5. rollback and disable behavior;
6. no unauthorized external-effect coupling.

Current examples include Cases, Pipelines, Agent Chat and Chat Connectors.

## Paperclip usage/cost-event authority clarification — ADR 0152

Pinned Paperclip v2026.916.0 proves that positive normalized external-adapter usage is recorded through runtime totals and `costEvents`.

This makes Paperclip the correct operational ledger for provider-work usage evidence once the integration supplies that usage.

However, current Paperclip budget policy supports only `billed_cents`. An event with token usage but no authoritative monetary cost is:

```text
usage       = recorded
costCents   = 0
costStatus  = unpriced
```

It does not provide monetary hard-stop enforcement.

Authority remains:

```text
Agent Runtime -> normalized usage source
Paperclip     -> operational usage/cost-event ledger + billed-cents budget policy
Wandora       -> customer plan/price/margin/entitlement/billing
```

No Wandora provider-pricing engine or duplicate operational cost ledger is authorized merely to fill the unpriced-cost gap.


## Company grounding / Regras da Casa — ADR 0169

Official company facts, owner-authored house rules and their provenance are **Wandora-owned durable product semantics**. They must survive replacement of Paperclip, Mastra, model providers or retrieval infrastructure.

The minimum durable contract is limited to active/retired `fact` / `rule` declarations, provenance, provider-neutral source references and Wandora actor/timestamp evidence. This is not permission to create a Wandora knowledge-base, memory, prompt, vector, embedding, chunking or retrieval engine.

Authority remains layered:

- Wandora = official facts/rules/source semantics, tenant authorization and product policy;
- Paperclip = organizational Skills, Decisions/Decision Training, Connections/grants and control-plane lifecycle;
- Mastra/runtime = memory, retrieval, context assembly, runtime skills/tools/evals when separately qualified.

A model inference is never promoted to official company truth automatically. Unknown information must remain unknown unless an authorized fact/rule/source contract supplies it.


## Company grounding mutation/read authority — ADR 0170

Wandora owns the durable semantics and customer contract for official company fact/rule, provenance, approved correction history and lifecycle.

- customer read authority: Wandora Core, tenant-scoped;
- customer mutation authority: active owner/admin through Wandora Core only;
- database operational write path: bounded audited functions, not general Core table DML;
- Paperclip: no authority over official company truth;
- Mastra/runtime: no authority to promote inference/model output into official truth;
- retrieval/context assembly remains specialist runtime capability and is not implemented by this contract.

Portability continues to mean contract decoupling rather than duplicating provider implementations.
## Organization grounding runtime projection — ADR 0171

Wandora owns the provider-neutral runtime meaning of `officialFacts[]`, `houseRules[]`, `workContext` and provenance semantics. Core may project this state read-only from the existing Wandora grounding contract.

Paperclip remains task/run/control-plane authority. Mastra/runtime remains execution, retrieval and context-assembly implementation authority. The projection contract does not authorize a Wandora memory/RAG/vector/chunking/document subsystem.

The runtime receives no grounding write authority. Model output, inference and task context have no automatic promotion path into official company truth. Provider replacement occurs behind `AgentTaskRuntime`; official grounding semantics remain stable.

## Business-System connection execution gap — ADR 0208

Paperclip Connections/grants/secrets remain the preferred operational authority for Business System connection identity and credential custody. However, pinned Paperclip v2026.916.0 does not expose generic `rest_api` Connections through its Tool Gateway execution catalog: generic connected-tool execution is limited to `mcp_remote` and `local_stdio`, and remote execution uses MCP JSON-RPC `tools/call`.

Therefore `rest_api` schema support must not be treated as proof of a generic REST execution engine. Paperclip Tool Gateway remains **QUARANTINED** for VendaERP/Business System REST execution until a dedicated provider-side boundary is proven. Do not fill this gap with a Wandora-native secret manager, arbitrary HTTP proxy, REST executor or duplicate tool runtime.

The accepted replacement boundary is still: Wandora provider-neutral operation/policy -> specialist connection custody/grants -> specialist execution boundary -> ERP provider adapter. A newer Paperclip capability, Paperclip plugin/adapter, or another accepted specialist provider may satisfy execution without changing Wandora customer semantics.

## Business-System read execution boundary — ADR 0209

For REST-only business-system providers that cannot execute through Paperclip's generic connected MCP gateway, the approved provider-side pattern is a **native Paperclip connector contribution** only when it reuses Paperclip Connection/install/grant/secret authority.

A standalone plugin tool with its own config-based assignment is not sufficient if it creates a second connection/grant authority.

The connector implementation may perform narrowly allowlisted provider HTTP execution inside Paperclip, but Wandora continues to own provider-neutral Business System semantics, tenant authorization, read/write policy and effect authorization. No generic Wandora REST executor or secret manager is authorized.

## VendaERP read execution implementation — ADR 0210

ADR 0209's authority split remains valid, but its proposed direct native connector-runtime mechanism is superseded for Wandora's current `wandora_mastra` employee runtime. Direct connector-runtime tool execution is native-runner-specific in pinned Paperclip v2026.916.0.

For VendaERP read V1, the approved code-only provider implementation is a stateless MCP adapter behind Paperclip `local_stdio`. Paperclip remains authority for ToolConnection, installs/grants, secret custody, approved stdio template, catalog, gateway policy and audit. The adapter may translate only the eight ADR 0202 reads and must not accept arbitrary URL/method input or persist credentials.

Generic `rest_api` Tool Gateway execution remains quarantined under ADR 0208. This local_stdio adapter does not create a generic Wandora tool engine and does not move connection/secret authority into Core or Mastra.
