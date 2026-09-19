# ADR 0128 — Paperclip v2026.916.0 Disposable Upgrade Compatibility Proof V1 Complete

- Date: 2026-09-19
- Status: **Accepted execution — disposable upgrade proof GREEN; v2026.916.0 is eligible for a separately reviewed production-upgrade preflight; production remains v2026.831.1**
- Governing decisions: ADR 0036, ADR 0125, ADR 0126, ADR 0127
- Scope: complete the production-derived, no-production-mutation compatibility proof for Paperclip v2026.916.0 and close all migration, extension, run-identity, Wandora/Mastra E2E, rollback and cleanup gates.

## REAL NOW

Canonical Git entering the final leg:

```text
main = d4c67dd66e8e5331c8b2f86197965ea3f864759e
PR   = #178 / capability canonicalization + upgrade proof documentation
```

Production remained unchanged throughout the disposable proof:

```text
Paperclip = wandora/paperclip:v2026.831.1 / healthy / restart 0
Core      = healthy / restart 0
Gateway   = healthy / restart 0
Web/Auth  = healthy / restart 0

MEDICSPRO / Wandora   = exactly 1 / active
Ana / Wandora         = exactly 1 / paused + supervised
Ana / Paperclip       = exactly 1 / paused / wandora_mastra
agents.resume         = absent
Ana wakeups           = 0
Ana heartbeat runs    = 0
Human Send            = OFF
Gateway outbound      = OFF
outbound attempts     = 0
```

## PROVEN EVIDENCE

### Candidate provenance

The candidate is exact and retained for provenance:

```text
tag    = v2026.916.0
commit = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
image  = wandora/paperclip-upgrade-candidate:v2026.916.0-dffc2b3
digest = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
node   = v24.21.0
```

The source checkout remains clean at the exact commit.

### Recovery pair

The protected official Paperclip recovery pair remained valid:

```text
/home/wandora-admin/backups/paperclip-local-encrypted-20260919T110752Z/
  paperclip-db.sql.gz
  master.key
  SHA256SUMS
  RECOVERY_MANIFEST.txt
```

Validation:

```text
SHA256SUMS = GREEN
gzip       = GREEN
master.key = still byte-identical to live
```

Paperclip's own `localEncryptedProvider` proved against disposable restored state:

```text
LOCAL_ENCRYPTED_DECRYPT_OK = true
VALUE_HASH_MATCH           = true
WRONG_KEY_DECRYPT_REJECTED = true
```

No plaintext secret, ciphertext or key material was printed.

### Exact extension state

The current live external-extension state was copied read-only before testing.

Byte identity was proven across the adapter store and package trees:

```text
adapter-plugins.json                         = byte-identical
wandora_mastra package                       = byte-identical
Organization Adapter package                 = byte-identical
copy manifest                                = GREEN

wandora_mastra source.tgz SHA-256
= 0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f

Organization Adapter hash-addressed package path
= a4811f1d1f8521aeaf3930979ce12784f9b55e52390e24ead85300250d383e36
```

No adapter/plugin was reinstalled in live production.

## BACKUP-FIDELITY FINDING

The first v916 migration attempt against the normal Paperclip logical-backup restore failed on:

```text
constraint "tool_connections_transport_check" of relation "tool_connections" does not exist
SQLSTATE 42704
```

This was not a v916 incompatibility.

Read-only proof established:

```text
live v831 CHECK constraints                  = 1616
live tool_connections_transport_check        = present
official logical backup CHECK constraints    = 0
official backup transport-check mentions     = 0
```

Paperclip's v831.1 and v916 backup serializer includes columns, PK, UNIQUE, FK, indexes, triggers and data but does not serialize CHECK constraints.

Migration 0255 legitimately expects the live constraint and drops it.

Decision:

- the official backup remains the canonical Paperclip logical data + local-encrypted recovery artifact;
- it is **not sufficient by itself** for schema-faithful upgrade rehearsal or exact rollback;
- never hand-patch only the constraint that happened to fail.

## SCHEMA-FAITHFUL REHEARSAL

A proof-only PostgreSQL 18.1 `pg_dump -Fc` was taken read-only from live v831 using only the live container's network namespace.

It was restored into a fresh PostgreSQL 18.1 target on an internal-only Docker network with zero published ports.

Canonical live-vs-restored schema comparison:

```text
live canonical schema SHA-256
= 379673af39dc3d8d0dfcbd7bf5c751bde96ef6fae6bb88079c13e956959f8356

proof canonical schema SHA-256
= 379673af39dc3d8d0dfcbd7bf5c751bde96ef6fae6bb88079c13e956959f8356

SCHEMA_CANONICAL_EQUAL = true
CHECK constraints       = 1616
transport check         = present
```

This dump was a disposable compatibility artifact, not a replacement for the official Paperclip recovery pair.

## GATE 6 — V916 MIGRATIONS

The exact candidate started against the schema-faithful disposable database and existing copied extension state.

It loaded exactly one external adapter:

```text
wandora_mastra@0.1.0
```

Then applied all 49 pending migrations:

```text
0231 .. 0279 = applied successfully
```

A later restart reported migrations already applied.

No manual database patch was used.

## GATE 7 — POST-MIGRATION INVARIANTS

After migration:

```text
MEDICSPRO                         = exactly 1 / active
owner membership                  = exactly 1 / active
Ana                               = exactly 1 / paused / wandora_mastra
agents.resume                     = absent
Ana wakeups                       = 0
Ana heartbeat runs                = 0
Organization Adapter              = exactly 1 / ready / v0.1.0
Organization Adapter last_error   = null
company plugin config             = exactly 1
secret_ref                        = preserved
active local_encrypted secret     = exactly 1
```

The local-encrypted decrypt / hash / wrong-key proof also passed using the v916 candidate code.

## GATE 8 — EXTENSION COMPATIBILITY

The copied current store/package was accepted without reinstall.

Official candidate readback and test evidence:

```text
adapter type             = wandora_mastra
supportsLocalAgentJwt    = true
test-environment         = HTTP 200 / PASS
Organization Adapter     = worker started / ready
external adapters loaded = exactly 1
```

The test used only a synthetic lab HMAC and disposable canonical bridge endpoint.

The live bridge HMAC was never mounted into the lab.

## GATE 9 — REAL RUN-SCOPED JWT

A synthetic disposable agent was created through the official v916 API.

Exactly one first proof wakeup/run was used for the run-token proof.

Sanitized bridge evidence:

```json
{
  "hmacValid": true,
  "runTokenPresent": true,
  "meStatus": 200,
  "tamperedStatus": 401,
  "identityExact": true,
  "targetExact": true,
  "runIdPresent": true
}
```

The run completed successfully.

Therefore:

- Paperclip v916 minted a real run-scoped local-agent token through its normal heartbeat path;
- `/api/agents/me` accepted the real run token;
- the token identity matched exact company + agent;
- a tampered token was rejected with HTTP 401;
- no Board/admin token was substituted for the run identity proof.

## GATE 10 — PAPERCLIP -> WANDORA CORE -> MASTRA E2E

A second synthetic run used:

```text
Paperclip v916 candidate
-> exact copied wandora_mastra
-> synthetic dedicated HMAC
-> disposable bridge using the real Wandora Core image
-> /api/agents/me run-token reconciliation
-> synthetic managed mapping
-> real MastraDeterministicAgentRuntime
```

Positive evidence:

```json
{
  "hmacValid": true,
  "meStatus": 200,
  "identityExact": true,
  "mappingFound": true,
  "mastraInvoked": true,
  "model": "mastra-deterministic",
  "summaryPresent": true
}
```

The run completed:

```text
status       = succeeded
exitCode     = 0
executionId  = core-mastra-<run-id>
model        = mastra-deterministic
```

### Fail-closed mapping proof

A separate synthetic **unmapped** agent used its own valid Paperclip v916 run identity.

Evidence:

```json
{
  "hmacValid": true,
  "meStatus": 200,
  "identityExact": true,
  "mappingFound": false,
  "mastraInvoked": false
}
```

Paperclip recorded:

```text
run status = failed
errorCode  = adapter_failed
error      = wandora_execution_failed_404
```

The unmapped identity therefore failed closed before Mastra execution.

### HMAC failure proof

A direct synthetic request with an invalid HMAC returned:

```text
BAD_HMAC_STATUS = 401
```

No Paperclip run or Mastra execution was created by that request.

## GATE 11 — PRODUCTION NO-DRIFT

After all disposable migration/runtime/E2E work:

```text
Paperclip production = v2026.831.1 / healthy / restart 0
Core                  = healthy / restart 0
Gateway/Web/Auth      = healthy / restart 0

Ana / Paperclip       = exactly 1 / paused / wandora_mastra
Ana wakeups           = 0
Ana heartbeat runs    = 0
agents.resume         = absent

Ana / Wandora         = exactly 1 / paused + supervised
outbound attempts     = 0

Human Send            = OFF
Gateway outbound      = OFF
```

No production employee, run, message or provider effect was used for the proof.

## GATE 12 — ROLLBACK PROOF

The production rollback ingredients remained available:

- official protected Paperclip DB backup;
- matching `master.key`;
- exact v831.1 image/digest;
- current bridge wrapper/overlay;
- exact external adapter package;
- exact Organization Adapter package.

A separate v831 rollback lab was also executed.

Before cleanup it proved:

```text
Paperclip image                = v2026.831.1
migration rows / max           = 229 / 229
CHECK constraints              = 1616
tool_connections_transport_check = present

MEDICSPRO                      = exactly 1 / active
Ana                            = exactly 1 / paused / wandora_mastra
agents.resume                  = absent
Ana wakeups                    = 0
Ana heartbeat runs             = 0
server                         = started
Organization Adapter           = initially ready
```

During cleanup, the proof bind-state directory was removed before these two rollback containers were discovered. The already-running plugin watcher then observed its package files disappear and began failing restarts.

This is classified as a **proof cleanup sequencing error**, not a rollback/runtime incompatibility:

- the rollback app had already reached server startup;
- the Organization Adapter had already reported ready;
- the rollback DB fingerprint remained exact v831;
- the event occurred only after deletion of disposable bind state;
- production was never connected or affected.

Future cleanup rule:

```text
inventory proof network endpoints
-> stop/remove every attached proof container
-> remove proof volumes/network
-> only then delete proof bind-state
```

### Production-upgrade rollback amendment

Because the official logical backup omits CHECK constraints, a future real production upgrade must protect **both**:

1. the official Paperclip backup + matching `master.key`; and
2. a fresh schema-faithful PostgreSQL 18.1 `pg_dump -Fc` taken immediately before upgrade.

The schema-faithful dump is required for exact pre-upgrade rollback, must be hash-retained through the rollback window, and must be removed under the reviewed retention procedure after the upgraded runtime is independently accepted.

## GATE 13 — CLEANUP

Final cleanup validation:

```text
proof containers = 0
proof network    = 0
proof volumes    = 0
proof state dir  = removed
synthetic HMACs  = removed
lab auth/cookie  = removed
proof DBs        = removed
```

Retained intentionally:

```text
protected official recovery pair
clean v916 source checkout at dffc2b3...
exact v916 candidate image/digest
canonical repository evidence
```

## SECOND ADVERSARIAL REVIEW

### “Disposable proof green means upgrade production now”

Rejected.

The proof establishes compatibility. Production promotion remains a separate effect with its own fresh preflight, rollback capture, compatibility re-attestation and post-upgrade validation.

### “The official Paperclip backup is enough for rollback”

Rejected for an exact schema rollback.

It remains valid for logical data/local-encrypted recovery, but its omission of CHECK constraints requires a parallel schema-faithful pre-upgrade dump for the production-upgrade rollback contract.

### “The failed first migration means v916 is unsafe”

Rejected.

The failure was reproduced only on the non-schema-faithful logical restore. The schema-faithful restore matched live exactly and all 49 migrations passed.

### “The rollback plugin crash means v831 rollback failed”

Rejected.

The plugin reached ready before cleanup. The later crash was caused by deleting the proof-only bound package directory while the rollback container was still running.

### “The synthetic E2E is weaker than production”

It is intentionally narrower in external effects but stronger for safety boundaries:

- Paperclip v916 run identity is real;
- `wandora_mastra` is the exact copied package;
- Core image is the real current Core image;
- Mastra runtime class is the real deterministic runtime;
- HMAC and mapping behavior are real;
- external providers/outbound remain disconnected.

That is sufficient for compatibility without activating Ana or messaging.

## DECISION

**Paperclip v2026.916.0 Disposable Upgrade Compatibility Proof V1 is GREEN.**

This changes the upgrade state from:

```text
NO-GO pending disposable proof
```

to:

```text
eligible for a separately reviewed Production Upgrade Preflight V1
```

It does **not** change production.

Production remains:

```text
Paperclip = v2026.831.1
Mastra    = @mastra/core 1.66.0
Ana       = paused + supervised
Human Send = OFF
Gateway outbound = OFF
```

## NEXT EXECUTABLE SLICE

**Paperclip v2026.916.0 Production Upgrade Preflight V1.**

Required preflight gates include:

1. re-read canonical docs and actual `main`;
2. revalidate current production and upstream target before any mutation;
3. re-attest/update the `wandora_mastra` compatibility manifest for v916 without changing runtime behavior;
4. capture a fresh official Paperclip backup + matching `master.key`;
5. capture a fresh protected PostgreSQL 18.1 schema-faithful `pg_dump -Fc`;
6. hash and custody both rollback artifacts;
7. freeze exact v831 image, wrapper/overlay, adapter store and both Wandora extension packages;
8. define exact production migration/recreation order and rollback trigger;
9. independently revalidate Ana paused / `agents.resume` absent / outbound OFF immediately before any upgrade execution;
10. STOP before production mutation unless a subsequent reviewed execution decision explicitly authorizes it.

Mastra upgrade, Ana activation/resume, Human Send and Gateway outbound remain separate slices.
