# ADR 0338 — Semantic Fast Read Freshness Attestation Preflight V1

Date: 2026-09-29

Status: **QUALIFIED / READY FOR SEPARATE SEMANTIC FAST READ ATTESTATION EXECUTION / READ-ONLY FRESHNESS GREEN / NO ACTIVATION / NO BUSINESS PROVIDER OR CUSTOMER EFFECT**

## Objective

Determine, from fresh canonical repository/GitHub/runtime evidence after ADR 0337, the exact freshness-attestation contract required before a future bounded Semantic Fast Read execution and decide whether any code/provider-observability gap still blocks that separate execution slice.

This slice is preflight/qualification only. It does not open the Semantic Fast Read attestation window and does not authorize a Human Fast Read request.

## REAL NOW

Fresh repository/GitHub reconciliation proved:

- `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 remains open / draft / mergeable / not merged on `feat/semantic-fast-read-runtime-wiring-v1`;
- exact pre-documentation head = `4eacd07fb792451e49217232edcdfa14c3a5babe`;
- all **17/17** workflows on that exact head completed successfully, with zero pending and zero failed runs.

Fresh production readback proved:

- seven Wandora containers are running/healthy;
- Core = `wandora/core:organization-adapter-candidate-b2cffbb54089`;
- Core image id = `sha256:15a2eca7f74c4e6f7f6ea07bb461d6b711dffd0a70807a3f8e7773f6e6a27c49`;
- Core revision = `b2cffbb54089212844ef177827e7a616b1008144`;
- Core is healthy with restart count 0;
- active Core Compose provenance ends at `compose.semantic-fast-read.yaml`;
- TypeSafe/System One and `wfri1` custody/attestation mounts are absent from live Core;
- Core startup reports `fastReadExecution=false`, `semanticFastRead=false`, `humanSendProposal=false`;
- Paperclip = `wandora/paperclip:v2026.916.1`, commit `d554c4789ed3930f8a53ac9fdf6503b3187097da`, healthy with restart count 0;
- Messaging Gateway is healthy with restart count 0 and `outboundEnabled=false`;
- Task Drain = `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`.

Fresh Organization Adapter readback proved exactly one installed plugin:

- key = `wandora.organization-adapter-v1`;
- version = `0.6.1`;
- plugin id = `86e77fe7-c7e4-4bee-afa3-46cdad575d0c`;
- status = `ready`;
- `lastError=null`;
- plugin health = `healthy=true`;
- package path = `/paperclip/operator-packages/wandora-organization-adapter-v1/80373a61f08d87772c3aab738ffa6905bddcb49c783e9574c1540247cb3b258f/package`.

The content-addressed package identity therefore remains the ADR 0337 live identity. OA 0.6.0 remains historical/promotion-blocked; this slice did not touch it.

## PROVEN EVIDENCE — freshness contract

### 1. Operational state that must be fresh

Before any later opening mutation, re-read two distinct layers:

1. platform/runtime state:
   - exact repo/PR head and exact-head CI;
   - exact Core image/revision/health/restart and Compose provenance;
   - exact Paperclip image/source/health/restart;
   - exactly one expected OA version/id, ready with `lastError=null`;
   - Task Drain quiescent;
   - Human Send OFF;
   - Messaging Gateway healthy with outbound OFF;
   - rollback/custody evidence applicable to the exact live baseline;
2. Paperclip business-system authority/readiness state:
   - current Tool Policy qualification for the intended action with enough provider-owned identity to resolve the action;
   - separate current `tools.operational.read` projection proving Connection health/readiness, organization grant, agent installation and effective-profile tool availability.

Historical ADR 0337 evidence cannot substitute for a new read immediately adjacent to a later production effect.

### 2. Authority of that state

- **Wandora** owns semantic/product/effect authority, `BusinessCapability`, signed `wfri1`, deterministic admission/post-filter and the decision whether a production effect is allowed.
- **Paperclip** owns Connection/install/grant/catalog/profile/policy/runtime-health state, Tool Gateway authorization/execution, run/result and audit.
- **Organization Adapter** is the bounded provider-neutral projection/replacement boundary over Paperclip-owned state.
- **TypeSafe/System One** remains the replaceable semantic-route provider.
- **Mastra/Mistral** remain the replaceable selector/runtime implementation.
- **VendaERP** remains the replaceable Business System provider.
- **Remote-Ops** remains the governed operator boundary for later mutation.
- **owner/admin browser session** remains the human actor boundary for the one future Human Fast Read.

### 3. Paperclip versus Wandora-owned state

Connection/install/grant/catalog/profile/runtime-health freshness is **Paperclip-owned**.

OA `operational-read` does not create a Wandora cache or mirror. Source proves it calls Paperclip `ctx.toolAccess.readOperationalSnapshot` and returns a bounded projection only. The adapter persists no snapshot.

No new Wandora table, registry, cache, migration, state machine, lifecycle or execution subsystem is justified.

### 4. TTL / freshness window

There is **no numeric TTL and no freshness timestamp** in the qualified `operational-read` contract.

The snapshot schema exposes `runtimeHealth` and Connection/tool operational fields but no `observedAt`, `expiresAt` or TTL. The host path reads current Paperclip state and deliberately uses `listCatalogCached`, avoiding a connected-provider refresh merely for qualification.

Freshness is therefore **event/window based, not duration based**:

- evidence is point-in-time;
- it must be re-read immediately adjacent to a later opening mutation;
- relevant mutable drift invalidates it for that future effect.

Do not invent a Wandora TTL, cache or mirror.

### 5. Stale/invalid conditions

For a later opening, evidence is invalid after relevant drift, including:

- source head/required CI change;
- Core image/revision/Compose/render/gate change;
- Paperclip image/source/health change;
- OA version/plugin id/package path/status/health change;
- Task Drain ceases to be quiescent;
- Gateway outbound or Human Send becomes enabled;
- company/managed-agent binding changes;
- Connection status/enabled/health changes;
- organization grant or agent install changes;
- Catalog Entry/tool status or read/write/destructive semantics change;
- effective-profile allowance changes;
- policy qualification no longer returns `allow / allow_profile`;
- rollback/custody evidence no longer applies to the live baseline;
- exact opening/close render differs from the qualified contract.

The actual Tool Gateway authorization during the future run remains a separate final operational authority; preflight cannot override a later denial.

### 6. Required identity

The qualified path is:

- company 28PRO = `5d7ec217-118c-4292-8136-0a9ab16926ea`;
- managed Ana = `428b6730-3df4-4b92-b90a-a87f87c401f9`;
- managed key = `ana-commercial-v1`;
- VendaERP Connection = `8e2c23f4-73f5-444a-8647-71428819ea91`;
- Catalog Entry = `165fcdca-8021-41dd-90e5-f0f143adeac3`;
- effective Tool Profile = `259a5449-58ba-4d59-9774-92612e3caa91`;
- intended tool = `vendaerp_search_products`;
- qualification arguments = `{"pageSize":5,"skip":0}`;
- OA plugin id = `86e77fe7-c7e4-4bee-afa3-46cdad575d0c`.

Fresh agent readback still reports Ana under exact 28PRO with `orgChainHealth=healthy`. The historical Paperclip status remains `error / wandora_execution_failed_422`; canonical prior qualification established that this historical status is not by itself the deterministic Fast Read blocker.

### 7. Is ADR 0337 operational-read sufficient?

No. It is necessary but only **part** of the freshness contract.

The runbook requires both:

1. Tool Policy qualification with Connection or Catalog identity, proving the intended action is `allow / allow_profile`;
2. `operational-read`, proving runtime/Connection/grant/install/tool readiness.

Neither substitutes for the other. `allow_profile` alone does not prove install/grant reach, and `operational-read` does not replace Tool Gateway run-time authorization.

### 8. Gates during this preflight

Throughout this slice:

- Fast Read execution = OFF;
- Semantic Fast Read = OFF;
- Human Send = OFF;
- Gateway outbound = OFF;
- custody/attestation overlays = absent.

No opening mutation occurred.

A later separately authorized bounded attestation may temporarily enable only the already-qualified Core Fast Read/Semantic/Selector gates under the existing attestation overlay contract while Human Send and Gateway outbound remain OFF. That effect is not authorized here.

### 9. Provider/model call requirement

No real business provider/model call is required to establish preflight freshness.

The readiness evidence comes from Paperclip-owned policy/operational state. `operational-read` is cache-only with respect to the connected provider and does not call VendaERP.

This slice made no Core Semantic Fast Read, Mistral selector, VendaERP tool, Human Fast Read or customer-work request. JEV/TypeSafe was used only as the project's separate adversarial governance reviewer; its advisory output was not treated as readiness evidence and did not traverse the customer Fast Read path.

### 10. Rollback / stop condition

The current Core Rollback V2 receipt remains present for exact Core `b2cff...`, Paperclip v2026.916.1 and Gateway, ending in `ROLLBACK_FREEZE_V2_OK`. It also records metadata-only TypeSafe/`wfri1`/Mistral custody and forbidden-effect flags false.

That receipt predates OA 0.6.1 and records then-live OA 0.5.0. ADR 0337 independently re-proved the immutable 0.5.0 OA rollback bytes immediately before promoting 0.6.1. Do not reinterpret the Core receipt as a post-0337 global snapshot.

The future attestation opening is a Core-composition effect, not an OA lifecycle effect. Its stop/close condition is:

1. on ambiguity/failure, do not execute a second request;
2. remove attestation overlay;
3. restore Core to the exact immediately-pre-window gates-OFF composition/image;
4. remove custody overlay unless separately authorized to remain;
5. prove Fast Read/Semantic/Human Send OFF;
6. prove Gateway outbound OFF;
7. reconcile Paperclip/OA/Task Drain and any provider-side run/result evidence created by the one authorized request.

OA 0.6.1 is not automatically rolled back when the Core window closes. If OA itself becomes unhealthy/incompatible, use a separate fresh rollback decision against the preserved 0.5.0 package.

## Fresh read-only qualification executed

After an adversarial review, exactly one governed Paperclip Tool Policy qualification was executed for the intended path with Connection and Catalog identity.

Result:

- `decision=allow`;
- `reasonCode=allow_profile`;
- `allowed=true`;
- effective profile `259a5449-58ba-4d59-9774-92612e3caa91`;
- `matchedPolicyIds=[]`;
- `auditEvent=null`.

The governed capability consumes no rate limit and writes no audit event. Fresh company Tool Policies remain `[]`.

Then exactly one OA 0.6.1 `operational-read` was executed through the existing authenticated Paperclip plugin-data bridge.

Result:

- `runtimeHealth=ok`;
- Connection `Wandora VendaERP Read-Only V1`;
- status `active`;
- `enabled=true`;
- `healthStatus=ok`;
- `organizationGrantActive=true`;
- `installedForAgent=true`;
- all eight mapped tools active, risk `read`, `isReadOnly=true`, `isWrite=false`, `isDestructive=false`, `allowedByEffectiveProfile=true`.

No VendaERP tool was executed.

## GAPS

No code, provider-observability or Paperclip-authorization gap remains that requires a new subsystem or code-qualification slice before a separate bounded attestation execution.

The remaining requirement is temporal/governance: all mutable evidence must be re-read immediately adjacent to the future opening because this preflight does not mint a durable readiness token and the provider snapshot has no TTL.

## CAPABILITY AUTHORITY / REUSE GATE

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

This slice reused Paperclip Tool Policy qualification, Paperclip-owned `tools.operational.read`, the Organization Adapter projection, existing Rollback V2 evidence and existing provider-neutral Fast Read contracts.

It created no operational mirror/cache, provider registry, tool engine, Connection/grant/install/profile state, lifecycle/run state, retry engine, secret manager, workflow or execution subsystem.

## DECISION

**READY FOR SEPARATE SEMANTIC FAST READ ATTESTATION EXECUTION.**

Narrow meaning:

- ADR 0333/0334 operational-observability blocker is closed in production;
- current Paperclip authorization and operational readiness are freshly GREEN;
- no additional code/provider qualification is required merely to observe freshness;
- this does **not** authorize opening the attestation window, provider/model execution or Human Fast Read.

The separate execution slice must start from REAL NOW and repeat every freshness-sensitive pre-mutation gate immediately before effect. Any drift can turn that later decision into BLOCKED.

## SECOND ADVERSARIAL REVIEW

The read-only qualification plan first received a JEV guard `allow=0.75` with confidence `0.66`.

After fresh reads, a broad challenge to the initial READY wording selected `deny` with very low confidence `0.14`, forcing explicit review of the distinction between the current-Core rollback receipt and later OA 0.6.1 promotion.

The decision was narrowed so READY means only “no code/provider-observability gap remains; proceed only to a new separately authorized execution slice.” A focused challenge then selected `allow` (`allow=0.39`, `deny=0.29`, `review=0.20`, `confirm=0.12`) with low confidence `0.18`.

Because advisory confidence remained low, deterministic repository/runtime contracts control the decision. This ADR records the rollback-scope distinction explicitly and does not convert preflight into effect authorization.

## EXECUTION

Read-only qualification only:

- repository/GitHub/runtime reconciliation;
- Paperclip plugin list/health;
- Task Drain and current-Core rollback receipt readback;
- company/agent identity and Tool Policies reads;
- exactly one non-consuming/non-auditing Tool Policy qualification;
- exactly one OA `operational-read`.

Not executed:

- PR merge;
- component promotion/recreation;
- custody/attestation overlay activation;
- Fast Read/Semantic/Selector activation;
- Tool Policy/grant/install/Connection/catalog/profile mutation;
- VendaERP tool call;
- customer work/request;
- Human Fast Read;
- Human Send;
- WhatsApp/Gateway outbound.

## VALIDATION

Independent post-readback proved:

- OA remains exactly `0.6.1`, same plugin id, `ready`, `lastError=null`, `healthy=true`;
- Task Drain remains `false / 0 / 0 / quiescent=true`;
- Core remains healthy/restart 0 on exact `b2cff...`;
- Core still reports Fast Read execution OFF, Semantic Fast Read OFF and Human Send OFF;
- Gateway remains healthy/restart 0 with outbound OFF;
- 28PRO issueCounter remains `19`;
- no Tool Policy exists;
- no VendaERP/customer/Human Send/WhatsApp/outbound effect occurred.

## DOCUMENTATION / HARD STOP

Update `docs/WANDORA_PROJECT_SOURCE.md` and `docs/CANONICAL_STATE.md`, then stop.

Do not open the attestation window from this documentation checkpoint. Any future Semantic Fast Read attestation execution is a separate slice with fresh REAL NOW, fresh effect decision, second adversarial review and governed/human authorization.
