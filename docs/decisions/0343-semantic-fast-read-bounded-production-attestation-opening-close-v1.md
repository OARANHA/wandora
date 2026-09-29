# ADR 0343 — Semantic Fast Read Bounded Production Attestation Opening/Close V1

Date: 2026-09-29

Status: **OPENING COMPOSITION VALIDATED / HUMAN FAST READ NOT EXECUTED / FAIL-CLOSED BASELINE RESTORED / NO BUSINESS-PROVIDER OR OUTBOUND EFFECT**

## Objective

Execute the separately authorized bounded Semantic Fast Read production-attestation opening only far enough to validate the exact live Core composition, then either permit the one canonical owner/admin browser Human Fast Read or fail closed and restore the exact pre-window baseline.

This ADR records the execution that followed ADR 0342. It does not authorize a later retry.

## REAL NOW / pre-mutation evidence

Immediately before opening:

- current `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 documentation head = `e16c91b88831999167c7fad92c0f8ebdc404804c`;
- all **17/17** workflows on that head were completed successfully;
- Core was healthy on `wandora/core:organization-adapter-candidate-b2cffbb54089`, image digest `sha256:15a2eca7f74c4e6f7f6ea07bb461d6b711dffd0a70807a3f8e7773f6e6a27c49`, OCI revision `b2cffbb54089212844ef177827e7a616b1008144`, restart count 0;
- active Core provenance ended at `compose.semantic-fast-read.yaml`;
- Core startup reported `fastReadExecution=false`, `semanticFastRead=false`, `humanSendProposal=false`;
- Paperclip v2026.916.1 and Messaging Gateway were healthy;
- Gateway reported `outboundEnabled=false`;
- Task Drain was `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- exactly one Organization Adapter `0.6.1` was `ready`, `lastError=null`;
- fresh 28PRO/Ana policy qualification for `vendaerp_search_products {pageSize:5,skip:0}` returned `allow / allow_profile`, with no temporary policy and no audit event;
- fresh OA `operational-read` returned runtime health ok, active/enabled/healthy VendaERP Connection, active organization grant, installed-for-agent and read-only/allowed tool availability;
- the exact current-Core Rollback V2 receipt remained present and matched the live Core image/digest/revision/composition baseline.

No provider, customer or outbound effect occurred during those reads.

## Render hard gates

The exact future attestation composition was rendered using a non-secret operator interpolation file with explicit:

`WANDORA_CORE_IMAGE=wandora/core:organization-adapter-candidate-b2cffbb54089`.

The full exact Compose chain then proved:

1. `docker compose ... config --quiet` => exit 0;
2. `docker compose ... config --images` => exactly `wandora/core:organization-adapter-candidate-b2cffbb54089`;
3. final JSON render:
   - `WANDORA_FAST_READ_EXECUTION_ENABLED=true`;
   - `WANDORA_SEMANTIC_FAST_READ_ENABLED=true`;
   - `WANDORA_SEMANTIC_SELECTOR_ENABLED=true`;
   - `WANDORA_HUMAN_SEND_PROPOSAL_ENABLED=false`;
   - TypeSafe/System One, `wfri1` and model-provider mounts read-only;
   - no Vigia overlay and no Messaging Gateway outbound authority.

The render actions changed no production state.

## Capability Authority / reuse gate

ADR 0168 remains binding.

- Wandora owns semantic/product/effect authorization and the bounded Human Fast Read contract.
- Paperclip remains operational authority for runs, Connections/grants, Tool Gateway authorization/execution, terminal result and audit.
- TypeSafe/System One, Mastra/Mistral and VendaERP remain replaceable providers behind existing contracts.
- Remote-Ops remains the governed privileged execution boundary.
- The owner/admin browser session remains the only permitted initiator of the one Human Fast Read.

No new subsystem, registry, lifecycle, cache, secret manager, provider implementation or operator impersonation path was created.

## Decision / second adversarial review

A fresh JEV guard over the exact opening effect selected `confirm` with probability 0.66.

The approved opening scope was:

- recreate only `wandora-core`;
- exact pinned image;
- append custody and attestation overlays last;
- no build, no pull, no dependency recreation;
- validate image/digest/revision, provenance, mounts and gates before any browser request;
- on any ambiguity/failure, or after exactly one browser-owned request, close immediately to the exact pre-window baseline.

The opening approval did not authorize operator possession or impersonation of a browser Bearer token.

## Opening execution

Human-approved one-use ticket `adm_18fbb20e04242cf3fc150c03` executed exactly once.

Docker Compose recreated only `wandora-core` with:

- `--no-deps`;
- `--no-build`;
- `--pull never`;
- `--force-recreate`;
- `--wait`.

Compose returned Core Healthy.

Immediate readback proved:

- exact expected tag `wandora/core:organization-adapter-candidate-b2cffbb54089`;
- exact expected digest `sha256:15a2eca7f74c4e6f7f6ea07bb461d6b711dffd0a70807a3f8e7773f6e6a27c49`;
- exact expected revision `b2cffbb54089212844ef177827e7a616b1008144`;
- restart count 0;
- active provenance included `compose.semantic-fast-read-custody.yaml` and `compose.semantic-fast-read-attestation.yaml`;
- TypeSafe/System One and `wfri1` mounts were read-only;
- startup reported `fastReadExecution=true`, `semanticFastRead=true`, `humanSendProposal=false`;
- Gateway remained `outboundEnabled=false`;
- Paperclip/OA remained healthy/ready;
- Task Drain was quiescent.

The opening composition itself was therefore valid.

## Browser authority stop

The canonical attestation requires one request initiated by an already-authenticated owner/admin Wandora browser session.

The operator session had no legitimate browser-owned owner/admin execution boundary. The operator therefore did not receive, export or impersonate a customer Bearer token and did not issue the Human Fast Read.

Deterministic consequence: **NO HUMAN FAST READ / MANDATORY CLOSE**.

No TypeSafe customer semantic-route call, Mistral selector call, Paperclip Fast Read run, VendaERP tool execution, Human Send, WhatsApp or Gateway outbound was initiated in this window.

## Mandatory close

Fresh close review selected `allow=0.87`.

Human-approved ticket `adm_20984344bbf2468832af3cba` executed exactly once and recreated only Core from the exact pre-window chain ending at `compose.semantic-fast-read.yaml`, excluding custody and attestation, with the same pinned image and the same no-build/no-pull/no-deps safeguards.

Post-close readback proved:

- Core healthy/restart 0;
- same exact tag/digest/revision;
- active provenance again ends at `compose.semantic-fast-read.yaml`;
- TypeSafe/`wfri1` mounts absent;
- `fastReadExecution=false`;
- `semanticFastRead=false`;
- `humanSendProposal=false`;
- Gateway healthy and `outboundEnabled=false`;
- Paperclip healthy and OA 0.6.1 still ready.

## Task Drain reconciliation

After Core close, Task Drain was unexpectedly observed as:

`draining=true / activeRuns=0 / pendingWakes=0 / quiescent=true`

with `startedAt=2026-09-29T19:20:01.425Z` and expiry `2026-09-29T19:35:01.425Z`.

Paperclip logs prove a local authenticated `POST /api/instance/task-drain` returned 200 at 19:20:01Z. The redacted evidence does not identify the actor, so this ADR does not attribute causality beyond that fact.

A separate JEV review required explicit confirmation before clearing that state. After human confirmation `APPROVE STOP TASK DRAIN`, the official narrow stop capability returned `wasActive=false`: by execution time the TTL had already expired. The operation was not retried.

Fresh state read then proved:

`draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`.

## Validation / final state

Final reconciled production state:

- Core exact `b2cff...` healthy, restart 0;
- Fast Read execution OFF;
- Semantic Fast Read OFF;
- Semantic Selector OFF through the canonical gates-OFF overlay;
- Human Send OFF;
- custody and attestation overlays absent;
- Paperclip v2026.916.1 healthy;
- Organization Adapter 0.6.1 ready / `lastError=null`;
- Messaging Gateway healthy / outbound OFF;
- Task Drain false/0/0/quiescent.

Bounded log reconciliation found no Fast Read/VendaERP/tool/run/outbound event attributable to the opened window. No Human Fast Read was executed.

## Result

**OPENING COMPOSITION PROVEN / HUMAN ATTESTATION NOT ACHIEVED / BASELINE RESTORED / NO BUSINESS-PROVIDER OR OUTBOUND EFFECT.**

The technical opening blocker from ADR 0317 (image fallback) is closed by the explicit pin + `config --images` proof. The remaining blocker is the legitimate browser-owned owner/admin execution boundary.

Any later retry is a new slice. It must begin from fresh REAL NOW and must not reopen production until the one owner/admin browser request can actually be executed within the bounded window without moving the Bearer token into the operator plane.
