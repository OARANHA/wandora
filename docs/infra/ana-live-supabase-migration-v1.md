# Ana V1 — controlled live Supabase migration

Status: **applied and verified live on 2026-09-14**

This runbook records the controlled application of the first Wandora Core migrations to the live self-hosted Supabase PostgreSQL and remains the recovery/reference record for that deployment.

## Scope

Migrations:

1. `infra/stacks/supabase/migrations/20260914_001_core_multitenant_auth_v1.sql`
2. `infra/stacks/supabase/migrations/20260914_002_ana_vertical_slice_v1.sql`

Production-safe post-verifier:

- `infra/stacks/supabase/verifiers/VERIFY_20260914_ANA_VERTICAL_SLICE_V1_LIVE.sql`

The behavioral verifier `VERIFY_20260914_ANA_VERTICAL_SLICE_V1.sql` inserts synthetic rows. **Never run it on the live database.**

## Proven preflight — 2026-09-14

The live database was inspected read-only before migration:

- PostgreSQL 17.6 / Supabase PostgreSQL `17.6.1.136`;
- database size approximately 11 MB;
- `pgcrypto` 1.3 already present;
- expected Supabase roles `anon`, `authenticated` and `service_role` present;
- no `wandora` or `wandora_private` schema existed;
- no conflicting Wandora object names were found;
- sufficient host disk space was available.

A private custom-format `pg_dump` snapshot was created with mode `0600` under `/home/wandora-admin/wandora-backups/supabase-preflight/` and checksum recorded beside it. This is an on-host pre-migration safety copy, not a replacement for future off-host disaster-recovery backups.

That real live snapshot was restored into disposable Supabase PostgreSQL 17.6.1.136. Exact migration blobs from `main` were then applied successfully and the full behavioral verifier passed:

```text
RESTORE_LIVE_SNAPSHOT_OK
MIGRATIONS_ON_LIVE_CLONE_OK
ANA_DURABLE_CORE_STATE_V1_OK
LIVE_CLONE_PREFLIGHT_OK
```

The read-only live post-verifier was separately proven against a freshly restored clone and returned:

```text
ANA_LIVE_POSTVERIFY_V1_OK
LIVE_READONLY_POSTVERIFY_TEST_OK
```

## Exact deployment artifacts

The live deployment used exact Git blobs checked immediately before application:

- migration 001: `926463f438272b8adb36ca00f023623d0e01b1c8`;
- migration 002: `34778e61b03edd187db8d75d0822f959053e9c81`;
- live read-only verifier: `77eb9b29b2537dabae8ac5e9d740218d448b5ddb`.

The immediately pre-application backup was:

```text
/home/wandora-admin/wandora-backups/supabase-preflight/postgres-pre-ana-live-20260914T110324Z.dump
```

It was created with mode `0600`; its checksum was recorded beside the dump. Preserve it until the supervised real path is validated and a later retention decision is made.

## Live application result

Immediately before applying, the second-pass decision review reconfirmed:

- intended `main` source;
- green GitHub Core CI;
- healthy live Supabase/PostgreSQL services;
- absence of pre-existing `wandora` / `wandora_private` schemas;
- fresh backup and checksum;
- exact local/Git blob match;
- no real customer traffic depending on the new schemas.

Migration 001 and migration 002 were then applied in order with `ON_ERROR_STOP=1` as `supabase_admin`. Each file is internally transactional.

Result:

```text
MIGRATION_001_LIVE_OK
MIGRATION_002_LIVE_OK
ANA_LIVE_POSTVERIFY_V1_OK
SUPABASE_POST_MIGRATION_HEALTH_OK
ANA_LIVE_MIGRATION_V1_OK
```

Post-application state:

```text
wandora_tables=12
private_tables=3
organizations=0
contacts=0
messages=0
approvals=0
```

No synthetic behavioral-verifier data was introduced into production.

External smoke after migration remained correct:

```text
supabase.wandora.com.br root = HTTP 404 (intentional)
studio.wandora.com.br unauthenticated = HTTP 401
SUPABASE_PUBLIC_POST_MIGRATION_SMOKE_OK
```

## Re-verification procedure

For future drift checks, use only the production-safe verifier against live PostgreSQL:

- `VERIFY_20260914_ANA_VERTICAL_SLICE_V1_LIVE.sql`

It runs inside `SET TRANSACTION READ ONLY`. Expected result:

```text
ANA_LIVE_POSTVERIFY_V1_OK
```

The behavioral verifier remains disposable-environment-only.

## Stop conditions for future changes

Stop immediately if a future migration or wiring step reveals:

- live schema drift from the recorded state;
- migration errors;
- failure of the read-only verifier;
- Supabase health degradation;
- unexpected grants, policies or object collisions.

Do not continue merely because a later step might fix an earlier failure.

## Recovery boundary

No automatic `DROP SCHEMA`, database replacement or restore is authorized by this runbook.

The original two migration files committed successfully and are now part of the live database state. If a later operational problem appears, stop customer-path promotion and decide recovery from evidence.

Dropping Wandora schemas or restoring the database are destructive operations and require a separate explicit recovery decision.

## Secret handling

Model-provider and integration credentials are operational secrets. Never store them in Git repository files, even when the repository is private. Provision them only through an operator-controlled secret path or an appropriate CI secret when a real integration requires them, and rotate any credential that ever enters Git history.

A previously supplied Mistral token entered Git history before this rule was enforced. It is compromised, was removed from the current tree and must not be reused. When Mistral is actually needed, revoke it and create a fresh token outside Git/chat.

## What this migration did not do

It did not:

- provision the production Wandora Core database credential/role;
- wire the Messaging Gateway to Core;
- wire a real Mastra/model-provider call;
- configure a usable Mistral token;
- expose Ana directly to autonomous customer traffic;
- replace the future off-host backup/restore program.

Those remain separate reviewed steps after the live database foundation.
