# ADR 0263 — Work Operator List + Detail Drawer V1

Status: **EXECUTED / GREEN / WEB ONLY**  
Date: 2026-09-25

## Context

Owner review of the live ADR 0261 `/work` surface found the semantic model correct but the presentation too vertically dense:

- up to 20 supervised works render as large stacked cards;
- completed results expand inline, forcing long page scrolling;
- the three summary cards communicate counts but do not help navigate the work set;
- opening one result should feel like inspecting an operational item, not reading a long report page.

The existing contracts already expose enough authorized data to solve this in the Web projection. No new backend state is required.

## REAL NOW

At slice entry:

```text
main = 4f2902cf43d96d8010b5abb5274f300a9fe3189c
open PRs = 0
production Web = wandora/web:candidate-13034613000d
production Web health = healthy
production Web restart = 0
```

ADR 0261 and ADR 0262 are live.

## Capability Authority / Reuse Gate

This slice is presentation-only.

Reuse:

- existing digital-employee list;
- existing per-employee supervised-work reads;
- existing `attention-required` queue;
- existing `WorkResultContent` safe renderer;
- existing `/team` route for assigning new supervised work;
- local React state for search, filtering, selected detail and copy feedback.

No new:

- table or migration;
- reviewed/read/unread/archive state;
- retry state machine;
- related-work graph;
- notification persistence;
- Paperclip/Mastra/provider capability;
- Core API.

Authority remains:

- Paperclip owns operational work lifecycle;
- Wandora owns the customer-facing work semantics/projection;
- Web owns transient interaction state;
- Team remains the existing customer surface for creating supervised work;
- attention-required remains a distinct existing Core contract.

## Decision

### 1. Compact operational list

Supervised work renders as compact rows inside a bounded-height list instead of expanding every result inline.

Each row shows only:

- title;
- employee;
- last update;
- current state;
- short request preview;
- truthful action: `Abrir resultado` when a result exists, otherwise `Ver trabalho`.

### 2. Right-side detail drawer

Selecting a work opens a right-side detail drawer on larger screens and a full-width overlay on small screens.

The drawer contains:

- current state and timestamps;
- original request;
- safe rendered result when available;
- local `Copiar resultado` action;
- link back to existing `/team` to create another work.

The Web does not claim a persistent relationship between the old and new work.

### 3. Summary cards become filters

The three existing summary cards become toggle filters:

- Em andamento;
- Prontos para revisão;
- Em verificação.

A separate `Todos` control resets state.

The counts remain derived from the same in-memory authorized projection.

### 4. Local search

Search runs only over already-loaded authorized data:

- title;
- description;
- employee name;
- existing result summary.

It creates no server query, index, retrieval subsystem or durable state.

### 5. Explicit non-features

This slice does not add buttons for:

- `Marcar como revisado`;
- archive;
- automatic retry/refazer;
- persistent unread;
- durable related follow-up.

Those require an actual product contract before becoming customer actions.

No heuristic `technical/diagnostic` classification is added because the current supervised-work contract does not expose a canonical work kind for that distinction.

## Second adversarial review

Jev first suggested task splitting as a useful route, so the design was separated conceptually into:

1. information architecture: compact list + drawer;
2. bounded interactions: filter/search/copy/existing-route navigation.

Before execution, Jev guard review returned `allow` with high confidence for implementing both in one Web-only PR because they share the same projection and introduce no durable state or backend effect.

Rejected:

1. add a second work store to support UI convenience;
2. infer a technical-work category from title text;
3. create a durable `reviewed` flag just to hide completed items;
4. expose provider/model/runtime details in the normal drawer;
5. create `retry` without a canonical execution contract;
6. create related-work persistence merely for a follow-up button.

## Validation contract

The Web build must prove:

- bounded local filter type;
- local work search;
- bounded-height list;
- compact row action;
- detail dialog/drawer;
- original-request section;
- local copy action;
- continuation through existing Team route;
- explicit no-related-work-state copy;
- attention-required boundary still present;
- no known invented reviewed/archive/retry/unread state strings.

Expected marker:

```text
WANDORA_WEB_WORK_OPERATOR_DRAWER_V1_OK
```

## Effect boundary

This ADR authorizes code and CI only.

```text
production Web promotion = 0
Core change = 0
Paperclip change = 0
provider/model call = 0
customer work = 0
outbound = 0
migration = 0
```

Production promotion completed successfully.

Verified artifact:

```text
artifact id = 10850564498
artifact digest = sha256:a64cd31bc7401a9274eebaa41db9c5dbe5553a242143b1bf7dc93372286344fb
source_sha = 72ce1b29158e55cba1161132bc1c25e7c045cf0e
source_tree_sha = a24c7ee4de89bedaa0d748bfee73fde7302911c5
image = wandora/web:candidate-72ce1b29158e
host image id = sha256:d323407fb2fa6148a436218021a9557d92e85c0861b378a8cd92c633ca6efb19
```

Disposable preflight and post-promotion local-Traefik validation both returned 200 for `/healthz`, `/`, `/team`, `/work`, `/conversations`, `/approvals`, `/company`, and `/login`; unauthenticated `/api/v1/me` remained 401.

Live bundle marker validation passed for:
- work search;
- compact-row result action;
- detail drawer;
- original request section;
- copy-result action;
- clickable filtering;
- attention-required boundary.

Production runtime after promotion:

```text
wandora-web = wandora/web:candidate-72ce1b29158e
status = running
health = healthy
restart = 0
Core = unchanged / healthy
Paperclip = unchanged / healthy
Messaging Gateway = unchanged / healthy
```

Effect boundary:

```text
Web recreate = 1
Core recreate = 0
Paperclip recreate = 0
Messaging Gateway recreate = 0
customer work = 0
provider/model call = 0
outbound = 0
migration = 0
credential exposure = 0
```

ADR 0263 is now EXECUTED / GREEN / WEB ONLY.
