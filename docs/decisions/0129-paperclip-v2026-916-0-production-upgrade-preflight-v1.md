# ADR 0129 — Paperclip v2026.916.0 Production Upgrade Preflight V1

- Date: 2026-09-19/20
- Status: **Accepted preflight — production upgrade NOT executed; candidate remains v2026.916.0; execution requires a separate reviewed slice**
- Governing decisions: ADR 0036, ADR 0125, ADR 0126, ADR 0127, ADR 0128
- Scope: freeze production rollback assets, re-attest extension compatibility, define the exact upgrade/rollback contract and stop before any live Paperclip migration or recreate.

## REAL NOW

Canonical Git entering this preflight:

```text
main = 88f3176346d72f58ce6c6d50df0eac9c41616e9a
PR #178 = merged
ADRs 0126..0128 = canonical
```

Official upstream was rechecked during the preflight. `v2026.916.0` remains the latest stable release and its stable tag resolves to:

```text
tag    = v2026.916.0
commit = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
```

The local clean source checkout has multiple promotion-channel tags at the same commit, including the exact stable `v2026.916.0` tag. No target substitution occurred.

Production at preflight time:

```text
Paperclip image       = wandora/paperclip:v2026.831.1
Paperclip image ID    = sha256:76b91ae947fe3b379223a1f4bff80318595daf31f12904927c7e88cba56486b1
Paperclip health      = healthy
Paperclip restarts    = 0
migration ledger      = 229 rows / max id 229

Core image            = wandora/core:organization-adapter-candidate-0a40dac127ae
Core bridge           = ON
Human Send            = OFF / flag absent
Gateway outbound      = OFF / flag absent

MEDICSPRO / Wandora   = exactly 1 / active
Ana / Wandora         = exactly 1 / paused + supervised
provider bindings     = exactly 1
completed hires       = exactly 1
unfinished hires      = 0
outbound attempts     = 0

MEDICSPRO / Paperclip = exactly 1 / active
Ana / Paperclip       = exactly 1 / paused / wandora_mastra
Ana budget            = 0
last heartbeat        = NULL
wakeup requests       = 0
heartbeat runs        = 0
agents.resume mentions= 0

Organization Adapter  = exactly 1 / ready / v0.1.0 / last_error NULL
plugin config         = exactly 1 / secret_ref present / last_error NULL
local_encrypted       = exactly 1
secret binding        = exactly 1 / required
```

No production state above was changed by this preflight.

## QUALIFIED CANDIDATE

ADR 0128 remains the compatibility authority; its disposable proof was not repeated merely because the chat/session changed.

Exact retained candidate:

```text
image  = wandora/paperclip-upgrade-candidate:v2026.916.0-dffc2b3
tag    = v2026.916.0
commit = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
digest = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced

PAPERCLIP_BUILD_VERSION = v2026.916.0
PAPERCLIP_BUILD_COMMIT  = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
```

The candidate keeps the server command expected by the live bridge wrapper:

```text
node --import ./server/node_modules/tsx/dist/loader.mjs server/dist/index.js
```

## PROTECTED PRE-UPGRADE RECOVERY SET

A new official Paperclip backup was created through the live official `db:backup` path during this preflight:

```text
paperclip-20260920-003950.sql.gz
SHA-256 = b279ddd16aa67c76c33a47c1de649760c2d2061e6e37f22294209049471867d0
```

It was paired with the current live `master.key`; byte equality between the protected copy and the live runtime key is proven.

Protected root:

```text
/home/wandora-admin/backups/
paperclip-v916-production-upgrade-preflight-v1-20260920T004119Z/
```

Custody:

```text
root directory = 0700 / wandora-admin:wandora-ops
official backup = 0600
master.key      = 0600
schema dump     = 0600
manifests       = private
```

No key or decrypted secret material was printed or committed.

### Schema-faithful PostgreSQL 18.1 dump

Because ADRs 0127/0128 proved that Paperclip's normal logical backup omits PostgreSQL CHECK constraints, this preflight also captured:

```text
paperclip-v831-schema-faithful.dump
format   = pg_dump -Fc
client   = PostgreSQL 18.1
SHA-256  = 6e830685e30969a34826f37b212bf25eae19395b632845f40b4142e28567fbbd
bytes    = 1323602
```

The dump was restored into a fresh isolated PostgreSQL 18.1 target with no published ports.

Normalized schema comparison:

```text
live schema SHA-256
= 8f60a06a73283d9d774cff4ef5f5c9fb5131b025b2d8db752d9bcbcce3c5c612

restored schema SHA-256
= 8f60a06a73283d9d774cff4ef5f5c9fb5131b025b2d8db752d9bcbcce3c5c612

SCHEMA_FAITHFUL_RESTORE = true
```

The disposable restore container/network were removed after validation.

## FROZEN V831 ROLLBACK RUNTIME

The exact current v831 image remains present locally and was given an additional rollback alias without rebuilding it:

```text
wandora/paperclip:rollback-v2026.831.1-pre-v916-20260920T004119Z
-> sha256:76b91ae947fe3b379223a1f4bff80318595daf31f12904927c7e88cba56486b1
```

This alias is a rollback retention aid; it does not alter the running container.

The live Paperclip wrapper/overlay were copied into the protected recovery set and proved byte-identical to their sources:

```text
compose.yaml                                  = MATCH
compose.paperclip-execution-bridge.yaml       = MATCH
paperclip-bridge-secret-entrypoint.sh         = MATCH
```

The running container still uses:

```text
entrypoint =
/usr/bin/tini -- /bin/sh /run/wandora/paperclip-bridge-secret-entrypoint.sh

command =
node --import ./server/node_modules/tsx/dist/loader.mjs server/dist/index.js
```

## FROZEN EXTENSION STATE

The live `adapter-plugins.json` was copied read-only and is byte-identical to the live store.

Live adapter registration remains exactly one:

```text
type    = wandora_mastra
version = 0.1.0
path    = /paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
          0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f/package
```

The complete current `wandora_mastra` tree was copied and hash-verified byte-for-byte.

```text
source.tgz SHA-256
= 0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f
```

The complete current Organization Adapter package was also copied and hash-verified byte-for-byte:

```text
hash-addressed package
= a4811f1d1f8521aeaf3930979ce12784f9b55e52390e24ead85300250d383e36
```

No live package/store entry was edited or reinstalled.

## WANDORA_MASTRA V916 RE-ATTESTATION

ADR 0128 already proves that the exact current `@wandora/paperclip-adapter-mastra@0.1.0` runtime bytes:

- load on the exact v916 candidate without reinstall;
- retain `supportsLocalAgentJwt=true`;
- pass the official adapter test environment;
- receive a real v916 run-scoped JWT;
- reconcile `/api/agents/me`;
- traverse the current Wandora Core bridge to the real deterministic Mastra runtime;
- fail closed on unknown mapping and bad HMAC.

Therefore **no execution-code change is required for v916 compatibility**.

However, the current package metadata is intentionally stale:

```json
{
  "paperclipImage": "wandora/paperclip:v2026.831.1",
  "paperclipSourceCommit": "65ec059bde30d98c92165b24a30a540800dd1f6f"
}
```

Before a re-attested adapter package is promoted, its canonical source must change only the compatibility/provenance contract to:

```json
{
  "paperclipImage": "wandora/paperclip:v2026.916.0",
  "paperclipSourceCommit": "dffc2b3ca1b9e88fa21cb17493083e682dffd1ca",
  "adapterType": "wandora_mastra",
  "supportsLocalAgentJwt": true,
  "wandoraBridgePath": "/internal/v1/paperclip/execution"
}
```

Package immutability rule:

- do not overwrite the existing hash-addressed `0.1.0` package;
- a future compatibility-only package should be emitted as a new artifact (recommended patch version `0.1.1`);
- `index.mjs` must remain byte-identical to the v916-qualified `0.1.0` runtime code;
- the new tgz/hash must be frozen before live package promotion;
- adapter type remains exactly `wandora_mastra`;
- package replacement must result in exactly one registration, never a second adapter type/row.

The Organization Adapter's existing package is **not** repackaged as part of this Paperclip upgrade preflight. ADR 0128 proved the exact current bytes load and remain ready on v916. Its current package is preserved byte-identically for the upgrade and rollback. Metadata alignment can be handled separately rather than combining a Paperclip upgrade with an unnecessary second plugin mutation.

## MIGRATION INVENTORY

Current live ledger:

```text
count = 229
max id = 229
```

Exact candidate pending set proven by ADR 0128 and frozen again in this preflight:

```text
0231 .. 0279
49 migrations
```

No migration was executed against the live database during this preflight.

## POINT OF IRREVERSIBILITY

For rollback purposes, the upgrade has two phases.

### Before the first new migration commits

If v916 fails before any new migration is committed and the migration ledger/schema are proven unchanged, image/runtime rollback may recreate only the exact v831 runtime from the frozen image + wrapper/overlay + extension store.

### After the first v916 migration commits

The first committed migration from the `0231..0279` set is the **point of irreversibility for image-only rollback**.

After that point:

> **reverting the container image alone is forbidden.**

Rollback requires restoration of the exact pre-upgrade database from the protected schema-faithful `pg_dump -Fc`, together with the matching `master.key` and frozen v831 runtime/extensions.

The official Paperclip logical backup remains a required independent logical/local-encrypted recovery artifact, but it is not sufficient by itself for exact schema rollback because of the CHECK-constraint limitation proven by ADR 0127/0128.

## EXACT FUTURE EXECUTION ORDER

A separate **Paperclip v2026.916.0 Production Upgrade Execution V1** must use this order:

1. Re-read canonical docs and reconcile current `main`, open PRs and runtime.
2. Prove production still matches this preflight:
   - v831 exact image ID;
   - migration ledger 229/229;
   - MEDICSPRO/Ana/plugin/secret invariants;
   - Ana paused + supervised;
   - zero wakeups/runs/outbound;
   - `agents.resume` absent;
   - Human Send OFF;
   - Gateway outbound OFF.
3. Revalidate the protected rollback directory, hashes, gzip, master-key live equality and `pg_restore -l`.
4. If durable Paperclip state changed after this preflight, STOP. Reconcile the change and refresh both rollback artifacts deliberately; never assume this capture is still “immediately pre-upgrade”.
5. Revalidate exact v916 candidate ID/digest/build metadata. Never substitute `latest`.
6. Prepare the v916 Compose/source promotion and any compatibility-only `wandora_mastra` package candidate **outside the live store**. No live package mutation yet.
7. Perform the final second adversarial review and record GO/NO-GO.
8. Stop only `wandora-paperclip`.
9. Re-check that no unexpected Paperclip process still owns the embedded DB.
10. Promote the exact v916 image tag/config and recreate **only Paperclip** with:
    - the existing Paperclip data volume;
    - the existing bridge overlay;
    - the existing bridge HMAC custody/wrapper;
    - the existing copied/proven Organization Adapter and adapter-store state.
11. Permit the official v916 startup path to apply migrations `0231..0279`. Do not run handwritten SQL and do not patch a failing migration.
12. Once the first new migration commits, apply the irreversible rollback rule above.
13. Require Paperclip health + expected migration completion before any adapter/package promotion.
14. Validate v916 production invariants below.
15. Only if a compatibility-only `wandora_mastra` package was independently prepared and its runtime entrypoint is byte-identical, promote/replace it through the reviewed official adapter path. The result must still be exactly one `wandora_mastra` registration. Do not install a second copy.
16. Run the bounded identity/bridge validation without using MEDICSPRO Ana for a wakeup.
17. Perform the full post-upgrade acceptance suite.
18. If all gates are green, accept v916 and retain the rollback set through the reviewed rollback window.
19. If any mandatory gate is red/ambiguous, STOP and execute the rollback decision tree; do not continue to Ana activation or outbound.

## POST-UPGRADE SUCCESS CRITERIA

All are mandatory:

### Version/provenance

```text
Paperclip build version = v2026.916.0
Paperclip build commit  = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
image digest            = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
health                  = healthy
unexpected restarts     = 0
new migrations          = complete / no pending v916 migration
```

### Company/auth/control plane

- MEDICSPRO company remains exactly one / active;
- expected owner/company memberships are preserved;
- Organization Adapter remains exactly one / ready / no last_error;
- company config remains exactly one and still references the expected `secret_ref`;
- required secret binding remains exactly one;
- current `local_encrypted` value remains decryptable with the matching key;
- wrong-key decrypt remains rejected if a bounded verification is executed.

### Digital employee / adapter

- Wandora MEDICSPRO still has exactly one Ana;
- Wandora Ana remains `paused + supervised`;
- Paperclip MEDICSPRO still has exactly one Ana;
- Paperclip Ana remains `paused`;
- adapter type remains `wandora_mastra`;
- exactly one `wandora_mastra` registration exists;
- Organization Adapter/package paths are expected;
- `agents.resume` remains absent.

### Run identity / bridge

- v916 run-scoped local-agent JWT semantics remain valid;
- `/api/agents/me` accepts a genuine bounded proof token and rejects tampering;
- proof identity resolves to exact synthetic proof company/agent;
- Core execution bridge remains enabled/healthy/ready;
- unknown mapping remains fail-closed;
- MEDICSPRO Ana is not awakened merely to prove the bridge.

Any required live run-token smoke must use a dedicated synthetic proof identity with no customer/outbound capability and must be separately cleaned/reconciled. The already-green ADR 0128 disposable proof is not rerun as a substitute for live post-upgrade acceptance.

### No effects

```text
MEDICSPRO Ana wakeups       = 0
MEDICSPRO heartbeat runs    = 0
MEDICSPRO outbound attempts = 0
Human Send                  = OFF
Gateway outbound            = OFF
customer messages           = 0 new
```

## ROLLBACK TRIGGERS

Rollback is mandatory for any of:

- migration error, partial migration ambiguity or unexpected manual-repair requirement;
- v916 health/readiness failure not attributable to a proven non-DB transient;
- version/commit/digest mismatch;
- company/membership loss or duplication;
- Organization Adapter not ready;
- secret_ref/binding/decrypt regression;
- Ana count/status/autonomy drift;
- adapter registration duplication or load failure;
- run-scoped identity regression;
- Core bridge readiness failure caused by the upgrade;
- unexpected wakeup/run;
- any outbound attempt/message;
- any state that cannot be independently reconciled before proceeding.

## ROLLBACK DECISION TREE

### No new migration committed

1. stop failed v916 Paperclip;
2. prove live DB migration ledger/schema still equals the pre-upgrade baseline;
3. restore the frozen v831 Compose/wrapper/adapter-store/package state if changed;
4. recreate only Paperclip from the rollback alias / exact v831 image ID;
5. validate v831 health, MEDICSPRO/Ana/plugin/secrets, zero runs/outbound.

### One or more v916 migrations committed

1. stop v916 Paperclip immediately;
2. do not start v831 against the migrated DB;
3. preserve the failed migrated DB only as bounded diagnostic evidence if storage allows;
4. restore the pre-upgrade schema-faithful custom dump into a clean v831-compatible PostgreSQL state;
5. restore/verify the matching pre-upgrade `master.key`;
6. restore the frozen v831 Compose/bridge wrapper, adapter store, `wandora_mastra` and Organization Adapter package state;
7. recreate only Paperclip with exact v831 image ID;
8. require migration ledger/schema to match the frozen v831 baseline;
9. validate MEDICSPRO/company/membership/Ana/plugin/secret state and zero outbound;
10. keep production stopped/NO-GO if exact rollback cannot be proved.

The official logical backup + matching key remains an independent recovery fallback and reconciliation source, not a substitute for the schema-faithful dump in this post-migration rollback path.

## SECOND ADVERSARIAL REVIEW

### “ADR 0128 is green, so backups can be skipped”

Rejected. ADR 0128 used production-derived disposable state; a real upgrade needs fresh rollback artifacts tied to the actual pre-upgrade DB/key/runtime.

### “The latest automatic logical backup is enough”

Rejected. The normal backup is not schema-faithful and the user requested an explicit new official pre-upgrade backup.

### “The custom pg_dump exists, so no restore verification is needed”

Rejected. The fresh dump was restored and its normalized schema was proven equal to live before accepting it as a rollback artifact.

### “The old v831 image can be rebuilt if rollback is needed”

Rejected. The exact existing 6.59 GB image is retained locally under a dedicated rollback alias; rollback must not depend on a future rebuild.

### “Update the Organization Adapter package at the same time”

Rejected for this upgrade. Exact current bytes are already v916-qualified by ADR 0128. Combining a second plugin package mutation creates avoidable rollback ambiguity.

### “Current wandora_mastra compatibility.json means v916 is incompatible”

Rejected as a runtime conclusion. ADR 0128 proved the exact runtime bytes on v916. The file is stale provenance metadata and must be corrected in a new immutable package artifact before that re-attested package itself is promoted.

### “Just edit compatibility.json inside the live package”

Rejected. The live hash-addressed package is immutable rollback evidence.

### “If v916 fails after migrations, switch image back to v831”

Rejected. Image-only rollback is invalid after the first committed new migration.

### “Use Ana to prove /api/agents/me after upgrade”

Rejected. The upgrade must not wake the real customer employee. A bounded synthetic proof identity is required if a live run-token smoke is needed.

### “The preflight backup stays fresh forever”

Rejected. The execution must reconcile whether Paperclip durable state changed after capture; drift requires an explicit refreshed recovery set before mutation, not blind reuse or blind repetition.

## DECISION

```text
Paperclip v2026.916.0 Production Upgrade Preflight V1 = GREEN
production upgrade                                      = NOT EXECUTED
candidate                                               = FROZEN / v2026.916.0
rollback assets                                         = GREEN / verified
Ana                                                     = paused + supervised
agents.resume                                           = absent
Human Send                                              = OFF
Gateway outbound                                        = OFF
outbound attempts                                       = 0
```

The next executable slice is:

**Paperclip v2026.916.0 Production Upgrade Execution V1**

It must start from REAL NOW and may proceed only if this preflight's no-drift and rollback gates still hold.

## EFFECT BOUNDARY

This preflight did not:

- change the live Paperclip image/version;
- apply v916 migrations to the live database;
- recreate Paperclip;
- change Mastra;
- install/reinstall a live adapter/plugin;
- change any live secret;
- grant `agents.resume`;
- activate/resume Ana;
- enable Human Send;
- enable Gateway outbound;
- send any customer message or other external effect.
