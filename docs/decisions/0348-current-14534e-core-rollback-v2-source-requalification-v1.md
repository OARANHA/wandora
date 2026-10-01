# ADR 0348 — Current 14534e Core Rollback V2 Source Requalification V1

Date: 2026-09-29

Status: **CODE-ONLY REQUALIFICATION / NO HOST DEPLOYMENT / NO ROLLBACK CAPTURE / ATTESTATION CLOSED**

## Objective

Requalify the existing Rollback Freeze V2 source contract for the exact Core currently live after ADR 0346. This slice reuses the existing backup/restore and managed-admin boundaries; it creates no new backup subsystem and changes no production state.

## Fresh evidence

- main = `e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 source head before this slice = `058fdf9ca766acf48efa39678249b8ac27fccc84`;
- that exact head reached 17/17 successful workflows;
- live Core tag = `wandora/core:organization-adapter-candidate-14534e57256f`;
- live Core image id = `sha256:ac253a9479338f0d47954937209323229314ef513125a71dd266558b3bfe1c8b`;
- live Core revision = `14534e57256f0a73c49feb3944a1068921468f94`;
- Core, Paperclip and Messaging Gateway are healthy;
- Fast Read/Semantic gates and Gateway outbound are OFF;
- Task Drain = `false / 0 / 0 / quiescent=true`;
- fresh Tool Policy = `allow / allow_profile`, no temporary policy and no audit event;
- fresh OA operational-read = healthy, VendaERP product search active/read-only/allowed;
- fresh custody metadata for TypeSafe, wfri1 and model-provider = regular files, `wandora-admin:wandora-ops`, mode `0640`;
- owner/admin browser session is available through the existing canonical browser-console procedure.

## Gap

The persistent Rollback Freeze V2 receipt and byte-pinned helper still describe the prior `e4c7...` Core. The bounded-attestation runbook requires rollback readiness for the immediately current live state, so the attestation remains closed.

## Capability Authority / reuse gate

ADR 0168 remains binding.

Reuse the existing Rollback Freeze V2 implementation. Repin only:

- Core tag/image/revision to the exact live `14534e...` identity;
- receipt and protected rollback-root namespace to `14534e...`;
- the managed-admin wrappers/verifiers to the new exact helper Git blob.

Historical receipts remain untouched. Backup semantics, disposable PostgreSQL restore, schema equality, Paperclip/OA checks, Task Drain checks, custody metadata and gates-OFF assertions remain unchanged.

## Decision and second adversarial review

Decision: perform repository-only requalification now. Do not deploy or execute the helper.

JEV 1.13.0 reviewed this exact code-only action and returned `confirm` (confirm 0.46, allow 0.38, review 0.14, deny 0.02; confidence 0.28).

## Effect boundary

This slice authorizes only source/documentation changes. It does not authorize:

- helper/wrapper deployment on the VPS;
- root precheck or persistent capture;
- Core recreation;
- custody/attestation activation;
- Human Fast Read;
- TypeSafe/Mistral/VendaERP calls;
- Human Send, Messaging Gateway or WhatsApp outbound.

## Next boundary

Require the new exact-head CI to be GREEN. Then, in a separate decision/review/approval sequence, deploy only the reviewed byte-pinned helper/wrappers, run the zero-argument precheck, and only after that qualify a separately approved persistent capture. The browser-owned attestation may be reconsidered only after a current `14534e...` Rollback Freeze V2 receipt is independently validated.
