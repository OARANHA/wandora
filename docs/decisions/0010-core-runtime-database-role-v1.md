# ADR 0010 — Wandora Core runtime database role V1

Date: 2026-09-14
Status: **Accepted; migration applied live and the dedicated runtime credential is now activated through the reviewed private Core deployment path.**

## Context

ADR 0009 promoted Ana's durable Core slice and its live PostgreSQL foundation, but intentionally left the production Core database credential path unresolved.

Using `postgres`, `supabase_admin`, `service_role` or a role with `BYPASSRLS` would collapse the defense-in-depth boundary accepted by ADR 0007. The Core also uses a connection pool, so tenant scope must not leak between transactions.

The runtime needs only the database capabilities required by the current Ana workflow. Test-fixture administration is not an application capability and must remain separate.

## Decision

Create a dedicated `wandora_core_runtime` PostgreSQL role with least privilege and no `BYPASSRLS`.

Migration `003` creates the role disabled by default for real connections: it has `LOGIN`, no password and `CONNECTION LIMIT 0`. This migration-disabled state remains an intentional invariant and is still proven by `VERIFY_20260914_CORE_RUNTIME_ROLE_V1_LIVE.sql`.

Production activation is a separate operator-controlled step outside Git. It is valid only when the reviewed private network, Core runtime and secret-file path are ready to consume the credential immediately.

Every Core database transaction sets `wandora.organization_id` with transaction-local scope before accessing tenant-owned state. RLS policies for the Core compare row `organization_id` with that transaction-local value. A pooled connection therefore returns to an unscoped state after `COMMIT` or `ROLLBACK`.

Foundation configuration state is read-only to Core. Mutable workflow tables receive only the table/column privileges required by the current service. `DELETE`, `TRUNCATE`, role/database administration and direct provider-binding access remain unavailable.

Canonical audit rows are not directly readable or writable by Core. A narrow `SECURITY DEFINER` function, `wandora.append_core_audit(...)`, validates tenant scope and provides idempotent append-only writes.

The role must not gain PostgreSQL-originated HTTP egress merely through `PUBLIC` privileges. Where the Supabase `net` schema exists, generic `PUBLIC` schema usage is revoked while explicit grants are preserved for the Supabase roles that already require it.

Existing browser/member RLS policies are explicitly targeted to `authenticated`; independent Core policies target only `wandora_core_runtime`.

## Verification

The disposable verifier uses pinned Supabase PostgreSQL 17.6.1.136 and Node 22.23.2. It applies migrations, first proves the credential-disabled migration state, then enables the runtime login only inside the disposable harness with a synthetic password and `CONNECTION LIMIT 4`.

Fixture setup/cleanup uses a separate disposable test-admin identity; application tests use the actual `wandora_core_runtime` role. This proves the service without granting production permissions merely to satisfy test setup.

The activated state has its own read-only verifier:

- `VERIFY_20260914_CORE_RUNTIME_ROLE_V1_LIVE.sql` — migration-disabled state;
- `VERIFY_20260914_CORE_RUNTIME_ACTIVATED_V1_LIVE.sql` — deliberately activated production state.

The tests include transaction-local tenant scoping, cross-tenant row invisibility and rejection of a cross-tenant audit append.

## Live migration application — 2026-09-14

PR #20 was squash-merged to `main` at `3d16d807ece7765dac356abcd0879006d7a0f13e`. Core CI passed both on the PR head and on the resulting `main` push.

Before production mutation:

- the exact migration blob and verifier blob were confirmed against `main`;
- a fresh custom-format logical backup of the live database was created with mode `0600` and checksum validation;
- that snapshot was restored into disposable PostgreSQL while preserving ownership and ACL semantics;
- migration `003` passed on the restored live clone;
- `CORE_RUNTIME_ROLE_V1_LIVE_OK`, `ANA_LIVE_POSTVERIFY_V1_OK` and the disposable behavioral verifier all passed on the clone;
- live Supabase services were healthy and Wandora customer tables contained zero rows.

The exact migration was then applied live and returned:

```text
MIGRATION_003_LIVE_OK
CORE_RUNTIME_ROLE_V1_LIVE_OK
ANA_LIVE_POSTVERIFY_V1_OK
CORE_ROLE_003_LIVE_POSTVERIFY_OK
CORE_ROLE_003_POST_HEALTH_OK
```

At that point the live role correctly remained `CONNECTION LIMIT 0` with no password.

## Live credential activation — 2026-09-14

Security gate #22 was completed before activation. The live Supabase DB was attached to the internal `wandora-data` network with private alias `wandora-postgres`; PostgreSQL remained non-public.

A dedicated Core password was generated outside Git/chat and stored only in the operator-controlled secret-file path. The role was then activated with:

```text
LOGIN: true
CONNECTION LIMIT: 4
SUPERUSER: false
CREATEDB: false
CREATEROLE: false
INHERIT: false
REPLICATION: false
BYPASSRLS: false
password: present
```

`CONNECTION LIMIT 4` matches the Core pool maximum and is the smallest justified production limit for the current runtime.

The Core reached `/readyz = 200` only after PostgreSQL confirmed `current_user = wandora_core_runtime` and an unscoped pooled connection.

A live same-connection reuse proof returned:

```text
current_user=wandora_core_runtime
scope_before=""
scope_during="11111111-1111-1111-1111-111111111111"
scope_after_reuse=""
CORE_RUNTIME_POOLED_SCOPE_RESET_OK
```

PR #27 added the activated-state verifier while intentionally preserving the original migration-disabled verifier. Final live proof returned:

```text
ANA_LIVE_POSTVERIFY_V1_OK
CORE_RUNTIME_ACTIVATED_V1_LIVE_OK
CORE_DATABASE_ACTIVATION_CANONICAL_VERIFIERS_OK
CORE_DATABASE_ACTIVATION_OPERATIONAL_POSTVERIFY_OK
```

Operational details are recorded in `docs/infra/core-runtime-database-activation-v1.md`.

## Consequences

Core now has a live database defense-in-depth boundary and an active production credential that is materially less powerful than Supabase administrative/service credentials.

Credential activation did not publish PostgreSQL, expose a Core hostname or authorize customer traffic. The password remains outside Git/chat and is consumed only through the reviewed secret-file path.

The role's activated state is now deliberate. If the runtime must be disabled, rollback is Core standby plus `PASSWORD NULL` and `CONNECTION LIMIT 0`; do not weaken RLS or substitute a broader database role.

## Next step

With the least-privilege database path live and verified, proceed to **Messaging Gateway → Wandora Core supervised wiring**. Keep the provider boundary normalized, use deterministic/fake Agent Runtime behavior where possible, and do not introduce a real model-provider credential until the first model-backed proposal is materially required.
