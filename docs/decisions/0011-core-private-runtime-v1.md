# ADR 0011 — Wandora Core Private Runtime V1

Date: 2026-09-14
Status: **Accepted when merged; live credential activation remains separately gated**

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

The real password and non-zero connection limit are not part of this PR. They are created only after the image/private network/secret path are live and after any outstanding credential-rotation security gate is cleared.

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

Before publication the canonical verifier must prove:

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

Both base and database-activation Compose shapes must parse successfully without requiring a real credential.

## Consequences

The next real-path step can focus on credential activation and connectivity rather than simultaneously inventing a process/runtime deployment. Operators can distinguish “alive” from “authorized for business work,” preventing pressure to create credentials early merely to satisfy container health.

No customer-facing feature is added by this slice; its value is removing the last infrastructure ambiguity before Gateway → Core supervised wiring.

## Next step

After merge and CI, deploy the image in `standby` mode only. Then clear any mandatory secret-rotation gate, attach the Supabase database to `wandora-data` through reviewed source-of-truth configuration, generate the Core database password outside Git/chat, activate the smallest justified connection limit, and prove `/readyz = 200` as `wandora_core_runtime` before accepting normalized inbound work.
