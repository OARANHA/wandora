# ADR 0273 — Team Employee Work Drawer + Recent Pagination V1

Status: **IMPLEMENTED IN CODE / WEB ONLY / NO PRODUCTION EFFECT**  
Date: 2026-09-25

## Context

ADR 0271 moved the Team work form into a fixed right column to reduce vertical height.

Live customer review showed that the column was still visually cramped and created an internal scrolling mini-application beside the employee-development surface.

The preferred business interaction is:

> open Ana -> click "Dar trabalho para Ana" -> a work panel appears from the right.

## Decision

Remove the fixed Team work column.

The employee identity card exposes the primary CTA:

```text
Dar trabalho para Ana
```

Clicking it opens a right-side drawer.

Desktop:

```text
Team page remains visible in the background
                         ┌─────────────────────────────┐
                         │ TRABALHAR COM ANA           │
                         │ [Novo] [Recentes]           │
                         │                             │
                         │ drawer content              │
                         └─────────────────────────────┘
```

Mobile uses the same drawer at full available width.

The employee-development surface returns to full-width prominence in the Team page.

## Drawer tabs

### Novo trabalho

Reuses the existing supervised-work contract and ADR 0269 single-prompt UX:

- main natural-language request required;
- details optional;
- existing idempotency/retry contract preserved;
- no outbound effect.

### Trabalhos recentes

The existing employee-work GET remains unchanged and bounded by the canonical Core list.

The drawer paginates the returned recent items in the browser:

```text
PAGE_SIZE = 5
```

Controls:

- Anterior;
- numbered pages;
- Próximo.

This is presentation pagination only. It does not introduce a new server-side cursor, archive, history table or lifecycle.

The current Core contract returns at most 50 recent items; therefore V1 exposes at most ten five-item presentation pages.

## Result detail boundary

Team does not render full work results in the drawer.

Each recent item exposes:

- title;
- truthful current state;
- short request preview;
- updated date;
- `Abrir resultado` when a result exists;
- `Ver trabalho` otherwise.

Detailed result viewing remains delegated to the canonical Work surface.

## Authority / Reuse Gate

No new:

- table;
- migration;
- work lifecycle;
- archive state;
- read/unread state;
- result store;
- Core endpoint;
- Paperclip capability.

This slice reuses the existing bounded work list and work assignment contract.

## Second adversarial review

Jev returned `allow`.

Safeguards preserved:

- no duplicate result-detail renderer;
- no invented review/archive state;
- no backend/provider mutation;
- single-prompt idempotency preserved;
- development remains prominent on Team;
- pagination replaces the long recent-work list.

## Effect boundary

```text
production Web promotion = 0
Core change = 0
database change = 0
Paperclip change = 0
provider/model call = 0
customer work = 0
outbound = 0
```
