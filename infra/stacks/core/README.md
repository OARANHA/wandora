# Wandora Core Private Runtime V1

This stack packages Wandora Core as a private operator-managed service. It is not a public customer endpoint.

## Network boundary

The Core container has no published host port.

- `wandora-core` — private application/control network shared with provider-neutral Wandora services such as Messaging Gateway and Paperclip.
- `wandora-data` — internal Docker network used only for the Core-to-PostgreSQL data path.
- `wandora-edge` — Core is intentionally **not** attached in V1.

The Supabase `db` service receives the `wandora-postgres` alias on `wandora-data`. PostgreSQL remains unpublished publicly.

## Standby deployment

Build the reviewed image from repository root:

```bash
docker build -t wandora/core:private-runtime-v1 apps/core
```

Deploy the base stack with no database credential:

```bash
docker compose -f infra/stacks/core/compose.yaml up -d
```

In standby mode `/healthz` returns 200 while `/readyz` returns 503 with `reason=standby`. This is intentional: the process is healthy but not authorized for business traffic.

## Credential activation boundary

Do not generate the production database password until the standby image and private network path are already proven.

The real password must be generated outside Git/chat and stored in an operator-controlled file such as `/opt/wandora/secrets/core-db-password`, mode `0600`. It is mounted into the container as a Compose secret; it is not placed in `.env` or Docker inspect-visible environment variables.

Activation uses both Compose files:

```bash
export WANDORA_CORE_DB_PASSWORD_FILE=/opt/wandora/secrets/core-db-password
docker compose \
  -f infra/stacks/core/compose.yaml \
  -f infra/stacks/core/compose.database.yaml \
  up -d
```

Before activation, the live `wandora_core_runtime` role must still have no password and `CONNECTION LIMIT 0`. The reviewed activation operation sets a fresh password and the smallest justified non-zero connection limit only when the service is ready to consume it immediately.

## Readiness proof

In database mode `/readyz` becomes 200 only if the runtime can connect and prove:

- PostgreSQL reports `current_user = wandora_core_runtime`;
- no transaction-local `wandora.organization_id` scope leaked onto the pooled connection.

Raw database errors and credentials are never returned by the readiness endpoint.

## Organization Adapter candidate wiring

`compose.organization-adapter.yaml` is an explicit candidate-only overlay. The base Core stack keeps the Organization Adapter disabled.

The overlay:

- enables `WANDORA_ORGANIZATION_ADAPTER_ENABLED=true`;
- pins the private Paperclip webhook to `wandora-paperclip:3100`;
- mounts an operator-controlled per-company HMAC directory read-only at `/run/secrets/wandora/organization-adapter`;
- never puts raw HMAC material in Git, PostgreSQL or environment variables;
- does **not** add a customer HTTP route or expose `Contratar/Ativar funcionário`.

Example candidate composition only after migrations 010/011, Paperclip plugin/config and custody material have passed their own reviewed gates:

```bash
export WANDORA_CORE_DB_PASSWORD_FILE=/opt/wandora/secrets/core-db-password
export WANDORA_CORE_SECRET_GID="$(id -g)"
export WANDORA_ORGANIZATION_ADAPTER_SECRET_DIR_HOST=/opt/wandora/secrets/organization-adapter

docker compose \
  -f infra/stacks/core/compose.yaml \
  -f infra/stacks/core/compose.database.yaml \
  -f infra/stacks/core/compose.organization-adapter.yaml \
  config
```

This command only renders the candidate composition. Production deployment remains a separately reviewed operation.

When the candidate flag is enabled, readiness additionally probes the three migration-011 private tables using `wandora_core_runtime`. If that least-privilege boundary is missing or inaccessible, `/readyz` fails closed with `organization-adapter-database-boundary-unavailable`. This prevents a candidate from appearing ready before the database contract is activated.

The host custody directory must be operator-controlled. Individual HMAC files use deterministic SHA-256-derived filenames resolved from the frozen provider company reference and are opened without following symlinks by the Core resolver.

## Current non-goals

Private Runtime V1 does not by itself:

- expose a public hostname;
- create a customer hiring/activation route;
- install/configure the production Paperclip managed plugin;
- create production per-company HMAC material;
- apply migrations 010/011;
- bypass Core policy/approval boundaries.

Existing supervised Gateway/Mastra/Human API capabilities remain separate reviewed overlays.

## Verification

The Core verifier must prove all of the following before merge/deployment:

```text
TypeScript strict: green
production build: green
Core/Ana integration tests: green
standby container /healthz: 200
standby container /readyz: 503
no published Core host port
Organization Adapter base flag: absent/OFF
Organization Adapter candidate overlay: private Paperclip URL + read-only custody mount
Organization Adapter candidate before migration 011: /readyz = 503
Organization Adapter boundary after migration 011: verifier green
no customer Organization Adapter route
```

After any future production database activation, the operator proof additionally requires `/readyz = 200` through the real `wandora_core_runtime` credential while PostgreSQL remains non-public.
