# ADR 0011 — Wandora Core Private Runtime V1

Date: 2026-09-14
Status: **Accepted; standby deployed live. Security gate #22 is cleared; database credential activation remains a separate reviewed step.**

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

## Security gate #22 completion — 2026-09-14

The later credential-exposure gate was cleared in a separate backup-aware operation before any Core database activation.

The affected shared Supabase HS256/JWT compatibility material and shared PostgreSQL password were rotated without recording replacement values in Git/chat. The existing EC/ES256 signing identity and unrelated modern/independent secrets were preserved.

Accepted live evidence includes:

```text
pre-rotation legacy service_role REST proof: 401 after cutover
current legacy service_role REST proof: 200
modern sb_secret REST proof: 200
old_postgres_password_network=revoked
new_postgres_password_network=accepted
all_postgres_password_consumers_updated=yes
all Supabase services: healthy
ANA_LIVE_POSTVERIFY_V1_OK
CORE_RUNTIME_ROLE_V1_LIVE_OK
GATE22_LIVE_VERIFIERS_OK
```

The Core remained in standby throughout; `wandora_core_runtime` still has no password and connection limit zero. Operational details and recovery checkpoints are recorded in `docs/infra/supabase-credential-rotation-gate22.md`.

## Consequences

Core now exists as a real private service while remaining intentionally unable to do business work. Operators can distinguish “alive” from “authorized for business work,” preventing pressure to create credentials early merely to satisfy container health.

Security gate #22 no longer blocks least-privilege connectivity work. The next real-path step can focus exclusively on attaching the reviewed private data network, provisioning the dedicated Core credential and proving the deployed authorization boundary.

No customer-facing feature is added by this slice; its value is removing runtime/deployment ambiguity before Gateway → Core supervised wiring.

## Next step

The next operation is separate from the completed gate #22 rotation:

1. attach the Supabase database to `wandora-data` through reviewed source-of-truth configuration;
2. generate the Core database password outside Git/chat;
3. store it only in the approved operator-controlled secret file;
4. activate the smallest justified non-zero connection limit;
5. start Core with the database overlay;
6. prove `/readyz = 200` as `wandora_core_runtime` while PostgreSQL remains non-public;
7. prove pooled transaction reuse does not retain tenant scope between requests;
8. only then accept normalized inbound work in a later supervised slice.
