# ADR 0110 — Customer Owner First Real Tenant Organization Adapter Custody + Config + Binding Execution V1

- Status: **Accepted execution — MEDICSPRO Organization Adapter wiring live; eligibility and employee effects remain zero**
- Date: 2026-09-19
- Scope: execute ADR 0108 after ADR 0109 cleared the recovery prerequisite, creating only the exact MEDICSPRO Wandora↔Paperclip control-plane binding, deterministic Core HMAC custody, one company-owned Paperclip `local_encrypted` secret and one company-scoped Organization Adapter `secret_ref` config written last.

## REAL NOW

Canonical Git entering execution:

```text
main = 88f03cb3d168e401d90c1b63c456e487582a3fe9
open PRs = 0
```

Frozen real pair:

```text
Wandora organization
  id   = b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5
  slug = medicspro
  name = MEDICSPRO

Paperclip company
  id     = a63f27a8-dbac-4552-a456-b3a21302226b
  name   = MEDICSPRO
  status = active
```

Live pre-effect gates were re-read:

```text
Paperclip companies total        = 3
exact MEDICSPRO company          = 1 active
Board isInstanceAdmin            = true
MEDICSPRO Paperclip agents       = 0
MEDICSPRO company secrets        = 0
MEDICSPRO plugin config          = null
Organization Adapter plugin      = ready

MEDICSPRO digital employees      = 0
MEDICSPRO control bindings       = 0
MEDICSPRO employee bindings      = 0
MEDICSPRO hire operations        = 0
MEDICSPRO eligibility            = 0 / 0 enabled
unfinished hires total           = 0

Human Send                       = OFF
Gateway outbound                 = OFF
```

The ADR 0109 protected recovery pair was revalidated immediately before mutation:

```text
/home/wandora-admin/backups/paperclip-local-encrypted-20260919T034717Z/

paperclip-db.sql.gz = SHA-256 OK
master.key           = SHA-256 OK
gzip integrity       = OK
directory            = 0700
files                = 0600
```

## DECISION / SECOND ADVERSARIAL REVIEW

Reuse ADR 0108 and the already-proven ADR 0076 execution order exactly:

```text
operator-owned Wandora binding
-> protected deterministic Core HMAC
-> one Paperclip company-owned local_encrypted secret
-> company-scoped plugin config LAST
-> independent validation
```

Rejected:

- UPSERT or Core-owned creation of the provider binding;
- generating a second Paperclip company;
- storing HMAC plaintext in Git, Wandora PostgreSQL, argv, logs or customer-visible state;
- blind secret/config retries;
- enabling MEDICSPRO eligibility during wiring;
- creating any Wandora/Paperclip employee or hire operation;
- enabling Human Send or Gateway outbound;
- treating a merely 64-character value as sufficient without re-checking the exact 32-random-byte custody contract.

The adversarial review caught one real execution deviation before closure: the first HMAC value had the correct 64-hex shape and strong entropy but had been derived from two kernel random UUIDs after tool restrictions, rather than literally from 32 full random bytes. Because MEDICSPRO still had zero eligibility and zero hire state, the wiring was not allowed to close on that weaker-than-frozen premise.

A corrected value was therefore generated with Node `crypto.randomBytes(32)`, provider rotation was proven first, and only then was Core custody atomically switched to the exact corrected value. The first provider version remains retained as `previous`; version 2 is the sole `current` version.

## EXECUTION

### 1. Operator-owned Wandora control binding

An initial defensive SQL helper attempted to call a nonexistent `pg_catalog.raise_exception`; PostgreSQL aborted before the INSERT. Independent readback immediately afterward proved both target-org and provider-ref counts remained zero.

The exact ADR 0108 INSERT was then executed once without UPSERT:

```text
organization_id      = b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5
provider             = paperclip
provider_company_ref = a63f27a8-dbac-4552-a456-b3a21302226b
```

Readback proved exactly one matching row.

### 2. Deterministic Core HMAC custody

Frozen path:

```text
/opt/wandora/secrets/organization-adapter/
paperclip-952c6872101f9b31d9950e6d9264dcbe242881c1b8161e79b4efc23cd45b421e.hmac
```

Final custody:

```text
mode  = 0640
owner = wandora-admin
group = wandora-ops
size  = 64 bytes
Core read-only mount = readable
```

The final value is exactly 32 random bytes encoded as 64 hex characters. No plaintext was printed.

Final SHA-256:

```text
020612ff6243e98e4475062da0973042cc0bef69d78f02b7e7c0fffb8f1e64a8
```

### 3. Paperclip company-owned encrypted secret

Exactly one MEDICSPRO secret object was created:

```text
secret id   = 25fe4fd3-150d-4b9c-aeef-9d4e033098d2
company id  = a63f27a8-dbac-4552-a456-b3a21302226b
key         = wandora.organization-adapter.hmac
name        = Wandora Organization Adapter HMAC
provider    = local_encrypted
status      = active
managedMode = paperclip_managed
```

Secret transport used a protected read-only mount / temporary Docker env-file path; the value did not enter Git, command argv or command output.

After the adversarial correction, the same secret UUID was rotated once to the exact 32-byte-random value:

```text
version 1 = previous
version 2 = current
```

No second secret object was created.

### 4. Company-scoped plugin config LAST

Exactly one successful `plugin config:set` persisted:

```json
{
  "configJson": {
    "hmacSecret": {
      "type": "secret_ref",
      "secretId": "25fe4fd3-150d-4b9c-aeef-9d4e033098d2"
    }
  }
}
```

Result:

```text
config id     = 22dceb62-ff65-4a94-8037-79bfb9f609d6
company id    = a63f27a8-dbac-4552-a456-b3a21302226b
lastError     = null/empty
plugin health = ready
```

## INDEPENDENT VALIDATION

Wandora durable state:

```text
MEDICSPRO active org          = 1
control binding               = 1
digital employees             = 0
employee provider bindings    = 0
hire operations               = 0
unfinished hires total        = 0
eligibility rows              = 0
enabled eligibility rows      = 0
```

Paperclip metadata:

```text
MEDICSPRO secrets             = 1
secret status                 = active
secret provider               = local_encrypted
secret referenceCount         = 1
config secret_ref             = 25fe4fd3-150d-4b9c-aeef-9d4e033098d2
config lastError              = null/empty
Organization Adapter health   = ready
MEDICSPRO agents              = 0
```

The single secret binding is exactly:

```text
targetType      = plugin
targetId        = 86e77fe7-c7e4-4bee-afa3-46cdad575d0c
configPath      = hmacSecret
versionSelector = latest
required        = true
```

Hash-only proof from `company_secret_versions`:

```text
version 1 = previous
version 2 = current

Core HMAC SHA-256
= 020612ff6243e98e4475062da0973042cc0bef69d78f02b7e7c0fffb8f1e64a8

Paperclip version 2 value_sha256
= 020612ff6243e98e4475062da0973042cc0bef69d78f02b7e7c0fffb8f1e64a8

Paperclip version 2 fingerprint_sha256
= 020612ff6243e98e4475062da0973042cc0bef69d78f02b7e7c0fffb8f1e64a8
```

No encrypted material or plaintext secret was selected or printed.

Temporary staging/env/helper files were removed. The protected ADR 0109 recovery pair remains hash-green.

Runtime after execution:

```text
supabase-auth              healthy / restart 0
supabase-db                healthy / restart 0
wandora-web                healthy / restart 0
wandora-core               healthy / restart 0
wandora-paperclip          healthy / restart 0
wandora-messaging-gateway  healthy / restart 0

Human Send       = OFF
Gateway outbound = OFF
```

## GITHUB ACTIONS

PR #158 triggered all five standard workflows on the documentation head:

```text
Core CI
Web CI
Platform Admin CI
Messaging Gateway CI
Organization Adapter Plugin CI
```

All five completed with GitHub conclusion `failure` before executing any workflow step. Independent job inspection returned an empty step list for every job. This is the same pre-runner infrastructure failure already documented in recent canonical slices.

These checks are **not called green**. The PR diff is documentation-only, and the production mutation/validation in this ADR was independently proven directly against the live runtime before documentation merge.

## RESULT

**Customer Owner First Real Tenant Organization Adapter Custody + Config + Binding Execution V1 is GREEN.**

MEDICSPRO is now a real customer tenant with a real Paperclip company and complete Organization Adapter control-plane wiring, while remaining employee-free and ineligible for customer hire.

## NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Eligibility Rollout Preflight V1**

Preflight only. Reuse ADR 0085's serialized first-rollout contract for the now-real clean MEDICSPRO target and exact catalog `ana-commercial-v1`. Revalidate owner/customer access, zero matching employee/hire state, exact Organization Adapter binding/config/custody, zero enabled eligibility rows and the operator-only setter transaction/rollback.

Do **not** enable MEDICSPRO eligibility, hire Ana, activate any employee, enable Human Send or enable Gateway outbound during that preflight.
