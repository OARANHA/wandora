# ADR 0022 — Private Messaging Gateway Outbound V1

Date: 2026-09-15
Status: **Accepted for implementation; production activation remains separate.**

## Context

ADR 0021 made enough canonical conversation history available for a human to review a proposed response, but Wandora still has no production customer-facing outbound action.

The Core domain already contains conservative outbound state handling (`planned` → `sending` → `succeeded` / `uncertain`) and refuses blind retry after an ambiguous result. The earlier Evolution Messaging Gateway spike also validated provider-neutral `sendText`, fingerprinted idempotency and fail-closed handling of ambiguous provider results.

The live Messaging Gateway is intentionally narrower: it is inbound-only, configured for one canonical messaging connection / Evolution instance, authenticates provider webhooks and forwards normalized inbound events to Core. It currently has no Core → Gateway outbound route and no Evolution API credential.

Connecting a browser action directly to the legacy outbound-capable Core code or directly to Evolution would collapse two trust boundaries at once. The provider bridge must be promoted independently first.

## Decision

Introduce a **private, disabled-by-default Messaging Gateway outbound capability**.

The exact private route is:

`POST /internal/v1/core/outbound/text`

This route is not a customer API and must never be proxied by Wandora Web.

### Directional authentication

Core → Gateway uses a dedicated HMAC-SHA256 secret that is distinct from:

- Evolution webhook JWT material;
- Gateway → Core ingress HMAC;
- Evolution API key;
- Supabase/browser session material.

The signature covers `<unix-seconds>.<raw-body>`. The Gateway requires a timestamp within five minutes and a constant-time signature match.

Outbound is **disabled by default**. When disabled, the private route returns `404` and no outbound-only secret/API-key is required.

### Provider binding in V1

The live Gateway process is already scoped to one canonical `WANDORA_CONNECTION_ID` and one Evolution instance. V1 preserves this narrow deployment shape instead of giving the Gateway database access to `wandora_private.messaging_provider_bindings`.

An outbound request contains only Wandora/provider-neutral fields:

```text
connectionId
recipient
text
idempotencyKey
```

The Gateway requires `connectionId` to match its configured canonical connection exactly. The browser never supplies provider instance names, provider URLs or provider API keys.

The Evolution API key is read only from an operator-controlled mounted secret file when outbound is explicitly enabled. The Evolution base URL is restricted to the private canonical service target; no arbitrary URL is accepted.

A future multi-connection Gateway may replace this V1 process-level binding with a reviewed private resolver. That is not required for the first human-supervised send path.

## Provider call

For a validated request, the Gateway maps the provider-neutral message to Evolution `sendText` using its configured private instance and API key.

The customer/Core-facing result contains no Evolution instance, API key, provider message ID or raw provider payload.

Successful response:

```json
{
  "accepted": true,
  "requestId": "<Wandora idempotency key>"
}
```

The Wandora idempotency key is returned as the request correlation ID; provider-native IDs remain private.

## Idempotency and ambiguous delivery

The durable exactly-once safety boundary remains Core's canonical `wandora_private.outbound_attempts` state. Core must create/lock the outbound attempt before calling the Gateway and must refuse resend from `sending` or `uncertain` states.

The Gateway adds a process-local fingerprint/idempotency guard only as defense in depth:

- same key + same already-succeeded payload returns the stored Wandora result without another provider call;
- same key + different payload is rejected;
- same key in pending/uncertain state does not trigger another provider call.

The process-local guard is not the durable source of truth and may be lost across Gateway restart. Safety across restart therefore depends on Core never calling the Gateway again after an ambiguous attempt.

Transport failure or any non-2xx provider response is treated conservatively as **delivery uncertain**. The Gateway returns a non-success result that explicitly says `retry: false`; the future Core caller must mark its durable attempt uncertain and must not blind-retry.

## Input constraints

V1 accepts only:

- canonical UUID `connectionId` matching this Gateway instance;
- E.164-like recipient (`+` optional internally, 8–15 digits, non-zero first digit);
- non-blank UTF-8 text up to 12,000 characters;
- bounded idempotency key of 8–255 safe characters.

Malformed JSON/input is rejected before any provider call. Request bodies remain bounded.

## Deployment/configuration

Default live inbound configuration remains valid without outbound variables.

Explicit outbound activation requires all of:

```text
WANDORA_GATEWAY_OUTBOUND_ENABLED=true
WANDORA_CORE_OUTBOUND_SECRET_FILE=/run/secrets/core_outbound_hmac
WANDORA_EVOLUTION_API_KEY_FILE=/run/secrets/evolution_api_key
WANDORA_EVOLUTION_BASE_URL=http://wandora-evolution:8080
```

Secrets are mounted from operator-controlled files, never committed or placed in browser-visible configuration.

Production activation is **not part of the implementation PR**. A later activation must verify secret creation/mounts, private network reachability, candidate behavior and rollback before the feature is enabled.

## Verification requirements

The implementation must prove:

- existing inbound behavior is unchanged when outbound is disabled;
- disabled outbound route is `404` and does not require outbound secrets;
- enabling outbound without either required secret fails startup/config load;
- arbitrary/non-private Evolution URLs are rejected;
- stale/missing/bad HMAC fails before provider call;
- malformed body, invalid recipient/text/idempotency key and foreign connection fail before provider call;
- valid request maps to the exact private Evolution endpoint without exposing provider internals;
- successful duplicate does not call provider twice in one process;
- idempotency-key reuse with different content is rejected;
- concurrent/pending or uncertain duplicate never performs a second provider call;
- transport failure and provider non-2xx are surfaced as delivery-uncertain / `retry:false`;
- provider-native response IDs/API key/instance name never cross the Wandora outbound result;
- existing inbound CI remains green.

## Non-goals

- public/customer outbound route;
- Web reply/send/edit controls;
- Core human action handler;
- autonomous employee outbound;
- database access from Messaging Gateway;
- generic provider binding resolver;
- provider-native IDs in Wandora contracts;
- retry/reconciliation of uncertain delivery;
- media/templates/reactions.

## Next step

After this private provider bridge is merged and proven in a non-sending candidate configuration, define **Human Send Proposal V1** as a separate Core/Web slice. That contract should send only an existing canonical `commitment=none` proposal initially, bind the human actor and tenant/work/proposal state, use Core durable outbound idempotency/audit, and keep stronger commercial commitments on the existing approval boundary.
