# ADR 0016 — Canonical Supervised Work Proposal V1

Date: 2026-09-15
Status: **Accepted for implementation; production migration remains a separate reviewed operation.**

## Context

ADR 0014 proved that the live Mastra deterministic runtime can create a safe `send-text` proposal while work remains `attention-required` and no outbound side effect occurs.

For that proof, the proposal is stored inside `wandora_private.inbound_event_receipts.result`. ADR 0014 explicitly defines that receipt payload as internal evidence rather than the long-term customer-facing proposal model.

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

The live supervised ingress must reject any runtime proposal carrying `discount`, `special-price`, `delivery-deadline`, `payment-terms` or `contractual` commitment rather than materializing it as an ordinary supervised proposal.

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

## Verification

The slice must prove:

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
- no Web/API/authentication capability is added by this slice.

## Next step

After this migration/code path is merged and separately applied live, define the **human identity + tenant-authorized Core read projection** for `attention-required` work and canonical proposals, then connect the existing `Trabalho`/`Conversas` Web experience to that projection.
