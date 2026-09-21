# Paperclip Capability Portability Matrix V1

Date: 2026-09-21  
Status: **Research checkpoint — NO EFFECT**

Evidence baseline:

```text
Wandora main at audit start
  c44634ea8f03b491db32fbde9917a2b7a7fcbd16

Paperclip live
  v2026.916.0
  dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
  /api/openapi.json paths = 685

Paperclip upstream master observed
  8813a501058b29ae293fee7e94038a737d7d1594
```

This matrix does not authorize production adoption. `master` evidence is radar only until a pinned upgrade candidate is separately qualified.

## Reading the matrix

- **Semantic authority** = what the capability means to a Wandora customer.
- **Operational provider** = component currently implementing/persisting the specialist state machine.
- **Disposition**:
  - REUSE NOW
  - ADAPT
  - FUTURE
  - WANDORA OWNED
  - DO NOT BUILD
  - QUARANTINE
- **Lock-in risk** measures the cost of replacing Paperclip if Wandora consumes the capability without a proper boundary.

## Matrix

| Capability | Wandora semantic authority | Current operational provider | Live v916 evidence | Master direction | Disposition | Lock-in risk | Portability / exit strategy |
|---|---|---|---|---|---|---|---|
| Company/control-plane identity | Wandora organization/customer identity | Paperclip companies/memberships | company APIs + existing provider bindings | remains first-order Paperclip concept | **ADAPT / REUSE NOW** | MEDIUM | keep stable Wandora organization ID + generic `provider/provider_company_ref`; migrate provider company state behind Organization Adapter |
| Digital employee lifecycle | Wandora employee product semantics/policy | Paperclip agents | agents/hire/pause/resume/terminate APIs | expanding managed agents/personas | **ADAPT / REUSE NOW** | MEDIUM | stable Wandora employee ID; generic provider-agent binding; never expose Paperclip agent ID to customer |
| Org structure / delegation | Wandora business labels/views | Paperclip agent hierarchy/delegation | agent/company control-plane APIs | richer agent/persona/team work | **REUSE NOW** when needed | MEDIUM | project only customer-facing hierarchy; export parent/role mapping for provider migration |
| Durable business work | Wandora customer work intent/result semantics | Paperclip issues | issue create/read/update/children/blockers/docs/work-products + 73 issue routes | ordinary tasks remain core unit for chat/reviews/connectors | **ADAPT / REUSE NOW** | MEDIUM | retain Wandora work ID/receipt; provider issue ID stays binding only; no generic Wandora task engine |
| Assignment/wakeup/run lifecycle | Wandora admission/effect policy only | Paperclip | agents wakeup, heartbeat runs, issue runs/live-runs, recovery | stronger recovery/native runner semantics | **REUSE NOW** | HIGH if leaked | keep run lifecycle provider-owned; Wandora verifies provider run identity through adapter; migration may leave historical provider runs read-only |
| Continuation/liveness recovery | Wandora decides effect ambiguity boundaries | Paperclip | recovery actions, watchdog, stranded-work semantics | continuing to harden recovery | **REUSE NOW / DO NOT BUILD duplicate** | MEDIUM | provider-owned recovery; Wandora keeps idempotency/effect receipts only |
| Task Watchdog | Wandora product alerting if customer-visible | Paperclip | `/issues/{id}/watchdog` + liveness services | maintained | **REUSE NOW / DO NOT BUILD duplicate** | LOW-MEDIUM | specialist mechanism remains provider-side; no customer contract on watchdog internals |
| Routines / durable recurrence | Wandora schedule semantics when exposed | Paperclip | routines/triggers/revisions/run history | maintained/used by plugin-managed declarations | **ADAPT / REUSE NOW** | MEDIUM | expose provider-neutral recurrence contract only when product requires; export schedule/assignee/policy definitions |
| Runtime-internal schedules | Wandora runtime policy | Mastra/runtime | not a Paperclip customer recurrence requirement | unchanged principle | **WANDORA RUNTIME / NOT PAPERCLIP** | LOW | keep distinct from durable business recurrence |
| Task review / execution policy | Wandora customer review semantics | Paperclip execution policy/issue decisions | executionPolicy, approvals, issue decisions | stronger explicit review flows | **ADAPT / REUSE NOW** | MEDIUM | map provider review state to Wandora review contract; do not let provider approval authorize external effects |
| External-effect approval | **Wandora** | Wandora policy + Human Send/Gateway | outbound gates independent of Paperclip | Paperclip approvals remain task/control-plane governance | **WANDORA OWNED** | NONE | never delegate final WhatsApp/email/ERP/payment authorization solely to Paperclip |
| General approvals | Wandora decides which product commitments require approval | Paperclip can implement task/control-plane approval workflow | approvals APIs + execution policy | richer action/tool approvals | **ADAPT** | MEDIUM | define Wandora approval purpose/decision semantics; provider stores specialist workflow only |
| Decisions / Decision Training | Wandora product consent/retention policy | Paperclip for organizational decisions | decisions + decision-training APIs | expanding governance/evals | **REUSE NOW / DO NOT BUILD generic learning DB** | MEDIUM | provider evidence can be exported; Wandora retains only customer/compliance facts that are product-owned |
| Costs / token operational ledger | Wandora commercial product sees normalized usage/cost | Paperclip cost ledger candidate; runtime produces usage | cost-events + rollups by agent/model/provider/project | richer billing ledger/reporting plans | **ADAPT** | MEDIUM | normalize usage at Wandora runtime boundary; post provider-neutral operational events; do not expose Paperclip cost schema as billing contract |
| Budgets / operational hard stops | Wandora plan/entitlement/customer billing | Paperclip company/agent/project operational budgets | budget overview/policy/agent budget APIs | dedicated budget-policy work | **ADAPT / REUSE NOW after integration proof** | MEDIUM | Wandora commercial limits remain separate; operational budget policy can be re-materialized in another provider |
| Customer subscription/pricing/margin | **Wandora** | Wandora | not Paperclip authority | Paperclip tracks operational company costs, not Wandora commercial contract | **WANDORA OWNED** | NONE | unchanged on provider replacement |
| Platform-paid LLM secret | **Wandora platform custody** | Wandora runtime secret mount | current production contract | Paperclip AI connections expanding upstream | **WANDORA OWNED currently** | LOW | runtime provider can change independently; never migrate merely because Paperclip can store secrets |
| Tenant/BYOK secrets for Paperclip-governed work | Wandora entitlement/policy | Paperclip secrets/responsible-user candidate | company/user secrets, proposals, providers, remote import | expanding secret/provider integration | **ADAPT / REUSE NOW when qualified** | MEDIUM | Wandora stores reference/binding, not duplicate secret; export/rotate before provider migration |
| Bridge/effect transport secrets | **Wandora trust boundary** | Wandora custody | Paperclip bridge HMAC and Gateway secrets are Wandora-owned | none changes this ownership | **WANDORA OWNED** | NONE | do not move into Paperclip merely for convenience |
| Connections / organizational tool identity | Wandora integration semantics/effect policy | Paperclip candidate operational authority | tool-connections, grants, delegations, responsible-user routing | rapidly expanding direct MCP/provider connectors | **ADAPT; qualify per use case** | HIGH | introduce provider-neutral connection identity in Wandora only when customer-facing; preserve provider grant IDs internally |
| Connection intents | Wandora product UX may expose “Ana needs access” | Paperclip | live connection-intents APIs | continuing expansion | **ADAPT / REUSE NOW only after product qualification** | MEDIUM-HIGH | map request/outcome to Wandora semantics; do not replicate OAuth/grant state |
| Tool catalog / profiles / access policy | Wandora retains final business/effect policy | Paperclip Tool Gateway candidate | tools, profiles, policies, grants, runtime slots live | major MCP governance investment upstream | **QUARANTINE → ADAPT** | HIGH | never let Paperclip tool names/IDs become Wandora customer contract; require ToolGovernance boundary before broad adoption |
| MCP Gateway | Wandora decides which external effects are acceptable | Paperclip operational gateway candidate | live gateway sessions/tokens/action-requests/audit | independent MCP connectors actively evolving | **QUARANTINE** | HIGH | use only after explicit qualification; preserve ability to swap gateway by normalizing tool/action/effect contract |
| Generic remote MCP providers | Wandora integration product semantics | Paperclip master direction | live generic tool/MCP foundation exists; provider-specific master work newer | Zapier/Arcade/Composio/Executor active work | **FUTURE WATCHLIST** | HIGH | do not depend on master-only provider journeys; qualify exact future release |
| Skills catalog/policy/release | Wandora product labels/entitlement if surfaced | Paperclip | skills catalog/policy/tests/versions live | plugin/runner-created skills expanding | **REUSE NOW / DO NOT BUILD duplicate catalog** | MEDIUM | provider-neutral skill key/projection only if customer-facing; runtime materialization stays separate |
| Runtime skill materialization | Wandora runtime policy | Mastra/runtime/adapter | external adapter capability supports sync/materialization | stronger external-adapter capability flags | **RUNTIME OWNED** | LOW | keep behind Agent Runtime Adapter |
| Execution workspaces | Wandora customer artifact/project semantics | Paperclip and/or runtime specialist | execution-workspaces, project workspaces, runtime services live | continued workspace/runtime maturation | **QUARANTINE / REUSE when concrete need** | HIGH | do not expose provider workspace model directly; define portable artifact/workspace requirement first |
| Projects/goals | Wandora product semantics may need customer projection | Paperclip | projects/goals/workspaces live | agent chat now hands work into projects/tasks | **ADAPT / REUSE NOW** | MEDIUM | stable Wandora semantics if surfaced; provider IDs remain bindings |
| Work products/documents/attachments | Wandora customer-visible result/artifact semantics | Paperclip can store task-bound artifacts | issue documents, attachments, work-products live | output-first emphasis upstream | **ADAPT** | MEDIUM | customer artifact identity/retention stays Wandora if durable customer contract; provider copy can be migrated/exported |
| Activity/control-plane audit | Wandora compliance/effect audit | Paperclip for Paperclip state | company activity + agent-action audit | increasingly central to connectors/reviews | **REUSE LAYERED, not replacement** | LOW | Paperclip activity remains specialist audit; Wandora keeps product/effect/compliance audit |
| External adapters | Wandora Agent Runtime contract | Paperclip loads adapter package | install/get/reload/reinstall/test-environment live | external adapter is recommended extension path | **REUSE NOW** | LOW | `wandora_mastra` remains separately versioned; another control plane can receive a different adapter |
| Adapter run-scoped identity | Wandora verifies execution identity | Paperclip JWT assertion | supportsLocalAgentJwt + `/agents/me` | maintained | **REUSE NOW** | MEDIUM | wrap identity in provider-specific bridge; Agent Runtime receives sanitized Wandora task, not provider IDs |
| Task Drain | Wandora maintenance policy | Paperclip process | GET/POST/DELETE live; pinned source process-local | newer hot-restart work expands continuity | **REUSE NOW** | LOW | pre-restart quiescence only; no persistent Wandora drain engine |
| Hot restart / run adoption | Wandora deployment policy | Paperclip master only for newer lifecycle | not part of current accepted v916 runbook | current master documents hot-restart adoption/report | **FUTURE** | MEDIUM | consider only on future pinned upgrade; current execution uses qualified drain/restart semantics |
| Paperclip plugins | Wandora product chooses whether a capability belongs in provider | Paperclip plugin runtime | plugin APIs live | distribution plugins + richer SDK evolving | **ADAPT / REUSE selectively** | HIGH | Paperclip plugins must remain provider-side extensions; customer-facing semantics stay in Wandora; avoid making Wandora UI depend on plugin UI slots |
| Distribution plugins | Wandora deployment packaging only | Paperclip master | not accepted as live production contract | master supports image-supplied content-addressed plugins | **FUTURE** | MEDIUM | potential future packaging for Wandora Paperclip plugins; qualify exact host version first |
| Cases | Wandora domain-specific case semantics only if a real product use case exists | Paperclip experimental | 38 routes live; `enableCases=false` by default; durable work products linked to tasks | active experimental surface | **QUARANTINE / DO NOT BUILD generic duplicate** | HIGH | do not adopt or clone generically; revisit only with a concrete Wandora case use case |
| Pipelines | Wandora business workflow semantics only if required | Paperclip experimental | 12 route groups + stages/transitions/automations/blockers/docs; `enablePipelines=false` default | evolving experimental surface | **QUARANTINE / DO NOT BUILD generic duplicate** | CRITICAL if leaked | never model Wandora product around pipeline internals now; first prove a real requirement and exit mapping |
| Agent Chat | Wandora owns customer conversation/product semantics | Paperclip experimental task-backed chat | feature flag exists, default off | major upstream development | **FUTURE / QUARANTINE** | HIGH | Wandora customer conversation UX must not become dependent on Paperclip chat persistence |
| Chat connectors | Wandora messaging/effect semantics | Paperclip experimental connector subsystem | live routes; feature flag off by default | Slack/GitHub/etc. rapidly expanding | **FUTURE / QUARANTINE** | HIGH | external send authority stays Wandora; evaluate connectors as tool/work ingress, not replacement for Wandora Gateway by default |
| GitHub review agents | not a current Wandora core product requirement | Paperclip master | newer than pinned production | current master routes reviews through ordinary tasks/runs/tools | **FUTURE** | MEDIUM | useful pattern: reuse tasks/runs, avoid separate scheduler; no current Wandora adoption |
| Model routing | Wandora stable logical profile; runtime implementation chooses provider/model | Mastra/runtime | current `wandora-supervised-v1` contract | Paperclip has AI-connection/model work but is not Wandora product authority | **DO NOT BUILD Wandora model router** | LOW | keep provider routing behind Agent Runtime; Paperclip may receive usage/cost metadata |
| Memory | Wandora retention/privacy + canonical business facts | runtime/provider-specific; Paperclip research only | no accepted Wandora dependency | master has memory landscape/research | **FUTURE / DO NOT BUILD generic memory service yet** | HIGH | qualify actual need/provider; keep canonical business facts separate from execution memory |
| Evals / quality | Wandora acceptance/product policy | runtime eval system / Paperclip research evidence | no accepted production eval authority | master has eval work/plans | **FUTURE / layered** | MEDIUM | avoid binding customer semantics to provider scoring schema |
| Customer-facing UI | **Wandora** | Wandora Web | existing verifier rejects `paperclip` / `providerAgentId` leakage | Paperclip UI keeps expanding independently | **WANDORA OWNED** | NONE if guard preserved | keep provider consoles/operator-only; customer API/UI uses Wandora IDs and vocabulary |

## Strong immediate conclusions

### DO NOT BUILD

Do not create new generic Wandora subsystems for:

- durable tasks/issues/run lifecycle;
- recurring-work scheduler;
- task watchdog/liveness recovery;
- generic organizational skills catalog;
- generic decision-training store;
- generic control-plane approval engine;
- generic operational AI budget ledger;
- generic Paperclip-agent secret vault;
- generic workspace/sandbox manager;
- generic case/pipeline engine;
- second tool/MCP connection/grant authority;
- Wandora-specific model router.

A new Wandora subsystem in any of these categories requires a proven product-owned gap and a superseding authority decision.

### REUSE / ADAPT NOW

High-confidence current reuse opportunities:

- Paperclip native Task Drain for pre-restart quiescence;
- external adapters and run-scoped identity;
- issue/run lifecycle;
- Routines when durable business recurrence becomes customer-facing;
- operational budgets/cost events after the Core/Mastra cost-event integration is proven;
- task review/execution policy when Wandora needs task-quality review;
- secrets/responsible-user resolution for Paperclip-governed BYOK/tools;
- projects/goals/work artifacts when surfaced through provider-neutral Wandora projections.

### QUARANTINE

Do not make production dependencies yet on:

- broad Tool Gateway/MCP governance without a dedicated qualification;
- Cases/Pipelines;
- Agent Chat;
- chat connectors as a replacement for Wandora Messaging Gateway;
- execution-workspace details as a public product contract.

### FUTURE WATCHLIST

Master-only/newer capabilities to reassess only with a pinned future Paperclip upgrade:

- distribution-supplied plugins;
- independent MCP connector journeys (Zapier/Arcade/Composio/Executor);
- latest GitHub review-bot flow;
- Railway runtime integration;
- newer hot-restart/adoption semantics;
- newer agent-persona/eval/runner-created-skill work.

## Current Wandora portability hotspots

### Hotspot 1 — OrganizationAdapter provider discriminator

The provider-neutral-looking contract currently contains:

```ts
export type OrganizationAdapterProvider = {
  readonly provider: 'paperclip';
  ...
}
```

The persistence layer is already generic (`provider text`, `provider_company_ref`, `provider_agent_ref`), and customer Web already rejects Paperclip/provider-ID leakage.

Classification: **MEDIUM portability debt, localized**.

Decision for this audit: do **not** refactor yet. A later narrowly scoped provider-neutralization slice may widen the discriminator/registration mechanism without changing product semantics.

### Hotspot 2 — Paperclip-specific execution bridge

Core has an internal Paperclip bridge, run identity verifier and `WANDORA_PAPERCLIP_*` configuration.

Classification: **MEDIUM portability debt, legitimate provider integration**.

This is acceptable while it stays private and isolated. A future second control-plane provider would justify extracting a generic execution-control port. Do not create that abstraction speculatively today.

### Strong existing protection — customer surface

The Web verifier explicitly rejects provider leakage:

```text
providerAgentId
paperclip
```

from the customer team page.

The database also labels provider bindings as internal/non-customer-facing state.

Preserve and expand this style of negative contract test whenever new provider-backed customer surfaces are added.

## Exit-test result today

Replacing Paperclip today would require:

- a new Organization Adapter provider implementation;
- migration of company/agent/work/run operational state;
- replacement of the private Paperclip execution bridge/run-identity integration;
- re-materialization of any Paperclip-owned recurrence/review/budget/tool state actually adopted.

It should **not** require changing:

- customer organization IDs;
- customer employee IDs/names;
- customer work request/result semantics;
- Wandora authentication/membership;
- Agent Runtime logical profile;
- model provider choice;
- Human Send/Gateway effect authorization;
- customer-facing Web vocabulary.

Current result: **portability is directionally healthy, with localized medium-risk coupling at the internal Organization Adapter and execution bridge.**

## Customer-boundary verification

A direct source read of the current Wandora Human API confirms the customer DTO for a digital employee contains only:

```text
id              = Wandora employee ID
name
role
status
autonomy
activation availability/state
work availability/state
```

Provider company/agent references are used only inside private eligibility/reconciliation SQL and are not returned.

Core tests explicitly reject provider leakage in the human digital-employee route, and Web verification rejects `providerAgentId` / `paperclip` from the customer team surface.

This is a **strong portability invariant** and should be copied to every future provider-backed customer DTO.

### Remaining localized literal

`human-digital-employees-read.ts` currently contains:

```ts
const CUSTOMER_HIRE_PROVIDER = 'paperclip' as const;
```

This is internal selection/configuration debt, not customer-contract leakage.

Do not widen it merely to produce an abstract enum. Replace the literal with a provider-neutral selection mechanism only when:
- a second provider is introduced;
- tenant-specific control-plane provider selection becomes real; or
- a migration rehearsal proves the current literal obstructs provider replacement.

## Usage/cost authority correction

The pinned implementation now proves the exact chain:

```text
normalized external-adapter usage
-> heartbeat run usageJson/runtime totals
-> Paperclip costEvents
```

when token usage is positive.

However Paperclip budget policy in v2026.916.0 supports only:

```text
metric = billed_cents
```

and an event without authoritative `costUsd` is stored with `costCents=0` / `costStatus=unpriced`.

Updated classification:

| Concern | Authority / provider | Current decision |
|---|---|---|
| normalized model token telemetry | Agent Runtime produces; adapter normalizes; Paperclip records | **REUSE NOW once Core companion + adapter 0.4 are live** |
| operational cost-event ledger | Paperclip | **REUSE NOW**, including unpriced token evidence |
| monetary hard-stop | Paperclip billed-cents budget policy | **NOT YET effective for unpriced Wandora/Mistral usage** |
| provider pricing | not qualified as Wandora authority | **DO NOT BUILD a Wandora pricing engine merely to make budgets non-zero** |
| customer price/subscription | Wandora | **WANDORA OWNED** |

### Promotion-portability correction

Live Core currently omits usage from the Paperclip execution bridge. Current main differs from the live Core executable by exactly one Core source file, and a GREEN traceable candidate already exists with byte-equivalent Core inputs to current main.

Therefore:

- adapter 0.4 alone = lifecycle fix, but no new Paperclip usage telemetry with the current Core;
- Core companion alone = adds response usage, while live adapter 0.3 safely ignores the additive field;
- Core companion + adapter 0.4 = end-to-end normalized token events in Paperclip for future real runs.

The accepted execution plan must treat these as a single compatibility-qualified promotion slice if it continues to claim both lifecycle and usage.
