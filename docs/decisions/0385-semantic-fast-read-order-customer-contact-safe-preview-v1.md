# ADR 0385 — Semantic Fast Read Order Customer Contact Safe Preview V1

Date: 2026-10-01

Status: **CODE QUALIFIED / EXACT CODE HEAD 11/11 WORKFLOWS GREEN / DOCUMENTATION RECORDED / DOCUMENTATION HEAD CI REQUIRED / CODE + SYNTHETIC TESTS ONLY / NO PRODUCTION EFFECT**

## Context

ADR 0384 qualified the narrow exact Order → Customer Party/Contact linkage over the existing
`business.orders.customer_contact.read` semantic capability. That boundary already proves one
exact order code, exact provider-proven customer identity linkage, at most two existing read-only
provider calls, separated telephone/mobile presence and a customer-safe projection that never emits
raw contact values or chooses a WhatsApp destination.

The next product question is narrower than messaging delivery:

> for an already exactly identified order/customer, may Wandora show a deterministic customer-safe
> message preview while proving that nothing was sent and without choosing any destination/channel?

This slice answers only that presentation question.

It does **not** authorize WhatsApp, Human Send, Messaging Gateway outbound, fiscal/NFe/DANFE/SEFAZ
work, a real customer/provider call, rollout expansion, production mutation or merge.

ADR 0168 remains permanent: portability is contract decoupling, not implementation duplication.
A safe preview requirement is not evidence that Wandora should clone Paperclip, Mastra or Messaging
Gateway operational capabilities.

## REAL NOW / proven Git state

Before documentation, the canonical bootstrap, `AGENTS.md`, relevant ADRs,
`docs/CAPABILITY_AUTHORITY.md`, `docs/architecture.md`, `docs/CANONICAL_STATE.md`, the
Semantic Fast Read browser runbook and live GitHub state were reconciled.

At documentation time:

- live `main=e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #385 is draft/open/unmerged, mergeable and clean;
- PR #385 is stacked on PR #384;
- PR #385 base is
  `feat/semantic-fast-read-order-customer-contact-linkage-v1@307bf445a792d76694014fd51f668634461cdc83`;
- exact qualified code head is
  `8fcd15bbf858e8667dae0b4c965644564528bf50`;
- no production/VPS/runtime state is required by this code-only documentation checkpoint.

The first implementation head `edeaf43f8e8306c3a014b4661edf3adb81b116bd` exposed one
`exactOptionalPropertyTypes` compile error from explicitly forwarding
`presentation: undefined`. The narrow fix omitted the optional property when absent and produced
the qualified head above. No semantic/effect boundary changed in that fix.

## PROVEN EVIDENCE

The qualified implementation proves:

- `business.orders.customer_contact.read` remains the only business capability;
- the customer selector remains exactly one order code;
- `SemanticPresentationMode` is a finite Wandora-owned presentation vocabulary:
  - `facts`;
  - `safe_contact_preview`;
- absent presentation remains backward-compatible as `facts`;
- `safe_contact_preview` is valid only for
  `business.orders.customer_contact.read`; all other capabilities fail closed with
  `presentation-not-applicable`;
- the selected presentation is signed in the existing `wfri1` intent claim `prs`;
- no phone, mobile, CPF/CNPJ, e-mail, address or provider ID is added to the semantic selector or
  signed presentation claim;
- the existing ADR 0384 provider linkage and one-or-two authorized read execution remain unchanged;
- the Organization Adapter operational capability projection remains unchanged.

## Capability Authority / Reuse Gate

### Semantic authority

Wandora owns the customer-facing meaning of a safe non-sending preview and the policy that it must
not imply an outbound effect.

The presentation mode is therefore Wandora-owned semantic/presentation policy.

### Operational authority reused

No provider capability is added.

- Paperclip remains authority for Connection/grant/secret/catalog/profile state, run lifecycle,
  Tool Gateway authorization/execution and audit.
- VendaERP remains the ERP data source behind the existing order and party reads.
- Mastra remains runtime execution implementation where applicable.
- Messaging Gateway remains transport authority for actual messaging effects.

A Paperclip approval/grant, Mastra runtime feature or message transport capability does not authorize
this or any later Wandora external effect by itself.

### Why Human Send is not reused here

ADR 0023 Human Send is an outbound-effect contract over an existing canonical
`wandora.work_proposals` `send-text` proposal. It derives recipient/channel/text from canonical
state, persists an outbound attempt and then may call Messaging Gateway.

That is intentionally **not** a generic preview/draft primitive.

Reusing Human Send for this slice would incorrectly introduce destination choice, durable outbound
state and effect semantics that the safe preview explicitly forbids.

### Durable-state decision

No table, migration, proposal row, draft row, message row, approval row, state machine, retry engine,
workflow state or provider shadow state is justified.

The preview is deterministic and derivable from already-authorized read facts, so no new durable
product state is needed.

## Decision

### 1. Do not create a new BusinessCapability

There is no `business.orders.customer_contact.preview` capability.

The provider-neutral operational read remains:

`business.orders.customer_contact.read`

Preview is a presentation choice over that read, not a separate provider/effect capability.

### 2. Add a signed presentation mode

The semantic route may select:

`facts`

or:

`safe_contact_preview`

The deterministic route gate canonicalizes the mode and signs it into the existing `wfri1` intent
as `prs`.

Legacy/older intents with no `prs` decode as `facts`.

### 3. Fail closed when presentation is not applicable

`safe_contact_preview` is accepted only when the business capability is exactly:

`business.orders.customer_contact.read`

Trying to attach that presentation to another capability fails before provider dispatch.

### 4. Deterministic preview only

For the exact linked customer and exact order, the safe preview is Core-deterministic:

`Olá, <Cliente>. Gostaríamos de falar com você sobre o pedido <código>.`

The normalized customer display name is bounded and validated before rendering.

The result labels the preview exactly:

`Prévia — NÃO ENVIADA`

No model-generated free text, destination or channel is introduced.

### 5. Contact availability and preview text are independent

The read continues to expose only safe contact facts:

- customer name;
- `Contato cadastrado: Sim/Não`;
- available kinds `Telefone`, `Celular`, or both.

The preview may be rendered even when no contact value exists because preview generation does not
mean that delivery is possible or authorized.

If both telephone and cellular exist, Wandora still does not choose either one.

### 6. No destination semantics

This slice does not:

- select telephone versus mobile;
- infer that mobile means WhatsApp;
- qualify a WhatsApp account/address;
- expose or persist a destination;
- create a canonical recipient;
- choose a Messaging Gateway connection.

Any future destination/channel qualification is a separate product/effect boundary.

### 7. No outbound path

The safe preview does not invoke or create:

- Human Send;
- `wandora.work_proposals`;
- outbound attempts;
- Messaging Gateway outbound;
- Evolution/Meta send;
- Paperclip approval/task state for sending;
- Mastra draft/workflow state for sending.

`Prévia — NÃO ENVIADA` is a presentation fact, not an effect authorization.

## Privacy boundary

Customer-facing rendering still excludes:

- CPF/CNPJ/customer tax identity;
- raw telephone;
- raw cellular/mobile;
- e-mail;
- address;
- provider/external IDs;
- raw provider payload.

The signed intent adds only the finite presentation enum and carries no contact PII.

## Provider replacement boundary

A replacement ERP may supply the same exact order/customer-contact read behind the existing
provider-neutral adapter.

The Wandora presentation contract remains stable. Replacing the ERP, Paperclip, Mastra or messaging
provider does not require Wandora to internalize those providers' operational implementations.

## Synthetic validation

Coverage proves at least:

- signed `safe_contact_preview` reaches the deterministic binding;
- legacy/absent presentation remains `facts`;
- preview is rejected for unrelated capabilities;
- the selector remains exact order code only;
- signed intent carries presentation but no unnecessary contact PII;
- `facts` mode does not append an implicit preview;
- safe preview is labeled `Prévia — NÃO ENVIADA`;
- zero contact still does not imply sendability;
- telephone-only, mobile-only and both-contact cases do not choose a destination;
- raw phone/mobile/tax/e-mail/provider identifiers do not enter the customer result;
- no WhatsApp inference appears;
- no third provider lookup, retry or fallback is introduced;
- no fiscal lookup is introduced;
- Organization Adapter capability projection contains no preview/send/WhatsApp/outbound capability;
- no Human Send or Gateway outbound path is invoked.

## CI qualification

Exact code head
`8fcd15bbf858e8667dae0b4c965644564528bf50` completed **11/11 workflow runs GREEN**:

- Paperclip OpenAPI Compatibility — `36954613457`;
- Platform Admin CI — `36954613574`;
- Messaging Gateway CI — `36954613567`;
- Web CI — `36954613523`;
- Core Candidate Artifact — `36954613550`;
- Integration Capability Projection CI — `36954613594`;
- Organization Adapter Plugin CI — `36954613570`;
- Semantic Fast Read CI — `36954613572`;
- Paperclip Mastra Adapter CI — `36954613520`;
- Core CI — `36954613514`;
- Paperclip Fast Read Patch Composition CI — `36954613502`.

All eleven completed successfully on attempt 1 for that exact head.

The documentation commit produced from this ADR is a new head and must receive its own exact-head CI
qualification before the slice is called fully complete.

## Second adversarial review

Before documentation, a focused JEV review was run over the real qualified code head, ADR 0384,
ADR 0168, Capability Authority, Human Send and the proposed documentation boundary.

It returned:

- `proceed_fast = 0.83`;
- `deep_review = 0.16`;
- `block = 0.01`;
- confidence `0.77`.

The review identified no reason to create a new BusinessCapability, provider capability, durable
state or operational subsystem.

JEV remains advisory under ADR 0377. Deterministic repository evidence and Wandora authority remain
the decision authority.

## Documentation / runbook decision

This ADR updates the canonical continuity/checkpoint documents:

- `docs/WANDORA_PROJECT_SOURCE.md`;
- `docs/CANONICAL_STATE.md`.

The Semantic Fast Read operational/browser runbook is **not changed** because this slice adds no
production activation procedure, browser canary contract, outbound route or operator effect.

## No-effect statement

This slice performed no:

- production or VPS mutation;
- real VendaERP/provider/customer request;
- fiscal/NFe/DANFE/SEFAZ lookup;
- raw customer PII disclosure;
- destination/channel selection;
- WhatsApp inference or qualification;
- Human Send;
- Messaging Gateway outbound;
- migration or durable state creation;
- secret access/change;
- rollout expansion;
- PR merge.

PR #385 remains draft/unmerged.

## Consequence / next technically safe boundary

The safe preview contract is qualified at the code head and documented, but the documentation head
must still pass exact-head CI.

After that, the next technically narrow boundary may be a separately reviewed
**Order Customer Contact Destination/Channel Qualification V1 — NO SEND**, whose purpose would be
to prove explicit destination/channel semantics without auto-selecting telephone/mobile and without
inferring WhatsApp.

That future slice must independently pass the Capability Authority / Reuse Gate and effect review.
This ADR does not authorize destination qualification, WhatsApp, Human Send, outbound, production
promotion, a real customer call or merge by implication.
