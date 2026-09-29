# ADR 0344 — Current Vigia Core Rollback V2 Requalification + Host Deployment + Root Precheck V1

Date: 2026-09-29

Status: **SOURCE REQUALIFIED / EXACT BYTES DEPLOYED + HASH VALIDATED / ROOT PRECHECK GREEN / PERSISTENT CAPTURE NOT EXECUTED / CORE PROMOTION NOT AUTHORIZED**

## Objective

Requalify the existing Rollback Freeze V2 mechanism for the current production Core baseline after the Vigia promotion, deploy only the already-qualified helper/wrapper bytes through the existing managed-admin authority, execute the separate root precheck, and stop before persistent capture or any Core promotion.

ADR 0168 remains binding: this slice reuses the existing rollback implementation, program names, managed-admin approval boundary and Docker/Paperclip authorities. No new backup subsystem, approval system, orchestration layer, generic root shell or provider implementation was introduced.

## REAL NOW

At the validated checkpoint:

- current `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 head = `92efed2fc1294413f4a142c589023c88f0c71247`;
- exact PR head completed **17/17 workflows GREEN**;
- production Core = `wandora/core:organization-adapter-candidate-e4c7c36bb109`;
- Core image id / OCI manifest digest = `sha256:ee5db7ffa1114b78670e713f374801730ab556d33a02183e19ef87742c121846`;
- Core revision = `e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- Core healthy / restart count 0;
- active Core Compose provenance includes the gates-OFF Semantic Fast Read overlay, agent-runtime model overlay and current Vigia overlay;
- custody and attestation overlays are absent;
- Paperclip = `wandora/paperclip:v2026.916.1`, image id `sha256:7b72d43e87d54fcb9aa48b665150e062750c0cacb270e069f94297d58caa91e5`, commit `d554c4789ed3930f8a53ac9fdf6503b3187097da`, healthy / restart 0;
- exactly one Organization Adapter `0.6.1` is `ready`, `lastError=null`, package path `/paperclip/operator-packages/wandora-organization-adapter-v1/80373a61f08d87772c3aab738ffa6905bddcb49c783e9574c1540247cb3b258f/package`;
- Messaging Gateway healthy / restart 0 / outbound disabled;
- Task Drain = `false / 0 / 0 / quiescent=true`.

The current e4c7 rollback receipt remains absent:

`/opt/wandora/ops-workspace/production-rollback-freeze-v2-e4c7c36bb1091ba38d39b85fa259bae94553fc52.metadata`

Historical receipts for the earlier `2c214...` and `b2cff...` baselines remain preserved.

## Why requalification was required

The installed Rollback Freeze V2 helper was still pinned to the earlier `b2cff...` Core and Organization Adapter `0.5.0`. Production had since moved to `e4c7...` with Vigia and OA `0.6.1`.

Using the stale helper as current readiness evidence would have been invalid. The accepted ADR 0326 pattern was therefore reused: same mechanism, new baseline-specific pins and immutable receipt/root names, historical evidence preserved.

## Source requalification

Repository commit:

`bf3b23a59a1a327213941c9b7f4359b3624cd3aa`

updated atomically:

- `scripts/operations/production-rollback-freeze-v2.sh`;
- `scripts/operations/managed-admin-production-rollback-freeze-v2-precheck.sh`;
- `scripts/operations/verify-managed-admin-production-rollback-freeze-v2-precheck.mjs`;
- `scripts/operations/managed-admin-production-rollback-freeze-v2-capture.sh`;
- `scripts/operations/verify-managed-admin-production-rollback-freeze-v2-capture.mjs`;
- `.github/workflows/semantic-fast-read-ci.yml`.

A syntax defect limited to the two JavaScript verifiers was detected by CI before any host deployment and fixed in:

`92efed2fc1294413f4a142c589023c88f0c71247`

No runtime mutation occurred from the failed CI head.

The corrected exact head completed **17/17 workflows GREEN**.

The requalified helper pins:

- Core tag `wandora/core:organization-adapter-candidate-e4c7c36bb109`;
- Core image id `sha256:ee5db7ffa1114b78670e713f374801730ab556d33a02183e19ef87742c121846`;
- Core revision `e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- OA version `0.6.1`;
- OA package path `80373a61.../package`;
- new receipt `production-rollback-freeze-v2-e4c7c36bb1091ba38d39b85fa259bae94553fc52.metadata`;
- new rollback-root prefix `paperclip-v9161-fast-read-rollback-freeze-v2-e4c7c36bb109-`;
- current Vigia overlay presence;
- Vigia custody metadata only, without reading or printing the secret value.

## Host deployment

Exact staged Git blobs:

- helper = `e42cf63fda168ea3d3efd0bfc80f8d8bd4550d9d`;
- precheck wrapper = `0f08e0a253d075af522ce6db68cfa160f2baf53e`;
- capture wrapper = `fb25a63a16e03f3347cea1c069f8b771c0656a21`.

All staged files passed `bash -n`.

After fresh second adversarial review and explicit human approvals, the existing managed-admin `install` authority deployed:

- helper to `/usr/local/libexec/wandora/production-rollback-freeze-v2.sh` as root:root 0750;
- wrappers to `/usr/local/sbin/wandora-rollback-freeze-v2-precheck` and `/usr/local/sbin/wandora-rollback-freeze-v2-capture` as root:root 0755.

Independent root readback with `git hash-object --no-filters` matched all three qualified blobs exactly.

No service restart, container recreation, registry mutation, precheck/capture, provider call, customer effect or outbound effect occurred during deployment.

## Root precheck

Fresh precheck entry state revalidated exact-head CI, runtime identities, OA, Task Drain, historical receipts and absence of the new e4c7 receipt.

The first adversarial review blocked because the freshness evidence was incomplete. After filling the missing Paperclip/Gateway/restart/receipt evidence, the second review allowed the bounded precheck path.

A fresh human-approved one-use managed-admin ticket executed only:

`wandora-rollback-freeze-v2-precheck`

Result:

- `executed=true`;
- `exit_code=0`;
- `timed_out=false`;
- terminal marker = `ROLLBACK_FREEZE_V2_PRECHECK_OK`;
- `activation_performed=false`;
- `provider_call_performed=false`;
- `customer_effect=false`;
- `outbound_effect=false`.

The precheck proved:

- exact Paperclip image/id/commit/Compose set;
- exact Core image/id/revision/Compose provenance;
- OA `0.6.1` ready at the expected package path;
- Task Drain quiescent;
- TypeSafe, wfri1 and Mistral custody metadata valid;
- Vigia custody metadata valid as `wandora-exec:wandora-ops 0640 regular file`;
- no custody/attestation overlay live;
- all guarded effect flags false-or-absent;
- local PostgreSQL recovery-image and embedded database read path qualified;
- schema-only probe succeeded.

## Post-precheck validation

Fresh readback after precheck proved:

- same Core container id and start time;
- same Core image/digest/revision;
- Core healthy / restart 0;
- Paperclip healthy;
- Gateway healthy;
- Task Drain `false / 0 / 0 / quiescent=true`;
- new e4c7 receipt still absent.

Therefore the precheck stopped before the first persistent write boundary exactly as designed.

## Decision

Classify the current e4c7/OA0.6.1/Vigia Rollback Freeze V2 **root precheck as GREEN**.

Persistent capture remains a separate effect. Core promotion to the combined Vigia + Semantic Fast Read candidate remains unauthorized until a fresh capture decision, second adversarial review, one-use human approval, successful receipt validation, and a later separate promotion decision.

## Effect boundary

Not executed in this slice:

- persistent Rollback V2 capture;
- new rollback root or current-baseline receipt creation;
- Core image promotion;
- Core restart/recreation;
- Semantic Fast Read opening;
- provider or customer read;
- VendaERP tool execution;
- Human Send;
- Messaging Gateway outbound;
- WhatsApp/outbound.

## Next boundary

Next slice:

**Current Vigia Core Rollback V2 Persistent Capture V1**

It must begin from fresh exact-head CI/runtime reconciliation, prove the e4c7 receipt remains absent, make an explicit capture decision, perform a new second adversarial review, require a fresh one-use managed-admin approval, execute the existing zero-argument capture capability once, validate the receipt independently, and stop before Core promotion.
