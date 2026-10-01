# ADR 0361 — Post-ADR0358 Rollback Freeze V2 Root Precheck Execution V1

Date: 2026-09-30

Status: **EXECUTED / GREEN / CAPTURE NOT EXECUTED / NO CUSTOMER EFFECT**

## Objective

Execute exactly once the already-deployed dedicated managed-admin root precheck for the post-ADR0358 Rollback Freeze V2 baseline, then validate that no persistent capture or customer/provider/outbound effect occurred.

This slice does not authorize persistent capture, Semantic Fast Read, VendaERP, provider/customer calls, outbound activation, Core/Paperclip/Gateway mutation, OA/Mastra change, or Ana execution.

## REAL NOW

Immediately before effect:

- `main=e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 branch head = `3c2782368c9c942114e44d5b59162d3183599c12`;
- qualified source ancestor = `e8170a6adca24314854e7ee53f4cbb06591886ec`, 17/17 workflows GREEN;
- current documentation head = 16/17 success, 0 failures, only Paperclip Fast Read Production Candidate CI still in progress;
- no workflow rerun was requested.

Fresh production state:

- seven Wandora containers running/healthy;
- Paperclip `wandora/paperclip:v2026.916.1`;
- Core `wandora/core:organization-adapter-candidate-f279acc98687`;
- Messaging Gateway healthy;
- Task Drain `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- Organization Adapter exactly `0.6.1`, `ready`, `lastError=null`;
- external `wandora_mastra@0.6.0` loaded and enabled at
  `/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/2e97da6dabfe8cc81c60c35ce74b071329078835373eb3ca39ce63017e9b9ecf/package`;
- retained `wandora_mastra@0.5.0` rollback package still required by the helper;
- historical ADR 0356 receipt present and intact;
- future post-ADR0358 receipt absent.

Live program metadata remained:

- helper `/usr/local/libexec/wandora/production-rollback-freeze-v2.sh` = `root:root 0750`;
- precheck wrapper `/usr/local/sbin/wandora-rollback-freeze-v2-precheck` = `root:root 0755`;
- capture wrapper `/usr/local/sbin/wandora-rollback-freeze-v2-capture` = `root:root 0755`.

Fresh non-root wrapper hashes matched the ADR 0360 source:

- precheck = `94d47e50d25e733799a345d7c5cfb4ff243ee74a`;
- capture = `5fa90bd0432c51a72ec050e3f2d78ce1ebb73737`.

The helper remains protected from non-root readback by its intended `0750 root:root` ownership. ADR 0360's governed root readback established helper blob `31742060143e8ff7c86a9753045400364b98c9c9`; the dedicated precheck wrapper independently re-hashes the helper to that exact blob and runs `bash -n` before invoking the helper, failing closed on any drift.

## PROVEN EVIDENCE

The dedicated precheck wrapper is zero-argument only and executes exactly:

`/usr/bin/bash /usr/local/libexec/wandora/production-rollback-freeze-v2.sh --precheck-only`

after validating its own path/metadata and the helper path/metadata/blob/syntax.

The helper's `--precheck-only` branch performs runtime/custody checks and exits with `ROLLBACK_FREEZE_V2_PRECHECK_OK` before its explicit `First write begins here` boundary.

## GAPS

No capability gap remained. The existing managed-admin program already provided the narrow authority required for this effect.

The only remaining action was the separately governed one-time root precheck itself.

## CAPABILITY AUTHORITY / REUSE GATE

ADR 0168 remains binding.

- semantic authority: Wandora owns the rollback-readiness contract and effect boundary;
- durable product state: only canonical documentation/checkpoints and existing rollback evidence are Wandora-owned;
- operational authority: Remote-Ops managed-admin performs the governed root action;
- provider implementation: Paperclip remains authority for its adapter/runtime state; Mastra remains runtime implementation behind the accepted adapter;
- replacement boundary: provider state stays behind the existing adapters/contracts; no Paperclip/Mastra capability is internalized.

No new service, state machine, backup mechanism, approval mechanism, shell authority, allowlist, provider registry or runtime implementation was introduced.

## DECISION

Execute exactly once:

`wandora-rollback-freeze-v2-precheck`

with zero caller arguments through the existing `wandora-managed-admin` boundary.

Do not execute the helper directly and do not authorize capture from the same ticket.

## SECOND ADVERSARIAL REVIEW

Fresh JEV guard review returned:

- decision = `confirm`;
- `confirm=0.83`;
- confidence = `0.79`;
- `allow=0.04`;
- `review=0.05`;
- `deny=0.08`.

The action remained gated on a fresh human approval.

## EXECUTION

`host_admin_prepare` produced:

`adm_3f7d861bf488a0b31c27c0a3`

for exactly:

- target = `wandora-managed-admin`;
- program = `wandora-rollback-freeze-v2-precheck`;
- argv = empty;
- cwd = `/opt/wandora/ops-workspace`;
- timeout = 120000 ms.

The human supplied the exact required confirmation.

`host_admin_apply` then executed that ticket exactly once.

Result:

- `executed=true`;
- `exit_code=0`;
- `timed_out=false`;
- stderr empty;
- duration = 12939 ms;
- terminal marker = `ROLLBACK_FREEZE_V2_PRECHECK_OK`.

Safe output included the expected Paperclip/Core/OA/Mastra/runtime/custody anchors and:

- `activation_performed=false`;
- `provider_call_performed=false`;
- `customer_effect=false`;
- `outbound_effect=false`.

## VALIDATION

After the single execution:

- future receipt
  `/opt/wandora/ops-workspace/production-rollback-freeze-v2-post-adr0358-f279acc98687da894a1ce6570273b5949552a8c7-mastra060-2e97da6d.metadata`
  remained absent;
- historical ADR 0356 receipt
  `/opt/wandora/ops-workspace/production-rollback-freeze-v2-f279acc98687da894a1ce6570273b5949552a8c7.metadata`
  remained intact and still terminated in `ROLLBACK_FREEZE_V2_OK`;
- all seven Wandora containers remained running/healthy;
- Paperclip/Core/Gateway remained healthy;
- Task Drain remained `false / 0 / 0 / quiescent=true`;
- no capture receipt was published;
- no customer/provider/outbound effect occurred.

## Explicit effect boundary

`ROOT PRECHECK EXECUTED = YES`

`CAPTURE NOT EXECUTED`

`SEMANTIC FAST READ NOT EXECUTED`

`PRODUCTION CUSTOMER EFFECT = NONE`

## Next boundary

**Post-ADR0358 Rollback Freeze V2 — PERSISTENT CAPTURE EXECUTION V1**

That future slice must start from fresh state and use:

`REAL NOW → PROVEN EVIDENCE → GAPS → CAPABILITY AUTHORITY / REUSE GATE → DECISION → SECOND ADVERSARIAL REVIEW → host_admin_prepare → explicit human approval → exactly one capture apply → VALIDATION → DOCUMENTATION`.

It must use the existing zero-argument program:

`wandora-rollback-freeze-v2-capture`

and must not reuse `adm_3f7d861bf488a0b31c27c0a3`.

After persistent capture is GREEN, the next slice is the supervised activation needed to execute the first real Ana read and present a visible functional result. Non-essential structural work must not be opened before that demonstration.
