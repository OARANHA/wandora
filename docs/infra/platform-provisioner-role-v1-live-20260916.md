# Platform Provisioner Role V1 — Live Evidence — 2026-09-16

Authority: ADR 0031
PR: #67
Merge commit: `29dec978f29776e2b01322d4b0a2d004e8dc1d01`

## CI evidence

The merged head passed all required pull-request gates before promotion:

```text
Core CI #135              success
Web CI #72                success
Messaging Gateway CI #104 success
```

Core CI proved both migration 008 and 009 second-application idempotence and executed the provisioning primitive under `SET ROLE wandora_platform_provisioner` in disposable PostgreSQL. The behavioral transaction rolled back.

Observed verifier markers included:

```text
PRIVATE_TENANT_PROVISIONING_V1_LIVE_OK
PRIVATE_TENANT_PROVISIONING_V1_OK
PLATFORM_PROVISIONER_ROLE_V1_LIVE_OK
PLATFORM_PROVISIONER_ROLE_V1_OK
WANDORA_CORE_PRIVATE_RUNTIME_V1_OK
ANA_VERTICAL_SLICE_V1_VERIFY_OK
```

The Core suite completed with 73 tests passing and 0 failing.

## Live preflight

Live PostgreSQL container: `supabase-db`.

Before migration 009:

```text
wandora_platform_provisioner = missing
organizations               = 2
users                       = 1
memberships                 = 2
digital_employees           = 2
tenant_provisioning_requests= 0
```

Schema-only backup:

```text
/home/wandora-admin/backups/pre-migration-009-20260916T083014Z.sql
sha256 9b200c8fed464ca6c9a68fcb0bee52b67cb93bf97555bbc73e642b74c87a5e46
```

## Exact-artifact gate

The migration materialized on the operator host matched the merged Git blob exactly:

```text
migration 009 blob = 6a6522f44a7d768aee13499c08142e5de3f7df86
```

The live-safe verifier also matched its merged Git blob exactly:

```text
verifier blob = 0eb906ea1d522e340178555c7b1fbed25a639d81
```

## Promotion result

Migration 009 completed successfully. Only the live-safe verifier was executed in production.

Result:

```text
PLATFORM_PROVISIONER_ROLE_V1_LIVE_OK
```

Observed role state after promotion:

```text
role           = wandora_platform_provisioner
login          = true
connection limit = 0
password       = absent
superuser      = false
createdb       = false
createrole     = false
inherit        = false
replication    = false
bypassrls      = false
```

The role has the narrow callable capability defined by ADR 0031 and remains unusable as a network login because it has no password and `CONNECTION LIMIT 0`.

## Zero business-state effect

Canonical business counts were unchanged after promotion:

```text
organizations                = 2
users                        = 1
memberships                  = 2
digital_employees            = 2
tenant_provisioning_requests = 0
```

No organization, user, membership, employee, messaging connection, provider binding or outbound effect was created by the promotion.

## Runtime health

After promotion the canonical application containers remained healthy:

```text
Core    wandora/core:inbound-reopen-384bfee6
Web     wandora/web:canonical-confirm-a1ee4755
Gateway wandora/messaging-gateway:origin-fix-94cfb4de
```

Human Send and Gateway outbound were not activated.

## Final state

The platform provisioning database identity is present but deliberately inert.

Do not assign a password or raise its connection limit until a separately reviewed Platform Admin runtime has its own authentication, network, secret and API boundary.
