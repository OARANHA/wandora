# ADR 0171 — Organization Grounding Runtime Projection V1

Status: **ACCEPTED CANDIDATE / IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**
Date: 2026-09-22

## Context

ADRs 0169 and 0170 establish official company facts, Regras da Casa and provenance as minimum Wandora-owned durable product semantics. Paperclip remains control-plane authority and Mastra/runtime remains operational authority for memory, retrieval, context assembly, runtime skills/tools and model execution.

The remaining gap is deliberately smaller than a knowledge system: assigned work needs a bounded, tenant-scoped snapshot of official active grounding at the Wandora → Agent Runtime boundary.

Production still has migration 017 absent. This ADR does not authorize applying it.

## Capability Authority / Reuse Gate

### Semantic authority

Wandora defines the meaning of `officialFacts[]`, `houseRules[]`, provider-neutral provenance/source evidence, and the separation between official truth, work-specific context, inference and unknown information.

### Durable product state

No new durable state is introduced. The projection reuses only `wandora.organization_grounding_entries` from migration 017.

### Operational authority

Core performs a bounded tenant-scoped read projection. Agent Runtime/Mastra remains responsible for execution and model/context mechanics. Paperclip remains responsible for task/run/control-plane lifecycle.

### Provider implementation

Mastra remains the current replaceable Agent Runtime implementation. This slice does not adopt Mastra Memory, retrieval, embeddings, vector search, chunking, storage or another context subsystem.
### Replacement boundary

`AgentTaskRuntime` consumes the Wandora-owned `RuntimeGroundingProjection`. Provider replacement may change runtime implementation, but not the meaning of `officialFacts`, `houseRules` or `workContext`.

### No capability duplication

The implementation is a SELECT-only adapter over already-approved Wandora semantic state. It creates no RAG, memory, retrieval, document, vector, skill, decision-training, connection, scheduler or workflow subsystem.

## Decision

Every Paperclip-assigned execution that crosses the Wandora execution bridge receives a required provider-neutral snapshot:

```text
officialFacts[]
houseRules[]
workContext
```

`officialFacts[]` contains only active `fact` entries. `houseRules[]` contains only active `rule` entries. Retired entries are excluded.

Each projected statement contains only content plus the minimum runtime provenance semantics (`type`, optional human-facing `sourceLabel`). Full `sourceRef` evidence remains durable inside Wandora for auditability but is deliberately not sent to Agent Runtime. Grounding entry IDs, Paperclip IDs, Mastra IDs, run IDs and provider selectors do not enter the runtime grounding contract.

`workContext` remains structurally separate from official truth. Work descriptions, model hypotheses and inference never become facts/rules by being included in a task.

The projection runs under `REPEATABLE READ READ ONLY`, sets transaction-local Wandora organization scope and relies on tenant RLS. The projection is required rather than optional: an empty snapshot is valid, but failure to load the snapshot fails closed before Agent Runtime execution.

The runtime projection is bounded to 200 active entries. Exceeding the bound fails closed rather than silently dropping official truth.

The existing Paperclip execution readiness gate now also proves the migration-017 read boundary is accessible. A future Core with the bridge enabled must not report ready while grounding projection storage is unavailable.
## Runtime behavior

The supervised model runtime receives only projected official facts, projected house rules and work-specific title/description.

Its instructions require unknown information to remain unknown and explicitly forbid promoting inference or model output to official company truth.

There is no runtime write path to `organization_grounding_entries`.

## Second adversarial review

Rejected alternatives:

1. optional grounding that silently executes without loading official state;
2. loading grounding after durable work preparation;
3. silently truncating an oversized grounding set;
4. leaking grounding row IDs or provider IDs into the runtime contract;
5. treating task/model content as official truth;
6. using Paperclip Skills/Decision Training as the official fact store;
7. using Mastra Memory/RAG as the official fact store;
8. introducing a Wandora retrieval/vector/context-assembly subsystem for portability.

The accepted design keeps semantic authority in Wandora while operational context assembly remains replaceable.

## Validation

Disposable Supabase/PostgreSQL `17.6.1.136` proof covers active fact/rule projection, retired exclusion, tenant isolation, work-context separation, provider-ID absence, no runtime write authority and no new RAG/memory/vector dependency.

Core typecheck/build and historical verifier must remain GREEN on the final head. The exact final CI head must pass the affected GitHub-hosted gates before merge.

## Production boundary

This slice does not apply migration 017 in production, promote/recreate Core, create MEDICSPRO facts or rules, call a real model, create work/run/wakeup/heartbeat/session, enable Human Send, enable Gateway outbound or send any external message.

## Next slice

Architecture review favors **Empresa / Regras da Casa Customer Surface V1 — CODE ONLY / NO PRODUCTION EFFECT** before production promotion. That slice should connect the already-defined Core grounding read/mutation contract to the customer `Empresa` surface using only real state. Production migration/promotion remains a later separately reviewed effect after the customer surface and runtime boundary are both code-complete.
