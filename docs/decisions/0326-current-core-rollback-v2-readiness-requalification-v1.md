# ADR 0326 — Current-Core Rollback V2 Readiness Requalification V1

Date: 2026-09-29

Status: **SOURCE QUALIFIED / 17/17 EXACT-HEAD CI GREEN / HOST DEPLOYMENT NOT STARTED / HISTORICAL RECEIPT PRESERVED / ACTIVATION NOT AUTHORIZED**

## Objective

Close the source-contract gap identified by ADR 0325 for the corrected production Core baseline `b2cffbb54089212844ef177827e7a616b1008144` without opening Semantic Fast Read and without destroying or rewriting the valid historical Rollback V2 evidence captured for Core `2c214223...`.

This ADR records the repository-only qualification checkpoint. Host deployment, root precheck and persistent capture remain separate effects with fresh reconciliation, decision, second adversarial review and, where required, fresh managed-admin approval.

## REAL NOW

Fresh reconciliation before the source change proved:

- PR #369 remained open / draft / mergeable on `feat/semantic-fast-read-runtime-wiring-v1`;
- entry head `b0b406358b8aa0963de4a5d120c50d4aa4576ee6` completed **17/17 workflows GREEN** with no rerun;
- production Core = `wandora/core:organization-adapter-candidate-b2cffbb54089`;
- Core manifest/image id = `sha256:15a2eca7f74c4e6f7f6ea07bb461d6b711dffd0a70807a3f8e7773f6e6a27c49`;
- Core revision = `b2cffbb54089212844ef177827e7a616b1008144`;
- Core was healthy, restart count 0, on the existing gates-OFF Compose chain ending at `compose.semantic-fast-read.yaml`;
- custody and attestation overlays were absent;
- startup reported Fast Read Execution OFF, Semantic Fast Read OFF and Human Send OFF;
- Paperclip `v2026.916.1` was healthy on commit `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
- exactly one `wandora.organization-adapter-v1@0.5.0` was `ready`, with `lastError=null`;
- Task Drain = `false / 0 / 0 / quiescent=true`;
- Messaging Gateway was healthy with `outboundEnabled=false`;
- Remote-Ops was healthy on revision `677712aa48b41144df2bdcd285919a5eec2bd7be`;
- `wandora-managed-admin` already exposed exactly the dedicated rollback programs `wandora-rollback-freeze-v2-precheck` and `wandora-rollback-freeze-v2-capture`.

No production mutation occurred during reconciliation.

## Historical evidence preserved

The existing safe receipt remains:

`/opt/wandora/ops-workspace/production-rollback-freeze-v2.metadata`

Fresh readback proved that it is valid historical evidence for:

- Core `wandora/core:organization-adapter-candidate-2c2142237c9c`;
- Core image id `sha256:d3ed5494c03c0720419387befc54f6f6cb124e5407fc619150ecf3dde03dfed7`;
- Core revision `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`;
- the qualified Paperclip/OA/Gateway/custody/schema anchors captured by ADR 0315.

That receipt is not the current `b2cff...` readiness receipt and must not be overwritten, renamed or deleted merely to requalify the current baseline.

## Capability Authority / Reuse Gate

ADR 0168 remains binding.

No new backup subsystem, approval subsystem, lifecycle, scheduler, secret manager, registry, orchestration layer, shell authority or managed-admin program is justified.

Authority remains:

- Wandora owns the exact rollback contract, source bytes and baseline pins;
- Remote-Ops owns governed managed-admin prepare/apply, signed one-use approvals and the root broker;
- Docker/Compose and Paperclip retain their existing operational responsibilities.

The existing precheck/capture programs are reused unchanged by name and authority. Only their byte-pinned canonical helper contract moves to the corrected Core baseline.

## Decision

Keep **Rollback V2** as the same governed mechanism, but make the current capture evidence baseline-specific.

The current corrected Core contract uses:

- `CORE_IMAGE=wandora/core:organization-adapter-candidate-b2cffbb54089`;
- `CORE_IMAGE_ID=sha256:15a2eca7f74c4e6f7f6ea07bb461d6b711dffd0a70807a3f8e7773f6e6a27c49`;
- `CORE_REVISION=b2cffbb54089212844ef177827e7a616b1008144`.

The future current-Core safe receipt is:

`/opt/wandora/ops-workspace/production-rollback-freeze-v2-b2cffbb54089212844ef177827e7a616b1008144.metadata`

The protected rollback-root prefix is:

`paperclip-v9161-fast-read-rollback-freeze-v2-b2cffbb54089-`

This prevents collision with the historical generic V2 receipt while preserving the same V2 operational implementation and approval boundary.

## Second adversarial review

The first broad review did not authorize mutation and returned a low-confidence review/confirm split.

The design was narrowed to:

- same Rollback V2 mechanism;
- same two managed-admin program names;
- exact `b2cff...` Core pins;
- immutable baseline-specific new receipt;
- historical generic receipt untouched;
- both wrappers and both verifiers repinned together;
- no host effect before exact-head CI GREEN.

The second review returned:

- `allow=0.82`;
- `confirm=0.10`;
- `review=0.06`;
- `deny=0.02`;
- confidence `0.76`.

A focused review of the required existing CI-gate repin returned `allow=0.70`.

## Repository execution

Code commit:

`791d7109248090ce233ccf59670766a002249f3d`

updated atomically:

- `scripts/operations/production-rollback-freeze-v2.sh`;
- `scripts/operations/managed-admin-production-rollback-freeze-v2-precheck.sh`;
- `scripts/operations/verify-managed-admin-production-rollback-freeze-v2-precheck.mjs`;
- `scripts/operations/managed-admin-production-rollback-freeze-v2-capture.sh`;
- `scripts/operations/verify-managed-admin-production-rollback-freeze-v2-capture.mjs`.

New canonical helper Git blob:

`0f09289c5969cd3ddd407cc588f98648635026e3`

Both wrappers now pin exactly that blob.

The verifiers require the exact current Core tag/image-id/revision, the new baseline-specific receipt and rollback-root prefix, preserve the capture-only receipt collision guard and precheck-before-first-write boundary, and reject the historical `2c214...` Core anchors or generic historical receipt assignment as current helper state.

The existing Semantic Fast Read CI static gate was then consistently repinned in commit:

`607e02e41abd310be1342688efc9a62467d62e6f`

No new workflow or validation subsystem was added.

## Validation

Exact head `607e02e41abd310be1342688efc9a62467d62e6f` completed **17/17 workflows GREEN**, zero failures.

Relevant runs include:

- Semantic Fast Read CI `36533568729` — GREEN;
- Core CI `36533568844` — GREEN;
- Paperclip Fast Read Production Candidate CI `36533568680` — GREEN.

Inside Semantic Fast Read CI, the V2 helper static qualification and both managed-admin entrypoint verifiers completed successfully.

## Effect boundary

This checkpoint changed repository source/documentation only.

It did **not**:

- deploy helper or wrapper bytes to the VPS;
- execute either managed-admin rollback program;
- run root precheck;
- create the current-Core receipt;
- alter the historical receipt;
- capture a new protected rollback root;
- mount custody or attestation overlays;
- enable Fast Read, Semantic Fast Read, Semantic Selector, Human Send or Gateway outbound;
- call TypeSafe, Mistral or VendaERP;
- perform customer work or WhatsApp outbound.

## Next boundary

The next effect is **Current-Core Rollback V2 Host Deployment — EXACT BYTES / NO PRECHECK / NO CAPTURE**.

Before deployment:

1. reconcile the exact current PR head/CI and runtime again;
2. prove the staged/source byte identities;
3. make an explicit deployment decision;
4. perform a fresh second adversarial review;
5. use only the existing managed-admin authority required to install the exact helper + two wrappers;
6. validate installed hashes/ownership/mode and unchanged runtime;
7. stop before root precheck.

After that, root precheck remains a separate effect with its own fresh approval. Persistent capture remains another separate effect with another fresh approval.

Semantic Fast Read attestation remains prohibited until the current-Core receipt is successfully captured and independently validated.
