# ADR 0312 — Canonical Rollback V2 Root Precheck Execution

Date: 2026-09-27

Status: **ROOT PRECHECK EXECUTED / GREEN / ROLLBACK NOT CAPTURED / ACTIVATION NOT AUTHORIZED**

## Objective

Execute exactly one fresh governed root precheck for the canonical Rollback Freeze V2 through the already deployed ADR 0311 dedicated managed-admin capability, without entering persistent rollback capture and without authorizing any Semantic Fast Read, provider, customer or outbound effect.

This slice does not supersede ADR 0311. ADR 0311 remains the capability-deployment record; this ADR records the separately authorized execution of that capability.

## REAL NOW

Fresh reconciliation immediately before the effect proved:

- Wandora `main/base = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 remained open / draft / mergeable at exact head `3f309cd4e70572a76d0e4f9cbbc35eddfd39f912`;
- all **17/17** workflows for that head completed with `success`;
- the only file changed by that head relative to its parent was documentation (`docs/WANDORA_PROJECT_SOURCE.md`);
- Remote-Ops-MCP current source remained `f408ed420dc8e104c6b105e31d8b093a624523e6`;
- live Remote-Ops image remained `ghcr.io/oaranha/remote-ops-mcp:sha-f408ed4` with matching OCI revision, healthy and restart count 0;
- `wandora-managed-admin` remained enabled and allowed exactly the dedicated administrative program `wandora-rollback-freeze-v2-precheck` in addition to the established baseline;
- `wandora-ops-admin-broker.service` remained active/running with the ADR 0311 drop-in loaded and the same dedicated program in `WANDORA_ADMIN_PROGRAMS`;
- seven Wandora containers were running and healthy;
- Paperclip remained `wandora/paperclip:v2026.916.1`, source `d554c4789ed3930f8a53ac9fdf6503b3187097da`, healthy, restart 0;
- Core remained `wandora/core:organization-adapter-candidate-2c2142237c9c`, revision `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`, healthy, restart 0;
- Organization Adapter readback returned exactly `wandora.organization-adapter-v1@0.5.0`, status `ready`;
- Task Drain was `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- Core startup remained `fastReadExecution=false`, `semanticFastRead=false`, `humanSendProposal=false`;
- active Core Compose contained `compose.semantic-fast-read.yaml` and did not contain the custody or attestation overlays;
- Messaging Gateway remained healthy/restart 0 with `outboundEnabled=false`.

No production correction was attempted. The environment already matched the pinned V2 precheck anchors.

## Capability Authority / Reuse Gate

No new subsystem or authority mechanism was introduced.

- Wandora owns the canonical rollback-precheck contract and byte identity.
- Remote-Ops remains operational authority for managed-admin target authorization, signed one-use approval tickets and root broker execution.
- The existing dedicated ADR 0310/0311 capability was reused exactly as designed.
- No generic shell, sudo, Docker exec, SSH, Python, Node, `env` or alternate execution route was used.

ADR 0168 remains preserved: provider replacement does not imply internalization.

## Decision

Authorize exactly one execution of:

`wandora-rollback-freeze-v2-precheck`

on target:

`wandora-managed-admin`

with **zero caller arguments**.

No other effect was authorized.

The installed entrypoint contract accepts zero arguments, validates the installed root-owned helper and pins helper Git blob:

`849a05971d5f2526b6e8829d5315b4678f169315`

before executing only:

`/usr/bin/bash "$HELPER" --precheck-only`

## Second adversarial review

A fresh JEV guard review was run immediately before prepare/apply.

Result:

- `confirm = 0.74`;
- `allow = 0.11`;
- `deny = 0.09`;
- `review = 0.06`;
- confidence `0.65`.

The review therefore required the already-planned explicit human confirmation before effect.

## Governed approval and execution

Fresh approval prepared:

`adm_754da3e28ac55462fcf60074`

Required confirmation:

`APPROVE adm_754da3e28ac55462fcf60074`

The human supplied that exact confirmation.

`host_admin_apply` executed exactly once and returned:

- `executed=true`;
- program `wandora-rollback-freeze-v2-precheck`;
- `exit_code=0`;
- `timed_out=false`;
- duration `13778 ms`;
- terminal marker:

`ROLLBACK_FREEZE_V2_PRECHECK_OK`

The precheck emitted only the expected safe runtime/custody metadata. Secret values were not displayed.

Observed secret metadata remained:

- TypeSafe: `wandora-admin:wandora-ops 0640 regular file`;
- `wfri1`: `wandora-admin:wandora-ops 0640 regular file`;
- Mistral: `wandora-admin:wandora-ops 0640 regular file`.

The helper also emitted:

- `activation_performed=false`;
- `provider_call_performed=false`;
- `customer_effect=false`;
- `outbound_effect=false`.

## Post-execution validation

Independent post-readback proved:

- `/opt/wandora/ops-workspace/production-rollback-freeze-v2.metadata` is absent from the workspace listing;
- the same seven Wandora containers remain running and healthy;
- Core, Paperclip and Messaging Gateway retained the same container identities, images, start times and restart counts;
- Paperclip remained authenticated/private and healthy;
- Organization Adapter remained exactly `0.5.0 ready`;
- Task Drain remained `false / 0 / 0 / quiescent=true`;
- admin broker remained active/running, same PID, restart count 0.

The no-new-rollback-root property is proven by the exact executed path, not by an authority-widening filesystem probe: the dedicated entrypoint supplies only `--precheck-only`; in the canonical helper the successful precheck branch prints `ROLLBACK_FREEZE_V2_PRECHECK_OK` and executes `exit 0` before the explicit `First write begins here` boundary. The rollback parent/root creation occurs only after that boundary. The invocation returned that marker with exit 0, so it did not reach the rollback-root creation statements.

No extra root read authority was added merely to inspect `/home/wandora-admin/backups`.

## Final state

**ROOT PRECHECK EXECUTED / GREEN / ROLLBACK NOT CAPTURED / ACTIVATION NOT AUTHORIZED**

This GREEN precheck is freshness evidence only.

It does **not** authorize:

- full/no-argument Rollback Freeze V2 capture;
- creation of `production-rollback-freeze-v2.metadata`;
- Semantic Fast Read activation;
- Semantic Selector activation;
- Human Fast Read;
- Human Send;
- Gateway outbound;
- WhatsApp Fast Read;
- VendaERP;
- TypeSafe/Mistral/provider call;
- customer work;
- Paperclip/Core/Organization Adapter mutation.

## Next boundary

Stop here.

The next slice is separate:

**Canonical Rollback V2 Persistent Capture Execution**

It must start from fresh REAL NOW reconciliation and requires a new decision, new second adversarial review, a fresh managed-admin approval if root execution is required, explicit human confirmation, execution, validation and documentation.

Do not reuse `adm_754da3e28ac55462fcf60074`.
