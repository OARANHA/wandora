# ADR 0188 — Web Business Density + Company Reference Fidelity V1

Status: **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**
Date: 2026-09-22

## Context

ADR 0186/0187 established the approved Wandora type families and app shell, but production review showed the display scale was too dominant for the intended customer experience.

The owner explicitly re-established the second supplied Company / Regras da Casa reference as the target for visual density and business readability.

The product requirement is not “make typography smaller” in isolation. The interface must read like a business operating manual: rules first, concise cards, clear teaching flow, optional technical provenance, and no customer-facing technology jargon.

## REAL NOW

Implementation base:

```text
main = 46d27e59531ab876857468a54fbc201d72665ff8
open PRs = 0
```

Production remains on the ADR 0187 Web artifact during this code-only slice.

## Capability Authority / Reuse Gate

No new capability or durable state is introduced.

This slice changes only customer Web composition and presentation. Existing grounding contracts remain authoritative:

- fact / rule classification;
- owner_statement / approved_source / approved_correction provenance;
- sourceRef / sourceLabel evidence;
- correction history;
- owner/admin mutation authorization;
- active-member read authorization.

No database, migration, provider capability, workflow, memory, retrieval, RAG, state machine or outbound authority changes.

## Decision

The second Company mockup becomes the scale/density reference.

### Global hero density

Customer hero titles on Início, Equipe, Conversas and Empresa are capped around 4rem instead of the previous 6–6.7rem range.

Dela Gothic One remains the display font, but is an accent rather than the dominant reading surface.

### Empresa composition

The page now follows this order:

1. compact “As regras da sua casa” header;
2. Regras da Casa first, in compact two-column cards;
3. “Ensinar à equipe” black teaching panel;
4. “Como funciona” lime explanation panel;
5. confirmed company facts;
6. retired-history section when real history exists.

The form keeps both semantic choices:

- Sobre a empresa → fact;
- Regra de trabalho → rule.

Evidence/source fields remain available but are collapsed behind “Adicionar fonte ou documento (opcional)” so normal owners do not need to reason about provenance jargon.

### Truth rule

The visual reference contains demo people, tool cards, timestamps and activity history. None of those are copied into production unless supported by an accepted REAL/DERIVÁVEL contract.

No fake WhatsApp, agenda, spreadsheet, human teammate, “há 3 semanas”, customer or correction-origin claims are introduced.

## Second adversarial review

Validated:

- no API route changes;
- no auth changes;
- no grounding semantic changes;
- no provider names exposed;
- no demo business data copied;
- optional source evidence remains present;
- owner/admin mutation gates remain unchanged;
- page titles are limited to the new density scale.

## Validation

Production-shaped Web Docker build is GREEN.

Existing gates remain GREEN and a new gate reports:

```text
WANDORA_WEB_BUSINESS_DENSITY_V1_OK
```

The new gate proves:

- oversized 6–6.7rem customer heroes are absent from the reviewed pages;
- Company reference heading is present;
- teach/how-it-works layout is present;
- rules use a two-column grid;
- known demo-state labels are absent.

## Production boundary

This ADR is **CODE ONLY / NO PRODUCTION EFFECT**.

No Web deployment, grounding mutation, model call, work/run/session, provider mutation or external message is part of this decision.

A later Web-only artifact qualification/promotion may make this visual refinement live.