# Wandora Messaging Gateway

`apps/messaging-gateway` is Wandora's private provider adapter for messaging ingress. It owns provider-specific webhook handling and emits only Wandora-owned normalized events toward Core.

The current promoted implementation supports **Evolution API 2.3.7 inbound text V1**. It does not implement outbound WhatsApp and it does not execute an Agent Runtime.

## Private routes

- `GET /healthz` — process health;
- `POST /providers/evolution/webhook` — authenticated Evolution webhook ingress.

The service has no public hostname and no published host port. Evolution and the Gateway communicate on the private `wandora-core` Docker network.

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

The V1 runtime binds one configured Evolution instance to one canonical Wandora `organizationId` + `connectionId`. This is an intentionally narrow first supervised path, not a general dynamic routing model.

## Gateway → Core authentication

ADR 0012 defines the private Core ingress contract. The Gateway signs the exact normalized JSON envelope with a second, independent HMAC secret over:

```text
<unix-seconds>.<raw-body>
```

The HMAC secret is loaded only from `WANDORA_CORE_INGRESS_SECRET_FILE`.

The Evolution JWT key and Gateway → Core HMAC secret are deliberately different credentials. Compromise or rotation of one boundary does not implicitly authenticate the other.

## Failure and retry semantics

The Gateway maps outcomes so Evolution 2.3.7 can retry only when retry is useful:

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

Core ingress remains separately opt-in through `infra/stacks/core/compose.gateway-ingress.yaml`. Merging these files does not activate live traffic.

## Required runtime configuration

Non-secret configuration:

- `WANDORA_EVOLUTION_INSTANCE`
- `WANDORA_ORGANIZATION_ID`
- `WANDORA_CONNECTION_ID`
- optional `PORT` (default `8787`)

Secret-file configuration:

- `WANDORA_EVOLUTION_WEBHOOK_JWT_KEY_FILE`
- `WANDORA_CORE_INGRESS_SECRET_FILE`

The Core target is pinned to the private canonical route `http://wandora-core:8788/internal/v1/gateway/inbound`.

## Verification

From repository root:

```bash
bash apps/messaging-gateway/scripts/verify-v1.sh
```

`Messaging Gateway CI` additionally validates both Compose contracts and boots the final image with read-only root filesystem, non-root user, dropped capabilities and no published port.

Current branch evidence includes 14/14 strict TypeScript/runtime tests covering JWT validation, provider normalization, exact HMAC signing, authentication failure, instance binding, terminal vs retryable outcomes and provider-data isolation.
