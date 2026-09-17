# ADR 0042 — Organization Adapter Production Activation Rehearsal V1

- Status: Accepted
- Date: 2026-09-17
- Scope: non-production rehearsal of the Organization Adapter activation sequence after the composed runtime proof

## Context

ADRs 0038 through 0041 and PRs #81, #82, #84 and #85 prove the minimum Wandora-private state, managed Paperclip catalog boundary, signed private client, per-company secret custody and composed Core/DB/custody/client runtime path.

Those proofs do **not** mean the production capability is already safe to activate. Migrations 010/011 remain unapplied, the production Paperclip plugin/config is absent, production HMACs do not exist, the live Core entrypoint is not wired to the Organization Adapter and there is no customer hiring route.

The next uncertainty is therefore operational: whether the exact activation and rollback sequence is reproducible under production-shaped conditions without accidentally turning a proof into a live customer effect.

## Decision

Before applying migrations 010/011 or installing/configuring the production Paperclip managed plugin, Wandora will execute a dedicated **Production Activation Rehearsal V1** in disposable/candidate infrastructure.

The rehearsal must prove, in order:

1. current canonical DB state -> migration 010 -> inert-state verifier;
2. migration 011 -> Organization Adapter service-contract verifier;
3. exact pinned Paperclip image/plugin/config and configured-company scope;
4. per-company sender/receiver HMAC custody using deterministic filenames and operator-mounted files, without raw secrets in Git, DB, payloads or logs;
5. Core candidate wiring with the Organization Adapter still unreachable from customer routes;
6. failure and rollback behavior for migration failure, plugin/config failure, secret resolution/signature failure, candidate failure and uncertain provider outcome;
7. production post-verification queries for duplicate employees/bindings/operations and customer-contract leakage.

At the end of the rehearsal, all live production effect gates remain unchanged: migrations 010/011 unapplied, production plugin/config absent, production HMACs absent, live Core unwired and customer `Contratar/Ativar funcionário` unavailable.

## Adversarial review

Two alternatives were rejected.

### Apply migration 010 immediately because it is inert

Rejected because it creates a partial live state without reducing the remaining plugin/secret/runtime activation uncertainty. It also makes production differ from the presently documented clean pre-activation boundary for no immediate product benefit.

### Apply migrations 010 and 011 now because CI is green

Rejected because migration 011 grants new write capability to `wandora_core_runtime`. That is a real least-privilege boundary change and must be activated together with an explicitly rehearsed operator sequence, not inferred from disposable CI success.

## Rehearsal invariants

- no customer route is added or exposed;
- no production database mutation occurs;
- no production Paperclip plugin/config is installed;
- no production HMAC is generated or mounted;
- no broad Board API key becomes the normal tenant runtime credential;
- secrets never enter Git, Wandora PostgreSQL, customer payloads or logs;
- ambiguous external effects are never blindly retried;
- provider IDs and plugin/private fields remain absent from customer contracts;
- a failed rehearsal leaves the live environment unchanged.

## Exit criteria

The rehearsal is green only when the intended production sequence and each rollback boundary are represented by reproducible artifacts/verifiers and the final checks prove that the live environment was not activated.

A later production-activation decision must be separately reviewed and must not be bundled with customer hiring UX.
