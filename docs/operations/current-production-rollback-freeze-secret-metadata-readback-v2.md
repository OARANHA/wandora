# Current Production Rollback Freeze + Secret Metadata Readback V2 — Preparation

Status: **CANONICAL V2 STAGED / MANAGED-ADMIN PRECHECK CAPABILITY DEPLOYED+VALIDATED / ROOT PRECHECK NOT EXECUTED OR AUTHORIZED BY THIS CHECKPOINT**

This runbook adapts the already-qualified ADR 0299 mechanism to the current Semantic Fast Read baseline. It does not introduce a second backup or secret subsystem.

## Managed-admin capability deployment checkpoint

ADR 0311 completed the capability-deployment slice.

Live governed program:

`/usr/local/sbin/wandora-rollback-freeze-v2-precheck`

Live root-owned helper:

`/usr/local/libexec/wandora/production-rollback-freeze-v2.sh`

Final live Git blob readback, performed with `git hash-object --no-filters` and without executing either script:

- entrypoint: `97b6962858aee3ea8c5577d7bd480502637bb4b2`;
- helper: `849a05971d5f2526b6e8829d5315b4678f169315`.

The effective `wandora-managed-admin` target and `wandora-ops-admin-broker.service` now allow exactly the additional program `wandora-rollback-freeze-v2-precheck`. Generic shell/interpreter hard-denies remain unchanged. `env` remains denied-by-default because it is absent from the administrative allowlists.

The dynamic registry was changed only after exact-byte review. The control plane was then restarted because current Remote-Ops source loads the dynamic registry through `loadRegistry()` at startup. Post-restart health and target readback are GREEN.

This deployment **does not authorize or imply root precheck execution**. Before calling the live program, start a new slice and perform fresh state reconciliation, decision, second adversarial review, `host_admin_prepare`, new explicit `APPROVE adm_...`, and `host_admin_apply`. Do not reuse ADR 0311 deployment approvals.

## Managed-admin precheck capability status

ADR 0310 qualified the narrow execution contract; ADR 0311 has now **deployed and validated it**.

Future governed program:

`/usr/local/sbin/wandora-rollback-freeze-v2-precheck`

Future root-owned exact helper copy:

`/usr/local/libexec/wandora/production-rollback-freeze-v2.sh`

Required helper Git blob:

`849a05971d5f2526b6e8829d5315b4678f169315`

The dedicated program accepts no caller arguments, validates both installed files as root-owned/non-symlink, rechecks the helper Git blob and syntax, and executes only `--precheck-only`. It deliberately does not expose the helper's no-argument persistent rollback-capture mode.

The current live Remote-Ops target/broker now allow exactly this additional dedicated program. Generic shell/interpreter hard-denies remain unchanged.

Even after that deployment is validated, do not execute the precheck until a new fresh decision, second adversarial review, `host_admin_prepare`, new `adm_...`, explicit human `APPROVE adm_...`, and `host_admin_apply`.

## Exact-byte host staging checkpoint

On 2026-09-27, after PR #369 exact source head `11cda265e15e75ee03492326a3b9bbf64bfd8d9b` completed 17/17 workflows GREEN, the quarantined workspace copy was replaced through the existing governed `wandora-agent` workspace-write boundary.

Identity proof:

- pre-staging host blob: `4058eaf32e46de69e23a1866ba64878491bf642e`;
- canonical GitHub blob: `849a05971d5f2526b6e8829d5315b4678f169315`;
- post-staging host blob: `849a05971d5f2526b6e8829d5315b4678f169315`;
- post-staging non-root `bash -n`: exit 0.

No V2 receipt exists and no helper mode was executed. Root `--precheck-only` remains **NOT AUTHORIZED by this checkpoint**.


Operator workspace helper:

`/opt/wandora/ops-workspace/production-rollback-freeze-v2.sh`

## Canonical-source correction

The VPS workspace copy must never be trusted merely because it is named V2. Retained preparation evidence had shown stale V1 terminal markers before the later precheck edit, so the former workspace copy was quarantined.

Canonical source remains:

`scripts/operations/production-rollback-freeze-v2.sh`

That quarantine has now been closed only by the exact-byte staging checkpoint above: the current host file matches canonical Git blob `849a05971d5f2526b6e8829d5315b4678f169315` and its non-root syntax check is GREEN. This proves source identity/syntax only; root execution remains a separate effect requiring its own fresh decision/review/explicit authorization.

## Current pinned anchors

The helper is fail-closed against:

- Paperclip image `wandora/paperclip:v2026.916.1`;
- Paperclip commit `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
- Core image `wandora/core:organization-adapter-candidate-2c2142237c9c`;
- Organization Adapter `0.5.0` at the current `f4e733...` package path;
- Paperclip active Compose = base + execution bridge + semantic Fast Read candidate;
- Core active Compose contains `compose.semantic-fast-read.yaml` and excludes both custody and attestation overlays;
- Task Drain OFF / zero runs / zero pending wakes / quiescent;
- Fast Read Execution OFF;
- Semantic Fast Read OFF;
- Semantic Selector OFF;
- Human Send OFF;
- Gateway outbound OFF;
- TypeSafe/`wfri1`/Mistral files are regular, non-symlink, `wandora-admin:wandora-ops`, mode `0640`;
- pre-qualified local PostgreSQL 18.1 image/digest/platform and live schema read.

Any mismatch is STOP.

## Mandatory validation before any root call

The staged canonical file has now passed:

`bash -n /opt/wandora/ops-workspace/production-rollback-freeze-v2.sh`

with exit 0, after exact Git-blob identity was independently proven.

This closes the syntax prerequisite only. Before either root mode, perform the separately required fresh decision/review/authorization for that exact effect. Do not restart or widen Remote-Ops for convenience.

## Read-only precheck mode

After a separate fresh decision/review and explicit human authorization:

`sudo bash /opt/wandora/ops-workspace/production-rollback-freeze-v2.sh --precheck-only`

Expected terminal marker:

`ROLLBACK_FREEZE_V2_PRECHECK_OK`

This mode exits before the helper's first persistent write and emits only safe runtime/custody metadata. It must not produce `production-rollback-freeze-v2.metadata` or a V2 rollback root.

A GREEN precheck is only freshness evidence. It does not authorize the full backup or Semantic Fast Read activation.

## Persistent rollback-capture mode

Only after a separate later decision/review and explicit human authorization:

`sudo bash /opt/wandora/ops-workspace/production-rollback-freeze-v2.sh`

Expected safe receipt:

`/opt/wandora/ops-workspace/production-rollback-freeze-v2.metadata`

Expected terminal marker:

`ROLLBACK_FREEZE_V2_OK`

The retained mechanism performs the official Paperclip backup, matching-key custody copy, PostgreSQL 18.1 live dump, disposable no-network restore/schema equality, provider/plugin/Compose capture and protected manifests.

This is a protected host write. It is not implied by precheck authorization.

## After a V2 rollback capture

Before any activation:

1. independently read the V2 safe receipt;
2. independently reconcile exact GitHub head and CI;
3. recheck current Core/Paperclip/OA/Gateway and Task Drain;
4. verify the receipt anchors the immediately current state;
5. then start a new Immediate Pre-Mutation Attestation + Effect Authorization.

Do not reuse ADR 0309 as activation authority.
