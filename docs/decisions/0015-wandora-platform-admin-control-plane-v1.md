# ADR 0015 — Wandora Platform Admin Control Plane V1

Date: 2026-09-15
Status: **Accepted product/architecture direction; implementation will be incremental.**

## Context

Wandora now depends on several internal technologies with useful native consoles: Mastra for Agent Runtime, Paperclip as the organization/control-plane candidate, Evolution for WhatsApp transport, Supabase for data/auth infrastructure, and Portainer/Docker for runtime operations.

Those consoles are valuable for engineering, diagnostics and emergency recovery, but making the Wandora owner/operator depend on them for normal platform administration would leak implementation details into the product operating model, create fragmented authorization, and make future provider replacement unnecessarily expensive.

The customer-facing product already follows the opposite principle: a customer sees company, employees, work, conversations, approvals and outcomes rather than Mastra, Evolution, Supabase or provider IDs. The Wandora owner/operator needs the same abstraction at platform scope.

## Decision

Wandora will have a first-party **Platform Admin** control plane for normal owner/operator administration of the SaaS.

The Platform Admin is a Wandora product surface. It must operate through Wandora-owned Core/operator APIs and adapter contracts rather than treating third-party consoles as the primary administration surface.

Native provider/infrastructure consoles remain available as protected engineering, diagnostics and emergency tools. They are not removed, but they are not the normal source of operational truth or the required daily workflow.

## Two administration planes

Wandora distinguishes:

1. **Customer administration** — tenant-scoped administration inside the normal Wandora product, such as the customer's company, people, employees, work, conversations, approvals, tools/connections and plan.
2. **Platform administration** — Wandora-owner/operator scope across tenants and platform capabilities.

A customer administrator must never gain platform-wide visibility merely because they are an `owner` or `admin` of one organization.

## Intended Platform Admin scope

Capabilities may be delivered incrementally, but the target control plane includes Wandora-owned views/actions for:

- organizations/tenants, lifecycle and support status;
- human users, memberships and access state;
- digital employees, responsibilities, status and autonomy;
- employee instructions/prompts and version history when those become canonical product configuration;
- employee workflows, tools and allowed capabilities;
- model/provider selection and cost/usage visibility;
- messaging connections and provider-neutral health;
- work, conversations, supervision and approval state;
- traces/execution diagnostics represented through Wandora-owned observability contracts;
- plans, limits, billing-support state and usage;
- audit/security events;
- service health and operational incidents;
- controlled enable/disable/suspend/recovery actions.

This list is a product direction, not permission to expose raw provider schemas or implement all surfaces immediately.

## Provider console boundary

Examples of native consoles and their role:

- **Mastra Studio** — deep Agent Runtime inspection, workflow/prompt experimentation, traces and engineering diagnostics;
- **Paperclip UI** — organization/control-plane research, diagnostics and future coordination internals;
- **Evolution Manager** — provider-specific WhatsApp diagnostics/recovery;
- **Supabase Studio** — database/auth/operator diagnostics;
- **Portainer** — container/runtime operator diagnostics.

These surfaces must remain strongly protected and operator-only. A customer must not need them. Normal Wandora platform operations should progressively move into Platform Admin when a stable Wandora-owned contract exists.

## Source-of-truth rules

Platform Admin does not make native consoles authoritative.

- Git remains infrastructure/source-of-truth for versioned deployment configuration.
- Wandora Core and canonical PostgreSQL state remain authoritative for business semantics.
- Provider configuration stays behind adapters and private bindings.
- Sensitive credentials remain outside Git and are never displayed merely because Platform Admin can operate the related capability.
- A prompt/workflow/configuration becomes a Platform Admin feature only after its Wandora-owned contract, authorization, versioning and rollback semantics are defined.

## Architecture

```text
Customer Admin                      Wandora Platform Admin
      |                                     |
      +---------------+---------------------+
                      v
                Wandora Core/API
                      |
       +--------------+---------------+----------------+
       |              |               |                |
       v              v               v                v
 Organization      Agent Runtime    Messaging        Data/Auth
   Adapter            Adapter        Gateway          Boundary
       |              |               |                |
   Paperclip        Mastra       Evolution/Meta     Supabase

Native consoles remain protected engineering/diagnostic surfaces.
```

## Product principle

The operating vocabulary is Wandora vocabulary.

The owner/operator should normally think in terms such as company, employee, responsibility, autonomy, conversation, work, approval, connection, model, cost, health and incident — not provider instance IDs, Mastra runtime objects, database internals or container names.

## Sequencing

This ADR does **not** move Platform Admin ahead of the current critical product loop.

The immediate priority remains making the existing customer Web consume real tenant-authorized Core state and proving the complete supervised proposal/review/action journey for the first digital employee.

Platform Admin should then be built in vertical slices around capabilities that already have stable Wandora-owned contracts. It must not become a generic infrastructure dashboard built ahead of proven product needs.

Mastra Studio or another native console may be exposed to the Wandora operator earlier when it materially improves engineering/diagnostics, but that does not replace the Platform Admin direction.

## Consequences

Positive:

- normal platform operation becomes provider-neutral and consistent;
- replacing Mastra, Evolution, Supabase internals or other infrastructure does not require redesigning the operator's mental model;
- customer and platform authorization can remain explicit and separate;
- support and operations become easier to standardize and audit;
- the Wandora owner can eventually operate the SaaS from one coherent cockpit.

Trade-offs:

- some low-level operations will initially still require native consoles until a stable Wandora-owned abstraction exists;
- building first-party controls costs more than exposing provider UIs directly;
- observability, prompt/workflow management and infrastructure health each need deliberate contracts before they become Platform Admin features.

## Non-goals

- removing access to native engineering consoles;
- rebuilding every feature of Supabase Studio, Mastra Studio, Evolution Manager or Portainer;
- exposing raw provider schemas to customers;
- making Platform Admin the infrastructure source of truth instead of Git;
- implementing the entire Platform Admin before the first customer-visible supervised employee loop is real.
