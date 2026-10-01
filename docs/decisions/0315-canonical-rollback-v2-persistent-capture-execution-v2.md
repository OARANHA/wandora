# ADR 0315 — Canonical Rollback V2 Persistent Capture Execution V2

Date: 2026-09-28

Status: **PERSISTENT CAPTURE EXECUTED + VALIDATED / ROLLBACK V2 READY / ACTIVATION NOT AUTHORIZED / NO PROVIDER/CUSTOMER/OUTBOUND EFFECT**

## Objective

Execute exactly one canonical Rollback Freeze V2 persistent capture through the already-deployed ADR 0314 managed-admin named capability, only after fresh repository/CI/runtime reconciliation, Capability Authority / Reuse Gate, a new decision, a new second adversarial review and explicit human approval.

This slice does not authorize Semantic Fast Read activation, Semantic Selector activation, Human Send, Gateway outbound, WhatsApp, VendaERP, provider/model calls or customer work.

## REAL NOW

Fresh reconciliation immediately before prepare proved:

- Wandora `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 remained open / draft / mergeable on `feat/semantic-fast-read-runtime-wiring-v1`;
- exact pre-capture head was `22613dcb92d913649d4c5ae79583ce11b6c67d07`;
- all **17/17** workflows on that exact head completed successfully, with zero pending/failing runs and no rerun;
- Remote-Ops health was `status=ok`, OAuth, non-mock;
- live Remote-Ops image remained `ghcr.io/oaranha/remote-ops-mcp:sha-f408ed4`, OCI revision `f408ed420dc8e104c6b105e31d8b093a624523e6`;
- `wandora-managed-admin` exposed `host.managed_admin` and allowed both dedicated programs `wandora-rollback-freeze-v2-precheck` and `wandora-rollback-freeze-v2-capture`;
- generic `bash` / `sh` remained outside `allowedAdminPrograms`;
- admin broker was active/running at PID `2368034`, restart count 0;
- ops agent was active/running at PID `1705827`, restart count 0;
- seven Wandora containers were running/healthy;
- Paperclip remained `wandora/paperclip:v2026.916.1`, source `d554c4789ed3930f8a53ac9fdf6503b3187097da`, authenticated/private;
- Core remained `wandora/core:organization-adapter-candidate-2c2142237c9c`, revision `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`;
- exactly one `wandora.organization-adapter-v1@0.5.0` was installed, `ready`, `lastError=null`;
- Core startup still reported `fastReadExecution=false`, `semanticFastRead=false`, `humanSendProposal=false`;
- Messaging Gateway remained healthy with `outboundEnabled=false`;
- Task Drain was `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- the V2 receipt `/opt/wandora/ops-workspace/production-rollback-freeze-v2.metadata` was absent before capture.

## Exact governed capability

Live capture wrapper:

`/usr/local/sbin/wandora-rollback-freeze-v2-capture`

Fresh pre-execution readback proved:

- owner/group `root:root`;
- mode `0755`;
- regular non-symlink file;
- Git blob `f693cc0f0e34258fcdf10d7616f92f1ff1d48758`, equal to the exact repository source at the pre-capture head.

Live canonical helper:

`/usr/local/libexec/wandora/production-rollback-freeze-v2.sh`

Fresh non-root metadata readback proved `root:root 0750`, regular non-symlink. Non-root rehash is intentionally denied by custody. The exact wrapper itself rehashes the helper as root and fail-closes unless it equals canonical Git blob:

`849a05971d5f2526b6e8829d5315b4678f169315`

It then runs `bash -n` and executes only the helper's zero-argument persistent mode.

The live broker drop-in remained exact Git blob:

`7bcda5c69048190b242d2895a206d96537be0a3c`

## Capability Authority / Reuse Gate

No new backup subsystem, secret manager, lifecycle engine, orchestration subsystem, approval system, root broker or provider capability was created.

Authority remains separated:

- Wandora owns the canonical rollback-capture contract, required anchors and safe receipt semantics;
- Remote-Ops remains operational root-execution authority through `host_admin_prepare -> actor-bound signed one-use ticket -> Agent Mesh -> root broker -> exact program`;
- Paperclip remains operational authority for its native backup/runtime state;
- Supabase/PostgreSQL, Paperclip, Core and provider implementations remain behind their existing boundaries.

ADR 0168 remains preserved: portability is contract decoupling, not implementation duplication.

## Decision

Authorize only one execution of:

`wandora-rollback-freeze-v2-capture`

on:

`wandora-managed-admin`

with zero caller arguments.

No Semantic Fast Read activation or other product/provider/customer/outbound effect is part of this decision.

## Second adversarial review

A fresh JEV 1.13.0 guard review was run after the Reuse Gate and immediately before prepare.

Result:

- `confirm = 0.86`;
- `deny = 0.09`;
- `allow = 0.05`;
- `review = 0.00`;
- confidence `0.81`.

The result supported proceeding only behind the already-required explicit human confirmation.

## Governed approval and execution

Fresh approval prepared:

`adm_cccf18ab2668c5e094cee2be`

Required confirmation:

`APPROVE adm_cccf18ab2668c5e094cee2be`

The human supplied that exact confirmation.

`host_admin_apply` was called exactly once.

Execution returned:

- `executed=true`;
- program `wandora-rollback-freeze-v2-capture`;
- `exit_code=0`;
- `timed_out=false`;
- duration `39363 ms`;
- empty stderr;
- terminal marker `ROLLBACK_FREEZE_V2_OK`;
- safe receipt path `/opt/wandora/ops-workspace/production-rollback-freeze-v2.metadata`;
- `activation_performed=false`;
- `provider_call_performed=false`;
- `customer_effect=false`;
- `outbound_effect=false`.

There was no timeout, disconnect or ambiguous result, so no retry occurred.

## Safe receipt validation

Independent readback of the V2 receipt proved:

- rollback root recorded as `/home/wandora-admin/backups/paperclip-v9161-fast-read-rollback-freeze-v2-20260928T052105633252879Z`;
- Paperclip image, image id, commit, health, restart count and active Compose anchors match the pre-capture runtime;
- Core image, image id, revision, health, restart count and active Compose anchors match the pre-capture runtime;
- Messaging Gateway image, image id, health and restart count match the pre-capture runtime;
- exactly one Organization Adapter was captured at `0.5.0 / ready`;
- semantic Fast Read gates were captured OFF;
- custody and attestation overlays were captured absent;
- Task Drain was captured quiescent;
- official Paperclip backup was created and gzip validation passed;
- disposable PostgreSQL restore succeeded;
- restored schema equality passed;
- TypeSafe, `wfri1` Fast Read Intent HMAC and Mistral credential metadata remained regular files owned by `wandora-admin:wandora-ops`, mode `0640`;
- no secret value was exposed;
- receipt terminal marker is `ROLLBACK_FREEZE_V2_OK`;
- receipt records all four forbidden side-effect flags as `false`.

## Post-execution runtime validation

Fresh post-capture reconciliation proved:

- all seven Wandora containers remain running/healthy;
- Core remains on the same container/image and startup gates remain `fastReadExecution=false`, `semanticFastRead=false`, `humanSendProposal=false`;
- Paperclip remains healthy on v2026.916.1;
- exactly one Organization Adapter remains `0.5.0 / ready / lastError=null`;
- Messaging Gateway remains healthy with `outboundEnabled=false`;
- Remote-Ops remains healthy on unchanged `sha-f408ed4`;
- Task Drain remains `false / 0 / 0 / quiescent=true`;
- admin broker remains active/running at PID `2368034`, restart count 0;
- ops agent remains active/running at PID `1705827`, restart count 0.

No Fast Read, Semantic Selector, Human Send, Gateway outbound, WhatsApp, VendaERP, TypeSafe/Mistral/model/provider call or customer work was activated by this slice.

## Final state

**PERSISTENT CAPTURE EXECUTED + VALIDATED / ROLLBACK V2 READY / ACTIVATION NOT AUTHORIZED**

The canonical rollback evidence now exists and has been independently read back.

This ADR does not authorize the next production effect.

## Next boundary

Stop here.

Any Semantic Fast Read or other production activation must begin as a new slice from fresh:

`REAL NOW -> PROVEN EVIDENCE -> GAPS -> CAPABILITY AUTHORITY / REUSE GATE -> DECISION -> SECOND ADVERSARIAL REVIEW -> EXECUTION -> VALIDATION -> DOCUMENTATION`

The next activation-oriented slice must perform a fresh immediate pre-mutation attestation and separate effect authorization. It must not reuse `adm_cccf18ab2668c5e094cee2be` or treat this rollback capture as activation authority.
