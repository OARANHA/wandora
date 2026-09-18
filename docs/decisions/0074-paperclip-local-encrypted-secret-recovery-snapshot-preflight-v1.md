# ADR 0074 — Paperclip Local-Encrypted Secret Recovery Snapshot Preflight V1

- Status: **Accepted preflight — no recovery snapshot created yet**
- Date: 2026-09-18
- Scope: freeze the supported backup, out-of-volume master-key pairing, disposable restore/decryption proof and cleanup contract required before adding another production Paperclip `local_encrypted` secret

## REAL NOW

Canonical Git entering this preflight:

```text
main = b2eea9206fb22a4274f915d85157cd515919e575
PR #118 = merged
PR #118 CI = all green
open PRs = 0
```

Live Paperclip remains on the already-pinned production build:

```text
image   = wandora/paperclip:v2026.831.1
commit  = 65ec059bde30d98c92165b24a30a540800dd1f6f
database engine = embedded PostgreSQL 18
```

The protected Board credential remains instance-admin capable.

The currently used secret provider remains:

```text
provider = local_encrypted
health   = ok
master key path = /paperclip/instances/default/secrets/master.key
master key mode = 0600
```

The latest automatic database backups are stored under:

```text
/paperclip/instances/default/data/backups/
```

Both the database backups and `master.key` currently live inside the same Docker volume:

```text
wandora-paperclip-data
```

The clean customer-hire canary remains unchanged:

```text
Wandora control-plane binding = 0
Wandora digital employees = 0
Paperclip canary secret = absent
Paperclip canary Organization Adapter config = absent
Paperclip canary agents = 0
```

Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF.

## PROVEN PAPERCLIP RECOVERY CONTRACT

Pinned Paperclip source and the live provider-health response agree:

> A `local_encrypted` restore requires both the database metadata and the exact local master key. Either artifact alone is insufficient.

Paperclip's logical backup intentionally does not include non-database instance files such as the local secret master key.

The official instance-admin API/CLI supports a fresh manual database backup:

```text
paperclipai instance database-backup
  -> POST /api/instance/database-backups
  -> server runManualBackup()
  -> logical .sql.gz backup
```

The pinned database package also exports the supported `runDatabaseRestore()` implementation used by Paperclip's own isolated worktree seeding flow.

The worktree source proves that Paperclip itself restores a logical backup into a fresh embedded PostgreSQL target before post-restore validation.

## CAPABILITY REUSE DECISION

Do not invent a Wandora-specific database dumper or secret decryptor.

The recovery proof will reuse:

- Paperclip's official instance-admin manual database backup;
- Paperclip's own logical restore implementation;
- Paperclip's own `localEncryptedProvider.resolveVersion()`;
- the exact pinned production Paperclip image/runtime.

Wandora only supplies the operator orchestration, protected out-of-volume custody and evidence/checkpoint.

## SNAPSHOT DESTINATION — FROZEN

The V1 recovery pair is stored outside the Docker volume at:

```text
/home/wandora-admin/backups/
  paperclip-local-encrypted-<UTC_TIMESTAMP>/
```

The snapshot directory is operator-owned and mode `0700`.

Canonical files:

```text
paperclip-db.sql.gz
master.key
SHA256SUMS
RECOVERY_MANIFEST.txt
```

File policy:

```text
paperclip-db.sql.gz   mode 0600
master.key            mode 0600
SHA256SUMS            mode 0600
RECOVERY_MANIFEST.txt mode 0600
owner                 wandora-admin
```

The copied `master.key` must be byte-identical to the current live key and must never be printed, committed, attached to a PR or emitted into chat/log output.

`SHA256SUMS` may contain hashes and filenames only. The manifest may record non-secret provenance such as:

- UTC snapshot timestamp;
- Paperclip image/tag and source commit;
- source backup filename;
- source/target file sizes;
- SHA-256 of database backup;
- SHA-256 of copied master-key file;
- file modes;
- restore-proof outcome.

No plaintext secret value belongs in the manifest.

## BACKUP EXECUTION — FROZEN

Future execution begins with a fresh recheck that:

- Paperclip health is green;
- `local_encrypted` health is `ok`;
- master key remains mode `0600`;
- current image/commit still match this preflight;
- the canary still has no Organization Adapter secret/config/binding.

Then:

1. trigger one manual Paperclip database backup through the official instance-admin CLI/API;
2. require a successful result and identify the exact returned backup file;
3. create a unique snapshot directory with mode `0700`;
4. copy that exact fresh database backup out of the Paperclip volume as `paperclip-db.sql.gz`;
5. copy the exact current `master.key` out of the Paperclip volume;
6. set both copied files to mode `0600`;
7. run gzip integrity validation on the copied database backup;
8. calculate SHA-256 hashes over the copied artifacts;
9. verify source and copied byte hashes match before any restore proof.

Do not reuse an older automatic backup merely because it is recent when a supported fresh manual backup can be created.

## DISPOSABLE RESTORE PROOF — FROZEN

The proof must not use the live Paperclip database, data volume, master-key path or public ports.

Use a disposable container/process based on the exact pinned production image:

```text
wandora/paperclip:v2026.831.1
```

The disposable proof uses:

- a fresh temporary embedded PostgreSQL 18 data directory;
- no published host port;
- no live Paperclip data volume;
- the snapshot directory mounted read-only;
- `PAPERCLIP_SECRETS_MASTER_KEY_FILE` pointing only to the **snapshot copy**;
- Paperclip's `runDatabaseRestore()` to restore `paperclip-db.sql.gz`.

After restore, query only the restored metadata/material of the existing internal Organization Adapter HMAC secret.

The proof then invokes:

```text
localEncryptedProvider.resolveVersion(restored encrypted material)
```

using the copied master key.

The recovered plaintext must never be printed.

Success is proven by calculating its SHA-256 in memory and comparing it with the SHA-256 of the already-custodied internal Organization Adapter HMAC value. User-visible/operator evidence records only:

```text
RESTORE_OK=true
LOCAL_ENCRYPTED_DECRYPT_OK=true
HMAC_HASH_MATCH=true
```

The raw HMAC and recovered plaintext remain undisclosed.

## NEGATIVE KEY PROOF

A second adversarial check uses the same restored encrypted material with a newly generated disposable **wrong** 32-byte master key.

Expected result:

```text
WRONG_KEY_DECRYPT_REJECTED=true
```

If the wrong key decrypts successfully, the recovery proof fails closed.

The wrong key is temporary, never persisted outside the disposable proof and is deleted with the disposable state.

This proves that the positive result actually depends on the paired snapshot key rather than only on database metadata.

## CLEANUP / RETENTION

After proof:

- stop/remove all disposable processes/containers;
- delete disposable PostgreSQL data;
- delete any wrong-key test material;
- retain only the protected recovery snapshot directory;
- do not delete or rotate the live Paperclip master key;
- do not alter the live database;
- do not alter the live Organization Adapter secret/config;
- do not restart live Paperclip unless a separately reviewed reason exists.

The retained snapshot is a V1 **same-host, out-of-Docker-volume** recovery artifact. It protects against loss/corruption/removal of the Docker volume.

It is not yet off-host disaster recovery. Full VPS-loss/off-site backup policy remains a separate infrastructure concern and must not be falsely described as solved by this slice.

## FAILURE POLICY

### Manual database backup failure

Stop. Do not copy an older backup and call the gate satisfied.

### Copy/hash mismatch

Delete the incomplete snapshot directory and stop. Never retain a recovery pair whose database/key copy does not byte-match the frozen source artifacts.

### Restore failure

Preserve non-secret diagnostics, remove the disposable restore environment and stop. Do not modify the live Paperclip instance to make the proof pass.

### Correct-key decrypt failure

Treat the snapshot as unproven. Do not add the second production HMAC secret.

### Wrong-key unexpectedly decrypts

Fail the proof and investigate before proceeding.

### Chat/tool interruption

Before rerunning any manual backup or copy, inspect the snapshot directory and Paperclip backup list to determine whether the previous operation completed. Never create redundant effects merely because the response was interrupted.

## SECOND ADVERSARIAL REVIEW

Rejected:

- relying on automatic backups that share the live Docker volume with `master.key`;
- copying only `master.key` without a paired database backup;
- copying only the database backup;
- storing `master.key` in Git, docs, chat, environment documentation or business PostgreSQL;
- printing decrypted secret values during restore proof;
- pulling a separate PostgreSQL image when the pinned Paperclip image already contains its matching embedded PostgreSQL 18/runtime;
- using production Paperclip as the restore target;
- publishing a disposable restore port;
- treating a successful metadata query as proof that encrypted values decrypt;
- calling same-host V1 snapshot full off-site disaster recovery;
- proceeding to the customer-hire canary HMAC before the restore/decrypt proof is green.

## EFFECT BOUNDARY

This preflight performs no backup copy or production mutation.

Current state remains:

```text
Paperclip live database = unchanged
Paperclip master.key = unchanged
external recovery snapshot = absent
customer-hire canary HMAC = absent
canary Paperclip secret/config = absent
canary Wandora provider binding = absent
canary employees/hire operations = 0
Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

## DECISION

**Paperclip Local-Encrypted Secret Recovery Snapshot Preflight V1 is complete.**

The supported backup path, out-of-volume custody, exact restore/decrypt proof, negative-key proof and cleanup boundary are frozen.

## NEXT EXECUTABLE SLICE

**Paperclip Local-Encrypted Secret Recovery Snapshot Execution V1.**

Create one fresh manual Paperclip database backup, pair it out-of-volume with the exact current `master.key`, hash-gate both copies, run the disposable PG18 restore + positive decryption/hash-match + wrong-key rejection proof, retain the protected recovery pair and remove only disposable proof state.

Do not create the customer-hire canary HMAC, Paperclip secret/config, Wandora binding, employee/hire operation, activation, Human Send or Gateway outbound in that execution slice.
