# Paperclip v2026.916.0 Production Upgrade Execution V1

Status: **Frozen execution contract — NOT executed**

Authority: ADR 0129. Read ADR 0128 before use.

## Candidate

```text
tag    = v2026.916.0
commit = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
digest = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
```

Never replace this with `latest` during execution.

## Pre-upgrade rollback set

Protected root:

```text
/home/wandora-admin/backups/
paperclip-v916-production-upgrade-preflight-v1-20260920T004119Z/
```

Required files/evidence:

- official `paperclip-20260920-003950.sql.gz`;
- matching `master.key`;
- PostgreSQL 18.1 custom dump `paperclip-v831-schema-faithful.dump`;
- live Compose base + execution-bridge overlay + bridge wrapper;
- exact `adapter-plugins.json`;
- exact current `wandora_mastra` package tree;
- exact current Organization Adapter package tree;
- rollback image manifest and rollback alias.

Do not print key/secret material.

## Baseline

```text
Paperclip             = v2026.831.1
image ID              = sha256:76b91ae947fe3b379223a1f4bff80318595daf31f12904927c7e88cba56486b1
migration ledger      = 229 / max 229
Ana / Wandora         = exactly 1 / paused + supervised
Ana / Paperclip       = exactly 1 / paused / wandora_mastra
Organization Adapter  = exactly 1 / ready
agents.resume         = absent
Ana wakeups/runs      = 0 / 0
Human Send            = OFF
Gateway outbound      = OFF
outbound attempts     = 0
```

If this baseline has drifted, stop and reconcile. Do not replay or silently refresh operations.

## Pre-mutation gates

1. Read canonical docs and ADRs 0126–0129.
2. Confirm current `main`, PRs and branches.
3. Confirm exact v831 runtime and baseline counts.
4. Revalidate rollback hashes, gzip, master-key equality and `pg_restore -l`.
5. Confirm no durable Paperclip drift after rollback capture. If there is drift, stop and deliberately refresh both rollback formats before upgrade.
6. Confirm exact v916 image/build metadata/digest.
7. Confirm current wrapper/overlay and extension store still match the frozen copies.
8. Prepare any compatibility-only `wandora_mastra` package outside the live store; never edit the live hash-addressed package.
9. Perform a second adversarial review.
10. Record explicit GO before production mutation.

## Production mutation order

1. Stop **only** `wandora-paperclip`.
2. Confirm the embedded PostgreSQL process is no longer owned by a running Paperclip process.
3. Promote the exact v916 image/config; keep the same data volume, HMAC custody, bridge overlay/wrapper and already-qualified Organization Adapter/adapter-store state.
4. Recreate **only** Paperclip.
5. Allow official v916 startup migrations `0231..0279` to run. No handwritten SQL patches.
6. Treat the first committed new migration as the image-only rollback boundary.
7. Require healthy v916 and complete migration ledger before any optional adapter package promotion.
8. Validate company/membership, Organization Adapter, secret_ref/binding/decrypt, Ana, adapter count, run identity and Core bridge.
9. Any live run-token smoke uses a synthetic proof identity, never the real MEDICSPRO Ana.
10. Require zero unexpected wakeups/runs/outbound.
11. Accept v916 only after every ADR 0129 success criterion is independently green.

## Irreversibility / rollback

Before any new migration commits, v831 image-only recreate is allowed **only after proving the database is unchanged**.

After any v916 migration commits, never start v831 on the migrated database. Stop v916 and restore the protected schema-faithful `pg_dump -Fc` into a clean pre-upgrade DB state, verify the matching `master.key`, restore frozen extension/wrapper state, then recreate exact v831.

The normal Paperclip logical backup remains a required independent recovery artifact but is not sufficient for exact schema rollback.

## Mandatory post-upgrade checks

- build version = `v2026.916.0`;
- build commit = `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`;
- image digest = exact frozen digest;
- health green / no unexpected restarts;
- all 49 migrations complete;
- MEDICSPRO company exactly one and memberships preserved;
- Organization Adapter exactly one / ready / no error;
- secret_ref and required binding preserved; decrypt succeeds;
- Wandora Ana exactly one / paused + supervised;
- Paperclip Ana exactly one / paused;
- `wandora_mastra` exactly one;
- `agents.resume` absent;
- real bounded run-scoped JWT / `/api/agents/me` semantics valid without waking Ana;
- Core bridge health/readiness green;
- unknown mapping still fail-closed;
- MEDICSPRO wakeups = 0;
- MEDICSPRO heartbeat runs = 0;
- outbound attempts = 0;
- Human Send OFF;
- Gateway outbound OFF.

Any red or ambiguous mandatory check is a rollback/STOP condition.

## Forbidden in this execution

The Paperclip upgrade does not authorize:

- Ana activation/resume;
- `agents.resume`;
- Human Send;
- Gateway outbound;
- Mastra upgrade;
- customer messages;
- a second adapter registration;
- an Organization Adapter behavior change;
- a migration repair performed by hand.
