# ADR 0004 — Supabase self-hosted as Wandora data/auth foundation

Status: **Accepted for laboratory and early beta foundation**

Date: 2026-09-13

## Context

Wandora needs a durable canonical data platform, customer authentication, an operator-friendly SQL/admin surface and a path to social login without making those infrastructure concerns the product itself.

The current VPS has sufficient headroom for the laboratory phase: approximately 11 GiB RAM, low baseline utilization and ample disk. A dedicated data-plane VPS is desirable later, but waiting for it would delay product validation without changing the intended public contracts.

## Decision

Wandora will use a dedicated **Supabase self-hosted deployment** as its initial data/auth platform.

Initial responsibilities:

- PostgreSQL as canonical structured storage;
- Supabase Auth for customer identity/session handling;
- Studio for controlled operator administration and SQL access;
- Storage where Wandora needs managed object storage;
- Realtime where product value justifies it;
- Supavisor/pooling where connection patterns require it.

Supabase is infrastructure behind Wandora. It does not own Wandora domain semantics, billing, tenancy policy, autonomy policy, digital-employee behavior or public business contracts.

## Deployment placement

The first deployment may run on the **current Wandora VPS** to accelerate the laboratory and early beta phases.

The deployment must be migration-ready so it can later move to a dedicated data-plane VPS without forcing application contract changes.

Stable hostnames are therefore part of the boundary:

- `supabase.wandora.com.br` — application-facing Supabase endpoint;
- `studio.wandora.com.br` — administrative Studio surface.

A future VPS migration should primarily require moving state/services and changing DNS/ingress, not changing application code contracts.

## Security constraints

- PostgreSQL must not be exposed directly to the public Internet.
- Studio is an administrative surface and must be protected with strong access control; Cloudflare Access is preferred in addition to Supabase-side protection.
- Service-role/secret keys are server-side credentials only.
- Real secrets never enter Git.
- Authentication callbacks and redirect allow-lists must be explicit.
- SMTP must be configured before relying on production email confirmation, password reset, magic-link or invitation flows.
- Backups are incomplete until restore has been tested.

## Authentication model

Supabase Auth is the identity/session layer, not the authorization model for all Wandora business behavior.

Wandora Core remains responsible for organization membership, roles, plans, permissions, autonomy and business-policy checks.

Email/password may be used first. Google and other supported social/OIDC providers may be added later behind the same stable Wandora/Supabase hostname.

## Multi-tenant model

The Wandora Supabase deployment is **per product/bounded context**, not per Wandora customer.

Wandora customers share the product deployment under an explicit multi-tenant data model with organization/tenant identifiers and RLS/authorization boundaries where appropriate.

Unrelated products should not share this same Supabase project simply because they run on the same infrastructure.

## Operational model

- Compose/stack definitions are versioned in the Wandora repository.
- Portainer may operate/observe the deployment but is not the source of truth.
- Persistent database and storage state must have documented backup/restore procedures.
- Optional heavy components should not be enabled merely because they exist; enable them when product/operational value justifies their resource cost.

## Consequences

Benefits:

- fast path to PostgreSQL + Auth + Studio;
- convenient controlled SQL administration;
- future social login support;
- one canonical data foundation for the first Wandora vertical slices;
- stable hostname contracts make later VPS separation easier.

Costs/risks:

- the current VPS temporarily concentrates application and data-plane failure domains;
- Supabase self-hosting adds several containers and operational responsibility;
- resource consumption must be monitored as Mastra, Evolution and Wandora workloads grow;
- backup, restore and upgrades become our responsibility.

## Exit / migration trigger

Move Supabase to a dedicated data-plane VPS when sustained resource use, customer criticality, maintenance isolation or blast-radius reduction justifies it. The move must preserve the stable application-facing hostname whenever practical.
