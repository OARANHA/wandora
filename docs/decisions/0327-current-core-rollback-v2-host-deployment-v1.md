# ADR 0327 — Current-Core Rollback V2 Host Deployment V1

Date: 2026-09-29

Status: **EXACT BYTES DEPLOYED + HASH VALIDATED / ROOT PRECHECK NOT EXECUTED / CURRENT-CORE RECEIPT ABSENT / HISTORICAL RECEIPT PRESERVED / ACTIVATION NOT AUTHORIZED**

## Objective

Deploy only the already-qualified Rollback V2 helper and existing precheck/capture wrappers for the corrected production Core baseline `b2cffbb54089212844ef177827e7a616b1008144`, then stop before root precheck or persistent capture.

## Entry evidence

PR #369 exact head `93c5127a0f9e7d085de9445bb3250be3fbda5b43` was open / draft / mergeable and completed **17/17 workflows GREEN**, zero failures.

Fresh runtime reconciliation immediately before deployment proved:

- Core = `wandora/core:organization-adapter-candidate-b2cffbb54089`;
- Core image id = `sha256:15a2eca7f74c4e6f7f6ea07bb461d6b711dffd0a70807a3f8e7773f6e6a27c49`;
- Core revision = `b2cffbb54089212844ef177827e7a616b1008144`;
- Core healthy, restart count 0, gates-OFF baseline;
- Fast Read Execution OFF;
- Semantic Fast Read OFF;
- Human Send OFF;
- Gateway outbound OFF;
- Task Drain = `false / 0 / 0 / quiescent=true`;
- `wandora-managed-admin` still exposed only the existing dedicated Rollback V2 programs.

The historical safe receipt `/opt/wandora/ops-workspace/production-rollback-freeze-v2.metadata` remained present and still anchored Core `2c214223...`. The new current-Core receipt `/opt/wandora/ops-workspace/production-rollback-freeze-v2-b2cffbb54089212844ef177827e7a616b1008144.metadata` remained absent.

## Reuse Gate

ADR 0168 remained binding. No new root program, backup subsystem, approval mechanism, registry entry, shell authority, service, scheduler, lifecycle layer or provider implementation was introduced.

The existing managed-admin `install` authority was reused only to place the exact already-qualified bytes at their existing canonical paths.

## Second adversarial review

The deployment-only action was reviewed with:

- exact-head CI GREEN;
- exact staged Git-blob identity;
- no service restart;
- no registry mutation;
- no precheck/capture invocation;
- historical receipt preservation;
- explicit post-deployment byte validation.

The review returned `confirm=0.46`, `allow=0.27`, `review=0.16`, `deny=0.11`, confidence `0.29`. Human confirmation was therefore required through the existing managed-admin approval boundary.

## Exact-byte staging

A new non-root workspace directory was used:

`/opt/wandora/ops-workspace/adr0326-current-core-rollback-v2-deployment`

Fresh non-root readback proved:

- helper Git blob = `0f09289c5969cd3ddd407cc588f98648635026e3`;
- precheck wrapper Git blob = `0574222f66180af507198f26597aa903571e6770`;
- capture wrapper Git blob = `37a8d3468d9ff32c022e98a88706bb8450209be9`;
- all three `bash -n` checks succeeded.

## Deployment

Two separately prepared approvals were explicitly approved by the human and applied once:

- `adm_02cae96b24096b377226802d` installed only the helper with requested `root:root 0750`;
- `adm_c4f27f6123dce029a4d6a654` installed only the two wrappers with requested `root:root 0755`.

Both `install` executions returned `exit_code=0`, no timeout, no stderr.

No service restart, registry mutation, container recreation, precheck, capture, provider call, customer effect or outbound effect occurred.

## Installed-byte validation

A separate read-only approval `adm_3a601c320982ddd9e098eda7` executed only:

`git hash-object --no-filters`

against the three installed root files.

Readback matched the qualified Git blobs exactly:

- `/usr/local/libexec/wandora/production-rollback-freeze-v2.sh` = `0f09289c5969cd3ddd407cc588f98648635026e3`;
- `/usr/local/sbin/wandora-rollback-freeze-v2-precheck` = `0574222f66180af507198f26597aa903571e6770`;
- `/usr/local/sbin/wandora-rollback-freeze-v2-capture` = `37a8d3468d9ff32c022e98a88706bb8450209be9`.

## Post-deployment runtime

Fresh post-deployment readback kept:

- Core healthy and unchanged;
- Fast Read Execution OFF;
- Semantic Fast Read OFF;
- Human Send OFF;
- Gateway `outboundEnabled=false`;
- Task Drain `false / 0 / 0 / quiescent=true`;
- historical V2 receipt intact;
- new `b2cff...` receipt absent.

## Result

**EXACT BYTES DEPLOYED + VALIDATED / PRECHECK NOT EXECUTED / CAPTURE NOT EXECUTED / HISTORICAL EVIDENCE PRESERVED.**

This deployment does not establish current-Core Rollback V2 readiness by itself. The next effect is the dedicated root precheck, requiring fresh exact-head CI, fresh runtime reconciliation, fresh decision, fresh second adversarial review and fresh one-use approval. Persistent capture remains a later separately approved effect.

Semantic Fast Read attestation remains prohibited.
