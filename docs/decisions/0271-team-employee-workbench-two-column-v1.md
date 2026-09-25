# ADR 0271 — Team Employee Workbench Two-Column V1

Status: **IMPLEMENTED IN CODE / WEB ONLY / NO PRODUCTION EFFECT**  
Date: 2026-09-25

## Context

Owner review of the live Team page found the employee surface too vertical.

The current desktop order is:

```text
identity + autonomy
development
work assignment + recent work with inline results
```

This creates unnecessary page height and duplicates detailed work results already available in the canonical Work drawer.

## Decision

Keep identity + autonomy at the top.

On desktop, render the employee workbench below as:

```text
┌──────────────────────────────────────┬───────────────────────────┐
│ Development ~65%                     │ Work with Ana ~35%        │
│                                      │                           │
│ Responsibilities                     │ New supervised work       │
│ Learnings                            │                           │
│ Autonomy                             │ Compact recent work       │
└──────────────────────────────────────┴───────────────────────────┘
```

Implementation:

```text
xl:grid-cols-[minmax(0,1.3fr)_minmax(22rem,0.7fr)]
```

The work column is sticky/bounded on desktop and remains stacked on smaller screens.

## Recent work

Team no longer expands complete recent results inline in compact mode.

Each recent row keeps:
- title;
- truthful current state;
- short request preview;
- `Abrir resultado` when a result exists;
- `Ver trabalho` otherwise.

Detailed results remain in the existing canonical `/work` drawer.

No reviewed/archive/related-work state is invented.

## Authority / Reuse Gate

This is a Web projection change only.

Reuses:
- existing employee-development Core contract;
- existing supervised-work read/write contract;
- existing `/work` detail drawer;
- existing local Web interaction state.

No new:
- table;
- migration;
- API endpoint;
- result store;
- work lifecycle;
- provider capability.

ADR 0168 remains preserved.

## Second adversarial review

Jev returned `allow`.

Safeguards:
- development remains visually primary;
- no result-detail duplication in compact mode;
- mobile remains stacked;
- no backend/provider change;
- no fictitious work state.

## Validation

The Web verifier now proves:
- the Team desktop two-column grid;
- compact work-panel mode;
- bounded recent-work preview;
- navigation to the canonical Work surface for detail.

## Effect boundary

```text
production Web promotion = 0
Core change = 0
Paperclip change = 0
provider/model call = 0
customer work = 0
outbound = 0
migration = 0
```
