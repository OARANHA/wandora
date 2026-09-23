# ADR 0190 — Web Home Greeting + Company Detail Drawer V1

Status: **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**
Date: 2026-09-22

## Context

Owner review of the live customer product established two usability requirements:

1. the Home must greet the currently authenticated human by name and daypart rather than opening with a generic oversized campaign headline;
2. Company / Regras da Casa cards must behave like a compact wall: preview first, full content only when requested.

The owner also reaffirmed that display typography must be substantially smaller than the early poster-like versions.

## REAL NOW

Implementation base:

```text
main = ffceba213eb4b43019002c2de09ff00608b3df65
open PRs = 0
live Web = wandora/web:candidate-5f362fb43b62 / healthy / restart 0
```

Live MEDICSPRO grounding was independently reconciled before implementation:

```text
total rows = 4
active fact rows = 1
active rule rows = 1
retired rows = 2
```

The currently active fact contains the three owner-entered company statements in one durable entry.
The currently active rule contains the four owner-entered house-rule statements in one durable entry.

This ADR does not split or rewrite those durable records.

## Decision

### Human Home greeting

The Home uses the authenticated `/api/v1/me` user name already present in `AuthProvider.context.user.name`.

At page render, browser-local time selects:

- Bom dia;
- Boa tarde;
- Boa noite.

Only the first display-name token is used in the greeting.

The date/time eyebrow is formatted locally in pt-BR. No geo/IP inference and no new backend state are introduced.

### Density

The Home hero is reduced to:

```text
greeting = max ~2rem
main headline = max 3rem
```

Company main heading is also capped at 3rem and Company section headings at ~1.85rem.

Dela Gothic One remains an accent, not the dominant reading surface.

### Home quick actions

The greeting surface exposes only existing real routes:

- Ver aprovações;
- Conversas;
- Ensinar algo -> Empresa.

No fake pending counts or activity claims are introduced.

### Company wall cards

Each durable grounding entry remains exactly one customer card.

Cards show:

- bounded four-line preview;
- Ver detalhes action;
- truthful provenance label/source label where available;
- existing correct/retire controls for owner/admin.

The UI does not split one durable grounding row into several fake records merely to fill a four-card mockup.

### Right-side detail drawer

Selecting a card opens a right-side drawer containing:

- full untruncated content;
- fact/rule classification;
- active/history state;
- provenance label;
- source label where present;
- real updated-at timestamp;
- existing Correct / Retire actions when authorized.

Escape, overlay click and close button dismiss the drawer. Body scroll is locked while open.

## Capability Authority / Reuse Gate

No new capability or durable state is added.

The slice reuses:

- existing human session identity;
- existing grounding read/mutation contract;
- existing fact/rule/provenance semantics;
- existing routes and authorization.

No API, migration, provider, memory, RAG, retrieval, attachment store, workflow or outbound authority changes.

## Second adversarial review

Verified:

- no demo names, activities, tools or timestamps copied from the references;
- no API/auth/grounding contract drift;
- no durable grounding record is visually split into fake records;
- greeting name comes only from canonical authenticated context;
- daypart comes only from browser-local clock;
- no raw sourceRef is exposed;
- current owner/admin correction/retire behavior remains unchanged.

## Validation

Production-shaped Web Docker build is GREEN.

All existing Web gates remain GREEN, plus:

```text
WANDORA_WEB_HOME_GREETING_COMPANY_DRAWER_V1_OK
```

The gate proves:

- Bom dia / Boa tarde / Boa noite logic exists;
- authenticated user name is used;
- Home hero is capped at 3rem;
- quick actions point to existing product routes;
- Company cards use bounded previews;
- the right-side drawer exists and closes on Escape;
- Company heading/section density is reduced.

## Production boundary

This ADR is **CODE ONLY / NO PRODUCTION EFFECT**.

No deployment, grounding mutation, model call, work/run/session, provider mutation or external message is part of this decision.