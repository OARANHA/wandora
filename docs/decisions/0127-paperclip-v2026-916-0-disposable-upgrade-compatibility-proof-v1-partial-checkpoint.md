# ADR 0127 — Paperclip v2026.916.0 Disposable Upgrade Compatibility Proof V1 Partial Checkpoint

- Date: 2026-09-19
- Status: **Accepted partial checkpoint — Gates 0–5 GREEN; first Gate 6 attempt invalidated by logical-backup schema-fidelity gap; production upgrade remains NO-GO**
- Governing decisions: ADR 0036, ADR 0125, ADR 0126
- Scope: execute the production-derived disposable Paperclip v2026.916.0 compatibility proof without changing production, employee activation or outbound state.

## REAL NOW

Canonical production remains unchanged:

```text
main                         = d4c67dd66e8e5331c8b2f86197965ea3f864759e
Paperclip production         = wandora/paperclip:v2026.831.1
Paperclip source             = 65ec059bde30d98c92165b24a30a540800dd1f6f
Core                         = healthy / restart 0
Paperclip                    = healthy / restart 0
Gateway/Web/Auth             = healthy / restart 0
Core execution bridge        = ON / ready
Human Send                   = OFF
Gateway outbound             = OFF
MEDICSPRO outbound attempts  = 0
```

Live organizational state revalidated read-only:

```text
MEDICSPRO                    = exactly 1 / active
owner membership             = exactly 1 / active
Ana / Wandora                = exactly 1 / paused + supervised
Ana / Paperclip              = exactly 1 / paused / wandora_mastra
agents.resume                = absent
Paperclip Ana wakeups        = 0
Paperclip Ana heartbeat runs = 0
Wandora provider binding     = exactly 1
Wandora control-plane binding= exactly 1
hire operation               = exactly 1 / completed
```

The active Compose set proves the effect switches remain dormant:

- Core does not include `compose.human-send-proposal.yaml`;
- Messaging Gateway does not include `compose.outbound-evolution.yaml`.

## GATES 0–5 — GREEN

### Gate 0 — ambiguous operation reconciliation

The previously dispatched PostgreSQL 18.1 pull completed.

The previously dispatched candidate build was initially absent with no active build process, then later reconciled as completed without issuing a second build.

Final candidate provenance:

```text
image  = wandora/paperclip-upgrade-candidate:v2026.916.0-dffc2b3
digest = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
version= v2026.916.0
commit = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
node   = v24.21.0
```

No build process remained active.

### Gate 1 — production read-only invariants

GREEN.

Core `/healthz` and `/readyz` both returned HTTP 200.

The Paperclip adapter store contains exactly one external adapter:

```text
wandora_mastra@0.1.0
```

Live Paperclip and Wandora state matched the frozen safety boundary above.

A fresh production `test-environment` POST was deliberately not used merely to recover context because it can write audit/secret-access evidence. ADR 0125's prior PASS remains historical evidence; the new v916 test belongs in the disposable lab.

### Gate 2 — exact artifact provenance

GREEN.

The source checkout is clean and exactly:

```text
tag    = v2026.916.0
commit = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
origin = https://github.com/paperclipai/paperclip.git
```

The candidate's embedded `PAPERCLIP_BUILD_VERSION` and `PAPERCLIP_BUILD_COMMIT` match the expected tag/commit.

### Gate 3 — protected recovery pair

GREEN.

Protected pair:

```text
/home/wandora-admin/backups/paperclip-local-encrypted-20260919T110752Z/
```

Validation:

```text
directory mode       = 0700
file modes           = 0600
SHA256SUMS           = GREEN
gzip integrity       = GREEN
```

### Gate 3B — exact extension filesystem state

GREEN.

Current live paths were read/copy-only and staged outside the live Docker volume:

```text
/paperclip/adapter-plugins.json
/paperclip/adapter-plugins/package.json

/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
  0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f/

/paperclip/operator-packages/wandora-organization-adapter-v1/
  a4811f1d1f8521aeaf3930979ce12784f9b55e52390e24ead85300250d383e36/
```

The copied manifest covers 12 files and is byte-identical to live.

The Mastra adapter retained source tgz SHA-256 remains:

```text
0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f
```

The Organization Adapter live package contains the built package files but no retained `source.tgz`; compatibility proof therefore uses the byte-identical package tree at its hash-addressed live path rather than inventing an archive.

### Gate 4 — first isolated restore baseline

A PostgreSQL `18.1-bookworm` container was created on an internal-only Docker network with zero published ports.

The protected logical dump restored with:

```text
RESTORE_RC = 0
COMMIT     = yes
```

Pre-migration baseline:

```text
MEDICSPRO company              = exactly 1 / active
owner membership               = exactly 1 / active
Ana                            = exactly 1 / paused / wandora_mastra
Ana wakeups                    = 0
Ana heartbeat runs             = 0
Organization Adapter           = exactly 1 / ready / v0.1.0
plugin last_error              = null
company plugin config          = exactly 1
config hmacSecret              = secret_ref
active local_encrypted secrets = exactly 1
required plugin secret binding = exactly 1
```

### Gate 5 — secret recovery

GREEN using Paperclip's own `localEncryptedProvider.resolveVersion()`.

```text
LOCAL_ENCRYPTED_DECRYPT_OK = true
WRONG_KEY_DECRYPT_REJECTED = true
SECRET_VERSION_MATCHES     = 1
```

No secret plaintext, ciphertext or key was printed.

## FIRST GATE 6 ATTEMPT — INVALID AS UPGRADE VERDICT

The exact v916 candidate was started only against the disposable DB/home/network.

It successfully loaded the copied existing external adapter without reinstall:

```text
Loaded external adapters from plugin store
count = 1
adapter = wandora_mastra
```

It detected the exact pending migration set:

```text
0231 .. 0279
49 pending migrations
```

Startup then failed:

```text
constraint "tool_connections_transport_check" of relation "tool_connections" does not exist
SQLSTATE 42704
```

### Root cause

This is **not yet a Paperclip v916 production migration failure**.

Read-only comparison proved:

- live production v831 has `tool_connections_transport_check`;
- v831 canonical migration/snapshot metadata expects it;
- the protected official logical backup SQL does **not** contain that CHECK constraint;
- Paperclip's backup serializer emits columns, PK, UNIQUE, FK, indexes, triggers and data but does not emit CHECK constraints;
- migration 0255 legitimately expects the live constraint and drops it without `IF EXISTS`.

The failed candidate had already partially changed its disposable DB before exit, so that DB is no longer a valid pre-migration comparator.

Therefore the first Gate 6 attempt is classified:

```text
candidate compatibility verdict = NOT DETERMINED
restore-schema fidelity          = FAILED
production upgrade               = NO-GO
```

## DECISION

Do **not** hand-add only `tool_connections_transport_check`.

The second adversarial review strengthens the next proof attempt beyond a CHECK-only supplement.

Use a fresh, schema-faithful **proof-only PostgreSQL custom-format dump** of current live v831:

1. preserve first-attempt logs/evidence;
2. keep the protected official `paperclip-db.sql.gz + master.key` pair as the canonical recovery proof already validated by Gates 3/5;
3. create a temporary protected output directory outside the live Paperclip volume;
4. run `pg_dump -Fc` from an ephemeral PostgreSQL 18.1 helper that shares only the live Paperclip container's **network namespace**;
5. do not mount the live Paperclip filesystem/volume into the helper;
6. write/hash the proof-only dump on the host;
7. restore it into a fresh isolated PostgreSQL 18.1 proof target;
8. compare canonical live-vs-proof fingerprints for columns/defaults/nullability, all constraints, indexes, non-internal triggers and enum labels;
9. continue to v916 only if those fingerprints match;
10. delete the proof-only full dump during final cleanup.

The CHECK-only supplement remains useful diagnostic evidence but is superseded as the preferred execution method because it assumes CHECK constraints are the only schema class omitted by the normal Paperclip recovery serializer.

The full `pg_dump -Fc` is **not** adopted as a new production recovery mechanism. It is a temporary migration-compatibility artifact whose only purpose is to reproduce current production schema faithfully without mutating production.

## SECOND ADVERSARIAL REVIEW

### “Just add the constraint that failed”

Rejected. That could hide another omitted CHECK and bias the proof toward success.

### “The v916 migration is broken”

Not proven. The actual production schema contains the constraint that migration 0255 expects.

### “The official backup is useless”

Rejected. It remains proven for logical data + local-encrypted recovery. The newly discovered limitation is narrower: the format is not, by itself, schema-faithful enough for migration compatibility testing.

### “Run v916 directly against production to know for sure”

Rejected. The entire purpose of this slice is to establish compatibility without mutating production.

### “Ignore schema differences because the important customer rows survived”

Rejected. Migration compatibility is schema-sensitive; a green data restore alone is insufficient.

## PRODUCTION SAFETY

No production Paperclip upgrade occurred.

No production database migration occurred.

No live Paperclip volume was mounted into the lab.

No live bridge HMAC or operator token was copied into the lab.

No `agents.resume` grant was created.

Ana remains paused + supervised.

Human Send remains OFF.

Gateway outbound remains OFF.

Outbound attempts remain zero.

## NEXT

Continue the same **Paperclip v2026.916.0 Disposable Upgrade Compatibility Proof V1** from the schema-fidelity gate in:

```text
docs/operations/paperclip-v2026-916-0-disposable-upgrade-compatibility-proof-v1.md
```

Do not reuse the partially migrated first proof DB as a clean baseline.
