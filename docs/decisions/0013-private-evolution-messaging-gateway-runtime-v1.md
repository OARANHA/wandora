# ADR 0013 — Private Evolution Messaging Gateway Runtime V1

Date: 2026-09-14
Status: **Accepted and live for the controlled supervised inbound path as of 2026-09-15.**

## Context

ADR 0006 accepted Evolution API 2.3.7 only behind a Wandora-owned Messaging Gateway. Laboratory proofs already demonstrated real handset inbound/outbound traffic while keeping Evolution-specific identifiers and credentials behind the adapter.

ADR 0012 then established the first production-shaped Gateway → Core ingress: provider-neutral normalized input, dedicated HMAC caller authentication, Core/RLS tenant authorization, durable receipt/idempotency and a supervised `attention-required` stop with no model or outbound send.

The remaining gap was the provider-side runtime boundary. The laboratory Gateway had to become a versioned private service before any live Evolution webhook could be pointed at Core.

A read-only inspection of the **installed Evolution API 2.3.7 code** confirmed that per-instance webhook configuration supports a `headers` object. The special `jwt_key` entry causes Evolution to generate an HS256 JWT with short-lived `iat` / `exp`, `app = evolution` and `action = webhook`, send it as `Authorization: Bearer <token>`, and remove the signing key from the outgoing header set.

Therefore Wandora does not trust private-network membership alone and does not need to invent an unsupported provider signing mechanism.

## Decision

Promote `apps/messaging-gateway` as the private inbound-only Evolution adapter for the first supervised real path.

The service exposes:

- `GET /healthz`;
- `POST /providers/evolution/webhook`.

It has no public hostname and no host-published port. Evolution, Gateway and Core communicate only on the private `wandora-core` network.

### Evolution → Gateway authentication

For the selected Evolution instance, live webhook configuration uses a dedicated `jwt_key` generated outside Git/chat.

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

The dedicated `Messaging Gateway CI` proves:

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

The existing Core CI remained green on the same PR so this promotion could not silently regress the already-live Core boundary.

## Consequences

Positive:

- both internal hops are authenticated rather than trusting Docker-network membership;
- provider-specific payloads remain isolated in one service;
- Evolution can be replaced later without changing the Core contract;
- the first real handset proof stops safely at durable supervised work with no model/outbound side effect;
- Gateway compromise does not grant database credentials or Evolution management credentials.

Trade-offs:

- live operation requires two independent secret files and coordinated rotation procedures;
- the first mapping is intentionally one Evolution instance → one canonical organization/connection;
- observability beyond container health/logs remains follow-up work;
- multi-instance dynamic routing and customer self-service onboarding remain later work.

## Live enablement result — 2026-09-15

The live enablement boundary was executed with **decision → second review → execution** and completed successfully.

Before any webhook cutover:

1. the exact merged Core/Gateway runtime was built and deployed privately;
2. two fresh independent credentials were generated outside Git/chat and mounted from non-world-readable files;
3. the controlled internal proof organization, connection and supervised Ana employee were applied only after a fresh logical PostgreSQL backup, checksum validation and restore test;
4. Core ingress proved fail-closed without HMAC;
5. Gateway proved fail-closed without a valid Evolution JWT;
6. a synthetic provider-authenticated event reached Core and stopped at `supervision-required` with zero approvals and zero outbound attempts.

A pre-cutover snapshot of the old Evolution webhook configuration was saved as operator-controlled `0600` rollback material with SHA-256 checksum.

During diagnostics, Evolution management calls without an `Origin` header returned HTTP 500. Inspection of the installed Evolution 2.3.7 source showed its restricted CORS middleware rejects missing origins and its global error handler surfaces that as HTTP 500. Using an already allowed Origin returned the expected management API responses. No direct Evolution database mutation or repair was needed.

The official Evolution API then changed the selected instance webhook to the promoted private Gateway. Post-change readback confirmed:

- webhook enabled;
- private Gateway destination;
- only `MESSAGES_UPSERT` enabled;
- `webhookByEvents = false`;
- `webhookBase64 = false`;
- dedicated `jwt_key` configured.

Evolution, Gateway and Core remained healthy, and the instance remained `open`.

### Real handset proof

A real WhatsApp message with the text `Teste real Wandora 001` entered through the selected Evolution instance after cutover.

Canonical Wandora state proved the complete path:

- exactly one new inbound message containing the expected text;
- one new qualification work item with `kind = qualify-new-contact`;
- work item status `attention-required`;
- one new inbound-event receipt;
- receipt `status = completed`;
- receipt result `status = supervision-required`;
- `approvals = 0`;
- `outbound_attempts = 0`.

The live event appeared once in messages and once in inbound receipts. Durable replay protection remains enforced by the receipt primary key `(organization_id, event_id)` and the unique inbound-message index `(organization_id, source_event_id)`.

The provider/runtime-specific raw identity did not become the canonical Wandora message identity.

Operational evidence is recorded in `docs/infra/messaging-gateway-supervised-live-v1.md`.

## Next step

**Messaging Gateway → Wandora Core Supervised V1 is complete for the controlled internal production proof path.**

Proceed to **Core → Agent Runtime Adapter → Mastra deterministic proposal V1**.

That next slice must not yet enable autonomous outbound messaging or require a model-provider credential. Mastra output is first promoted as a deterministic internal proposal/evidence path while the existing real inbound path continues to stop at supervised attention.
