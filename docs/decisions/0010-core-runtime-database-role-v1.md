# ADR 0010 — Wandora Core runtime database role V1

Date: 2026-09-14
Status: **Accepted; migration applied and verified live. Runtime credential remains disabled/unprovisioned.**

## Context

ADR 0009 promoted Ana's durable Core slice and its live PostgreSQL foundation, but intentionally left the production Core database credential path unresolved.

Using `postgres`, `supabase_admin`, `service_role` or a role with `BYPASSRLS` would collapse the defense-in-depth boundary accepted by ADR 0007. The Core also uses a connection pool, so tenant scope must not leak between transactions.

The runtime needs only the database capabilities required by the current Ana workflow. Test-fixture administration is not an application capability and must remain separate.

## Decision

Create a dedicated `wandora_core_runtime` PostgreSQL role with least privilege and no `BYPASSRLS`.

The migration creates the role disabled by default for real connections: it has `LOGIN`, no password and `CONNECTION LIMIT 0`. Activating a production credential is a later operator-controlled step outside Git and must happen only together with a reviewed Core runtime deployment/secret path.

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

## Live application — 2026-09-14

PR #20 was squash-merged to `main` at `3d16d807ece7765dac356abcd0879006d7a0f13e`. Core CI passed both on the PR head and on the resulting `main` push.

Before production mutation:

- the exact migration blob `96eea569b0217597227f477a43e88b660fdfd1b4` and verifier blob `51e2f0245117ba314f1eaf83507f3493877e2c50` were confirmed against `main`;
- a fresh custom-format logical backup of the live database was created with mode `0600` and checksum validation;
- that snapshot was restored into disposable `supabase/postgres:17.6.1.136` while preserving ownership and ACL semantics;
- migration `003` passed on the restored live clone;
- `CORE_RUNTIME_ROLE_V1_LIVE_OK`, `ANA_LIVE_POSTVERIFY_V1_OK` and the disposable `ANA_DURABLE_CORE_STATE_V1_OK` behavioral verifier all passed on the clone;
- live Supabase services were healthy and Wandora customer tables contained zero rows.

The exact migration was then applied live as `supabase_admin` with `ON_ERROR_STOP=1`. Post-verification returned:

```text
MIGRATION_003_LIVE_OK
CORE_RUNTIME_ROLE_V1_LIVE_OK
ANA_LIVE_POSTVERIFY_V1_OK
CORE_ROLE_003_LIVE_POSTVERIFY_OK
CORE_ROLE_003_POST_HEALTH_OK
```

Post-application the role is present with `LOGIN`, `CONNECTION LIMIT 0`, `NOBYPASSRLS` and no password. No customer rows were added, PostgreSQL remained private, all Supabase services remained healthy, `supabase.wandora.com.br` still returned the intentional root `404`, and unauthenticated `studio.wandora.com.br` still returned `401`.

## Consequences

Core now has a live database defense-in-depth boundary instead of relying only on application filters. A leaked future Core credential will be materially less powerful than a Supabase administrative/service credential.

The existence of the role is **not** authorization to generate a password early. Production credential generation, secret storage, network attachment and enabling a non-zero connection limit remain one reviewed runtime-deployment step. PostgreSQL stays non-public. No model-provider credential was introduced by this decision or deployment.

## Next step

Package/deploy the Wandora Core runtime behind a private/operator-controlled service boundary and define its secret-injection path. Only then generate the Core database credential outside Git/chat, activate a minimal connection limit, prove the runtime can connect only through the accepted least-privilege role, and proceed with supervised Messaging Gateway → Core wiring.
