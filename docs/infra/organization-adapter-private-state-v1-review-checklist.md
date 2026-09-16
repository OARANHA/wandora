# Organization Adapter Private State V1 — Review Checklist

This checklist applies ADR 0036's Capability Authority / Reuse Gate to ADR 0038.

## Missing capability

Wandora needs a safe, provider-neutral way to map canonical organizations/employees to the selected control-plane provider and to make the external hire effect idempotent/reconcilable.

## Existing provider capability

Paperclip already supplies companies, agents, `agent-hires`, hierarchy/coordination, task/issue lifecycle, assignments, approvals and run ownership. These remain provider-owned capabilities.

## Authority

Wandora owns stable product IDs, tenant authorization, provider-neutral contracts, idempotency and reconciliation evidence. Paperclip remains authoritative for its agent/control-plane lifecycle and task/run state.

## Minimal Wandora state

Only:

- organization -> provider company binding;
- digital employee -> provider agent binding;
- hire external-effect journal with idempotency key, request hash and reconciliation state.

## Adapter boundary

Raw provider IDs stay in `wandora_private`; customer Web and Platform Admin contracts remain Wandora-owned/provider-neutral.

## Failure / replacement

Ambiguous provider outcomes are not blindly retried. Paperclip metadata markers support reconciliation, and the private bindings make future provider replacement possible without changing public Wandora IDs.

## Duplication verdict

No provider lifecycle, hierarchy, task engine, assignment engine or control plane is recreated in this slice.

## Activation status

INERT. No new Core/authenticated grants, no customer route, no live Paperclip adapter installation, no production migration application, no credentials, and no outbound activation are part of this slice.
