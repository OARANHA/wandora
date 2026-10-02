# ADR 0387 — Messaging Gateway Read-Only Destination/Channel Qualification Adapter V1 — BLOCKED

Date: 2026-10-02

Status: **BLOCKED / FAIL-CLOSED / NO ADAPTER CODE / NO SEND / NO PRODUCTION EFFECT**.

## Context

ADR 0386 qualified the Wandora semantic meaning of destination/channel qualification for `business.orders.customer_contact.read` while deliberately supplying no live provider evidence. It established that mobile is not WhatsApp, telephone does not imply any channel, no destination is auto-selected, qualification is not send authorization, Human Send remains a separate effect boundary, and Core must not call Evolution directly.

This slice was tasked with proving whether the existing messaging boundary could safely expose the smallest provider-neutral read-only contract answering:

> Is this exact destination proven available on this exact channel?

The work began from the real PR #386 head and current canonical repository/runtime evidence. No historical handoff was treated as authority.

## Real state and authority

At reconciliation time:

- repository `main` was `e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #386 remained open, draft, mergeable and unmerged at `7d4f4a80fd7ea2517c9cbff7df26abf446d7b957`;
- the exact PR head workflows observed were completed successfully;
- the live Messaging Gateway was healthy at image `wandora/messaging-gateway:origin-fix-94cfb4de`;
- its sanitized live mounts contained only the existing Evolution-webhook JWT and Gateway→Core ingress HMAC;
- no Evolution API-key mount or Core outbound-HMAC mount was present in the live Gateway.

No provider/customer call was made. Evolution itself was not queried for this qualification.

Canonical authority remains:

- Wandora Core owns the semantic meaning of candidate, qualified/unqualified/unknown and fail-closed behavior;
- Human Send owns supervised outbound authorization;
- Messaging Gateway is the Wandora-owned provider-neutral messaging adaptation/transport boundary;
- Evolution is a replaceable provider implementation behind that boundary;
- no new durable product state is required for a lookup result.

## Existing Gateway capability

The current Messaging Gateway has no read-only destination/channel qualification contract.

Its reviewed routes are limited to:

- `GET /healthz`;
- Evolution webhook ingress;
- disabled-by-default `POST /internal/v1/core/outbound/text`.

ADR 0022 deliberately binds one Gateway process to one canonical Wandora `connectionId` and one Evolution instance. A request may be rejected when its `connectionId` does not match that exact configured binding. The Gateway has no generic provider/connection resolver.

Therefore no existing Gateway read capability can simply be reused.

## Exact Evolution 2.3.7 evidence

The repository-qualified provider is Evolution API 2.3.7, pinned by image digest in `infra/stacks/evolution/compose.yaml`. The exact upstream tag `2.3.7` resolves to commit:

`cd800f2976e1e5b682fbf86a01ee4d85ae61f370`.

Its WhatsApp-number operation is:

`POST /chat/whatsappNumbers/:instanceName`

with guards requiring an existing/logged-in instance and API-key authentication.

The input is `WhatsAppNumberDto`:

```text
numbers: string[]
```

and the provider result is `OnWhatsAppDto`:

```text
jid
exists
number
name?
lid?
```

Those provider-private fields are broader than Wandora needs; JIDs, LIDs, contact names and raw provider payloads must not cross a future provider-neutral Wandora contract.

### Semantics are not equivalent to sendability or authorization

The operation can establish a provider-specific `exists` result for a number/JID, but that result does not establish:

- permission to send;
- Human Send authorization;
- a selected destination;
- delivery success;
- a currently sendable connection;
- an allowed business effect.

The implementation can also answer from Evolution's `isOnWhatsapp` cache. The qualified Wandora stack sets:

```text
DATABASE_SAVE_IS_ON_WHATSAPP=true
DATABASE_SAVE_IS_ON_WHATSAPP_DAYS=7
```

and the public `whatsappNumbers` response does not expose cache `updatedAt`. Therefore the caller cannot establish evidence freshness from the returned DTO alone.

## Read-only gate failure

The provider operation is **not truly side-effect-free under the currently qualified Wandora configuration**.

For uncached positive user-number results, Evolution 2.3.7 calls `saveOnWhatsappCache(...)`. With `DATABASE_SAVE_IS_ON_WHATSAPP=true`, that helper creates or updates durable provider-database rows in `isOnWhatsapp`.

This is a concrete provider-local state mutation.

The reviewed `whatsappNumber` implementation does not itself call message send, relay, read-receipt, presence or contact-create operations. It does perform a Baileys `client.onWhatsApp(...)` network query for uncached normal numbers. This slice did not obtain sufficient evidence to assert that the upstream remote query has zero externally observable side effects.

The slice requirement is stricter: if the provider operation cannot be proven truly read-only, execution must stop fail-closed.

That gate is therefore not satisfied.

## Connection/instance authority gate failure

A second independent blocker exists.

Current Human Send resolves the messaging connection from an already-existing canonical conversation:

`conversation.messaging_connection_id → messaging_connections`

and then requires:

- active employee/conversation;
- active WhatsApp connection;
- exact match with the configured Gateway outbound connection.

That is valid because the conversation is already canonically bound to a messaging connection.

The order/customer Fast Read path has no canonical conversation or messaging-connection binding. Its context does not establish which WhatsApp connection/instance must be used to query the provider.

ADR 0386 explicitly forbids provider connection selection by implication.

Therefore this slice must not:

- pick the only configured Gateway connection automatically;
- treat an employee as implicitly bound to a messaging connection without a canonical contract;
- borrow Paperclip Connection semantics that are not currently mapped to this messaging boundary;
- invent a provider-selection registry/resolver;
- reuse Human Send as a read path.

## Reuse Gate

No new Wandora capability, table, migration, registry, state machine, cache, retry engine, workflow, approval mechanism, provider selector or messaging subsystem is justified.

The correct reusable boundaries remain:

- existing `business.orders.customer_contact.read` semantic capability;
- existing ADR 0386 candidate/qualification semantics;
- existing canonical `wandora.messaging_connections` where a conversation already binds one;
- existing Messaging Gateway as provider replacement boundary;
- existing Evolution provider adapter role behind the Gateway;
- existing Human Send only for later supervised outbound authorization.

Paperclip remains operational authority for its existing workforce/tool/Connection domains; no evidence authorizes repurposing Paperclip Connections as an implicit selector for this messaging lookup.

## Decision

**Do not implement the destination/channel qualification adapter in this slice.**

The future provider-neutral shape may still belong behind Messaging Gateway, but implementing a live-capable route now would either:

1. wrap a provider operation that violates the slice's strict read-only gate; or
2. introduce/assume connection-selection authority that does not currently exist for this Fast Read context.

Either would weaken the architecture qualified by ADR 0386.

Runtime behavior therefore remains unchanged and fail-closed: without explicit qualified provider evidence, the channel remains unqualified.

## Second adversarial review

The mandatory second review was executed after the deterministic decision evidence was assembled and before any implementation.

JEV `jev-1.13.0` returned:

- `block = 0.99`;
- `deep_review = 0.01`;
- `proceed_fast = 0`;
- `split_task = 0`;
- route confidence `0.98`.

JEV remains advisory under ADR 0377. The deterministic blockers above are independently sufficient for the fail-closed decision.

## Effects and privacy

This slice performed no:

- adapter/runtime code change;
- provider/customer lookup;
- Evolution API call;
- VendaERP call;
- Human Send invocation;
- Messaging Gateway outbound call;
- proposal or outbound-attempt creation;
- SMS/voice/email/fiscal action;
- migration/table/state creation;
- production/VPS mutation;
- secret read/copy/move;
- rollout;
- merge.

No raw telephone/mobile value, JID/LID, provider payload or credential was copied into repository documentation.

## Runbook impact

None. No runtime/operator contract was changed.

## Next safe boundary

The next work must remain pre-effect and resolve the provider-read prerequisite before this adapter is reconsidered:

**WhatsApp Destination Evidence Provider Purity/Freshness Qualification V1 — READ/ANALYSIS ONLY / NO PROVIDER CALL / NO SEND**

That future slice should prove whether an accepted provider path can supply sufficiently fresh WhatsApp-existence evidence without durable/provider/customer side effects. It must not change connection-selection authority by implication.

Connection/instance authority for arbitrary semantic qualification remains a separate unresolved prerequisite if provider purity/freshness is eventually qualified.
