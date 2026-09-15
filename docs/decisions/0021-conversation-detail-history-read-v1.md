# ADR 0021 — Conversation Detail/History Read V1

Date: 2026-09-15
Status: **Accepted for implementation; production activation remains separate.**

## Context

ADR 0020 made the tenant-authorized `Conversas` list live. The list intentionally exposes only a summary and the latest canonical message. The authenticated Empresa Exemplo browser proof confirms that this is enough to discover a conversation, but not enough context for a human to safely evaluate a later reply.

Response actions remain explicitly out of scope. Before any send/edit-send/dismiss contract exists, the human needs a bounded, provider-neutral history read.

## Decision

Add a read-only Core route:

`GET /api/v1/organizations/:organizationId/conversations/:conversationId`

The route reuses the existing human session and tenant authorization boundary:

1. validate Supabase Bearer JWT using public ES256/JWKS, issuer, audience and time checks;
2. resolve verified external `sub` to canonical Wandora user;
3. treat organization and conversation UUIDs only as selectors;
4. require active organization + active membership;
5. execute under transaction-local `wandora.organization_id` with RLS;
6. return only canonical Wandora conversation context.

No schema migration or grant expansion is required. The existing Core runtime role already has the reviewed tenant-scoped SELECT capabilities needed for conversations, contacts, messages, work items and digital employees.

## Response contract

V1 returns:

- conversation ID, status and canonical last-activity time;
- contact ID and business-facing label;
- latest active work-assignment employee ID/name when present;
- up to the latest **100 canonical messages**, returned chronologically oldest → newest;
- for each message: direction (`inbound` or `outbound`), text and occurrence time;
- `hasEarlierMessages`, true when more than 100 canonical messages exist before the returned window.

Message IDs are not exposed because V1 has no customer action that needs them. Provider/source event IDs, messaging connection IDs, provider payloads, private receipts, provider bindings, outbound-attempt state and Mastra runtime metadata remain absent.

The history query may inspect the newest 101 rows internally to determine `hasEarlierMessages`; only 100 enter the customer contract. Ordering is deterministic by occurrence time, creation time and canonical message ID internally, without exposing that tie-breaker ID.

## Not-found and authorization semantics

Organization authorization happens before conversation lookup.

- invalid/missing Bearer token: `401`;
- Auth/JWKS temporarily unavailable: `503`;
- unlinked identity: `403`;
- inactive/foreign organization: `403`;
- malformed organization or conversation UUID: `404`;
- conversation absent from the already-authorized organization: `404`;
- unexpected server/database error: `500`.

A conversation from another tenant queried under an authorized organization therefore appears only as `404`; the route does not reveal whether that foreign conversation exists.

## Web behavior

When a user selects a conversation from the existing list, Wandora Web requests the exact detail route and renders a read-only message thread.

The thread must:

- distinguish inbound and outbound direction without inventing sender attribution not present in canonical state;
- show loading/error/empty states explicitly;
- show a notice when `hasEarlierMessages=true` so the UI never implies that a truncated window is the complete history;
- contain no composer, text input, reply, send, edit-send, dismiss, takeover or approval action;
- remain usable with the existing list/search navigation.

Only the exact UUID-shaped detail route may be added to the Web Nginx allow-list. Generic `/api/` and all `/internal/` paths remain closed.

## Verification requirements

The slice must prove:

- active member can read a conversation only inside the selected organization;
- foreign organization is denied before conversation lookup;
- foreign/nonexistent conversation inside an authorized organization returns 404 without existence leakage;
- suspended membership and suspended organization fail closed;
- unknown identity and invalid Bearer token fail closed;
- tenant scope resets after success and denial;
- latest 100 messages are deterministic and returned oldest → newest;
- `hasEarlierMessages` is correct when the conversation exceeds 100 messages;
- source/provider/private identifiers are absent from the response;
- exact Web route forwards Authorization, strips Cookie and leaves nearby/unreviewed routes at 404;
- Web renders canonical history and has no response controls;
- read creates no approval, outbound attempt or outbound message.

## Non-goals

- unread/read receipts;
- server-side search of message history;
- cursor pagination or loading earlier history;
- sender attribution beyond canonical inbound/outbound direction;
- reply/send/edit-send/dismiss;
- conversation takeover/assignment mutation;
- approval decisions;
- provider metadata;
- autonomous outbound behavior.

## Next step

After this read-only context is proven live, separately design the smallest human response action contract. A send/edit-then-send/dismiss slice must define authorization, proposal relationship, idempotency, audit, failure/reconciliation semantics and stronger commercial-commitment handling before any outbound effect is enabled.
