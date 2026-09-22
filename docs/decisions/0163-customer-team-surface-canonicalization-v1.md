# ADR 0163 — Customer Team Surface Canonicalization V1

Status: **ACCEPTED / IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**
Date: 2026-09-22

## Context

ADR 0162 adopted the owner-approved customer-panel prototype as the canonical design direction while explicitly separating design from demonstration data.

The next page-by-page convergence target is `Equipe`.

The approved prototype's Team page contains useful product language and composition, but it also includes demo-only concepts that are not current Wandora truth:

- three selectable autonomy levels;
- training history;
- weekly employee evaluation;
- human teammate directory;
- response-time claims;
- candidate queue / future hires;
- 24/7 behavior claims.

Promoting those values directly would turn a design prototype into a false product contract.

## REAL NOW entering the slice

The canonical base was:

```text
main = 33a7eafbb665864cdfcfd786c8c8ca0293a9470e
PR #218 = merged
open PRs = 0
post-merge Core/Web/Platform Admin/Messaging Gateway CI = GREEN
```

Existing authenticated customer contracts already provide:

- digital-employee identity;
- role;
- `active | paused` Wandora state;
- supervised autonomy;
- activation availability/state;
- customer-work availability;
- catalog hire availability/state;
- customer-work panel and recent results.

## Capability Authority / Reuse Gate

No new backend capability is needed for this slice.

The Team surface must reuse existing Wandora contracts and must not create:

- a new employee lifecycle;
- a new autonomy state machine;
- training history tables;
- performance scorecards;
- a human-team directory;
- candidate/hiring queues;
- a second control plane beside Paperclip.

Paperclip remains control-plane authority behind Organization Adapter. Wandora continues to own the customer-facing employee identity, authorization, policy and product semantics.

## Decision

Port the approved Equipe visual language into the existing React/Vite/TanStack customer application while rendering only existing real state.

The new Team surface:

- uses the approved cream/black/lime/yellow visual system;
- presents each real digital employee as a customer-facing profile;
- shows real role, status and supervised autonomy;
- preserves the existing activation action and its safety copy;
- preserves the existing customer-work panel;
- preserves catalog hire/reconciliation behavior;
- explicitly marks non-current autonomy levels as future rather than actionable;
- does not show fictitious trainings, human teammates, weekly scores, response-time claims or future candidates.

## Protected activation contract

The visual rewrite must not weaken the accepted activation safety boundary.

The existing Web verifier requires the customer surface to preserve explicit language that activation:

- **Não inicia trabalho**;
- **não libera envios externos**.

The first visual implementation accidentally reformatted those phrases so the source verifier could not find them contiguously. The code was corrected without changing the underlying action contract.

Final Web CI passed the reviewed hire and activation bridge verifiers.

## Validation

Implementation head before documentation passed:

```text
Web CI               = GREEN
Core CI              = GREEN
Platform Admin CI    = GREEN
Messaging Gateway CI = GREEN
```

TypeScript/build and reviewed bridge verification passed without weakening or removing the verifier.

No migration, backend change, runtime mutation, customer effect, activation, work creation or outbound action is part of this slice.

## Second adversarial review

Rejected shortcuts:

1. make the prototype's three autonomy levels clickable without a real policy contract;
2. show training/performance cards populated with demo data;
3. invent human teammates to make the page feel complete;
4. expose provider lifecycle details or Paperclip identifiers;
5. remove activation safety wording merely to simplify the visual layout;
6. move customer-work state into a new Team-specific backend.

The accepted implementation remains a presentation convergence over existing contracts only.

## Decision

**Customer Team Surface Canonicalization V1 is accepted as the next code foundation.**

The live product must not be described as running this surface until a separate Web production promotion is explicitly executed and validated.

## Next slice

After merge, the next recommended page-level slice is **Customer Work Result Presentation V1**, focused on:

- rendering legitimate work results cleanly instead of raw Markdown markers;
- keeping result content inert/safe;
- preserving customer-work idempotency and existing contracts;
- no new work execution or outbound effect.
