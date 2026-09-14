# ADR 0010 — Wandora Core runtime database role V1

Date: 2026-09-14
Status: **Accepted when merged; live credential provisioning remains separate**

## Context

ADR 0009 promoted Ana's durable Core slice and its live PostgreSQL foundation, but intentionally left the production Core database credential path unresolved.

Using `postgres`, `supabase_admin`, `service_role` or a role with `BYPASSRLS` would collapse the defense-in-depth boundary accepted by ADR 0007. The Core also uses a connection pool, so tenant scope must not leak between transactions.

The runtime needs only the database capabilities required by the current Ana workflow. Test-fixture administration is not an application capability and must remain separate.

## Decision

Create a dedicated `wandora_core_runtime` PostgreSQL role with least privilege and no `BYPASSRLS`.

The migration creates the role disabled by default for real connections: it has `LOGIN`, no password and `CONNECTION LIMIT 0`. Activating a production credential is a later operator-controlled step outside Git.

Every Core database transaction sets `wandora.organization_id` with transaction-local scope before accessing tenant-owned state. RLS policies for the Core compare row `organization_id` with that transaction-local value. A pooled connection therefore returns to an unscoped state after `COMMIT` or `ROLLBACK`.

Foundation configuration state is read-only to Core. Mutable workflow tables receive only the table/column privileges required by the current service. `DELETE`, `TRUNCATE`, role/database administration and direct provider-binding access remain unavailable.

Canonical audit rows are not directly readable or writable by Core. A narrow `SECURITY DEFINER` function, `wandora.append_core_audit(...)`, validates tenant scope and provides idempotent append-only writes.

The role must not gain PostgreSQL-originated HTTP egress merely through `PUBLIC` privileges. Where the Supabase `net` schema exists, generic `PUBLIC` schema usage is revoked while explicit grants are preserved for the Supabase roles that already require it.

Existing browser/member RLS policies are explicitly targeted to `authenticated`; independent Core policies target only `wandora_core_runtime`.

## Verification

The disposable verifier uses pinned Supabase PostgreSQL 17.6.1.136 and Node 22.23.2. It applies migrations, runs production-safe read-only verifiers, then enables the runtime login only inside the disposable harness with a synthetic password.

Fixture setup/cleanup uses a separate disposable test-admin identity; application tests use the actual `wandora_core_runtime` role. This proves the service without granting production permissions merely to satisfy test setup.

Evidence at acceptance:

```text
CORE_RUNTIME_ROLE_V1_LIVE_OK
TypeScript strict: green
12/12 Node tests: green
ANA_VERTICAL_SLICE_V1_VERIFY_OK
```

The tests include transaction-local tenant scoping, cross-tenant row invisibility and rejection of a cross-tenant audit append.

## Consequences

Core receives a real database defense-in-depth boundary instead of relying only on application filters. A leaked future Core credential is materially less powerful than a Supabase administrative/service credential.

Production credential generation, secret storage, network attachment and enabling a non-zero connection limit remain separate operational actions. PostgreSQL stays non-public. No model-provider credential is introduced by this decision.

## Next step

Merge and CI-verify the role/migration/service changes. Then rehearse migration `003` against a restored live snapshot, apply it to production only after another preflight/second-pass review, and provision the actual Core credential through an operator-controlled secret path.
