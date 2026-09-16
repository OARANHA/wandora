# ADR 0028 — Supervised Inbound Active-Work Reuse

Status: Accepted
Date: 2026-09-16

## Context

A real WhatsApp inbound for an existing conversation reached Evolution and the Messaging Gateway, but Core returned a canonical rejection. The message and inbound receipt proved that `acceptInbound()` succeeded; the failure occurred when supervised ingress tried to move an already active work item into `attention-required`.

The existing conversation already had one non-completed `qualify-new-contact` work item. Reusing that work is correct; creating a second work would duplicate the same customer/conversation lifecycle.

## Decision

When persisting a new supervised proposal for an existing work item, the final supervised transition may accept these source states:

- `in-progress` — first/new work;
- `attention-required` — another customer message arrived while the human still had the work pending;
- `waiting-customer` — the customer replied after a prior supervised outbound.

The transaction still ends with the work in `attention-required` and atomically persists the new proposal plus completed inbound receipt.

`waiting-approval` is deliberately excluded. A new inbound must not silently cancel, replace or weaken a stronger pending approval boundary. That lifecycle requires a separate explicit contract if/when implemented.

## Safety properties

- no duplicate work item is created for the same active conversation lifecycle;
- no outbound effect is enabled or triggered;
- `waiting-approval` remains fail-closed;
- proposal persistence, work transition and receipt completion remain one transaction;
- replay/idempotency remains governed by `inbound_event_receipts`;
- tenant/RLS/connection boundaries are unchanged.

## Validation

Regression coverage must prove:

1. `attention-required` + new inbound reuses the same work, stores a second canonical proposal and completes the new receipt;
2. `waiting-customer` + new inbound reuses the same work and returns to `attention-required`;
3. `waiting-approval` + new inbound remains rejected without changing the approval-state work or persisting a second proposal.
