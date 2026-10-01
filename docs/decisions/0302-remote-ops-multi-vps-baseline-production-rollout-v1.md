# ADR 0302 — Remote-Ops Multi-VPS Baseline Production Rollout V1

**Status:** COMPLETE / DEPLOYED / VALIDATED / NO TARGET AUTHORITY WIDENING  
**Date:** 2026-09-27

## Context

ADR 0301 qualified the Remote-Ops Multi-VPS Capability Baseline V1 and Operator Chat Minimal Disclosure Policy V1 as code-only work. It explicitly left merge/deploy as a separate reviewed production effect.

This ADR records that separate effect.

## REAL NOW before execution

Remote-Ops-MCP PR #40 was still open/draft/mergeable at exact head `4a2861aa261363a57bfa6797a6bce0284a2a6826` with PR CI GREEN.

The central live Remote-Ops control plane was healthy at:

- image tag: `ghcr.io/oaranha/remote-ops-mcp:main`;
- OCI revision: `ffe32f67227d86a51a0603fd5dc85f2da6f98aea`;
- local image manifest: `sha256:f438accf94264052e8bd451bbd9790b7803b1a88484b2016333446aa5df7a40a`;
- restart count: 0.

The live registry already contained independent Wandora and MedicsPro targets. `medicspro-agent` was already the portable operator-workspace shape with no Docker authority, so it was not recreated or widened.

## Merge and image qualification

PR #40 was marked ready and squash-merged to Remote-Ops `main` as:

`f408ed420dc8e104c6b105e31d8b093a624523e6`.

Post-merge GitHub Actions on that exact SHA:

- CI run `36312085556`: GREEN;
- Container run `36312085671`: GREEN.

The Container workflow published the immutable candidate:

- `ghcr.io/oaranha/remote-ops-mcp:sha-f408ed4`;
- manifest-list digest: `sha256:b7b904ea725f600801b9713a8ad9eb6dfd7ccccc06fd0809a2bfa459aa1ba129`;
- OCI revision label: `f408ed420dc8e104c6b105e31d8b093a624523e6`.

The previous production revision also has an immutable rollback tag:

- `ghcr.io/oaranha/remote-ops-mcp:sha-ffe32f6`;
- published by successful Container run `36295521134`.

## Decision and second review

The deployment was narrowed to one control-plane effect only:

- recreate only service/container `remote-ops-mcp`;
- use immutable candidate tag `sha-f408ed4`;
- use Docker Compose `--no-deps --force-recreate`;
- preserve existing persistent data, config and secrets mounts;
- keep `sha-ffe32f6` as immediate rollback anchor;
- do not create/update targets, pair devices, widen permissions or touch application containers.

JEV guard review returned `confirm = 0.96`.

The user then explicitly approved the exact managed-admin action.

## Execution

A first approval expired before execution and was deterministically rejected. Readback proved production remained on `ffe32f6...` and healthy.

A second exact approval was issued. The tool transport returned an internal failure, so the operation was **not repeated blindly**. Immediate runtime reconciliation proved the effect had actually completed.

## Validation

Post-effect runtime evidence:

- image: `ghcr.io/oaranha/remote-ops-mcp:sha-f408ed4`;
- OCI revision: `f408ed420dc8e104c6b105e31d8b093a624523e6`;
- runtime image manifest: `sha256:232114d1a90d3554e4a723e0dbca537f2c1867c21bac5224f3ce5d8192e868f2`;
- state: running;
- health: healthy;
- restart count: 0;
- Remote-Ops service health: ok / OAuth / non-mock;
- all eight pre-existing targets loaded after restart.

The live `target_status` behavior is now summary-first. Both `wandora-agent` and `medicspro-agent` returned bounded `capabilityBaseline` summaries instead of raw allowlists by default.

`medicspro-agent` remains independently scoped with:

- Docker read containers: 0;
- Docker exec containers: 0;
- Docker actions: 0;
- semantic capabilities: 0.

The Wandora agent service remained active/running with restart count 0.

## Capability Authority / Reuse Gate

No new target registry, lifecycle, secret store, orchestration subsystem or operational mirror was introduced.

The topology remains:

`Wandora infrastructure -> central Remote-Ops control plane -> independent Agent Mesh devices/targets`.

No other VPS inherits Wandora application/container authority by default.

ADR 0168 remains preserved: portability is contract decoupling, not implementation duplication.

## Effect boundary

Performed:

- Remote-Ops PR #40 merge;
- central Remote-Ops production container replacement to exact immutable candidate;
- post-deploy read-only validation.

Not performed:

- target creation/update;
- Agent Mesh pairing;
- permission widening;
- MedicsPro onboarding mutation;
- Paperclip/Core/Web/Gateway deployment;
- provider/model/VendaERP call;
- customer work;
- outbound effect.

Semantic Fast Read production activation remains a separate path and is not authorized by this ADR.
