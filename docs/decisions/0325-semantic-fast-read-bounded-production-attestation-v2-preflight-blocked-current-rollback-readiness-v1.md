# ADR 0325 — Semantic Fast Read Bounded Production Attestation V2 Preflight — Current Rollback Readiness Block

Date: 2026-09-29

Status: **BLOCKED BEFORE OPENING / NO APPROVAL PREPARED / NO PRODUCTION MUTATION / NO HUMAN FAST READ**

## Objective

Run the fresh preflight required before a second bounded Semantic Fast Read production attestation after ADR 0324, without treating historical chat state or historical approvals as authority.

The intended future attestation remains exactly one authenticated owner/admin Human Fast Read for active Ana in 28PRO:

`Qual é o preço do produto PREMIUM PLUS?`

This ADR records why the attestation window was not opened.

## REAL NOW

Fresh repository/GitHub reconciliation proved:

- `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 remains open / draft / mergeable on `feat/semantic-fast-read-runtime-wiring-v1`;
- exact source head before this checkpoint = `aa6898cdd6ccdf3d655d077374b59f6cea3a7c50`;
- merge ref = `5bbb37b28b86c74300dd8283c593188367943a69`;
- source-head tree and merge-ref tree are exactly `4593e7c81f424e8645c29ee81c387b306f8004a0`;
- all 17/17 workflows on the exact source head completed successfully;
- the delta from code qualification head `a69b7ba232b76aaac80e991e3525d0df627e287b` to the source head contains only ADR 0324 / canonical documentation.

Fresh production readback proved:

- Core = `wandora/core:organization-adapter-candidate-b2cffbb54089`;
- Core manifest/image id = `sha256:15a2eca7f74c4e6f7f6ea07bb461d6b711dffd0a70807a3f8e7773f6e6a27c49`;
- Core revision = `b2cffbb54089212844ef177827e7a616b1008144`;
- Core is running/healthy, restart count 0, user `node`, read-only root filesystem;
- active Core provenance is the existing 13-file gates-OFF baseline ending at `compose.semantic-fast-read.yaml`;
- custody and attestation overlays are absent;
- startup reports `fastReadExecution=false`, `semanticFastRead=false`, `humanSendProposal=false`;
- Paperclip = `wandora/paperclip:v2026.916.1`, commit `d554c4789ed3930f8a53ac9fdf6503b3187097da`, healthy/restart 0;
- exactly one `wandora.organization-adapter-v1@0.5.0` is ready;
- Messaging Gateway is healthy and `outboundEnabled=false`;
- Task Drain = `false / 0 / 0 / quiescent=true`;
- Portainer still manages only `wandora-site`, not the Core deployment.

The stable non-secret Core selector reads exactly:

`WANDORA_CORE_IMAGE=wandora/core:organization-adapter-candidate-b2cffbb54089`

## Overlay and compatibility evidence

The live host overlay bytes exactly match the GREEN PR head:

- gates-OFF `compose.semantic-fast-read.yaml` = Git blob `e65ba5293d3d51fb9f2038ed368cadbe217e54b3`;
- custody `compose.semantic-fast-read-custody.yaml` = Git blob `f0f97b3ba07914f2c588dea75d6bb52ec3397416`;
- attestation `compose.semantic-fast-read-attestation.yaml` = Git blob `ad7a1624bf5af54d5562e9eba72b165961af24e4`.

The live Web revision contains the reviewed UUID-scoped Fast Read proxy route.

The exact live Core revision contains the ADR 0323 body-forwarding correction: Fast Read POST bodies are read through the HTTP server boundary with the 12,100-byte Fast Read limit while generic Human mutations remain at 8,192 bytes.

## Paperclip / VendaERP authorization

Fresh governed Paperclip policy evidence for 28PRO Ana and the qualified VendaERP product-read path returned:

- Tool Policies list = empty;
- tool = `vendaerp_search_products`;
- arguments = `{pageSize:5, skip:0}`;
- `sideEffecting=false`;
- decision = `allow`;
- reason = `allow_profile`;
- effective profile = `259a5449-58ba-4d59-9774-92612e3caa91`;
- matched temporary policy ids = empty;
- audit event = null.

No VendaERP provider call occurred.

Ana still reports the historical Paperclip `error / wandora_execution_failed_422` state, with healthy organization chain. The previously qualified Paperclip v2026.916.1 invokability contract permits `error` status for a new invocation, so this is not the blocker.

## Current rollback-readiness gap

The existing protected Rollback Freeze V2 receipt remains valid historical recovery evidence, but it records:

- Core `wandora/core:organization-adapter-candidate-2c2142237c9c`;
- Core revision `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`.

Production now runs the ADR 0324 corrected Core:

- `wandora/core:organization-adapter-candidate-b2cffbb54089`;
- revision `b2cffbb54089212844ef177827e7a616b1008144`.

Therefore the V2 receipt is **not an immediately-current rollback capture of the live Core**.

The current canonical helper `scripts/operations/production-rollback-freeze-v2.sh` is also still fail-closed pinned to the older `2c214223...` Core image/revision. Running its governed precheck against the current `b2cffbb...` Core would fail the identity assertion and cannot be represented as fresh current rollback/custody proof.

The historical receipt still proves the qualified secret-custody metadata at capture time, but it does not satisfy the current runbook's freshness-sensitive requirement by itself.

## Exact render gap

A fresh non-root render attempt used:

1. the existing non-secret attestation render input;
2. the stable `core-runtime-image.env` selector last;
3. the exact 13-file live baseline;
4. custody + attestation appended only for the opening render.

No mutation was attempted.

The render failed before interpolation because two historical baseline overlays under `/home/wandora-admin/executions/.../` are intentionally unreadable by the non-root operator boundary.

This is an authority boundary, not evidence of a broken Compose contract. It must not be bypassed or solved by widening ordinary operator permissions. A future fresh render may use the existing governed managed-admin boundary if and when the rollback-readiness blocker is separately closed.

## Capability Authority / Reuse Gate

ADR 0168 remains satisfied.

No evidence justifies a new Wandora lifecycle, run mirror, deployment subsystem, secret manager, backup subsystem, registry, retry engine, approval system or generic root shell.

Authority remains:

- Wandora: semantic/product/effect policy and exact attestation contract;
- Remote-Ops: governed privileged prepare/apply and root execution boundary;
- Docker Compose: Core recreation mechanics;
- Paperclip: workforce/run/Connection/grant/tool operational authority;
- TypeSafe/System One: semantic route provider;
- Mastra/Mistral: selector/runtime implementation;
- VendaERP: replaceable read provider;
- browser owner/admin: legitimate Human Fast Read authentication boundary.

## Decision

**DO NOT OPEN THE ATTESTATION WINDOW.**

Do not prepare an opening approval.

Do not prepare a close approval.

Do not mount custody/attestation overlays.

Do not recreate Core.

Do not execute the Human Fast Read.

The deterministic stop condition is the lack of rollback readiness proven for the immediately current `b2cffbb...` Core, with the exact privileged opening/close render also not yet freshly proven.

## Second adversarial review

A fresh JEV 1.13.0 guard review was run against the exact reconciled evidence and stop conditions.

Result:

- decision = `deny`;
- deny = `1.00`;
- confidence = `1.00`.

The advisory result agrees with the deterministic runbook stop condition. It does not create or replace human authorization.

## Effects accounting

This preflight performed read-only repository/runtime reconciliation and one non-root Compose render attempt that failed at the protected-file read boundary.

It performed **zero**:

- production container recreation;
- custody mount;
- attestation overlay activation;
- Fast Read/Semantic/Selector activation;
- managed-admin apply;
- provider/model/VendaERP call;
- Human Fast Read request;
- customer work;
- Human Send;
- Gateway outbound;
- WhatsApp outbound;
- secret-value read.

No `adm_...` approval was created or reused.

## Next boundary

The next work must be a separate rollback-readiness gap-closure slice for the **current corrected Core baseline**, not an attestation opening.

It must first decide how to preserve the existing V2 historical receipt while requalifying the canonical V2 precheck/capture contract for the current `b2cffbb...` Core. Any helper-byte change, managed-admin wrapper repin/deployment, precheck, capture or receipt transition must remain separately reviewed and explicitly authorized as applicable.

Only after current rollback/custody freshness is GREEN should a brand-new Semantic Fast Read attestation preflight re-run all mutable evidence, prove the exact managed-admin opening and ADR 0320 baseline-close renders, perform a new decision/adversarial review, and then request a fresh one-use opening approval.

No historical approval is reusable.
