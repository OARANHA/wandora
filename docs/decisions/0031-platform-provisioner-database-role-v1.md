# ADR 0031 — Platform Provisioner Database Role V1

Status: Accepted
Date: 2026-09-16

## Context

ADR 0030 introduced the private idempotent tenant-provisioning primitive and migration 008 is live. The function is intentionally unavailable to `authenticated` and `wandora_core_runtime`.

The next Platform Admin boundary needs a database identity that can invoke provisioning without turning the normal customer Core runtime into a platform-wide actor.

## First decision considered

Grant `EXECUTE` on the private provisioner to `wandora_core_runtime` and let a future Platform Admin route call it from the existing Core process.

## Adversarial review

Rejected.

`wandora_core_runtime` is a tenant-scoped business runtime. Giving it a platform-wide provisioning primitive would collapse the customer/Core trust plane into the Platform Admin trust plane and make any future Core compromise materially more powerful.

Using `service_role`, `postgres` or `supabase_admin` from an application service is also rejected as unnecessarily broad.

## Decision

Create a dedicated PostgreSQL role:

```text
wandora_platform_provisioner
```

Properties at migration time:

- `LOGIN`;
- `CONNECTION LIMIT 0`;
- no password assigned by migration;
- `NOSUPERUSER`;
- `NOCREATEDB`;
- `NOCREATEROLE`;
- `NOINHERIT`;
- `NOREPLICATION`;
- `NOBYPASSRLS`.

The role receives only:

- `USAGE` on `wandora_private`;
- `EXECUTE` on `wandora_private.provision_beta_organization_v1(text,text,text,text,text,text)`.

It receives no direct table privileges in `wandora` or `wandora_private`.

## Disabled-by-default rule

The migration creates no usable production credential.

`CONNECTION LIMIT 0` remains the production state until a separately reviewed Platform Admin runtime activation supplies an operator-controlled secret and explicitly raises the connection limit.

Code merge and migration application therefore do not activate provisioning traffic.

## Why a separate role matters

The provisioning function is `SECURITY DEFINER` and intentionally owns the exact transactional writes needed for organization + owner + Ana creation. The caller does not need direct INSERT/SELECT rights on those business tables.

This keeps the future Platform Admin service constrained to a narrow callable capability rather than broad database access.

## Validation requirements

Disposable PostgreSQL verification must prove:

1. role exists after migration;
2. login is true but connection limit is 0;
3. role is not superuser / createdb / createrole / inherit / replication / bypassrls;
4. no password is set by migration;
5. role has schema usage only where required;
6. role can execute the exact provisioning function;
7. role cannot execute unrelated privileged/private functions;
8. role has no direct SELECT/INSERT/UPDATE/DELETE on provisioning evidence or canonical business tables;
9. `authenticated` and `wandora_core_runtime` remain unable to execute provisioning;
10. migration is idempotent.

A disposable activation probe may temporarily set a synthetic password + small connection limit and prove the role can provision through the function while direct table access still fails.

## Production activation boundary

A future Platform Admin service must have its own runtime/process/network/authentication boundary. Activating this DB role is not permission to expose the function through the customer Web or the normal Core API.

No browser route may call the function directly.
