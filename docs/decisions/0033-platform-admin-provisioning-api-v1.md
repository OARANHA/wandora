# ADR 0033 — Platform Admin Provisioning API V1

Status: Accepted for implementation; live activation remains separately gated.
Date: 2026-09-16

## Context

ADR 0030 defines the canonical idempotent tenant-provisioning primitive. ADR 0031 defines its dedicated least-privilege database identity. ADR 0032 defines a separate private Platform Admin runtime with independent operator authorization.

The runtime skeleton is merged but intentionally has no database capability.

## Decision

The first mutable Platform Admin API is exactly:

```text
POST /internal/v1/platform/organizations/provision
```

It is available only when both Platform Operator authentication and the provisioning adapter are explicitly enabled. Authentication and operator allow-list checks happen before request processing or database effect.

## Request contract

JSON body, maximum 8 KiB:

```json
{
  "requestKey": "idempotency-key",
  "organizationSlug": "canonical-slug",
  "organizationDisplayName": "Company Name",
  "ownerSupabaseSubject": "existing-auth-subject",
  "ownerDisplayName": "Owner Name",
  "employeeDisplayName": "Ana"
}
```

`employeeDisplayName` may be omitted and defaults to `Ana`. Unknown fields are rejected.

The request cannot select database roles, autonomy mode, provider identifiers, messaging configuration, outbound switches, credentials or arbitrary database operations.

## Database adapter

The runtime connects only as `wandora_platform_provisioner`. The role name is constrained by code/config and cannot be replaced by an administrator identity through environment configuration.

The connection credential is loaded only from an operator-controlled mounted secret file. Connection URL style configuration and plaintext credential environment values are not accepted. The V1 pool is bounded to at most two connections.

The adapter may invoke only:

```text
wandora_private.provision_beta_organization_v1(text,text,text,text,text,text)
```

It does not directly query or mutate canonical tables.

## Result contract

Success returns HTTP 201 with only canonical IDs:

```json
{
  "organizationId": "uuid",
  "userId": "uuid",
  "employeeId": "uuid"
}
```

Exact idempotent replay returns the same stable IDs. V1 does not expose a separate created/replayed flag.

## Error mapping

Known outcomes are mapped without exposing database internals:

- invalid key/slug/input → `400 invalid-request`;
- idempotency payload conflict → `409 idempotency-conflict`;
- organization slug conflict → `409 organization-conflict`;
- unavailable adapter/readiness → `503 provisioning-unavailable`;
- unexpected runtime/database failure → generic `500 internal-error`.

Authentication remains `401` for invalid identity, `403` for a valid non-platform identity and `503` when the JWKS dependency is unavailable.

## Fail-closed enablement

The provisioning route is structurally `404` unless provisioning is enabled. Provisioning enablement requires Platform Operator auth to be enabled. Adapter configuration alone cannot expose the route.

Health checks never provision. Readiness may perform only a side-effect-free dependency probe.

## Validation

Disposable CI must prove the migration stack through 009, temporary activation of the dedicated role inside the disposable database, successful invocation of the canonical function, exact replay stability, conflict handling, absence of direct table privileges, operator authorization before database effect, strict body rejection, route closure while disabled, zero messaging/provider/outbound state and unchanged customer Core/Web contracts.

## Live activation boundary

Merging this API does not activate live provisioning. The live role remains inert until a separate reviewed activation supplies the mounted credential, bounded connection limit, operator allow-list and private runtime deployment, and proves authentication/readiness before any real customer provisioning.

Durable operator audit must be defined before normal beta use.
