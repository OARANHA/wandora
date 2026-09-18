# ADR 0075 — Paperclip Local-Encrypted Secret Recovery Snapshot Execution V1

- Status: **Accepted — recovery gate cleared**
- Date: 2026-09-18
- Scope: execute ADR 0074 by creating one fresh Paperclip logical backup, pairing it outside the Docker volume with the exact current `master.key`, proving restore/decryption on disposable PostgreSQL 18 state, and cleaning all proof-only artifacts

## REAL NOW

Canonical Git entering execution:

```text
main = c3b86b40da86a6d9838a5b5f0d3675cf39ed866c
PR #119 = merged
open PRs = 0
```

Live Paperclip entering execution:

```text
image = wandora/paperclip:v2026.831.1
commit = 65ec059bde30d98c92165b24a30a540800dd1f6f
database engine = embedded PostgreSQL 18
local_encrypted = ok
master.key mode = 0600
```

Customer-hire canary entering execution remained fully unwired:

```text
Paperclip canary secrets = 0
Paperclip canary Organization Adapter config = absent
Paperclip canary agents = 0
Wandora control-plane binding = 0
Wandora digital employees = 0
Wandora hire operations = 0
```

Customer Digital-Employee Hire, Human Send and Gateway outbound remained OFF.

## EXECUTION

### Fresh official Paperclip backup

One manual instance-admin backup was triggered through the supported Paperclip CLI/API path.

Result:

```text
trigger = manual
backup = paperclip-20260918-090456.sql.gz
size = 193469 bytes
started = 2026-09-18T09:04:56.843Z
finished = 2026-09-18T09:04:58.509Z
pruned = 0
```

No second manual backup was created.

### Out-of-volume recovery pair

The exact fresh backup and the exact current Paperclip local-encrypted master key were copied to:

```text
/home/wandora-admin/backups/paperclip-local-encrypted-20260918T090456Z/
```

Retained files:

```text
paperclip-db.sql.gz
master.key
SHA256SUMS
RECOVERY_MANIFEST.txt
```

Custody:

```text
directory mode = 0700
file modes = 0600
owner = wandora-admin
group = wandora-ops
```

Integrity:

```text
gzip integrity = true
database source/copy hash match = true
master-key source/copy hash match = true

paperclip-db.sql.gz SHA-256
d8ec84c0f2ea582be508f0edf58bc5c71fd0da60b1e9ab131e333c41aa6b67dd

master.key SHA-256
19ebaca6d32123cbc3b05b9129214f11e1e7502aca574d855032e6cc92e9435a
```

No plaintext secret or key material was printed, committed or written to the Wandora business database.

## DISPOSABLE RESTORE / DECRYPTION PROOF

The proof reused the exact production Paperclip image and its embedded PostgreSQL 18 runtime.

Isolation:

```text
network = none
published ports = none
live Paperclip volume mounted = false
snapshot mount = read-only
temporary PG18 state = disposable
PostgreSQL server = Paperclip embedded PG18
```

The proof used Paperclip's own:

```text
runDatabaseRestore()
localEncryptedProvider.resolveVersion()
```

The production Paperclip image does not include a `psql` client binary even though `runDatabaseRestore()` prefers one for SQL dumps containing `COPY ... FROM stdin`.

A proof-only helper image was therefore derived locally from the exact production Paperclip image and received only the already-present local PostgreSQL 17.6 `psql` Nix closure from `supabase/postgres:17.6.1.136`.

Important boundary:

- PostgreSQL **server/restore target remained embedded PostgreSQL 18 from Paperclip**;
- PostgreSQL 17.6 was only the local `psql` client process feeding the logical dump;
- no image was downloaded;
- no network access was enabled;
- no Supabase data volume or live database was mounted;
- the helper image was deleted after the proof.

The embedded PostgreSQL runtime requires non-root execution but its native package prepares shared-library aliases on first use. The disposable container therefore prepared those aliases in its own writable container layer as root and then dropped to UID/GID `1001:987` before PostgreSQL was started.

The snapshot remained read-only throughout.

Final proof result:

```text
RESTORE_OK=true
LOCAL_ENCRYPTED_DECRYPT_OK=true
HMAC_HASH_MATCH=true
WRONG_KEY_DECRYPT_REJECTED=true
```

The recovered HMAC plaintext was never emitted. Its SHA-256 was calculated only in memory and compared with the SHA-256 of the already-custodied live internal Organization Adapter HMAC.

A newly generated disposable wrong key failed decryption as required.

## ADVERSARIAL RETRIES / FAILED HARNESS ATTEMPTS

Several proof-only harness attempts failed before a successful restore:

1. temporary `.ts` harness was treated as CJS and rejected top-level await;
2. root execution was rejected by embedded PostgreSQL;
3. non-root execution initially could not create native library aliases in the image layer;
4. `runDatabaseRestore()` initially lacked a `psql` executable and its JavaScript fallback could not process `COPY FROM stdin`.

After each failure:

- the proof container was confirmed absent;
- the retained snapshot hashes were revalidated;
- no backup/copy was repeated;
- no live Paperclip/Core/Supabase state was modified.

The final proof solved only harness/runtime compatibility and did not weaken the recovery contract.

## CLEANUP

Deleted after proof:

- temporary recovery harness;
- temporary passwd/group proof files;
- temporary copied psql-client artifact;
- temporary build contexts;
- proof-only `wandora/paperclip-recovery-proof:v1` image;
- disposable PostgreSQL state;
- wrong-key material.

Verified:

```text
residual proof container = false
disposable cleanup = true
```

The protected recovery snapshot remains.

## POST-EXECUTION VALIDATION

Live runtimes:

```text
wandora-paperclip = running, restart_count=0
wandora-core = running, restart_count=0
Organization Adapter plugin = ready / healthy
local_encrypted = ok
```

Customer-hire canary remains unchanged:

```text
Paperclip canary secrets = 0
Paperclip canary Organization Adapter config = absent
Paperclip canary agents = 0
Wandora control-plane binding = 0
Wandora digital employees = 0
Wandora hire operations = 0
```

No live Paperclip restart, secret mutation, plugin-config mutation, provider binding, employee hire, activation or outbound effect occurred.

## SECOND ADVERSARIAL REVIEW

Confirmed:

- database and master key are no longer recoverable only from the same Docker volume;
- the recovery pair is byte-gated against the live source artifacts;
- the database backup is actually restorable into disposable PostgreSQL 18 state;
- the matching master key can decrypt the existing internal Organization Adapter HMAC;
- a wrong key cannot decrypt it;
- the proof did not depend on live Paperclip state after the snapshot was mounted;
- the psql 17.6 helper was client-only and did not replace the PG18 restore target;
- all proof-only state was removed.

Residual limitation:

**this is same-host, out-of-Docker-volume recovery, not off-host/VPS-loss disaster recovery.**

That broader infrastructure backup problem remains separate and must not be represented as solved here.

## DECISION

**Paperclip Local-Encrypted Secret Recovery Snapshot Execution V1 is GREEN.**

The ADR 0073 blocker is cleared for adding the customer-hire canary Organization Adapter HMAC/secret/config/binding.

## NEXT EXECUTABLE SLICE

**Customer Hire Canary — Organization Adapter Custody + Config + Binding Execution V1.**

Execute the already-frozen ADR 0073 sequence:

```text
operator-owned Wandora control-plane binding
-> one protected deterministic Core HMAC custody file
-> one company-owned Paperclip local_encrypted secret
-> company-scoped Organization Adapter config LAST
-> independent validation
```

Keep zero digital employees/hire operations during this wiring slice.

Do not enable Customer Digital-Employee Hire, Human Send or Gateway outbound.
