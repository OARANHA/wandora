# ADR 0314 — Managed-Admin V2 Persistent Capture Capability Governance V1

Date: 2026-09-28

Status: **CODE+CI QUALIFIED / CAPABILITY DEPLOYED + VALIDATED / PERSISTENT CAPTURE NOT PREPARED OR EXECUTED / NO FAST READ/PROVIDER/CUSTOMER/OUTBOUND EFFECT**

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

Capability deployment is complete. Persistent capture remains **unprepared and unexecuted**.

Validated production effects are limited to the qualified authority deployment:

- `/usr/local/sbin/wandora-rollback-freeze-v2-capture` is installed `root:root 0755` and hashes to qualified Git blob `f693cc0f0e34258fcdf10d7616f92f1ff1d48758`;
- broker drop-in `50-wandora-rollback-freeze-v2-capture.conf` is installed `root:root 0644` and hashes to `7bcda5c69048190b242d2895a206d96537be0a3c`;
- a fresh protected live-registry snapshot was copied through managed-admin and then converted only into a review copy; it was byte-for-byte identical to the prior reviewed live snapshot;
- the staged registry candidate differed semantically from that fresh live snapshot only by one entry: `wandora-rollback-freeze-v2-capture` in `wandora-managed-admin.allowedAdminPrograms`;
- the candidate registry was installed as `wandora-admin:wandora-ops 0600`;
- `systemctl daemon-reload` returned exit code 0;
- the admin broker restart disconnected the caller, but state-first readback proved the effect had already occurred: the service is active/running on new PID `2368034` instead of `1765513`, with zero service restarts recorded;
- the first prepared Remote-Ops restart approval expired and state-first readback proved no effect; a later fresh approval was used once, the tool returned an internal error, and state-first readback proved the container had in fact restarted;
- post-restart `remote-ops-mcp` is healthy on the unchanged image `ghcr.io/oaranha/remote-ops-mcp:sha-f408ed4`;
- live `target_status(wandora-managed-admin, full)` now exposes `wandora-rollback-freeze-v2-capture` alongside the precheck program;
- the admin broker and ops agent remain active/running;
- Paperclip Task Drain remains `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`.

No `host_admin_prepare` was issued with program `wandora-rollback-freeze-v2-capture`.

No persistent-capture approval exists from this slice, the capture program was not executed, and no V2 rollback receipt was created by this deployment.

No Fast Read/Semantic Selector/Human Send/Gateway outbound gate was enabled.

No provider/model/VendaERP/customer/WhatsApp/outbound effect occurred.

## Deployment staging checkpoint — 2026-09-28

A fresh deployment-boundary reconciliation completed before any protected production mutation:

- the exact live dynamic registry was copied to the governed workspace through approved managed-admin operations and read back successfully;
- live `wandora-managed-admin.allowedAdminPrograms` still equals the baseline plus only `wandora-rollback-freeze-v2-precheck`; persistent capture remains absent;
- registry candidate `/opt/wandora/ops-workspace/adr0314-capability-deployment/dynamic-targets.candidate.json` was created with exactly one semantic delta: add `wandora-rollback-freeze-v2-capture` to that one target;
- removing that one entry from the parsed candidate reproduces the parsed live registry exactly;
- registry candidate Git blob = `0e83efd8c45e8e62c533f41810c0b0f63cd5a69f`; `jq empty` passed;
- qualified wrapper was staged from the PR and revalidated: Git blob = `f693cc0f0e34258fcdf10d7616f92f1ff1d48758`; `bash -n` passed;
- broker drop-in candidate `50-wandora-rollback-freeze-v2-capture.conf` was staged with Git blob `7bcda5c69048190b242d2895a206d96537be0a3c`;
- installed Remote-Ops broker source was re-read and proves `WANDORA_ADMIN_PROGRAMS` is comma-separated, the broker checks hard-deny and allowlist, and executes `spawn(..., { shell: false })`;
- fresh runtime readback showed admin broker active/running with PID `1765513`, zero restarts; seven containers running/healthy; Task Drain `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- a fresh second adversarial JEV over the exact staged artifacts and deployment sequence returned `confirm=0.89`, `allow=0.05`, `deny=0.04`, `review=0.02`, confidence `0.86`.

The next intended protected operation was installation of the qualified wrapper at:

`/usr/local/sbin/wandora-rollback-freeze-v2-capture`

with `root:root 0755` via the existing `host_admin_prepare/apply` path.

However, the outer tool-security boundary blocked the attempt to create that privileged-install approval **before the MCP call executed**. Therefore:

- no deployment approval id was created for the wrapper install;
- no wrapper was installed;
- no live registry was replaced;
- no broker drop-in was installed;
- no systemd daemon-reload or service/container restart occurred;
- no persistent-capture approval was prepared;
- Persistent Capture V2 was not executed;
- production behavior remains unchanged.

No alternative `cp/chmod`, shell, interpreter or other mechanism was used to bypass that external safety boundary.

## Capability deployment execution checkpoint — 2026-09-28

The deployment-only sub-slice was executed through the existing managed-admin approval path after fresh runtime reconciliation and a second adversarial review.

Protected deployment approvals/effects were kept separate:

- wrapper install: `adm_a2626d30bb2a2a3973e5a2cb`;
- broker drop-in install: `adm_ed7afe1599dcd7d4d6134c81`;
- protected live-registry snapshot copy: `adm_886d5356105a4eea862aca2a`;
- review-copy normalization of that snapshot: `adm_b773fcfd5c0358e0565de7b4`;
- reviewed dynamic-registry install: `adm_08f56dc1a2903b7c8241d25d`;
- `systemctl daemon-reload`: `adm_766956e040141c42746c03cb`;
- admin-broker restart: `adm_86512f50e21317c28f48931d`;
- successful control-plane restart authorization used for the observed restart: `adm_32a50a61878dc80085aedee5`.

The earlier prepared control-plane restart approval `adm_025202919284f98542b4e61d` expired before application; state-first readback proved it had not executed, so it was not treated as an effect.

Transport/tool failures around both restarts were handled state-first. Neither effect was blindly retried after readback proved it had already happened.

Final runtime readback:

- Remote-Ops MCP health = `status=ok`, version `2.0.0-dev`, OAuth mode, non-mock;
- `remote-ops-mcp` = running/healthy on unchanged image `sha-f408ed4`;
- `wandora-managed-admin.allowedAdminPrograms` includes exactly the existing baseline, `wandora-rollback-freeze-v2-precheck`, and `wandora-rollback-freeze-v2-capture`;
- admin broker = active/running, PID `2368034`;
- ops agent = active/running, PID `1705827`;
- seven Wandora containers = running, with production services healthy;
- Task Drain = false/0/0/quiescent.

A final read of the admin-broker journal returned no entries, so no claim is made from logs about environment contents. Broker-side deployment evidence is instead the exact installed drop-in + successful daemon-reload + observed broker process replacement. The capture program itself was deliberately not prepared or executed as a test.

The ADR 0314 deployment boundary is therefore complete without crossing into persistent capture.

## Next boundary

ADR 0314 capability deployment is complete and the HARD STOP is now the governing boundary.

Do **not** call `host_admin_prepare` with program `wandora-rollback-freeze-v2-capture` as part of ADR 0314.

Persistent capture is a new, separate **Canonical Rollback V2 Persistent Capture Execution** slice and must restart from fresh:

1. REAL NOW reconciliation of repository/PR/CI/runtime;
2. exact wrapper/helper/target/broker evidence appropriate to that slice;
3. confirmation that Task Drain and production gates remain on the intended baseline;
4. a new decision and new second adversarial review for the capture effect itself;
5. a new `host_admin_prepare`;
6. new explicit human `APPROVE adm_...`;
7. exactly one `host_admin_apply`;
8. state-first validation and safe receipt readback before any later activation decision.

Do not reuse any ADR 0314 deployment approval for capture.
