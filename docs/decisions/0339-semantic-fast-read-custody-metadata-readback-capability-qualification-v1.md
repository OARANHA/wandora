# ADR 0339 — Semantic Fast Read Custody Metadata Readback Capability Qualification V1

Date: 2026-09-29

Status: **IMPLEMENTED / EXACT-HEAD CI REQUIRED / CAPABILITY NOT DEPLOYED / METADATA READBACK NOT EXECUTED / NO PRODUCTION EFFECT**

## Objective

Qualify the smallest governed managed-admin capability that can later prove fresh custody metadata for exactly three existing Core secret files without granting the caller generic root shell/filesystem authority and without reading secret values.

This ADR is code/CI qualification only. Capability deployment and metadata readback execution are separate future slices.

## REAL NOW

Fresh reconciliation before implementation proved:

- `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 remained open / draft / mergeable / not merged on `feat/semantic-fast-read-runtime-wiring-v1`;
- exact entry head `f32f1169b8b181dbd5004e07c6d3d040dba912ac` completed **17/17 workflows GREEN**;
- ADR 0339 and a custody-metadata dedicated managed-admin program did not exist on that head;
- production Core remained `wandora/core:organization-adapter-candidate-b2cffbb54089`, revision `b2cffbb54089212844ef177827e7a616b1008144`, healthy/restart 0;
- Paperclip remained `wandora/paperclip:v2026.916.1`, healthy/restart 0;
- Task Drain remained `false / 0 / 0 / quiescent=true`;
- live Core composition still excluded custody and attestation overlays;
- `wandora-managed-admin` exposed `host.managed_admin` and the existing named rollback programs, but no dedicated custody-metadata program and no root `stat` authority for callers.

Remote-Ops live is `ghcr.io/oaranha/remote-ops-mcp:sha-677712a` / revision `677712aa48b41144df2bdcd285919a5eec2bd7be`. Repository `OARANHA/Remote-Ops-MCP` main was freshly observed one commit ahead at `9ffb3176ae9d9ead2b1356db4c7ac4f29059762f`; that delta concerns clean-host Agent Mesh bootstrap and does not create this custody-metadata capability.

No production state was changed during this reconciliation.

## PROVEN GAP

The ordinary operator boundary intentionally denies direct access to:

`/opt/wandora/stacks/core/secrets`

with `SECRET_PATH_DENIED`.

The future Semantic Fast Read attestation requires fresh metadata-only proof for exactly:

1. `/opt/wandora/stacks/core/secrets/wandora_typesafe_jev_api_key`;
2. `/opt/wandora/stacks/core/secrets/wandora_fast_read_intent_hmac`;
3. `/opt/wandora/stacks/core/secrets/wandora_model_provider_api_key`.

Widening normal file-read access, adding root `stat`, adding `bash`/`sh`/`sudo`, reading secret contents or weakening directory permissions are rejected.

## CAPABILITY AUTHORITY / REUSE GATE

### Semantic authority

Wandora owns the attestation requirement: which three secret custody facts must be proven and the exact bounded safe output contract.

### Durable product state

None is introduced.

### Operational authority

Remote-Ops remains the governed root execution authority through the existing managed-admin target plus `host_admin_prepare/apply`.

### Provider implementation

No Remote-Ops subsystem or approval mechanism is duplicated or replaced.

### Replacement boundary

The Wandora-owned artifact is one dedicated zero-argument administrative program. A future operator provider only needs an equivalent governed named-program boundary.

ADR 0168 is preserved: portability is contract decoupling, not implementation duplication.

## Decision

Qualify one dedicated entrypoint:

`wandora-semantic-fast-read-custody-metadata-v1`

Future install path:

`/usr/local/sbin/wandora-semantic-fast-read-custody-metadata-v1`

The caller supplies zero arguments. The future broker executes it as root only through the existing managed-admin approval boundary.

The program:

- requires EUID 0;
- pins and verifies its own installed path;
- requires itself to be root:root `0755`, regular and non-symlink;
- compiles in exactly the three paths above;
- rejects a symlink or non-regular target;
- requires `wandora-admin:wandora-ops` and mode `0640`;
- uses only metadata inspection;
- performs no secret-content read/copy/hash/encoding;
- performs no network/provider call;
- validates all three paths before emitting successful metadata;
- emits only `path/owner/group/mode/type` rows followed by:
  `SEMANTIC_FAST_READ_CUSTODY_METADATA_V1_OK`.

The caller receives no generic `stat`, shell or interpreter authority.

## SECOND ADVERSARIAL REVIEW

The initial route review requested `deep_review` (`0.44`) rather than immediate execution.

The design was tightened to:

- all-or-nothing success output;
- exact compile-time path set;
- explicit self/path symlink rejection;
- no value hashing as a proxy for readback;
- no generic root program exposure;
- separate deployment and later metadata execution slices.

A focused independent guard then returned:

- `allow = 0.77`;
- `confirm = 0.11`;
- `review = 0.10`;
- `deny = 0.02`;
- confidence `0.69`.

Execution is therefore limited to repository code/CI qualification.

## EXECUTION

Repository-only changes:

- add `scripts/operations/managed-admin-semantic-fast-read-custody-metadata-v1.sh`;
- add `scripts/operations/verify-managed-admin-semantic-fast-read-custody-metadata-v1.mjs`;
- add dedicated Semantic Fast Read CI qualification;
- record this ADR.

Not executed:

- capability deployment;
- managed-admin allowlist mutation;
- broker mutation/restart;
- secret metadata readback;
- custody/attestation overlay;
- Semantic Fast Read;
- TypeSafe/Mistral/VendaERP call;
- Human Fast Read;
- Human Send;
- WhatsApp/outbound.

## Implementation checkpoint

The initial atomic code/ADR/workflow commit is `d314732c6c63a876d334937e49b4f3dbcbeeb73d`. This checkpoint records repository identity only; exact-head CI remains required before qualification is complete.

## VALIDATION CONTRACT

CI must prove:

- shell syntax;
- static exact-path contract;
- zero-argument/EUID/self-path contract;
- regular/non-symlink and exact owner/group/mode checks;
- all-or-nothing output ordering;
- absence of secret-content/network/bypass surfaces;
- unexpected caller arguments fail closed.

Exact-head GitHub-hosted CI is required before this ADR may be described as qualified.

## NEXT BOUNDARIES

If exact-head CI is GREEN, the next slice is:

**Semantic Fast Read Custody Metadata Readback Capability Deployment V1 — CAPABILITY ONLY / NO METADATA EXECUTION**

That slice may install exact reviewed bytes and add only the named program to the existing managed-admin target/broker allowlists, then must hard-stop.

Only after that deployment is validated may a separate slice perform:

**Semantic Fast Read Custody Metadata Readback Execution V1**

That later slice must start from fresh REAL NOW, run a new decision and second adversarial review, prepare the zero-argument named program through `host_admin_prepare`, require a new explicit human `APPROVE adm_...`, apply exactly once and validate state-first.

Rollback V2 remains governed by ADR 0338's existing scope. It must not be rewritten merely to make its historical OA field equal live OA 0.6.1.
