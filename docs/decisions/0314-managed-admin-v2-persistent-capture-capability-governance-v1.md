# ADR 0314 — Managed-Admin V2 Persistent Capture Capability Governance V1

Date: 2026-09-28

Status: **CODE+CI QUALIFIED / CAPABILITY NOT DEPLOYED / PERSISTENT CAPTURE NOT EXECUTED / NO PRODUCTION EFFECT**

## Objective

Qualify the smallest managed-admin authority capable of executing the already-canonical Rollback Freeze V2 persistent capture without exposing generic root shell/interpreter authority to the MCP caller.

This slice is capability governance only. It does not authorize or execute persistent capture.

## REAL NOW

Fresh reconciliation at the qualification boundary proved:

- Wandora `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 remains open / draft / mergeable on `feat/semantic-fast-read-runtime-wiring-v1`;
- entry head `a1fd912d4db1001cc1885b9d64fef9b4951d76c1` completed 17/17 workflows GREEN;
- qualification code head `f3d1e923ace58da7abd8f04f55834867cbe9f2bb` completed 17/17 workflows GREEN with zero pending/failing runs;
- normal CI remains GitHub-hosted `ubuntu-24.04`;
- Remote-Ops source/live remain aligned at `f408ed420dc8e104c6b105e31d8b093a624523e6` / `ghcr.io/oaranha/remote-ops-mcp:sha-f408ed4`;
- `wandora-managed-admin` still exposes the existing `host.managed_admin` boundary and contains the dedicated precheck program but no persistent-capture program;
- the admin broker remains active/running and generic shells/interpreters remain outside managed-admin program authority;
- seven Wandora containers remain healthy;
- Paperclip remains `wandora/paperclip:v2026.916.1`;
- Core remains `wandora/core:organization-adapter-candidate-2c2142237c9c`;
- Organization Adapter remains exactly one `wandora.organization-adapter-v1@0.5.0`, `ready`, `lastError=null`;
- Task Drain remains `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- Fast Read Execution, Semantic Fast Read, Human Send and Gateway outbound remain OFF;
- staged workspace helper `/opt/wandora/ops-workspace/production-rollback-freeze-v2.sh` freshly hashed to `849a05971d5f2526b6e8829d5315b4678f169315` and passed non-root `bash -n`;
- `/opt/wandora/ops-workspace/production-rollback-freeze-v2.metadata` remains absent.

## Capability Authority / Reuse Gate

No new Remote-Ops subsystem, approval system, registry, root broker or orchestration mechanism is justified.

Current Remote-Ops already supplies the complete operational-authority chain:

`host_admin_prepare -> actor-bound approval -> signed one-use ticket -> Agent Mesh -> root broker -> exact program + argv with shell=false`.

Remote-Ops source also proves both control plane and broker independently enforce program allowlists, and `MANAGED_ADMIN_HARD_DENY` includes generic shells/interpreters such as `bash`, `sh`, `sudo`, `python3` and `node`.

The remaining gap is therefore only a **Wandora-owned named program contract** for the already-Wandora-owned persistent-capture semantic.

Directly allowlisting the canonical helper was rejected because the helper intentionally exposes two modes and would leave its argv surface caller-controlled.

Installing a second helper copy was also rejected. ADR 0311 already installed the canonical helper at:

`/usr/local/libexec/wandora/production-rollback-freeze-v2.sh`

The narrowest design reuses that exact root-owned helper.

ADR 0168 remains preserved: Remote-Ops stays the replaceable operational authority; Wandora owns only the product-specific named contract and canonical helper semantics.

## Decision

Qualify exactly one dedicated entrypoint:

`wandora-rollback-freeze-v2-capture`

Repository source:

`scripts/operations/managed-admin-production-rollback-freeze-v2-capture.sh`

The entrypoint:

- accepts zero caller arguments;
- requires EUID 0;
- pins its installed path to `/usr/local/sbin/wandora-rollback-freeze-v2-capture`;
- requires itself to be a root-owned, non-symlink regular file, mode `0755`;
- pins the existing helper path to `/usr/local/libexec/wandora/production-rollback-freeze-v2.sh`;
- requires that helper to be a root-owned, non-symlink regular file, mode `0750`;
- pins helper Git blob `849a05971d5f2526b6e8829d5315b4678f169315`;
- runs `/usr/bin/bash -n` on the helper;
- executes only `/usr/bin/bash "$HELPER"` with **no helper arguments**.

It accepts no caller-controlled path, environment, script or helper argv.

Do not add `bash`, `sh`, `sudo`, Python, Node or any other generic interpreter to `allowedAdminPrograms`.

## Second adversarial review

The initial combined qualification+deployment proposal was deliberately split after JEV repeatedly requested deeper review.

A final guard restricted to **repository-only code+CI qualification** returned:

- `allow = 0.74`;
- `confirm = 0.16`;
- `review = 0.08`;
- `deny = 0.02`;
- confidence `0.65`.

Execution therefore proceeded only for the code+CI qualification sub-slice.

## Qualification implementation

Added:

- `scripts/operations/managed-admin-production-rollback-freeze-v2-capture.sh`;
- `scripts/operations/verify-managed-admin-production-rollback-freeze-v2-capture.mjs`.

The static verifier proves:

- exact canonical helper Git blob;
- zero-argument caller contract;
- exact installed SELF/HELPER paths and ownership/mode expectations;
- one fixed helper execution;
- no workspace helper path;
- no `"$@"`, `eval`, `sudo`, Docker, systemd, target mutation, `host_admin_apply` or `--precheck-only` surface;
- canonical zero-argument helper mode exists and its success marker occurs after the explicit first-write boundary.

`.github/workflows/semantic-fast-read-ci.yml` now runs the ADR 0314 gate on GitHub-hosted `ubuntu-24.04`.

The ADR 0314 step passed, the complete Semantic Fast Read CI passed, and the exact qualification head completed **17/17 workflows GREEN**.

Qualified repository blobs at that head:

- capture entrypoint = `f693cc0f0e34258fcdf10d7616f92f1ff1d48758`;
- static verifier = `8bd0af33068401bc947a6f8a7e22c669d9ef8874`.

## Production effect validation

No capability deployment occurred.

No live target registry changed.

No broker allowlist changed.

No root-owned capture entrypoint was installed.

No `host_admin_prepare` or `host_admin_apply` for persistent capture occurred.

No rollback capture or V2 receipt was created.

No Fast Read/Semantic Selector/Human Send/Gateway outbound gate was enabled.

No provider/model/VendaERP/customer/WhatsApp/outbound effect occurred.

## Next boundary

The next sub-slice is **deployment of the already-qualified capability only**.

Before deployment:

1. reconcile the exact new head/CI and live runtime again;
2. stage/read back the exact qualified entrypoint bytes;
3. obtain fresh exact dynamic-registry and broker effective-authority evidence;
4. define the minimal diff: install only the new entrypoint and add only `wandora-rollback-freeze-v2-capture` to the target and broker program allowlists;
5. run a fresh second adversarial review;
6. use only the existing managed-admin approval path for those deployment effects;
7. validate hashes/modes/allowlists/services/runtime;
8. **STOP before any `host_admin_prepare` for persistent capture**.

Persistent capture remains a later separate slice with fresh reconciliation, decision, second adversarial review and explicit human approval.
