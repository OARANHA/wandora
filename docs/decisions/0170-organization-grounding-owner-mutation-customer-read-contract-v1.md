# ADR 0170 — Organization Grounding Owner Mutation + Customer Read Contract V1

Status: **ACCEPTED CANDIDATE / IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**
Date: 2026-09-22

## Context

ADR 0169 established `wandora.organization_grounding_entries` as the minimum Wandora-owned durable semantic contract for official company facts and Regras da Casa, while withholding write authority from Core until a separately reviewed owner mutation contract existed.

This slice defines that bounded mutation/read contract without introducing a knowledge base, memory store, RAG, vector database, document store, Paperclip duplicate or Mastra retrieval dependency.

## Decision

Customer-facing grounding remains a Wandora Core/API contract.

Authenticated active organization members may read tenant-scoped grounding through `GET /api/v1/organizations/:organizationId/grounding`.

Only active owner/admin memberships may mutate through:
- `POST /api/v1/organizations/:organizationId/grounding`
- `POST /api/v1/organizations/:organizationId/grounding/:entryId/retire`
- `POST /api/v1/organizations/:organizationId/grounding/:entryId/correct`

The browser receives no direct table privilege.

## Database authority

`wandora_core_runtime` keeps table-level SELECT only under tenant RLS. It receives no direct INSERT, UPDATE or DELETE privilege on `organization_grounding_entries`.

Mutation is limited to three SECURITY DEFINER functions that require matching tenant scope, re-check an active owner/admin membership and active organization, perform only the named mutation, and emit canonical Wandora audit evidence atomically.

This is bounded mutation authority, not arbitrary Core table-write authority.

## Provenance and correction semantics

`fact` and `rule` remain distinct. `approved_source` requires `source_ref`.

A correction cannot rewrite historical content. It creates a new `approved_correction` row with mandatory `source_ref` and `supersedes_entry_id`, then retires the replaced row. The previous row remains durable history.

A direct create request cannot claim `approved_correction`; that provenance is reachable only through the explicit correction contract.

Model/runtime output has no path into this contract. No Agent Runtime, Mastra or Paperclip execution wiring is added.

## Public portability boundary

The public/API contract exposes only Wandora semantics: type, content, provenance, provider-neutral sourceRef/sourceLabel, supersedesEntryId, lifecycle status, Wandora user and timestamps. Provider selector fields are rejected.

Paperclip remains authority for Skills, Decisions/Decision Training, Connections/grants and organizational control-plane state.

Mastra/runtime remains authority for runtime memory, retrieval, context assembly, tools, runtime skills and evals.

## Audit evidence

Mutations emit `grounding-created`, `grounding-retired` and `grounding-corrected` with human Wandora actor, organization scope, grounding subject and idempotency correlation.

## Validation

Disposable Supabase/PostgreSQL proof is GREEN:
- owner create = allowed;
- admin create/correct/retire = allowed;
- member mutation = denied;
- cross-tenant read = denied;
- cross-tenant mutation = denied;
- Core direct table write = denied;
- anon/authenticated/service_role direct table/function access = denied;
- approved_source without evidence = denied;
- correction without evidence = denied;
- correction preserves old content and links replacement through supersedes_entry_id;
- audit evidence = verified;
- Core typecheck = GREEN;
- dedicated route/service tests = 8/8 GREEN;
- historical Core verifier = 132/132 GREEN;
- post-010 Organization Adapter/runtime verifier = 30/30 GREEN;
- Core Docker build and private-runtime smoke = GREEN.

## Production boundary

Migration 017 remains **NOT APPLIED** in production.

This ADR does not authorize production migration, Core promotion, real MEDICSPRO facts/rules, runtime projection into Mastra, model calls, Human Send, Gateway outbound or new customer work.

## Next slice

The next architectural slice is **Organization Grounding Runtime Projection V1 — CODE ONLY / NO PRODUCTION EFFECT**. It must consume only bounded active official facts/rules through a provider-neutral Agent Runtime contract, preserve inference/unknown separation, and must not convert this durable contract into a Wandora retrieval/memory subsystem.