# ADR 0027 — Human Send Canonical Confirmation V2

Status: **Accepted for implementation; production activation remains separate.**

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
- Core-contract merge does not activate outbound and does not by itself make the existing Web compatible with `ready` V2 actions; Web adaptation is a separate reviewed micro-slice before activation.

## Verification

The complete V2 slice must prove:

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

## Production

The Core contract may be merged and deployed with Human Send and Gateway outbound disabled. Web adaptation and candidate validation must complete before Human Send is re-enabled. Re-enabling real outbound requires a separately reviewed controlled proof after the complete confirmation contract is live.
