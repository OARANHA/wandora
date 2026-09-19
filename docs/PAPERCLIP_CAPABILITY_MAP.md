# Paperclip Capability Map

- Date: 2026-09-19
- Production runtime: `wandora/paperclip:v2026.831.1`
- Production source: `65ec059bde30d98c92165b24a30a540800dd1f6f`
- Current upstream stable reviewed: `v2026.916.0`
- Upstream stable source: `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`
- Status: **Canonical capability map — upgrade is not authorized by this document**

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
| Connections / grants | Connection schema and access model exist in v831.1; v916 materially expands the Connections train | **PAPERCLIP candidate authority** for organizational connection identity, grants and responsible-user routing |
| Connection Intents | Materially expanded in v916: agent requests a missing connection and human resolves it | **PAPERCLIP candidate authority**; requires upgrade qualification before Wandora depends on it |
| Tool profiles / policy | Tool profiles, connection installs and Tool Gateway foundation exist in v831.1 | **PAPERCLIP candidate authority** for organizational tool access; production dependency requires separate qualification |
| Tool Gateway | Broker/policy/audit capability exists but has historically shipped as experimental | **QUARANTINE** until separately qualified; no Wandora production dependency merely because it exists |
| External adapter loading | Native external adapter registry/install/readback/test-environment | **PAPERCLIP-OWNED**; current `wandora_mastra` bridge uses this |
| Run-scoped identity | Local-agent JWT / `/api/agents/me` identity validation is proven in the bridge | **PAPERCLIP-OWNED identity assertion**, independently reconciled by Wandora before effects |
| Workspace / execution services | Paperclip contains execution workspace/runtime service capability | Paperclip controls its execution environment; Wandora must not duplicate it without a proven product-owned requirement |
| Audit/activity | Activity log, revisions, run history and control-plane decisions | **PAPERCLIP audit for Paperclip state**; not a substitute for Wandora compliance/effect audit |
| Import/export/backup | Company import/export and DB backup/recovery capability | Reuse for Paperclip recovery; Wandora retains its own product/data recovery contracts |
| Chat/task interaction | Interaction and chat-task capabilities exist and continue expanding upstream | Treat as Paperclip control-plane UX capability unless Wandora product semantics require an adapter projection |

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

## v916 upgrade relevance

The current upstream stable `v2026.916.0` is materially interesting because the Connections train is substantially more mature: runtime credentials, per-person/organization/agent grants, responsible-user routing and in-task connection repair/intents are promoted as headline capabilities.

This is an **upgrade benefit**, not an upgrade authorization.

The following remain mandatory before production promotion:

1. exact source/image provenance;
2. disposable restore of the current Paperclip recovery snapshot;
3. migration proof through the current schema;
4. company/membership/Organization Adapter/secret preservation;
5. Ana remains exactly paused;
6. exact `wandora_mastra` load/readback/test-environment;
7. run-scoped JWT `/api/agents/me` proof;
8. disposable Paperclip -> bridge -> Wandora/Mastra E2E;
9. unknown mapping fail-closed;
10. no unexpected wakeup/heartbeat/outbound;
11. rollback evidence;
12. independent post-proof production invariants.

Until those gates are green, production remains pinned to `v2026.831.1`.

## Provider references

- Paperclip releases: https://github.com/paperclipai/paperclip/releases
- Routines: https://docs.paperclip.ing/reference/api/routines/
- Tool Gateway: https://docs.paperclip.ing/reference/api/tool-gateway/
- Connection access model: https://docs.paperclip.ing/connectors/access-model/
