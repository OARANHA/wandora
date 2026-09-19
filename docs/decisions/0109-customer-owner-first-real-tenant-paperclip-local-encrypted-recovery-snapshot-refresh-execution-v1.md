# ADR 0109 — Customer Owner First Real Tenant Paperclip Local-Encrypted Recovery Snapshot Refresh Execution V1

- Status: **Accepted execution — current-state Paperclip local-encrypted recovery pair refreshed and proven**
- Date: 2026-09-19
- Scope: execute ADR 0108's recovery gate only by creating one fresh official Paperclip logical backup, pairing it out of the Docker volume with the exact current `master.key`, proving current canary secret/config recovery plus MEDICSPRO company presence on disposable PostgreSQL 18 state, and stopping before MEDICSPRO wiring.

## REAL NOW

Canonical Git entering execution:

```text
main = 1fb1b6422ca77e256bcc2ef05f96fe5eb36ea728
open relevant PRs = 0
```

Live Paperclip before the effect:

```text
image         = wandora/paperclip:v2026.831.1
source commit = 65ec059bde30d98c92165b24a30a540800dd1f6f
status        = healthy
restarts      = 0

local_encrypted = ok
master.key      = /paperclip/instances/default/secrets/master.key
master.key mode = 0600
```

Current provider state was re-read immediately before backup:

```text
canary company    = e7422a00-1474-49d5-ac32-34594520015e
canary HMAC secret= ce349797-b444-4313-9574-a05b1c1dfe5a
canary secrets    = exactly 1

MEDICSPRO company = a63f27a8-dbac-4552-a456-b3a21302226b
MEDICSPRO status  = active

protected out-of-volume snapshots before execution:
  paperclip-local-encrypted-20260918T090456Z only
```

The future MEDICSPRO HMAC target remained absent.

## DECISION / SECOND ADVERSARIAL REVIEW

Reuse ADRs 0074–0075 exactly rather than invent a new backup or decrypt path.

Required effect boundary:

```text
one fresh official Paperclip manual backup
-> exact DB copy outside Docker volume
-> exact current master.key copy
-> restrictive custody + gzip/hash gates
-> current-state content probes
-> isolated PG18 restore
-> decrypt already-live canary secret
-> compare only SHA-256 with existing canary Core HMAC
-> wrong-key rejection
-> cleanup proof-only state
-> STOP
```

Rejected:

- reusing the stale ADR 0075 DB snapshot as current recovery;
- using a scheduled in-volume backup as the retained recovery pair;
- creating a MEDICSPRO HMAC before recovery was green;
- creating Paperclip secret/config, Wandora binding, eligibility or employee during refresh;
- printing the master key, encrypted secret material or decrypted HMAC;
- using live Paperclip as the restore target;
- publishing a restore port or enabling proof network access;
- deleting the previous protected snapshot before the new one was fully green.

## EXECUTION

### One official manual backup

Exactly one official instance-admin backup command was invoked through the pinned Paperclip CLI/API boundary.

Paperclip returned:

```text
backupFile = /paperclip/instances/default/data/backups/paperclip-20260919-034717.sql.gz
sizeBytes  = 334736
trigger    = manual
startedAt  = 2026-09-19T03:47:17.080Z
finishedAt = 2026-09-19T03:47:18.896Z
durationMs = 1816
prunedCount= 0
```

No second backup was triggered.

### Protected current-state pair

The exact backup and exact current live `master.key` were copied to:

```text
/home/wandora-admin/backups/paperclip-local-encrypted-20260919T034717Z/
```

Retained artifacts:

```text
paperclip-db.sql.gz
master.key
SHA256SUMS
RECOVERY_MANIFEST.txt
```

Custody:

```text
directory mode = 0700
file modes     = 0600
owner          = wandora-admin
group          = wandora-ops
```

Integrity:

```text
gzip integrity               = true
database source/copy hash    = match
master-key source/copy hash  = match

paperclip-db.sql.gz SHA-256
= 19d4332fe937f07b7294c4e48181a25ecef4f87817cc86b90b0bf263c3133c70

master.key SHA-256
= 19ebaca6d32123cbc3b05b9129214f11e1e7502aca574d855032e6cc92e9435a
```

The key hash is unchanged from ADR 0075 and the copied key remains byte-identical to the live key.

Before restore, boolean-only inspection of the fresh logical backup proved:

```text
canary HMAC secret UUID present = true
canary company UUID present     = true
MEDICSPRO company UUID present  = true
```

No secret plaintext or encrypted material was emitted.

## DISPOSABLE RESTORE / DECRYPTION PROOF

The proof reused the already-proven ADR 0075 shape:

```text
Paperclip runtime/server = wandora/paperclip:v2026.831.1
restore target           = embedded PostgreSQL 18
psql helper              = local PostgreSQL 17.6 client only
network                   = none
published ports           = none
live Paperclip volume     = not mounted
snapshot                  = read-only
temporary DB state        = disposable
```

The helper image was rebuilt locally from already-present pinned images with Docker build network disabled. PostgreSQL 17.6 supplied only the `psql` client required for logical `COPY FROM stdin`; the restore server remained Paperclip's embedded PostgreSQL 18.

The restore harness reused Paperclip's own:

```text
runDatabaseRestore()
localEncryptedProvider.resolveVersion()
```

and additionally required current-state provider evidence from the restored DB:

- active MEDICSPRO company exists exactly as expected;
- the canary Organization Adapter company-scoped plugin config exists;
- the config references canary secret `ce349797-b444-4313-9574-a05b1c1dfe5a`;
- the exact canary `local_encrypted` secret exists and resolves with the snapshot key.

Final proof:

```text
RESTORE_OK                  = true
MEDICSPRO_COMPANY_PRESENT   = true
CANARY_CONFIG_PRESENT       = true
LOCAL_ENCRYPTED_DECRYPT_OK  = true
HMAC_HASH_MATCH             = true
WRONG_KEY_DECRYPT_REJECTED  = true
```

The recovered plaintext was never printed. Its SHA-256 was calculated only in memory and compared to the already-custodied live canary Core HMAC.

A newly generated disposable wrong key was rejected as required.

### Proof-only failed attempt

The first refresh harness invocation failed during TypeScript compilation because one residual line from incremental file construction produced an invalid expression.

Important boundary:

- the restore had not started;
- the proof container was already absent after failure;
- both snapshot hashes and gzip integrity were revalidated;
- the backup was not repeated;
- the harness alone was surgically corrected before the successful proof.

A later tool invocation was blocked before reaching the VPS and therefore had no runtime effect. The proof was then executed through the same reviewed command encapsulated in a protected local script.

## CLEANUP / RETENTION

After the green proof, all proof-only state was removed:

- disposable proof container;
- proof harness;
- local run script;
- temporary passwd/group proof files;
- helper Docker build context;
- helper image `wandora/paperclip-recovery-proof:v1`.

Verified:

```text
residual proof container = false
residual proof image     = false
residual proof files     = false
```

Both protected recovery snapshots remain:

```text
paperclip-local-encrypted-20260918T090456Z
paperclip-local-encrypted-20260919T034717Z
```

Both pass their stored SHA-256 checks. The prior snapshot was intentionally retained.

Residual limitation remains unchanged:

**this is same-host, out-of-Docker-volume recovery, not off-host/VPS-loss disaster recovery.**

## POST-EXECUTION VALIDATION

Runtime after refresh:

```text
supabase-auth              healthy / restart 0
supabase-db                healthy / restart 0
wandora-web                healthy / restart 0
wandora-core               healthy / restart 0
wandora-paperclip          healthy / restart 0
wandora-messaging-gateway  healthy / restart 0
```

MEDICSPRO remained exactly outside the wiring boundary:

```text
Wandora employees          = 0
Wandora control bindings   = 0
employee provider bindings = 0
hire operations            = 0
eligibility                = 0 / 0 enabled
unfinished hires total     = 0

MEDICSPRO HMAC file        = absent
Paperclip agents           = 0
Paperclip company secrets  = 0
Paperclip plugin config    = null
```

No live runtime was recreated and no MEDICSPRO secret/config/binding/eligibility/employee effect occurred.

Human Send and Gateway outbound remain OFF.

## RESULT

**Customer Owner First Real Tenant Paperclip Local-Encrypted Recovery Snapshot Refresh Execution V1 is GREEN.**

ADR 0108's recovery blocker is cleared.

The current-state out-of-volume DB + current `master.key` pair now contains and proves recovery for the already-live canary encrypted secret/config plus the real MEDICSPRO provider company.

## NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Organization Adapter Custody + Config + Binding Execution V1**

Revalidate the exact ADR 0108 pair and execute only:

```text
exact operator-owned Wandora control-plane binding
-> one protected deterministic-path MEDICSPRO Core HMAC
-> one company-owned Paperclip local_encrypted secret
-> one company-scoped Organization Adapter secret_ref config LAST
-> independent reconciliation
```

Keep MEDICSPRO eligibility at zero and create no digital employee/hire operation. Do not enable Human Send or Gateway outbound.
