# ADR 0313 — Canonical Rollback V2 Persistent Capture Execution V1

Date: 2026-09-27

Status: **BLOCKED BEFORE PREPARE / DEDICATED PERSISTENT-CAPTURE AUTHORITY ABSENT / ROLLBACK NOT CAPTURED / NO PRODUCTION EFFECT**

## Objective

Continue from the GREEN ADR 0312 root precheck and authorize the canonical Rollback Freeze V2 persistent capture only if fresh repository, CI, runtime, custody and operational-authority evidence all remain GREEN.

This slice does not authorize Semantic Fast Read activation, provider/model calls, VendaERP, customer work, Human Send, WhatsApp or outbound.

## REAL NOW

Fresh reconciliation proved:

- Wandora `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 remains open / draft / mergeable on `feat/semantic-fast-read-runtime-wiring-v1`;
- exact source head is `170db931f4ae59409a354d6cc59ec50b23143716`;
- all **17/17** workflows on that exact head completed successfully, with zero pending/failing runs;
- Remote-Ops source/live remain aligned at `f408ed420dc8e104c6b105e31d8b093a624523e6` / `ghcr.io/oaranha/remote-ops-mcp:sha-f408ed4`;
- all seven Wandora containers are running and healthy;
- Paperclip remains `wandora/paperclip:v2026.916.1`, authenticated/private, source commit `d554c4789ed3930f8a53ac9fdf6503b3187097da`, restart count 0;
- Paperclip effective Compose remains base + execution bridge + semantic Fast Read candidate;
- Core remains `wandora/core:organization-adapter-candidate-2c2142237c9c`, revision `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`, restart count 0;
- Core effective Compose contains `compose.semantic-fast-read.yaml` and excludes custody/attestation overlays;
- the live semantic Fast Read overlay explicitly keeps Fast Read Execution, Semantic Fast Read, Semantic Selector and Human Send `false`;
- Messaging Gateway remains healthy with `outboundEnabled=false`;
- exactly one `wandora.organization-adapter-v1@0.5.0` is installed, `ready`, `lastError=null`;
- Task Drain remains `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- `wandora-ops-admin-broker.service` remains active/running with restart count 0.

## Canonical helper and receipt

The canonical helper remains:

`scripts/operations/production-rollback-freeze-v2.sh`

Git blob:

`849a05971d5f2526b6e8829d5315b4678f169315`

Fresh host readback of:

`/opt/wandora/ops-workspace/production-rollback-freeze-v2.sh`

returned the same Git blob, and a fresh non-root `bash -n` exited 0.

The V2 receipt remains absent:

`/opt/wandora/ops-workspace/production-rollback-freeze-v2.metadata`

The canonical no-argument mode passes the common read-only prechecks and then crosses the explicit `First write begins here` boundary. On success it must publish the receipt above and emit:

`ROLLBACK_FREEZE_V2_OK`

## Custody evidence

ADR 0312's last governed root precheck proved the expected TypeSafe / `wfri1` / Mistral metadata:

- owner `wandora-admin`;
- group `wandora-ops`;
- mode `0640`;
- regular file.

This slice did **not** repeat a root precheck merely to refresh that evidence. The currently exposed operator schema has no separate metadata-only secret-stat capability, and no authority widening or extra root call is justified while the persistent-capture execution boundary itself is blocked. Fresh custody metadata therefore remains a precondition to be re-proven by the eventually qualified capture boundary immediately before its first write.

No secret value was read or exposed.

## Capability Authority / Reuse Gate

The capture mechanism itself is already Wandora-owned and canonical. No new backup subsystem, secret manager, lifecycle, registry or orchestration is justified.

Operational root execution remains owned by the existing Remote-Ops managed-admin boundary.

Fresh authority readback proves:

- `wandora-managed-admin` exposes `host.managed_admin`;
- its administrative allowlist contains the dedicated zero-argument program `wandora-rollback-freeze-v2-precheck`;
- it does **not** contain `bash`, `sh` or a dedicated persistent-capture program;
- the current repository contains the dedicated managed-admin **precheck** wrapper, but no dedicated managed-admin persistent-capture wrapper/program;
- the deployed precheck program is intentionally fixed to `--precheck-only` and exits before the first-write boundary.

Therefore the ADR 0312 capability cannot be reused for persistent capture, and using generic root shell/sudo/Docker/SSH/interpreter authority would widen or bypass the accepted operational boundary.

ADR 0168 remains preserved: this is an authority-boundary gap, not evidence for a new Wandora subsystem.

## Decision

**STOP BEFORE PREPARE.**

Do not call `host_admin_prepare` for persistent capture with the current authority.

Do not reuse `adm_754da3e28ac55462fcf60074`.

Do not reinterpret the precheck capability as capture authority.

Do not enable generic `bash` / `sh` / `sudo` merely to run the helper.

The missing capability must be resolved as a separate, narrow managed-admin capability-governance/deployment slice before persistent capture can be prepared.

## Second adversarial review

A fresh JEV review was run after the Reuse Gate and before any prepare/effect.

Result:

- `block = 0.98`;
- `split_task = 0.02`;
- `proceed_fast = 0.00`;
- `deep_review = 0.00`;
- confidence `0.97`.

The review supports blocking the capture rather than bypassing the existing managed-admin boundary.

## Effect validation

No `host_admin_prepare` was issued.

No `adm_...` approval was created.

No `host_admin_apply` ran.

No rollback root or V2 receipt was created.

No Compose/container/secret/Task Drain/policy mutation occurred.

No Fast Read/Semantic Selector/Human Send/Gateway outbound gate was enabled.

No TypeSafe, Mistral, VendaERP or other provider call occurred.

No customer or outbound effect occurred.

## Next boundary

The next slice is **Managed-Admin V2 Persistent Capture Capability Governance V1 — CAPABILITY ONLY / NO CAPTURE**.

It must first investigate/reuse the narrowest existing Remote-Ops primitive. If a new named administrative program is truly required, qualify it separately so the caller receives no generic shell authority, deploy/validate it in a separate capability-only slice, and stop before capture execution.

Only after that capability is live may **Canonical Rollback V2 Persistent Capture Execution** restart from fresh state and proceed through:

`fresh state → decision → second adversarial review → prepare → new adm_... → explicit APPROVE adm_... → apply → validation → documentation`.
