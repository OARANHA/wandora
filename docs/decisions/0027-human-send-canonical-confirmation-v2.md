# ADR 0027 — Human Send Canonical Confirmation V2

Status: **Accepted and production-deployed; real outbound activation remains separate.**

## Context

ADR 0026 added an explicit two-step confirmation in `Trabalho`, but its V1 modal is assembled from the existing Web projection. The Core independently re-derives the effect at send time. That preserves authorization, but does not version-bind the state reviewed by the human to the state sent if canonical data changes between review and confirmation.

## Decision

Introduce a Core-owned confirmation preview/version for `Human Send Proposal`.

For a proposal whose action state is `ready`, the Core returns a `confirmation` object derived by the same send service from current canonical state:

- `recipientMasked` — masked canonical channel address;
- `text` — exact canonical proposal text;
- `version` — `sha256:` fingerprint of the effect-critical canonical state and the authenticated human actor.

The version covers organization, actor, proposal/work/conversation/employee/connection identities, proposal text/source event, recipient, current lifecycle/channel state and latest inbound correlation.

The Web must render the confirmation object rather than reconstructing recipient/text from unrelated fields. When the human opens the explicit confirmation step, Web must freeze that reviewed snapshot locally so a background refetch cannot silently replace the content under review.

The final POST may carry only:

```json
{ "confirmationVersion": "sha256:<64 hex>" }
```

This value is concurrency evidence, not authorization and not a customer-authored business effect. The browser still cannot supply or override recipient, text, provider, connection or idempotency key.

At send time Core authenticates/authorizes normally, reloads canonical state, recomputes the confirmation version and compares it before creating any durable outbound attempt.

- missing, malformed or widened confirmation bodies fail as `400 invalid-confirmation` before the send service;
- a syntactically valid but outdated/mismatched version fails as `409 confirmation-stale` before durable attempt or Gateway call.

Successful replay of an already-succeeded proposal remains idempotent and may return the existing success without another provider call.

The runtime HTTP server reads a request body only for the exact Human Send POST shape with valid UUID organization/work/proposal selectors. Other human API routes keep their existing body-less boundary.

## Safety boundary

- Human Send remains disabled by default.
- No database migration, provider change or new secret is required.
- SHA-256 versioning is an optimistic-concurrency binding, not a replacement for human authentication/authorization.
- Core continues to independently derive every effectful field from canonical state.
- Delivery-uncertain remains non-retryable.
- Stronger commercial commitments remain on `wandora.approvals`.
- Core-contract merge does not activate outbound and does not by itself make an older Web compatible with `ready` V2 actions; Core and Web must be deployed as a reviewed compatible pair before activation.

## Verification

The complete V2 slice proves:

- `ready` includes Core-derived masked recipient, exact canonical text and deterministic confirmation version;
- owner/admin authorization remains required;
- member/cross-tenant/suspended states remain closed;
- malformed/missing/widened body fails before send service;
- changing recipient, proposal/current source/lifecycle/connection after preview makes the prior valid version stale;
- stale valid version creates no durable attempt and makes no Gateway call;
- correct version sends exactly the canonical text/recipient;
- browser cannot override effect fields;
- successful replay remains exactly-once;
- uncertain attempts remain non-retryable;
- only the exact valid-UUID Human Send path is eligible for request-body reading;
- Web freezes and displays the Core-issued reviewed snapshot;
- Web generic `/api/` and all `/internal/` closures remain unchanged.

## Production state — 2026-09-16

Core PR #58 and Web PR #59 are merged. The compatible Core/Web V2 pair was promoted from canonical repository head:

```text
a1ee475570c9314198068537003918a6022d8490
```

Live images:

```text
Core: wandora/core:canonical-confirm-a1ee4755
Web:  wandora/web:canonical-confirm-a1ee4755
```

Post-promotion proof established:

- Core and Web healthy;
- Core `/healthz = 200` and `/readyz = 200`;
- human/session routes remain fail-closed without Bearer;
- generic/unreviewed `/api/` and all Web `/internal/` paths remain closed;
- live Web bundle contains the `confirmationVersion` contract and stale-confirmation UX;
- database outbound counters did not change during candidate/promotion work;
- `WANDORA_HUMAN_SEND_PROPOSAL_ENABLED` remains absent;
- `WANDORA_GATEWAY_OUTBOUND_ENABLED` remains absent.

Therefore **the Confirmation V2 code is live, but real outbound is currently disabled**. Re-enabling real outbound still requires a separately reviewed controlled proof using the versioned activation overlays and the accepted ADR 0022/0023 boundaries.

See `docs/infra/human-send-canonical-confirmation-v2-live.md`.
