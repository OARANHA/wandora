# Wandora — First-Day Customer Journey V1

Status: **Frozen product contract for the first production vertical slice**

Date: 2026-09-14

## Goal

A paying business owner should be able to enter Wandora and reach the first useful supervised work without needing a Wandora consultant, learning provider/runtime terminology or completing a long implementation questionnaire.

The first-day journey is intentionally small. It does not try to configure the whole company. It creates enough trusted context for one digital employee to begin one clear responsibility safely.

## Entry point

The customer journey is represented by the standalone `/start` route. It intentionally sits outside the normal authenticated product shell so the customer can complete the first-day sequence without sidebar/navigation distraction.

When this contract is wired to production auth, `/start` is the default destination for an authenticated organization that has not completed its first useful-work activation. Returning organizations go directly to the normal product shell.

## Six-step journey

### 1. Sua empresa

Ask only for:

- company name — required;
- company site/page — optional.

Do not require legal profile, billing detail, org chart, full operating manual or integration configuration here. Those belong in normal company administration when actually needed.

### 2. Primeiro objetivo

Ask the owner which business outcome they want to remove from their own desk first.

The UI uses business outcomes, not agent types, prompts, models or workflows. V1 examples are:

- atender novos contatos;
- cuidar do atendimento;
- fazer acompanhamentos.

The selection drives a Wandora recommendation for a digital employee/responsibility. It is not a generic agent marketplace.

### 3. Seu funcionário

Present the recommended employee as a member of the team with:

- name;
- business role;
- responsibility;
- what the employee may start doing;
- when the employee must stop and ask the human.

The employee starts with **supervised autonomy**. The product must make the approval boundary understandable before work starts.

### 4. Ferramenta de trabalho

Connect only the minimum tool required for the first responsibility.

For the first messaging-centered vertical slice, that tool is the company WhatsApp connection behind the Wandora Messaging Gateway. Evolution/Meta/provider terms remain outside the customer experience.

The current screen uses a non-production connection simulation. Production wiring must replace that simulation without changing the customer-facing contract.

### 5. Ensine o essencial

Collect only the facts required to start safely. Current V1 fields are:

- what the company sells or solves;
- normal service hours;
- one important rule that cannot be ignored — optional.

A provided company site may later be used as an input source to prepare suggested knowledge, but discovered information does not silently become company truth. Durable instructions require the appropriate confirmation/approval boundary.

The onboarding is not a consulting questionnaire. Additional policies, products, documents and corrections are taught progressively through normal company operation.

### 6. Começar

Before activation, summarize:

- company;
- initial responsibility;
- connected work tool;
- initial autonomy level.

The primary action is **Começar trabalho supervisionado**. After activation, the customer enters the normal Wandora `Início` experience and should immediately be able to observe employee activity, work, conversations and pending approvals.

## Learning and memory boundary

The product may learn over time, but customer-visible learning must remain governable.

- conversation/history is preserved for traceability;
- a human correction may become a proposed durable company instruction;
- durable company instructions require the appropriate approval path;
- transactional facts such as prices, permissions, schedules, payments and approvals remain canonical structured business state rather than conversational memory;
- runtime/model memory is never the only source of truth for company policy.

The customer language is "ensinar", "corrigir" and "regra da empresa". RAG, embeddings, vector stores, provider memory and model context stay implementation details.

## Completion criteria

The first-day journey is complete only when the production implementation can prove all of the following:

1. an authenticated owner can create/join the company without staff assistance;
2. one business outcome can be selected;
3. one digital employee/responsibility can be activated;
4. the required provider-neutral work connection is owned by the correct organization;
5. essential knowledge is persisted as Wandora-owned company state;
6. the employee starts in supervised mode;
7. actions outside policy create a human approval requirement rather than proceeding silently;
8. the first real work item is observable in the product shell;
9. the owner can return to `Início`, `Equipe`, `Trabalho`, `Conversas` and `Aprovações` without an implementation handoff;
10. no customer-facing contract depends on Evolution, Mastra, Supabase or model-provider identifiers.

## Current UI evidence

The product-contract implementation under `apps/web` includes a dedicated responsive `/start` journey with the six steps above.

Verification evidence for the contract UI:

- strict TypeScript passes in the pinned Node 22 Docker build;
- Vite production build passes;
- `/healthz`, `/start` and all current shell routes return HTTP 200 with SPA fallback;
- Chromium smoke passes at 390 px and 1440 px;
- the complete six-step journey is executable at both viewport sizes;
- no browser-console errors were observed in the smoke;
- no horizontal document overflow was observed;
- `/start` renders without the normal application sidebar/topbar shell.

## Scope boundary

This contract deliberately does **not** yet implement production signup/checkout, persistence, real WhatsApp connection, real employee runtime activation or production-side effects.

Those capabilities are implemented next as one end-to-end vertical slice behind the already accepted Wandora Web, Core, Supabase, Agent Runtime and Messaging Gateway boundaries.

## Next product slice

Define and implement the first real digital employee from this journey. The preferred first slice is **Ana — Assistente Comercial Digital**, starting with the smallest safe inbound-new-contact workflow over WhatsApp because the provider-neutral messaging boundary has already been validated with real inbound/outbound traffic.
