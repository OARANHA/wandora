# ADR 0011 — Wandora Core Private Runtime V1

Date: 2026-09-14
Status: **Accepted; standby deployed live. Database credential activation remains blocked by security gate #22.**

## Context

ADR 0009 created durable Wandora Core business semantics and ADR 0010 created the live least-privilege PostgreSQL role. The role intentionally has no password and `CONNECTION LIMIT 0`.

The next uncertainty is operational: Core must exist as a deployable service before any real credential is created. Exposing a public Core hostname or mixing Gateway wiring, model-provider calls and database activation into one deployment would enlarge the failure surface without creating additional customer value.

A paying business customer should experience Ana as an employee, not as infrastructure. The Wandora operator still needs clear process health, readiness and a private path between Messaging Gateway, Core and PostgreSQL.

## Decision

Package `apps/core` as a pinned Node 22 container and deploy it privately with no host-published port.

The base service attaches only to the existing `wandora-core` application network and starts in explicit `standby` mode with no database credential.

Operational semantics:

- `GET /healthz` proves process health;
- `GET /readyz` proves business readiness;
- standby returns health 200 but readiness 503;
- no business traffic is accepted in Private Runtime V1;
- raw dependency errors and credentials are never returned by readiness.

Database activation is a separate Compose overlay. It attaches Core to the existing internal `wandora-data` network and mounts the database password as a file secret. The password is never placed in Git, chat or an inspect-visible environment variable.

The Supabase `db` service receives only the additional `wandora-data` network and private alias `wandora-postgres`; Core therefore does not need membership in the whole Supabase default network.

In database mode Core accepts only `WANDORA_CORE_DB_USER=wandora_core_runtime`. Readiness becomes green only after PostgreSQL confirms both:

1. `current_user = wandora_core_runtime`;
2. the pooled connection begins with no leaked transaction-local `wandora.organization_id` scope.

The real password and non-zero connection limit are not part of this ADR's live standby deployment. They are created only after the image/private network/secret path are live and after all outstanding credential-rotation security gates are cleared.

## Security posture

The runtime image:

- runs as the non-root Node user;
- uses a read-only root filesystem at deployment;
- drops Linux capabilities and enables `no-new-privileges`;
- publishes no host port;
- exposes no public hostname;
- receives no model-provider token;
- can boot healthy without any production secret.

`wandora-data` is an internal Docker network. `wandora-core` remains the application-side private network used for later Gateway-to-Core wiring.

## Verification

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

Both base and database-activation Compose shapes parse successfully without requiring a real credential.

## Live standby evidence — 2026-09-14

PR #23 was merged to `main` at:

```text
d4e95706284d7df6959a536f200b44c0a409df90
```

Core CI #16 passed on the PR head and Core CI #17 passed on the resulting `main` push.

The exact merged Dockerfile, runtime entrypoint and standby Compose blobs were matched against the VPS staging copy before deployment. `wandora/core:private-runtime-v1` was built and the source-of-truth stack was installed under `/opt/wandora/stacks/core`.

The live standby proof returned:

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
WANDORA_CORE_STANDBY_LIVE_OK
```

The database gate remained closed after deployment:

```text
wandora_core_runtime
CONNECTION LIMIT: 0
BYPASSRLS: false
password: absent
wandora-data members: none
```

Existing Supabase services remained healthy. No Supabase network/container mutation, model-provider credential, customer traffic or Core database credential was introduced by the standby deployment.

A separate security issue, #22, records the requirement to rotate the live shared Supabase JWT/database credentials in a coordinated, backup-aware operation after a private diagnostic expanded them. No value was committed to Git. That rotation is now a mandatory gate before attaching the live database to `wandora-data`, activating `wandora_core_runtime`, or accepting customer traffic.

## Consequences

Core now exists as a real private service while remaining intentionally unable to do business work. Operators can distinguish “alive” from “authorized for business work,” preventing pressure to create credentials early merely to satisfy container health.

The next real-path step can focus on credential hygiene and least-privilege connectivity rather than simultaneously inventing a process/runtime deployment.

No customer-facing feature is added by this slice; its value is removing the runtime/deployment ambiguity before Gateway → Core supervised wiring.

## Next step

Clear security gate #22 first: perform a coordinated Supabase credential rotation with backup, recovery plan, service-health proof and old-credential invalidation.

Only after that gate is green:

1. attach the Supabase database to `wandora-data` through reviewed source-of-truth configuration;
2. generate the Core database password outside Git/chat;
3. store it only in the approved operator-controlled secret file;
4. activate the smallest justified non-zero connection limit;
5. start Core with the database overlay;
6. prove `/readyz = 200` as `wandora_core_runtime` while PostgreSQL remains non-public;
7. only then accept normalized inbound work in a later supervised slice.
