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
| Agent/workflow execution | Wandora Agent Runtime contract, allowed inputs/outputs and policy | Mastra through Agent Runtime Adapter |
| WhatsApp/messaging transport | provider-neutral connection/send/receive contracts and effect policy | Evolution/Meta/etc through Messaging Gateway |
| Model inference | model-neutral product/runtime contract and policy | Mistral/Chutes/OpenAI/etc behind provider boundary |
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

