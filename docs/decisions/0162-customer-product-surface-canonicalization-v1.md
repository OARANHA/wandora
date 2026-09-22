# ADR 0162 — Customer Product Surface Canonicalization V1

Status: **ACCEPTED / IMPLEMENTATION FOUNDATION**
Date: 2026-09-22

## Context

After ADR 0161 proved the second legitimate MEDICSPRO customer-work execution end to end, the next bottleneck is no longer basic employee execution. It is the customer-facing product surface.

The owner supplied and approved a complete Wandora customer-panel prototype with six primary surfaces:

- Início
- Equipe
- Trabalho
- Conversas
- Aprovações
- Empresa

The prototype establishes a coherent Wandora-owned vocabulary and visual language: business-first copy, one shared human/digital team, work and decisions expressed in customer terms, and no exposure of Paperclip, Mastra, Mistral, Supabase or provider identifiers.

The prototype also explicitly marks its names, times and business metrics as demonstration data. Therefore visual adoption must not promote fictitious state into production truth.

## Capability Authority / Reuse Gate

This slice does **not** add a new backend capability.

Existing authorities are preserved:

- Wandora Web owns customer presentation and customer vocabulary.
- Wandora Core owns customer authorization/contracts and Wandora-owned projections.
- Paperclip remains the digital-employee control-plane authority behind Organization Adapter.
- Mastra remains execution implementation behind Agent Runtime Adapter.
- Messaging transport remains behind Messaging Gateway.
- Existing authenticated customer reads remain the source for the first real surface.

No new table, workflow engine, approval model, pipeline model, knowledge store or integration registry is authorized by this ADR.

## Decision

Adopt the approved prototype as the **canonical design direction** for Wandora customer-facing product surfaces.

The following are canonical and may be ported broadly:

- navigation structure;
- layout hierarchy;
- cream/black/lime/yellow/cobalt visual language;
- thick borders and hard-shadow interaction language;
- customer vocabulary;
- page composition;
- concepts such as `Equipe`, `Trabalho`, `Conversas`, `Aprovações`, `Empresa`, `Precisa de você` and `Regras da casa`.

The following are **not** canonical facts merely because they appear in the prototype:

- customer names;
- monetary values;
- counts and performance metrics;
- connected-tool status;
- commercial pipeline stages;
- approval items;
- learned rules/training history;
- human teammates;
- outbound activity;
- business claims.

Production UI must classify each block as:

```text
REAL       = directly supported by an existing authenticated contract/state
DERIVABLE  = safely computed from REAL state without inventing semantics
FUTURE     = requires a separately reviewed capability/contract
```

FUTURE content must be hidden, neutralized or explicitly unavailable. It must never be populated with demonstration values in the live customer product.

## First implementation slice

The first implementation slice is deliberately narrow:

1. port the approved visual tokens and customer shell into the existing React/Vite/TanStack application;
2. preserve all existing auth/session/organization-selection behavior;
3. replace the fictitious current dashboard with a real-state-only Início;
4. reuse only:
   - authenticated digital-employee read;
   - authenticated digital-employee customer-work read;
5. introduce no backend capability and no production effect.

The Início may derive only:

- number of digital employees;
- active employee count;
- number of customer-work items returned by the existing contract;
- number of items in `review-ready`;
- latest returned work item/result.

It must not invent approval counts, revenue, conversation counts, opportunities, meeting counts, outbound state or tool connectivity.

## Second adversarial review

The alternative of porting all prototype pages in one change was rejected because it would mix three different concerns:

- visual canonicalization;
- existing real contracts;
- future capability design.

That would make it too easy for fictitious approval, pipeline, grounding or tool-state concepts to become accidental production contracts.

The alternative of replacing the existing Web stack with the prototype's Next.js runtime was also rejected. The accepted React + Vite + TanStack architecture already supplies the needed product runtime. The prototype contributes design, vocabulary and interaction composition, not a replacement application architecture.

## Validation

The initial branch passed existing Web CI without weakening any verifier. Core, Messaging Gateway and Platform Admin checks also remained GREEN.

No migration, deployment, outbound activation, lifecycle mutation or customer effect is part of this ADR.

## Next slices

After this foundation merges, continue page-by-page:

1. Equipe canonicalization against the existing employee/work contracts;
2. customer-work result presentation, including safe rich-text rendering;
3. Conversas canonicalization against existing conversation reads;
4. Empresa / `Regras da casa` capability-authority review for grounding;
5. Aprovações authority/reuse review before any canonical approval queue is designed;
6. Trabalho pipeline semantics only if a real business-work capability justifies them.

Grounding must be addressed before expanding autonomous outbound behavior.
