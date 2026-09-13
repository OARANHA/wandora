# ADR 0005 — Mastra behind the Wandora Agent Runtime Adapter

Date: 2026-09-13
Status: **Accepted for the initial Wandora runtime implementation; production hardening remains incremental**

## Context

Wandora needs an agent/runtime implementation that can execute typed tools and workflows while keeping customer-facing semantics provider-neutral. The runtime must not become the owner of Wandora tenancy, business authorization, canonical business state, billing, messaging contracts, or digital-employee identity.

Mastra was selected as the primary TypeScript candidate and validated through `spikes/mastra-agent-runtime-v1` using current package APIs and Node 22.

## Decision

Use **Mastra** as the initial implementation behind a Wandora-owned `Agent Runtime Adapter`.

The Wandora adapter contract is authoritative. Mastra workflow/run IDs, step representations, storage schemas, request-context internals, model-provider objects and execution metadata remain implementation details unless a later ADR explicitly promotes a provider-neutral equivalent.

## Evidence

The deterministic spike proved:

- `@mastra/core` `1.66.0` with `mastra` `1.29.0` builds on Node `22.23.2`;
- a typed `createTool()` implementation executes through a committed `createWorkflow()` / `createStep()` path;
- the same operation executes through a Wandora-owned `AgentRuntime` interface;
- only the Wandora result shape crosses the adapter boundary;
- invalid input does not escape as a successful result;
- TypeScript strict typecheck and three runtime tests pass;
- the official `mastra build` succeeds;
- the same verification suite passes in a digest-pinned Node container with network access disabled.

Current Mastra documentation also confirms Node 22.13+ as the minimum runtime and the current tool/workflow API direction used by the spike.

## Boundaries

Mastra does not own:

- organization/tenant identity;
- customer membership or authorization;
- canonical CRM/financial/operational records;
- billing or plan enforcement;
- WhatsApp/provider contracts;
- public Wandora identifiers;
- human-approval policy semantics.

Those remain Wandora Core responsibilities, with canonical structured facts persisted in the Wandora data platform.

## Storage

The spike intentionally uses Mastra's in-memory fallback storage. This is acceptable only for deterministic feasibility validation.

Persistent runtime storage, if needed for durable agent/workflow execution, will be chosen separately. A Mastra storage backend must not become the only source of truth for transactional Wandora facts.

## Consequences

Positive:

- Wandora can proceed with Mastra capabilities without exposing the framework as a public dependency;
- provider replacement remains technically possible;
- tool/workflow work can begin before model-provider coupling;
- current TypeScript APIs fit the Wandora stack.

Risks / follow-up:

- model-provider integration still needs its own boundary and tests;
- persistent workflow storage/durability must be validated before relying on restart-resilient long-running work;
- observability, concurrency, failure recovery and tenant isolation require production-level verification;
- new Mastra features must not bypass Wandora policy/approval boundaries.

## Next step

Proceed to the **Evolution API + Wandora Messaging Gateway V1** laboratory slice. Digital employees must call Wandora messaging contracts rather than Evolution directly.
