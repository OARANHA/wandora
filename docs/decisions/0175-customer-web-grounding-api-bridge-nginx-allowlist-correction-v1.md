# ADR 0175 — Customer Web Grounding API Bridge / Nginx Allowlist Correction V1

Status: **ACCEPTED / CODE ONLY / NO PRODUCTION EFFECT**
Date: 2026-09-22

## Context

ADR 0174 proved a narrow production defect after migration 017 and the grounding-aware Core were promoted successfully.

The customer Web UI already called the canonical grounding contracts, but the Web Nginx bridge did not allowlist them. Direct Core access from the Web network returned 401 Unauthorized without a session, while the public Web edge returned Nginx 404.

The defect is transport-only. It does not justify a new grounding service, table, API semantic layer, RAG, retrieval, memory or provider subsystem.

## Proven Core contract

The current Core exposes only these customer grounding routes:

- GET /api/v1/organizations/:organizationId/grounding;
- POST /api/v1/organizations/:organizationId/grounding;
- POST /api/v1/organizations/:organizationId/grounding/:entryId/retire;
- POST /api/v1/organizations/:organizationId/grounding/:entryId/correct.

Core remains the method, authorization and semantic authority. Grounding mutations require Idempotency-Key.
## Capability Authority / Reuse Gate

No capability ownership changes.

- semantic authority: Wandora official facts + Regras da Casa;
- durable product state: migration 017 / Wandora PostgreSQL;
- customer read/mutation contract: Wandora Core;
- browser/customer transport bridge: Wandora Web/Nginx;
- runtime context/execution: Agent Runtime / Mastra behind the existing adapter;
- control plane: Paperclip;
- provider implementations remain replaceable.

ADR 0168 remains binding: portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

No new state, migration, service, runtime memory, retrieval, embeddings, vector search, chunking or context-assembly subsystem is introduced.

## Decision

Add only three explicit Nginx allowlists:

1. grounding base route, supporting the Core GET + POST contract;
2. grounding retire route;
3. grounding correct route.

All three preserve Authorization; mutation-capable routes preserve Idempotency-Key; browser cookies remain stripped; Nginx does not override method or request body.

The generic /api/ fallback remains 404. No broad API proxy is permitted.
## Verification

A dedicated Web verifier proves:

- the three exact grounding locations exist;
- each proxies only to wandora-core:8788;
- Authorization is forwarded;
- Idempotency-Key is forwarded where grounding mutation can occur;
- method/body are not overridden or disabled;
- /api/v1/me, work and conversations allowlists remain present;
- the generic /api/ boundary remains closed;
- exactly three grounding proxy locations exist.

The Web CI production-shaped mock-Core smoke additionally proves grounding read/create/retire/correct method, headers and request-body forwarding, cookie stripping, fail-closed unknown grounding routes and preservation of existing /me, work and conversations bridges.

A disposable Web candidate against the live private Core proved healthz 200, company 200, unauthenticated /api/v1/me 401, unauthenticated grounding 401, and an out-of-contract grounding path 404. The candidate was removed after proof.
## Production boundary

This ADR authorizes code and CI only.

It does not authorize Web promotion, Core promotion/recreate, migration application, real MEDICSPRO grounding creation, model execution, work/run/wakeup/session creation, Human Send, Gateway outbound or any external message.

Production remains at the ADR 0174 safe partial state until a separate Web-only promotion slice.

## Next checkpoint

After this code is merged and an immutable Web artifact is qualified, the next slice is:

**Customer Web Grounding API Bridge Production Promotion Preflight / Execution V1 — WEB ONLY**

That future slice must promote only the corrected Web artifact. Migration 017 and the grounding-aware Core are already live and must not be repeated merely to complete the Web bridge.