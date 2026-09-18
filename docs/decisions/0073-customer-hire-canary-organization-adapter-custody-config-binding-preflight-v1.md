# ADR 0073 — Customer Hire Canary Organization Adapter Custody + Config + Binding Preflight V1

- Status: **Accepted preflight — wiring NOT executed; execution blocked on Paperclip local-encrypted recovery snapshot**
- Date: 2026-09-18
- Scope: freeze the exact Wandora↔Paperclip control-plane binding, per-company HMAC custody, Paperclip secret/config contract, ordering and failure recovery for the clean customer-hire canary before any further production mutation

## REAL NOW

Canonical Git entering this preflight:

```text
main = c7fa2814f1118b43e2773e5a60774cb4320ec2d5
PR #117 = merged
PR #117 CI = all green
open PRs = 0
```

Frozen clean canary pair:

```text
Wandora organization
  id   = 918d4c7e-fccb-41f0-aba7-04105a9b4ec0
  slug = wandora-customer-hire-canary
  name = Wandora Customer Hire Canary

Paperclip provider company
  id     = e7422a00-1474-49d5-ac32-34594520015e
  name   = Wandora Customer Hire Canary
  status = active
```

The provider company has active owner access, zero agents, no Organization Adapter config and zero company secrets.

The Wandora canary still has:

```text
digital employees = 0
control-plane provider bindings = 0
digital-employee provider bindings = 0
hire operations = 0
```

Production effect switches remain:

```text
Organization Adapter = ON
Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

The existing internal Organization Adapter canary remains unchanged and healthy.

## EXISTING LIVE PATTERN

The existing internal company proves the accepted production shape:

```text
Wandora organization
  3ddc8ca6-8961-4ad3-99e0-d7f869249a61

Paperclip company
  815d499e-4231-4e6b-b7fc-67f0ba22a595

Wandora control-plane binding = exactly 1
Paperclip plugin = wandora.organization-adapter-v1@0.1.0, ready/healthy
company-scoped plugin config = present
company-scoped HMAC secret = present/active
Core HMAC custody file = present/readable
```

This preflight reuses that accepted pattern; it does not introduce a new secret store or provider-control-plane model.

## CAPABILITY AUTHORITY / OPERATOR BOUNDARY

Migrations 010/011 prove that `wandora_core_runtime` has SELECT but not INSERT on:

```text
wandora_private.control_plane_provider_bindings
```

Live privilege proof agrees:

```text
supabase_admin INSERT = true
wandora_core_runtime INSERT = false
wandora_core_runtime SELECT = true
```

Therefore the canary organization→Paperclip company binding remains an explicit operator-owned provisioning effect. Core must not auto-create it.

The future exact insert is:

```sql
INSERT INTO wandora_private.control_plane_provider_bindings
  (organization_id, provider, provider_company_ref)
VALUES
  (
    '918d4c7e-fccb-41f0-aba7-04105a9b4ec0',
    'paperclip',
    'e7422a00-1474-49d5-ac32-34594520015e'
  );
```

No `ON CONFLICT` / UPSERT is allowed. Any existing or conflicting row stops execution for reconciliation.

## CORE HMAC CUSTODY — FROZEN

ADR 0041 remains authoritative.

Core derives the filename only from SHA-256 of the frozen opaque provider company reference:

```text
sha256(e7422a00-1474-49d5-ac32-34594520015e)
= 0cbf21f19c002ca9207c67e5cdec8180641431eacdf601629b683de2a363bbd2
```

Future filename:

```text
paperclip-0cbf21f19c002ca9207c67e5cdec8180641431eacdf601629b683de2a363bbd2.hmac
```

Existing live custody shape:

```text
host directory = /opt/wandora/secrets/organization-adapter
directory mode = 0750
owner/group = wandora-admin / wandora-ops

Core mount = /run/secrets/wandora/organization-adapter
mount = read-only

existing internal HMAC file mode = 0640
Core process belongs to the wandora-ops supplementary group and can read it
```

The canary HMAC must use the same ownership/mode boundary.

The value is generated exactly once as strong random material and must never be printed, committed, written to Wandora PostgreSQL, embedded in a URL, or placed in customer-visible state.

## PAPERCLIP SECRET CONTRACT — FROZEN

The live Paperclip provider is:

```text
provider = local_encrypted
health = ok
key file = /paperclip/instances/default/secrets/master.key
```

Future canary company secret metadata:

```text
name        = Wandora Organization Adapter HMAC
key         = wandora.organization-adapter.hmac
provider    = local_encrypted
managedMode = paperclip_managed
companyId   = e7422a00-1474-49d5-ac32-34594520015e
```

Paperclip source proves company-secret create rejects an existing active company secret with the same name or key. It does not expose a request idempotency key.

Therefore secret creation is **one-shot with read-after-ambiguity reconciliation**, not blind retry.

The official CLI supports reading the secret value from an environment variable rather than argv:

```text
secrets create
  --company-id <canary company>
  --name "Wandora Organization Adapter HMAC"
  --key wandora.organization-adapter.hmac
  --provider local_encrypted
  --value-env <ephemeral variable>
```

Execution must transport the value from protected custody without putting it in the command text or logs.

Official cleanup exists through:

```text
secrets delete <secretId> --yes --confirm <secretId>
```

but deletion is only valid while the secret is not part of a successful desired plugin configuration.

## PAPERCLIP PLUGIN CONFIG — FROZEN

The installed plugin is already ready/healthy:

```text
plugin key = wandora.organization-adapter-v1
version = 0.1.0
```

The future exact company-scoped semantic config is:

```json
{
  "companyId": "e7422a00-1474-49d5-ac32-34594520015e",
  "configJson": {
    "hmacSecret": {
      "type": "secret_ref",
      "secretId": "<exact canary secret UUID returned/reconciled above>"
    }
  }
}
```

Pinned Paperclip source proves the config route:

1. requires instance-admin;
2. validates the config schema;
3. validates each secret reference belongs to the selected company;
4. synchronizes the plugin secret-reference binding;
5. upserts the company config;
6. refreshes the worker's configured-company scopes;
7. treats some worker config-notification failures as non-fatal because config may already be durable.

Therefore a lost/failed config response can be ambiguous. Blind POST replay is forbidden.

## ORDERING DECISION

The accepted future order is:

```text
recovery prerequisite
  -> operator-owned Wandora control-plane binding
  -> generate one HMAC into protected Core custody
  -> create/reconcile matching Paperclip company secret
  -> write Paperclip company-scoped plugin config LAST
  -> independent validation
```

Rationale:

- the Wandora binding is the smallest local reversible effect and is explicitly operator-owned;
- the Core file can be removed before provider config exists;
- Paperclip secret creation has official delete semantics while unreferenced;
- plugin config is the final effect because it expands the worker's authorized configured-company scope and is the hardest partial state to unwind cleanly;
- no employee is created by these steps because managed reconcile still requires the separately gated webhook/hire call.

## FAILURE / AMBIGUITY POLICY

There is no blind retry.

### Binding conflict/failure

If the exact binding is not absent before execution, stop.

If INSERT fails, do not create custody or provider secret/config.

### Core HMAC custody failure

If the new file cannot be created with the frozen ownership/mode and read-only Core mount semantics, stop.

If this slice inserted the binding and no provider effect exists, remove only that exact new binding during reviewed rollback.

### Secret-create definite failure

If Paperclip proves no matching canary secret exists, remove the newly created HMAC file and the exact new Wandora binding, then stop.

### Secret-create ambiguous result

Read the canary company's secret metadata.

- exactly one active secret with the frozen name + key + provider → adopt that secret UUID;
- zero matches → stop and recheck later before deciding whether another create is safe;
- multiple/conflicting matches → stop for operator reconciliation.

Never create a second secret merely because the original response was lost.

### Config definite failure

Read back both plugin config and secret usage.

If config is absent and the canary secret has zero references, official secret deletion + HMAC-file removal + exact binding removal may restore the pre-wiring state.

### Config ambiguous result

Reconcile using:

- GET exact company plugin config;
- exact `secret_ref`;
- secret usage/reference count;
- plugin health;
- configured-company state;
- zero canary agents/managed resources.

If the exact config is present with the exact canary secret reference, adopt success and do not POST again.

If config is absent but secret usage shows a residual reference, stop and preserve evidence for a separate recovery.

Do not use direct Paperclip SQL.

### Post-config validation failure

Once exact desired config is proven durable, do not destructively roll back merely because a later read/check failed. Preserve evidence and recover in a separate reviewed slice.

## SECOND ADVERSARIAL REVIEW

Rejected:

- letting Core create its own control-plane binding;
- generating the HMAC before the exact provider pair was proven;
- storing raw HMAC in Wandora PostgreSQL;
- using provider company IDs directly as filenames;
- passing HMAC material in argv;
- creating a new secret after an ambiguous create response;
- treating plugin config POST as safely repeatable merely because it is an upsert;
- writing plugin config before the secret/custody state is complete;
- direct Paperclip SQL cleanup;
- combining wiring with `ana-commercial-v1` hire;
- enabling Customer Digital-Employee Hire, Human Send or Gateway outbound.

## RECOVERY GAP DISCOVERED BY THIS PREFLIGHT

The live Paperclip `local_encrypted` provider reports:

> database backups and the local master key must be backed up together; either alone is insufficient to restore encrypted secret values.

Source documentation for the pinned Paperclip build confirms the same invariant.

Current live topology:

```text
Paperclip data = Docker volume wandora-paperclip-data
database backups = /paperclip/instances/default/data/backups/*.sql.gz
master key = /paperclip/instances/default/secrets/master.key
master key mode = 0600
```

The automatic database backups and the master key are therefore currently colocated on the **same Docker volume**.

A read-only search of the existing external Wandora backup locations found PostgreSQL/Wandora backups but no independently stored Paperclip `master.key` recovery copy.

This is a real recovery gap. It does not invalidate the existing internal secret, but it blocks adding a second production `local_encrypted` secret until an out-of-volume protected recovery pair is established.

## EXECUTION GATE

Before Custody + Config + Binding Execution V1 may begin, a separate reviewed recovery slice must:

1. create a fresh Paperclip database backup through the supported Paperclip backup path;
2. pair it with the exact current `master.key`;
3. copy both to a protected out-of-volume recovery location with restrictive permissions;
4. record only paths, timestamps, modes and cryptographic hashes — never key contents — in canonical evidence;
5. prove on disposable infrastructure that the pair can restore the current local-encrypted Organization Adapter secret metadata/value sufficiently for a provider secret resolution test;
6. leave the live Paperclip instance and current internal Organization Adapter semantics unchanged.

Do not treat a Docker-volume-local database backup as sufficient disaster recovery for `local_encrypted`.

## EFFECT BOUNDARY

This preflight performs **no additional production mutation**.

Still true:

```text
canary Paperclip company = active
canary Paperclip secret = absent
canary plugin config = absent
canary Wandora control-plane binding = absent
canary employees/provider employee bindings/hire operations = 0/0/0
Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

## DECISION

**Customer Hire Canary — Organization Adapter Custody + Config + Binding Preflight V1 is complete as a plan.**

The wiring contract, exact identities, deterministic custody path, order and ambiguity/recovery rules are frozen.

Execution is intentionally **BLOCKED** on the Paperclip local-encrypted recovery prerequisite discovered by the second adversarial review.

## NEXT EXECUTABLE SLICE

**Paperclip Local-Encrypted Secret Recovery Snapshot Preflight V1.**

Freeze the supported fresh database-backup command/path, protected out-of-volume paired `master.key` snapshot, hash/mode evidence, disposable restore/resolution proof and cleanup procedure.

Do not create the canary HMAC, Paperclip secret/config, Wandora binding, employee/hire operation, activation or messaging/outbound effects in that preflight.
