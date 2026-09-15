# ADR 0011 — Wandora Core Private Runtime V1

Date: 2026-09-14
Status: **Accepted; private runtime deployed live and database mode activated through the least-privilege runtime role.**

## Context

ADR 0009 created durable Wandora Core business semantics and ADR 0010 created the least-privilege PostgreSQL boundary. The runtime had to exist as a deployable private service before any real database credential was created.

A paying business customer should experience Ana as an employee, not as infrastructure. The Wandora operator still needs clear process health, readiness and a private path between Messaging Gateway, Core and PostgreSQL.

## Decision

Package `apps/core` as a pinned Node 22 container and deploy it privately with no host-published port.

Operational semantics:

- `GET /healthz` proves process health;
- `GET /readyz` proves business readiness;
- standby returns health 200 but readiness 503;
- database mode returns readiness 200 only after the accepted database identity and unscoped connection are verified;
- raw dependency errors and credentials are never returned by readiness.

The base service attaches to `wandora-core`. Database mode additionally attaches to internal `wandora-data` and reaches only the Supabase DB through private alias `wandora-postgres`.

The database password is mounted as a file secret, never placed in Git/chat or an inspect-visible environment variable. Database mode accepts only `WANDORA_CORE_DB_USER=wandora_core_runtime`.

Readiness becomes green only after PostgreSQL confirms both:

1. `current_user = wandora_core_runtime`;
2. the pooled connection begins with no leaked transaction-local `wandora.organization_id` scope.

## Security posture

The runtime image:

- runs as the non-root Node user;
- uses a read-only root filesystem;
- drops Linux capabilities and enables `no-new-privileges`;
- publishes no host port;
- exposes no public hostname;
- receives no model-provider token;
- can boot healthy in standby without any production secret.

The production Core DB secret remains host-managed, mode `0640`, owner `wandora-admin`, group `wandora-ops`. Database overlay requires explicit `WANDORA_CORE_SECRET_GID`; production uses the `wandora-ops` numeric GID as the sole supplemental secret-reader group for the non-root Node process.

## Initial private runtime verification

Before publication the canonical verifier proved:

```text
ANA_LIVE_POSTVERIFY_V1_OK
CORE_RUNTIME_ROLE_V1_LIVE_OK
ANA_DURABLE_CORE_STATE_V1_OK
TypeScript strict: green
production build: green
17/17 Node tests: green
standby image /healthz: 200
standby image /readyz: 503
no published Core host port
WANDORA_CORE_PRIVATE_RUNTIME_V1_OK
```

## Live standby evidence — 2026-09-14

PR #23 was merged to `main` at:

```text
d4e95706284d7df6959a536f200b44c0a409df90
```

Core CI passed on the PR head and resulting `main` push. The exact merged Dockerfile, runtime entrypoint and standby Compose blobs were matched against the VPS before deployment.

Initial live standby returned:

```text
status=running
health=healthy
user=node
readonly=true
capdrop=["ALL"]
security=["no-new-privileges:true"]
networks=wandora-core
published_ports=none
mode=standby
health_status=200
ready_status=503
ready_reason=standby
```

No database credential, customer traffic or model-provider credential was introduced by that standby deployment.

## Security gate #22 completion — 2026-09-14

Before database activation, the affected shared Supabase HS256/JWT compatibility material and shared PostgreSQL password were rotated in a separate backup-aware operation. Old credentials were invalidated, all services returned healthy, and the production-safe verifiers remained green.

Operational details and recovery checkpoints are recorded in `docs/infra/supabase-credential-rotation-gate22.md`.

## Database activation — 2026-09-14

The Supabase DB was attached to internal `wandora-data` with private alias `wandora-postgres` while retaining its normal Supabase network. PostgreSQL remained without a published host port.

The first database-overlay start failed closed because standalone Compose preserved host ownership on the bind-mounted `0600` secret and the non-root `node` user could not read it. No business traffic was accepted. Core was immediately returned to standby and the runtime role was reset to no password / `CONNECTION LIMIT 0`.

PR #26 converted this finding into a tested source-of-truth rule: the secret remains non-world-readable and Core receives only the explicit operator-group GID as a supplemental group. CI now boots the production image in database mode and requires `/readyz = 200` with this model.

After PR #26 and green main CI, activation succeeded:

```text
status=running / healthy
mode=database
readonly=true
capdrop=["ALL"]
security=["no-new-privileges:true"]
groups=["987"]
networks=wandora-core wandora-data
published_ports=none
healthz=200
readyz=200
secret mount=read-only
```

`wandora_core_runtime` is active with exactly `CONNECTION LIMIT 4`, a dedicated password, and no superuser/createdb/createrole/inherit/replication/bypassrls capabilities.

A live pooled-connection proof confirmed transaction-local tenant scope resets after commit/reuse:

```text
current_user=wandora_core_runtime
scope_before=""
scope_during="11111111-1111-1111-1111-111111111111"
scope_after_reuse=""
CORE_RUNTIME_POOLED_SCOPE_RESET_OK
```

PR #27 introduced a separate activated-state read-only verifier. Final canonical/live evidence:

```text
ANA_LIVE_POSTVERIFY_V1_OK
CORE_RUNTIME_ACTIVATED_V1_LIVE_OK
CORE_DATABASE_ACTIVATION_CANONICAL_VERIFIERS_OK
CORE_DATABASE_ACTIVATION_OPERATIONAL_POSTVERIFY_OK
```

All Supabase services remained healthy, PostgreSQL remained non-public, Studio remained protected, and customer/Auth/business row counts remained zero.

See `docs/infra/core-runtime-database-activation-v1.md` for the operational record and rollback boundary.

## Consequences

Core now exists as a real private service with a verified least-privilege path to canonical PostgreSQL. Operators can still distinguish process health from business readiness, and database access does not require exposing the service or PostgreSQL publicly.

This slice does not itself accept customer traffic. Its value is removing runtime/database ambiguity so the next product slice can focus only on normalized Messaging Gateway → Core behavior.

## Next step

Proceed to **Messaging Gateway → Wandora Core supervised wiring**:

1. keep raw Evolution payloads/provider IDs inside the Messaging Gateway;
2. send only normalized provider-neutral inbound events to Core;
3. keep deterministic/fake Agent Runtime behavior first where possible;
4. preserve durable inbound receipt/idempotency semantics;
5. do not introduce autonomous customer traffic yet;
6. request a fresh model-provider credential only when the first real model-backed proposal is materially required.
