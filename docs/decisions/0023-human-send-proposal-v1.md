# ADR 0023 — Human Send Proposal V1

Date: 2026-09-15
Status: **Accepted for implementation; production activation remains separate.**

## Context

ADR 0021 made the canonical recent conversation history available to an authenticated human and ADR 0022 promoted a private, disabled-by-default Core → Messaging Gateway → Evolution outbound bridge.

Wandora still has no customer-facing outbound action. The first effect must preserve the product model already proven in `Trabalho`: Ana proposes a safe response, a human reviews the exact text and only then authorizes delivery.

Adding free-text reply/edit capability at the same time would widen policy, content and audit semantics unnecessarily. Reusing the older `AnaService` outbound completion path would also be incorrect because that path was designed for digital-employee/approval execution and mutates ingress-receipt outcome state.

## Decision

Introduce **Human Send Proposal V1** as the smallest customer-facing outbound-effect contract.

A human may send **only an existing canonical `wandora.work_proposals` row** that is:

- `kind = send-text`;
- `commitment = none`;
- attached to the selected tenant/work/conversation;
- the latest proposal for the work item;
- still aligned with the latest canonical inbound message;
- attached to an `attention-required` work item;
- attached to an open conversation, active employee and active messaging connection.

V1 does not accept edited text from the browser.

## Human authorization

The action reuses the existing human session boundary:

1. validate Supabase ES256/JWKS Bearer token;
2. resolve verified external `sub` to canonical Wandora user;
3. treat organization, work and proposal UUIDs only as selectors;
4. require active organization + active membership under transaction-local tenant scope and RLS;
5. additionally require membership role `owner` or `admin` for this first outbound effect.

`member` remains a valid read role but cannot authorize V1 sends.

## Customer route

The exact reviewed route is:

`POST /api/v1/organizations/:organizationId/work/:workId/proposals/:proposalId/send`

The request has no customer-authored message body. Core derives all effectful fields from canonical state:

- messaging connection;
- recipient/channel address;
- proposal text;
- employee/work/conversation relationship;
- source-event correlation;
- deterministic idempotency key.

The browser never supplies a provider ID, provider URL, recipient override, message text override or provider credential.

## Capability and Web behavior

The action is disabled by default at Core runtime configuration. When disabled, the POST route is unavailable and `Trabalho` must not expose an enabled send control.

The attention-required projection gains only a normalized customer action state for the proposal:

- `ready` — current human may send this proposal;
- `unavailable` — channel/action is not enabled for this canonical connection or the current role cannot send;
- `delivery-uncertain` — a previous attempt has ambiguous delivery and must not be retried blindly.

The projection never exposes provider bindings, private attempt rows or provider-native identifiers.

When state is `ready`, Web renders the exact proposal text already visible in `Trabalho` plus a single explicit `Enviar resposta` action. No editor/composer is added in V1.

## Durable human decision and outbound attempt

Migration `007` extends `wandora_private.outbound_attempts` with nullable human-supervision linkage:

- `proposal_id`;
- `requested_by_user_id`.

Legacy attempts may keep both fields null. Human proposal sends require both fields together.

A unique tenant/proposal index ensures one durable outbound attempt per canonical proposal.

The deterministic idempotency key is derived by Core from the canonical proposal ID. The browser cannot choose or alter it.

Before any Gateway call, Core commits a durable attempt in `sending` state and appends a human audit event:

`proposal-send-requested`

with the canonical human actor, proposal subject and the same Wandora correlation/idempotency key.

## Staleness boundary

At authorization time Core must fail closed unless the proposal is still current.

At minimum it verifies:

- selected work ID matches the proposal work item;
- work is `attention-required`;
- target proposal is the newest proposal for that work item;
- latest canonical message is inbound;
- latest inbound/source correlation matches the proposal source event;
- no newer customer message has superseded the proposal.

A customer message can still race with an already-authorized external send in the normal way two humans can cross messages. If a newer inbound is persisted while delivery is in flight, completion must not incorrectly move the newer work back to `waiting-customer`; the newer supervision state remains authoritative.

## Core → Gateway call

Core calls only ADR 0022's private route:

`POST http://wandora-messaging-gateway:8787/internal/v1/core/outbound/text`

using the dedicated Core → Gateway HMAC secret. The URL is pinned to the private canonical service and the secret is read only from an operator-controlled file.

Core sends only:

- canonical connection ID;
- canonical contact channel address;
- canonical proposal text;
- deterministic Wandora idempotency key.

## Success semantics

After an accepted Gateway result, Core finalizes durable state without changing the original inbound receipt:

- attempt → `succeeded` with Wandora gateway request correlation;
- one canonical outbound message is inserted idempotently;
- if the same proposal is still the current supervision context, work → `waiting-customer`;
- if newer inbound work arrived meanwhile, that newer attention state is preserved;
- canonical audit receives `outbound-sent`.

A replay of the same human action after success returns the existing success without another Gateway/provider call.

## Delivery uncertainty

Any ambiguous provider/transport outcome, an existing `sending`/`uncertain` attempt, or inability to durably finalize a provider-accepted result is treated conservatively as **delivery uncertain**.

Core marks the durable attempt `uncertain` when possible, appends `outbound-uncertain`, keeps/re-exposes human attention and returns a normalized non-retryable outcome.

No automatic resend is allowed. Reconciliation is a later operator/product contract.

## Database boundary

The migration does not grant Core provider-binding access and does not widen browser database access.

- `authenticated` still has no direct access to `work_proposals`, private outbound attempts or audit records;
- `wandora_core_runtime` keeps the existing tenant-scoped RLS boundary;
- new proposal/human linkage is immutable after insert because Core's reviewed update privilege remains limited to outbound `status` and `gateway_request_id`;
- the original ingress receipt is not rewritten by the human send path.

## Runtime activation

Implementation may be merged with the capability disabled.

Explicit Core activation requires an operator-controlled overlay containing:

- enable flag for Human Send Proposal V1;
- canonical outbound connection UUID for the private Gateway instance;
- pinned private Gateway URL;
- dedicated Core → Gateway HMAC secret file.

Messaging Gateway outbound must also be activated separately under ADR 0022 with its matching directional secret and Evolution API-key file.

Production activation must use candidate containers, rollback artifacts and an intentionally controlled real provider-bound conversation. `Empresa Exemplo` remains non-sending while it has no provider binding/capability.

## Verification requirements

The implementation must prove:

- action absent/disabled by default;
- exact route only; generic `/api/` and all `/internal/` Web paths remain closed;
- valid owner/admin can act only in an active tenant;
- member, cross-tenant, suspended membership and suspended organization fail closed;
- foreign/missing work or proposal does not leak cross-tenant existence;
- proposal must be `send-text`, `commitment=none`, newest and aligned with latest inbound state;
- browser cannot choose recipient, connection, text or idempotency key;
- one proposal creates at most one outbound attempt;
- human actor/proposal linkage is durable;
- `proposal-send-requested` is written before Gateway delivery;
- successful replay never calls Gateway twice;
- pending/uncertain replay never calls Gateway again;
- accepted delivery creates exactly one outbound message and `outbound-sent` audit;
- newer inbound state is not overwritten by late send completion;
- ambiguous Gateway result becomes durable `uncertain` + `outbound-uncertain` and no outbound message is invented;
- provider/private identifiers do not enter customer responses;
- direct browser DB privileges remain unchanged;
- no autonomous employee traffic is enabled.

## Non-goals

- free-text reply or edit-then-send;
- dismiss/no-send action;
- sending proposals with commercial commitments;
- approval execution redesign;
- autonomous outbound;
- delivery reconciliation/retry tooling;
- media, templates, reactions or attachments;
- dynamic multi-provider/multi-connection Gateway routing.

## Next step

After implementation and disposable verification are green, activate only the private Gateway/Core capability in controlled candidates. Then prove one real human-supervised send on an intentionally provider-bound test conversation before exposing the action for normal beta customer traffic.