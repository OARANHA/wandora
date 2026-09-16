# Organization Adapter State V1 — PR Notes

## Purpose

Version the minimum private integration state required to make Paperclip-backed employee hiring safe, idempotent and reconcilable without duplicating Paperclip's control-plane domain.

## Capability Authority / Reuse Gate

- Missing capability: stable provider bindings and safe external-hire idempotency/reconciliation.
- Existing provider capability: Paperclip already owns companies, agent lifecycle, org/hierarchy, tasks/issues, assignments and run ownership.
- Authority: Wandora owns stable IDs, tenant authorization, provider-neutral contracts, idempotency and reconciliation evidence; Paperclip owns its control-plane lifecycle.
- Minimal Wandora state: organization binding, employee binding and hire external-effect journal only.
- Adapter boundary: provider refs remain private and never become customer contracts.
- Failure/replacement: ambiguous effects reconcile by Wandora metadata markers before any retry; provider replacement preserves public Wandora IDs.
- Duplication verdict: no Paperclip lifecycle/task/assignment engine is recreated.

## Validation intent

Core CI applies migration 010 twice in a disposable Supabase/PostgreSQL harness and runs the dedicated verifier. The verifier checks RLS, zero application policies, no Core/authenticated table privileges, no secret-like columns, tenant-safe bindings, uniqueness/idempotency constraints and completion consistency.

## Production effect

None. This slice is deliberately inert and does not activate customer hiring, Core privileges, provider credentials or live Paperclip integration.
