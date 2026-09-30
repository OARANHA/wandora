# ADR 0358 — Wandora Mastra 0.6.0 production promotion and Ana native error recovery V1

Date: 2026-09-30

Status: **EXECUTED / GREEN / WANDORA_MASTRA 0.6.0 LIVE / ANA IDLE / NO SECOND FAST READ**

## Objective

Close ADR 0357's production recovery boundary by promoting the exact qualified `wandora_mastra@0.6.0` external adapter and clearing Ana's Paperclip-owned error through Paperclip's native lifecycle.

ADR 0168 remains binding. No Wandora-owned lifecycle, retry engine, adapter registry or provider runtime was introduced.

## Provenance

Immediately before mutation:

- `main=e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 head = `216f366e6267176a2ddfaa8b5dd0d2d75ef1129b`;
- merge ref = `8224fa58c521f9c5747c2fcbc04040c5f0ad2c03`;
- exact-head CI = 17/17 success.

Qualified adapter artifact:

- ZIP SHA-256: `3b7cb8dfdd5c711a3c6b411f2c5cbf1a98bc40c1c51c0f1a23082672f99c42e2`;
- TGZ SHA-256: `2e97da6dabfe8cc81c60c35ce74b071329078835373eb3ca39ce63017e9b9ecf`;
- final package path:
  `/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/2e97da6dabfe8cc81c60c35ce74b071329078835373eb3ca39ce63017e9b9ecf/package`.

The retained 0.5.0 content-addressed package remained present as rollback anchor.

## Execution

The 0.6.0 candidate was staged under native Task Drain with exact file-set and SHA-256 checks, owner/mode normalization and atomic rename. An independent read-only validation confirmed all four package files and no temporary residue.

Paperclip's official adapter install was then executed exactly once. Result:

- type = `wandora_mastra`;
- version = `0.6.0`;
- source = external;
- `requiresRestart=true`.

The official pre-restart adapter environment test passed.

Paperclip was then recreated alone using the exact live Compose set, active env file, existing bridge-secret host path, `--no-build`, `--pull never`, `--no-deps`, `--force-recreate` and health wait.

Before recreate, the rendered Paperclip service config hash exactly matched the live container config hash, proving effective configuration equivalence.

Post-recreate:

- Paperclip healthy on `wandora/paperclip:v2026.916.1`;
- source `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
- `wandora_mastra@0.6.0` loaded from the qualified path;
- Organization Adapter plugin `0.6.1` activated successfully;
- migrations already applied;
- orphaned heartbeat-run reap = 0.

Core remained healthy with:

- `fastReadExecution=false`;
- `semanticFastRead=false`;
- `humanSendProposal=false`.

Messaging Gateway remained healthy with `outboundEnabled=false`.

## Ana recovery

After adapter promotion, Ana still had:

- `status=error`;
- `errorReason=wandora_execution_failed_400`;
- healthy org chain.

The exact Paperclip production source defines native Board-only:

`POST /api/agents/:id/clear-error`

which changes `error -> idle`, clears the agent error field and preserves failed-run/runtime diagnostics.

Under fresh Task Drain with `0 active / 0 pending / quiescent=true`, exactly one native clear-error request was executed with fail-closed preconditions.

Post-recovery readback proved:

- Ana `status=idle`;
- `errorReason=null`;
- last heartbeat timestamp unchanged;
- `lastRunId=86b101a9-0f7b-412d-b25c-7ef1e1b49be7`;
- `lastRunStatus=failed`;
- `lastError=wandora_execution_failed_400`;
- no new run or wake;
- adapter remained `0.6.0`.

Task Drain was then released back to `false / 0 / 0 / quiescent=true`.

## Result

**GREEN.** The 0.6.0 adapter promotion and Paperclip-native Ana error recovery are complete.

No second Human Fast Read request, provider/model call, VendaERP call, Human Send, Gateway outbound or WhatsApp send occurred.

## Next boundary

This ADR does **not** authorize another production re-attestation.

Any future bounded Fast Read attestation must start as a separate slice with fresh repository/CI/runtime/rollback/freshness checks and explicit authorization for exactly one new browser-owned request.
