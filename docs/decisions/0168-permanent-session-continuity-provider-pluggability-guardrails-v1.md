# ADR 0168 — Permanent Session Continuity + Provider Pluggability Guardrails V1

Status: **ACCEPTED / DOCUMENTATION-ONLY / NO PRODUCTION EFFECT**
Date: 2026-09-22

## Context

Wandora is developed across many AI-assisted sessions. Chat history is not a durable authority and timeouts/disconnects can hide already-completed GitHub/runtime operations.

The repository already had strong safeguards:

- ADR 0034 state-first continuity;
- ADR 0036 Capability Authority / Reuse Gate;
- ADR 0144 runtime portability;
- ADRs 0152/0153 Paperclip portability;
- `AGENTS.md` ownership/reuse rules;
- `docs/CAPABILITY_AUTHORITY.md` provider Exit Test.

However, two gaps remained:

1. the general rule **provider replacement does not imply capability internalization** was more explicit for Paperclip than for all specialist providers;
2. `AGENTS.md` still contained superseded ADR 0113 self-hosted CI instructions even though ADR 0158 moved normal CI to GitHub-hosted runners.

## Decision

Make continuity and pluggability explicit permanent repository guardrails.

### Session continuity

A new technical session:

1. reads `docs/WANDORA_PROJECT_SOURCE.md` first for continuity;
2. then follows the authority chain in `AGENTS.md`;
3. revalidates real Git/PR/workflow/runtime state as applicable;
4. treats handoff prompts as bridges only;
5. after timeout/disconnect/chat change, checks whether prior operations executed before retry;
6. records material decisions/checkpoints in the repository.

### Provider pluggability

**Portability means contract decoupling, not implementation duplication.**

For every material provider-backed capability distinguish:

- semantic authority;
- minimum durable product state;
- operational authority;
- current provider implementation;
- replacement boundary.

Provider replacement does not imply Wandora-native implementation.

A customer contract or official fact may need to survive a provider replacement while the operational capability that consumes it remains fully delegated to the next specialist provider.

Examples of operational mechanics that remain delegable by default:

- Paperclip lifecycle/task/run orchestration;
- runtime memory;
- retrieval/RAG execution;
- embeddings/vector search/chunking;
- context assembly;
- agent/workflow loops;
- runtime skills;
- tool execution.

Wandora-native implementation requires positive evidence of a Wandora-unique semantic, security, compliance, reliability or effect-authorization requirement. Absence from the Wandora schema is never sufficient evidence.

## Exit Test

For every provider-backed capability ask:

> If this provider were replaced tomorrow, can customer-facing Wandora contracts remain stable while only adapter/binding/configuration and legitimately provider-owned operational state change or migrate?

If not, identify the coupling. Do not automatically solve it by copying the provider domain into Wandora.

## Documentation changes

This ADR updates:

- `AGENTS.md` with permanent session bootstrap, continuity and universal pluggability rules;
- `AGENTS.md` CI policy to ADR 0158 GitHub-hosted reality;
- `docs/CAPABILITY_AUTHORITY.md` with a universal provider replacement rule;
- `docs/WANDORA_PROJECT_SOURCE.md` current continuity header + handoff rule;
- `docs/CANONICAL_STATE.md` current handoff header + this permanent guardrail.

## Second adversarial review

Rejected:

- creating a separate prompt handbook that could drift from canonical architecture;
- making chat-memory behavior part of the architecture;
- interpreting portability as a reason to build Wandora-native copies of Paperclip/Mastra;
- broadly abstracting every provider-specific internal detail before a real second provider exists;
- deleting ADR 0113 history rather than superseding only its normal-CI guidance.

Accepted:

- keep the rules in already-mandatory repository documents;
- generalize only the architectural invariant;
- preserve concrete provider implementations behind current adapters;
- keep abstraction changes evidence-driven.

## Effect boundary

Documentation/repository authority only.

No production container, database, migration, provider configuration, customer work, model call or outbound effect is changed.

## Consequence for future handoffs

Future handoff prompts do not need to restate the full architecture to preserve it.

They should provide only the latest checkpoint and next slice, while every new session independently recovers the canonical rules from the repository.

The permanent invariant is:

> **Portability = contract decoupling, not implementation duplication.**
