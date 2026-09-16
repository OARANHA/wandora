# ADR 0032 — Platform Admin Private Runtime V1

Status: Accepted architecture direction; implementation is the next Platform Admin slice.
Date: 2026-09-16

## Context

ADR 0015 established Wandora Platform Admin as a first-party owner/operator control plane, separate from customer administration and separate from native provider consoles.

ADR 0030 introduced an operator-only idempotent tenant-provisioning primitive. ADR 0031 introduced `wandora_platform_provisioner`, a least-privilege PostgreSQL login that can invoke only that primitive and is live with no password and `CONNECTION LIMIT 0`.

The next question is how to expose that capability to a Wandora-owned operator workflow without widening the normal customer Core runtime or making the browser a database client.

## First decision considered

Add a Platform Admin route to the existing Wandora Core process and let it use the existing Core database identity or a second pool inside the same process.

## Adversarial review

Rejected for V1.

The normal Core process is the tenant/customer business runtime. Co-locating a platform-wide provisioning credential in that process would increase the blast radius of a Core compromise and weaken the trust-plane separation deliberately created by ADR 0031.

A direct browser call to the private database function is also rejected. Supabase `service_role`, `postgres`, `supabase_admin` and raw provider consoles are not application credentials.

## Decision

Platform Admin Provisioning V1 will use a **separate private runtime/process** from customer Core.

The initial runtime is deliberately narrow. Its only product capability is the Wandora-owned operation:

```text
provision beta organization
```

It may call only:

```text
wandora_private.provision_beta_organization_v1(...)
```

through the dedicated `wandora_platform_provisioner` database identity.

## Runtime isolation

The Platform Admin runtime must:

- run as a separate container/process from `wandora-core`;
- publish no host port by default;
- use a dedicated Docker network path to PostgreSQL rather than inheriting customer Core networking implicitly;
- receive its database password only through an operator-controlled mounted secret file;
- never receive `service_role`, JWT signing secrets, Supabase admin credentials or provider credentials merely for provisioning;
- use a bounded database connection pool consistent with the separately activated role connection limit;
- have its own health/readiness contract;
- remain disabled/not deployed until its exact authentication and ingress contract are proven.

## Authentication boundary

Platform Admin authentication is distinct from tenant `owner`/`admin` authorization.

A tenant owner or tenant admin must never gain Platform Admin authority through organization membership alone.

V1 must authenticate an explicitly allow-listed Wandora platform operator identity before provisioning. The allow-list must be canonical/operator-owned and must not be inferred from customer memberships.

The exact identity source and token-validation implementation must reuse the proven Supabase ES256/JWKS trust contract where practical, but with an independent platform-operator authorization check.

No customer-facing API route is added by this ADR.

## API boundary

When implemented, the first reviewed operator action is one exact route equivalent to:

```text
POST /internal-or-operator/v1/organizations/provision
```

The exact path is intentionally not frozen until the ingress/auth implementation PR because route naming must match the selected private/operator ingress boundary.

The request contract must contain only the inputs already owned by ADR 0030:

- idempotency key;
- organization slug;
- organization display name;
- existing Supabase Auth subject;
- owner display name;
- initial digital employee display name.

The request cannot include:

- database/provider credentials;
- messaging provider binding;
- WhatsApp destination;
- arbitrary role/grant selection;
- autonomy escalation;
- outbound enable flags.

The response returns only canonical Wandora IDs/state required by the operator workflow.

## Database activation rule

Deploying runtime code is not sufficient to activate provisioning.

Activation requires a separate controlled step that:

1. creates a strong operator-controlled password outside Git;
2. mounts it into the Platform Admin runtime as a file;
3. raises `wandora_platform_provisioner` from `CONNECTION LIMIT 0` to the smallest bounded value required by the runtime;
4. proves readiness with no business mutation;
5. proves unauthorized requests fail before the provisioning function;
6. executes a disposable/non-production or explicitly authorized provisioning proof before normal beta use.

The role must remain at `CONNECTION LIMIT 0` until that activation review is complete.

## Provider and messaging boundary

Provisioning an organization does not provision WhatsApp or any provider connection.

Messaging connection creation, Evolution instance binding and provider credentials remain a separate later Platform Admin vertical with its own rollback and isolation semantics.

This preserves ADR 0029's single-target outbound policy and avoids making organization creation depend on provider state.

## Audit direction

The V1 runtime must produce operator-visible audit evidence for provisioning attempts without storing secrets or personal provider data in logs.

The initial audit contract should capture at least:

- operator identity;
- idempotency key or safe correlation identifier;
- requested organization slug;
- success/conflict/failure outcome;
- resulting canonical organization ID on success;
- timestamp/correlation ID.

The durable audit representation must be defined before normal beta activation; application logs alone are not the final audit source of truth.

## Validation requirements

Before any live activation, CI/disposable verification must prove:

1. runtime is a separate image/process from customer Core;
2. runtime has no public host port in its default Compose shape;
3. secret is file-mounted and not present as a Compose environment value;
4. runtime accepts only the dedicated DB role;
5. role still has no direct table privileges;
6. exact operator auth boundary denies ordinary tenant owners/admins;
7. malformed or widened provisioning bodies fail before DB effect;
8. duplicate idempotency key replay is stable;
9. conflicting replay fails closed;
10. no messaging/provider/outbound state is created;
11. health/readiness do not mutate business state;
12. customer Core/Web routes remain unchanged.

## Non-goals

- building the complete Platform Admin UI;
- general platform-wide database access;
- exposing native provider consoles through Platform Admin;
- customer self-service tenant creation;
- creating Supabase `auth.users`;
- messaging/provider onboarding;
- billing/plan management;
- model/provider administration;
- autonomous employee behavior.

## Next implementation slice

Implement only the private Platform Admin runtime skeleton plus authentication/config/readiness boundaries needed to safely hold the dedicated provisioning credential.

Do **not** activate the live `wandora_platform_provisioner` password/connection limit in the same change that first introduces the runtime skeleton.
