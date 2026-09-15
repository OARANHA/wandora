# ADR 0016 — Canonical Supervised Work Proposal V1

Date: 2026-09-15
Status: **Accepted, implemented and live.**

## Context

ADR 0014 proved that the live Mastra deterministic runtime can create a safe `send-text` proposal while work remains `attention-required` and no outbound side effect occurs.

For that proof, the proposal was stored inside `wandora_private.inbound_event_receipts.result`. ADR 0014 explicitly defines that receipt payload as internal evidence rather than the long-term customer-facing proposal model.

The next product boundary is Wandora Web human supervision. Exposing the private receipt would couple the customer experience to ingress/idempotency implementation details and to a storage shape that was never designed as a stable product contract.

## Decision

Introduce canonical `wandora.work_proposals` state for safe employee proposals that require human supervision.

V1 stores only:

- canonical organization, employee, work and conversation relationships;
- Wandora normalized source-event correlation;
- proposal kind;
- proposed text;
- Wandora commitment classification;
- rationale;
- creation timestamp.

The table does not store Mastra workflow/run IDs, Evolution identifiers, raw provider payloads or provider credentials.

## Safety boundary

`work_proposals` V1 accepts only `commitment = none`.

The live supervised ingress rejects any runtime proposal carrying `discount`, `special-price`, `delivery-deadline`, `payment-terms` or `contractual` commitment rather than materializing it as an ordinary supervised proposal.

Those stronger commitments remain on the existing `wandora.approvals` boundary.

The canonical proposal insert, work transition to `attention-required` and receipt completion occur inside the same database transaction. If any of those operations fails, all three roll back.

## Access boundary

`wandora.work_proposals` is Core-owned state.

- `authenticated` receives no direct table access;
- `wandora_core_runtime` receives only `SELECT` and `INSERT`;
- Core RLS policies require the transaction-local canonical organization scope;
- no update/delete capability is introduced in this slice.

Future Wandora Web access must go through a tenant-authorized Core projection. The browser must not read this table or the private receipt directly.

## Replay behavior

A completed inbound replay returns the existing durable receipt result and does not re-enter proposal creation.

`UNIQUE (organization_id, source_event_id)` provides an additional database invariant preventing duplicate canonical proposals for one normalized inbound event.

## Live implementation

Merged implementation:

```text
PR #36
main commit: 79b5b08266acb0e92d65af3a7c7f547558e9cf6d
migration: 20260915_004_supervised_proposal_v1.sql
live Core image: wandora/core:canonical-proposal-79b5b082
```

The production migration was applied only after a fresh logical backup, checksum verification and a restored-schema rehearsal on the same Supabase PostgreSQL image. The live structural verifier returned:

```text
SUPERVISED_PROPOSAL_V1_LIVE_OK
```

The Core image was built from a 16/16 Git-blob-verified build context, proved in a private parallel candidate container and then promoted with rollback available to the previous Mastra image.

## Live behavioral evidence

A direct signed Core proof and a separate Messaging Gateway proof both established:

```text
work: attention-required
proposal: exactly one / send-text / commitment none
receipt: completed / supervision-required
approvals: 0
outbound attempts: 0
outbound messages: 0
replay: idempotent
```

The full Gateway proof exercised an Evolution-compatible JWT webhook through the live private Gateway and Core. A provider-private sentinel placed outside the normalized contract had zero hits in canonical receipt/message state.

Core and Gateway remained healthy during and after the promotion.

## Verification

The slice proves:

- schema/type/table existence and RLS enabled;
- no direct `authenticated` read privilege;
- Core only has `SELECT` + `INSERT`;
- tenant-scoped Core read/insert policies;
- `commitment=none` database constraint;
- organization/source-event uniqueness;
- deterministic Mastra ingress creates exactly one canonical proposal;
- replay keeps exactly one proposal;
- proposal text/kind/commitment equal the runtime output;
- work remains `attention-required`;
- receipt remains `completed / supervision-required`;
- approvals remain zero;
- outbound attempts remain zero;
- a runtime proposal with a commercial commitment is rejected, creates no canonical proposal and no approval/outbound side effect.

## Consequences

Positive:

- customer-facing supervision can be built on a Wandora-owned product entity instead of private receipt storage;
- Mastra remains replaceable behind the Agent Runtime adapter;
- safe proposals and approval-required commitments remain semantically distinct;
- future human-review APIs can expose only the fields required by the product.

Trade-offs:

- the receipt still contains proposal evidence for replay compatibility during this phase;
- human review state/actions are not modeled yet;
- no customer Web/API action capability was added by this slice.

## Next step

Define the **human identity + tenant-authorized Core read projection** for `attention-required` work and canonical proposals, prove cross-tenant and suspended/inactive denial, then connect the existing `Trabalho`/`Conversas` Web experience to that projection without exposing provider or private receipt internals.
