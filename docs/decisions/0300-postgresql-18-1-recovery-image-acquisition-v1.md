# ADR 0300 — PostgreSQL 18.1 Recovery Image Acquisition V1

Date: 2026-09-27

Status: **COMPLETE / QUALIFIED LOCAL RECOVERY IMAGE / NO CUSTOMER EFFECT**

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


## Execution completion — 2026-09-27

The exact helper qualified at PR #369 head `2a95053abc96cff5a0de8ff06cfb8279278515f3` was executed operator-locally as root.

Qualified helper Git blob:

`bdb45f37f6b3efc51069f65c1c09d49cd4e872f0`

Observed result:

```text
POSTGRES_18_1_RECOVERY_IMAGE_V1_OK
source_index_digest=sha256:1090bc3a8ccfb0b55f78a494d76f8d603434f7e4553543d6e807bc7bd6bbd17f
registry_pull_performed=true
service_restart_performed=false
customer_effect=false
outbound_effect=false
```

Safe receipt:

`/opt/wandora/ops-workspace/postgres-18-1-recovery-image-v1.metadata`

Independent readback through the existing Remote-Ops file boundary proved:

- source ref = exact pinned official `postgres@` digest;
- source index digest = `sha256:1090bc3a8ccfb0b55f78a494d76f8d603434f7e4553543d6e807bc7bd6bbd17f`;
- target tag = `postgres:18.1`;
- platform = `linux/amd64`;
- runtime version = `postgres (PostgreSQL) 18.1 (Debian 18.1-1.pgdg13+2)`;
- registry pull performed = true;
- service restart performed = false;
- production container recreated = false;
- customer/provider/outbound effects = false;
- terminal marker = `POSTGRES_18_1_RECOVERY_IMAGE_V1_OK`.

Fresh Task Drain readback after execution remained:

```text
draining=false
activeRuns=0
pendingWakes=0
quiescent=true
```

The ADR 0299 receipt remained absent.

Product-runtime reconciliation showed `wandora-paperclip`, `wandora-core` and `wandora-messaging-gateway` retained their pre-execution container IDs and remained healthy. A newer `remote-ops-mcp` container ID was observed relative to an earlier baseline; that concurrent operational-infrastructure change is not attributed to ADR 0300 and is not treated as evidence that the ADR 0300 helper restarted a product service.

The current MCP Docker boundary does not expose arbitrary image inspection for non-allowlisted images. That guardrail was preserved rather than widened. Image identity/version evidence therefore comes from the exact reviewed root helper receipt plus the operator execution transcript, while product-runtime no-recreate evidence is independently reconciled through allowlisted container reads.

## Result

```text
ADR 0300 = GREEN / COMPLETE
postgres:18.1 recovery utility = QUALIFIED / LOCAL
Task Drain = OFF / 0 / 0 / QUIESCENT
ADR 0299 receipt = ABSENT
customer effect = false
provider call = false
outbound effect = false
```

ADR 0299 may now be resumed only from a fresh reconciliation window using its own exact CI-qualified helper and second adversarial review. Do not infer authorization for activation or any customer/provider effect from this prerequisite completion.
