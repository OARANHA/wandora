# ADR 0317 — Semantic Fast Read Bounded Production Attestation Attempt V1

Date: 2026-09-28

Status: **ATTEMPT ABORTED / FAIL-CLOSED / BASELINE RESTORED / NO HUMAN FAST READ / NO CUSTOMER OR OUTBOUND EFFECT**

## Objective

Record the first bounded production-attestation execution attempt after ADR 0316, the image-identity drift discovered immediately after Core recreation, the mandatory fail-closed close, and the permanent preflight guard required before any later retry.

This ADR does not authorize another attestation attempt.

## REAL NOW before the attempted opening

Immediately before mutation:

- PR #369 remained open/draft/mergeable at source head `f5a9784aaf2a65a1341f6e0b85d45f943e21fac7`;
- all 17 exact-head workflows were GREEN;
- Core was `wandora/core:organization-adapter-candidate-2c2142237c9c`, manifest `sha256:d3ed5494c03c0720419387befc54f6f6cb124e5407fc619150ecf3dde03dfed7`, revision `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`, healthy, restart count 0;
- active Core Compose provenance ended at `compose.semantic-fast-read.yaml` and excluded custody/attestation;
- Task Drain was `false / 0 / 0 / quiescent=true`;
- Paperclip v2026.916.1 was healthy;
- exactly one Organization Adapter 0.5.0 was `ready`, `lastError=null`;
- Messaging Gateway reported `outboundEnabled=false`;
- the fresh read-only `vendaerp_search_products` policy qualification remained `allow / allow_profile` with no audit event and no ERP call.

The two canonical Core overlays were installed byte-for-byte from the GREEN PR head. A full Compose `config --quiet` using a temporary operator-workspace render environment succeeded.

## Gap discovered

The temporary render environment supplied all required host-path/GID substitutions but omitted the optional `WANDORA_CORE_IMAGE` variable.

Canonical `compose.yaml` defines:

```text
image: ${WANDORA_CORE_IMAGE:-wandora/core:private-runtime-v1}
```

Therefore `docker compose config --quiet` proved only that parsing/interpolation succeeded. It did **not** prove that the resolved Core image still matched the live production candidate.

This was the missing pre-mutation identity assertion.

## Decision and opening execution

After a fresh second adversarial review selected `confirm`, the exact bounded opening mutation was prepared and explicitly approved under:

`adm_cbb2971a45f236a398a2828a`

It executed exactly once and recreated only `wandora-core` with:

- no build;
- no pull;
- no dependency recreation;
- force-recreate;
- wait for health.

Compose returned Core Healthy.

No Human Fast Read was executed from the browser before post-mutation validation.

## Immediate post-mutation validation

State-first readback found a critical mismatch:

- actual Core tag: `wandora/core:private-runtime-v1`;
- actual image id: `sha256:908f16e768bdc0045c476ea5df3316ced2e8b62ad3275928187f8c490b4b6d24`;
- expected tag: `wandora/core:organization-adapter-candidate-2c2142237c9c`;
- expected manifest: `sha256:d3ed5494c03c0720419387befc54f6f6cb124e5407fc619150ecf3dde03dfed7`.

The active provenance did include the custody and attestation overlays and the TypeSafe/`wfri1` mounts, but image identity was wrong. The attestation window was therefore invalid.

Deterministic consequence:

**NO BROWSER HUMAN FAST READ. MANDATORY IMMEDIATE CLOSE.**

No user Bearer token entered the operator plane.

## Mandatory close

The temporary render environment was corrected only by adding the exact pre-attestation image pin:

```text
WANDORA_CORE_IMAGE=wandora/core:organization-adapter-candidate-2c2142237c9c
```

A fresh adversarial review of the close returned `allow=0.79`.

The exact baseline-restoration mutation was prepared and separately human-approved under:

`adm_f8f2d3e41387fbcb3c429d68`

It executed exactly once, recreating only Core with the exact pre-attestation Compose chain ending at `compose.semantic-fast-read.yaml`, excluding custody and attestation.

## Restored baseline validation

Fresh post-close readback proves:

- Core tag = `wandora/core:organization-adapter-candidate-2c2142237c9c`;
- manifest = `sha256:d3ed5494c03c0720419387befc54f6f6cb124e5407fc619150ecf3dde03dfed7`;
- revision = `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`;
- health = `healthy`;
- restart count = 0;
- active Compose provenance exactly returns to the pre-attestation chain ending at `compose.semantic-fast-read.yaml`;
- TypeSafe/System One and `wfri1` mounts are absent;
- startup reports `fastReadExecution=false`, `semanticFastRead=false`, `humanSendProposal=false`;
- the gates-OFF overlay keeps Semantic Selector OFF;
- Task Drain remains `false / 0 / 0 / quiescent=true`;
- Paperclip remains healthy on v2026.916.1;
- exactly one Organization Adapter 0.5.0 remains `ready`, `lastError=null`;
- Messaging Gateway remains `outboundEnabled=false`.

The bounded customer test did not run. No Human Fast Read, ERP read/write, Human Send, WhatsApp Fast Read or Gateway outbound operation was initiated.

## Permanent runbook guard

For every future Core recreation in this attestation path:

1. capture the exact live Core tag, image digest and revision immediately before mutation;
2. explicitly set `WANDORA_CORE_IMAGE` in the non-secret operator render input to that exact live tag;
3. never rely on the fallback in `compose.yaml`;
4. `docker compose ... config --quiet` is necessary but insufficient;
5. separately prove the resolved image before `up` using a bounded image-only render such as `docker compose ... config --images`;
6. require that the resolved Core image equals the freshly captured live image exactly;
7. after recreation, re-read tag/digest/revision before any browser action;
8. any mismatch means no Human Fast Read and immediate close.

Do not read or copy the protected live environment file merely to obtain this pin.

## Capability Authority / Reuse Gate

ADR 0168 remains binding. This incident does not justify a new deployment subsystem, secret manager, state machine, provider implementation or duplicate runtime authority.

The correction is a stricter execution invariant around the existing Docker Compose/Remote-Ops boundary.

## Result and next boundary

**FAIL-CLOSED / BASELINE RESTORED / ATTESTATION NOT ACHIEVED.**

The next attempt, if any, is a new slice. It must restart from fresh REAL NOW, exact-head CI, current runtime/rollback/custody/provider authorization, a render that explicitly pins and proves Core image identity, a new decision, a new second adversarial review and new human approvals.

No approval from ADR 0317 may be reused.
