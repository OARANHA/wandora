# ADR 0008 — Human-centered Wandora Web product shell

Date: 2026-09-14
Status: **Accepted for the initial customer web shell**

## Context

The technical foundation can only become a useful SaaS if a paying company can understand, operate and trust it without learning agent-runtime or provider terminology. Wandora therefore needs a customer shell before expanding the first digital-employee workflow.

The shell must remain compatible with the existing Wandora Core boundary, be independently deployable, support typed navigation and server-state handling, and preserve freedom to build a distinct visual identity.

## Decision

Use React 19 with Vite for the initial authenticated Wandora Web application.

Use TanStack Router for typed client navigation and TanStack Query for Wandora Core server state. TanStack Table/Form may be added when a concrete screen requires them; they are not mandatory dependencies for decorative reasons.

Use Tailwind CSS as the styling foundation and Wandora-owned components/design tokens. Headless accessible primitives such as Base UI/shadcn may be adopted where they improve accessibility and interaction quality without imposing a third-party visual identity.

TanStack Start is intentionally deferred while the current product is an authenticated SPA over Wandora Core. Re-evaluate it only when SSR/server functions create a concrete product or operational benefit.

Production packaging uses a multi-stage Docker build: pinned Node 22 for compilation and a minimal pinned Nginx runtime serving immutable assets with SPA fallback. The browser never calls Paperclip, Mastra or Evolution directly.

## Customer-language boundary

Normal customer navigation is centered on `Início`, `Equipe`, `Trabalho`, `Conversas`, `Aprovações` and `Empresa`.

The product should expose responsibilities, work, approvals, training, company knowledge and outcomes. Runtime/provider vocabulary stays in operator/developer surfaces.

The default onboarding target is same-day useful work in supervised mode. Assisted implementation may exist as a paid service, but a multi-day manual setup dependency is not the default product model.

## Evidence

The first shell compiles with strict TypeScript on Node 22, builds with Vite 8, and packages into a digest-pinned Docker image with a pinned Nginx runtime.

Container smoke verification proves `/healthz` and all current customer routes (`/`, `/team`, `/work`, `/conversations`, `/approvals`, `/company`) return successfully with SPA fallback intact.

Chromium browser verification was run at 390 px and 1440 px viewports across all six routes. The shell produced no browser-console errors and no horizontal document overflow. Desktop and mobile screenshots were reviewed after the customer-copy and mobile-navigation refinements.

## Consequences

- customer experience can evolve without exposing infrastructure details;
- web deploys are versioned, reversible and independent from the host Node installation;
- a future switch to SSR or another rendering model remains possible behind the same `app.wandora.com.br` contract;
- the visual quality depends on the Wandora design system, not on TanStack itself;
- future feature slices must pass the human-experience gate before broad implementation.

## Next step

Freeze the paying-customer first-day journey — create/join company, state the business outcome, hire the first digital employee, connect only required tools, provide essential company context, start supervised work — before implementing the employee's production workflow.
