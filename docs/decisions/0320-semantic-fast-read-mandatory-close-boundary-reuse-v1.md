# ADR 0320 — Semantic Fast Read Mandatory-Close Boundary Reuse V1

Date: 2026-09-28

Status: **DECISION COMPLETE / REUSE EXISTING REMOTE-OPS APPROVAL BOUNDARY / NO PRODUCTION EFFECT**

## Objective

Resolve the operational fragility discovered by ADR 0319 before any new Semantic Fast Read production-attestation retry.

ADR 0319 proved that a managed-admin approval prepared before the human browser phase can expire while the human-controlled window is still open. This ADR determines the smallest correct close boundary without weakening Remote-Ops security or introducing a second approval/orchestration subsystem.

This ADR does not open an attestation window, recreate Core, mount custody, call TypeSafe/Mistral/VendaERP, execute Human Fast Read, create customer work, enable Human Send or enable Messaging Gateway outbound.

## REAL NOW

Fresh repository/runtime reconciliation proved:

- PR #369 remains open and draft on `feat/semantic-fast-read-runtime-wiring-v1`;
- source head before this ADR is `c1c13e5f8784e9255fc2d35c566d6928983fff5d`;
- the exact head has 17/17 GREEN workflows;
- Core is healthy on `wandora/core:organization-adapter-candidate-2c2142237c9c`;
- Core digest is `sha256:d3ed5494c03c0720419387befc54f6f6cb124e5407fc619150ecf3dde03dfed7`;
- Core revision is `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`;
- active Core provenance ends at `compose.semantic-fast-read.yaml`;
- custody and attestation overlays are absent;
- Core startup reports `fastReadExecution=false`, `semanticFastRead=false`, `humanSendProposal=false`;
- Paperclip is healthy on `wandora/paperclip:v2026.916.1`;
- Task Drain is `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- Messaging Gateway reports `outboundEnabled=false`;
- Rollback Freeze V2 receipt remains present and matches the current Core/Paperclip/Organization Adapter/Gateway anchors;
- `wandora-ops-admin-broker.service` is active/running with restart count 0;
- Remote-Ops production is healthy on revision `677712aa48b41144df2bdcd285919a5eec2bd7be`.

No production effect occurred during these reads.

## Proven approval semantics

The live Remote-Ops source at the production revision proves:

- `host_admin_prepare` creates an actor-bound approval with `APPROVAL_TTL_MS = 10 * 60_000` (10 minutes);
- `host_admin_apply` consumes that approval only after exact `APPROVE adm_...` confirmation;
- only after consumption is a signed root ticket created;
- the signed managed-admin ticket lifetime is 90 seconds;
- the ticket is target/device/program/argv/cwd/timeout-bound and one-use/replay-protected at the host broker.

The durable capability is therefore **the prepare/apply path itself**, not any individual `adm_...` approval.

The approval prepared during reconciliation under `adm_31e873bb1bd36fd77d1b4e5e` was never applied and authorized no execution. It must not be reused.

## Gaps

The ADR 0319 problem was not absence of a close capability.

The actual failure mode was treating a short-lived approval prepared before the browser phase as if that approval needed to survive for the entire human window.

A close route can remain operationally available without preserving an approval:

1. prove/freeze the exact close operation before opening;
2. keep the persistent managed-admin capability healthy;
3. do not pre-create a close approval;
4. when close is required, prepare a fresh approval for the already-frozen exact close operation;
5. require the user's exact confirmation;
6. apply immediately;
7. perform state-first post-close validation.

## Capability Authority / Reuse Gate

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

Authority remains:

- Wandora owns the Semantic Fast Read product/effect policy and the exact baseline/open/close contract;
- Remote-Ops owns the governed privileged prepare/apply approval boundary, signed ticketing and root broker;
- Docker/Compose own container recreation mechanics;
- the authenticated browser remains user-owned;
- Paperclip/Mastra/TypeSafe/VendaERP remain behind their already-defined provider boundaries.

No evidence justifies:

- extending Remote-Ops approval TTL;
- extending root-ticket TTL;
- creating another Wandora approval system;
- creating a scheduler/watchdog only to close this bounded window;
- introducing generic root shell;
- adding durable close state;
- adding a new table, migration, state machine or orchestration subsystem;
- adding a dedicated close wrapper merely to compensate for a pre-created approval expiring.

A narrow wrapper remains an available future option only if fresh evidence proves the existing exact-command prepare/apply route cannot satisfy the operational close requirement.

## Decision

For the next Semantic Fast Read bounded production-attestation retry:

1. **Before opening**, freeze and independently prove the exact baseline close operation:
   - exact live Core tag/digest/revision;
   - exact pre-attestation Compose chain ending at `compose.semantic-fast-read.yaml`;
   - explicit `WANDORA_CORE_IMAGE` pin equal to the freshly captured live tag;
   - `docker compose ... config --quiet` GREEN;
   - `docker compose ... config --images` resolving exactly to the freshly captured live Core image;
   - close operation limited to recreating only `wandora-core`, with no build, no pull and no dependency recreation.

2. **Do not prepare the close `adm_...` before the browser phase.**

3. Open the attestation window only after all normal fresh gates pass and after separate explicit human authorization.

4. Permit at most one already-authenticated owner/admin Human Fast Read from the user-owned browser.

5. Immediately after that one request, or immediately on any error/ambiguity, call `host_admin_prepare` with the already-frozen exact close operation.

6. Require a new exact user confirmation `APPROVE adm_...`.

7. Apply that approval immediately.

8. Validate state-first:
   - Core healthy/restart 0;
   - exact expected image tag/digest/revision;
   - Compose provenance returned to baseline ending at `compose.semantic-fast-read.yaml`;
   - custody/attestation overlays absent;
   - TypeSafe and `wfri1` mounts absent;
   - `fastReadExecution=false`;
   - `semanticFastRead=false`;
   - `humanSendProposal=false`;
   - Gateway `outboundEnabled=false`;
   - Task Drain quiescent.

No historical approval may be reused.

## Second adversarial review

The initial retry review requested deep review.

After proving the Remote-Ops approval/ticket lifetimes and re-evaluating the reuse boundary, the bounded next path favored continuing with existing capability reuse rather than adding a new subsystem.

The deterministic result is:

**REUSE FRESH PREPARE/APPLY AT CLOSE / DO NOT PRE-CREATE CLOSE APPROVAL / DO NOT CHANGE REMOTE-OPS TTL / DO NOT ADD SCHEDULER OR SECOND APPROVAL SYSTEM.**

## Execution

Documentation/decision only.

No production mutation occurred.

In particular:

- no managed-admin approval was applied;
- no Core recreation;
- no Fast Read/Semantic Selector activation;
- no custody mount;
- no provider/model/VendaERP call;
- no Human Fast Read;
- no customer work;
- no Human Send;
- no WhatsApp;
- no Gateway outbound.

## Next boundary

Treat the next step as:

**Semantic Fast Read Bounded Production Attestation Retry Preflight V1 — NO OPENING YET**

Freshly prove:

- exact PR head + CI;
- Rollback Freeze V2 precheck;
- custody/provider qualification;
- overlay byte identities;
- exact baseline/open/close Compose renders;
- exact live Core tag/digest/revision;
- Task Drain quiescent;
- Human Send OFF;
- Gateway outbound OFF;
- VendaERP read-only policy qualification;
- managed-admin health/capability.

Only then may a separately reviewed and explicitly authorized opening be prepared.
