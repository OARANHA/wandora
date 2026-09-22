# ADR 0172 — Empresa / Regras da Casa Customer Surface V1

Status: **ACCEPTED CANDIDATE / IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**
Date: 2026-09-22

## Context

ADRs 0169–0171 already define the Wandora-owned durable grounding contract, bounded owner/admin mutation contract and provider-neutral runtime projection. The remaining product gap is the customer Empresa surface.

The existing Web page was a placeholder that described generic company/knowledge/tool areas without reading or mutating canonical grounding. This slice connects the customer experience to the already-approved Core contract without creating another store or semantic authority.

## Capability Authority / Reuse Gate

No new capability is introduced.

- **Semantic authority:** Wandora official company facts and Regras da Casa.
- **Durable product state:** migration 017 organization_grounding_entries.
- **Operational customer contract:** existing Wandora Core grounding API from ADR 0170.
- **Runtime implementation:** unchanged; Mastra/runtime still owns execution/context mechanics.
- **Control plane:** unchanged; Paperclip still owns Skills, Decisions/Decision Training, Connections/grants and employee lifecycle.
- **Replacement boundary:** customer Web consumes only Wandora API semantics and no provider identifier/schema.

The Web is a projection/editor of Wandora-owned state, not a grounding store.

## Decision

/company becomes the minimal customer-facing **Empresa / Regras da Casa** surface.

Authenticated active members may read the organization-scoped list. Owner/admin memberships receive mutation controls; members see the same real state as read-only.

The surface distinguishes:

- **Fatos oficiais da empresa** → active fact;
- **Regras da Casa** → active rule;
- **Histórico** → retired entries preserved for customer visibility.

Create uses only owner_statement or approved_source. Approved-source creation requires an evidence reference. The technical sourceRef is accepted only as mutation evidence and is not rendered back to the customer; a human-facing sourceLabel may be shown.

Correction is explicitly not edit-in-place. The UI requires new evidence and calls the canonical correction endpoint, which creates the replacement and retires prior history. Retirement is presented as **Retirar**, never delete.

No model inference, provider state or runtime memory is shown as official company truth.

## Web contract

The implementation reuses the current authenticated customer-Web pattern:

- useAuth() / authFetch() for human session;
- explicit activeOrganization;
- React Query for organization-scoped reads/mutations;
- owner/admin role projection already present in the session contract;
- loading, error and empty states consistent with existing customer surfaces.

Endpoints are exactly those accepted by ADR 0170:

GET  /api/v1/organizations/:organizationId/grounding
POST /api/v1/organizations/:organizationId/grounding
POST /api/v1/organizations/:organizationId/grounding/:entryId/correct
POST /api/v1/organizations/:organizationId/grounding/:entryId/retire

Mutations send bounded idempotency keys. The browser never accesses PostgreSQL directly.

## Second adversarial review

Rejected:

1. a Web-local grounding store or cache with independent truth;
2. hard delete or edit-in-place;
3. exposing Paperclip/Mastra/Supabase IDs or APIs;
4. rendering raw sourceRef;
5. presenting tools, documents, training or learned memory as already connected;
6. adding RAG, retrieval, vector, embeddings, chunking, document storage or memory;
7. applying migration 017 or deploying Web/Core merely to prove the UI.

## Validation

Local production-shaped Web Docker build is GREEN on the candidate source.

The existing Web verifiers remain GREEN and the new gate reports WANDORA_WEB_COMPANY_GROUNDING_SURFACE_V1_OK.

The gate proves the canonical grounding endpoints, idempotency header, owner/admin gating, member read-only treatment, official facts/rules/history language, approved-source evidence mapping, absence of raw sourceRef rendering, absence of provider names and absence of hard-delete semantics.

The final GitHub-hosted CI head remains required before merge.

## Production boundary

Migration 017 remains **NOT APPLIED** in production and wandora.organization_grounding_entries remains absent live.

This slice does not create real MEDICSPRO grounding, deploy/promote Web or Core, call a model, create work/run/wakeup/session, enable Human Send, enable Gateway outbound or send an external message.

## Next slice

Do not assume promotion automatically. After exact-head CI and merge, the next decision should be a fresh **Organization Grounding Production Promotion Preflight V1 — NO EFFECT** that qualifies migration 017 + exact Core/Web artifacts + rollback/readiness together before any production mutation.
