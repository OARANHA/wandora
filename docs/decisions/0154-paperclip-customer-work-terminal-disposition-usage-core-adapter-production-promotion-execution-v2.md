# ADR 0154 — Paperclip Customer-Work Terminal Disposition + Usage Core/Adapter Production Promotion Execution V2

Status: **ACCEPTED / EXECUTED / GREEN WITH HISTORICAL PAPERCLIP AGENT ERROR PRESERVED**  
Date: 2026-09-21

## Context

ADR 0150 recorded the first legitimate MEDICSPRO model-backed work: exactly one Wandora work and one model call produced the supervised result, while Paperclip retained the issue open and later created one native continuation run. Wandora rejected that continuation with HTTP 409 before Agent Runtime/provider execution. Historical truth was therefore **1 Wandora work / 2 Paperclip runs / 1 model call / 0 outbound**.

ADR 0151 qualified `wandora_mastra@0.4.0`, Paperclip Task Drain, rollback and the MED-1 board status-only repair. ADR 0153 superseded only the adapter-only ordering because the previously live Core bridge omitted normalized usage from its response. Complete prospective lifecycle + usage therefore required both the companion Core and adapter 0.4.0.

This ADR records the production execution of that amended runbook. It does not replay customer work, backfill historical usage or call the model.

## REAL NOW before mutation

Repository:

- canonical main: `7dbf7d671989c7dd5d41da86ebcb370286c89100`;
- PR #207: merged;
- push workflows on that exact main: Web #581 GREEN, Platform Admin #506 GREEN, Messaging Gateway #613 GREEN, Core #649 GREEN;
- stale draft PR #206 was confirmed superseded by #207 and closed before the checkpoint PR.

Production baseline revalidated:

- Paperclip: `wandora/paperclip:v2026.916.0`, healthy, restart count 0;
- live `wandora_mastra`: exactly one, version 0.3.0, loaded=true, disabled=false, official test-environment PASS;
- Core: `wandora/core:organization-adapter-candidate-d5f98ed92a29`;
- Core image id: `sha256:1444f760e2fc61c3c4763e5f9ca8738df88a807bc2a7df1490562cade251cf14`;
- Core health/readiness: 200/200, runtime `mastra-supervised-model`;
- historical model-usage events observed before Core recreation: exactly 1;
- Wandora MEDICSPRO: exactly one Ana `active + supervised`, exactly one work operation, outbound attempts 0;
- MED-1 `42a8a8df-f6d9-4a4e-a3aa-662a05dc6154`: blocked, checkoutRunId=null, executionRunId=null, scheduledRetry=null, activeRecoveryAction=null, live runs=[], historical runs=2;
- Human Send OFF;
- Gateway outbound OFF.

The Paperclip Ana control-plane status was not a hard-stop premise of ADR 0151/0153. During post-restart readback it was observed as `error` with `errorReason=wandora_execution_failed_409` and `updatedAt=2026-09-21T11:49:40.115Z`, proving it is inherited from the historical continuation failure, not caused by this promotion. This execution deliberately does not resume/reassign or rewrite that historical state.

## Artifact and rollback evidence

Adapter candidate:

- package: `@wandora/paperclip-adapter-mastra@0.4.0`;
- tgz SHA-256: `6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c`.

Adapter rollback hashes remained exact:

- `adapter-plugins.json`: `cecc516bb05bcb076f148e24a645cbe174869e8826d9f1e9df4723e3253e7af1`;
- `package.tgz`: `78e4b57ee2f12a898f697f5b9c491e820d8f68d589fce55a3fdde1fc4ed82798`;
- `package.json`: `296fc0faac0ffb50fbc39557255aa43ef95c3ee7f0ca111ad7a65dfc57ebccc3`;
- `index.mjs`: `f9cd4fac07f516fd4558935a7a674b3fe6b1afdf46f3f5ba35adb9aff6ab5bb8`.

Companion Core artifact remained available and unexpired from canonical Core Candidate Artifact run #135 / workflow run `35603026602`, artifact id `10640665492`:

- artifact name: `core-organization-adapter-candidate-61cbb34d4bfde0350cc765111dc778b22a2a168f`;
- ZIP digest: `sha256:ffebefcbc96596fc97b8506ad0a20fae3f749529f2b75ebddacb3113456cc5b3`;
- candidate source SHA: `61cbb34d4bfde0350cc765111dc778b22a2a168f`;
- image tag: `wandora/core:organization-adapter-candidate-61cbb34d4bfd`;
- archive SHA-256: `f278d4466a849a55379297b043dd62eb037eb1659d50513179c35a3d012087a5`;
- OCI config digest: `sha256:c612aac3269b086eb6c05707cf6debe7ca70b97608b284e2b6a4c2d6df0bf2b4`;
- OCI manifest / loaded image id: `sha256:6c38930a45591970fd47d699c9881a9c9bd881272028268431ba3bf1c73c2873`;
- image user: `node`;
- candidate contract: `organization-adapter-core-v1`.

The short-lived artifact was downloaded through the authenticated GitHub artifact surface, then transferred to the VPS without rebuilding. ZIP and archive digests matched before `docker load`.

All eleven frozen Core Compose/overlay input hashes from ADR 0153 matched before promotion. Rendering the full live composition against old and new Core images produced exactly one configuration delta: `/services/core/image`.

## Execution

1. Paperclip Task Drain was started exactly once through the protected Board/instance-admin authority with a 15-minute TTL.
2. Immediate readback at `2026-09-21T22:47:13.155Z` proved:
   - `draining=true`;
   - `activeRuns=0`;
   - `pendingWakes=0`;
   - `quiescent=true`.
3. Only Core was recreated with the qualified companion image. No other Core composition input changed.
4. New Core became healthy, `/healthz=200`, `/readyz=200`, runtime remained `mastra-supervised-model`, and its new-container model-usage event count remained 0.
5. Paperclip remained drained/quiescent, adapter 0.3.0 remained loaded/test PASS and MED-1 had no live run.
6. Adapter 0.4.0 was staged in persistent Paperclip storage at:
   `/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c/package`.
7. Exactly one official adapter install/replace was performed. The unambiguous response was:
   - `type=wandora_mastra`;
   - `version=0.4.0`;
   - `requiresRestart=true`;
   - installed at `2026-09-21T22:52:00.610Z`.
8. Only Paperclip was recreated, exactly once. The restart clears process-local Task Drain by design.
9. Paperclip returned healthy on the same v2026.916.0 image. Official readback proved exactly one external `wandora_mastra@0.4.0`, loaded=true, disabled=false, and test-environment PASS.
10. Before historical repair:
    - MED-1 remained blocked;
    - live runs remained [];
    - historical runs remained exactly 2;
    - new Core model-usage events remained 0, preserving total historical model calls at exactly 1;
    - outbound attempts remained 0;
    - Human Send remained OFF;
    - Gateway outbound remained OFF.
11. Exactly one Board-authenticated status-only repair was executed:
    `MED-1 blocked -> done`.
    No comment, run-id, agent token, reassignment, resume/reopen or direct SQL was used.
12. The response was unambiguous and reported only status/statusVersion/completedAt changes.

## Validation

Final production state:

```text
Paperclip
  image              = wandora/paperclip:v2026.916.0
  health             = healthy
  restart count      = 0 on recreated container
  wandora_mastra     = exactly 1 / 0.4.0 / loaded / enabled
  test-environment   = PASS

Core
  image              = wandora/core:organization-adapter-candidate-61cbb34d4bfd
  image id           = sha256:6c38930a45591970fd47d699c9881a9c9bd881272028268431ba3bf1c73c2873
  healthz / readyz   = 200 / 200
  runtime            = mastra-supervised-model
  new model calls    = 0

MEDICSPRO / Wandora
  Ana                = exactly 1 / active + supervised
  work operations    = exactly 1
  outbound attempts  = 0

MED-1
  status             = done
  checkoutRunId      = null
  executionRunId     = null
  scheduledRetry     = null
  activeRecovery     = null
  live runs          = []
  historical runs   = exactly 2
  historical usage  = null / null (no backfill)

Historical model calls = exactly 1
Human Send            = OFF
Gateway outbound      = OFF
```

No customer work was replayed, no synthetic work was created, no provider call was made for validation, no historical usage was backfilled, no migration or Cloudflare change occurred, and no outbound effect was enabled.

## Cost / usage authority

The production path is now prospectively capable of carrying positive normalized adapter usage into Paperclip runtime usage/cost-event ingestion. Existing historical runs remain unchanged.

Without authoritative monetary price, Paperclip cost events remain `unpriced` with `costCents=0`. Paperclip v2026.916.0 monetary budget hard-stop observes billed cents. This promotion does not create a Wandora provider-pricing engine and does not reinterpret usage telemetry as monetary spend enforcement.

## Residual gap

The Paperclip Ana remains in historical `error` state with `errorReason=wandora_execution_failed_409`, last updated at the failed continuation time. This is not a regression from 0.4.0/Core promotion and was intentionally not changed because the accepted execution prohibited resume/reassignment or history rewriting.

Before admitting another legitimate MEDICSPRO work item, perform a separate **Paperclip MEDICSPRO Ana Historical Error-State Reconciliation Preflight V1 — NO EFFECT**. Determine the Paperclip-native, least-authority way to return the managed agent to an execution-ready lifecycle state without replaying MED-1, creating wakeups/runs or weakening Wandora supervision/outbound gates.

## Decision

**Production promotion V2 is COMPLETE / GREEN for its accepted scope.**

The lifecycle/usage fix is live prospectively, MED-1 is terminalized without replay, and historical truth remains intact. The inherited Paperclip agent error projection is preserved as an explicit next-slice readiness gap rather than hidden by an unauthorized resume.
