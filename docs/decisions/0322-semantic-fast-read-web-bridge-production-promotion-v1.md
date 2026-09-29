# ADR 0322 — Semantic Fast Read Web Bridge Production Promotion and Selector Persistence V1

Date: 2026-09-28

Status: **WEB BRIDGE PROMOTED + PERSISTENT SELECTOR RECONCILED / BASELINE PRESERVED / FAST READ STILL OFF / NO NEW ATTESTATION**

## Objective

Record the production reconciliation after ADR 0321: qualify the reviewed Web bridge artifact already built from PR #369, prove the live Web-only promotion, persist the reviewed image selector without recreating the running container, validate the narrow Fast Read ingress allowlist and fail-closed catch-alls, and preserve the inert production baseline.

This ADR does **not** authorize a new Semantic Fast Read attestation, Human Fast Read execution, provider/model/VendaERP call, customer effect or outbound effect.

## REAL NOW

Fresh repository reconciliation before selector persistence proved:

- PR #369 remained open, draft and mergeable;
- source branch `feat/semantic-fast-read-runtime-wiring-v1`;
- exact source head `623555b2d623563533e6745d5b68eb0f0bcf961a`;
- merge ref `4e67366fbf5a5caa9e2184cde722c3e40332c945`;
- exact-head CI was 17/17 GREEN.

The reviewed Web artifact was:

- Web CI run `36497653370`;
- artifact id `11003604308`;
- GitHub artifact digest `sha256:fe483f927a340ad41517e4ed5dc2a41dcd4bf8145c5f3d18dbadfc97051e4091`;
- candidate image `wandora/web:candidate-4e67366fbf5a`;
- image archive SHA-256 `cf9471748ef025cfda7dc74ef91d8711e78e7fdf7fca61b14e9cd0ecdd486cff`;
- OCI manifest digest `sha256:a6a329dd3643f0c825edbfca91abc9341023b68857edf99458c65eb173a97935`;
- OCI config digest `sha256:2a30d46ef297f426115f05269336a5703e875218b9fff64680cdebe091e15f87`;
- image revision `4e67366fbf5a5caa9e2184cde722c3e40332c945`;
- candidate label `wandora-web-reviewed-bridge-v1`;
- source tree `b2e80cdfa51accd9ae921b6357f8b2e85c0665e7`.

Fresh production readback showed Web already running that exact reviewed candidate:

- container id `b7bfd4c264311132125da75ea37f75a1cb4c96b996d47cf974ad62533f498614`;
- image `wandora/web:candidate-4e67366fbf5a`;
- digest `sha256:a6a329dd3643f0c825edbfca91abc9341023b68857edf99458c65eb173a97935`;
- revision `4e67366fbf5a5caa9e2184cde722c3e40332c945`;
- healthy;
- restart count 0;
- networks `wandora-core` and `wandora-edge`.

The live runtime and repository therefore superseded the stale ADR 0321 checkpoint that still said "NO PRODUCTION PROMOTION". ADR 0321 is preserved unchanged as the historical record of the earlier fail-closed state.

## Proven persistence gap

The live Web Compose file is:

`/opt/wandora/stacks/web/compose.yaml`

and resolves the image only from:

`WANDORA_WEB_IMAGE`

Safe Compose rendering proved:

- persistent stack `.env` still resolved rollback image `wandora/web:candidate-5108f7ce8de3`;
- staged reviewed `/opt/wandora/ops-workspace/adr0321-web-promotion/web.env` resolved `wandora/web:candidate-4e67366fbf5a`;
- the staged file contains exactly one line: `WANDORA_WEB_IMAGE=wandora/web:candidate-4e67366fbf5a`.

This was a persistence-only gap. The live Web container was already on the reviewed candidate.

## Capability Authority / Reuse Gate

ADR 0168 remains binding.

No new subsystem, migration, state machine, lifecycle authority or provider implementation was required. The existing managed-admin governed file-copy authority was sufficient to:

1. create one metadata-preserving backup of the existing selector file;
2. copy the already-staged one-line reviewed selector into the persistent Web stack `.env`.

No generic root shell was introduced. No Paperclip, Mastra, retrieval, orchestration or provider capability was internalized.

## Decision and second adversarial review

The selector persistence was split into two independent effects.

Backup effect:

- source: `/opt/wandora/stacks/web/.env`;
- destination: `/opt/wandora/stacks/web/.env.backup-adr0321-selector-before-persist-20260929T0236Z`;
- JEV 1.13.0 returned `confirm` with confidence `0.57` and `confirm=0.68`;
- fresh human approval: `adm_422f103ab49ed733f19cc6cf`.

Persistence effect:

- source: `/opt/wandora/ops-workspace/adr0321-web-promotion/web.env`;
- destination: `/opt/wandora/stacks/web/.env`;
- no Compose action in the approved effect;
- JEV 1.13.0 returned `confirm` with confidence `0.90` and `confirm=0.92`;
- fresh human approval: `adm_16ee962ec273f9dc1013651a`.

Both approvals were one-use and separate. No older approval was reused.

## Execution

Backup apply executed once with `exit_code=0`, no timeout and no container action.

Independent Compose readback of the backup resolved exactly:

`wandora/web:candidate-5108f7ce8de3`

The source persistent `.env` remained unchanged after backup.

The persistence apply then executed once with `exit_code=0`, no timeout and copied only the reviewed one-line selector file onto the persistent Web `.env`.

No `docker compose up` was required or executed for selector persistence.

## Validation

Post-persistence Compose rendering now resolves:

`wandora/web:candidate-4e67366fbf5a`

The running Web container retained the exact same:

- container id `b7bfd4c264311132125da75ea37f75a1cb4c96b996d47cf974ad62533f498614`;
- start time `2026-09-28T23:57:13.74437685Z`;
- image/digest/revision;
- health = healthy;
- restart count = 0.

Therefore selector persistence did not recreate Web.

The rest of the production baseline remained unchanged and healthy:

- Core: `wandora/core:organization-adapter-candidate-2c2142237c9c`, digest `sha256:d3ed5494c03c0720419387befc54f6f6cb124e5407fc619150ecf3dde03dfed7`, revision `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`, restart 0;
- Paperclip: `wandora/paperclip:v2026.916.1`, digest `sha256:7b72d43e87d54fcb9aa48b665150e062750c0cacb270e069f94297d58caa91e5`, restart 0;
- Messaging Gateway: `wandora/messaging-gateway:origin-fix-94cfb4de`, digest `sha256:c9a780765c0b44ddb2b6dd59fcde6cc0d53330d5c1a4b32e414108ab7156d46d`, restart 0;
- Task Drain: `draining=false`, `activeRuns=0`, `pendingWakes=0`, `quiescent=true`.

Core startup still reports:

- `fastReadExecution=false`;
- `semanticFastRead=false`;
- `humanSendProposal=false`.

Gateway startup still reports:

- `outboundEnabled=false`.

No custody/attestation window was reopened.

## Live Web route proof

The reviewed live Web Nginx configuration has one exact UUID-scoped Fast Read proxy:

`/api/v1/organizations/{uuid}/digital-employees/{uuid}/fast-read`

It forwards `Authorization`, strips `Cookie`, and leaves the generic `/api/` and `/internal/` catch-alls fail-closed.

A direct live Web probe with a syntactically valid body and no authorization returned:

- exact Fast Read route: HTTP 404 with `Content-Type: application/json` and body `{"error":"not-found"}` from Core, consistent with `fastReadExecution=false`;
- same path plus `/again`: Nginx HTML 404;
- `/api/unreviewed`: 404;
- `/internal/unreviewed`: 404.

This distinguishes the reviewed exact route from the catch-all and proves the bridge is live while runtime Fast Read remains disabled.

## Rollback boundary

The pre-persistence selector backup is retained at:

`/opt/wandora/stacks/web/.env.backup-adr0321-selector-before-persist-20260929T0236Z`

and resolves rollback candidate:

`wandora/web:candidate-5108f7ce8de3`

Any future runtime rollback is a separate production effect requiring fresh REAL NOW, decision, second adversarial review and fresh authorization. If a future selector change requires runtime reconciliation, scope it to Web only with `--no-deps`.

## Result

**WEB BRIDGE PROMOTED + SELECTOR PERSISTED / WEB UNRECREATED DURING PERSISTENCE / CORE-PAPERCLIP-GATEWAY BASELINE PRESERVED / TASK DRAIN QUIESCENT / FAST READ + SEMANTIC + HUMAN SEND + OUTBOUND OFF.**

No new Human Fast Read attestation is authorized by this ADR.

Next boundary: start a fresh Semantic Fast Read attestation slice only after a new REAL NOW reconciliation, a new decision, a new second adversarial review and fresh one-use approvals. Never reuse the approvals recorded here.
