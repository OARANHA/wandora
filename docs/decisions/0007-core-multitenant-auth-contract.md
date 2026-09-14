# ADR 0007 — Wandora Core multi-tenant and auth contract V1

Date: 2026-09-13
Status: **Accepted for the initial Wandora Core contract; live production migration remains a separate deployment step**

## Context

Wandora now has validated infrastructure boundaries for Supabase, Mastra and the Evolution-backed Messaging Gateway. The next architectural risk is tenant identity and authorization: customer-facing semantics must not depend on Supabase Auth subjects, Paperclip IDs, Evolution instance names or any other provider-specific identifier.

The product also needs a model that a human business owner can understand. A person should see their company, team, connected tools and digital employees — not provider IDs, JWT subjects, RLS rules or integration internals.

## Decision

Wandora Core owns canonical company, human-user, membership and messaging-connection identity.

The initial canonical entities are:

- `organization` — the Wandora company/tenant;
- `user` — the canonical Wandora human user;
- `user_identity` — mapping from an external identity provider subject to a Wandora user;
- `membership` — a user's relationship to an organization;
- `messaging_connection` — a provider-neutral messaging connection owned by exactly one organization.

Provider bindings for messaging live in a private/internal schema and never become customer-facing contracts.

## Authentication mapping

Supabase Auth remains the current identity/session provider. Its JWT `sub` is mapped through `user_identities` to a canonical Wandora `user.id`.

A Supabase Auth subject is therefore an authentication identifier, not the Wandora user identifier used by business logic or audit events.

This preserves the ability to replace or supplement identity infrastructure without changing Wandora business IDs.

## Initial human roles

V1 deliberately limits organization roles to:

- `owner` — company governance authority;
- `admin` — delegated operational administration;
- `member` — normal human teammate.

Membership role is not a universal permission system. Domain capabilities, employee tools, billing actions, sensitive operations and human approvals remain explicit Wandora Core policy decisions.

In particular, tenant-scoped access to a messaging connection does not by itself authorize arbitrary message sending.

## Tenant isolation

Tenant isolation is layered:

1. Wandora Core performs business authorization;
2. tenant-owned records carry a canonical `organization_id`;
3. PostgreSQL RLS provides defense in depth for authenticated reads;
4. suspended organization memberships lose access;
5. provider bindings remain outside the authenticated-readable schema;
6. knowing another organization's UUID is never sufficient to resolve or use its messaging connection.

The V1 verifier proves the boundary with two organizations and multiple users on a disposable Supabase PostgreSQL 17.6.1.136 container.

## Audit identity

Future audit-facing actions must use Wandora-owned identifiers:

- `organization_id` — canonical Wandora organization;
- `actor_type` — human, digital employee or system;
- `actor_id` — the canonical Wandora ID for that actor.

Supabase Auth subjects, Evolution instance IDs, Mastra run IDs and other provider identifiers are not audit actor IDs.

## Evidence

The contract spike proves:

- one Supabase Auth subject maps to one canonical Wandora user;
- owner/admin/member role resolution is organization-scoped;
- a member of organization A cannot read organization B through RLS;
- a member of organization A cannot resolve organization B's messaging connection even when the foreign connection UUID is known;
- a suspended membership loses tenant access;
- an unknown auth subject receives no tenant visibility;
- provider messaging bindings are not readable by the authenticated role;
- the complete verifier passes against a disposable container using `supabase/postgres:17.6.1.136`;
- the live Wandora Supabase database is not modified by the validation.

## Consequences

Positive:

- customer-facing IDs and semantics are now independent from infrastructure providers;
- future UI can use simple business concepts such as Company, Team and Connected WhatsApp;
- tenant isolation has a falsifiable database-level proof;
- the Messaging Gateway can now bind a canonical Wandora connection to any provider internally;
- the first digital employee can be designed without reopening foundational tenant/auth questions.

Trade-offs / follow-up:

- the validated schema is still a contract artifact, not yet a production migration;
- invitation/provisioning flows are intentionally not designed here;
- billing, plan permissions and granular domain capabilities remain later policy work;
- digital-employee identity will receive its own canonical entity in the first employee/workflow slice;
- production rollout must promote the accepted contract into reviewed migrations and Core service code rather than applying the spike file ad hoc.

## Next step

Define the **first digital-employee role and its smallest end-to-end business workflow**, using the accepted Core identity/tenant contract, Mastra runtime boundary and Messaging Gateway.

The workflow must be designed from the human operator/customer experience first: clear responsibility, observable work, explicit approval where needed, and minimal technical language.
