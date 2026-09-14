# Wandora Core Private Runtime V1

This stack packages Wandora Core as a private operator-managed service. It is not a public customer endpoint.

## Network boundary

The Core container has no published host port.

- `wandora-core` — private application/control network shared with provider-neutral Wandora services such as Messaging Gateway.
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

## Current non-goals

Private Runtime V1 does not yet:

- expose a public hostname;
- accept customer traffic;
- receive normalized Messaging Gateway inbound events;
- call Mastra or a real model provider;
- create a Mistral/Chutes/OpenAI credential;
- bypass Core policy/approval boundaries.

Those are subsequent supervised slices after the private service and least-privilege connection are proven.

## Verification

The Core verifier must prove all of the following before merge/deployment:

```text
TypeScript strict: green
production build: green
Core/Ana integration tests: green
standby container /healthz: 200
standby container /readyz: 503
no published Core host port
```

After database activation, the operator proof additionally requires `/readyz = 200` through the real `wandora_core_runtime` credential while PostgreSQL remains non-public.
