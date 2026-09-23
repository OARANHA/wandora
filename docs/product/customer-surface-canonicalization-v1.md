# Wandora Customer Surface — Canonicalization Matrix V1

Status: **CANONICAL DESIGN MAP**
Authority: ADR 0162.

## Design source

The approved customer-panel prototype establishes the target experience and vocabulary for the Wandora customer product.

Canonical design traits:

- warm paper background;
- black structural borders;
- lime as primary motion/action accent;
- yellow for attention/decision accents;
- cobalt for selected emphasis where useful;
- hard offset shadows;
- strong but bounded business-first headlines that never dominate comprehension;
- compact mono-style labels for operational metadata;
- one shared navigation for human and digital work;
- provider technology hidden from the customer.

The existing product stack remains React + Vite + TanStack. The prototype's Next.js/shadcn implementation is a design/reference implementation, not a runtime migration target.

## Truth rule

Every customer-visible block must be classified before implementation:

| Class | Meaning | Production rule |
| --- | --- | --- |
| REAL | Existing authenticated contract/state directly supports it | Connect now |
| DERIVÁVEL | Safe computation from REAL state without adding semantics | Connect now with explicit derivation |
| FUTURO | Requires missing capability, state or authority decision | Hide/neutralize until reviewed |

No demo number, demo person, demo customer, demo monetary amount or simulated action is allowed to masquerade as production state.

## Surface matrix

### Início

**REAL now**

- active organization;
- authenticated user;
- digital employees;
- employee status/autonomy;
- customer-work items per employee;
- customer-work result/state.

**DERIVÁVEL now**

- digital employee count;
- active digital employee count;
- returned customer-work count;
- review-ready work count;
- latest customer work.

**FUTURO**

- revenue/opportunity totals;
- meeting totals;
- generalized “conversations today” metrics;
- true approval count until approval authority is unified;
- arbitrary “team live” activity beyond proven events.

### Equipe

**REAL now**

- Ana identity;
- function;
- active/paused state;
- supervised autonomy;
- activation availability/state;
- customer-work availability and recent work.

**FUTURO**

- human teammate directory unless sourced from a canonical Wandora membership/team contract;
- weekly performance scorecards;
- learned-training history;
- response-time claims not derived from canonical telemetry;
- next-hire queue beyond existing catalog/eligibility contracts.

### Trabalho

**REAL now**

- attention-required supervised inbound work;
- reviewed proposal state;
- customer work assigned directly to a digital employee.

**FUTURO**

- generic commercial Kanban stages such as new lead / negotiation / quote / closed unless a real business-work authority is selected;
- monetary pipeline totals not already canonical.

The prototype Kanban is a product direction, not permission to invent a CRM domain.

### Conversas

**REAL now**

- tenant-authorized conversation list;
- canonical recent conversation history;
- inbound/outbound message direction already recorded.

**PARTIAL / FUTURO**

- live typing/presence claims;
- takeover/assume-conversation behavior unless backed by an accepted human action contract;
- autonomous outbound while Human Send/Gateway outbound are OFF.

### Aprovações

The prototype's decision-first UX is canonical design direction.

**FUTURO capability review required**

Existing Wandora supervision/proposals and policy boundaries must be inspected before defining a generalized approvals queue. Do not create a second approval engine merely to fill this page.

Until that review, production must not display fictitious approval cards.

### Empresa

The prototype's `Regras da casa` language is canonical product direction for grounding and company instruction.

**REAL now**

- organization identity;
- memberships/roles already available to the session.

**FUTURO capability review required**

- company rules;
- approved corrections becoming durable rules;
- official business knowledge;
- connected tool inventory/status;
- training history.

Before creating local tables, review Paperclip, Mastra and existing Wandora policy/knowledge state. Persist only the minimum Wandora-owned truth needed for grounding, safety, audit and replaceability.

## First merged target

The first canonicalization implementation intentionally changes only:

- global visual tokens;
- customer shell/navigation;
- Início.

The Início must contain no fictitious commercial metrics. It is the reference implementation for subsequent pages.


## Equipe implementation checkpoint — ADR 0163

`Equipe` is now implemented in code against the existing authenticated digital-employee contracts.

Connected as REAL:

- digital-employee identity;
- role;
- active/paused status;
- supervised autonomy;
- activation availability/state;
- customer-work availability and panel;
- hire availability/reconciliation state.

Prototype-only elements remain FUTURO and are not presented as customer truth:

- selectable Aprendiz / De confiança autonomy;
- training history;
- weekly performance report;
- human teammate directory;
- response-time claims;
- candidate/future-hire queue.

The approved Team composition and visual language are retained without inventing state.


## Customer-work result presentation checkpoint — ADR 0164

Customer-work results are now presented in code through a bounded, inert Wandora renderer rather than raw Markdown markers.

Supported formatting:

- headings;
- paragraphs;
- bold text;
- inline code;
- unordered/ordered lists;
- quotes.

Markdown link/image targets are discarded; only visible label/alt text remains. Raw HTML is never interpreted. The renderer uses no `dangerouslySetInnerHTML`, `innerHTML` or model-provided `href`.

The `Início` latest-work preview uses normalized plain text, so model Markdown markers do not leak into the compact surface.


## Conversas implementation checkpoint — ADR 0166

`Conversas` is now canonicalized in code against the already-live ADR 0020/0021 read contracts.

Connected as REAL:

- tenant-authorized conversation list;
- canonical contact label;
- open/closed conversation status;
- associated employee when present;
- latest canonical message;
- bounded recent history;
- inbound/outbound direction;
- `hasEarlierMessages`.

Still FUTURO / unavailable:

- unread state;
- live presence;
- typing indicators;
- takeover/assignment mutation;
- reply/send/edit-send/dismiss;
- autonomous outbound controls.

The page remains explicitly read-only and provider-neutral.

## Design System + App Shell checkpoint — ADR 0186

The approved customer visual language is now explicit in code:

- Display = Dela Gothic One 400
- Body = Space Grotesk Variable
- Mono = JetBrains Mono Variable

The Web artifact bundles these fonts directly; customer rendering does not depend on a runtime font CDN.

The global customer shell keeps the same six canonical routes and active-organization/auth contracts, while desktop navigation can collapse from 250px to 82px. The preference is browser-local presentation state only.

The shell also exposes a dedicated power-style Sair control wired to the existing canonical session-revocation path. Mobile keeps the same navigation authority through a compact quick bar plus complete route menu.

The visual references remain subject to the Truth Rule above: demo people, activities, tool status, timestamps and commercial claims are not copied into customer state unless independently backed by REAL or accepted DERIVÁVEL contracts.

## Business Density + Company reference checkpoint — ADR 0188

The second approved Company / Regras da Casa reference is now the density/scale target, not merely a palette reference.

Customer display typography is intentionally constrained so Dela Gothic One acts as emphasis rather than dominating reading. Início, Equipe, Conversas and Empresa cap primary hero scale around 4rem.

Empresa now mirrors the approved business-first composition using only real state: Regras da Casa first, concise rule cards, an Ensinar à equipe panel, a Como funciona explainer, company facts and preserved history. Optional provenance/evidence controls stay available but are visually secondary.

Demo people, tools, timestamps and operational claims from the mockup remain prohibited unless independently backed by REAL or accepted DERIVÁVEL contracts.

## Human Home Greeting + Company detail checkpoint — ADR 0190 / ADR 0191

The current customer-experience direction is explicitly human-first:

- Home greets the authenticated human by real display name and browser-local daypart;
- primary Home/Company hero scale is capped around 3rem;
- quick actions point only to existing Wandora routes;
- one durable grounding entry remains one wall card;
- long grounding content is previewed compactly and opens in a right-side detail drawer;
- the drawer uses real content, source label and timestamps only.

Organization grounding source files are now classified as **FUTURE / AUTHORITY RESOLVED, NOT LIVE**:

- Wandora owns evidence/source semantics;
- Supabase Storage is the accepted delegated private blob implementation;
- no live grounding-source bucket/policy exists yet;
- upload must not appear as a working customer action before its dedicated implementation/promotion;
- uploaded evidence must not automatically become runtime retrieval, RAG, memory, embeddings or context.

The Truth Rule continues to prohibit fabricated wall cards, fake users, fake tools, fake activity and reference-only timestamps.