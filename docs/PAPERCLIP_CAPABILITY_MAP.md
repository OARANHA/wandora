# Paperclip Capability Map

- Date: 2026-09-20
- Production runtime: `wandora/paperclip:v2026.916.0`
- Production source: `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`
- Current upstream stable reviewed: `v2026.916.0`
- Upstream stable source: `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`
- Status: **Canonical capability map — production is on v2026.916.0 per ADR 0130; future upgrades are not authorized by this document**

This map answers one question before Wandora adds control-plane/domain state: **does Paperclip already own or supply the capability?**

It is subordinate to accepted ADRs and `docs/CAPABILITY_AUTHORITY.md`. Customer-facing semantics, stable Wandora IDs, tenant authorization, product policy, external-effect authorization and provider-neutral adapters remain Wandora-owned.

## Canonical ownership map

| Capability | Paperclip evidence | Wandora disposition |
|---|---|---|
| Company / agent control plane | Companies, memberships, agents, managed identity, agent lifecycle | **PAPERCLIP-OWNED implementation** behind Organization Adapter; Wandora keeps only stable product identity, policy, mappings/projections and reconciliation evidence |
| Task / issue lifecycle | Issues, assignments, parent/child work, heartbeat/run lifecycle | **PAPERCLIP-OWNED** for organizational work; do not grow a parallel generic Wandora task engine |
| Recurring organizational work | Routines with schedule/webhook/API triggers, revisions, concurrency/catch-up policy and run history | **PAPERCLIP-OWNED** for customer/business recurrence |
| Skills catalog / assignment / policy | Skill catalog, company skills, policy, releases and agent skill surfaces exist in v831.1 | **PAPERCLIP CONTROL-PLANE authority**; Mastra may materialize runtime skills without becoming catalog authority |
| Review / approval of task completion | Execution Policy with typed review/approval stages and decision audit | **PAPERCLIP-OWNED for task completion governance**; does not replace Wandora external-effect approvals |
| Decisions | First-class decisions/propose-decide state exists before v831.1 | **PAPERCLIP-OWNED for control-plane decisions**; customer product commitments/effects remain Wandora policy |
| Decision Training | Decision training examples/snapshots and retention schema exist in v831.1 | **PAPERCLIP-OWNED training evidence** for control-plane decisions; do not create a generic Wandora “learning decisions” table |
| Task Watchdog | Opt-in issue-tree stop verification with server-enforced scope and idempotent wake behavior | **PAPERCLIP-OWNED** when the need is “verify stopped work and restore a valid path” |
| Active-run silence/liveness recovery | Paperclip has distinct active-run watchdog/liveness recovery semantics | **PAPERCLIP-OWNED** for its runs; do not add a duplicate Wandora process watchdog |
| Routines vs watchdog | Paperclip explicitly separates recurrence from stopped-work verification | Reuse the native primitive matching the intent; never use a watchdog as a scheduler |
| Agent secrets | Company/user secret definitions, bindings, run-bound access and responsible-user contracts exist | **PAPERCLIP-OWNED** for Paperclip-controlled agent/runtime credentials, subject to connection/secret qualification |
| Organization Adapter secret refs | Existing live `local_encrypted` + `secret_ref` integration is proven | Reuse; Wandora owns HMAC custody/mapping boundary only where required by the adapter contract |
| Connections / grants | Connection schema and access model exist in v831.1; v916 materially expands the Connections train; ADR 0210/0211 qualify the local_stdio MCP read candidate and external-runtime bridge | **PAPERCLIP operational authority for the qualified MCP read path**, still subject to separate production activation for each tenant/provider connection |
| Connection Intents | Materially expanded in v916: agent requests a missing connection and human resolves it | **PAPERCLIP candidate authority**; requires upgrade qualification before Wandora depends on it |
| Tool profiles / policy | Tool profiles, connection installs and Tool Gateway foundation exist in v831.1; ADR 0211 proves policy-filtered run-scoped read-tool listing/call for external `wandora_mastra` execution | **PAPERCLIP operational authority for qualified connection-backed MCP read access**; write/effect paths remain separately gated |
| Tool Gateway | Broker/policy/audit capability exists; ADR 0211 qualifies the exact v2026.916.0 session/list/call contract for connection-backed MCP tools classified `risk=read` | **QUALIFIED ONLY FOR THE ADR 0211 MCP READ BRIDGE**; generic `rest_api`, write/destructive and approval-bearing execution remain quarantined/NO-GO until separately decided |
| External adapter loading | Native external adapter registry/install/readback/test-environment | **PAPERCLIP-OWNED**; current `wandora_mastra` bridge uses this |
| Run-scoped identity | Local-agent JWT / `/api/agents/me` identity validation is proven in the bridge | **PAPERCLIP-OWNED identity assertion**, independently reconciled by Wandora before effects |
| Workspace / execution services | Paperclip contains execution workspace/runtime service capability | Paperclip controls its execution environment; Wandora must not duplicate it without a proven product-owned requirement |
| Audit/activity | Activity log, revisions, run history and control-plane decisions | **PAPERCLIP audit for Paperclip state**; not a substitute for Wandora compliance/effect audit |
| Import/export/backup | Company import/export and DB backup/recovery capability | Reuse for Paperclip recovery; Wandora retains its own product/data recovery contracts |
| Chat/task interaction | Interaction and chat-task capabilities exist and continue expanding upstream | Treat as Paperclip control-plane UX capability unless Wandora product semantics require an adapter projection |

## ADR 0211 external-runtime Tool Gateway qualification

The current `wandora_mastra` adapter does not receive Paperclip native-runner tool injection. ADR 0211 therefore reuses Paperclip's run-scoped Tool Gateway rather than copying connection or execution authority into Wandora.

Qualified path:

```text
Paperclip run JWT
  -> short-lived Paperclip Tool Gateway session
  -> policy-filtered connection-backed MCP risk=read descriptor
  -> ephemeral Wandora RuntimeReadTool
  -> ephemeral supervised Mastra Agent
  -> Paperclip Tool Gateway call
  -> Paperclip-owned grant/secret/MCP execution
```

The run JWT and Tool Gateway token are not model input or Wandora durable state. The deterministic Mastra runtime remains independent of this bridge.

This qualification does **not** supersede ADR 0208: Paperclip generic `rest_api` Tool Gateway execution is still NO-GO.

## Important non-collisions

### Paperclip Routine vs Mastra Schedule

A customer-visible or organizational recurring obligation belongs in a **Paperclip Routine**.

A Mastra schedule is allowed only for runtime-internal execution mechanics where no durable business recurrence, assignment, ownership, review history or customer-facing work item is required.

### Paperclip Task vs Mastra task list / goal

A Paperclip task/issue is durable organizational work.

A Mastra task list or goal is execution-local cognition/progress inside a run. It must not become the durable source of truth for company work.

### Paperclip Skills vs Mastra Skills

Paperclip owns which skills exist for the organization, how they are assigned/released/policy-governed and which agent is expected to have them.

Mastra may load/materialize runtime skills needed to execute. Runtime skill state must not silently become the organizational catalog.

### Paperclip Decisions vs Wandora approvals

Paperclip decisions/execution-policy stages govern control-plane work and task completion.

Wandora approvals authorize Wandora product commitments and external effects. A Paperclip approval/decision never grants WhatsApp send, provider mutation, spend, order creation or any other Wandora-governed external effect unless the Wandora effect policy independently authorizes it.

## v831.1 already contains more than the historical integration assumed

Direct source inspection of the exact production tag found existing schema/docs for:

- Routines;
- Task Watchdog and liveness recovery;
- Execution Policy;
- Skills catalog/studio/policy/release state;
- Decisions and Decision Training;
- user-specific secrets and responsible-user state;
- Tool Gateway / Connections foundation;
- execution workspaces/runtime leases;
- run-scoped agent identity and external adapter loading.

Therefore **absence of a Wandora implementation is not a capability gap** for these areas.

## v831.1 -> v916 migration audit

All upstream migrations after the production baseline were statically reviewed through `0279`.

The audit does **not** authorize production promotion, but it narrows the expected risk:

- no reviewed migration drops the external adapter registry, `wandora_mastra` registration contract or Organization Adapter plugin configuration as a migration target;
- `0231`, `0232`, `0233`, `0239`, `0255`, `0272`, `0276` and `0277` materially evolve Connections, grants, transports, runtime credentials and AI connection defaults;
- `0236_remove_cheap_model_profiles.sql` deliberately removes retired `modelProfiles` / `modelProfile` state; the retained production-derived recovery snapshot contains zero observed occurrences of those keys;
- `0232` treats legacy personal credential migration conservatively: secrets that also serve organization grants, tool connections, company secret bindings or routine triggers stay company-scoped; ambiguous personal grants are marked for reauthorization instead of silently reassigning the secret;
- `0276` migrates only active **user-scoped** recognized AI credentials declared for supported agent env keys. Its migration contract explicitly leaves host auth homes and company secrets untouched and performs no agent-binding rewrite;
- later wakeup/chat migrations mutate idempotency/provenance and conversation structures, so the disposable proof must still confirm Ana has zero unexpected wakeup/heartbeat drift.

This is source-level evidence only. Actual production-derived restore/migration/runtime proof remains mandatory.

## v916 production status

ADR 0128 completed the production-derived disposable compatibility gates, ADR 0129 froze the rollback contract, and ADR 0130 promoted the exact candidate to production.

Current live runtime:

```text
Paperclip = v2026.916.0
source    = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
digest    = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
health    = healthy / restart 0
```

The production startup applied all 49 qualified migration files `0231..0279`. MEDICSPRO company/membership state, paused Ana, Organization Adapter, local-encrypted secret binding and the single `wandora_mastra@0.1.0` registration survived unchanged.

Live post-upgrade acceptance also exercised the existing **Wandora Internal Supervised Proof** identity through the normal Paperclip heartbeat/run path. The initial on-demand run plus one timer heartbeat succeeded through `wandora_mastra -> Wandora Core -> deterministic Mastra`. During later chat-continuity recovery, before the already-existing PR #180 checkpoint was discovered, the same `WAN-1` path produced one additional succeeded run. Final proof state is 3 succeeded runs total, agent `paused`, issue `cancelled`, pending runs/wakeups `0/0`, and proof outbound attempts unchanged at 4. MEDICSPRO wakeups/runs/outbound remained `0/0/0`, and unknown provider-company mapping was revalidated live as fail-closed through the Core runtime service.

Paperclip's normal logical backup still does not serialize PostgreSQL CHECK constraints. The retained v831 rollback contract therefore requires both the official backup + matching `master.key` and the protected schema-faithful PostgreSQL 18.1 `pg_dump -Fc`. Since v916 migrations have committed, image-only rollback is no longer valid.

This map does **not** authorize future Paperclip upgrades, Mastra upgrades, employee activation/resume or external effects. Those remain separate reviewed slices.
## Provider references

- Paperclip releases: https://github.com/paperclipai/paperclip/releases
- Routines: https://docs.paperclip.ing/reference/api/routines/
- Tool Gateway: https://docs.paperclip.ing/reference/api/tool-gateway/
- Connection access model: https://docs.paperclip.ing/connectors/access-model/

## Activation-specific v916 lifecycle semantics — ADR 0131

The first real Wandora activation refresh verified the exact live v2026.916.0 lifecycle implementation rather than inferring it from older v831 behavior.

- `agents.managed` and `agents.resume` are distinct plugin capabilities.
- `agents.managed.reconcile` resolves/materializes the managed resource but is not lifecycle activation.
- `agents.resume` changes a non-terminated/non-pending agent to `idle`, clears pause/error state and does **not** request a heartbeat wakeup.
- `agents.invoke` is the separate host operation that requests a wakeup.
- reconciling an existing managed agent does not reapply the manifest's initial `status: paused`;
- managed reset patches declared configuration and likewise does not force lifecycle status back to paused.

Authority decision:

```text
customer activation intent / authorization = Wandora
provider lifecycle transition              = Paperclip
execution wakeup/run                       = Paperclip work/run path
runtime execution                          = Mastra behind Wandora bridge
external effect authorization              = Wandora
```

For the first activation, the Organization Adapter may be adapted to request native `agents.resume`, but the Wandora-owned action must narrow that coarse provider capability to the fixed managed catalog employee and must never expose arbitrary provider agent IDs or call `agents.invoke`.

Paperclip `idle` means resumed and waiting. It is not equivalent to a running execution and it does not imply Human Send or Gateway outbound authority.


## ADR 0144 — AI spend and tenant-credential authority

Paperclip v2026.916.0 already provides company and per-agent monthly budgets, project lifetime budgets, cost events with provider/model/token/cost evidence, company/user secret scopes and subject-aware Connections/grants.

For Wandora model execution:

- Paperclip = operational employee/company/project spend control plane;
- Mastra/runtime = per-execution technical guardrails;
- Wandora = customer plan, price, margin, entitlement and billing semantics.

A current integration gap remains: model calls executed inside Wandora Core/Mastra are not yet proven to post their cost evidence into Paperclip's cost-event ledger. Therefore Paperclip budgets must not be described as already governing Mistral spend on this path.

Future tenant/BYOK credentials should reuse Paperclip secret scopes/responsible-user resolution where they belong to Paperclip-governed work. Connections/grants may own provider identity/delegation only after the provider integration is qualified. Do not create a Wandora tenant secret manager.

## Capability portability additions — 2026-09-21 audit

### Native Task Drain

Production v2026.916.0 exposes native instance-admin Task Drain through GET/POST/DELETE `/api/instance/task-drain`.

Pinned source proves it is a **process-local pre-restart quiescence guard**:

- new run admission is held while draining;
- status reports active runs, pending wakes and `quiescent`;
- restart clears the drain by design.

Disposition: **REUSE NOW**. Do not build a competing Wandora drain/scheduler for Paperclip maintenance.

### Cases / Pipelines

Production v2026.916.0 already contains substantial Case/Pipeline state:

- durable Cases linked to tasks;
- stages/transitions;
- automations/Routines;
- blockers;
- review;
- documents/outputs;
- leases/liveness;
- upstream drift/event history.

Both `enableCases` and `enablePipelines` are managed feature flags that default false.

Disposition: **QUARANTINE + DO NOT BUILD a generic Wandora Case/Pipeline engine**. Do not activate or adopt these surfaces without a concrete Wandora use case and dedicated exit contract.

### Company portability / export fidelity

Pinned Paperclip has native company export/import/preview/fidelity services and can export company, agents, projects, issues and skills.

The native `paperclip-export-fidelity-v1` report explicitly warns that:

- approval history is not exported;
- cost-event history is not exported;
- activity history is not exported.

Therefore native export improves replaceability but is not complete provider exit by itself.

Disposition: reuse native export + a minimal Wandora provider-binding/receipt manifest + targeted export/archive for any adopted non-portable operational history. Do not shadow-copy Paperclip tables.

### Current-master radar

Upstream master observed during the audit at `8813a501058b29ae293fee7e94038a737d7d1594` materially expands:

- distribution plugins;
- independent MCP connectors;
- GitHub review agents;
- Railway runtime operations;
- AI Connections;
- Runner-created Skills;
- eval infrastructure;
- hot-restart/run-adoption semantics.

These are **radar only** until a future pinned Paperclip upgrade qualifies them. Current master never authorizes live dependency.

See:

- `docs/research/PAPERCLIP_CAPABILITY_PORTABILITY_AUDIT_V1.md`
- `docs/research/PAPERCLIP_CAPABILITY_PORTABILITY_MATRIX_V1.md`
- `docs/research/PAPERCLIP_PROVIDER_EXIT_STRATEGY_V1.md`
- `docs/research/PAPERCLIP_OPENAPI_COMPATIBILITY_GATE_PROPOSAL_V1.md`
- `docs/research/PAPERCLIP_UPSTREAM_DELTA_AUDIT_2026-09-21.md`


## Historical agent error reconciliation — ADR 0155

Pinned v2026.916.0 semantics now qualified for Wandora:

- agent `error` is assignable and invokable;
- ordinary terminal run failure can project the agent to `error`;
- the agent row stores `errorReason` and `updatedAt`/last-heartbeat time, not a dedicated `errorAt`;
- `resume` is a broad lifecycle operation exposed to plugins through `agents.resume`;
- `clear-error` is a dedicated Board-only REST operation that conditionally moves `error -> idle`, clears lifecycle error/pause fields and preserves historical run/runtime diagnostics;
- managed-agent reconcile does not force existing lifecycle back to the manifest's initial status and does not expose a clear-error SDK primitive.

Wandora decision: keep Paperclip as lifecycle/diagnostic authority and **do not mutate an `error` projection merely to make work executable**. Adopt `clear-error` as a production dependency only if a separate operator-facing cleanup requirement is later accepted.


## Customer-work admission compatibility — ADR 0156

Additional qualified behavior:

- Paperclip `issues.requestWakeup` already enforces issue status, blockers, budget, wake-on-demand and authoritative agent invokability;
- Organization Adapter 0.3.0 currently adds a stricter idle-only precondition;
- that precondition incorrectly rejects the current historical `error` despite Paperclip marking it invokable;
- least-change correction is `idle | error` at Wandora pre-admission while retaining `running` rejection and Paperclip final re-check.

Do not use provider lifecycle mutation as a workaround for a Wandora-owned admission mismatch.


## Organization Adapter 0.3.1 candidate — ADR 0157

Repository candidate 0.3.1 fixes only the customer-work readiness mismatch:

- pre-admission accepts `idle | error`;
- `running` remains rejected;
- capabilities remain unchanged;
- `issues.requestWakeup` remains the Paperclip-native final invokability boundary;
- no `clear-error` or `resume` workaround is introduced.

Production is still 0.3.0 until a separate promotion slice.

## ADR 0209 — REST-only business-system connector qualification

Pinned Paperclip v2026.916.0 generic Tool Gateway remains MCP-only for connected-tool execution, but the same version contains a provider-side native connector runtime plus ToolConnection installs/grants and secret-resolution primitives.

Qualification result for VendaERP:

- generic `rest_api` Tool Gateway: **QUARANTINE / NO-GO**;
- standalone plugin tool as connection authority: **NO-GO**;
- native connector contribution reusing ToolConnection + installs/grants + Paperclip secrets: **QUALIFIED FOR CODE-ONLY CANDIDATE**;
- production activation: **NOT AUTHORIZED**.

The candidate must expose only fixed read operations and must not accept arbitrary URL or method input.

## ADR 0210 — VendaERP local_stdio MCP candidate

Pinned Paperclip v2026.916.0 supports the selected VendaERP read execution mechanism without a core-provider patch:

- approved `local_stdio` command templates;
- ToolConnection + company/agent installs/grants;
- grant secret refs projected only into approved `env.<KEY>` entries;
- MCP initialize/tools/list/tools/call;
- run-scoped Tool Gateway sessions usable by external adapters;
- gateway policy, invocation evidence and audit.

Qualification:

- generic `rest_api` execution: **QUARANTINE / NO-GO**;
- direct connector-runtime contribution for `wandora_mastra`: **NOT THE SELECTED EXECUTION PATH**;
- VendaERP stateless `local_stdio` MCP adapter: **CODE-ONLY CANDIDATE GREEN**;
- production template/connection/grants/secrets: **NOT CREATED**.
