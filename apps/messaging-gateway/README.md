# Wandora Messaging Gateway

`apps/messaging-gateway` is Wandora's private provider adapter for messaging. It owns provider-specific webhook handling and, when explicitly enabled, provider-specific outbound delivery behind Wandora-owned contracts.

The current production activation supports **Evolution API 2.3.7 inbound text V1**. ADR 0022 adds a private outbound implementation that remains disabled by default and is not customer-facing until a later reviewed activation.

## Private routes

- `GET /healthz` — process health;
- `POST /providers/evolution/webhook` — authenticated Evolution webhook ingress;
- `POST /internal/v1/core/outbound/text` — private Core → Gateway outbound text route, present only when outbound is explicitly enabled.

The service has no public hostname and no published host port. Evolution, Core and the Gateway communicate on the private `wandora-core` Docker network.

## Evolution → Gateway authentication

The installed Evolution API 2.3.7 supports per-instance webhook headers. Its special `jwt_key` header configuration causes Evolution to generate a short-lived HS256 Bearer JWT for each webhook request and removes `jwt_key` from the emitted headers.

The Gateway verifies:

- HS256 signature;
- `app = evolution`;
- `action = webhook`;
- `iat` / `exp` validity;
- maximum token lifetime compatible with the installed Evolution behavior.

The JWT signing key is loaded only from `WANDORA_EVOLUTION_WEBHOOK_JWT_KEY_FILE`.

## Provider normalization boundary

The Gateway validates the expected Evolution instance, then normalizes one supported inbound text message into:

```text
organizationId
  event.eventId
  event.connectionId
  event.sender
  event.text
  event.occurredAt
```

Evolution instance names, API keys, server URLs, raw JIDs and raw provider message IDs do not cross the Gateway → Core boundary.

The V1 runtime binds one configured Evolution instance to one canonical Wandora `organizationId` + `connectionId`. This intentionally narrow process-level binding is also reused by Private Messaging Gateway Outbound V1: an outbound command is rejected unless its canonical `connectionId` exactly matches the configured connection.

## Gateway → Core authentication

ADR 0012 defines the private Core ingress contract. The Gateway signs the exact normalized JSON envelope with a dedicated HMAC secret over:

```text
<unix-seconds>.<raw-body>
```

The HMAC secret is loaded only from `WANDORA_CORE_INGRESS_SECRET_FILE`.

## Core → Gateway outbound authentication

ADR 0022 defines a separate reverse-direction trust boundary. Core → Gateway outbound requests use a **different HMAC secret**, loaded by the Gateway only from `WANDORA_CORE_OUTBOUND_SECRET_FILE` when outbound is enabled.

The Gateway requires:

- exact private route `/internal/v1/core/outbound/text`;
- HMAC-SHA256 over `<unix-seconds>.<raw-body>`;
- timestamp within five minutes;
- canonical UUID `connectionId` matching this process;
- E.164-like recipient;
- non-blank text up to 12,000 characters;
- bounded Wandora idempotency key.

The Evolution webhook JWT key, Gateway → Core HMAC, Core → Gateway HMAC and Evolution API key are four distinct credentials. Compromise/rotation of one boundary must not implicitly authenticate another.

## Outbound provider mapping

When explicitly enabled, the Gateway maps one provider-neutral text command to the private Evolution target:

```text
POST http://wandora-evolution:8080/message/sendText/<configured-instance>
```

The Evolution API key is read only from `WANDORA_EVOLUTION_API_KEY_FILE`. `WANDORA_EVOLUTION_BASE_URL` is restricted to the private canonical `wandora-evolution:8080` service; arbitrary provider URLs are rejected during config load.

The returned Wandora result uses the Wandora idempotency key as `requestId`. Evolution instance names, API keys, raw provider payloads and provider-native message IDs are not returned.

## Outbound idempotency and uncertain delivery

Durable exactly-once safety belongs to Core's canonical `wandora_private.outbound_attempts`. Core must create/lock that attempt before calling the Gateway and must refuse blind resend from `sending` or `uncertain`.

The Gateway adds a bounded process-local fingerprint guard only as defense in depth:

- same key + same succeeded payload returns the stored Wandora result without another provider call;
- same key + different content is rejected;
- pending/uncertain duplicate never makes another provider call;
- the defensive cache is bounded; if unresolved state saturates it, Gateway fails closed rather than send.

The cache is not durable across restart. Core remains the authority for cross-restart safety.

A transport failure or provider non-2xx result is treated conservatively as **delivery uncertain**. Gateway returns a non-success response with `retry:false`; future Core callers must mark the durable attempt uncertain and never blind-retry.

## Inbound failure and retry semantics

The Gateway maps inbound outcomes so Evolution 2.3.7 can retry only when retry is useful:

- unsupported provider event, outbound echo, group/status sender or unsupported non-text content → `204`;
- invalid JSON/provider event → `400`;
- invalid Evolution JWT → `401`;
- unexpected Evolution instance → `403`;
- Core event already processing → `409` and retryable;
- Core canonical rejection → `422` and terminal;
- Core/network unavailable → `503` and retryable.

Core still independently authorizes the canonical organization/connection through transaction-local tenant scope and PostgreSQL RLS.

## Runtime hardening

The production-shaped stack uses:

- pinned Node 22.23.2 image;
- non-root `node` user;
- read-only root filesystem;
- `tmpfs` only for `/tmp`;
- all Linux capabilities dropped;
- `no-new-privileges`;
- file-backed non-world-readable secrets;
- private `wandora-core` network only;
- no `ports:` publication.

See `infra/stacks/messaging-gateway/compose.yaml`.

Outbound activation is a separate overlay:

```text
infra/stacks/messaging-gateway/compose.outbound-evolution.yaml
```

Merging that file into Git does not activate live outbound traffic. Production activation requires a separately reviewed operator step and real secret files.

## Required runtime configuration

Base non-secret configuration:

- `WANDORA_EVOLUTION_INSTANCE`
- `WANDORA_ORGANIZATION_ID`
- `WANDORA_CONNECTION_ID`
- optional `PORT` (default `8787`)

Base secret-file configuration:

- `WANDORA_EVOLUTION_WEBHOOK_JWT_KEY_FILE`
- `WANDORA_CORE_INGRESS_SECRET_FILE`

The Core target is pinned to the private canonical route `http://wandora-core:8788/internal/v1/gateway/inbound`.

Explicit outbound activation additionally requires:

```text
WANDORA_GATEWAY_OUTBOUND_ENABLED=true
WANDORA_CORE_OUTBOUND_SECRET_FILE=/run/secrets/core_outbound_hmac
WANDORA_EVOLUTION_API_KEY_FILE=/run/secrets/evolution_api_key
WANDORA_EVOLUTION_BASE_URL=http://wandora-evolution:8080
```

Operator host paths for both outbound secret files are supplied only through the activation overlay variables; they are never committed.

## Verification

From repository root:

```bash
bash apps/messaging-gateway/scripts/verify-v1.sh
```

`Messaging Gateway CI` validates the base Compose contract, the opt-in outbound overlay with synthetic secret files, and a hardened default runtime where the outbound route remains `404`.

The runtime/unit suite proves inbound behavior, directional HMAC boundaries, config fail-closed behavior, provider normalization, connection binding, provider-data isolation, outbound fingerprint/idempotency, and conservative uncertain-delivery handling.
