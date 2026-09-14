# Wandora Core runtime database role V1 — live deployment record

Status: **applied and verified live on 2026-09-14; credential intentionally disabled**

This runbook records the controlled deployment of ADR 0010's least-privilege PostgreSQL runtime boundary.

## Scope

Migration:

- `infra/stacks/supabase/migrations/20260914_003_core_runtime_role_v1.sql`

Production-safe verifier:

- `infra/stacks/supabase/verifiers/VERIFY_20260914_CORE_RUNTIME_ROLE_V1_LIVE.sql`

The existing mutation-heavy `VERIFY_20260914_ANA_VERTICAL_SLICE_V1.sql` remains disposable-environment-only and must never run against live PostgreSQL.

## Exact repository state

PR #20 was squash-merged to `main` at:

```text
3d16d807ece7765dac356abcd0879006d7a0f13e
```

Exact Git blobs:

```text
migration 003: 96eea569b0217597227f477a43e88b660fdfd1b4
runtime live verifier: 51e2f0245117ba314f1eaf83507f3493877e2c50
```

GitHub Core CI passed both the PR head (run #12) and the resulting `main` push (run #13).

## Production preflight

Immediately before live application:

- PostgreSQL reported 17.6 and database size approximately 11 MB;
- `wandora_core_runtime` did not yet exist;
- organizations, contacts, messages and approvals were all zero;
- the nine existing member-read policies still targeted `public`, which is the expected pre-003 state;
- `postgres`, `anon`, `authenticated`, `service_role` and `supabase_functions_admin` all had `net` schema usage, which is the expected pre-003 state;
- all Supabase containers reported healthy;
- sufficient host disk space was available;
- local migration/verifier files matched the exact `main` Git blobs above.

## Fresh backup

A fresh custom-format logical dump was created immediately before the rehearsal/application:

```text
/home/wandora-admin/wandora-backups/supabase-preflight/postgres-pre-core-role-003-20260914T192322Z.dump
```

Mode:

```text
0600
```

SHA-256:

```text
74485076e33bce862155faff774862c706ceef2163b96484260bc70e0620a53d
```

The companion checksum file was also mode `0600`. `sha256sum -c` passed and the dump catalog was successfully read with `pg_restore -l` from the pinned Supabase PostgreSQL image.

## Restored-live-snapshot rehearsal

The fresh dump was restored into disposable `supabase/postgres:17.6.1.136` with no published host port.

A first restore attempt stopped under `--exit-on-error` because database dumps do not include cluster-global roles and the fresh image lacked `supabase_realtime_admin`. The failed clone was not used. A new clean clone was created with only the two missing Supabase role names (`supabase_realtime_admin` and `supabase_functions_admin`) as credential-less `NOLOGIN` placeholders. This preserved ownership/ACL restore semantics rather than weakening the rehearsal with `--no-owner` or `--no-acl`.

The second restore reproduced the live baseline:

```text
PostgreSQL 17.6
DB size ~11 MB
wandora_core_runtime: absent
organizations: 0
contacts: 0
messages: 0
approvals: 0
member-read policy target: public
expected Supabase net usage: present
RESTORE_CORE_ROLE_003_LIVE_SNAPSHOT_OK
```

Migration `003` was then applied only to the clone. Evidence:

```text
MIGRATION_003_ON_LIVE_CLONE_OK
CORE_RUNTIME_ROLE_V1_LIVE_OK
ANA_LIVE_POSTVERIFY_V1_OK
ANA_DURABLE_CORE_STATE_V1_OK
CORE_ROLE_003_LIVE_CLONE_FULL_VERIFY_OK
```

The disposable clone was removed after verification.

## Live application

A final second-pass decision review reconfirmed:

- exact `main` SHA and exact Git blobs;
- green PR and `main` CI;
- fresh validated backup;
- successful restored-live-snapshot rehearsal;
- healthy Supabase services;
- expected pre-migration policy/grant state;
- no live Wandora customer rows;
- migration is internally transactional;
- migration creates no password and leaves runtime connection limit at zero.

The exact migration file was applied as `supabase_admin` with `ON_ERROR_STOP=1`.

Result:

```text
MIGRATION_003_LIVE_OK
CORE_RUNTIME_ROLE_V1_LIVE_OK
ANA_LIVE_POSTVERIFY_V1_OK
CORE_ROLE_003_LIVE_POSTVERIFY_OK
```

Post-deployment role state:

```text
role: wandora_core_runtime
LOGIN: true
CONNECTION LIMIT: 0
BYPASSRLS: false
password: absent
```

No customer data was inserted. PostgreSQL remained non-public.

## Post-deployment health

All Supabase services remained healthy. Public smoke remained unchanged:

```text
supabase.wandora.com.br root: HTTP 404 (intentional)
studio.wandora.com.br unauthenticated: HTTP 401
CORE_ROLE_003_POST_HEALTH_OK
```

## Secret / activation boundary

**Do not create a password merely because the role now exists.**

The live role is intentionally unusable until a reviewed Wandora Core runtime deployment and operator-controlled secret path exist. The credential must never enter Git or chat. Activating the runtime requires a separate reviewed operation that:

1. packages/deploys the Core service on the private Wandora network;
2. defines an operator-controlled secret injection/storage path;
3. generates a fresh database password outside Git/chat;
4. sets the smallest justified non-zero connection limit;
5. proves Core connects as `wandora_core_runtime`, not an administrative/service role;
6. proves RLS tenant scope is transaction-local in the deployed runtime;
7. keeps PostgreSQL without a public port.

## Recovery boundary

No automatic role drop, policy rollback, schema drop or database restore is authorized by this runbook.

Migration `003` committed successfully and both live-safe verifiers passed. If later evidence shows a problem, stop real-path promotion and make a separate recovery decision from current evidence. The fresh pre-003 dump and checksum must be retained at least through the supervised real-path proof and a later explicit retention decision.
