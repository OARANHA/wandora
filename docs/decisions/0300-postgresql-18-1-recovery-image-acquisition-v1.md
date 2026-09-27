# ADR 0300 — PostgreSQL 18.1 Recovery Image Acquisition V1

Date: 2026-09-27

Status: **PREPARED / CI REQUIRED / NO PRODUCTION EFFECT**

## Context

ADR 0299 requires a pre-existing local `postgres:18.1` image before the rollback freeze begins. The first operator-local attempt after Task Drain decoding was corrected stopped fail-closed before its first write with:

`ROLLBACK_FREEZE_V1_ERROR: local postgres:18.1 image absent; do not pull in this slice`

The ADR 0299 hard stop is correct and remains unchanged: the freeze itself must not download a helper image.

## REAL NOW

- ADR 0299 helper is qualified at PR #369 head lineage and fails before the first backup write when the recovery utility image is absent.
- Fresh Task Drain readback remains OFF / 0 active runs / 0 pending wakes / quiescent.
- No ADR 0299 safe receipt exists.
- No rollback root was created by the failed image precheck because the image guard precedes the first-write boundary.
- The host is x86_64 / linux-amd64.
- Current Remote-Ops authority is not widened by this decision.

## PROVEN EVIDENCE

The accepted recovery pattern in ADRs 0129/0130 used PostgreSQL 18.1 for schema-faithful dump and isolated restore verification.

The official Docker Hub `library/postgres:18.1` publication was rechecked on 2026-09-27. This slice freezes the source by multi-platform index digest:

`sha256:1090bc3a8ccfb0b55f78a494d76f8d603434f7e4553543d6e807bc7bd6bbd17f`

For the production host platform, the observed linux/amd64 manifest is:

`sha256:2ccc3d98b960df5ed1ee2d32d3d5338a3c688cf899c0e951ce6d45fb07395abc`

The index digest is the operator acquisition identity. ADR 0299 additionally verifies the local tag's `RepoDigests` contains the pinned official index digest and that the local image platform is `linux/amd64`.

## CAPABILITY AUTHORITY / REUSE GATE

This slice does not create a Wandora database or backup subsystem.

- PostgreSQL remains the specialist recovery utility already required by the accepted recovery contract.
- Wandora owns only the qualification/effect boundary for the production operation.
- The official `library/postgres` image is reused directly by digest.
- No registry mirror, image-builder service, package manager, lifecycle controller or durable provider mirror is introduced.
- Remote-Ops authority remains unchanged.

ADR 0168 is preserved: portability is contract decoupling, not implementation duplication.

## Decision

Separate image acquisition from the rollback freeze.

A reviewed operator-local helper may:

1. require root and zero arguments;
2. fail if an existing `postgres:18.1` tag points to a different digest;
3. reuse the exact digest locally if already cached;
4. otherwise pull only `postgres@sha256:1090bc3a8ccfb0b55f78a494d76f8d603434f7e4553543d6e807bc7bd6bbd17f` for `linux/amd64`;
5. prove `postgres --version` reports PostgreSQL 18.1 inside a disposable `--network none` container;
6. tag that exact qualified image locally as `postgres:18.1`;
7. write one safe metadata receipt in `/opt/wandora/ops-workspace`.

This slice does not run ADR 0299 and does not create the protected rollback bundle.

## Effect boundary

Authorized future effect, only after exact-head CI and a fresh second review:

- Docker registry read/pull of one exact digest if absent;
- local Docker image cache/tag update;
- one disposable no-network version-check container;
- one safe metadata receipt.

Not authorized:

- Core/Paperclip/OA deploy or restart;
- Compose mutation;
- Task Drain mutation;
- secret reads;
- provider/model/VendaERP calls;
- customer work;
- Gateway outbound;
- ADR 0299 backup creation;
- any Remote-Ops policy widening.

## Validation required after operator execution

Require:

- receipt ends exactly in `POSTGRES_18_1_RECOVERY_IMAGE_V1_OK`;
- source index digest matches the frozen digest;
- platform = `linux/amd64`;
- runtime version begins with `postgres (PostgreSQL) 18.1`;
- no production service restart/recreate;
- Task Drain remains OFF / 0 / 0 / quiescent;
- ADR 0299 receipt remains absent.

Only then may ADR 0299 be rerun from a fresh operator window.
