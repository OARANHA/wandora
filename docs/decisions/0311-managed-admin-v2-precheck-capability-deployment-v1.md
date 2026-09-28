# ADR 0311 — Managed-Admin V2 Precheck Capability Deployment V1

Date: 2026-09-27

Status: **BLOCKED BEFORE ROOT MUTATION / CAPABILITY NOT DEPLOYED / ROOT PRECHECK NOT EXECUTED / NO PRODUCTION EFFECT**

## Objective

Deploy only the already-qualified ADR 0310 managed-admin capability for the canonical Rollback Freeze V2 precheck, while preserving the existing Remote-Ops authority boundary and stopping before any root precheck execution.

This checkpoint records fresh evidence that changed two assumptions from the handoff and the resulting fail-closed stop.

## REAL NOW

Fresh repository reconciliation proved:

- Wandora `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 is open / draft / mergeable at `d21a014f52e1212a4e147e0ef59874e6f8c3c2aa`;
- that exact PR head is **17/17 workflows GREEN**;
- Remote-Ops-MCP canonical `main = f408ed420dc8e104c6b105e31d8b093a624523e6`;
- the live control plane remains `ghcr.io/oaranha/remote-ops-mcp:sha-f408ed4` with OCI revision `f408ed420dc8e104c6b105e31d8b093a624523e6`;
- `wandora-ops-admin-broker.service` and `wandora-ops-agent.service` are active with restart count 0.

Production application runtime also remains on the inert qualified baseline:

- exactly seven Wandora containers are running and healthy;
- Paperclip = `wandora/paperclip:v2026.916.1`;
- Core = `wandora/core:organization-adapter-candidate-2c2142237c9c`;
- Task Drain = `false / activeRuns=0 / pendingWakes=0 / quiescent=true`.

No root precheck, rollback capture, Fast Read activation, provider call, customer work or outbound effect occurred.

## Exact qualified bytes staged

The ADR 0310 artifacts were materialized into the existing operator workspace only:

- staged entrypoint:
  `/opt/wandora/ops-workspace/adr0310-capability-deployment/wandora-rollback-freeze-v2-precheck`;
- staged helper:
  `/opt/wandora/ops-workspace/adr0310-capability-deployment/production-rollback-freeze-v2.sh`.

Independent `git hash-object --no-filters` readback matched the repository blobs exactly:

- entrypoint blob = `97b6962858aee3ea8c5577d7bd480502637bb4b2`;
- helper blob = `849a05971d5f2526b6e8829d5315b4678f169315`.

This staging is not the root-owned installed capability.

## Changed evidence 1 — managed-admin target is dynamic

The handoff described `wandora-managed-admin` as static. Fresh runtime evidence disproves that assumption.

A safe configuration-review snapshot of the live static registry at:

`/opt/wandora/stacks/remote-ops-mcp/runtime/config/targets.json`

contains exactly these four static targets:

- `wandora-prod`;
- `wandora-agent`;
- `demo-mock`;
- `wandora-admin`.

The effective runtime registry exposes eight targets and includes `wandora-managed-admin`.

Current Remote-Ops source at `f408ed420...` proves the registry is loaded as:

1. static `TARGETS_FILE`;
2. plus `dirname(STATE_FILE)/dynamic-targets.json`;
3. with a hard failure if a dynamic target attempts to overwrite a static target.

Therefore, under the current source/runtime contract, `wandora-managed-admin` is necessarily supplied by the dynamic registry. Do not treat it as static and do not edit the static `targets.json` to modify that target.

The dynamic target's effective readback remains operator / Agent Mesh with `host.managed_admin`, default managed-admin program allowlist and no `wandora-rollback-freeze-v2-precheck`.

## Changed evidence 2 — `env` is denied but not in the provider hard-deny constant

Current Remote-Ops source proves both control-plane approval and local root broker independently enforce:

- `MANAGED_ADMIN_HARD_DENY`;
- the per-target / local program allowlist;
- fixed cwd allowlists;
- `spawn(..., shell:false)`.

The current `MANAGED_ADMIN_HARD_DENY` includes:

`bash, sh, dash, zsh, fish, sudo, su, pkexec, python, python3, node, perl, ruby, php`.

It does **not** include `env`.

Operationally, `env` remains denied because it is absent from both administrative program allowlists. This checkpoint does not silently relabel that deny-by-default state as an explicit provider hard-deny. Any future execution claiming the stricter requirement must reconcile this distinction first.

## Capability Authority / Reuse Gate

No new subsystem is justified.

- Wandora still owns the exact precheck semantic contract and byte identity.
- Remote-Ops remains operational authority for target authorization, prepare/apply, signed one-use tickets, root broker execution and replay protection.
- Direct SSH, sudo shell, Docker/systemd substitution and generic interpreter authority remain rejected.
- The current client-side execution block is not evidence that Wandora should duplicate Remote-Ops authorization or introduce a second root execution mechanism.

ADR 0168 remains preserved.

## Decision and second adversarial review

Before root inspection, the minimum safe next action was reduced to one existing managed-admin operation:

`cp -- /opt/wandora/stacks/remote-ops-mcp/runtime/data/dynamic-targets.json /opt/wandora/ops-workspace/adr0310-capability-deployment/dynamic-targets.live.json`

Purpose: obtain exact current dynamic-registry bytes for review before designing any live mutation.

The second adversarial review returned:

- `confirm = 0.94`;
- `allow = 0.06`;
- `deny = 0.00`;
- `review = 0.00`;
- confidence `0.91`.

A managed-admin approval was prepared and explicitly approved by the human.

## Execution result — client security block, no effect

The subsequent `host_admin_apply` call was blocked by the ChatGPT/OpenAI client security layer before a successful Remote-Ops result was returned.

State-first recovery was performed instead of blind retry.

Post-failure readback of the intended destination:

`/opt/wandora/ops-workspace/adr0310-capability-deployment/dynamic-targets.live.json`

returned `PATH_DENIED / caminho inexistente ou inacessível`.

Therefore no observable root copy occurred. The approval is not reusable as deployment evidence.

No attempt was made to bypass the block through SSH, sudo, Docker, systemd, a generic shell, another interpreter, target preset abuse, or a second approval subsystem.

## Current deployment status

The capability remains **NOT LIVE**:

- `/usr/local/sbin/wandora-rollback-freeze-v2-precheck` is not proven installed;
- `/usr/local/libexec/wandora/production-rollback-freeze-v2.sh` is not proven installed;
- `wandora-managed-admin.allowedAdminPrograms` still does not include `wandora-rollback-freeze-v2-precheck`;
- the live broker has not been proven updated to include that program;
- no control-plane reload/recreate for this capability occurred;
- no root precheck occurred.

## Next safe continuation

Resume only from fresh state.

1. Reconcile PR #369 head/CI, Remote-Ops main/live and runtime.
2. Preserve the exact staged/repository blobs; rematerialize only if identity changed.
3. Use an execution context in which the existing governed `host_admin_prepare/apply` path is actually permitted.
4. Read the exact dynamic registry and broker unit/environment before mutating them.
5. Determine the exact minimal atomic updates:
   - root-owned entrypoint `0755`;
   - root-owned canonical helper `0750`;
   - add only `wandora-rollback-freeze-v2-precheck` to the effective `wandora-managed-admin.allowedAdminPrograms`;
   - add the same program only to broker `WANDORA_ADMIN_PROGRAMS`;
   - preserve generic shell/interpreter denial and reconcile the explicit `env` hard-deny requirement.
6. Run a fresh second adversarial review of those exact bytes/diffs.
7. Obtain new explicit approval(s) for the capability deployment only.
8. Validate hashes, ownership/mode, target readback, broker readback and service/control-plane health.
9. **STOP before executing `wandora-rollback-freeze-v2-precheck`.**

The later **Canonical Rollback V2 Root Precheck Execution** remains a separate slice and authorization.
