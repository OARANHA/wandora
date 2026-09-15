# ADR 0013 — Private Evolution Messaging Gateway Runtime V1

Date: 2026-09-14
Status: **Accepted for implementation; live webhook cutover remains a separate reviewed operation.**

## Context

ADR 0006 accepted Evolution API 2.3.7 only behind a Wandora-owned Messaging Gateway. Laboratory proofs already demonstrated real handset inbound/outbound traffic while keeping Evolution-specific identifiers and credentials behind the adapter.

ADR 0012 then established the first production-shaped Gateway → Core ingress: provider-neutral normalized input, dedicated HMAC caller authentication, Core/RLS tenant authorization, durable receipt/idempotency and a supervised `attention-required` stop with no model or outbound send.

The remaining gap is the provider-side runtime boundary. The laboratory Gateway must become a versioned private service before any live Evolution webhook can be pointed at Core.

A read-only inspection of the **installed Evolution API 2.3.7 code** confirmed that per-instance webhook configuration supports a `headers` object. The special `jwt_key` entry causes Evolution to generate an HS256 JWT with short-lived `iat` / `exp`, `app = evolution` and `action = webhook`, send it as `Authorization: Bearer <token>`, and remove the signing key from the outgoing header set.

Therefore Wandora does not need to trust private-network membership alone and does not need to invent an unsupported provider signing mechanism.

## Decision

Promote `apps/messaging-gateway` as the private inbound-only Evolution adapter for the first supervised real path.

The service exposes:

- `GET /healthz`;
- `POST /providers/evolution/webhook`.

It has no public hostname and no host-published port. Evolution, Gateway and Core communicate only on the private `wandora-core` network.

### Evolution → Gateway authentication

For the selected Evolution instance, live webhook configuration will use a dedicated `jwt_key` generated outside Git/chat.

The Gateway accepts only Bearer JWTs that:

- use HS256;
- have a valid signature under the dedicated Evolution-webhook key;
- carry `app = evolution`;
- carry `action = webhook`;
- have valid `iat` / `exp` values within the installed Evolution token lifetime plus a small clock-skew allowance.

The signing key is loaded by the Gateway only from a mounted file. It is not an environment-value secret and is not reused for Gateway → Core authentication.

### Provider instance binding

The V1 runtime is deliberately narrow: one configured Evolution instance maps to one canonical Wandora organization and one canonical `messaging_connection`.

The raw webhook's `instance` must exactly match the configured provider instance before normalization or Core forwarding.

This static mapping is acceptable for the first controlled supervised proof because it removes dynamic routing ambiguity. Multi-instance dynamic routing, onboarding automation and provider-binding lookup are later product work and must not be improvised inside this slice.

### Provider normalization

Only supported inbound text from `messages.upsert` is normalized.

The Gateway derives a stable Wandora event ID from the canonical connection plus provider message identity, then emits only:

- canonical `organizationId`;
- normalized `eventId`;
- canonical `connectionId`;
- normalized sender phone;
- text;
- occurrence timestamp.

Evolution instance names, API keys, server URLs, raw JIDs and raw provider message IDs remain behind the Gateway.

### Gateway → Core authentication

The Gateway uses the independent ADR 0012 HMAC secret and signs the exact normalized JSON body plus timestamp. The Core target remains the private route:

`http://wandora-core:8788/internal/v1/gateway/inbound`

The Evolution JWT key and Gateway → Core HMAC secret are separate credentials and must be independently generated, stored and rotated.

## Failure and retry semantics

The installed Evolution 2.3.7 retry behavior treats the common authentication/validation 4xx statuses as terminal and retries transient/server failures.

The Gateway therefore maps outcomes deliberately:

- unsupported event / outbound echo / unsupported sender / unsupported non-text content → `204`;
- malformed JSON/provider event → `400`;
- invalid provider JWT → `401`;
- wrong provider instance → `403`;
- Core receipt already processing → `409`;
- Core canonical rejection → `422`;
- Core/network unavailable or unexpected transient failure → `5xx`.

This prevents unsupported traffic from creating retry storms while preserving retries for temporary delivery-to-Core failures.

## Runtime hardening

The promoted Gateway uses the same private-service posture as Core where applicable:

- pinned Node 22.23.2 image;
- non-root process;
- read-only root filesystem;
- `/tmp` tmpfs only;
- `cap_drop: ALL`;
- `no-new-privileges`;
- file-backed non-world-readable secrets;
- private Docker network;
- no database credential;
- no Evolution API management credential for this inbound path;
- no published host port.

The Gateway does not own tenant authorization or business state. Core remains authoritative for canonical organization/connection validation and RLS-protected mutation.

## Verification

The dedicated `Messaging Gateway CI` must prove on the final PR head:

- strict TypeScript and production build;
- valid installed-Evolution-compatible JWT accepted;
- forged/expired/future/overlong/wrong-semantic JWT rejected;
- provider-specific values do not leak into the Core envelope;
- stable event ID across webhook retry;
- unsupported/echo/non-text traffic stops before Core;
- expected provider instance is enforced before Core;
- exact Gateway → Core HMAC signing;
- retryable vs terminal status mapping;
- final Docker image runs as non-root with read-only root filesystem;
- no host port is published;
- Gateway and Core Compose overlays render successfully with file-backed secrets.

The existing Core CI must remain green on the same PR so this promotion cannot silently regress the already-live Core boundary.

## Consequences

Positive:

- both internal hops are authenticated rather than trusting Docker-network membership;
- provider-specific payloads remain isolated in one service;
- Evolution can be replaced later without changing the Core contract;
- the first real handset proof can stop safely at durable supervised work with no model/outbound side effect;
- Gateway compromise does not grant database credentials or Evolution management credentials.

Trade-offs:

- live operation requires two independent secret files and coordinated rotation procedures;
- the first mapping is intentionally one Evolution instance → one canonical organization/connection;
- live cutover requires controlled canonical lab state in Core before a handset event can be accepted;
- observability beyond container logs remains follow-up work after the supervised path is proven.

## Live enablement boundary

Merging this ADR/runtime does **not** cut over production.

Live enablement requires a separate decision → second review → execution operation that:

1. builds/deploys the exact merged Gateway image on private `wandora-core` without changing the Evolution webhook yet;
2. generates two fresh independent credentials outside Git/chat: Evolution webhook JWT key and Gateway → Core HMAC secret;
3. stores them as non-world-readable operator-controlled files;
4. mounts the HMAC secret into both Gateway and Core and enables the Core ingress overlay;
5. creates or verifies a controlled canonical organization, messaging connection and Ana employee for the proof without fabricating customer production data;
6. proves a synthetic provider-authenticated request reaches Core and stops at `supervision-required` with zero outbound attempts;
7. only then configures the selected Evolution instance webhook to the private Gateway route with its `jwt_key` and only the required inbound event;
8. performs one supervised real handset inbound proof and confirms durable canonical state/idempotent replay;
9. keeps outbound transport, Mastra and real model credentials disabled until later accepted slices.

No Mistral, Chutes or other model token is required for this decision.
