# ADR 0076 — Customer Hire Canary Organization Adapter Custody + Config + Binding Execution V1

- Status: **Accepted — customer-hire canary wiring live; zero employee effect**
- Date: 2026-09-18
- Scope: execute the ADR 0073 customer-hire canary Organization Adapter wiring after ADR 0075 cleared the Paperclip `local_encrypted` recovery prerequisite

## REAL NOW

Canonical Git entering execution:

```text
main = 0a6884d503f99da137770782810c769db3e10025
PR #120 = merged
open PRs = 0
```

Frozen pair:

```text
Wandora organization
  id   = 918d4c7e-fccb-41f0-aba7-04105a9b4ec0
  slug = wandora-customer-hire-canary
  name = Wandora Customer Hire Canary

Paperclip company
  id     = e7422a00-1474-49d5-ac32-34594520015e
  name   = Wandora Customer Hire Canary
  status = active
```

The ADR 0075 recovery gate was revalidated immediately before wiring:

```text
protected recovery snapshot = present
database SHA-256 check = green
master.key SHA-256 check = green
RECOVERY_MANIFEST.txt = present
```

Pre-wiring canary state was independently re-read as:

```text
Wandora control-plane binding = 0
Wandora digital employees = 0
Wandora hire operations = 0
Core canary HMAC file = absent

Paperclip canary secrets = 0
Paperclip canary plugin config = null
Paperclip canary agents = 0
Organization Adapter plugin = ready / healthy
local_encrypted = ok
```

## DECISION / SECOND ADVERSARIAL REVIEW

ADR 0073's order remains authoritative:

```text
recovery prerequisite
  -> operator-owned Wandora binding
  -> protected deterministic Core HMAC custody
  -> one Paperclip company-owned local_encrypted secret
  -> company-scoped plugin config LAST
  -> independent validation
```

The execution review rejected:

- repeating the already-green recovery snapshot;
- letting Core write the private control-plane binding;
- HMAC in argv, logs, Git or Wandora PostgreSQL;
- regenerating the HMAC after it exists;
- blind retry of secret creation;
- blind retry of config save;
- reconcile/hire webhook calls during wiring;
- creating Ana merely to prove the HMAC works;
- enabling the public customer-hire runtime;
- Human Send or Gateway outbound activation.

## EXECUTION

### 1. Operator-owned Wandora control-plane binding

The first shell attempt omitted `-i` on `docker exec`, so the SQL heredoc never reached `psql`.

Before any retry, explicit readback proved:

```text
binding count by organization = 0
binding count by provider company ref = 0
```

The exact ADR 0073 INSERT was then executed once with stdin enabled and no UPSERT:

```text
organization_id = 918d4c7e-fccb-41f0-aba7-04105a9b4ec0
provider = paperclip
provider_company_ref = e7422a00-1474-49d5-ac32-34594520015e
```

Independent readback proved exactly that row.

### 2. Protected deterministic Core HMAC custody

Frozen filename:

```text
paperclip-0cbf21f19c002ca9207c67e5cdec8180641431eacdf601629b683de2a363bbd2.hmac
```

The HMAC was generated exactly once as 32 random bytes encoded to 64 hex characters.

It was created atomically inside:

```text
/opt/wandora/secrets/organization-adapter/
```

Final custody:

```text
mode = 0640
owner = wandora-admin
group = wandora-ops
size = 64 bytes
```

The live Core's existing read-only bind mount saw the file immediately and proved it readable at the matching path under:

```text
/run/secrets/wandora/organization-adapter/
```

No Core restart was required. Canonical Core code opens the company-derived file dynamically with `O_NOFOLLOW` during secret resolution.

The HMAC value was never printed.

### 3. One Paperclip company-owned encrypted secret

Immediately before creation, the canary company still reported:

```json
[]
```

for its secret list.

The value was piped from protected host custody to stdin and read into an ephemeral environment variable inside the Paperclip container. It did not appear in argv or command output.

Exactly one secret was created through the official Paperclip CLI:

```text
secret id   = ce349797-b444-4313-9574-a05b1c1dfe5a
company id  = e7422a00-1474-49d5-ac32-34594520015e
scope       = company
key         = wandora.organization-adapter.hmac
name        = Wandora Organization Adapter HMAC
provider    = local_encrypted
status      = active
managedMode = paperclip_managed
version     = 1
```

Readback before config save proved:

```text
secret count = 1
referenceCount = 0
secret usage bindings = []
plugin config = null
agents = []
```

No secret-create retry occurred.

### 4. Config validation boundary

The official `plugin config:test` endpoint was tried with the exact desired `secret_ref` before persistence.

It returned:

```json
{
  "valid": false,
  "supported": false,
  "message": "This plugin does not support configuration testing."
}
```

This was treated as an unsupported capability, not as permission to infer success.

Immediate readback proved the attempt was non-effectful:

```text
plugin config = null
secret usage bindings = []
```

Pinned Paperclip source already proves that the real `config:set` route validates config schema and same-company secret ownership before synchronizing bindings and upserting durable config.

### 5. Company-scoped plugin config LAST

Exactly one `plugin config:set` call was executed with:

```json
{
  "configJson": {
    "hmacSecret": {
      "type": "secret_ref",
      "secretId": "ce349797-b444-4313-9574-a05b1c1dfe5a"
    }
  }
}
```

Paperclip returned the persisted config:

```text
config id = 74343e6a-1a53-4d75-807d-0f69e36190db
company id = e7422a00-1474-49d5-ac32-34594520015e
lastError = null
```

No config replay was performed.

## INDEPENDENT VALIDATION

Paperclip readback:

```text
config secret_ref = ce349797-b444-4313-9574-a05b1c1dfe5a
config lastError = null

secret = exactly 1 active company-owned local_encrypted secret
secret latestVersion = 1
secret referenceCount = 1

secret usage:
  targetType = plugin
  targetId = Organization Adapter plugin
  configPath = hmacSecret
  versionSelector = latest
  required = true

canary agents = 0
Organization Adapter plugin = ready / healthy
```

Core custody readback:

```text
HMAC file mode = 0640
owner/group = wandora-admin / wandora-ops
size = 64
Core can read it = true
```

Wandora durable readback:

```text
exact canary control-plane binding = 1
canary digital employees = 0
canary digital-employee provider bindings = 0
canary hire operations = 0
```

The first residual verifier mistakenly assumed a `digital_employee_id` column on `digital_employee_provider_bindings`; that query failed before reading or mutating state. Schema inspection proved the canonical key is `employee_id` and that the table already carries `organization_id`, after which the organization-scoped count proved zero.

Live runtime:

```text
Paperclip = running, restart_count=0
Core = running, restart_count=0
WANDORA_ORGANIZATION_ADAPTER_ENABLED = true
dedicated customer-hire flag = absent/OFF
Human Send flag = absent/OFF
Gateway outbound enable flag = absent/OFF
```

Recovery snapshot revalidation after wiring:

```text
paperclip-db.sql.gz = SHA-256 OK
master.key = SHA-256 OK
RECOVERY_MANIFEST.txt = present
```

No reconcile webhook was invoked and no provider managed agent was created.

## SECURITY / EFFECT BOUNDARY

This slice establishes only the provider control-plane wiring required for a future first hire.

It does **not**:

- create a Wandora digital employee;
- create a digital-employee provider binding;
- create a hire operation;
- invoke managed reconcile;
- create a Paperclip Ana agent;
- enable customer hire on the public Core;
- activate an employee;
- enable Human Send;
- enable Gateway outbound.

The HMAC plaintext remains outside Git, canonical docs and customer-visible state.

## DECISION

**Customer Hire Canary — Organization Adapter Custody + Config + Binding Execution V1 is GREEN.**

ADR 0065 future-canary prerequisite steps 1–7 are now complete for the clean customer-like canary.

## NEXT EXECUTABLE SLICE

**Customer Hire Canary — Private Candidate Core Hire Preflight V1.**

Before the actual first customer hire effect, revalidate the currently reviewed customer-hire implementation and freeze:

1. the exact production-proven candidate Core image/source provenance;
2. a private production-connected Core composition with Human API + Organization Adapter + Customer Digital-Employee Hire gate ON;
3. no public/customer ingress to that candidate;
4. the real authorized human-session source and exact canary organization authorization;
5. exact POST contract for `ana-commercial-v1`;
6. stable canary idempotency key and replay plan;
7. expected paused + supervised Wandora result;
8. expected paused provider-managed Ana result;
9. same-key and different-key/same-catalog no-duplicate proofs;
10. no provider ref/secret leakage in response;
11. Human Send and Gateway outbound OFF;
12. candidate cleanup/rollback and ambiguity rules.

Do not execute the hire, enable the public Core customer-hire gate, activate Ana or enable outbound in that preflight.
