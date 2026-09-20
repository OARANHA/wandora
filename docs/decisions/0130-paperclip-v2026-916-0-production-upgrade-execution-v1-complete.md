# ADR 0130 — Paperclip v2026.916.0 Production Upgrade Execution V1 Complete

- Date: 2026-09-20
- Status: **Accepted — production upgraded to v2026.916.0; Ana remains paused; outbound remains off**
- Governing decisions: ADR 0036, ADR 0125, ADR 0126, ADR 0127, ADR 0128, ADR 0129
- Execution runbook: `docs/operations/paperclip-v2026-916-0-production-upgrade-execution-v1.md`

## Decision

Promote the exact ADR 0128/0129-qualified Paperclip candidate to production and keep all employee/customer external-effect gates unchanged.

Exact live Paperclip after execution:

```text
image   = wandora/paperclip:v2026.916.0
digest  = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
commit  = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
health  = healthy / API status ok
restarts= 0
```

No Mastra upgrade, Organization Adapter repack, `wandora_mastra` repack, Ana activation/resume, Human Send or Gateway outbound is part of this decision.

## REAL NOW

Execution began from canonical:

```text
main = fa666370184d31d031d5b554153786a8b708b777
open PRs = 0
ADR 0128 disposable compatibility proof = GREEN / already complete
ADR 0129 production upgrade preflight   = GREEN / already complete
```

The disposable proof and preflight were **not** repeated because of chat/session continuity.

Production immediately before mutation was still:

```text
Paperclip = v2026.831.1
image ID  = sha256:76b91ae947fe3b379223a1f4bff80318595daf31f12904927c7e88cba56486b1
health    = healthy
restarts  = 0

migration ledger = 229 / max 229

MEDICSPRO / Paperclip = exactly 1 / active
Ana / Paperclip       = exactly 1 / paused / wandora_mastra
Ana budget            = 0
last heartbeat        = NULL
wakeups / runs        = 0 / 0

MEDICSPRO / Wandora   = exactly 1 / active
Ana / Wandora         = exactly 1 / paused + supervised
employee binding      = 1
control binding       = 1
completed hire        = 1
unfinished hire       = 0
outbound attempts     = 0

Organization Adapter  = exactly 1 / ready / v0.1.0
plugin config         = exactly 1 / secret_ref present
local_encrypted       = exactly 1
required secret bind  = exactly 1
agents.resume         = absent

Core bridge            = ON / health 200 / ready 200
Human Send             = OFF
Gateway outbound       = OFF
```

## PROVEN EVIDENCE — rollback freshness

Protected root reused exactly from ADR 0129:

```text
/home/wandora-admin/backups/
paperclip-v916-production-upgrade-preflight-v1-20260920T004119Z/
```

The execution revalidated:

- all protected SHA-256 manifest entries;
- official Paperclip backup gzip integrity;
- PostgreSQL 18.1 `pg_restore -l` against the stored restore list;
- pre-upgrade `master.key` equality immediately before mutation;
- frozen Compose base, bridge overlay and bridge wrapper;
- frozen `adapter-plugins.json`;
- byte-identical `wandora_mastra` and Organization Adapter package trees;
- exact v831 rollback image alias;
- exact v916 candidate digest/build metadata.

The rollback set was also proven still fresh, rather than blindly reused. The schema-faithful pre-upgrade dump was restored into isolated PostgreSQL 18.1 and deterministic content fingerprints were compared across **all 358 public base tables**:

```text
live table fingerprints      = 358
protected restore fingerprints= 358
durable data match           = true
```

A fresh live schema dump differed from the preflight schema text only in pg_dump's random `\\restrict/\\unrestrict` token. Applying the same normalization to both produced an exact match.

Therefore no durable Paperclip drift existed and no new backup was created merely because the chat changed.

## CAPABILITY AUTHORITY / REUSE GATE

No new Wandora-native control-plane capability was added.

The upgrade preserves the accepted boundaries:

- Wandora owns tenant/product/effect authorization;
- Paperclip remains the digital-employee organizational/control plane;
- Mastra remains execution runtime;
- `wandora_mastra` remains the execution adapter;
- Organization Adapter remains the managed-agent/control-plane bridge.

The already-qualified `wandora_mastra@0.1.0` runtime bytes were deliberately **not** repackaged during this upgrade. ADR 0128 already proves those exact bytes on v916, and ADR 0129 makes a compatibility-only package promotion optional. Avoiding an unnecessary second package mutation reduced rollback ambiguity.

## SECOND ADVERSARIAL REVIEW

Before mutation, the execution tried to invalidate GO on these grounds:

1. **Rollback set might be stale.** Rejected only after schema and all 358 public-table content fingerprints matched live.
2. **Candidate might have changed.** Rejected: exact digest, build version and build commit matched ADR 0129.
3. **Live source/config/extensions might have drifted.** Rejected: v831 source was clean and frozen wrapper/registry/package trees matched.
4. **External-effect switches might have become enabled.** Rejected: Human Send and Gateway outbound remained absent/OFF; Core bridge alone was ON/ready.
5. **The upgrade might require repackaging adapters.** Rejected: exact current adapter/plugin bytes had already passed ADR 0128.
6. **Image rollback might be enough after migration.** Rejected: ADR 0129's schema-faithful restore rule remains mandatory after the first committed v916 migration.

GO was recorded only after those challenges failed.

## EXECUTION

### Stop boundary

Only `wandora-paperclip` was stopped.

The old container was proven exited, its process tree absent and port 3100 free while Core, Web and Messaging Gateway remained healthy.

### Promotion

The live Paperclip source checkout was moved from:

```text
65ec059bde30d98c92165b24a30a540800dd1f6f
v2026.831.1
```

to the already-qualified:

```text
dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
v2026.916.0
```

without rebuilding the qualified image.

The exact candidate image was tagged as:

```text
wandora/paperclip:v2026.916.0
-> sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
```

The live Compose base changed only:

- `PAPERCLIP_BUILD_VERSION`;
- `PAPERCLIP_BUILD_COMMIT`;
- Paperclip image tag.

The bridge overlay, wrapper, HMAC custody, data volume and extension store were unchanged.

### Recreate reconciliation

The first Compose invocation failed **before container recreation** because the shell lacked the required path variable:

`WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE_HOST`.

Reconciliation proved:

- the original v831 container still existed unchanged and exited;
- no new container had started;
- port 3100 remained free;
- therefore no v916 migration had run.

The recreate was then issued exactly once using the already-canonical host path:

```text
/opt/wandora/stacks/core/secrets/paperclip-execution-bridge-hmac
```

This was not a new secret and did not change secret custody.

### Migrations / irreversibility boundary

The v916 startup reported exactly the 49 expected pending migration files:

`0231..0279`

and completed startup successfully.

Post-start ledger:

```text
count             = 278
max internal id   = 278
new ledger rows   = 49
new internal ids  = 230..278
```

The ledger's `id` is an internal sequence and is not the migration filename number. The authoritative startup log identifies the 49 files as `0231..0279`.

Because those migrations committed, production is now past ADR 0129's image-only rollback boundary.

## VALIDATION

### Version / health

```text
Paperclip image       = wandora/paperclip:v2026.916.0
image ID              = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
PAPERCLIP_BUILD_VERSION = v2026.916.0
PAPERCLIP_BUILD_COMMIT  = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
source checkout       = exact commit / clean
health                = healthy
/api/health status    = ok
restarts              = 0
Core health/ready     = 200 / 200
```

Core, Web, Messaging Gateway, Auth and Supabase DB remained healthy.

### Control plane / employee state

```text
MEDICSPRO company          = exactly 1 / active
expected memberships       = preserved / 2
MEDICSPRO Ana / Paperclip  = exactly 1 / paused / wandora_mastra
MEDICSPRO Ana / Wandora    = exactly 1 / paused + supervised
MEDICSPRO wakeups          = 0
MEDICSPRO heartbeat runs   = 0
agents.resume mentions     = 0

Organization Adapter       = exactly 1 / ready / v0.1.0 / no last_error
plugin config              = exactly 1 / secret_ref present
active local_encrypted     = exactly 1
required secret binding    = exactly 1

wandora_mastra registrations = exactly 1
wandora_mastra version       = 0.1.0
adapter test-environment     = pass
```

### Secret-resolution proof without disclosure

Direct plaintext decryption was not exposed.

Instead, the live Organization Adapter was invoked with:

- valid company/catalog/timestamp structure;
- deliberately invalid 64-hex HMAC signature.

Its fixed worker order is:

`resolve secret -> verify signature -> managed reconcile`.

The live response was:

```text
HTTP 502
error includes invalid_wandora_signature
```

Therefore the company `secret_ref` was resolved/decrypted successfully and execution stopped before `managed.reconcile`.

Exactly one expected failed diagnostic webhook receipt was created; no employee reconcile or external effect followed.

### Bounded run-token / bridge proof

The existing production-only synthetic tenant **Wandora Internal Supervised Proof** was used instead of MEDICSPRO Ana.

The exact live Paperclip `createLocalAgentJwt` implementation minted a token in memory for that existing proof agent and a synthetic run id. No token was printed or persisted.

Results:

```text
/api/agents/me with live token = 200
agent/company identity match   = true
tampered token                 = 401
wandora_mastra testEnvironment = pass
adapter execute -> Core/Mastra = exitCode 0
provider                       = wandora
executionId present            = true
```

No Paperclip wakeup or heartbeat run was created for the proof identity.

### Fail-closed / no-effect state

The Core resolver still has no binding for an unknown Paperclip company and the Core itself was not changed in this Paperclip-only upgrade. ADR 0128's unknown-mapping fail-closed proof therefore remains applicable; the live binding table also confirms no unknown mapping exists.

Final effect boundary:

```text
MEDICSPRO wakeups          = 0
MEDICSPRO heartbeat runs   = 0
MEDICSPRO outbound attempts= 0
Ana / Wandora              = paused + supervised
Ana / Paperclip            = paused
Human Send                 = OFF
Gateway outbound           = OFF
customer messages          = 0 new
```

The synthetic proof tenant also gained no wakeup/run and its historical outbound-attempt count did not increase.

## Rollback status

No rollback was required.

The ADR 0129 recovery set and exact v831 rollback image alias remain retained.

Because v916 migrations have committed:

> **do not start v831 against the current migrated database and do not treat image retagging as rollback.**

Any future return to v831 must restore the protected schema-faithful pre-upgrade database plus matching `master.key` and frozen v831 runtime/extensions.

## Result

```text
Paperclip v2026.916.0 Production Upgrade Execution V1 = GREEN / COMPLETE
production Paperclip                                  = v2026.916.0
production migrations                                 = COMPLETE
rollback                                              = NOT USED / retained
Ana                                                   = paused + supervised
agents.resume                                         = absent
Human Send                                            = OFF
Gateway outbound                                      = OFF
MEDICSPRO outbound attempts                           = 0
Mastra upgrade                                        = NOT EXECUTED
Organization Adapter behavior change                  = NOT EXECUTED
wandora_mastra repack                                 = NOT EXECUTED
```

## Next checkpoint

The next slice must not jump directly to external effects.

Next: **Customer Owner First Real Tenant Digital-Employee Activation Readiness Refresh V1**.

It should reconcile ADR 0116's earlier activation assumptions against the now-live v2026.916.0 capability/authority maps and current runtime, determine which safety capabilities are actually prerequisites, and finish with MEDICSPRO Ana still paused unless a later separately reviewed activation execution explicitly authorizes otherwise.
