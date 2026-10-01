# Production Rollback Freeze + Secret Metadata Readback V1

Status: **PREPARED CONTRACT / NOT YET EXECUTED**

This runbook narrows the operator-local operation required by ADR 0299. It is not an activation runbook.

## Hard stops

Do not execute any backup write unless all prechecks below are fresh and GREEN in the same operator window. Any mismatch is STOP / NO EFFECT.

Never:

- deploy or promote Core, Paperclip or Organization Adapter;
- enable Semantic Fast Read, Semantic Selector, Fast Read execution or Human Send;
- change Task Drain;
- call TypeSafe, Mistral or VendaERP;
- create customer work or outbound;
- print/read secret values;
- widen Remote-Ops/Docker permissions;
- move the recovery bundle into `/opt/wandora/ops-workspace`;
- pull a helper image during the operation;
- create a new Wandora-owned backup/secret/lifecycle subsystem.

## Fresh pre-effect checks

Using the existing operator authority:

1. Paperclip container is running/healthy, image exactly `wandora/paperclip:v2026.916.0`, restart count 0.
2. `/api/health` is `status=ok`, commit exactly `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`, database backup status `ok`.
3. Reuse Paperclip stored-board authority and the existing Task Drain endpoint; require:
   - drain disabled;
   - `activeRuns=0`;
   - `pendingWakes=0`;
   - `quiescent=true`.
4. Reuse Paperclip plugin registry read; require exactly one `wandora.organization-adapter-v1`, version `0.3.1`, status `ready`, empty lastError, and an existing packagePath under `/paperclip/`.
5. Before the first persistent rollback write, require the live custody sources to exist with the expected basic type: `/paperclip/instances/default/secrets/master.key` regular file, `/paperclip/adapter-plugins.json` regular file, `/paperclip/operator-packages` directory, and the exact OA 0.3.1 `packagePath` directory. The adapter registry path is the current production provider path derived from live `PAPERCLIP_HOME=/paperclip`; do not use the stale `/paperclip/instances/default/adapter-plugins.json` path.
6. Core must remain healthy/restart 0 on `wandora/core:organization-adapter-candidate-f3225586d082`.
7. Read only these effect flags from Core and require false/absent:
   - `WANDORA_FAST_READ_EXECUTION_ENABLED`;
   - `WANDORA_SEMANTIC_FAST_READ_ENABLED`;
   - `WANDORA_SEMANTIC_SELECTOR_ENABLED`;
   - `WANDORA_HUMAN_SEND_PROPOSAL_ENABLED`.
8. Messaging Gateway must remain healthy/restart 0 and `WANDORA_GATEWAY_OUTBOUND_ENABLED=false`.
9. Metadata-only `stat` the TypeSafe Core key, `wfri1` HMAC and existing Mistral key. Require regular non-symlink files, `wandora-admin:wandora-ops`, mode `0640`.
10. Require a **pre-existing local** `postgres:18.1` image qualified by the separate PostgreSQL 18.1 recovery-image acquisition slice. Its local `RepoDigests` must include official index digest `postgres@sha256:1090bc3a8ccfb0b55f78a494d76f8d603434f7e4553543d6e807bc7bd6bbd17f` and platform must be `linux/amd64`. If absent or mismatched, STOP; do not pull or retag it as part of this slice.
11. Prove the live Paperclip target resolves as `embedded-postgres@54329`, construct exactly the provider-local loopback connection contract used by pinned Paperclip v2026.916.0 `db:backup`, and pass that URI to PostgreSQL clients through their documented `--dbname` connection-string argument, matching pinned Paperclip `backup-lib.ts`. Require live `SHOW data_directory` to equal Paperclip's resolved embedded `dataDir`, then prove a PostgreSQL 18.1 schema-only read before any backup write. Do not use `resolveMigrationConnection` because it may adopt/start an embedded cluster. The URI must remain transient process state only; do not print or persist it.

## Recovery bundle

Only after all prechecks pass, create one unique protected root:

`/home/wandora-admin/backups/paperclip-v9161-fast-read-rollback-freeze-v1-<UTC>/`

Custody:

- root directory 0700;
- contents 0600;
- owner/group `wandora-admin:wandora-ops`.

Capture:

- one official `paperclipai db:backup` using a unique filename prefix so normal `paperclip-*` retention is not pruned;
- copy of that fresh `.sql.gz`;
- matching live `master.key`; prove source/copy byte equality without emitting key contents or a public key-derived digest;
- PostgreSQL 18.1 `pg_dump -Fc` from live;
- live schema-only dump;
- current `adapter-plugins.json`;
- complete `/paperclip/operator-packages`;
- the exact OA 0.3.1 package tree from its current plugin registry `packagePath`;
- Paperclip `compose.yaml`;
- Paperclip `compose.paperclip-execution-bridge.yaml`;
- `paperclip-bridge-secret-entrypoint.sh`;
- current Core `compose*.yaml`;
- safe runtime anchors: image IDs/tags, health, restart counts, active Compose file labels, OA version/status, gate booleans and Task Drain projection.

## Disposable restore validation

Start a fresh `postgres:18.1` container with:

- no published ports;
- `--network none`;
- no live Paperclip volume;
- no customer/provider connectivity.

Restore the custom-format dump, dump schema-only, normalize only generated psql `\\restrict/\\unrestrict` lines plus the volatile `-- Dumped from database version ...` metadata comment, and require byte-equal normalized schema against the live schema dump. Preserve `-- Dumped by pg_dump version ...` and every SQL/schema line. Before `createdb`, wait for the official PostgreSQL entrypoint marker `PostgreSQL init process complete; ready for start up.`, then require a successful final-server `SELECT 1`; do not use `pg_isready` as the advancement gate because the temporary initialization server can satisfy it before the final server is ready.

Any restore/schema mismatch is STOP and the bundle must not be marked qualified.

## Protected manifest and receipt

Create protected SHA-256 manifests for non-key files. Do not place `master.key` in any user-visible digest list.

Write a safe receipt at:

`/opt/wandora/ops-workspace/production-rollback-freeze-v1.metadata`

The receipt may contain only:

- rollback root;
- Paperclip/Core/Gateway image identities and health/restart metadata;
- OA count/version/status;
- Task Drain quiescent boolean;
- official backup created/gzip-valid booleans;
- master-key source-copy equality boolean;
- schema restore/equality booleans;
- TypeSafe/`wfri1`/Mistral path + owner/group/mode/type;
- `activation_performed=false`;
- `provider_call_performed=false`;
- `customer_effect=false`;
- `outbound_effect=false`;
- terminal marker `ROLLBACK_FREEZE_V1_OK`.

The receipt must not contain secret values, DB credentials, provider payloads or customer data.

## After operator execution

Do not activate anything.

A new agent/chat must:

1. reconcile the current GitHub head before trusting the receipt;
2. read the receipt;
3. independently verify the protected recovery root/manifest without exposing secrets;
4. recheck Task Drain, Paperclip/Core/OA/Gateway and all gates;
5. update the ADR checkpoint only if the recovery freeze is proven GREEN;
6. then start a **new Immediate Pre-Mutation Attestation + Effect Authorization** from fresh state.

No production promotion is authorized by this runbook.


## Qualified completion — 2026-09-27

This runbook completed successfully against PR #369 head `c85d27b06afed51a157d48dfd26ffc8b23508767` with helper blob `631a540c97ab320932fe0a4d1683e0a31049c2f4`.

Qualified receipt: `/opt/wandora/ops-workspace/production-rollback-freeze-v1.metadata`.

Qualified rollback root: `/home/wandora-admin/backups/paperclip-v9161-fast-read-rollback-freeze-v1-20260927T085922932680245Z`.

Independent validation confirmed the official backup, disposable restore, schema equality, Task Drain quiescence and no activation/provider/customer/outbound effect. Protected recovery artifacts were physically rechecked through a root read-only metadata path without reading secret contents.

**Do not rerun this helper merely to reconfirm success.** Treat the receipt and canonical checkpoint as the recovery-freeze evidence for this slice. Any future mutation must begin from a new **Immediate Pre-Mutation Attestation + Effect Authorization** with fresh runtime evidence.
