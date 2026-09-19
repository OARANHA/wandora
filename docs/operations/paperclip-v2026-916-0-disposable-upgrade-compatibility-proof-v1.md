# Paperclip v2026.916.0 Disposable Upgrade Compatibility Proof V1

- Date: 2026-09-19
- Status: **Runbook only — production upgrade is not authorized**
- Governing ADR: ADR 0126
- Production source baseline: `v2026.831.1 / 65ec059bde30d98c92165b24a30a540800dd1f6f`
- Candidate source: `v2026.916.0 / dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`

This runbook exists so a lost chat/tool session cannot cause an ambiguous build, pull, restore, migration or adapter action to be replayed.

## Safety boundary

The proof is production-derived but **not production-connected**.

Never:

- use the live Paperclip DB as migration target;
- mount the live Paperclip data volume into the candidate;
- mount the real Paperclip/Core execution-bridge HMAC into the lab;
- publish a proof PostgreSQL/Paperclip port;
- attach the lab to live Wandora/Core/Paperclip networks;
- install/reinstall an adapter in live Paperclip;
- grant `agents.resume`;
- activate/resume Ana;
- enable Human Send or Gateway outbound.

The retained recovery `master.key` may be used only inside the isolated recovery proof to prove existing `local_encrypted` state remains decryptable. Never print the key or plaintext secret.

## Gate 0 — reconcile ambiguous prior operations

Before starting or retrying anything, read actual host state.

Known prior dispatches:

```text
candidate tag = wandora/paperclip-upgrade-candidate:v2026.916.0-dffc2b3
postgres proof image requested = postgres:18.1-bookworm
candidate source dir = /home/wandora-admin/paperclip-upgrade-preflight-v1/source
candidate source commit = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
```

Required reconciliation:

- is a matching build process still active?
- does the exact candidate image already exist?
- what are candidate image ID/config/digest/created-at values?
- is `postgres:18.1-bookworm` already present?
- are any previous disposable lab containers/networks/volumes present?

Do not rerun a completed build or pull.

If a prior build is still running, observe it; do not start a second one.

## Gate 1 — revalidate production read-only invariants

Before creating the lab, prove current production state by read-only inspection:

```text
Paperclip image/source        = expected v2026.831.1 / 65ec059...
Core bridge                  = LIVE / healthy / ready
Paperclip                    = healthy
wandora_mastra               = exactly 1 / loaded
adapter test-environment     = previous PASS; current readback required

MEDICSPRO Ana / Wandora      = exactly 1 / paused + supervised
MEDICSPRO Ana / Paperclip    = exactly 1 / paused
wakeups                      = 0
heartbeat runs               = 0
agents.resume                = absent
Human Send                   = OFF
Gateway outbound             = OFF
outbound attempts            = 0
```

Any unexpected production drift stops the upgrade proof until reconciled.

## Gate 2 — exact artifact provenance

Candidate must be built only from:

```text
tag    = v2026.916.0
commit = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
```

Record:

- source commit;
- Git tag;
- Docker image ID;
- OCI/config digest where available;
- image entrypoint/CMD;
- build version/commit metadata.

Never substitute `:latest`.

## Gate 3 — recovery source

Use the protected post-Ana recovery pair already validated by ADR 0122:

```text
/home/wandora-admin/backups/paperclip-local-encrypted-20260919T110752Z/
  paperclip-db.sql.gz
  master.key
  SHA256SUMS
  RECOVERY_MANIFEST.txt
```

Before restore:

- verify directory/file restrictive modes;
- verify `SHA256SUMS`;
- verify gzip integrity;
- never print `master.key`;
- never print encrypted/decrypted secret material.

The snapshot stays read-only.

### Gate 3B — current external-adapter filesystem state

The protected `11:07:52Z` DB/key pair was created before the final live `wandora_mastra` installation. The external adapter registration is filesystem state, not part of that logical DB dump.

After runtime access is restored and **before** starting the lab, take read-only/hash-verifiable copies of the current live:

```text
/paperclip/adapter-plugins.json
/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
  0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f/
/paperclip/operator-packages/wandora-organization-adapter-v1/
  <current hash-addressed package path read from live state>
```

Requirements:

- read/copy only; do not edit the live store or package;
- record SHA-256 for `adapter-plugins.json`, the retained `wandora_mastra` `source.tgz` / package files and the current Organization Adapter package files;
- prove the live store contains exactly one enabled/loaded `wandora_mastra` registration before copying;
- prove the current Organization Adapter package path resolves to the already-registered `wandora.organization-adapter-v1@0.1.0` plugin expected by the restored DB/config;
- never mount the live Paperclip volume into the v916 lab;
- stage the copies into a disposable Paperclip home matching the same relative paths.

The upgrade proof is invalid if it reconstructs either Wandora extension from source or installs a fresh substitute instead of using byte-identical copies of current production artifacts.

This gate distinguishes **upgrade preservation** from **fresh adapter installation**. The candidate must first prove it can load the copied current store/package without reinstalling the adapter.

## Gate 4 — isolated PostgreSQL restore

Reuse the proven ADR 0075/0109 recovery shape.

Requirements:

```text
PostgreSQL target = 18.1
network exposure  = none/public ports none
live volumes      = not mounted
snapshot          = read-only input
```

Restore the logical dump into a disposable PostgreSQL 18.1 database.

Before running v916 migrations, record the restored baseline facts needed for comparison:

- company count and exact MEDICSPRO company;
- owner membership;
- exact managed Ana agent identity/status/adapter type;
- Organization Adapter plugin/config;
- relevant company secret + `secret_ref`;
- `wandora_mastra` adapter registration state represented in the snapshot;
- wakeup/heartbeat counts.

### Gate 4A — schema-fidelity gate for the official logical backup

The first disposable v916 startup discovered an important limitation of the official Paperclip logical backup format.

Paperclip's backup serializer restores table columns, primary keys, unique constraints, foreign keys, indexes, triggers and data, but it does not serialize PostgreSQL CHECK constraints. Direct evidence from the current production baseline:

```text
live v831 tool_connections_transport_check = PRESENT
protected logical backup SQL                = ABSENT
```

A first candidate startup against a raw restored snapshot therefore failed in migration 0255 while executing:

```sql
ALTER TABLE "tool_connections" DROP CONSTRAINT "tool_connections_transport_check";
```

That failure is a **restore-fidelity failure**, not yet evidence that the v916 migration fails against the actual production schema.

Do not repair only the named failing constraint.

Before any second v916 startup:

1. preserve the first failed lab logs/evidence;
2. discard the partially migrated disposable DB;
3. restore the protected snapshot into a fresh PostgreSQL 18.1 target;
4. generate a deterministic **read-only catalog export of every non-system CHECK constraint from the live v831 database** using `pg_constraint` + `pg_get_constraintdef()`;
5. apply that complete generated CHECK-constraint supplement only to the fresh disposable restore;
6. compare canonical schema fingerprints between live v831 and the supplemented restore for:
   - columns/defaults/nullability;
   - PK/UNIQUE/FK/CHECK constraints;
   - indexes;
   - non-internal triggers;
   - enum labels;
7. if the schema fingerprints do not match, STOP and investigate the remaining backup-fidelity gap before starting v916.

The supplement must be generated wholesale from live catalog state and hash-retained. A hand-written or target-specific `ADD CONSTRAINT` is forbidden.

This gate does not modify production. It exists only because an upgrade proof requires a schema-faithful production-derived clone, while the normal recovery backup is sufficient for data/secret recovery but not by itself for migration-compatibility testing.

## Gate 5 — pre-migration secret recovery

Reuse Paperclip's own local-encrypted resolution code, as in ADR 0109.

Required:

```text
LOCAL_ENCRYPTED_DECRYPT_OK = true
WRONG_KEY_DECRYPT_REJECTED = true
```

Compare only hashes/boolean equality. Plaintext never leaves process memory.

## Gate 6 — v916 migration

Start the exact v916 candidate against only the disposable database/state and let the official startup/migration path run.

Static audit expectations, not assumptions:

- migrations `0231..0279` are new after the current production baseline;
- Connections/grants receive the largest semantic migration;
- `0236` removes retired model-profile state;
- the retained snapshot showed no `modelProfiles/modelProfile` payload;
- `0232` preserves company-bound secrets used by organization grants, connections, company bindings or routine triggers;
- `0276` migrates recognized user-scoped AI credentials and explicitly leaves company secrets/host auth untouched;
- wakeup/chat migrations require explicit no-drift validation.

Any migration error, repair requirement, implicit fallback or unclear state = STOP / NO-GO.

Do not patch the restored DB manually to make migration pass.

## Gate 7 — post-migration state equality

Require:

- exact MEDICSPRO company preserved;
- owner membership preserved;
- Ana exactly one;
- Ana remains `paused`;
- adapter type remains `wandora_mastra`;
- Organization Adapter plugin/config preserved and loadable;
- company secret reference preserved;
- recovered secret still decrypts with protected key;
- wrong key remains rejected;
- no unexpected wakeup/heartbeat/run introduced by migration/startup.

Connections migrations may add/transform connection state according to upstream contracts, but may not silently take ownership of the Organization Adapter secret.

## Gate 8 — external adapter compatibility

First start the candidate with the **copied current adapter store + copied exact package** from Gate 3B. Do not call the install route merely to make the candidate recognize the adapter.

Use the exact retained package:

```text
@wandora/paperclip-adapter-mastra@0.1.0
source tgz sha256 =
0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f
```

Do not alter the live package directory.

Candidate proof must establish:

- the copied store is accepted without reinstall;
- adapter loads exactly once in the lab;
- official adapter readback succeeds;
- `supportsLocalAgentJwt = true`;
- `test-environment` passes with a **synthetic lab HMAC** and disposable canonical bridge endpoint;
- no live bridge HMAC is mounted or copied.

The current adapter compatibility manifest is pinned to v831.1, so a green v916 proof must result in a separately reviewed compatibility re-attestation before production promotion.

## Gate 9 — run-scoped JWT identity

Using only disposable Paperclip state:

- create/use a synthetic managed-agent run compatible with the existing bridge proof pattern;
- obtain the real v916 run-scoped local-agent token through Paperclip's normal mechanism;
- prove private `/api/agents/me` behavior;
- prove exact company + agent identity;
- prove another agent/company/token cannot impersonate the target.

Do not use a Board/admin token as a substitute.

## Gate 10 — disposable Paperclip -> Wandora/Mastra E2E

Reuse the production bridge contract but with disposable/synthetic endpoints and keys.

Required path:

```text
Paperclip v916 candidate
-> exact wandora_mastra adapter
-> synthetic dedicated HMAC
-> disposable Core-compatible bridge harness
-> run-token reconciliation back to candidate Paperclip
-> disposable organization/managed-employee mapping
-> existing Agent Runtime/Mastra deterministic behavior
```

Required proofs:

- valid mapped agent succeeds;
- unsigned/bad-HMAC request fails;
- bad/expired/wrong-company token fails;
- unknown Paperclip company mapping fails closed;
- wrong managed identity fails closed;
- paused-production Ana is never used;
- no external provider or messaging call occurs.

## Gate 11 — no-drift evidence

After the disposable candidate run, require:

```text
production Ana state          = unchanged
production wakeups/runs       = unchanged
production outbound attempts  = unchanged
Human Send                    = OFF
Gateway outbound              = OFF
```

Because the lab is isolated, any production delta is an immediate investigation blocker.

## Gate 12 — rollback proof

A Paperclip code rollback does not reverse DB migrations.

Therefore the future production-upgrade rollback contract must include:

- protected pre-upgrade Paperclip DB backup;
- matching `master.key`;
- previous exact image/source;
- previous exact bridge wrapper/overlay;
- retained exact external adapter package;
- restore procedure proven in disposable state.

The disposable proof must demonstrate that pre-v916 data can be restored from the protected pair independently of the migrated lab.

## Gate 13 — cleanup

Remove only disposable resources created by this proof.

Verify no residual:

- candidate proof containers;
- disposable PostgreSQL container/volume;
- synthetic HMAC;
- proof-only network;
- temporary operator token/auth material;
- proof harness files that contain credentials.

Retain:

- protected official recovery snapshot;
- exact source/image provenance evidence needed for a future reviewed production upgrade;
- canonical documentation/ADR checkpoint.

## GO / NO-GO rule

**GO to a separately reviewed Paperclip production-upgrade preflight** only if every gate above is green with exact evidence.

Any failed or ambiguous gate is:

```text
Paperclip production upgrade = NO-GO
production remains v2026.831.1
```

A green disposable proof is still **not** authorization to upgrade production, activate Ana or enable outbound.
