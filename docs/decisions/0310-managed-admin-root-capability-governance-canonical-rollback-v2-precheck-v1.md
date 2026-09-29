# ADR 0310 — Managed-Admin Root Capability Governance for Canonical Rollback V2 Precheck V1

Date: 2026-09-27

Status: **QUALIFIED / CODE+CI ONLY / CAPABILITY NOT DEPLOYED / ROOT PRECHECK NOT EXECUTED / NO PRODUCTION EFFECT**

## Objective

Resolve the authority gap recorded by ADR 0309 without enabling a generic root shell, widening Remote-Ops by reflex, duplicating its approval subsystem, or executing the Rollback V2 root precheck.

The future bounded effect remains exactly the canonical V2 helper in `--precheck-only` mode. Persistent rollback capture remains a different authority and a later slice.

## REAL NOW

Fresh reconciliation at entry proved:

- `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 was open / draft / mergeable at `fb25a7ead7def9af9b1a1ee0cafeb1422dd2d555`;
- that exact entry head completed **17/17 workflows GREEN** before this capability work;
- production remained the inert ADR 0309 baseline:
  - Paperclip `wandora/paperclip:v2026.916.1`, commit `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
  - Core `wandora/core:organization-adapter-candidate-2c2142237c9c`, revision `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`;
  - Task Drain `false / 0 / 0 / quiescent=true`;
  - Fast Read Execution, Semantic Fast Read, Semantic Selector, Human Send and Gateway outbound OFF;
  - custody and attestation overlays absent.

No V2 receipt existed.

## Remote-Ops evidence

The current Remote-Ops provider was reconciled against repository and runtime rather than assumed from the previous chat:

- canonical Remote-Ops-MCP `main = f408ed420dc8e104c6b105e31d8b093a624523e6`;
- live control plane image `ghcr.io/oaranha/remote-ops-mcp:sha-f408ed4`;
- live OCI revision is exactly `f408ed420dc8e104c6b105e31d8b093a624523e6`;
- `wandora-managed-admin` is active with `host.managed_admin`;
- both `wandora-ops-admin-broker.service` and `wandora-ops-agent.service` are active;
- the target and root broker independently enforce administrative program allowlists;
- both layers hard-deny `bash`, `sh`, `sudo` and interpreter-class generic execution;
- the broker executes with `shell=false`;
- `host_admin_prepare/apply` already provides target binding, short-lived signed tickets, one-use replay protection and exact explicit `APPROVE adm_...` confirmation;
- the current provider already supports custom non-hard-denied administrative program names through the target `allowedAdminPrograms` and broker `WANDORA_ADMIN_PROGRAMS`.

Repository/tool-surface inspection found no current approved-script/helper registry or semantic root-helper primitive to reuse.

## Capability Authority / Reuse Gate

### Semantic authority

Wandora owns the semantic contract for this effect:

- which rollback helper bytes are canonical;
- that only `--precheck-only` is authorized by this capability;
- the expected terminal marker;
- the rule that execution stops before the first persistent write.

### Durable product state

None is introduced.

### Operational authority

Remote-Ops remains the operational authority for:

- target authorization;
- managed-admin prepare/apply;
- signed tickets;
- root broker execution;
- replay protection and audit boundary.

### Provider implementation

Remote-Ops-MCP remains unchanged. No Wandora-specific rollback behavior is added to the provider implementation.

### Replacement boundary

The Wandora-owned precheck contract is represented by a dedicated executable artifact. A future Remote-Ops replacement needs only to provide an equivalent governed root-program boundary; it does not require Wandora to internalize the provider's approval/runtime implementation.

This preserves ADR 0168.

## Rejected alternatives

### Generic `bash` or `sh`

Rejected. They are intentionally hard-denied and would expose generic root interpretation.

### Docker, systemd, sudo or another allowed program as a shell substitute

Rejected. That would be policy circumvention rather than governed reuse.

### Directly allowlist the canonical V2 helper

Rejected. The canonical helper also has a no-argument persistent rollback-capture mode. Directly making the helper itself the administrative program would make a broader effect reachable than this capability owns.

The operator-workspace copy is also writable through the operator workspace boundary and therefore is not the correct root execution anchor.

### New Remote-Ops semantic helper tool / second approval subsystem

Rejected. Remote-Ops already supplies the required prepare/apply, signed ticket, target binding and root broker mechanics. Duplicating them would violate the Reuse Gate.

### Wandora-specific rollback logic inside Remote-Ops core

Rejected. Rollback semantics are Wandora-owned; the provider should remain generic.

## Decision

Qualify a **Wandora-owned dedicated managed-admin precheck program** that is narrower than the canonical helper and reuses the existing Remote-Ops managed-admin mechanism.

Repository artifacts:

- `scripts/operations/managed-admin-production-rollback-freeze-v2-precheck.sh`;
- `scripts/operations/verify-managed-admin-production-rollback-freeze-v2-precheck.mjs`.

The future installed identity is:

- program: `/usr/local/sbin/wandora-rollback-freeze-v2-precheck`;
- canonical helper copy: `/usr/local/libexec/wandora/production-rollback-freeze-v2.sh`;
- pinned helper Git blob: `849a05971d5f2526b6e8829d5315b4678f169315`.

The dedicated program:

1. accepts **zero caller arguments**;
2. requires root execution through the managed-admin broker;
3. requires its own installed file to be a non-symlink root-owned regular file;
4. requires the helper copy to be a non-symlink root-owned regular file;
5. verifies the helper with `git hash-object --no-filters` against the canonical blob;
6. runs `bash -n` on those exact bytes;
7. executes only:
   `/usr/bin/bash <root-owned-exact-helper-copy> --precheck-only`.

The MCP caller does not receive generic `bash` authority.

Static review also proved the canonical helper does not depend on `$0`, `BASH_SOURCE` or its installation directory. Its relative `./...` path is used only after changing into the protected rollback root and therefore does not change semantics when the same bytes are installed in the root-owned libexec path.

## Required future capability deployment

This ADR **does not deploy** the capability.

A later, separately authorized capability-deployment slice must:

1. fresh-reconcile Wandora and Remote-Ops;
2. install the exact reviewed entrypoint as root-owned `0755`;
3. install the exact canonical helper bytes as root-owned `0750`;
4. add only `wandora-rollback-freeze-v2-precheck` to the existing Wandora target administrative-program allowlist;
5. add only that same program name to the host broker `WANDORA_ADMIN_PROGRAMS`;
6. keep `bash`, `sh`, `sudo` and interpreter hard-denies unchanged;
7. validate target/broker/service readback without executing the precheck;
8. stop.

The deployment slice must use the accepted Remote-Ops configuration/deployment boundary discovered fresh at that time. It must not use `target_agent_prepare/apply` merely as an authority-widening shortcut.

## Root precheck remains a later effect

Even after the capability is live, root execution remains separately gated:

**fresh state → explicit decision → second adversarial review → `host_admin_prepare` for the dedicated program with no caller args → new `adm_...` → explicit `APPROVE adm_...` → `host_admin_apply` → validation**.

Expected terminal marker:

`ROLLBACK_FREEZE_V2_PRECHECK_OK`.

The no-argument full rollback capture is not exposed by this dedicated program and remains a different later authorization.

## Second adversarial review

The first broad review was intentionally not treated as sufficient. It returned low-confidence confirmation/review signals and triggered deeper ownership analysis.

After separating Wandora semantic authority from Remote-Ops operational implementation, the final independent guard review of the code-only design returned:

- `allow = 0.74`;
- `review = 0.11`;
- `confirm = 0.10`;
- `deny = 0.05`;
- confidence `0.66`.

That review authorized only the **code/CI qualification**, not deployment or root execution.

## Validation

The first workflow head exposed a verifier false positive: the static verifier treated `"$*"` used only inside the local error formatter as if it were argument forwarding. No runtime authority issue existed and no workflow was rerun by convenience.

The verifier was narrowed to the real authority invariants:

- `"$@"` remains forbidden;
- exactly one `exec` is allowed;
- the exact fixed `--precheck-only` exec line is required;
- the canonical helper blob is recomputed from repository bytes;
- the precheck marker must remain before the canonical helper's first-write boundary.

Final code qualification head:

`ac53b2d6389e382f55615906e40b4bed9c0fe839`

Validation:

- **17/17 PR workflows GREEN**;
- Semantic Fast Read CI run `36341259674` GREEN, including `WANDORA_ADR0310_MANAGED_ADMIN_PRECHECK_ENTRYPOINT_OK` / ADR 0310 gate;
- Core CI run `36341259563` GREEN;
- Core Candidate Artifact run `36341259575` was rerun only after Semantic Fast Read CI and Core CI were GREEN; post-gates job `108682490694` GREEN;
- Paperclip Fast Read Production Candidate CI run `36341259599` GREEN.

## Production effect

None.

No:

- Remote-Ops deployment;
- target or broker allowlist change;
- `target_agent_prepare/apply`;
- `host_admin_prepare/apply`;
- `adm_...`;
- root helper execution;
- rollback capture;
- custody/attestation activation;
- Fast Read activation;
- TypeSafe, Mistral or VendaERP call;
- customer work;
- Human Send, WhatsApp or outbound effect.

## Next slice

**Managed-Admin V2 Precheck Capability Deployment V1 — CAPABILITY ONLY / NO ROOT PRECHECK**

After that separate capability is live and validated, stop again before the root precheck authorization.
