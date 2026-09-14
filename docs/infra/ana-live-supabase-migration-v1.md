# Ana V1 — controlled live Supabase migration

Status: **preflight proven; live application pending a final second-pass review**

This runbook applies the first Wandora Core migrations to the live self-hosted Supabase PostgreSQL without confusing code merge with deployment.

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

## Mandatory pre-application gate

Immediately before touching live PostgreSQL, perform the second-pass decision review from `AGENTS.md` and confirm all of the following still hold:

- current `main` is the intended deployment source;
- GitHub Core CI is green for that `main`;
- live Supabase/PostgreSQL services are healthy;
- `wandora` and `wandora_private` are still absent, unless a documented prior deployment explains otherwise;
- a fresh pre-application logical dump and checksum exist;
- migration files used by the operator match the exact GitHub `main` blobs;
- no real customer traffic depends on the new Wandora schemas yet.

If any precondition changed, stop and re-run the clone preflight before applying.

## Application sequence

Use `psql` with `ON_ERROR_STOP=1` as `supabase_admin` against the live `postgres` database. Do not paste or edit migration SQL ad hoc.

Apply migration 001 first, then migration 002. Each migration is internally transactional. If a statement fails inside one file, that file rolls back.

Important: the two files are separate transactions. If migration 001 commits and migration 002 later fails, migration 001 remains applied. This is a known controlled partial state; do not attempt an automatic destructive rollback.

After both files complete, run only the read-only live post-verifier. Expected result:

```text
ANA_LIVE_POSTVERIFY_V1_OK
```

Then confirm the existing Supabase services remain healthy before proceeding to Core credential provisioning or any real-path wiring.

## Stop conditions

Stop immediately if:

- the live schema differs from the preflight assumptions;
- either migration reports an error;
- the live read-only verifier fails;
- Supabase services lose health;
- an unexpected grant, policy or object collision appears.

Do not continue merely because a later step might fix an earlier failure.

## Recovery boundary

No automatic `DROP SCHEMA`, database replacement or restore is authorized by this runbook.

If migration 001 or 002 fails inside its own transaction, rely on PostgreSQL rollback for that file and inspect the resulting state. If both migrations commit but a later operational issue appears, stop before customer traffic and decide recovery from evidence.

Dropping Wandora schemas or restoring the database are destructive operations and require a separate explicit recovery decision. Preserve the pre-migration dump until the supervised real path has been validated and a later retention decision is made.

## Secret handling

Model-provider and integration credentials are operational secrets. Never store them in Git repository files, even when the repository is private. Provision them only through an operator-controlled secret path or an appropriate CI secret when a real integration requires them, and rotate any credential that ever enters Git history.

## What this migration does not do

It does not:

- provision the production Wandora Core database credential/role;
- wire the Messaging Gateway to Core;
- wire a real Mastra/model-provider call;
- request a Mistral token;
- expose Ana directly to autonomous customer traffic;
- replace the future off-host backup/restore program.

Those remain separate reviewed steps after the database foundation is proven live.
