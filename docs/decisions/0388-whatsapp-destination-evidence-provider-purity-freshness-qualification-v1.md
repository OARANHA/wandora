# ADR 0388 — WhatsApp Destination Evidence Provider Purity/Freshness Qualification V1

Date: 2026-10-02

Status: **BLOCKED / NOT PROVEN / READ-ANALYSIS ONLY / NO PROVIDER CALL / NO SEND / NO PRODUCTION EFFECT**.

## Context

ADR 0386 defines the Wandora-owned semantic meaning of destination/channel qualification: one registered telephone/mobile value is only a destination candidate; mobile does not imply WhatsApp; no destination is selected automatically; channel qualification is not send authorization; Human Send remains the later supervised effect boundary.

ADR 0387 then kept Messaging Gateway as the provider-neutral replacement boundary and blocked implementation because the initially reviewed Evolution `POST /chat/whatsappNumbers/:instanceName` path can use and persist provider-local `isOnWhatsapp` cache state, does not expose evidence age, and the Fast Read context has no canonical messaging Connection/instance authority.

This slice revalidates the exact qualified provider implementation and exact pinned Baileys dependency. It also performs the mandatory Reuse Gate for any cleaner existing provider primitive. No real Evolution/WhatsApp call is used as an investigation method.

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## REAL NOW

Fresh reconciliation proved:

- live `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #386 remains `open / draft / mergeable / unmerged` at `7d4f4a80fd7ea2517c9cbff7df26abf446d7b957`;
- PR #387 remains `open / draft / mergeable / unmerged` at `625166bfb93b7def1f8b95046f5b500ea4408508`;
- PR #387 is correctly stacked on PR #386;
- the one initial CI read showed the observed exact-head workflows for PR #386 and PR #387 completed successfully; no polling or rerun was performed;
- live Core is `wandora/core:organization-adapter-candidate-9ee338303292`, healthy;
- live Paperclip is `wandora/paperclip:v2026.916.1`, healthy;
- live Messaging Gateway is `wandora/messaging-gateway:origin-fix-94cfb4de`, healthy, restart count 0;
- the live Gateway has only the existing Evolution-webhook JWT and Gateway→Core ingress HMAC mounts; no Evolution API-key mount and no Core→Gateway outbound-HMAC mount are present;
- Task Drain remains `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`.

No provider/customer call and no runtime mutation occurred during reconciliation.

## Exact provider and dependency

The Wandora Evolution stack is pinned to:

- Evolution API version: `2.3.7`;
- exact Evolution source commit: `cd800f2976e1e5b682fbf86a01ee4d85ae61f370`;
- Wandora image digest: `sha256:1bd8afc4a6cf48822e6cf02469aeae7bd35a12a6b616eacd1291926307f4d339`;
- exact package dependency: `baileys = 7.0.0-rc.9`;
- Baileys release commit: `cb8b3717aaede47460ba700651ee936f268c0ce4`.

The canonical Wandora Evolution compose currently sets:

```text
DATABASE_SAVE_IS_ON_WHATSAPP=true
DATABASE_SAVE_IS_ON_WHATSAPP_DAYS=7
```

Generic/latest provider documentation is not used as a substitute for these exact versions.

## Candidate A — `POST /chat/whatsappNumbers/:instanceName`

### Route, authentication, input and output

Evolution 2.3.7 mounts `ChatRouter` under `/chat`, and the route is:

`POST /chat/whatsappNumbers/:instanceName`

The route receives the normal guard chain:

1. `instanceExistsGuard`;
2. `instanceLoggedGuard`;
3. `authGuard['apikey']`.

The names of the guards are not treated as stronger guarantees than their source. For ordinary non-create requests, `instanceLoggedGuard` simply continues; it does not itself prove that the WhatsApp session is open. `instanceExistsGuard` checks provider runtime/cache/database existence. `authGuard['apikey']` accepts the configured global API key or, for an instance-scoped request, a matching instance token after a provider DB read.

Input:

```ts
class WhatsAppNumberDto {
  numbers: string[];
}
```

Returned elements:

```ts
class OnWhatsAppDto {
  jid: string;
  exists: boolean;
  number: string;
  name?: string;
  lid?: string;
}
```

The output contains no:

- provider observation timestamp;
- cache age;
- cache-hit flag;
- remote-query flag;
- provenance/origin field.

### Exact call path and local effects

For ordinary user numbers, `whatsappNumber(...)`:

1. normalizes supplied values through Evolution's JID/number rules;
2. reads provider-local `Contact` rows to obtain an optional push name;
3. reads `getOnWhatsappCache(...)`;
4. separates cached from uncached values;
5. invokes `client.onWhatsApp(...)` for uncached normal phone numbers;
6. merges cache and remote results;
7. selects positive uncached results;
8. calls `saveOnWhatsappCache(...)` for those positives;
9. returns `OnWhatsAppDto[]`.

The reviewed method does not itself invoke message send, read receipt, presence update, contact creation/update, or webhook emission.

However, with the currently qualified Wandora configuration, the cache path is not mutation-free.

`saveOnWhatsappCache(...)` may:

- read an existing `IsOnWhatsapp` row;
- update it if normalized fields changed;
- create a new row if none exists;
- skip the update when the stored normalized fields are already equivalent.

The provider schema has durable `createdAt` and `updatedAt` columns for `IsOnWhatsapp`.

Therefore a positive uncached `whatsappNumbers` lookup may create or update provider-owned durable state.

### Cache freshness

`getOnWhatsappCache(...)` accepts only rows whose provider `updatedAt` is within:

`DATABASE_SAVE_IS_ON_WHATSAPP_DAYS`

which is currently seven days.

Consequences:

- a positive cache hit may be almost seven days old;
- a stale positive is possible if WhatsApp registration changed after the cached observation;
- this path does not persist an equivalent negative result;
- other Evolution contact/message activity may also populate the same positive cache, so provenance is not unique to an explicit qualification request;
- the public DTO does not reveal `updatedAt`;
- the caller cannot distinguish cache evidence from a new remote query.

An expired row can also remain with its old `updatedAt` when a new positive remote result has identical normalized fields because `saveOnWhatsappCache(...)` deliberately skips an equivalent update. Later requests then keep treating that row as expired and query remotely. This behavior does not repair the public provenance gap.

## Provider-native cache-off mode

Evolution 2.3.7 natively parses:

`DATABASE_SAVE_IS_ON_WHATSAPP === 'true'`

as the enable flag.

With the flag false:

- `getOnWhatsappCache(...)` returns no cached rows;
- `saveOnWhatsappCache(...)` returns before any provider DB write;
- ordinary phone-number inputs continue through `client.onWhatsApp(...)`.

Therefore the Evolution `isOnWhatsapp` cache mutation is **not structurally unavoidable**. It can be removed using provider-native configuration without duplicating implementation in Wandora.

This configuration is global provider behavior, not a qualification-only per-call switch, and this slice did not alter the real configuration.

The cache-off finding is useful but not sufficient for qualification because a cleaner existing provider operation exists and the external-effect/freshness-contract gaps remain.

## Candidate B — existing direct provider route `POST /baileys/onWhatsapp/:instanceName`

The Reuse Gate discovered a narrower existing provider-native primitive that ADR 0387 had not yet qualified.

Evolution 2.3.7 mounts `BaileysRouter` at `/baileys`. The exact route is:

`POST /baileys/onWhatsapp/:instanceName`

It uses the same normal instance/API-key guard chain.

The route body is not given a dedicated typed DTO in this wrapper; the controller reads:

`body?.jid`

and delegates directly:

`instance.baileysOnWhatsapp(body?.jid)`

The service implementation is exactly:

```ts
const response = await this.client.onWhatsApp(jid);
return response;
```

The Baileys result for the ordinary phone-number query is the raw list shape:

```ts
Array<{ jid: string; exists: boolean }>
```

with no provider observation timestamp or provenance metadata.

### Provider-local purity of the direct route

Unlike `/chat/whatsappNumbers`, this direct route does **not** traverse:

- Evolution `Contact` lookup;
- `getOnWhatsappCache(...)`;
- `saveOnWhatsappCache(...)`;
- `IsOnWhatsapp` create/update.

No persistent Evolution DB/cache/contact write is present in this operation path.

The auth/existence guards may perform reads. The Baileys request necessarily performs transient protocol bookkeeping. In exact Baileys 7.0.0-rc.9, `generateMessageTag()` increments an in-memory `epoch` counter used for correlation. Request/in-flight transport state is also transient provider-runtime state.

This ephemeral protocol bookkeeping is explicitly distinguished from durable provider business/cache/contact mutation. It means the call is not literally a zero-state-transition computation, but the reviewed direct operation has no identified durable Evolution-local mutation.

### Semantic difference from `whatsappNumbers`

The direct route is also narrower than the richer Evolution wrapper.

It does not perform Evolution's:

- optional contact-name lookup;
- `isOnWhatsapp` cache behavior;
- wrapper-level result enrichment;
- wrapper-specific normalization/alternative-number handling.

For a future Wandora contract, this is potentially desirable because the question is about one **exact** destination. But Wandora must not copy Evolution's provider-specific normalization logic merely to imitate the richer wrapper. Any future provider-neutral adapter must define its own bounded canonical input semantics and keep provider normalization inside the provider adapter.

## Exact Baileys 7.0.0-rc.9 behavior

For ordinary phone-number inputs, `onWhatsApp(...)`:

1. creates a `USyncQuery`;
2. enables `USyncContactProtocol`;
3. converts each supplied identifier to a phone value;
4. adds it as a USync user;
5. executes `executeUSyncQuery(...)`;
6. parses the contact protocol result into `{ jid, exists }`.

`USyncQuery` defaults to:

```text
context = interactive
mode = query
```

`executeUSyncQuery(...)` sends a real IQ node to WhatsApp infrastructure:

```text
to    = S_WHATSAPP_NET
type  = get
xmlns = usync
```

and waits for the server response.

`USyncContactProtocol` interprets a returned contact node with `type='in'` as the positive membership/existence result.

The reviewed `onWhatsApp` path contains no explicit call to:

- send a message;
- relay a message;
- send a read receipt;
- update presence;
- create/update an Evolution contact;
- emit an application-level Baileys event for the lookup.

## External WhatsApp side effects

What is proved:

- a real network/protocol request is sent to WhatsApp servers;
- the client operation is an IQ `get` USync contact query;
- no explicit message/read/presence/contact-write operation is constructed in the reviewed client code.

What is **not proved**:

- that WhatsApp server processing of this USync query is guaranteed to cause zero recipient-visible effect;
- that it is guaranteed to cause zero account-side/server-side observable state change beyond servicing the query;
- that this behavior is a stable upstream contract rather than an implementation detail of the pinned client/protocol.

No upstream source-level or published contract guarantee for those zero-effect properties was found.

The slice explicitly forbids a real provider call as an investigative shortcut. Therefore empirical observation cannot replace the missing guarantee.

Result:

**remote/recipient-visible external-effect absence = NOT PROVEN**.

## Freshness of the direct route

The direct `/baileys/onWhatsapp` path does not consult Evolution's `isOnWhatsapp` cache. For an ordinary phone-number invocation that reaches `client.onWhatsApp`, the exact code path issues the USync query during that request.

Thus the implementation can distinguish this candidate operationally from the cached `whatsappNumbers` path: it is a new remote query, not an Evolution cache hit.

However, the returned provider contract contains only `jid` and `exists`. It does not provide:

- provider `observedAt`;
- evidence age;
- source/origin;
- server-side timestamp.

A future Gateway adapter could only add a **Wandora/Gateway local observation time** if a newer contract explicitly defines that provenance. Such a time would describe when Wandora observed the response, not a provider-supplied WhatsApp fact timestamp. This ADR does not invent or conflate those concepts.

Therefore the direct route improves freshness semantics substantially but does not by itself satisfy a contract that requires provider-carried age/timestamp/origin metadata.

## Capability Authority / Reuse Gate

### Semantic authority

Wandora Core owns the provider-neutral meaning of:

> this exact destination has this exact channel, supported by bounded evidence

including the rules for sufficient evidence, no automatic destination selection and fail-closed behavior.

### Durable product state

No new destination registry, messaging Connection registry, qualification cache, provider mirror, retry ledger or other durable state is required or authorized by this investigation.

### Operational authority

Messaging Gateway remains the provider-neutral messaging adaptation/replacement boundary.

Human Send remains the later supervised outbound authorization boundary.

Paperclip remains operational authority for its own workforce/run/Connection/grant/Tool Gateway domains, but no qualified Paperclip capability proves arbitrary WhatsApp registration for this Fast Read semantic.

Mastra remains runtime/tool execution implementation and is not messaging destination/Connection authority.

### Provider implementation

Evolution API 2.3.7 + Baileys 7.0.0-rc.9 remains the current accepted WhatsApp provider implementation.

The important Reuse Gate result is:

- do **not** create a Wandora-native WhatsApp existence checker;
- do **not** duplicate Baileys USync logic;
- if this evidence path is ever qualified, reuse the existing provider-native direct primitive behind Messaging Gateway.

### Replacement boundary

Core must not call `/chat/whatsappNumbers` or `/baileys/onWhatsapp` directly.

A future provider-neutral Messaging Gateway read contract may adapt the provider primitive only after the remaining gates are satisfied. Replacing Evolution must leave Core/customer semantics stable while only the Gateway/provider adapter and legitimately provider-owned state change.

## Connection / instance authority remains separate

This slice does not solve which messaging Connection/instance is authorized for an arbitrary order/customer Fast Read.

Human Send has a canonical binding only when an existing conversation provides:

`conversation.messaging_connection_id → messaging_connections`

and the Gateway then validates the exact configured connection.

The order/customer Fast Read context does not provide an equivalent canonical messaging binding.

The following remain invalid authority:

- there is only one Evolution instance;
- there is only one active connection;
- the instance belongs to Ana;
- choose the currently configured Gateway connection.

No existing capability discovered in this Reuse Gate supplies a legitimate canonical binding for this Fast Read path.

Connection authority therefore remains a separate prerequisite even if provider evidence purity is later qualified.

## Gaps

The investigation closes one important ADR 0387 uncertainty:

- the provider-local durable cache mutation is avoidable without Wandora duplication by using the existing direct Baileys route (or, less narrowly, provider-native cache-off configuration).

The remaining material gaps are:

1. **external effect guarantee** — zero recipient/account/server-observable side effects of the USync lookup are not guaranteed by the upstream contract;
2. **evidence metadata** — the provider result has no provider-defined observation timestamp/source/age;
3. **connection authority** — the Fast Read path has no canonical messaging Connection/instance binding;
4. **future input contract** — a Gateway adapter would need a bounded provider-neutral exact-destination normalization contract without copying provider-specific normalization into Core.

## Deterministic decision

Decision class:

**3. BLOCKED / NOT PROVEN**

This is not class 2.

The only previously identified durable provider-local effect — `IsOnWhatsapp` cache write — is avoidable through an existing provider-native direct primitive. The blocker is now stronger and narrower: remote-effect absence and the required evidence/provenance semantics are not sufficiently guaranteed, and Connection authority is separately unresolved.

No property is inferred merely because the HTTP method is POST, because the IQ type is `get`, or because no explicit message-send call appears in the client source.

## Second adversarial review

After the deterministic decision and after discovering/reviewing the direct provider route, a fresh JEV review attacked:

- false classification of read-only;
- cache hiding freshness;
- remote WhatsApp effects;
- dependence on unguaranteed Baileys behavior;
- transient provider protocol state being overlooked;
- accidental Wandora capability internalization;
- implicit provider/Connection selection;
- Evolution coupling.

JEV `jev-1.13.0` returned:

- `block = 0.84`;
- `deep_review = 0.13`;
- `proceed_fast = 0.03`;
- `split_task = 0`;
- route confidence `0.78`.

Per ADR 0377, this is advisory evidence. The deterministic factual gaps above independently require fail-closed behavior.

## Execution

Documentation only.

No adapter, provider call, configuration change or runtime code is implemented.

## Validation / no-effect receipt

This slice proves:

- real Evolution/WhatsApp call: **NO**;
- message sent: **NO**;
- Human Send invoked: **NO**;
- Messaging Gateway outbound enabled/invoked: **NO**;
- production/VPS mutation: **NO**;
- Evolution configuration/cache toggle changed: **NO**;
- secret value read/copied/moved: **NO**;
- new BusinessCapability: **NO**;
- new table/migration/state machine/service/registry/cache/retry engine/provider mirror: **NO**;
- direct Core→Evolution path: **NO**;
- Connection authority invented: **NO**;
- rollout/canary/merge: **NO**.

The runtime readback used only existing read-only/sanitized operational surfaces. No container was recreated or changed.

## Next safe boundary

Do not implement the Messaging Gateway destination-evidence adapter yet.

The provider-read prerequisite may be reopened only with new evidence that resolves the deterministic gaps, for example:

1. an authoritative upstream/provider guarantee for the externally observable side-effect semantics of the exact USync contact lookup, together with a truthful bounded provenance/freshness contract; or
2. another already-accepted specialist messaging provider exposing a cleaner equivalent primitive behind the same Messaging Gateway replacement boundary.

Separately, a future product slice must establish canonical messaging Connection/instance authority for non-conversation Fast Read contexts before any provider lookup can be executed for a customer request.

The existing `/baileys/onWhatsapp/:instanceName` route is the preferred reuse candidate if those future gates are ever satisfied. This ADR does not authorize calling it.
