# ADR 0122 — Paperclip -> Wandora/Mastra Production Execution Bridge Activation Execution V1 — Partial Production Checkpoint

- Status: **Accepted partial execution checkpoint — STOP before HMAC/runtime promotion**
- Date: **2026-09-19**
- Scope: persist the real production state reached during Activation Execution V1 so no later session repeats migration 014 or other already-completed effects after the execution tool blocked creation of the dedicated bridge HMAC.

## REAL NOW

Canonical Git entering execution:

```text
main = d44edca01790024e4cee74e8652395e25d0ec3c4
PR #169 = merged
PR #170 = merged
PR #171 = merged
```

The requested sequence followed ADR 0118 + ADR 0120 as amended by ADR 0121.

Production safety invariants entering the slice were re-proven:

```text
MEDICSPRO Ana / Wandora   = exactly 1 / commercial-assistant / paused + supervised
provider binding          = exactly 1
completed hire            = exactly 1
MEDICSPRO outbound attempts = 0

MEDICSPRO Ana / Paperclip = exactly 1 / commercial-assistant / paused / wandora_mastra
Ana wakeup requests       = 0
Ana heartbeat runs        = 0
wandora_mastra registered = 0
agents.resume             = absent
Core bridge flag          = absent / OFF
Human Send                = OFF
Gateway outbound          = OFF
```

## GATE A — HOST HYGIENE / HEADROOM — GREEN

Only previously reconciled disposable/non-live containers were removed:

- two old Paperclip proof containers;
- eight mountless Core role-probe PostgreSQL containers;
- their empty dedicated probe networks.

The two proof volumes were deliberately preserved:

```text
wandora-paperclip-local-proof-data
wandora-paperclip-adapter-proof-data
```

No live Paperclip/Core/DB volume or customer state was touched.

After cleanup:

```text
127.0.0.1:3100 owner = live wandora-paperclip only
MemAvailable         = approximately 5.8 GiB
disk headroom        = materially healthy
live runtimes        = healthy
```

## GATE B — FRESH PAPERCLIP RECOVERY SNAPSHOT — GREEN

Exactly one fresh official Paperclip manual backup was created through the pinned Paperclip CLI/native backup path:

```text
backup = paperclip-20260919-110752.sql.gz
size   = 476043 bytes
```

It was paired outside the Docker volume with the exact current `master.key` at:

```text
/home/wandora-admin/backups/paperclip-local-encrypted-20260919T110752Z/
```

Custody:

```text
directory = 0700
files     = 0600
owner     = wandora-admin
group     = wandora-ops
```

Proven:

- gzip integrity;
- source/copy hash equality for DB backup;
- source/copy hash equality for `master.key`;
- disposable embedded PostgreSQL 18 restore;
- current MEDICSPRO company present;
- current Organization Adapter config and local-encrypted secret present;
- exactly one MEDICSPRO Ana;
- Ana = `commercial-assistant / paused / wandora_mastra`;
- managed identity = `wandora.organization-adapter-v1 / ana-commercial-v1`;
- `wandora_mastra` adapter registration absent in the pre-install snapshot;
- local-encrypted value decrypts with the copied master key and matches its stored SHA-256;
- a disposable wrong master key is rejected.

Several proof-harness compatibility attempts failed before the successful restore, but each failed before mutating live state. The backup was never repeated. Final proof-only containers/files were removed.

## GATE C — PR #169 ARTIFACT PROVENANCE — GREEN

The exact PR #169 Actions artifacts remain unexpired and were retrieved.

Adapter:

```text
artifact id = 10581494403
artifact ZIP sha256 =
ad82c276239e091779aadade7a7067175505f5c4a3f9aa0b0d4e5b0024163952

tgz sha256 =
0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f
```

Core:

```text
artifact id = 10582830334
artifact ZIP sha256 =
6c9daf4528e8f18dbaff2a4d313edf7616915627e19683223bacbd4da449b2fc

archive sha256 =
b101033ac47b7f1e4695d5e2a15d288558682d38e0e508cd7d059abd0aae902d

source tree =
abacb9da0949a63210080a01bdd95b087e98d02e
```

The same exact bytes are staged, protected and hash-verified on the VPS under:

```text
/home/wandora-admin/artifacts/bridge-activation-v1/
```

No substitute/rebuild was used.

## WANDORA SCOPED BACKUP + REHEARSAL — GREEN

A fresh scoped dump of:

```text
wandora
wandora_private
```

was retained at:

```text
/home/wandora-admin/backups/wandora-bridge-activation-20260919T111915Z/
```

The dump was restored into disposable `supabase/postgres:17.6.1.136`.

The first rehearsal variants exposed laboratory-only role/ACL differences; they did not touch production and did not cause the backup to be repeated. The final rehearsal preserved the scoped ACLs and used the real operator identity `supabase_admin`.

Final rehearsal proved:

```text
scoped restore                    = OK
migration 014                     = OK
canonical verifier                = OK
MEDICSPRO real mapping            = OK
unknown Paperclip company         = fail-closed / NULL
disposable rehearsal DB           = removed
```

## PRODUCTION MIGRATION 014 — APPLIED ONCE / GREEN

Before the live effect, the exact canonical Git blobs were revalidated:

```text
migration blob =
e4f8527276bb777545bcd8a235fed8d1d43c39dc

verifier blob =
fe206e1bf47858b9e56dee028c251f9c065e6c9e
```

The live resolver was confirmed absent immediately before application.

Migration 014 was then applied exactly once as `supabase_admin` and returned:

```text
BEGIN
CREATE FUNCTION
REVOKE
GRANT
COMMENT
COMMIT
```

The canonical verifier subsequently returned:

```text
PAPERCLIP_EXECUTION_BINDING_RESOLVER_V1_OK
```

Independent live postverify proved:

- resolver exists;
- function is SECURITY DEFINER;
- `wandora_core_runtime` can execute;
- `authenticated` cannot execute;
- `anon` cannot execute;
- Paperclip MEDICSPRO company `a63f27a8-dbac-4552-a456-b3a21302226b` resolves to Wandora MEDICSPRO organization `b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5`;
- an unknown Paperclip company resolves to NULL.

**Migration 014 is now LIVE. It must not be re-applied merely because a later chat resumes the execution.**

## HMAC GATE — NOT EXECUTED

The next authorized step was creation of the dedicated execution-bridge HMAC at:

```text
/opt/wandora/stacks/core/secrets/paperclip-execution-bridge-hmac
```

Two attempts to invoke the canonical secure generation operation were blocked by the execution platform's safety layer **before remote execution**.

The command was not dispatched to the VPS. No alternate generator, indirect channel or bypass was attempted.

Therefore this slice stops here.

State at STOP:

```text
migration 014              = LIVE / verified
dedicated bridge HMAC      = NOT created by this execution
Core bridge promotion      = NOT executed
Core bridge flag           = OFF / absent
Paperclip bridge recreate  = NOT executed
wandora_mastra install     = NOT executed
agents.resume              = absent
Ana activation/resume      = NOT executed
Human Send                 = OFF
Gateway outbound           = OFF
customer messaging         = NONE
```

The live Core observed after migration remained the previous image:

```text
wandora/core:organization-adapter-candidate-af542864d267
```

Live Paperclip and Gateway also remained healthy and unchanged.

## CAPABILITY AUTHORITY / REUSE GATE

Still PASS.

No new Wandora scheduler, task engine, provider registry or lifecycle state was introduced. Paperclip remains the control-plane authority, Mastra remains behind the existing Agent Runtime boundary, and Wandora owns only the private trust/mapping/policy boundary.

## SECOND ADVERSARIAL REVIEW

Rejected:

- repeating migration 014 because the later HMAC step was blocked;
- replacing the exact PR #169 artifacts with a rebuild;
- bypassing the tool safety gate by generating the HMAC through another hidden channel;
- promoting Core without the dedicated HMAC;
- recreating Paperclip before Core is bridge-ready;
- installing the adapter before both runtimes possess the reviewed bridge contract;
- granting `agents.resume` or resuming Ana to make testing easier;
- enabling Human Send or Gateway outbound.

## DECISION

**Activation Execution V1 is PARTIALLY EXECUTED and must resume from the dedicated HMAC step, not from migration 014.**

Before continuation:

1. re-read live state;
2. prove migration 014 remains live/green;
3. prove the dedicated bridge HMAC is either absent or, if an authorized operator created it after this checkpoint, reconcile its exact custody before doing anything else;
4. do **not** re-run migration 014;
5. continue only with the ADR 0118/0120/0121 order:
   HMAC -> exact Core candidate + overlay -> readiness -> Paperclip overlay -> paused-state proof -> persistent exact adapter extraction -> single official local-directory install -> readback/test -> final paused/no-outbound proof -> STOP.

If the HMAC cannot be created through an authorized execution path, keep the bridge dormant.

## NEXT EXECUTABLE CHECKPOINT

**Resume Paperclip -> Wandora/Mastra Production Execution Bridge Activation Execution V1 at the dedicated HMAC custody gate.**

Migration 014 is already live and verified. It is not a pending step.
