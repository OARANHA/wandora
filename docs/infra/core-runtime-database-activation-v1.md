# Core Runtime Database Activation V1

Date: 2026-09-14
Status: **Live and verified**

This runbook records activation of the already-created `wandora_core_runtime` PostgreSQL identity and the already-deployed private Wandora Core runtime. No secret value is recorded here.

## Preconditions

Before activation:

- security gate #22 was completed and affected shared Supabase credentials were rotated;
- Core was healthy in standby with `/readyz = 503`;
- `wandora_core_runtime` had no password and `CONNECTION LIMIT 0`;
- `wandora-data` existed as an internal Docker network;
- the database overlay and Supabase network override were already reviewed in Git;
- PostgreSQL had no directly published port and Supavisor was localhost-only.

## Phase A — private data network

The live Supabase override was updated to the exact source-of-truth blob that attaches only `supabase-db` to `wandora-data` with the private alias `wandora-postgres` while preserving its normal Supabase network.

Only the DB service was recreated for this phase. Post-check confirmed:

```text
supabase-db networks: supabase_default + wandora-data
wandora-data: internal=true
private alias: wandora-postgres
PostgreSQL direct published ports: 0
Supavisor: localhost-only
all Supabase services: healthy
Core remained standby
```

## Phase B — dedicated Core credential

The Core password was generated outside Git/chat and stored at:

```text
/opt/wandora/stacks/core/secrets/wandora_core_db_password
```

The value must never be copied into documentation, Git, chat, process arguments or environment variables.

The runtime role was activated with:

```text
LOGIN: true
CONNECTION LIMIT: 4
BYPASSRLS: false
password: present
```

Limit `4` matches the Core PostgreSQL pool maximum; no larger connection allowance was justified.

## Fail-closed secret mount finding

The first database-overlay start failed closed because standalone Docker Compose bind-mounted the host secret with host ownership. The image runs as non-root `node` (`1000:1000`), while the host operator is `wandora-admin` (`1001`) and the operator group is `wandora-ops` (`987`). A host-owned `0600` file was therefore unreadable inside the container.

The failed attempt did not accept business traffic. Core was immediately restored to standby and `wandora_core_runtime` was returned to passwordless / `CONNECTION LIMIT 0` before the fix was prepared.

PR #26 fixed the boundary without weakening it:

- Core remains non-root;
- the secret is not world-readable;
- the host secret is `0640`, owner `wandora-admin`, group `wandora-ops`;
- `compose.database.yaml` requires explicit `WANDORA_CORE_SECRET_GID`;
- production uses GID `987` as a supplemental container group;
- CI now boots the production image in database mode and requires readiness with a group-readable secret.

## Successful activation

After PR #26 and green CI, the exact merged overlay was installed live. The role was reactivated with the same unexposed dedicated credential and the Core was started with:

```text
WANDORA_CORE_SECRET_GID=987
WANDORA_CORE_DB_USER=wandora_core_runtime
WANDORA_CORE_DB_HOST=wandora-postgres
```

Live runtime proof:

```text
status: running / healthy
mode: database
root filesystem: read-only
capabilities: ALL dropped
no-new-privileges: true
supplemental group: 987
networks: wandora-core + wandora-data
published host ports: none
GET /healthz: 200
GET /readyz: 200
secret mount: read-only
```

## Tenant-scope pool proof

Using a live `pg.Pool(max=1)` connection through the Core credential:

```text
current_user=wandora_core_runtime
scope_before=""
scope_during="11111111-1111-1111-1111-111111111111"
scope_after_reuse=""
CORE_RUNTIME_POOLED_SCOPE_RESET_OK
```

This proves transaction-local `wandora.organization_id` scope does not survive commit/reuse on the same physical pooled connection.

## Activated-state verifier

The original `VERIFY_20260914_CORE_RUNTIME_ROLE_V1_LIVE.sql` remains intentionally unchanged: it proves that migration `003` itself leaves the role credential-disabled.

PR #27 adds the separate production-safe activated-state verifier:

```text
infra/stacks/supabase/verifiers/VERIFY_20260914_CORE_RUNTIME_ACTIVATED_V1_LIVE.sql
```

It requires exactly `CONNECTION LIMIT 4` plus a present password while preserving all original checks for no superuser/createdb/createrole/inherit/replication/bypassrls, no role membership, narrow grants, RLS policies, audit boundaries and no Core `pg_net` access.

Final canonical evidence:

```text
ANA_LIVE_POSTVERIFY_V1_OK
CORE_RUNTIME_ACTIVATED_V1_LIVE_OK
CORE_DATABASE_ACTIVATION_CANONICAL_VERIFIERS_OK
CORE_DATABASE_ACTIVATION_OPERATIONAL_POSTVERIFY_OK
```

All Supabase services remained healthy, PostgreSQL remained non-public, unauthenticated Studio remained `401`, and Auth/customer/business row counts remained zero.

## Rollback boundary

If database readiness later becomes unsafe:

1. recreate Core using only the base standby Compose;
2. set `wandora_core_runtime` password to NULL and `CONNECTION LIMIT 0`;
3. prove `/healthz = 200` and `/readyz = 503` standby;
4. retain the private DB network attachment unless evidence shows that network itself is the problem;
5. do not restore shared credentials from gate #22 rollback snapshots.

## Next slice

The database activation is complete. The next product-path slice is **Messaging Gateway → Wandora Core supervised wiring**. Start with normalized provider-neutral inbound events and deterministic/fake Agent Runtime behavior where possible. A real model-provider credential is still not required.
