# PostgreSQL 18.1 Recovery Image Acquisition V1

Status: **PREPARED CONTRACT / NOT YET EXECUTED**

This is a prerequisite slice for ADR 0299. It exists because ADR 0299 intentionally forbids pulling a helper image during the rollback freeze.

## Frozen source

Use only:

`postgres@sha256:1090bc3a8ccfb0b55f78a494d76f8d603434f7e4553543d6e807bc7bd6bbd17f`

Expected platform:

`linux/amd64`

Target local tag after qualification:

`postgres:18.1`

Do not substitute `latest`, `18`, another 18.x patch release, a third-party Postgres image or an unpinned rebuild.

## Hard stops

Stop if:

- host architecture is not x86_64/linux-amd64;
- `postgres:18.1` already exists but does not carry the pinned official RepoDigest;
- the pinned digest cannot be pulled/read;
- the image reports a platform other than linux/amd64;
- a no-network `postgres --version` does not report PostgreSQL 18.1;
- the safe receipt already exists and has not been reconciled.

Never widen Remote-Ops permissions, restart a Wandora service, recreate a production container or run ADR 0299 in the same step.

## Operator execution

Run only the exact helper from an exact CI-GREEN Wandora commit:

`scripts/operations/prepare-postgres-18-1-recovery-image-v1.sh`

The helper accepts no arguments.

Its only external network effect is a Docker registry pull of the pinned official digest if that digest is not already cached locally.

Runtime qualification uses a disposable container with `--network none`.

## Receipt

Safe receipt:

`/opt/wandora/ops-workspace/postgres-18-1-recovery-image-v1.metadata`

It may contain only source ref/digest, target tag, platform, image ID, PostgreSQL version, whether a registry pull occurred, and explicit false markers for service restart, production container recreation, customer/provider/outbound effects.

Terminal marker:

`POSTGRES_18_1_RECOVERY_IMAGE_V1_OK`

## After execution

Do not immediately continue by assumption.

A fresh reconciliation must verify the receipt, Task Drain and absence of ADR 0299 receipt. Then ADR 0299 may be rerun using its own exact CI-qualified helper and its own second adversarial review.
