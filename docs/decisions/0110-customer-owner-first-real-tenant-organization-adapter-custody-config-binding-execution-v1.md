# ADR 0110 — Customer Owner First Real Tenant Organization Adapter Custody + Config + Binding Execution V1

- Status: **Accepted — MEDICSPRO Organization Adapter wiring live; execution recovered/reconciled without retry; zero eligibility/employee/hire effect**
- Date: 2026-09-19
- Scope: close the ADR 0108 MEDICSPRO Organization Adapter wiring boundary after ADR 0109 cleared the pre-effect recovery prerequisite, while honoring state-first recovery after live state had already advanced beyond the last canonical checkpoint.

## REAL NOW

Canonical Git at the start of this resumption:

```text
main = 88f03cb3d168e401d90c1b63c456e487582a3fe9
open PRs = 0
```

Frozen MEDICSPRO pair from ADRs 0107–0108:

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

ADR 0109's protected pre-wiring recovery pair was revalidated before accepting any further effect:

```text
/home/wandora-admin/backups/paperclip-local-encrypted-20260919T034717Z/

directory mode/owner/group = 0700 / wandora-admin / wandora-ops
SHA256SUMS                 = green for DB + master.key
gzip                       = green
protected master.key       = byte-identical to current live master.key
```

The live runtime remained healthy:

```text
supabase-auth              healthy / restart 0
supabase-db                healthy / restart 0
wandora-web                healthy / restart 0
wandora-core               healthy / restart 0
wandora-paperclip          healthy / restart 0
wandora-messaging-gateway  healthy / restart 0
```

## PROVEN EVIDENCE — STATE HAD ALREADY ADVANCED

The mandatory state-first check disproved the expected ADR 0109 pre-effect baseline.

Before this reconciliation session issued any production write, live reads showed that the MEDICSPRO wiring sequence had already begun after the ADR 0109 checkpoint. The sequence then resolved to the complete intended desired state.

Observed timestamps preserve the ADR 0108 ordering:

```text
Wandora binding created_at = 2026-09-19 04:00:49.499424+00
Core HMAC file mtime       = 2026-09-19 04:02:02.152699887+00
Paperclip secret created   = 2026-09-19T04:03:58.217Z
Paperclip config created   = 2026-09-19T04:04:35.940Z
```

Because ADR 0108 explicitly forbids blind retry after ambiguity or interruption, the correct recovery action was **reconciliation, not replay**.

No second binding insert, HMAC generation, secret creation or config POST was executed by this recovery/reconciliation session.

## GAPS

The execution desired state needed five independent questions answered before it could be accepted:

1. Is the Wandora provider binding exactly the frozen MEDICSPRO↔Paperclip pair?
2. Is the deterministic HMAC custody file structurally correct and readable by Core without exposing the value?
3. Is there exactly one company-owned active Paperclip `local_encrypted` secret with the frozen key/name?
4. Does exactly one company-scoped Organization Adapter config reference exactly that secret?
5. Did the wiring leave eligibility, digital employees and hire operations at zero while Human Send and Gateway outbound stayed OFF?

All five were proven.

A separate recovery gap remains after success: the protected ADR 0109 DB snapshot is intentionally pre-wiring and therefore cannot by itself represent the new MEDICSPRO secret/config state. A newer Paperclip logical backup exists inside the live Docker volume, but no new post-wiring DB + current `master.key` pair has yet been copied and restore-proven out of volume.

## CAPABILITY AUTHORITY / REUSE GATE

No new Wandora domain capability is introduced.

The accepted capability split remains:

```text
Wandora
  -> owns organization identity, operator-owned provider mapping,
     policy/eligibility and minimum reconciliation state

Organization Adapter
  -> owns the provider-neutral control-plane boundary

Paperclip
  -> owns company-scoped secret/config and digital-employee control-plane capability
```

The execution reuses:

- `wandora_private.control_plane_provider_bindings` from ADR 0038;
- deterministic Core HMAC custody from ADR 0041;
- Paperclip `local_encrypted` provider;
- `wandora.organization-adapter-v1@0.1.0`;
- ADRs 0073–0076 execution and ambiguity rules.

Rejected as duplication or trust-boundary erosion:

- new Wandora secret tables;
- Core-created control-plane bindings;
- direct Paperclip SQL;
- browser/provider credentials;
- another HMAC/secret/config because a previous response was not observed;
- employee/hire state merely to prove wiring.

## DECISION

Adopt the already-materialized exact desired wiring state after independent reconciliation.

Do **not** repeat any of the four effectful steps.

The execution is accepted only if all independent reads agree on:

```text
binding exact = 1
deterministic HMAC custody = structurally valid + Core-readable
Paperclip MEDICSPRO secret = exactly 1 active local_encrypted
secret_ref usage = exactly 1
plugin config = exact company + exact secret_ref
plugin health = ready / healthy
Paperclip MEDICSPRO agents = 0
MEDICSPRO employees = 0
MEDICSPRO employee bindings = 0
MEDICSPRO hire operations = 0
MEDICSPRO eligibility = 0 / 0 enabled
Human Send = OFF
Gateway outbound = OFF
```

## SECOND ADVERSARIAL REVIEW

The review actively rejected the tempting but unsafe interpretation that “the requested execution has not happened because the previous chat did not report it.”

Evidence disproved that premise.

### Retry rejection

The following live state exists exactly once:

```text
Wandora binding
  organization_id      = b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5
  provider             = paperclip
  provider_company_ref = a63f27a8-dbac-4552-a456-b3a21302226b

Core HMAC
  deterministic filename hash = 952c6872101f9b31d9950e6d9264dcbe242881c1b8161e79b4efc23cd45b421e
  mode/owner/group             = 0640 / wandora-admin / wandora-ops
  size                         = 64 bytes

Paperclip secret
  id          = 25fe4fd3-150d-4b9c-aeef-9d4e033098d2
  companyId   = a63f27a8-dbac-4552-a456-b3a21302226b
  key         = wandora.organization-adapter.hmac
  provider    = local_encrypted
  status      = active
  managedMode = paperclip_managed
  version     = 1

Paperclip company config
  id        = 22dceb62-ff65-4a94-8037-79bfb9f609d6
  companyId = a63f27a8-dbac-4552-a456-b3a21302226b
  lastError = null
```

A retry could only increase risk; it cannot improve the proven desired state.

### Post-wiring recovery review

ADR 0109 remains a valid, intact **pre-wiring** rollback/recovery pair. It is not a current-state disaster-recovery pair for the newly added MEDICSPRO secret/config.

A newer live-volume backup is already observable:

```text
paperclip-20260919-040454.sql.gz
```

It is newer than the config creation timestamp, but it remains inside the same Paperclip Docker volume and has not yet been paired out of volume and restore-proven. Therefore it is evidence for the next recovery slice, not permission to claim current post-wiring disaster recovery is complete.

This gap does not justify destructive rollback of the correct live wiring.

## EXECUTION / RECOVERY RECONCILIATION

No production mutation was repeated.

The live effect sequence was reconstructed from durable/readable state and accepted only after exact reconciliation.

### 1. Wandora control-plane binding

Independent SQL readback:

```text
exact MEDICSPRO binding = 1
total control bindings  = 3
created_at              = updated_at
provider                = paperclip
provider_company_ref    = a63f27a8-dbac-4552-a456-b3a21302226b
```

There is no second MEDICSPRO binding and no UPSERT/retry was issued by this reconciliation session.

### 2. Deterministic HMAC custody

Canonical file:

```text
/opt/wandora/secrets/organization-adapter/
paperclip-952c6872101f9b31d9950e6d9264dcbe242881c1b8161e79b4efc23cd45b421e.hmac
```

Validation:

```text
mode       = 0640
owner      = wandora-admin
group      = wandora-ops
size       = 64 bytes
Core read  = true
```

The secret value was never printed.

### 3. Paperclip company-owned local_encrypted secret

Official authenticated private Paperclip CLI readback returned exactly one MEDICSPRO secret with the frozen semantic identity:

```text
id             = 25fe4fd3-150d-4b9c-aeef-9d4e033098d2
scope          = company
companyId      = a63f27a8-dbac-4552-a456-b3a21302226b
key            = wandora.organization-adapter.hmac
name           = Wandora Organization Adapter HMAC
provider       = local_encrypted
status         = active
managedMode    = paperclip_managed
latestVersion  = 1
referenceCount = 1
```

No secret-create retry occurred during reconciliation.

### 4. Company-scoped config LAST

Official Paperclip readback proves:

```json
{
  "companyId": "a63f27a8-dbac-4552-a456-b3a21302226b",
  "configJson": {
    "hmacSecret": {
      "type": "secret_ref",
      "secretId": "25fe4fd3-150d-4b9c-aeef-9d4e033098d2"
    }
  },
  "lastError": null
}
```

Secret usage independently reports exactly one binding:

```text
targetType      = plugin
targetId        = 86e77fe7-c7e4-4bee-afa3-46cdad575d0c
configPath      = hmacSecret
versionSelector = latest
required        = true
```

No config replay occurred.

## VALIDATION

### Independent value-integrity proof

Only hashes were compared; no HMAC plaintext or encrypted value was selected or printed.

```text
Core HMAC file SHA-256
= 238496e7b6750c0dd5bb2085b5751511e6e9d544a601fe0c6b93e09b49496726

Paperclip company_secret_versions.value_sha256
= 238496e7b6750c0dd5bb2085b5751511e6e9d544a601fe0c6b93e09b49496726

Paperclip company_secret_versions.fingerprint_sha256
= 238496e7b6750c0dd5bb2085b5751511e6e9d544a601fe0c6b93e09b49496726

version = 1
hash match = true
```

The Paperclip hash read used a disposable PostgreSQL client sharing only the Paperclip network namespace. The client exited and was removed.

### Paperclip health

```text
Organization Adapter plugin = ready / healthy
registry check               = passed
manifest check               = passed
status check                 = passed
local_encrypted              = ok
MEDICSPRO agents             = 0
```

### Wandora effect boundary

```text
MEDICSPRO digital employees       = 0
MEDICSPRO employee bindings       = 0
MEDICSPRO hire operations         = 0
MEDICSPRO unfinished hire ops     = 0
MEDICSPRO eligibility rows        = 0
MEDICSPRO eligibility enabled     = 0

total digital employees           = 4
total employee bindings           = 2
total hire operations             = 2
total eligibility rows            = 0

Customer Digital-Employee Hire    = ON
Human Send                        = OFF
Gateway outbound                  = OFF
```

No runtime container was recreated by this reconciliation work.

## SECURITY / EFFECT BOUNDARY

This slice accepts only the already-materialized Organization Adapter wiring.

It does **not**:

- enable MEDICSPRO eligibility;
- create a Wandora digital employee;
- create a Paperclip agent;
- create or resume a hire operation;
- activate an employee;
- enable Human Send;
- enable Gateway outbound;
- alter another tenant;
- print/store the HMAC plaintext in Git, logs or Wandora PostgreSQL;
- destructively roll back correct desired state merely because the previous response was absent.

## RESULT

**Customer Owner First Real Tenant Organization Adapter Custody + Config + Binding Execution V1 is GREEN and live.**

The live state exactly matches ADR 0108's desired wiring contract, and the state-first recovery rule prevented duplicate effects after the last canonical checkpoint had been overtaken by production reality.

MEDICSPRO remains employee-free and tenant-ineligible.

## NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Paperclip Post-Wiring Local-Encrypted Recovery Snapshot Refresh Execution V1.**

Reuse ADR 0109's already-proven backup/custody/restore process. Refresh the protected out-of-volume DB + current `master.key` pair so it includes the newly live MEDICSPRO secret/config state, then restore/decrypt/hash-prove it on disposable isolated infrastructure.

Do not change Organization Adapter wiring, enable MEDICSPRO eligibility, create a digital employee/hire operation, enable Human Send or enable Gateway outbound in that recovery slice.

Only after the post-wiring recovery pair is current and proven should the project return to the customer-hire tenant eligibility rollout boundary.
