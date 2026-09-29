# ADR 0308 — Immediate Pre-Mutation Evidence Gap Closure V1

Date: 2026-09-27

Status: **PARTIAL / 2 OF 5 GAPS CLOSED / PRODUCTION ATTESTATION STILL BLOCKED / READ-ONLY / NO PRODUCTION EFFECT**

## Objective

Continue from ADR 0307 without repeating ADRs 0303-0306 and close only freshness-sensitive evidence gaps that can be proven through existing read-only/governed capabilities.

This ADR does not authorize custody mounting, Core recreation, gate activation, Task Drain mutation, provider/model/VendaERP execution, customer Fast Read, Human Send, WhatsApp or outbound.

## REAL NOW

GitHub:

- `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 source head at slice entry = `0274534722f23cb5a7df472885726d2a03f7aac5`;
- PR #369 = open / draft / mergeable;
- exact entry head completed **17/17 workflows GREEN**.

Fresh production:

- Core = `wandora/core:organization-adapter-candidate-2c2142237c9c`;
- Core OCI/image digest = `sha256:d3ed5494c03c0720419387befc54f6f6cb124e5407fc619150ecf3dde03dfed7`;
- Core revision = `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`;
- Core healthy/restart 0;
- active Core composition includes `compose.semantic-fast-read.yaml` and excludes custody/attestation overlays;
- Fast Read Execution OFF;
- Semantic Fast Read OFF;
- Semantic Selector OFF;
- Human Send OFF;
- Paperclip = `wandora/paperclip:v2026.916.1`, image `sha256:7b72d43e87d54fcb9aa48b665150e062750c0cacb270e069f94297d58caa91e5`, commit `d554c4789ed3930f8a53ac9fdf6503b3187097da`, healthy/restart 0;
- exactly one Organization Adapter `0.5.0`, same plugin id `86e77fe7-c7e4-4bee-afa3-46cdad575d0c`, ready/lastError null;
- Task Drain = `false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- Messaging Gateway healthy/restart 0 and outbound remains OFF;
- current 28PRO Tool Policies = `[]`.

No production effect occurred in this slice.

## Gap 1 — Fresh secret metadata

**OPEN.**

Historical qualified custody evidence still proves these paths were regular files owned by `wandora-admin:wandora-ops` with mode `0640`:

- `/opt/wandora/stacks/core/secrets/wandora_typesafe_jev_api_key`;
- `/opt/wandora/stacks/core/secrets/wandora_fast_read_intent_hmac`;
- `/opt/wandora/stacks/core/secrets/wandora_model_provider_api_key`.

However ADR 0306 requires freshness-sensitive immediate pre-mutation evidence.

Fresh target reconciliation proves:

- normal `wandora-agent` secret paths remain outside readable allowlists;
- `wandora-managed-admin` exposes `host.managed_admin`, but its current `allowedAdminPrograms` does **not** include `stat` or `ls`;
- the retained ADR 0299 root precheck does contain the correct metadata-only `stat` pattern, but it is hard-pinned to the obsolete v916.0/Core-f322/OA-0.3.1 baseline and cannot be reused as current proof.

No permission widening, shell bypass or secret-value read was attempted.

## Gap 2 — Exact VendaERP Connection/grant authorization

**CLOSED for authorization policy.**

Fresh governed `paperclip_tool_policy_test` was executed with forced `consumeRateLimit=false` and `writeAuditEvent=false` against:

- company = `5d7ec217-118c-4292-8136-0a9ab16926ea` (28PRO);
- Ana = `428b6730-3df4-4b92-b90a-a87f87c401f9`;
- Connection = `8e2c23f4-73f5-444a-8647-71428819ea91`;
- Catalog Entry = `165fcdca-8021-41dd-90e5-f0f143adeac3`;
- tool = `vendaerp_search_products`;
- arguments = `{pageSize:5, skip:0}`;
- sideEffecting = `false`.

Result:

- `decision=allow`;
- `reasonCode=allow_profile`;
- effective profile = `259a5449-58ba-4d59-9774-92612e3caa91`;
- matched temporary policy ids = `[]`;
- audit event = `null`.

This proves current Paperclip authorization for the exact bounded read without consuming rate limit or calling VendaERP.

It does not itself execute or health-probe the external provider.

## Gap 3 — Ana current error state / issue-less Fast Read invokability

**CLOSED.**

Fresh Paperclip runtime state:

- Ana status = `error`;
- last run = `d7cc89a3-2ea6-4a30-bb79-b0cb7105726b`;
- last run status = `failed`;
- last error = `wandora_execution_failed_422`;
- session id = null;
- task sessions = `[]`;
- organization chain health = healthy.

Exact Paperclip `v2026.916.1@d554c478...` source proves this status does not block a new invocation.

`packages/shared/src/agent-eligibility.ts` explicitly defines:

- invokable statuses = `active`, `idle`, `running`, `error`;
- non-invokable statuses = `terminated`, `pending_approval`, `paused`.

`server/src/services/agent-invokability.ts` and `heartbeat.ts` enforce that boundary before enqueue/execution and atomically transition an invokable agent to `running` at execution start.

Therefore Ana's current `error` projection is historical failure evidence, not a lifecycle block for a new issue-less Fast Read.

No recovery/resume/wakeup was executed.

## Gap 4 — Legitimate authenticated owner/admin trigger

**OPEN.**

The Core Human Fast Read route derives `actorUserId` only from `getSessionContext(Authorization: Bearer ...)`.

The Organization Adapter then requires an active organization membership whose role is exactly `owner` or `admin`.

The operator/Remote-Ops context does not hold a current legitimate 28PRO owner/admin browser Bearer and must not impersonate the human actor.

No operator shortcut is justified.

## Gap 5 — Immediately current rollback readiness

**OPEN.**

The retained protected receipt ends in `ROLLBACK_FREEZE_V1_OK`, but its anchors are:

- Paperclip `v2026.916.0`;
- Core `organization-adapter-candidate-f3225586d082`;
- Organization Adapter `0.3.1`.

Current runtime is:

- Paperclip `v2026.916.1`;
- Core `organization-adapter-candidate-2c2142237c9c`;
- Organization Adapter `0.5.0`.

Therefore the historical receipt is valid historical recovery evidence but is **not** the immediately-current rollback capture required by ADR 0306.

Creating a new protected rollback bundle is a separate host write/effect and is intentionally outside this READ-ONLY slice.

## Capability Authority / Reuse Gate

No new Wandora subsystem is required.

- Wandora remains semantic/effect authority.
- Paperclip remains lifecycle/run/Connection/grant/secret/Tool Gateway/audit authority.
- TypeSafe/System One remains semantic provider.
- Mastra/Mistral remains selector/runtime provider.
- VendaERP remains replaceable Business System implementation.
- Remote-Ops remains the governed operator boundary and must not be widened for convenience.

The retained ADR 0299 helper pattern may be reused/adapted only through a separately reviewed effect/preflight. Do not create a second backup system or secret manager.

## Decision

**PRODUCTION ATTESTATION REMAINS BLOCKED.**

Evidence closure improved from five open gaps to three:

- CLOSED: exact VendaERP policy authorization;
- CLOSED: Ana `error`-state invokability;
- OPEN: fresh secret metadata;
- OPEN: legitimate owner/admin Human trigger;
- OPEN: current rollback capture.

No effect authorization is issued.

## Second adversarial review

The first advisory call failed with a transient transport `fetch failed` and produced no effect. It was retried once with the same narrowed decision question.

Successful review:

- `block = 0.92`;
- `deep_review = 0.08`;
- `proceed_fast = 0.00`;
- `split_task = 0.00`.

This reinforces the deterministic stop condition while three mandatory freshness-sensitive gaps remain.

## Production boundary

This slice performed:

- production deploy = 0;
- container recreation = 0;
- Compose mutation = 0;
- secret mount/read-value = 0;
- Task Drain mutation = 0;
- Tool Policy mutation = 0;
- provider/model/VendaERP call = 0;
- customer Fast Read = 0;
- Human Send = 0;
- WhatsApp/outbound = 0.

## Next

The next executable work must close the remaining three gaps without conflating them:

1. qualify an already-authorized metadata-only operator path for fresh TypeSafe/`wfri1`/Mistral stat;
2. establish a legitimate authenticated 28PRO owner/admin trigger boundary without exporting or impersonating credentials;
3. separately review and explicitly authorize a fresh rollback capture for the current v916.1/Core-2c214/OA-0.5.0 state.

Only after those three are complete may a brand-new Immediate Pre-Mutation Attestation + Effect Authorization be performed. ADR 0308 must not be reused as an activation authorization.
