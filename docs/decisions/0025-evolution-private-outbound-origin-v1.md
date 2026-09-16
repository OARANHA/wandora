# ADR 0025 — Evolution Private Outbound Origin V1

Date: 2026-09-16
Status: **Accepted.**

## Context

The first Human Send Proposal production proof reached the private Messaging Gateway correctly, but Evolution API returned HTTP 500 with `Not allowed by CORS` before the provider send route executed.

The private Core → Gateway boundary was healthy and authenticated. The failure happened on Gateway → Evolution because the Evolution deployment uses an explicit CORS allowlist and the server-to-server Node `fetch()` request did not send an `Origin` header.

The durable Core attempt was therefore marked `uncertain` exactly as designed. It must remain immutable evidence and must not be blindly retried.

## Decision

The private outbound bridge uses the canonical internal origin:

`http://wandora-messaging-gateway:8787`

The Messaging Gateway must send this exact `Origin` header on Evolution outbound requests.

Evolution `CORS_ORIGIN` must include this exact internal origin in addition to the already reviewed browser origins. Wildcard CORS is not allowed.

The origin is code-pinned rather than supplied by the browser or by a customer-facing request. Browser/API clients still cannot choose provider URL, instance or Origin.

## Safety properties

- the existing uncertain attempt from the first proof is preserved and never reset to retryable;
- a later proof must use a new canonical proposal/idempotency key;
- Core Human Send and Gateway outbound remain disabled while this fix is deployed and verified;
- Evolution API key remains a mounted server secret;
- provider traffic remains private on `wandora-core`;
- Empresa Exemplo remains without provider binding;
- no wildcard is added to Evolution CORS.

## Verification

The change must prove:

- unit test observes `Origin: http://wandora-messaging-gateway:8787` on the Evolution `sendText` request;
- Evolution accepts an authenticated read request with the canonical internal origin;
- the same request without an allowed Origin is rejected;
- Gateway outbound can remain disabled and inbound behavior remains unchanged;
- no replay of the existing `uncertain` attempt occurs;
- a second real send, if performed, uses a fresh proposal and fresh durable idempotency key.

## Non-goals

- weakening Evolution CORS globally;
- retrying or rewriting an `uncertain` attempt;
- autonomous outbound;
- exposing provider-native configuration to Web or Core contracts.
