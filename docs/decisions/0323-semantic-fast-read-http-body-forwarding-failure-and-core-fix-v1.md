# ADR 0323 — Semantic Fast Read HTTP Body Forwarding Failure, Fail-Closed Attestation and Core Fix V1

Date: 2026-09-29

Status: **FAIL-CLOSED / ONE HUMAN POST RETURNED 400 / ROOT CAUSE PATCHED / 17-OF-17 CI GREEN / PRODUCTION BASELINE RESTORED / PATCHED CORE NOT YET LIVE**

## Objective

Record the bounded Semantic Fast Read production-attestation retry that reached exactly one authenticated owner Human Fast Read POST, failed with `400 invalid-fast-read-request`, closed immediately under the ADR 0320 mandatory-close boundary, and then identified and fixed the exact Core HTTP body-forwarding defect without redeploying production.

This ADR does **not** authorize another attestation or a Core production promotion.

## REAL NOW before the one Human Fast Read

The production window was opened only after fresh evidence proved:

- PR #369 remained open, draft and mergeable at source head `442b6b7ffbbd4351bc6ad7a24e883d994715d084`;
- exact-head GitHub-hosted CI was 17/17 GREEN;
- fresh Rollback Freeze V2 precheck returned `ROLLBACK_FREEZE_V2_PRECHECK_OK`;
- live Core image was `wandora/core:organization-adapter-candidate-2c2142237c9c`;
- live Core image/digest was `sha256:d3ed5494c03c0720419387befc54f6f6cb124e5407fc619150ecf3dde03dfed7`;
- live Core revision was `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`;
- opening and closing Compose chains both passed `config --quiet`;
- opening and closing `config --images` both resolved exactly to the live Core tag;
- installed gates-off, custody and attestation overlays matched the exact reviewed Git blobs;
- Task Drain was `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- Gateway outbound was `false`;
- Human Send was OFF;
- the current Paperclip Tool Policy test for Ana / `vendaerp_search_products` remained `allow / allow_profile`.

The exact close operation was frozen and proven before opening. No close approval was pre-created.

## Bounded opening and post-open validation

A fresh human approval recreated only `wandora-core` with:

- the exact pinned production Core image;
- the exact live Compose provenance;
- custody appended;
- attestation appended last;
- `--no-deps`;
- `--force-recreate`;
- `--no-build`;
- `--pull never`;
- `--wait`.

Immediate state-first validation proved:

- Core healthy and restart count 0;
- exact expected image, digest and revision;
- custody + attestation present in active Compose provenance;
- TypeSafe/System One and `wfri1` mounts read-only;
- `fastReadExecution=true`;
- `semanticFastRead=true`;
- `humanSendProposal=false`;
- Gateway `outboundEnabled=false`;
- Task Drain remained quiescent;
- the reviewed Web bridge candidate remained healthy.

## Human browser boundary

The browser-only preflight proved:

- organization `28PRO`;
- role `owner`;
- exactly one active employee named `Ana`;
- fixed request `Qual é o preço do produto PREMIUM PLUS?`;
- execution remained false during preflight.

Exactly one real POST was then issued from the user-owned authenticated browser to the exact UUID-scoped Fast Read route with the reviewed body:

```json
{"request":"Qual é o preço do produto PREMIUM PLUS?"}
```

The result was:

- HTTP `400`;
- body `{"error":"invalid-fast-read-request"}`.

No retry and no second Fast Read request occurred.

## Mandatory close

The 400 response triggered the ADR 0320 stop condition immediately.

Fresh state-first evidence first proved the attestation window was still open; there had been no hidden close. A fresh JEV review selected `confirm`, and a newly prepared managed-admin approval then recreated only `wandora-core` on the exact already-proven baseline Compose chain, excluding custody and attestation.

Post-close validation proved:

- Core healthy, restart count 0;
- exact pre-attestation image/digest/revision preserved;
- active Compose provenance ends at `compose.semantic-fast-read.yaml`;
- TypeSafe/`wfri1` custody mounts are absent;
- startup reports `fastReadExecution=false`;
- startup reports `semanticFastRead=false`;
- startup reports `humanSendProposal=false`;
- Gateway remains `outboundEnabled=false`;
- Task Drain remains `false / 0 / 0 / quiescent=true`.

The production baseline is therefore restored and inert.

## Proven root cause

The browser payload shape was correct. The failure was inside Core's HTTP dispatch.

`apps/core/src/runtime/human-supervision.ts` already:

- recognizes the exact Fast Read route;
- parses a body with exactly one `request` string key;
- permits raw request bodies up to 12,100 bytes;
- returns `invalid-fast-read-request` when `rawBody` is absent or invalid.

However, `apps/core/src/runtime/server.ts` decided whether to call `readBody()` using a Human-mutation classifier that included send, hire, activation, work, development, grounding and company-profile routes but omitted Fast Read.

Therefore the exact live request followed this path:

1. Web forwarded the exact UUID-scoped POST to Core;
2. Core recognized it as Human Supervision;
3. Core did not read the request body;
4. `rawBody` reached the Fast Read handler as `undefined`;
5. `parseDigitalEmployeeFastReadRequest(undefined)` failed;
6. Core returned `400 invalid-fast-read-request` before invoking the Semantic Fast Read service.

Because the service was never invoked, this attempt did not enter the TypeSafe semantic decision, Mistral selector, Paperclip Fast Read execution or VendaERP Tool Gateway path.

## Capability Authority / Reuse Gate

ADR 0168 remains binding.

No new ingress subsystem, proxy, state machine, queue, retry engine, provider implementation, registry, table or migration is justified.

The smallest correct fix reuses the existing Core routing primitives:

- export a narrow `isHumanDigitalEmployeeFastReadPath()` matcher using the already-existing Fast Read regex;
- classify only POST Fast Read requests as requiring a body;
- read Fast Read bodies with the existing canonical 12,100-byte raw-body limit;
- leave the generic Human mutation 8,192-byte limit unchanged;
- add HTTP-level runtime regression coverage proving the exact body reaches the Human handler.

## Second adversarial review and implementation

The first repository fix made Fast Read participate in the generic Human mutation body bucket. A second review identified that this would silently narrow the existing Fast Read contract from 12,100 bytes to 8,192 bytes.

The implementation was therefore refined before acceptance:

- Fast Read body reading is a distinct narrow branch;
- it uses `readBody(request, 12_100)`;
- the generic mutation branch remains `readBody(request, 8_192)`;
- HTTP-level regression coverage includes a normal price request;
- HTTP-level regression coverage also includes a Fast Read request body larger than 8,192 bytes but below the canonical 12,100-byte limit.

No production deploy occurred during this source fix.

## Validation

The implementation checkpoint before this ADR documentation was:

- PR #369 source head `025afcc5787e4ce61a131cfe5710a5ac079bd6af`;
- base `main@8d6a65f519de5c1c49607314b49968af608c7164`;
- PR open, draft and mergeable;
- 17/17 exact-head workflows completed successfully;
- Core CI run 1427 completed successfully;
- Semantic Fast Read CI run 313 completed successfully;
- Core Candidate Artifact run 547 completed successfully.

That Core Candidate Artifact produced:

- artifact id `11012599392`;
- name `core-organization-adapter-candidate-e56674ffba3a8b10754bcbb466bea36c20e70183`;
- GitHub artifact digest `sha256:c07391790e34630f61cdf5654ee32cf46dd08a20a1ea4b1041fbe6d2677c6fc1`.

This artifact is evidence only. The patched Core is **not** production-live yet.

## Decision

The attestation result is:

**FAIL-CLOSED / EXACTLY ONE HUMAN POST / HTTP 400 BEFORE SEMANTIC OR BUSINESS-SYSTEM EXECUTION / BASELINE RESTORED / ROOT CAUSE FIXED AND CI GREEN / NO SECOND REQUEST.**

The next production effect must be a separate slice:

**Core Fast Read HTTP Body Forwarding Compatibility Promotion V1 — GATES OFF / NO HUMAN FAST READ.**

That slice must re-reconcile the then-current PR head and CI, qualify the exact current Core candidate artifact, promote only the Core compatibility fix with Semantic Fast Read/Selector/Human Send/Gateway outbound still OFF, validate production state-first, and document the promotion.

Only after that compatibility promotion is GREEN may a new Semantic Fast Read bounded attestation start from fresh REAL NOW with new approvals. Historical approvals and the failed request from this ADR are not reusable.
