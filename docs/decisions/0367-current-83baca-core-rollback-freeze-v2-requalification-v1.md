# ADR 0367 — Current 83baca Core Rollback Freeze V2 Requalification V1

Date: 2026-10-01

Status: **GREEN / CURRENT-BASELINE ROLLBACK FREEZE V2 READY / ALL FAST-READ + OUTBOUND EFFECT GATES OFF / NO CUSTOMER EFFECT**

## Objective

Requalify the existing Rollback Freeze V2 mechanism for the production-live corrected Core `83baca...` baseline before any later supervised Semantic Fast Read re-attestation.

ADR 0168 remains binding. This slice repins and reuses the existing rollback mechanism only. It does not create a new backup subsystem, lifecycle authority, provider mirror, retry engine, state machine, table, migration or service.

## Real-now baseline

Immediately before execution:

- PR #369 branch: `feat/semantic-fast-read-runtime-wiring-v1`;
- source head: `c7ea371db4b085d81457388ad68bac2eeb161008`;
- exact-head workflows: **17/17 GREEN**;
- production Core image: `wandora/core:organization-adapter-candidate-83baca411096`;
- Core image id: `sha256:f8f09f785ed2b1f8fd86c9b9120c8ba09956d8f30b239190b93a110efd462d7f`;
- Core revision: `83baca4110966989b484341b5c58bb42d1eb5407`;
- Paperclip: `wandora/paperclip:v2026.916.1`;
- external `wandora_mastra@0.6.0` loaded/enabled;
- Core, Paperclip and Messaging Gateway healthy;
- Task Drain `false / 0 / 0 / quiescent=true`;
- Fast Read OFF;
- Semantic Fast Read OFF;
- Human Send OFF;
- Messaging Gateway outbound OFF.

No second Ana/VendaERP request was authorized during this slice.

## Reuse gate and exact programs

The existing canonical programs were repinned for the current Core baseline.

Qualified Git blobs:

- helper `scripts/operations/production-rollback-freeze-v2.sh`: `83246ac1310a47c7e17a492fb76a4e4d886351e6`;
- precheck wrapper `scripts/operations/managed-admin-production-rollback-freeze-v2-precheck.sh`: `7714454cee1c9f0cdc688655cbb3e6bc0433030a`;
- capture wrapper `scripts/operations/managed-admin-production-rollback-freeze-v2-capture.sh`: `ea862bb00db1c2926ce7371bb3626a52484d6052`.

The bytes were staged in the operator workspace, independently hash-verified and syntax-checked. Root readback proved the live files still held the previous ADR 0365 bytes, so only the same three canonical paths were replaced:

- `/usr/local/libexec/wandora/production-rollback-freeze-v2.sh` — root:root 0750;
- `/usr/local/sbin/wandora-rollback-freeze-v2-precheck` — root:root 0755;
- `/usr/local/sbin/wandora-rollback-freeze-v2-capture` — root:root 0755.

Post-install root `git hash-object --no-filters` matched the three qualified blobs exactly.

## Precheck

After fresh runtime reconciliation and second adversarial review, exactly one zero-argument precheck ran under the existing managed-admin capability.

Result:

- exit code 0;
- no timeout;
- empty stderr;
- `ROLLBACK_FREEZE_V2_PRECHECK_OK`;
- `activation_performed=false`;
- `provider_call_performed=false`;
- `customer_effect=false`;
- `outbound_effect=false`.

The future current-baseline receipt remained absent after precheck.

## First capture attempt and timeout reconciliation

The first zero-argument capture was prepared with a 30000 ms broker timeout. The control-plane audit shows the apply ran for approximately 30200 ms and returned `REMOTE_COMMAND_FAILED` / `exit null` at the broker timeout boundary.

The capture was **not** blindly retried.

State-first reconciliation proved:

- final receipt absent;
- Core/Paperclip/Gateway still healthy;
- Task Drain still quiescent;
- no disposable ADR 0367 restore container present;
- no execution-broker process left running;
- exactly one partial host rollback root existed:
  `/home/wandora-admin/backups/paperclip-v9161-fast-read-rollback-freeze-v2-post-adr0366-83baca411096-mastra060-2e97da6d-20261001T062334345096784Z`;
- exactly one matching Paperclip temporary backup directory existed:
  `/paperclip/instances/default/backups/adr0367-rollback-freeze-v2-post-adr0366-83baca411096-mastra060-2e97da6d-20261001T062334345096784Z`.

The helper source shows those two artifacts are exactly the paths guarded by its `cleanup()` trap while `qualified=false`. The timeout interrupted normal process teardown before that cleanup could complete.

Under separate explicit approvals, only those two exact timestamped paths were removed. Independent read-only checks then proved both absent. No other backup, receipt, service, container or runtime state was touched.

## Successful persistent capture

After the cleanup proof, fresh runtime reconciliation again showed healthy Core/Paperclip/Gateway, Task Drain quiescent, and the final receipt absent.

A new adversarial review covered exactly one retry of the unchanged zero-argument wrapper, with only the broker timeout raised from 30000 ms to 120000 ms.

The retry completed once:

- exit code 0;
- `timed_out=false`;
- empty stderr;
- duration `31296 ms`;
- `ROLLBACK_FREEZE_V2_OK`;
- `activation_performed=false`;
- `provider_call_performed=false`;
- `customer_effect=false`;
- `outbound_effect=false`.

Published receipt:

`/opt/wandora/ops-workspace/production-rollback-freeze-v2-post-adr0366-83baca4110966989b484341b5c58bb42d1eb5407-mastra060-2e97da6d.metadata`

Protected rollback root:

`/home/wandora-admin/backups/paperclip-v9161-fast-read-rollback-freeze-v2-post-adr0366-83baca411096-mastra060-2e97da6d-20261001T063309727520768Z`

## Receipt validation

Independent readback proves:

- Paperclip image `wandora/paperclip:v2026.916.1`;
- Paperclip image id `sha256:7b72d43e87d54fcb9aa48b665150e062750c0cacb270e069f94297d58caa91e5`;
- Paperclip commit `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
- Paperclip healthy/restart 0;
- Core exact image/image-id/revision `83baca...`, healthy/restart 0;
- Messaging Gateway healthy/restart 0;
- Organization Adapter count 1, version 0.6.1, status ready;
- external `wandora_mastra@0.6.0` loaded/enabled at the exact `2e97da6d...` package;
- rollback `wandora_mastra@0.5.0` package preserved;
- `semantic_fast_read_gates_off=true`;
- `custody_overlay_live=false`;
- `attestation_overlay_live=false`;
- `task_drain_quiescent=true`;
- official backup created and gzip-valid;
- disposable PostgreSQL restore succeeded;
- `schema_restore=true`;
- `schema_equal=true`;
- activation/provider/customer/outbound all false.

Post-capture readback kept all seven normal containers running, Core/Paperclip/Gateway healthy and Task Drain `false / 0 / 0 / quiescent=true`.

## Decision

**Current 83baca Core Rollback Freeze V2 Requalification V1 is GREEN.**

The current production baseline now has a validated rollback freeze receipt. The prior ADR 0365 receipt remains historical evidence for `9d0a4ba...` but is no longer the current-baseline receipt.

The 30-second timeout was an execution-envelope limit, not a rollback-mechanism failure. The canonical capture itself completed normally in 31.296 seconds once the broker timeout was raised to 120 seconds after exact cleanup/reconciliation.

No Fast Read opening, Ana/VendaERP request, provider/model customer-path call, Human Send, outbound effect, service restart or production topology change occurred in this slice.

## Next boundary

**Semantic Fast Read — SUPERVISED RE-ATTESTATION + ONE REAL ANA READ V3.**

The next slice must:

1. begin from fresh Git/CI/runtime state;
2. requalify policy and operational evidence immediately before opening;
3. open only the already-defined required Semantic/Fast Read gates under fresh explicit approvals;
4. issue exactly one owner/browser request:
   `Qual é o preço do produto PREMIUM PLUS?`;
5. allow no retry and no second ERP read;
6. validate the visible browser result plus exact Paperclip/Tool Gateway/VendaERP evidence;
7. perform mandatory close after success, fallback or error;
8. prove the exact 14-file gates-OFF baseline restored before concluding.
