# Evolution Messaging Gateway V1 spike

Purpose: prove that Evolution API can sit behind a provider-neutral Wandora messaging boundary without leaking provider credentials, instance identifiers, webhook payloads or provider message IDs into customer-facing contracts.

## Wandora-owned contract

Outbound text input:

```ts
{
  connectionId: string;
  recipient: string;
  text: string;
  idempotencyKey: string;
}
```

Outbound result:

```ts
{ accepted: true; requestId: string }
```

Normalized inbound text event:

```ts
{
  eventId: string;
  connectionId: string;
  sender: string;
  text: string;
  occurredAt: string;
}
```

`connectionId`, `requestId` and `eventId` are Wandora-owned semantics. Evolution instance names, JIDs, raw webhook message IDs, API keys and provider response objects stay behind the adapter.

## Inbound behavior

`normalizeEvolutionInbound()` accepts only Evolution `messages.upsert` text messages for V1. It rejects outbound echoes (`fromMe`), groups and unsupported/non-text payloads.

The deterministic inbound `eventId` is derived from the Wandora connection, event kind and provider message ID. The raw provider ID is used only inside the adapter to derive the digest and is not emitted.

`EventReceiptStore` defines the persistence boundary for deduplication. The spike uses an in-memory implementation only; production must provide a durable store.

## Outbound behavior

`EvolutionMessagingGateway` resolves a Wandora `connectionId` to provider internals privately, maps the message to Evolution `POST /message/sendText/{instance}`, and returns only the Wandora request ID.

The adapter fingerprints message content per idempotency key. Successful calls return the stored result on duplicate invocation. Transport exceptions and non-2xx provider responses become `uncertain`, and automatic resend is refused to avoid duplicate WhatsApp delivery after ambiguous failures.

Evolution 2.3.7 rejects server-to-server requests that omit an allow-listed `Origin`, so the laboratory fetch transport sends the Wandora application origin on provider HTTP calls.

## Verification

```bash
npm ci
npm run verify
```

Validated on 2026-09-13 with:

- Node `22.23.2`
- Zod `4.6.4`
- TypeScript `6.0.3`
- `tsx` `4.23.13`
- 9/9 tests passing
- strict TypeScript typecheck passing
- digest-pinned Docker verification passing

The Docker base is pinned to:

```text
node:22.23.2-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5
```

## Real laboratory proof

A private lab receiver was attached to `wandora-core` and configured as the per-instance Evolution webhook for `MESSAGES_UPSERT` only.

The real proof completed both directions:

1. a WhatsApp message entered the connected Evolution instance, reached the private webhook, and was emitted as the normalized Wandora event contract;
2. the same synthetic provider event was deduplicated on replay;
3. a real outbound WhatsApp text was invoked through `EvolutionMessagingGateway`, returned `accepted: true`, and was received by the destination handset.

No provider credential or raw provider identifier was part of the public Wandora result/event shapes.

## Lab receiver

`src/lab-server.ts` is intentionally minimal and private. It exists only to prove the webhook boundary. It does not provide production persistence, tenancy, authorization or public ingress.

Example runtime shape:

```bash
docker run --rm \
  --network wandora-core \
  -e PORT=8787 \
  -e EVOLUTION_INSTANCE=wandora-lab-01 \
  -e WANDORA_CONNECTION_ID=whatsapp-lab-01 \
  <spike-image> \
  node --import tsx src/lab-server.ts
```

Do not publish this receiver directly to the Internet.

## Production work intentionally not solved by this spike

- durable inbound receipt storage;
- durable outbound attempt/idempotency state;
- operator reconciliation for `uncertain` sends;
- tenant-scoped connection resolution and authorization;
- secrets lifecycle;
- production observability/metrics/alerts;
- media/message types beyond minimal text V1;
- public webhook authentication for providers that require public callback delivery;
- customer-facing WhatsApp setup/onboarding.

This spike validates the provider-neutral boundary and removes the architectural uncertainty. It is not a production messaging service by itself.
