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
- PR #388 remains `open / draft / mergeable / unmerged` at `d45725f8ed24313ac22fb3331aabe6df48a1e33f`;
- the real stack is #386 → #387 → #388, with each PR based on the previous head;
- the one initial CI read showed all observed exact-head workflows for PR #386, PR #387 and PR #388 completed successfully; no polling or rerun was performed;
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

It uses the same normal instance/API-key guard chain, whose source semantics are narrower than their names suggest:

- `instanceExistsGuard` may resolve the instance from provider runtime/cache/database and is a read path;
- `instanceLoggedGuard` performs special handling only for `/instance/create`; for this ordinary route it simply calls `next()` and therefore does **not** prove that the WhatsApp socket is open;
- `authGuard['apikey']` accepts the configured global API key or can read the instance token from the provider database for comparison.

The router applies the generic `instanceSchema`; there is no dedicated body schema that validates `jid` for this operation. The controller reads:

`body?.jid`

and delegates directly:

`instance.baileysOnWhatsapp(body?.jid)`

The service implementation is exactly:

```ts
const response = await this.client.onWhatsApp(jid);
return response;
```

The TypeScript shape is:

```ts
Array<{ jid: string; exists: boolean }>
```

but the exact rc.9 implementation is semantically narrower: `USyncContactProtocol` returns `true` only for a contact response whose `type='in'`, and `onWhatsApp(...)` then filters the parsed list with `!!a.contact` **before** mapping it. Consequently, returned elements are effectively positive membership records with `exists:true`; a negative `contact:false` item is omitted rather than returned as an explicit `{ exists:false }` record.

Therefore absence from the returned array must not be documented as a provider-explicit negative observation without an additional qualified contract. The result also carries no provider observation timestamp or provenance metadata.

### Provider-local purity of the direct route

Unlike `/chat/whatsappNumbers`, this direct route does **not** traverse:

- Evolution `Contact` lookup;
- `getOnWhatsappCache(...)`;
- `saveOnWhatsappCache(...)`;
- `IsOnWhatsapp` create/update.

No persistent Evolution DB/cache/contact write is present in this operation path.

The auth/existence guards may perform reads. The Baileys request necessarily performs transient protocol bookkeeping. In exact Baileys 7.0.0-rc.9, `generateMessageTag()` increments an in-memory `epoch` counter used for correlation. Request/in-flight transport state is also transient provider-runtime state.

This ephemeral protocol bookkeeping is explicitly distinguished from durable provider business/cache/contact mutation. It means the call is not literally a zero-state-transition computation, but the reviewed direct operation has no identified durable Evolution-local mutation.

There is one additional indirect Evolution request effect that must be classified explicitly: all routes pass through the global `Telemetry` middleware, which calls `sendTelemetry(req.path)`. If Evolution telemetry is enabled, that helper can make an asynchronous HTTP POST containing route, API version and timestamp to the configured telemetry endpoint. In the **qualified Wandora stack**, however, `TELEMETRY_ENABLED=false`, so the helper returns before that external telemetry request. This is therefore a conditional provider effect that is disabled by the current canonical configuration, not a universal property of the upstream route.

### Semantic difference from `whatsappNumbers`

The direct route is also narrower than the richer Evolution wrapper.

It does not perform Evolution's:

- optional contact-name lookup;
- `isOnWhatsapp` cache behavior;
- wrapper-level result enrichment;
- wrapper-specific normalization/alternative-number handling.

For a future Wandora contract, this is potentially desirable because the question is about one **exact** destination. But Wandora must not copy Evolution's provider-specific normalization logic merely to imitate the richer wrapper. Any future provider-neutral adapter must define its own bounded canonical input semantics and keep provider normalization inside the provider adapter.

## Exact Baileys 7.0.0-rc.9 behavior

For the exact rc.9 implementation, `onWhatsApp(...)`:

1. creates a fresh `USyncQuery`;
2. skips LID inputs; if that leaves no users, it returns an empty list without issuing USync;
3. enables `USyncContactProtocol` once for ordinary inputs;
4. normalizes each ordinary identifier to a phone string by stripping a leading `+`, the JID domain and any device suffix, then prepending `+`;
5. adds the normalized phone as a USync user;
6. executes `executeUSyncQuery(...)`;
7. parses the contact protocol;
8. filters out every parsed item whose contact result is false before mapping the survivors to `{ jid, exists }`.

`USyncQuery` defaults to:

```text
context = interactive
mode = query
```

`executeUSyncQuery(...)` constructs a fresh IQ request:

```text
to    = S_WHATSAPP_NET
type  = get
xmlns = usync
```

with a generated message tag / USync session identifier and sends it through `query(...)` on the existing encrypted WebSocket transport. `query(...)` installs temporary correlation listeners, sends the node, waits for the matching response and removes those listeners; the reviewed query helper does not add a retry loop.

`USyncContactProtocol` interprets a returned contact node with `type='in'` as `true`. Because `onWhatsApp(...)` discards false contact results, the direct rc.9 output is suitable only as **positive membership evidence** at this source level. It is not an explicit positive/negative observation record per requested input.

The reviewed direct invocation path contains no explicit call to:

- `sendMessage` or message relay;
- `readMessages` / read receipt;
- `presenceSubscribe`, typing or `sendPresenceUpdate`;
- contact sync/upsert/update or address-book mutation;
- app-state mutation;
- Signal session/pre-key mutation;
- `creds.update`;
- dirty-state cleanup;
- WAM telemetry/event emission attributable to the lookup.

Baileys has other ambient socket handlers and connection-time behavior for presence, dirty state, app-state sync and credentials. Those exist on the same socket but are not invoked by the `onWhatsApp → executeUSyncQuery → query` call path and therefore are not reclassified as lookup effects without causal evidence.

## External WhatsApp side effects

What is proved:

- for an ordinary non-LID input, a real network/protocol request carrying the queried contact identifier is sent to WhatsApp servers;
- the client operation is an IQ `get` USync contact query;
- no explicit message, relay, read-receipt, presence/typing, contact-sync/upsert, app-state, Signal-session/pre-key, credential or dirty-state operation is constructed by the reviewed lookup call path;
- no lookup-specific Baileys application event emission was found in that path.

What is **not proved**:

- that WhatsApp server processing of this USync query is guaranteed to cause zero recipient-visible effect;
- that it is guaranteed to cause zero account-side/server-side contact synchronization, privacy/rate-accounting, notification or other observable state change beyond servicing the query;
- that the WhatsApp server does not cache or otherwise derive the returned membership fact from state older than the request;
- that these zero-effect properties are a stable upstream contract rather than an implementation detail of the pinned client/protocol.

The exact Baileys README documents `onWhatsApp` as a way to check whether an ID exists in WhatsApp, but does not promise side-effect-free server semantics. Targeted upstream issue/source review likewise produced no authoritative zero-effect guarantee.

The slice explicitly forbids a real provider call as an investigative shortcut. Therefore empirical observation cannot replace the missing guarantee.

Result:

**remote/recipient-visible external-effect absence = NOT PROVEN**.

## Freshness of the direct route

The direct `/baileys/onWhatsapp` path does not consult Evolution's `isOnWhatsapp` cache. For an ordinary non-LID invocation that reaches `client.onWhatsApp`, the exact code creates a new USync query, a new correlation/message tag and sends a new socket request during that call. No Evolution cache or Baileys client-side query cache/interceptor was found before this USync request.

This proves **request freshness**: Wandora would be causing a new provider request rather than consuming Evolution's seven-day `IsOnWhatsapp` cache.

It does **not** prove **fact freshness** inside WhatsApp infrastructure. The server-side storage/caching/derivation semantics for the Contact USync response are not published by the reviewed contract.

The returned operation also does not expose:

- provider `observedAt`;
- evidence age;
- source/origin;
- server cache indicator;
- server-side timestamp;
- the generated request/message-tag/USync correlation identifier.

A future Gateway adapter could add a **Wandora/Gateway local observation time** only if a newer contract explicitly defines it. Such a value means “Wandora observed this response at this local time”; it is **not** a provider-supplied evidence timestamp and cannot be relabeled as WhatsApp observation time.

Therefore the direct route proves a fresh remote request but does not prove the age/provenance of the underlying provider fact.

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
2. **positive-only result semantics** — rc.9 filters negative contact results, so array absence is not a provider-explicit negative evidence record;
3. **evidence metadata** — the provider result has no provider-defined observation timestamp/source/age/cache status/correlation;
4. **connection authority** — the Fast Read path has no canonical messaging Connection/instance binding;
5. **future input contract** — a Gateway adapter would need a bounded provider-neutral exact-destination normalization contract without copying provider-specific normalization into Core.

## Deterministic decision

Decision class:

**3. BLOCKED / NOT PROVEN**

This is not class 2.

The only previously identified durable provider-local effect — `IsOnWhatsapp` cache write — is avoidable through an existing provider-native direct primitive. The blocker is now stronger and narrower: remote-effect absence and the required evidence/provenance semantics are not sufficiently guaranteed, and Connection authority is separately unresolved.

No property is inferred merely because the HTTP method is POST, because the IQ type is `get`, or because no explicit message-send call appears in the client source.

## Second adversarial review

After the deterministic decision, the mandatory fresh JEV review attacked:

- false classification of read-only;
- treating IQ `get` as proof of no effect;
- hidden Baileys/transport/provider caching;
- remote WhatsApp contact-sync/privacy/rate/notification effects;
- indirect presence/read-receipt/app-state/session/pre-key/credential mutation;
- confusion between Gateway local observation time and provider timestamp;
- overclaiming `exists` semantics;
- accidental Wandora capability internalization;
- implicit provider/Connection selection;
- Evolution/Baileys coupling.

The first pass returned `deep_review = 0.66` (`block = 0.23`, `proceed_fast = 0.10`, `split_task = 0.01`; confidence `0.55`). That triggered the focused source review recorded above rather than immediate documentation.

The focused follow-up then tested the three decisive distinctions directly:

1. fresh client request vs fresh underlying provider fact;
2. absence of explicit client mutation vs guaranteed zero server/recipient/account effect;
3. positive membership response vs explicit negative evidence.

JEV `jev-1.13.0` returned:

- `block = 0.80`;
- `deep_review = 0.16`;
- `proceed_fast = 0.04`;
- `split_task = 0`;
- route confidence `0.73`.

Per ADR 0377, this remains advisory evidence. The focused review found no authoritative guarantee that closes the deterministic external-effect/provenance gaps, so the Wandora-owned fail-closed decision remains independently required.

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
