# ADR 0030 — Private Tenant Provisioning V1

Status: Accepted
Date: 2026-09-16

## Context

The customer product already has real authentication, canonical tenant membership, Ana supervised work, conversations and a proven human-supervised outbound path. What is still missing is one canonical, repeatable way to create the minimum business state for a new beta company.

Today those records can be assembled manually, which is too error-prone to become the operating model for beta onboarding.

## First decision considered

Build customer self-service onboarding and OAuth/password recovery first.

## Adversarial review

Rejected for this slice.

Self-service UI does not solve the harder invariant: creating a new organization, first owner and initial digital employee exactly once without cross-tenant drift. It would risk putting a polished UI in front of an unreviewed provisioning path.

Creating Supabase `auth.users` inside Wandora provisioning is also rejected. Identity administration and canonical business state remain separate boundaries.

## Decision

Private Tenant Provisioning V1 is an operator-only database boundary that provisions only Wandora canonical business state.

Inputs:

- idempotency key;
- organization slug;
- organization display name;
- already-provisioned Supabase subject (`sub`);
- owner display name;
- initial digital employee display name, defaulting to `Ana`.

Atomic result:

1. create exactly one active `wandora.organizations` row;
2. reuse an existing canonical Wandora user already mapped to the Supabase subject, or create one if no mapping exists;
3. create the Supabase identity mapping when a new canonical user is required;
4. create active `owner` membership for the new organization;
5. create one active supervised `commercial-assistant` digital employee;
6. persist private idempotency evidence;
7. return canonical organization/user/employee IDs.

## Idempotency

The same idempotency key with the same normalized payload returns the original canonical IDs and creates nothing new.

The same key with different payload fails closed with `wandora_provisioning_idempotency_conflict`.

A new request attempting to reuse an already-existing organization slug fails with `wandora_provisioning_slug_conflict` rather than silently adopting or mutating that organization.

Concurrent calls for the same key are serialized by a transaction-scoped advisory lock.

## Security boundary

The function lives in `wandora_private` and is not granted to:

- `PUBLIC`;
- `authenticated`;
- `wandora_core_runtime`.

It is an operator/platform provisioning primitive, not a customer API and not a Core runtime capability.

The provisioner does not:

- create or modify `auth.users`;
- create a messaging connection;
- create a provider binding;
- store provider credentials;
- enable outbound;
- create contacts/conversations/work;
- grant Platform Admin authority.

## Identity rule

V1 accepts only the provider namespace `supabase` and an already-known subject value supplied by the operator workflow. Existence/lifecycle of that Auth identity remains a Supabase Auth concern.

If the subject is already mapped to a canonical Wandora user, that user is reused; its display name is not silently overwritten.

This preserves legitimate multi-organization ownership by one human without duplicating canonical users.

## Why messaging is excluded

WhatsApp/provider onboarding has a separate trust boundary involving provider bindings, Evolution instance state and credentials. Coupling it to tenant creation would make provisioning non-atomic across systems and would violate the currently proven single-target Gateway policy in ADR 0029.

Tenant provisioning must succeed independently of channel onboarding.

## Validation requirements

Disposable PostgreSQL verification must prove:

1. first call creates organization + user identity + owner membership + Ana;
2. exact replay returns the same IDs with unchanged row counts;
3. same key + changed payload fails;
4. different key + same organization slug fails;
5. existing canonical user mapped to the same Supabase subject is reused for a second organization;
6. no duplicate canonical user is created in the reuse case;
7. provisioned owner membership is active/owner;
8. provisioned employee is active/supervised/commercial-assistant;
9. direct execution remains unavailable to `authenticated` and `wandora_core_runtime`;
10. applying the migration twice is idempotent.

## Next boundary

After this primitive is proven, Platform Admin or an operator API may wrap it. Customer self-service onboarding must not call this private function directly from the browser.
