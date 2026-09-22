# ADR 0166 — Customer Conversations Surface Canonicalization V1

Status: **ACCEPTED / IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**
Date: 2026-09-22

## Context

ADR 0162 adopted the owner-approved customer-panel prototype as the canonical customer-facing design direction.

ADRs 0020 and 0021 already established live, tenant-authorized, provider-neutral conversation reads:

- conversation list;
- bounded recent conversation history;
- inbound/outbound direction;
- canonical contact label;
- associated digital employee when present;
- explicit truncation when earlier messages exist.

The existing Conversas page was already real-data-backed, but visually remained from the earlier product shell.

## REAL NOW entering the slice

Canonical base:

```text
main = 5364c0cf4fb403a105b57404165f7642ecfe20a7
ADR 0165 = canonical customer Web production promotion GREEN
open PRs = 0
post-merge Web/Core/Platform Admin/Messaging Gateway CI = GREEN
```

Existing production conversation authority remains ADR 0020/0021.

## Capability Authority / Reuse Gate

No backend capability is missing for visual canonicalization.

Existing authority already provides:

- tenant-authorized conversation list;
- canonical contact labels;
- conversation open/closed status;
- latest canonical message;
- associated employee when present;
- up to the latest 100 canonical messages;
- inbound/outbound direction;
- `hasEarlierMessages`.

This slice must not create:

- unread/read state;
- live presence;
- typing indicators;
- takeover/assignment mutation;
- reply/send/edit-send/dismiss;
- provider metadata;
- a new conversation store;
- a second messaging authority.

Messaging transport remains behind the existing Wandora Messaging Gateway boundary.

## Decision

Port the approved Conversas product language and visual system into the existing React/Vite/TanStack Web while preserving the existing read-only contracts.

The canonicalized surface:

- uses the cream/black/lime/yellow Wandora customer design system;
- preserves local search over already-returned canonical data;
- shows real contact label, conversation status and associated employee;
- opens the already-live canonical recent history;
- distinguishes inbound/outbound without inventing sender identity;
- keeps `hasEarlierMessages` explicit so a bounded window is never presented as complete history;
- labels the surface as `somente leitura`;
- contains no response composer or external-effect action.

The UI explicitly avoids claims such as:

- online/available presence;
- typing state;
- unread counts;
- takeover ownership;
- autonomous response capability.

## Bounded-history semantics

ADR 0020 returns at most 100 conversations ordered by canonical activity.

ADR 0021 returns at most 100 recent canonical messages and exposes `hasEarlierMessages`.

The new UI therefore does not label list counts as total company volume and keeps the bounded-history warning visible whenever required.

## Second adversarial review

Rejected:

1. adding a reply composer merely because the prototype shows a conversational workspace;
2. treating an outbound historical message as proof that current outbound is enabled;
3. showing `online`, `digitando` or unread state without canonical telemetry/state;
4. exposing provider/channel-specific identifiers or interfaces;
5. introducing takeover/assignment semantics without an accepted human action contract;
6. replacing canonical Core reads with a provider-native conversation UI.

Provider leakage scan on the page remained negative.

The only occurrence of “assumir uma conversa” is explanatory copy stating that this action remains unavailable.

## Validation

Implementation head:

```text
Web CI               = GREEN
Core CI              = GREEN
Platform Admin CI    = GREEN
Messaging Gateway CI = GREEN
```

The existing Web bridge verifier remained unchanged and GREEN.

No migration, backend change, runtime mutation, outbound action or production deployment occurred in this slice.

## Decision

**Customer Conversations Surface Canonicalization V1 is accepted as a code foundation.**

The new surface must not be described as production-active until a separately reviewed Web promotion is executed.

## Next axis

After this merge:

1. either promote the reviewed Web image through the existing bounded Web-only production promotion contract;
2. then begin **Empresa / Regras da casa Capability Authority Review V1** for grounding.

Grounding remains the higher-priority capability gap before broader autonomous outbound behavior.
