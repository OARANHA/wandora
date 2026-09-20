# Paperclip v2026.916.0 Production Upgrade Execution V1

Status: **EXECUTED / GREEN on 2026-09-20 — production is v2026.916.0; rollback set retained**

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

## Execution result — ADR 0130

The execution started from `main@fa666370184d31d031d5b554153786a8b708b777` and reused the already-green ADR 0128 disposable proof and ADR 0129 preflight; neither was repeated merely because the chat changed.

Pre-mutation reconciliation proved the protected rollback set still matched production. A PostgreSQL 18.1 restore of the protected `pg_dump -Fc` was compared against live with deterministic fingerprints across all 358 public base tables and matched. Live schema differed from the preflight text dump only by pg_dump's random `\\restrict/\\unrestrict` token; normalized comparison matched.

Production result:

```text
Paperclip image       = wandora/paperclip:v2026.916.0
Paperclip image ID    = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
Paperclip source      = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
health                = healthy / API status ok
restarts              = 0
migration ledger      = 278 / max 278
new ledger entries    = 49
startup pending files = 0231..0279 / applied
```

The ledger's numeric `id` is an internal sequence: the 49 new rows are `230..278` even though the migration filenames are `0231..0279`. Startup explicitly reported those 49 filenames as the pending set and completed them without migration error.

Post-upgrade acceptance:

- MEDICSPRO company and memberships preserved;
- MEDICSPRO Ana remains exactly one / `paused` in Paperclip and `paused + supervised` in Wandora;
- MEDICSPRO wakeups = 0; heartbeat runs = 0; outbound attempts = 0;
- `agents.resume` remains absent;
- Organization Adapter remains exactly one / `ready` / v0.1.0 / no error;
- company config still uses `secret_ref`; active `local_encrypted` secret and required binding remain exactly one;
- a deliberately invalid Organization Adapter signature returned `invalid_wandora_signature`; by the plugin's fixed order this occurs only after resolving/decrypting the company secret and before `managed.reconcile`, proving secret resolution without mutating the employee;
- exactly one `wandora_mastra@0.1.0` remains registered; no compatibility-only 0.1.1 package was promoted;
- the final bounded proof used Paperclip's normal service path: a synthetic issue was created in `Wandora Internal Supervised Proof`, only the proof agent was temporarily resumed, and `heartbeatService.wakeup()` let Paperclip mint the run-scoped JWT internally;
- the on-demand proof run and one timer heartbeat that fired during the brief synthetic idle window both completed `succeeded`; after drain/reconciliation the proof agent was returned to `paused`, the synthetic issue was `cancelled`, and pending proof runs were zero;
- the successful bridge run proves the internally minted token passed Core's `/api/agents/me` verification before mapping/execution; a syntactically valid forged JWT with a false signature returned 401;
- the proof path traversed `wandora_mastra -> Wandora Core -> deterministic Mastra` successfully and the proof tenant's historical outbound-attempt count remained unchanged at 4;
- unknown Paperclip company mapping remains absent/fail-closed; the Core resolver itself is unchanged by this Paperclip-only upgrade;
- Human Send and Gateway outbound remain OFF.

The first Compose recreate attempt failed during interpolation because the secret-file **path variable** was not present in that shell. Reconciliation proved the old v831 container remained exited and unchanged, so no migration had run. The recreate was then executed once with the already-canonical host path `/opt/wandora/stacks/core/secrets/paperclip-execution-bridge-hmac`; this was not a new secret and did not change custody.

No rollback was required. The protected pre-upgrade recovery set and exact v831 rollback image alias remain retained. Image-only rollback is no longer valid for this production database because v916 migrations have committed; any future rollback to v831 must follow ADR 0129's schema-faithful restore path.

No Mastra upgrade, Organization Adapter behavior change, Ana activation/resume, Human Send, Gateway outbound or customer message occurred in this slice.
