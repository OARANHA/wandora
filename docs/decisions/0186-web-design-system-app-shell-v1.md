# ADR 0186 — Web Design System + App Shell V1

Status: **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**
Date: 2026-09-22

## Context

The owner approved the next visual-system step for the customer product:

- Dela Gothic One 400 for display/brand/large headlines;
- Space Grotesk Variable for body/interface text;
- JetBrains Mono Variable for labels, eyebrows, badges and operational metadata;
- a collapsible desktop sidebar;
- a dedicated power-style sign-out control;
- the existing cream / black / lime / yellow Wandora visual language.

The supplied design references are visual direction only. Demo people, activity, tool states, timestamps and commercial claims from those references are not product truth.

## REAL NOW

Implementation base was main a167424d5950c2aa8069171a38ef4938e9fac00c with zero open PRs. Production remains on the ADR 0185 Core/Web state; this slice does not change production.

## Capability Authority / Reuse Gate

No new product capability or backend state is required. The slice reuses the existing React + Vite + TanStack Web runtime, customer routes, active-organization selector and AuthProvider.signOut() path.

The only new persistence is the optional browser-local visual preference named wandora.ui.sidebar-collapsed. It is presentation state only, not tenant/business/auth state.

No table, migration, service, provider subsystem, RAG, memory, retrieval, workflow or operational authority is added.

## Decision

Typography is bundled into the immutable Web artifact, not loaded from a runtime CDN:

- Display: Dela Gothic One 400
- Body: Space Grotesk Variable
- Mono: JetBrains Mono Variable

Pinned direct packages:

- @fontsource/dela-gothic-one 5.3.0
- @fontsource-variable/space-grotesk 5.3.0
- @fontsource-variable/jetbrains-mono 5.3.0

Dela Gothic One is restricted to latin + latin-ext subsets after adversarial review.

Global CSS now exposes reusable display/body/mono font tokens plus border, radius and sidebar-size tokens. Existing wandora-display and wandora-mono utilities resolve to the approved families.

Desktop sidebar keeps one canonical navigation definition and supports:

- expanded = 250px
- collapsed = 82px

All six customer routes remain reachable: Início, Equipe, Trabalho, Conversas, Aprovações and Empresa.

The new power-style Sair control calls the already-existing AuthProvider.signOut() implementation; no second logout/auth mechanism is created.

Mobile uses the same route authority through a compact quick bar plus a complete route menu.

## Second adversarial review

The implementation was challenged against duplicate navigation, loss of routes, copied demo data, duplicate auth/logout, business-state leakage into localStorage, runtime font CDN dependency, API/auth/grounding drift and unnecessary font payload.

Results:

- one nav definition remains authoritative;
- all six routes remain present;
- no demo business data was introduced;
- logout reuses signOut();
- sidebar preference is optional browser-local presentation state;
- fonts are artifact-bundled;
- no API/auth/grounding contract changed;
- Dela Gothic One was reduced to required latin subsets.

## Validation

Production-shaped Web Docker build is GREEN.

All existing Web gates remain GREEN and the new gate reports:

WANDORA_WEB_APP_SHELL_DESIGN_SYSTEM_V1_OK

The new gate proves the six routes, collapse/expand control, browser-local preference, real signOut path, pinned fonts and global typography tokens.

After font subset optimization, the production build emitted approximately:

- CSS 44.77 kB
- JS 477.13 kB

## Production boundary

This ADR is CODE ONLY / NO PRODUCTION EFFECT.

It does not deploy Web, recreate Core/Paperclip/Gateway, create grounding, call a model, create work/run/session/provider effects, enable outbound, or send an external message.

A later separately reviewed Web artifact qualification/promotion may make the shell live.
