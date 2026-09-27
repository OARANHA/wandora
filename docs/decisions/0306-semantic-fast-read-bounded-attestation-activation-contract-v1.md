# ADR 0306 — Semantic Fast Read Bounded Attestation Activation Contract V1

Date: 2026-09-27

Status: **IMPLEMENTED / CI PENDING / CODE+CI ONLY / NO PRODUCTION EFFECT**

## Objective

Close the smallest configuration gap remaining after ADR 0305 without activating production:

> define one versioned, attestation-only Core Compose overlay that can later enable exactly Fast Read Execution + Semantic Fast Read + Semantic Selector for one bounded owner/admin Human Fast Read attestation while Human Send, Messaging Gateway outbound and WhatsApp remain OFF.

This ADR does not authorize mounting custody in production, enabling any gate, calling TypeSafe/Mistral/VendaERP, customer work, WhatsApp, outbound or deployment.

## REAL NOW

Immediately before implementation:

- `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 = open / draft / mergeable;
- exact source head = `564f37260238a94de5802897d4dd099da15d8d7d`;
- current merge ref = `ebe3f6a22c79b41a29255611a62d87ff466c2a6e`;
- source head -> merge ref has zero file differences;
- exact source head has 17/17 workflows completed successfully.

Fresh production readback remains the ADR 0305 baseline:

- Core `wandora/core:organization-adapter-candidate-2c2142237c9c`, revision `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`, healthy/restart 0;
- active Core composition includes `compose.semantic-fast-read.yaml` and excludes `compose.semantic-fast-read-custody.yaml`;
- Fast Read Execution OFF;
- Semantic Fast Read OFF;
- Semantic Selector OFF;
- Human Send OFF;
- Paperclip `wandora/paperclip:v2026.916.1`, healthy/restart 0;
- exactly one `wandora.organization-adapter-v1@0.5.0`, same plugin id, `ready`, `lastError=null`;
- Messaging Gateway healthy and `outboundEnabled=false`;
- Task Drain `false/0/0/quiescent`.

No runtime mutation was needed to derive this slice.

## PROVEN EVIDENCE / GAP

ADR 0294 already freezes Phase 3 as a separately authorized bounded attestation with only these three gates ON:

- `WANDORA_FAST_READ_EXECUTION_ENABLED`;
- `WANDORA_SEMANTIC_FAST_READ_ENABLED`;
- `WANDORA_SEMANTIC_SELECTOR_ENABLED`.

Human Send, Gateway outbound and WhatsApp must remain OFF.

ADR 0297 already qualified host custody for the Core-side TypeSafe/System One credential, distinct `wfri1` HMAC and existing platform Mistral credential. ADRs 0303-0305 completed the compatibility convergence.

The remaining repository gap is narrower: `compose.semantic-fast-read.yaml` explicitly says a future attestation must use a separately reviewed effect-authorizing overlay, but no such versioned overlay exists yet. Current Core CI proves gates-OFF + custody composition only.

## Capability Authority / Reuse Gate

ADR 0168 remains binding.

No specialist capability changes ownership:

- semantic/product/effect authority: Wandora;
- workforce/run/tool/Connection/grant/secret/audit operational authority: Paperclip;
- semantic route implementation: TypeSafe/System One;
- selector/runtime implementation: Mastra + Mistral;
- Business System read implementation: VendaERP adapter/tool path;
- transport: Messaging Gateway/Evolution.

No new table, migration, service, registry, lifecycle, run mirror, retry engine, cache, secret manager, orchestration subsystem or provider implementation is introduced.

## Decision

Add exactly one attestation-only overlay:

`infra/stacks/core/compose.semantic-fast-read-attestation.yaml`

It overrides only:

```text
WANDORA_FAST_READ_EXECUTION_ENABLED=true
WANDORA_SEMANTIC_FAST_READ_ENABLED=true
WANDORA_SEMANTIC_SELECTOR_ENABLED=true
WANDORA_HUMAN_SEND_PROPOSAL_ENABLED=false
```

It adds no volume, secret, image, build, network or port.

The future composition must reuse, rather than duplicate:

- `compose.semantic-fast-read.yaml`;
- `compose.semantic-fast-read-custody.yaml`;
- `compose.agent-runtime-model.yaml`;
- existing Human API;
- existing Organization Adapter;
- existing Paperclip execution bridge.

The attestation overlay must be last so its three explicit `true` values override the gates-OFF convergence contract only inside a separately authorized window.

## Second adversarial review

An initial broad review requested deeper analysis because direct production attestation could hide a missing versioned effect contract.

After narrowing to this CODE/CI-only prerequisite, independent JEV review returned:

- route = `proceed_fast`;
- `proceed_fast=0.77`;
- `deep_review=0.17`;
- `block=0.05`;
- `split_task=0.01`.

The review is advisory. Repository/runtime evidence and deterministic guardrails remain authoritative.

## Implementation

This slice adds:

1. the attestation-only Core Compose overlay;
2. Core CI render/static guards proving the exact three ON gates while Human Send/outbound remain OFF and all existing custody/provider mounts are reused;
3. `docs/operations/semantic-fast-read-bounded-attestation-v1.md`;
4. component/runbook documentation.

## Production boundary

This ADR performs no production effect.

In particular it does not:

- mount TypeSafe or `wfri1` into live Core;
- enable Fast Read Execution;
- enable Semantic Fast Read;
- enable Semantic Selector;
- enable Human Send;
- enable Gateway outbound;
- connect WhatsApp Fast Read;
- call TypeSafe, Mistral or VendaERP;
- create customer work;
- send a message;
- alter Task Drain;
- recreate any container.

## Validation

CI must prove the future attestation render has exactly the intended gates and reuses the existing provider/custody boundaries without adding outbound capability.

Exact-head GitHub-hosted CI must be GREEN before this ADR becomes QUALIFIED.

## Next

After exact-head CI is GREEN, stop.

The next production slice is a fresh **Immediate Pre-Mutation Attestation + Effect Authorization** for the bounded Human Fast Read attestation. It must capture fresh rollback/runtime/custody/Task Drain evidence and obtain a new immediately-adjacent second adversarial review before any production mutation.

This ADR is not that authorization.
