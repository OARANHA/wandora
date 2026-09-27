# Current Production Rollback Freeze + Secret Metadata Readback V2 — Preparation

Status: **CANONICAL V2 STAGED EXACT-BYTES / BASH-N GREEN / NOT AUTHORIZED FOR ROOT EXECUTION**

This runbook adapts the already-qualified ADR 0299 mechanism to the current Semantic Fast Read baseline. It does not introduce a second backup or secret subsystem.

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

The current VPS workspace copy must not be executed merely because it is named V2. Retained preparation evidence showed stale V1 terminal markers before the later precheck edit, while shared broker `session_capacity` prevents an independent current tail/syntax readback without an unjustified restart.

Canonical source is now:

`scripts/operations/production-rollback-freeze-v2.sh`

Only exact bytes from a GREEN repository head may later replace the quarantined workspace copy. Staging/replacement is a separate effect requiring its own decision/review/authorization. After staging, independently validate identity and syntax before root execution.

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

Do not execute either mode until the current prepared file passes:

`bash -n /opt/wandora/ops-workspace/production-rollback-freeze-v2.sh`

The post-`--precheck-only` syntax check is currently outstanding because the execution broker returned `BROKER_DENIED: session_capacity`.

Do not restart or widen Remote-Ops merely to satisfy this validation.

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
