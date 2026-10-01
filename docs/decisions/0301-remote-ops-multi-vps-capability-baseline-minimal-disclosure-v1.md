# ADR 0301 — Remote-Ops Multi-VPS Capability Baseline V1 + Operator Chat Minimal Disclosure Policy V1

**Status:** QUALIFIED / REMOTE-OPS PR #40 CI GREEN / CODE ONLY / NOT DEPLOYED / NO PRODUCTION EFFECT  
**Date:** 2026-09-27

## Context

ADR 0299 closed the production rollback-freeze gap and registered two separate governance follow-ups:

1. Remote-Ops Multi-VPS Capability Baseline V1;
2. Operator Chat Minimal Disclosure Policy V1.

The purpose is to make the existing Remote-Ops control plane reusable for Wandora, MedicsPro/28server and future VPS targets without duplicating operational capability or leaking Wandora-specific authority into other hosts.

The control plane remains the central Remote-Ops MCP deployment hosted in Wandora infrastructure. Other VPSs are independently paired Agent Mesh devices with their own logical targets, authority profiles, OS permissions and local broker/proxy boundaries.

## REAL NOW

Before this slice:

- Wandora `main` remained `8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 remained open/draft/mergeable at exact head `21c83b0ecc15eb5c616266eb7ff96029c310a6e7`;
- that exact Wandora head completed **17/17 workflows GREEN**;
- Remote-Ops-MCP `main` was `f2b94f3efe70082d42b45425ddfd568e6a0c72cd`;
- Remote-Ops had no open PR before this work.

The Remote-Ops code-only implementation is now PR #40:

- title: `Remote-Ops Multi-VPS Capability Baseline V1 + Minimal Disclosure Policy V1`;
- state: open / draft / mergeable;
- exact head: `4a2861aa261363a57bfa6797a6bce0284a2a6826`;
- CI run: `36310743917`;
- CI result: **GREEN**;
- job: `108596044218`;
- build, all existing tests, both new governance tests and production-image build all passed.

No Remote-Ops deployment or live target change occurred.

## Capability Authority / Reuse Gate

The slice reuses the existing Remote-Ops capability authority:

- Agent Mesh device identity;
- Target Registry;
- dynamic target overlay;
- `target_agent_prepare` / `target_agent_apply`;
- per-target allowlists;
- isolated execution broker;
- Docker proxy;
- optional managed-admin root broker.

No second target registry, lifecycle, secret store, capability database, orchestration subsystem or Wandora-owned operational mirror was introduced.

ADR 0168 remains preserved:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## Decision A — Multi-VPS Capability Baseline V1

Remote-Ops now has one canonical pure preset builder and one pure validator for the existing presets:

- `operator-workspace`;
- `read-only`;
- `postgres-readback`;
- `managed-admin`.

The validator checks authority-bearing target fields against the selected preset and performs no persistence or mutation.

The V1 tests prove the same portable contract for:

- `wandora-agent`;
- `medicspro-agent`;
- an arbitrary future target.

The portable `operator-workspace` baseline does **not** grant application Docker authority. Product-specific Docker/container/service capabilities remain explicit later target extensions and are not inherited from Wandora.

Each VPS keeps an independent device identity and target boundary. A MedicsPro/28server agent does not become a Wandora host and does not inherit Wandora application/container authority.

## Decision B — Operator Chat Minimal Disclosure Policy V1

Operator chat becomes summary-first without reducing diagnostic capability or auditability.

- `targets_list` remains concise;
- `target_status` returns a capability summary by default;
- exact allowlists remain explicitly available with `target_status(detail="full")`;
- target apply chat output returns a bounded logical/capability summary rather than dumping full allowlists;
- detailed evidence remains available from authoritative repository/runtime and explicit full diagnostic views;
- the existing audit contract remains a redacted event log;
- authorization, target persistence, redaction and host enforcement are unchanged.

Minimal disclosure is a presentation contract, not an authority change.

## Adversarial review

The first JEV route review returned `deep_review` as the leading path and correctly challenged mixing authority baseline with presentation policy.

After separating the two independent subcontracts, the second review selected `split_task` as the leading path. The implementation therefore proceeded as two bounded subpasses on one code-only branch.

After exact-head CI completed GREEN, the completion review returned:

- `complete = 0.87`;
- `verify_more = 0.08`;
- `incomplete = 0.05`.

## Effect boundary

This ADR qualifies code and contracts only.

Not performed or authorized by this ADR:

- Remote-Ops production deployment;
- live target creation/update;
- Agent Mesh pairing;
- target authority widening;
- Docker/runtime mutation;
- VPS mutation;
- provider/model/VendaERP call;
- customer work;
- outbound effect.

The Remote-Ops PR remains draft. Merge/deploy is a separate future reviewed effect.

This governance slice does not replace or authorize the Semantic Fast Read production path. Any future production mutation still requires a fresh Immediate Pre-Mutation Attestation + Effect Authorization.
