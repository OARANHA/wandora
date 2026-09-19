# ADR 0108 — Customer Owner First Real Tenant Organization Adapter Custody + Config + Binding Preflight V1

- Status: **Accepted preflight — MEDICSPRO wiring frozen; execution blocked on current-state Paperclip local-encrypted recovery refresh**
- Date: 2026-09-19
- Scope: reuse ADRs 0073–0076 for the real MEDICSPRO Wandora↔Paperclip pair, revalidate custody/config/binding authority and ambiguity handling, and stop before any HMAC, Paperclip secret/config, Wandora provider binding, eligibility or employee effect.

## REAL NOW

Canonical Git entering this preflight:

```text
main = 69b83a38f4fcfae4a57ed6c1b6631d7fb983e807
open relevant work = none
```

Live runtime:

```text
supabase-auth              = supabase/gotrue:v2.196.0 / healthy / restart 0
supabase-db                = supabase/postgres:17.6.1.136 / healthy / restart 0
wandora-web                = wandora/web:owner-access-candidate-5f135e90 / healthy / restart 0
wandora-core               = wandora/core:organization-adapter-candidate-af542864d267 / healthy / restart 0
wandora-paperclip          = wandora/paperclip:v2026.831.1 / healthy / restart 0
wandora-messaging-gateway  = wandora/messaging-gateway:origin-fix-94cfb4de / healthy / restart 0

WANDORA_ORGANIZATION_ADAPTER_ENABLED          = true
WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED  = true
Human Send enable flag                        = absent / OFF
Gateway outbound enable flag                  = absent / OFF
```

Pinned Paperclip source remains:

```text
65ec059bde30d98c92165b24a30a540800dd1f6f
```

Frozen real pair:

```text
Wandora MEDICSPRO
  organization_id = b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5
  slug            = medicspro
  display_name    = MEDICSPRO
  status          = active

Paperclip MEDICSPRO
  company_id = a63f27a8-dbac-4552-a456-b3a21302226b
  name       = MEDICSPRO
  status     = active
```

Read-only provider proof using the protected Board auth store with the explicit private API base proved:

```text
Board isInstanceAdmin       = true
MEDICSPRO membership        = owner / active
MEDICSPRO agents            = 0
MEDICSPRO secrets           = 0
MEDICSPRO plugin config     = null

Organization Adapter plugin
  id       = 86e77fe7-c7e4-4bee-afa3-46cdad575d0c
  key      = wandora.organization-adapter-v1
  version  = 0.1.0
  status   = ready
  healthy  = true

local_encrypted = ok
master key path = /paperclip/instances/default/secrets/master.key
```

Read-only Wandora reconciliation proved:

```text
MEDICSPRO digital employees      = 0
MEDICSPRO control bindings       = 0
MEDICSPRO employee bindings      = 0
MEDICSPRO hire operations        = 0
MEDICSPRO eligibility            = 0 / 0 enabled

control bindings total           = 2
employee bindings total          = 2
hire operations total            = 2
unfinished hires total           = 0
eligibility rows/enabled total   = 0 / 0
```

## CAPABILITY AUTHORITY / BINDING AUTHORITY

The existing private binding table remains the minimum Wandora-owned provider mapping. No new domain state is justified.

Live privilege proof:

```text
supabase_admin INSERT control_plane_provider_bindings = true
wandora_core_runtime INSERT                             = false
wandora_core_runtime SELECT                             = true
```

Therefore the future MEDICSPRO binding remains an explicit operator-owned effect. Core must not auto-create it.

The exact future insert is frozen as:

```sql
INSERT INTO wandora_private.control_plane_provider_bindings
  (organization_id, provider, provider_company_ref)
VALUES
  (
    'b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5',
    'paperclip',
    'a63f27a8-dbac-4552-a456-b3a21302226b'
  );
```

No UPSERT / `ON CONFLICT` is allowed. Any existing organization row or provider-ref collision stops execution for reconciliation.

## DETERMINISTIC CORE HMAC CUSTODY — FROZEN

The provider reference hash was independently recalculated:

```text
sha256(a63f27a8-dbac-4552-a456-b3a21302226b)
= 952c6872101f9b31d9950e6d9264dcbe242881c1b8161e79b4efc23cd45b421e
```

Future host path:

```text
/opt/wandora/secrets/organization-adapter/
  paperclip-952c6872101f9b31d9950e6d9264dcbe242881c1b8161e79b4efc23cd45b421e.hmac
```

Current state:

```text
target HMAC exists = false

custody directory:
  mode  = 0750
  owner = wandora-admin
  group = wandora-ops

existing Organization Adapter HMAC files:
  mode  = 0640
  owner = wandora-admin
  group = wandora-ops
  size  = 64 bytes

Core mount:
  /opt/wandora/secrets/organization-adapter
  -> /run/secrets/wandora/organization-adapter
  read-only = true

Core runtime:
  uid = 1000
  supplementary group includes 987
  existing HMAC files readable = true
```

The future MEDICSPRO HMAC reuses ADR 0073/0076 semantics: exactly one strong random 32-byte value encoded as 64 hex characters, atomically written with the frozen ownership/mode. It must never be printed, committed, written into Wandora PostgreSQL, embedded in URLs, or passed in argv.

## PAPERCLIP SECRET + CONFIG CONTRACT — FROZEN

Future company secret metadata:

```text
companyId   = a63f27a8-dbac-4552-a456-b3a21302226b
name        = Wandora Organization Adapter HMAC
key         = wandora.organization-adapter.hmac
provider    = local_encrypted
managedMode = paperclip_managed
```

The value must be transported from protected Core custody through an ephemeral environment variable / stdin path supported by the official Paperclip CLI. Raw HMAC material must not appear in argv or command output.

Secret creation is one-shot. If the response is ambiguous, reconcile read-only by exact company + name + key + provider. Never create a second secret merely because the first response was lost.

Future company-scoped plugin config:

```json
{
  "companyId": "a63f27a8-dbac-4552-a456-b3a21302226b",
  "configJson": {
    "hmacSecret": {
      "type": "secret_ref",
      "secretId": "<exact MEDICSPRO secret UUID returned/reconciled above>"
    }
  }
}
```

The Paperclip config route remains the accepted authority for schema validation, same-company secret ownership, secret-reference binding and configured-company scope refresh.

Config save remains potentially ambiguous after dispatch. Blind replay is forbidden. Reconcile exact company config, exact `secret_ref`, secret usage/reference count and plugin health before deciding whether another effect is safe.

## RECOVERY PREREQUISITE — SECOND ADVERSARIAL REVIEW

ADR 0075 proved the correct recovery mechanism and retained this out-of-Docker-volume pair:

```text
/home/wandora-admin/backups/paperclip-local-encrypted-20260918T090456Z/

directory = 0700
files     = 0600
SHA256SUMS = green
master.key snapshot hash still matches the live master.key
```

However, the retained database snapshot predates later live provider state.

Boolean-only inspection of the retained SQL backup proved:

```text
canary company UUID present   = true
canary HMAC secret UUID       = false
MEDICSPRO company UUID        = false
```

The current canary Organization Adapter secret created under ADR 0076 is:

```text
ce349797-b444-4313-9574-a05b1c1dfe5a
```

and it is absent from the retained recovery DB snapshot.

The only newer Paperclip backups are still inside the live Paperclip Docker volume. At preflight time the newest was:

```text
/paperclip/instances/default/data/backups/paperclip-20260919-030454.sql.gz
```

That backup also predates the MEDICSPRO provider-company creation at `2026-09-19T03:23:39.363Z`.

Therefore:

- the recovery **method** remains proven;
- the protected `master.key` copy remains current;
- but the retained out-of-volume **database + key pair does not represent the current Paperclip state**;
- using it as the recovery prerequisite for a new MEDICSPRO encrypted secret would silently weaken ADR 0073's safety property.

This preflight therefore rejects proceeding directly to wiring.

## DECISION

The MEDICSPRO wiring contract is accepted and frozen, but **Custody + Config + Binding Execution is BLOCKED** until a current-state Paperclip local-encrypted recovery pair is refreshed and proven.

Required order:

```text
current-state recovery refresh
  -> operator-owned Wandora control-plane binding
  -> generate one deterministic-path Core HMAC
  -> create/reconcile one MEDICSPRO Paperclip local_encrypted secret
  -> write company-scoped Organization Adapter config LAST
  -> independent validation
```

The recovery refresh reuses ADRs 0074–0075 rather than inventing a new backup mechanism.

It must:

1. trigger exactly one fresh official Paperclip manual logical backup after revalidating current state;
2. pair that exact backup out of the Docker volume with the exact current `master.key`;
3. keep restrictive custody and hash/gzip gates;
4. prove the fresh DB contains the already-live canary secret/config state and the MEDICSPRO company;
5. reuse the disposable PG18 restore/decryption proof against an already-live secret without printing plaintext;
6. retain the previous protected snapshot until the new pair is fully green;
7. create no MEDICSPRO HMAC/secret/config/binding/eligibility/employee.

After that gate is green, the separate MEDICSPRO wiring execution may proceed under this ADR without redesign.

## FAILURE / AMBIGUITY POLICY FOR FUTURE WIRING

ADR 0073 remains authoritative.

### Binding

- require zero target-org rows and zero provider-ref collisions immediately before insert;
- if insert fails, stop before custody/provider effects;
- do not UPSERT.

### HMAC custody

- if file creation/mode/readability fails, stop;
- if only the new binding exists and no provider effect exists, a reviewed rollback may remove only that exact binding;
- never regenerate after a successful file creation merely because later work failed.

### Secret creation

- definite no-effect failure: remove only the new HMAC and exact binding;
- ambiguous response: read metadata first;
- exactly one matching active secret: adopt its UUID;
- zero after ambiguity: stop and recheck later before any retry;
- multiple/conflicting matches: stop for operator reconciliation.

### Config save

- save config last;
- after failed/ambiguous response, reconcile config + secret usage before any replay;
- if exact config is present with the exact secret ref, adopt success;
- if config is absent and secret has zero references, official secret deletion plus HMAC/binding rollback may restore pre-wiring state;
- if residual reference state exists, preserve evidence and stop;
- once desired config is proven durable, do not destructively roll back merely because a later read/check fails.

No direct Paperclip SQL repair is authorized.

## EFFECT BOUNDARY / VALIDATION

This preflight created none of the prohibited effects:

```text
MEDICSPRO HMAC file                 = absent
MEDICSPRO Paperclip secret          = absent
MEDICSPRO plugin config             = null
MEDICSPRO Wandora control binding   = absent
MEDICSPRO eligibility               = 0
MEDICSPRO employees                 = 0
MEDICSPRO hire operations           = 0
```

No runtime was recreated.

Organization Adapter and global Customer Hire remain ON, while MEDICSPRO remains ineligible. Human Send and Gateway outbound remain OFF.

## RESULT

**Customer Owner First Real Tenant Organization Adapter Custody + Config + Binding Preflight V1 is complete.**

The exact real-tenant pair, operator authority, deterministic custody path, Paperclip secret/config contract, execution order and ambiguity/rollback behavior are frozen.

The second adversarial review correctly discovered that the retained out-of-volume recovery DB is stale relative to current Paperclip state, so wiring execution is intentionally blocked until a current-state recovery snapshot refresh is completed.

## NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Paperclip Local-Encrypted Recovery Snapshot Refresh Execution V1**

Reuse the already-proven ADR 0074–0075 procedure to create and prove one fresh current-state protected DB + `master.key` pair. Do not create the MEDICSPRO HMAC, Paperclip secret/config, Wandora provider binding, eligibility or employee during that refresh.
