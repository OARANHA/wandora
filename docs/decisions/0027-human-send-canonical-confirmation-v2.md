# ADR 0027 — Human Send Canonical Confirmation V2

Status: Proposed

## Context

ADR 0026 added an explicit two-step confirmation in `Trabalho`, but its V1 modal is assembled from the existing Web projection. The Core independently re-derives the effect at send time. That preserves authorization, but does not version-bind the state reviewed by the human to the state sent if canonical data changes between review and confirmation.

## Decision

Introduce a Core-owned confirmation preview/version for `Human Send Proposal`.

For a proposal whose action state is `ready`, the Core returns a `confirmation` object derived by the same send service from current canonical state:

- `recipientMasked` — masked canonical channel address;
- `text` — exact canonical proposal text;
- `version` — `sha256:` fingerprint of the effect-critical canonical state and the authenticated human actor.

The version covers organization, actor, proposal/work/conversation/employee/connection identities, proposal text/source event, recipient, current lifecycle/channel state and latest inbound correlation.

The Web must render the confirmation object rather than reconstructing recipient/text from unrelated fields.

The final POST may carry only:

```json
{ "confirmationVersion": "sha256:<64 hex>" }
```

This value is concurrency evidence, not authorization and not a customer-authored business effect. The browser still cannot supply or override recipient, text, provider, connection or idempotency key.

At send time Core authenticates/authorizes normally, reloads canonical state, recomputes the confirmation version and compares it before creating any durable outbound attempt. A missing, malformed or stale/mismatched version fails closed with `confirmation-stale` and performs no Gateway call.

Successful replay of an already-succeeded proposal remains idempotent and may return the existing success without another provider call.

## Safety boundary

- Human Send remains disabled by default.
- No database migration, provider change or new secret is required.
- SHA-256 versioning is an optimistic-concurrency binding, not a replacement for human authentication/authorization.
- Core continues to independently derive every effectful field from canonical state.
- Delivery-uncertain remains non-retryable.
- Stronger commercial commitments remain on `wandora.approvals`.

## Verification

The slice must prove:

- `ready` includes Core-derived masked recipient, exact canonical text and deterministic confirmation version;
- owner/admin authorization remains required;
- member/cross-tenant/suspended states remain closed;
- malformed/missing version fails before durable attempt/Gateway;
- changing recipient, proposal/current source/lifecycle/connection after preview makes the prior version stale;
- correct version sends exactly the canonical text/recipient;
- browser cannot override effect fields;
- successful replay remains exactly-once;
- uncertain attempts remain non-retryable;
- Web generic `/api/` and all `/internal/` closures remain unchanged.

## Production

Implementation and deployment may occur with Core Human Send and Gateway outbound disabled. Re-enabling real outbound requires a separately reviewed controlled proof after this contract is live.