# ADR 0272 — Evidence-Backed Digital Employee Development Progress V1

Status: **IMPLEMENTED IN CODE / WEB PROJECTION ONLY / NO PRODUCTION EFFECT**  
Date: 2026-09-25

## Context

The customer wants a visible sense of how Ana is developing inside one company.

A generic "energy" or XP meter would be misleading. Time online, token count, number of model calls, raw task count or provider memory do not prove professional development.

Existing Wandora-owned durable evidence already exposes four observable milestones:

1. active employee responsibility;
2. active employee behavior;
3. active employee practice;
4. supervised work with a recorded result.

The first three come from the employee-development contract introduced by ADRs 0264–0267. The fourth comes from the existing Wandora customer-work projection.

## Decision

Expose **Desenvolvimento na empresa** as a derived, non-durable projection over four binary milestones:

```text
Papel            = at least one active responsibility
Comportamento    = at least one active behavior
Prática          = at least one active practice
Experiência      = at least one review-ready work item with a recorded result
```

Each completed milestone fills one of four equal visual segments.

For customer readability the UI may show:

```text
0/4 = 0%
1/4 = 25%
2/4 = 50%
3/4 = 75%
4/4 = 100%
```

The percentage is only a presentation of completed V1 milestones.

## What the metric does not mean

It does **not** measure:

- intelligence;
- model quality;
- performance;
- business outcome quality;
- trustworthiness;
- autonomy;
- seniority;
- learning consistency.

A recorded work result proves only that real supervised work experience exists. It does not prove that the outcome was approved or successful.

Autonomy remains a separate product contract and never changes automatically from this projection.

## Authority / Reuse Gate

This capability is a Wandora-owned customer semantic because it explains already-owned employee development and work evidence.

The V1 projection requires no new durable state.

Reused sources:

- Wandora employee-development entries;
- Wandora bounded customer-work projection.

No new:

- table;
- migration;
- score store;
- training engine;
- Paperclip Decision Training clone;
- Mastra memory;
- RAG/vector subsystem;
- provider lifecycle;
- autonomy state machine.

If a future version needs "learning applied successfully in work X", "correction incorporated", or consistency over time, that evidence is not currently represented by this V1 metric and requires a separate Capability Authority / Reuse Gate.

ADR 0168 remains preserved.

## Second adversarial review

Jev returned `allow`.

Accepted safeguards:

- progress is derived, not persisted;
- exactly four transparent milestones are shown;
- raw task count/token/time does not increase the score;
- result-recorded work is labelled only as experience;
- autonomy remains separate;
- no provider capability is internalized.

## Effect boundary

```text
production effect = 0
database change = 0
Core change = 0
Paperclip change = 0
Mastra change = 0
provider/model call = 0
customer work = 0
outbound = 0
```
