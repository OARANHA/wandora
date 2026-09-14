# ADR 0006 — Evolution API behind the Wandora Messaging Gateway

Date: 2026-09-13
Status: **Accepted for the initial WhatsApp laboratory provider; production hardening remains incremental**

## Context

Wandora needs WhatsApp transport without allowing digital employees, customer-facing code or Wandora Core domain semantics to depend on a provider-specific API. The messaging boundary must support provider replacement, normalize inbound events, hide credentials/provider identifiers, and avoid unsafe automatic resend after ambiguous delivery failures.

Evolution API 2.3.7 was evaluated as the initial self-hosted laboratory provider. A private stack and a provider-neutral TypeScript spike were validated on the Wandora VPS with a real linked WhatsApp account.

## Decision

Use **Evolution API 2.3.7** as the initial WhatsApp provider behind a Wandora-owned `Messaging Gateway`.

The Wandora messaging contract is authoritative. Evolution instance names, JIDs, webhook envelopes, provider message IDs, authentication keys and response objects remain provider implementation details.

Evolution is not a public Wandora contract and may later be replaced or supplemented by Meta WhatsApp Business Platform, a BSP or another provider behind the same gateway.

## Evidence

The laboratory proved:

- Evolution 2.3.7 runs with a digest-pinned image, dedicated passworded PostgreSQL and Redis persistence;
- provider database/cache ports are not published publicly and the provider API has only a loopback host binding for diagnostics;
- API-key authentication rejects unauthenticated protected requests;
- QR pairing produced a real connected WhatsApp instance in `state=open`;
- a real inbound WhatsApp text traversed Evolution and a private per-instance webhook into the Wandora Gateway;
- raw provider data was normalized into a Wandora-owned `InboundTextEvent` containing only `eventId`, `connectionId`, `sender`, `text` and `occurredAt`;
- deterministic inbound IDs and receipt claiming reject duplicate delivery in the laboratory store;
- outbound text maps from the Wandora contract to Evolution `sendText` while provider instance/API key/response IDs stay private;
- a successful repeated idempotency key returns the stored Wandora result rather than sending twice;
- ambiguous transport and non-2xx failures become `uncertain` and automatic resend is refused;
- a real outbound message invoked through the Wandora adapter returned `accepted: true` and was received on the destination handset;
- strict TypeScript verification and 9 runtime tests pass;
- the verification suite passes in a digest-pinned Node container.

## Provider-specific operational constraints

Evolution 2.3.7 applies strict CORS handling even to some server-to-server requests. Internal Wandora HTTP calls therefore send an allow-listed Wandora `Origin`; this is an adapter concern and must not leak into public messaging semantics.

The phone-number pairing-code flow on this version is not reliable in the validated environment. Operational onboarding uses QR pairing through WhatsApp linked devices. This does not alter the Wandora messaging contract.

`manager.wandora.com.br` exists only as an operator surface. It is routed through Cloudflare/Traefik, requires Evolution authorization for privileged API use, and should receive Cloudflare Access before production-grade operation.

## Security and data boundaries

- Wandora Front and digital employees never call Evolution directly.
- Global provider webhook delivery stays disabled by default.
- Per-instance webhook delivery targets a private Wandora Gateway endpoint and subscribes only to required events.
- Raw webhook payloads are never forwarded as Wandora Core contracts.
- Provider credentials and instance identifiers remain server-side adapter configuration.
- Group/non-text messages are outside the minimum V1 text contract and are rejected/ignored by the spike.
- Outbound echoes (`fromMe`) do not become inbound customer messages.

## Idempotency and persistence

The spike proves the interfaces and behavior using in-memory stores only.

Before production customer traffic:

- implement durable inbound receipt storage;
- implement durable outbound attempt state;
- provide operator reconciliation for `uncertain` attempts;
- bind connection resolution and authorization to Wandora tenant/company identity;
- add production observability, reconnect handling and backup/restore procedures.

These durable stores may use the Wandora PostgreSQL foundation, but provider details must remain behind the adapter boundary.

## Licensing

Evolution API remains third-party software. The validated 2.3.7 release is distributed under its published Apache-2.0 license plus additional upstream conditions. Wandora must retain any required administrator/documentation attribution and re-check upstream licensing before commercial production changes.

## Consequences

Positive:

- the WhatsApp provider no longer blocks Wandora Core design;
- employee logic can depend on a stable provider-neutral messaging contract;
- provider replacement remains possible;
- duplicate inbound delivery and ambiguous outbound retries have explicit safety semantics;
- customer-facing code does not inherit Evolution payloads or identifiers.

Risks / follow-up:

- the current laboratory idempotency stores are not restart-durable;
- QR re-pair/reconnect operations remain an operator concern;
- the Manager needs stronger Access gating before production use;
- media and richer WhatsApp message types remain future contract work driven by a validated workflow, not by provider feature availability.

## Next step

Advance to the **Wandora Core multi-tenant/auth contract freeze** on the validated Supabase foundation. Do not expand Evolution-specific features unless the first Wandora vertical slice requires them.
