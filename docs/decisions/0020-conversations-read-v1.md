# ADR 0020 — Conversations Read V1

Date: 2026-09-15
Status: **Accepted for implementation; production activation remains separate.**

## Context

Web Human Session V1 is live and `Trabalho` now reads tenant-authorized canonical Core data. `Conversas` is the next customer-facing surface still backed by preview fixtures.

The existing Core runtime role already has tenant-scoped `SELECT` through RLS on canonical `conversations`, `contacts`, `messages`, `work_items` and `digital_employees`. No schema or grant expansion is required for the first conversation read.

## Decision

Add a read-only Core route:

`GET /api/v1/organizations/:organizationId/conversations`

The route reuses the same ES256/JWKS session verification, external-subject to canonical-user resolution, active organization + active membership authorization, transaction-local organization scope and RLS boundary used by Human Supervision Read V1.

V1 returns at most 100 conversations ordered by most recent canonical activity. Each item contains only:

- canonical conversation ID, status and activity time;
- canonical contact ID and business-facing label;
- latest canonical message direction, text and occurrence time when present;
- latest active work assignment employee ID/name when present.

`contact.label` uses the canonical display name when available and may fall back to the canonical channel address when no display name exists, matching the existing `Trabalho` projection. The raw channel address is not exposed as a separate field and provider/runtime identifiers remain hidden.

The response must not expose messaging connection IDs, source event IDs, Evolution identifiers, provider payloads, private receipts, outbound-attempt state or Mastra runtime IDs.

## Web behavior

`Conversas` removes its static preview array and reads the reviewed route with the browser Bearer session through same-origin Wandora Web Nginx.

V1 deliberately does not invent unread state because no canonical read/unread model exists yet. Selecting an item may show only the summary fields already returned by this list contract; it must not imply that a complete message history has been loaded. A separately reviewed conversation-detail/history contract owns that later capability.

Only the exact conversations-list route is added to the Nginx allow-list. Generic `/api/` and all `/internal/` paths remain closed.

## Verification requirements

The slice must prove:

- active member can list only the selected tenant conversations;
- cross-tenant, suspended membership and suspended organization fail closed;
- unknown Wandora identity and invalid Bearer token fail closed;
- organization scope resets after success and denial;
- latest message and assigned employee are canonical and tenant-scoped;
- source/provider/private identifiers are absent from the response;
- exact Web Nginx route forwards Authorization, strips Cookie and leaves unreviewed routes at 404;
- `Conversas` contains no static conversation fixture;
- no approval, outbound attempt or outbound message is created by the read.

## Non-goals

- conversation message history/detail endpoint;
- unread/read receipts;
- search API or server-side pagination;
- send/reply/edit-send/dismiss;
- taking over a conversation;
- provider metadata;
- autonomous outbound behavior.

## Next step

After this read-only list is live, define a separately reviewed conversation detail/history read if the human journey needs it. Human outbound actions remain an explicit later contract and must not be smuggled into this read slice.
