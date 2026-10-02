# ADR 0388 — WhatsApp Destination Evidence Provider Purity/Freshness Qualification V1

Date: 2026-10-02

Status: **BLOCKED / NOT PROVEN / READ-ANALYSIS ONLY / NO PROVIDER CALL / NO SEND / NO PRODUCTION EFFECT**.

## Context

ADR 0387 kept Messaging Gateway as the provider-neutral replacement boundary for destination/channel evidence and blocked an adapter because the current Evolution `whatsappNumbers` path can persist provider-local cache state and does not expose evidence age.

This slice revalidates the exact provider implementation and its pinned Baileys dependency without making a real Evolution/WhatsApp call. The question is deliberately narrower than sendability: whether an existing provider capability can prove that one exact destination has one exact messaging channel with sufficient purity, freshness and side-effect evidence for a future provider-neutral Messaging Gateway read contract.

ADR 0168 remains binding: **portability = contract decoupling, not implementation duplication**.

## REAL NOW

Fresh reconciliation at the start of this slice proved:

- `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #386 remains `open / draft / unmerged / mergeable` at `7d4f4a80fd7ea2517c9cbff7df26abf446d7b957`;
- PR #387 remains `open / draft / unmerged / mergeable` at `625166bfb93b7def1f8b95046f5b500ea4408508`;
- PR #387 is correctly stacked on PR #386;
- the initial exact-head CI read found PR #386 GREEN and PR #387 GREEN, with zero failed/pending runs in that read;
- live Messaging Gateway remains healthy with restart count 0;
- the live Gateway has only the existing Evolution webhook JWT and Gateway→Core ingress HMAC mounts; no Evolution API-key mount and no Core→Gateway outbound HMAC mount are present;
- Paperclip Task Drain remains `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`.

No workflow polling or rerun was performed.

## Exact provider/version under qualification

The canonical Wandora Evolution stack remains pinned to:

- Evolution API `2.3.7`;
- Evolution release/source commit `cd800f2976e1e5b682fbf86a01ee4d85ae61f370`;
- Wandora image digest `sha256:1bd8afc4a6cf48822e6cf02469aeae7bd35a12a6b616eacd1291926307f4d339`;
- Baileys dependency `7.0.0-rc.9`;
- Baileys release commit `cb8b371`.

The canonical Wandora compose sets:

- `DATABASE_SAVE_IS_ON_WHATSAPP=true`;
- `DATABASE_SAVE_IS_ON_WHATSAPP_DAYS=7`.

The exact Evolution 2.3.7 source and exact Baileys 7.0.0-rc.9 source are the evidence basis. Generic/current documentation is not used as a substitute for those versions.

## Candidate operation

Evolution exposes:

`POST /chat/whatsappNumbers/:instanceName`

Route guards in 2.3.7 are:

1. `instanceExistsGuard`;
2. `instanceLoggedGuard`;
3. `authGuard['apikey']`.

Input:

```ts
class WhatsAppNumberDto {
  numbers: string[];
}
```

Output elements:

```ts
class OnWhatsAppDto {
  jid: string;
  exists: boolean;
  number: string;
  name?: string;
  lid?: string;
}
```

The DTO contains no evidence timestamp, cache age, cache-hit flag, remote-query flag or provenance field.

`exists=true` is provider registration/existence evidence. It is not by itself a guarantee of future sendability, delivery, Wandora authorization or Connection authority.

## Exact Evolution 2.3.7 call path

For ordinary user numbers, `whatsappNumber(...)`:

1. normalizes the supplied numbers to provider JIDs;
2. performs a provider-local **read** from `contact` using `prismaRepository.contact.findMany(...)` to obtain an optional push name;
3. calls `getOnWhatsappCache(...)`;
4. identifies normal numbers not present in the cache;
5. calls `this.client.onWhatsApp(...)` only for those uncached normal numbers;
6. combines cached and remote results;
7. selects only positive uncached results for persistence;
8. calls `saveOnWhatsappCache(...)` for those positives;
9. returns the DTO list.

The method itself contains no call to:

- `sendMessage`;
- `readMessages`;
- presence update;
- contact create/update;
- webhook emission;
- message creation.

The neighboring `markMessageAsRead(...)` is a separate method and explicitly calls `this.client.readMessages(...)`; that call is not part of `whatsappNumber(...)`.

## Provider-local cache effect

`saveOnWhatsappCache(...)` is provider-owned state, not Wandora state.

When `DATABASE_SAVE_IS_ON_WHATSAPP=true`:

- it reads `isOnWhatsapp`;
- it may update an existing row when normalized data changed;
- it may create a row when none exists;
- if the existing row is byte/field-equivalent, it deliberately skips the update.

Therefore the current qualified Wandora configuration is **not mutation-free** for a positive uncached lookup.

The cache can also be populated by other Evolution contact/message/provider activity. A cache hit does not prove that a prior explicit `whatsappNumbers` request created the evidence.

No Wandora table, registry, cache or mirror is justified to absorb this provider state.

## Supported cache-off mode

Evolution 2.3.7 natively parses:

`DATABASE_SAVE_IS_ON_WHATSAPP === 'true'`

as the enable flag.

When the flag is false:

- `getOnWhatsappCache(...)` returns no cached rows;
- `saveOnWhatsappCache(...)` returns immediately without a provider DB write;
- ordinary phone-number inputs therefore continue to the existing `client.onWhatsApp(...)` remote query path.

This is an existing provider configuration, not a Wandora duplicate, and it is sufficient to eliminate the **Evolution `isOnWhatsapp` cache read/write effect** for ordinary phone-number qualification.

This slice did **not** alter the real configuration.

This finding is not enough to qualify the operation because the remaining freshness/provenance and remote-effect requirements are still not proven.

## Freshness

With the current Wandora `true / 7 days` configuration, `getOnWhatsappCache(...)` accepts rows whose provider DB `updatedAt` is within the configured window.

The public result does not return that `updatedAt`.

Consequences:

- a positive cache hit may be almost seven days old;
- if registration/channel status changed after that observation, a stale positive is possible until expiry;
- `whatsappNumbers` does not add negative results to this cache, so this specific cache does not create an equivalent persisted negative result;
- cache provenance is ambiguous because other Evolution activity also writes positive `isOnWhatsapp` rows;
- the caller cannot distinguish a cache hit from a fresh Baileys query;
- the caller cannot know the observation timestamp or evidence age from the current contract.

There is an additional implementation nuance: after an expired row triggers a new remote positive query, `saveOnWhatsappCache(...)` can skip the DB update when the normalized row data is unchanged. In that case the old `updatedAt` is not refreshed, so later calls continue to miss that stale row and query remotely until its stored fields actually change. This does not repair the public provenance gap.

With cache disabled, the adapter could know operationally that an ordinary phone-number lookup traversed the remote-query branch, but the Evolution response still carries no provider-defined observation timestamp or origin field. This ADR therefore does **not** invent a freshness timestamp.

## Baileys 7.0.0-rc.9 external behavior

Evolution 2.3.7 pins Baileys `7.0.0-rc.9`.

The exact Baileys `onWhatsApp(...)` implementation:

1. builds a `USyncQuery`;
2. enables the contact protocol;
3. adds each phone number as a USync user;
4. calls `executeUSyncQuery(...)`;
5. emits an IQ request to `S_WHATSAPP_NET` with:
   - `type='get'`;
   - `xmlns='usync'`;
6. waits for the response;
7. maps contact results to `{ jid, exists }`.

The reviewed call path contains no explicit:

- message send;
- read receipt;
- presence update;
- contact upsert;
- Baileys application event emission for this lookup.

What is proven is therefore narrower:

- a real network/protocol request is sent to WhatsApp servers;
- no message/read/presence operation is explicitly constructed by the reviewed client code.

What is **not proven** by the upstream source or published contract is that WhatsApp's server-side processing of this USync contact query has zero recipient-visible or otherwise externally observable side effect. No upstream guarantee was found for that property.

Because a real provider call is forbidden in this slice, the missing guarantee is not replaced with empirical testing.

Therefore:

**recipient/server-side external-effect absence = NOT PROVEN**.

## Capability Authority / Reuse Gate

### Semantic authority

Wandora owns the provider-neutral meaning:

> exact destination + exact channel + bounded evidence/provenance

and the fail-closed rules for whether that evidence is sufficient.

### Durable product state

No new durable destination registry, Connection registry, qualification cache or provider mirror is required or authorized.

### Operational authority

Messaging Gateway remains the provider-neutral messaging replacement boundary. Human Send remains the separate outbound authorization boundary.

Paperclip remains operational authority for its own Connections/grants/tool execution, but there is no qualified Paperclip capability that proves an arbitrary exact phone destination has WhatsApp for this Fast Read semantic.

Mastra remains runtime/tool execution implementation and is not messaging Connection or destination-evidence authority.

Paperclip chat/connector surfaces do not replace the qualified Messaging Gateway boundary for this semantic.

### Current provider implementation

Evolution API 2.3.7 + Baileys 7.0.0-rc.9 is the current qualified WhatsApp provider implementation.

The current Messaging Gateway exposes inbound normalization and separately gated outbound delivery. It does not expose an existing read-only destination/channel evidence contract.

No other accepted live messaging provider capability was found that satisfies the same evidence requirement without changing authority.

### Replacement boundary

A future provider implementation must stay behind Messaging Gateway/provider adapters. Core must not call Evolution directly.

Replacing Evolution must not change the Wandora semantic contract; only provider adapter/binding/configuration and legitimately provider-owned operational state may change.

## Connection authority remains separate

This slice does not solve provider/instance selection.

Human Send has canonical Connection authority when an existing conversation carries `conversation.messaging_connection_id` and the Gateway validates that exact configured connection.

The order/customer Fast Read path has no equivalent canonical messaging Connection binding.

These are not authority:

- there is only one instance;
- the instance is Ana;
- it is the only active connection;
- choose the only configured Evolution connection.

No existing capability discovered in this slice supplies a legitimate canonical binding for this Fast Read path.

Therefore Connection authority remains a separate prerequisite even if provider purity/freshness is later qualified.

## Deterministic decision

Decision class:

**3. BLOCKED / NOT PROVEN**

Reasons:

1. current configuration has a proven provider-local durable cache effect;
2. cache-off configuration can eliminate that specific effect without Wandora duplication, but it is not the current runtime configuration and was not changed;
3. the current response contract cannot expose or prove observation timestamp, cache age or cache-vs-remote provenance;
4. cached positive evidence can be stale for the configured seven-day window;
5. Baileys proves a WhatsApp-server USync query occurs, but the absence of all remote/recipient-visible side effects is not guaranteed by the upstream contract;
6. no already-qualified alternate capability satisfies the same semantic;
7. canonical messaging Connection authority for the order/customer Fast Read remains unresolved.

The cache mutation alone could have been modeled as an explicit provider-local effect, but the unresolved remote-effect and freshness/provenance properties prevent classification as **QUALIFIABLE WITH EXPLICIT PROVIDER-LOCAL EFFECT**.

## Second adversarial review

After the deterministic decision, the mandatory JEV advisory review attacked:

- false read-only classification;
- hidden cache freshness;
- WhatsApp remote effects;
- reliance on unguaranteed Baileys behavior;
- accidental Wandora capability internalization;
- implicit provider/Connection selection;
- Evolution coupling.

Result:

- `block = 0.80`;
- `deep_review = 0.15`;
- `proceed_fast = 0.05`;
- confidence `0.73`.

Per ADR 0377 this is advisory evidence. It identified no factual basis for relaxing the deterministic block.

## Execution

Documentation only.

No adapter is implemented.

No provider/runtime configuration is changed.

## Validation / no-effect receipt

This slice proves:

- real Evolution/WhatsApp provider call: **NO**;
- message sent: **NO**;
- Human Send invoked: **NO**;
- Messaging Gateway outbound enabled/invoked: **NO**;
- production/VPS mutation: **NO**;
- Evolution cache configuration changed: **NO**;
- secret value read/copied/moved: **NO**;
- new BusinessCapability: **NO**;
- new table/migration/state machine/registry/cache/retry engine/provider mirror: **NO**;
- direct Core→Evolution path: **NO**;
- Connection authority invented: **NO**;
- rollout/canary/merge: **NO**.

Facts proven by exact source are explicitly separated above from **NOT PROVEN** remote-effect guarantees.

## Next safe boundary

Do not implement the Messaging Gateway read adapter yet.

A future slice may proceed only if one of these becomes provable without violating ADR 0168:

1. the current provider/upstream supplies a sufficiently strong guarantee for the external side-effect semantics of the exact remote lookup **and** a provider-neutral evidence contract can carry truthful provenance/freshness without inventing unsupported provider facts; or
2. another already-accepted specialist messaging provider exposes an equivalent, cleaner evidence primitive that can live behind the same Messaging Gateway contract.

The cache-off Evolution configuration is a useful provider-native option to reconsider inside such a future qualification, but this ADR does not authorize changing it.

Canonical messaging Connection authority remains a separate prerequisite and must not be solved implicitly by instance uniqueness.
