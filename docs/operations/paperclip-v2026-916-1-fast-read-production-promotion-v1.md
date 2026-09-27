# Paperclip v2026.916.1 Fast Read Production Promotion V1

Status: **EXECUTED / GREEN on 2026-09-27 — Paperclip v2026.916.1 live; OA remains 0.3.1; semantic/outbound effects OFF**

## Scope

This runbook promotes exactly the frozen ADR 0295 Paperclip candidate from the current production `wandora/paperclip:v2026.916.0` runtime to `wandora/paperclip:v2026.916.1`.

It is deliberately limited to the Phase 2 first compatibility effect from ADR 0294:

- Paperclip only;
- Organization Adapter remains exactly `0.3.1`;
- Core remains unchanged;
- Semantic Fast Read remains OFF;
- Semantic Selector remains OFF;
- Human Send remains OFF;
- Messaging Gateway outbound remains OFF;
- WhatsApp Fast Read remains disconnected;
- no provider, VendaERP, customer-work or outbound attestation is part of this operation.

ADR 0168 remains authoritative. This is provider-runtime compatibility convergence, not Wandora implementation internalization.

## Exact candidate identity

The promotion unit is the exact frozen ADR 0295 archive, not a source rebuild.

Required identity:

- tag: `wandora/paperclip:v2026.916.1`;
- compressed archive SHA-256: `69c962c79375446060af12fc9240385987790f4d11a3528cbb7a6ad745e98269`;
- raw Docker archive SHA-256: `a91f96feff4dbb8161d182e350fc3e2ca1d0d6784cfa9179fdaa20a200e7ce97`;
- OCI manifest digest: `sha256:7b72d43e87d54fcb9aa48b665150e062750c0cacb270e069f94297d58caa91e5`;
- OCI config digest: `sha256:e05f1604cf863d316b4ce5db189782f022fa4fd17544f9724747e11223d4356c`;
- Paperclip source: `d554c4789ed3930f8a53ac9fdf6503b3187097da`.

Cross-runtime identity is the exact archive hashes plus the internal chain:

`archive -> manifest 7b72d43e... -> config e05f1604...`

Do not require post-load Docker `.Id` to equal the historical CI-time `.Id` across differing image-store semantics.

## Qualified rollback anchor

ADR 0299 must already be complete and the safe receipt must end in `ROLLBACK_FREEZE_V1_OK`.

Qualified receipt:

`/opt/wandora/ops-workspace/production-rollback-freeze-v1.metadata`

Qualified protected rollback root:

`/home/wandora-admin/backups/paperclip-v9161-fast-read-rollback-freeze-v1-20260927T085922932680245Z`

Do not rerun the ADR 0299 helper merely to reconfirm success.

## Compose contract

Production Paperclip is composed from:

1. `/opt/wandora/stacks/paperclip/compose.yaml`;
2. `/opt/wandora/stacks/paperclip/compose.paperclip-execution-bridge.yaml`;
3. the exact qualified candidate overlay corresponding to repository file:
   `infra/stacks/paperclip/compose.semantic-fast-read-candidate.yaml`.

The candidate overlay is intentionally limited to:

- remove the inherited `build` recipe with `!reset null`;
- set `image: wandora/paperclip:v2026.916.1`;
- set `pull_policy: never`.

It must not alter environment, ports, volume, network, entrypoint, command, restart policy, secrets, wrapper or container name.

The production command must still use `--no-build --pull never`; the overlay is defense in depth, not a substitute for command-level safety.

## Immediate pre-mutation gates

Immediately before stopping Paperclip, all of the following are mandatory:

1. current Paperclip is exactly `wandora/paperclip:v2026.916.0`, healthy, restart count 0, API `status=ok`;
2. Task Drain is `draining=false`, `activeRuns=0`, `pendingWakes=0`, `quiescent=true`;
3. exactly one `wandora.organization-adapter-v1@0.3.1` is `ready` with `lastError=null`;
4. Core is healthy/restart 0 and its active Compose set does not contain Semantic Fast Read/custody overlays;
5. Core startup still reports `humanSendProposal=false`;
6. Messaging Gateway is healthy/restart 0 and reports `outboundEnabled=false`;
7. the exact candidate tag is already present locally and the frozen archive identity chain above is proven;
8. the ADR 0299 safe receipt and protected rollback root remain present;
9. the exact PR head carrying this runbook/overlay has its applicable CI checks GREEN;
10. a fresh adversarial review explicitly authorizes only this Paperclip promotion.

Any red, missing or ambiguous gate is STOP.

## Environment-file and secret-path rule

Do not guess a Compose environment file and do not print secret values.

At execution time, obtain the active Compose environment-file path from the existing Paperclip container's `com.docker.compose.project.environment_file` label. If absent, ambiguous or no longer readable, STOP and reconcile the current Compose invocation before mutation.

The existing execution-bridge host path remains:

`/opt/wandora/stacks/core/secrets/paperclip-execution-bridge-hmac`

This is an existing path/custody anchor, not a new secret.

## Execution order

### 1. Materialize and verify the exact candidate overlay

Materialize the repository-qualified overlay as:

`/opt/wandora/stacks/paperclip/compose.semantic-fast-read-candidate.yaml`

Do not edit the base Compose file.

Render the future composition before stopping production and prove:

- candidate image is exactly `wandora/paperclip:v2026.916.1`;
- no `build` section remains;
- `pull_policy=never`;
- all other Paperclip service configuration, named volumes and networks are unchanged from base+bridge.

### 2. Stop boundary

Stop **only** the Paperclip service/container.

After the stop returns, prove before recreate:

- `wandora-paperclip` is exited/not running;
- no Paperclip process still owns the embedded PostgreSQL runtime;
- host port 3100 is free;
- Core and Messaging Gateway remain healthy.

If the stop command times out or the control channel disconnects, reconcile actual Docker/process state before any retry.

### 3. Recreate exactly once

Use the same active environment file and the existing bridge secret host path, with the exact three-file Compose set.

The recreate command contract is:

`docker compose ... up -d --no-build --pull never --no-deps --force-recreate --wait --wait-timeout 180 paperclip`

Do not run `docker build`, `docker pull`, `docker tag`, or a source rebuild.

If this command times out, disconnects or returns an ambiguous transport error, inspect the actual container/image/database state before deciding whether any retry is safe. Never replay blindly.

### 4. Migration / rollback boundary

Permit only Paperclip's normal startup/migration path. Do not run handwritten SQL or patch a failing migration.

Before any 916.1 durable migration/change is proven committed, an image-only recovery may be considered only if the database is proven unchanged.

After any 916.1 migration or durable state change commits, **image-only downgrade to 916.0 is forbidden**. Rollback must use the qualified ADR 0299 schema-faithful recovery bundle and matching secret/plugin/Compose anchors.

## Mandatory post-promotion acceptance

Before any Organization Adapter 0.5.0 or Core promotion:

1. Paperclip container is healthy and restart count is expected;
2. API health is `status=ok`;
3. Paperclip build/source reports `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
4. live image/tag corresponds to the exact frozen 916.1 candidate;
5. exactly one Organization Adapter remains `0.3.1`, `ready`, `lastError=null`;
6. Task Drain readback shows no active runs/pending wakes and remains quiescent after startup;
7. no unexpected work/run/wakeup/outbound activity appears;
8. Core remains unchanged and healthy;
9. Human Send remains OFF;
10. Messaging Gateway remains unchanged, healthy and outbound OFF;
11. no Semantic Fast Read / Semantic Selector / WhatsApp Fast Read activation occurred.

Any unexpected activity or identity ambiguity is STOP and invokes the state-dependent rollback decision above.

## Explicit non-authorization

Successful Paperclip 916.1 promotion does **not** authorize:

- Organization Adapter 0.5.0 promotion;
- Core candidate promotion;
- Semantic Fast Read activation;
- Semantic Selector activation;
- TypeSafe/System One call;
- Mistral selector call;
- VendaERP call;
- Human Send;
- Gateway outbound;
- WhatsApp send;
- customer work.

Those remain later separately reviewed effects.


## Execution result — ADR 0303

The procedure completed GREEN on 2026-09-27.

Production result:

- Paperclip: `wandora/paperclip:v2026.916.1`;
- OCI manifest/image ID: `sha256:7b72d43e87d54fcb9aa48b665150e062750c0cacb270e069f94297d58caa91e5`;
- source commit: `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
- health: `status=ok` / Docker healthy;
- restart count: 0;
- startup: existing embedded PostgreSQL reused, `Migrations already applied`;
- startup orphan-run reap: 0;
- Organization Adapter: exactly one `0.3.1`, ready, no error;
- Task Drain: `false/0/0/quiescent`;
- Core/Gateway: unchanged, healthy, restart 0;
- Human Send: OFF;
- Gateway outbound: OFF.

The stop checkpoint was reconciled before recreate. No blind retry occurred.

No Organization Adapter 0.5.0 promotion, Core promotion, Semantic Fast Read activation, Semantic Selector activation, provider call, VendaERP call, customer work or outbound effect was part of this execution.

See ADR 0303 for the complete production evidence and next-slice boundary.
