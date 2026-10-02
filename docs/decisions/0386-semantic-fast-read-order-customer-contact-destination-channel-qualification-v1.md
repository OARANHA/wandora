# ADR 0386 — Semantic Fast Read Order Customer Contact Destination/Channel Qualification V1 — NO SEND

Date: 2026-10-02

Status: **CODE QUALIFIED / CORE CI + SEMANTIC FAST READ CI GREEN / POST-GATE CANDIDATE GREEN / DOCUMENTATION HEAD CI REQUIRED / NO PRODUCTION EFFECT**.

## Context

ADR 0384 established the bounded semantic composition `business.orders.customer_contact.read`: exact order code → exact customer identity → exact customer party/contact, reusing only the existing VendaERP order and party reads. ADR 0385 added the signed, deterministic `safe_contact_preview` presentation mode while keeping contact presence/types separate from any destination or messaging-channel semantics.

The next required distinction is narrower than messaging send: a registered telephone or cellular value may be a destination candidate, but that fact alone does not prove that a messaging channel exists, is reachable, is allowed, or has been selected.

In particular:

- a registered cellular/mobile number is **not** proof of WhatsApp;
- a registered telephone number is **not** proof of SMS, voice, WhatsApp, or any other channel;
- the first contact, only contact, cellular contact, or any ordering of contacts must never become an automatic destination choice;
- qualification is not send authorization;
- a customer-visible preview is not send authorization.

VendaERP is authoritative only for the ERP contact facts it returns. Its existing party contract exposes telephone/mobile data but does not establish WhatsApp semantics. Human Send already owns the supervised outbound authorization path, while Messaging Gateway owns provider-neutral messaging transport/effect execution. Neither boundary should be bypassed or duplicated to solve read-only qualification.

A provider-native WhatsApp-existence capability exists in the currently evaluated Evolution provider surface, but the current Wandora Messaging Gateway does not expose a read-only destination/channel qualification contract. Core therefore must not call Evolution directly.

## Decision

### 1. Reuse the existing BusinessCapability

No new BusinessCapability is introduced.

`business.orders.customer_contact.read` remains the semantic capability. Destination/channel qualification is a presentation/policy interpretation of the same exact order → exact customer → existing contact facts.

The existing exact two-provider-read maximum remains unchanged:

1. exact bounded order read;
2. exact bounded party read.

No third lookup, retry, fallback, fuzzy search, first-row trust, or provider-specific discovery call is added.

### 2. Add one finite signed presentation mode

Wandora adds:

`contact_destination_qualification`

to the existing `SemanticPresentationMode`.

It is valid only for `business.orders.customer_contact.read`. Any other capability using it fails closed.

The existing `wfri1` signed intent carries only the finite presentation mode plus the existing exact order selector and normal authorization metadata. It does **not** carry raw telephone/mobile values, provider identifiers, contact digests, channel evidence, or other contact PII.

### 3. Registered telephone/mobile become candidates, never choices

Telephone and mobile remain distinct registered contact facts.

For this presentation:

- each valid registered contact may become a destination **candidate**;
- candidates are independently represented;
- `selectedDestination` is always `null` in V1;
- even a single candidate is not auto-selected;
- candidate order does not imply preference;
- mobile does not imply WhatsApp;
- telephone does not imply SMS, voice, or WhatsApp.

If no valid contact exists, the result remains fail-closed with no destination candidate.

### 4. Channel qualification requires explicit provider evidence

A destination candidate has a separate channel-qualification state.

Without explicit trusted messaging-provider evidence for the exact candidate:

- channel qualification is `unqualified`;
- no channel is claimed;
- the result states that provider evidence is required.

Synthetic tests may inject an explicit provider-evidence object to prove the contract. Such evidence may qualify an exact candidate for a finite channel (currently WhatsApp in the modeled contract), but qualification still does not select the destination and still does not authorize send.

Provider rejection, mismatched evidence, duplicate/ambiguous evidence, malformed candidate data, or missing evidence fail closed.

The current runtime path supplies **no live provider qualification evidence**, therefore real runtime output remains unqualified by design.

### 5. Reuse the canonical recipient masking behavior

The existing Human Send recipient masking algorithm is extracted into the shared Core helper `apps/core/src/messaging/channel-address.ts`.

Human Send reuses that helper with no intended semantic change.

Destination qualification uses the same masking behavior. Raw telephone/mobile values remain internal and are never emitted by this presentation.

This avoids a second masking mechanism while preserving the Human Send customer-facing privacy behavior.

### 6. Human Send and Messaging Gateway remain separate authorities

This slice does not call Human Send and does not create or mutate `wandora.work_proposals`.

Human Send remains the supervised authorization boundary that derives and validates the effect-critical recipient/channel/connection/text context before outbound execution.

This slice does not call Messaging Gateway outbound. Messaging Gateway remains the provider-neutral transport/effect boundary for already-authorized outbound messages.

Qualification therefore cannot become send authorization by implication.

### 7. Provider capability remains behind the Gateway replacement boundary

The current provider implementation under evaluation can expose a WhatsApp-number existence check, but Core must not depend on that provider endpoint directly.

A future separately reviewed slice may introduce a **read-only provider-neutral destination/channel qualification contract behind Messaging Gateway or the accepted messaging-provider adapter boundary**. That future boundary may use Evolution today and a replacement provider later without changing Core semantics.

This follows ADR 0168:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

No provider implementation is internalized into Core.

## Authority split

- **Semantic authority:** Wandora Core owns the meaning of candidate, qualified/unqualified channel, no-auto-selection, fail-closed behavior and customer-facing projection.
- **Durable product state:** no new durable state is introduced.
- **ERP operational authority:** Paperclip/Tool Gateway retains execution/grant/runtime authority for the existing VendaERP reads; VendaERP remains the ERP data source.
- **Messaging operational authority:** Human Send retains supervised outbound authorization; Messaging Gateway retains outbound transport/effect execution.
- **Provider implementation:** Evolution/another accepted messaging provider may later supply channel-existence evidence behind the provider-neutral messaging boundary.
- **Replacement boundary:** a future read-only Gateway/provider adapter contract, not a direct Core→Evolution integration.

## Privacy and safety invariants

The customer-facing result must not expose:

- raw telephone or mobile number;
- CPF/CNPJ;
- e-mail;
- address;
- provider IDs;
- raw provider payloads;
- evidence digests.

The result may expose only masked candidate representations and bounded qualification facts.

A qualification result must never imply:

- automatic destination choice;
- WhatsApp from a mobile field;
- SMS/voice from a telephone field;
- permission to send;
- proposal approval;
- Human Send authorization;
- Messaging Gateway authorization;
- provider connection selection.

## Implementation

Qualified code head:

`bbf0e924fb780015b3e35d4defadc35726fa1f81`

Relevant implementation:

- `apps/core/src/messaging/channel-address.ts`
- `apps/core/src/semantic-routing/contact-destination-qualification.ts`
- `apps/core/src/semantic-routing/contracts.ts`
- `apps/core/src/semantic-routing/fast-read-intent.ts`
- `apps/core/src/semantic-routing/typesafe-jev-provider.ts`
- `apps/core/src/business-system/vendaerp-fast-read.ts`
- focused synthetic tests under `apps/core/test/`

The mandatory pre-code adversarial review was advisory and supported proceeding with caution. No production/runtime/provider effect was required for implementation or qualification.

## Validation

The qualified code head passed the relevant exact-head CI, including:

- Core CI — GREEN;
- Semantic Fast Read CI — GREEN;
- Messaging Gateway CI — GREEN;
- Integration Capability Projection CI — GREEN;
- Platform Admin CI — GREEN;
- Web CI — GREEN.

The initial Core Candidate Artifact completed before the two primary gates. After Core CI and Semantic Fast Read CI were GREEN, only the Candidate job was rerun. Post-gate job `110690384333` completed GREEN on the same exact code head.

Synthetic coverage includes:

- telephone only;
- mobile only;
- both;
- neither;
- no automatic choice;
- mobile does not imply WhatsApp;
- telephone does not imply a messaging channel;
- ambiguous/mismatched evidence fails closed;
- no provider evidence fails closed;
- explicit exact provider evidence can qualify the modeled channel without selecting it;
- raw contact PII is not emitted;
- signed intent contains no contact PII;
- no Human Send call;
- no Messaging Gateway outbound call;
- no proposal/outbound attempt;
- no fiscal path;
- no retry/fallback/third lookup.

## Explicit non-goals

This ADR does not authorize:

- WhatsApp send;
- Human Send invocation;
- Messaging Gateway outbound;
- SMS or voice calls;
- automatic contact selection;
- proposal creation;
- outbound-attempt creation;
- a real Evolution/Meta/provider qualification call;
- a real customer experiment;
- additional VendaERP lookup;
- fiscal/NFe/DANFE/SEFAZ work;
- table, migration, contact registry, destination registry, state machine, workflow, approval mechanism or durable qualification state;
- production/VPS mutation;
- rollout;
- merge.

## Runbook impact

No operational runbook change is required. No runtime/operator contract, production effect path, deployment procedure or provider activation changed.

## Next safe boundary

Only after this documentation head independently qualifies may a future slice be considered for a **Messaging Gateway Read-Only Destination/Channel Qualification Adapter V1 — NO SEND**, with synthetic-first validation and the same provider-replacement boundary.

That future slice is **not authorized by this ADR by implication**.
