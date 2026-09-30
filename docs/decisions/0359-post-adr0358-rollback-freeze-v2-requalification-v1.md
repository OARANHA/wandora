# ADR 0359 — Post-ADR0358 Rollback Freeze V2 Requalification V1

Date: 2026-09-30

Status: **CODE COMPLETE / EXACT-HEAD CI REQUIRED / NO PRODUCTION EFFECT**

## Objective

Requalify the existing Rollback Freeze V2 source so a future separately authorized capture can represent the current post-ADR0358 production baseline, including exact Paperclip-owned `wandora_mastra@0.6.0` state, without creating a second backup subsystem or Wandora-owned adapter registry.

ADR 0168 remains binding: portability is contract decoupling, not implementation duplication.

## REAL NOW

Fresh provenance before mutation:

- `main=e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 source head `216f366e6267176a2ddfaa8b5dd0d2d75ef1129b`;
- merge ref `8224fa58c521f9c5747c2fcbc04040c5f0ad2c03`;
- merge parents exactly current main + source head;
- exact-head workflows **17/17 SUCCESS**.

Fresh production readback remained inert: Core `f279acc...` healthy/restart 0, Paperclip v2026.916.1 healthy/restart 0, exactly one OA 0.6.1 ready, Task Drain false/0/0/quiescent and Gateway healthy.

Official `paperclipai adapter list --json` proved exactly one external `wandora_mastra` with version `0.6.0`, `loaded=true`, `disabled=false`, `isLocalPath=true` and package:

`/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/2e97da6dabfe8cc81c60c35ce74b071329078835373eb3ca39ce63017e9b9ecf/package`.

ADR 0358 preserves the prior 0.5.0 package as rollback anchor:

`/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/64795ff7d2c519ef6303ab0944bac02d27aadf8b919860b832c2e6fac4defb62/package`.

## Gap

ADR 0356's existing receipt was captured before ADR 0358. It remains valid historical evidence but does not explicitly attest the later adapter registration/package identity.

The helper already captures Paperclip DB + matching master.key, provider-owned `adapter-plugins.json`, complete `operator-packages`, Paperclip/Core Compose anchors, OA 0.6.1, custody metadata, Task Drain and effect gates. The gap is current provider-state provenance, not a missing backup capability.

## Capability Authority / Reuse Gate

Paperclip remains operational authority for adapter registration/lifecycle/state. Official Paperclip CLI is the active adapter read boundary. Remote-Ops managed-admin remains future privileged execution authority.

No backup subsystem, adapter registry, provider-state mirror, run mirror, lifecycle, secret manager, recovery state machine, approval mechanism or service is introduced.

## Decision

Reuse the existing helper and:

1. use a new post-ADR0358 receipt/root/temp namespace;
2. before first write, fail closed unless official adapter-list reports exactly the qualified 0.6.0 adapter identity;
3. require both current 0.6.0 and retained 0.5.0 package directories before first write;
4. continue capturing provider-owned registry + full operator-packages tree;
5. verify both packages exist inside the captured tree;
6. re-run the active adapter assertion after capture before receipt publication;
7. emit only safe adapter identity fields in precheck/anchors/receipt;
8. repin existing zero-argument managed-admin wrappers/verifiers.

The Paperclip DB backup preserves post-clear-error provider-owned lifecycle state; Wandora does not mirror Ana/run state.

New future receipt:

`/opt/wandora/ops-workspace/production-rollback-freeze-v2-post-adr0358-f279acc98687da894a1ce6570273b5949552a8c7-mastra060-2e97da6d.metadata`

New protected root prefix:

`paperclip-v9161-fast-read-rollback-freeze-v2-post-adr0358-f279acc98687-mastra060-2e97da6d-`

## Second adversarial review

Initial JEV routing selected `deep_review=0.56` vs `proceed_fast=0.43`.

After tightening the source of truth to official adapter-list, explicitly preserving the 0.5.0 rollback package and historical receipt, the focused guard returned `allow=0.78`, `confirm=0.16`, `review=0.05`, `deny=0.01`, confidence `0.70`.

## Source identities

- helper blob: `31742060143e8ff7c86a9753045400364b98c9c9`;
- precheck wrapper blob: `94d47e50d25e733799a345d7c5cfb4ff243ee74a`;
- capture wrapper blob: `5fa90bd0432c51a72ec050e3f2d78ce1ebb73737`;
- precheck verifier blob: `3514e5d94fc5bdbac4313a7610ef48e1d7191110`;
- capture verifier blob: `42668f39680e9a5d25098ffe145768c0ac042f18`;
- Semantic Fast Read workflow blob: `c1690b29198a83df6b1dbe457b52eb99161fc88f`.

## Validation

Mandatory final gate is exact-head PR CI. Until it is GREEN, this source is not production-authorized.

## Production effect boundary

No host staging, `host_admin_apply`, root precheck, rollback capture, Core recreation, custody/attestation overlay, Fast Read activation, Task Drain mutation, Human Fast Read, TypeSafe/Mistral customer call, VendaERP call, Human Send, Gateway outbound or WhatsApp effect occurs in this ADR.

## Next boundary

After exact-head CI GREEN, use a separate fresh production slice for exact-byte deployment, then a separately approved precheck, then a separately approved persistent capture. Only a validated post-ADR0358 receipt may reopen consideration of another bounded Semantic Fast Read attestation.

The ADR 0356 receipt must remain untouched and historical.
