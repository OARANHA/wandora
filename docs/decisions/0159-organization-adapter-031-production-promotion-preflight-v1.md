# ADR 0159 — Organization Adapter 0.3.1 Production Promotion Preflight V1

Status: **ACCEPTED / NO EFFECT / GO FOR SEPARATE PROMOTION EXECUTION**
Date: 2026-09-22

## Context

ADR 0157 implemented Organization Adapter 0.3.1 in the repository so customer-work pre-admission accepts exactly `idle | error`, while `running` and all other states remain locally rejected and Paperclip `issues.requestWakeup` remains the final invokability authority.

This preflight determines whether the qualified 0.3.1 package can safely replace the live Organization Adapter 0.3.0 without touching Ana's Paperclip lifecycle, creating customer work, running Core/Mastra/Mistral, or enabling outbound.

This slice is strictly **NO EFFECT**. No live plugin uninstall/install, config mutation, Paperclip restart, lifecycle mutation, work, issue, wakeup, run, task session, model call, migration or outbound action is authorized here.

## REAL NOW

Canonical repository:

```text
main = d4d9ecc69cce33f6b0553b8372e576c56a4d91ac
PR #214 = merged
open PRs = 0
ADR 0159 = next canonical ADR
```

CI migration on this main is complete: all nine push workflows are GREEN on GitHub-hosted `ubuntu-24.04` runners.

Production runtime:

```text
Paperclip image             = wandora/paperclip:v2026.916.0
Paperclip health            = healthy
Paperclip restarts          = 0
Organization Adapter        = exactly 1 / 0.3.0 / ready
Organization Adapter ID     = 86e77fe7-c7e4-4bee-afa3-46cdad575d0c
live package path           = /paperclip/operator-packages/wandora-organization-adapter-v1/c7bdc270b1fa13d7e3ceacba5455647bd98cc15f29e61046a2bbfad85e62ce82/package
Core                        = healthy / wandora/core:organization-adapter-candidate-61cbb34d4bfd
Ana / Wandora               = exactly 1 / active + supervised
Ana / Paperclip             = error / wandora_execution_failed_409
Ana org chain               = healthy
Ana scheduler               = disabled / interval 0 / inactive
MED-1                       = done
MED-1 live runs             = 0
MED-1 historical runs       = 2
active recovery             = none
Wandora work operations     = 1 / result_recorded
MEDICSPRO outbound attempts = 0
Human Send                  = OFF
Gateway outbound            = OFF
```

The current company-scoped plugin config readback shape contains one `hmacSecret` secret-ref and no raw secret. Its canonical response hash is:

```text
83d5cb41938ce4fdf9025b8a51c8df28e55caed70473ed40ed2f3a2835b1f326
```

## Candidate provenance

Use the **canonical CI artifact from the current main**, not the older local laboratory package.

```text
workflow              = Organization Adapter Plugin CI
run                   = 35682666013
run number            = 232
event                 = push
source SHA            = d4d9ecc69cce33f6b0553b8372e576c56a4d91ac
artifact id           = 10675810790
artifact name         = organization-adapter-plugin-d4d9ecc69cce33f6b0553b8372e576c56a4d91ac
artifact ZIP sha256   = 2a6bba462b4998736493eb70f00da90ba8f4d99117bbae384fbeb87467d9ce2f
artifact expires      = 2026-09-29T03:19:34Z
package               = paperclip-plugin-wandora-organization-adapter-0.3.1.tgz
package sha256        = 06a42a04dd0b6eff8ee377c1d4f1e40bbabce122767d0d77e92ee509d27d811d
Paperclip source pin  = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
Paperclip image       = wandora/paperclip:v2026.916.0
```

The artifact is frozen locally under:

```text
/home/wandora-admin/executions/organization-adapter-031-promotion-preflight-v1-20260922/candidate/
```

The older local disposable package hash `49bc32b4...` is not the promotion artifact. It remains valid laboratory evidence from ADR 0157, but production promotion uses the current-main CI artifact above.

## Rollback asset

The exact live 0.3.0 package has already been copied read-only into the same preflight custody root.

Rollback package:

```text
paperclip-plugin-wandora-organization-adapter-0.3.0.tgz
sha256 = c7bdc270b1fa13d7e3ceacba5455647bd98cc15f29e61046a2bbfad85e62ce82
```

Frozen live package tree hashes:

```text
README.md             34ee768efa57a45a3ff8ccafef896e837c608f1b78838ba3aed7b91d1d936df0
compatibility.json    892ec07349edc501ca9a9d48e1529556180795463a762213b44476e71657fba5
dist/manifest.js      0a953026c123ca47cb7a92117d8a75992c798a424871a9c5941b8211d764d6f8
dist/worker.js        69a2b84d582d9fe7173b048651f99137ec5c2081fd96aba144d30b0d4a2468e8
package.json          3ae4c1b040de20689b265a7a35c2fcbcdcc7ac30f5e21d0e8db452742b46e858
```

The live package path must not be deleted during promotion.

## Exact contract delta

Normalized manifest comparison proves:

```text
live version              = 0.3.0
candidate version         = 0.3.1
semantic manifest contract= identical
added capabilities        = []
removed capabilities      = []
```

Stable contract remains:

- plugin id `wandora.organization-adapter-v1`;
- API version 1;
- categories `automation, connector`;
- same nine capabilities;
- same three webhook endpoint keys;
- same managed Ana agent key/adapter/role/declared paused seed status;
- same company-scoped `hmacSecret` secret-ref schema.

The executable delta is limited to customer-work readiness:

```text
0.3.0 -> only idle accepted
0.3.1 -> idle | error accepted
running/other -> still rejected
```

## Paperclip-native promotion semantics

All semantics below come from the exact pinned Paperclip source, not master.

### Why native `upgrade` is not the selected path

`POST /api/plugins/:pluginId/upgrade` is instance-admin and dynamically deactivates/reactivates the plugin, but the route accepts only an optional package version. For a local-path plugin, `pluginLoader.upgradePlugin` falls back to the plugin's already-recorded `packagePath`.

The live package path is the immutable/hash-addressed 0.3.0 directory. The candidate will use a different hash-addressed local path.

Therefore the upgrade endpoint cannot select the new candidate local path without first mutating/replacing the live package directory, which would weaken rollback and provenance.

**Decision: do not use `upgrade` for this promotion.**

### Selected native path: soft uninstall + local-path reinstall

Paperclip's official plugin-management surface supports:

```text
DELETE /api/plugins/:pluginId        # purge omitted / false
POST   /api/plugins/install
```

Pinned source proves soft uninstall:

- requires instance-admin;
- deactivates plugin runtime/worker;
- marks the row `uninstalled`;
- does not hard-delete the plugin row;
- therefore does not cascade-delete company config.

Pinned registry source proves reinstall of the same plugin key after soft uninstall:

- reuses the existing plugin row and plugin ID;
- updates packageName/packagePath/version/manifest;
- sets lifecycle back to `installed`;
- preserves plugin-scoped data/config references.

The install route then calls lifecycle `load`, which:

- transitions to `ready`;
- activates the plugin worker immediately in the existing Paperclip process;
- does not require Paperclip process restart.

This exact non-purge reinstall pattern previously promoted the same Organization Adapter to 0.3.0 and empirically preserved:

- plugin ID;
- company config hash;
- `hmacSecret` secret-ref.

### No automatic customer work or Ana lifecycle normalization

The Organization Adapter worker `setup()` only stores its plugin context and logs readiness.

It does **not**:

- call managed-agent reconcile;
- call resume/clear-error;
- create issues;
- call `issues.requestWakeup`;
- invoke Core/Mastra/Mistral.

Those behaviors exist only behind authenticated webhook handlers.

Therefore installing/loading 0.3.1 is not a customer-work execution.

## Candidate future staging path

Execution should stage the exact CI package under persistent content-addressed Paperclip storage:

```text
/paperclip/operator-packages/wandora-organization-adapter-v1/
  06a42a04dd0b6eff8ee377c1d4f1e40bbabce122767d0d77e92ee509d27d811d/
    package/
```

The tarball must be verified before extraction and the extracted package must contain exactly the reviewed package shape:

```text
README.md
compatibility.json
dist/manifest.js
dist/worker.js
package.json
```

Staging into live Paperclip storage is **not performed by this preflight**.

## CAPABILITY AUTHORITY / REUSE GATE

```text
plugin install/uninstall/lifecycle = Paperclip instance-admin authority
company plugin config              = Paperclip company-scoped config authority
customer employee status           = Wandora
Paperclip agent lifecycle          = Paperclip
customer-work identity/result      = Wandora
run lifecycle/invokability         = Paperclip
runtime/model execution            = existing Wandora Agent Runtime
external effects                   = Wandora Human Send / Gateway
```

No new table, lifecycle state, retry engine, migration or admin bypass is required.

## SECOND ADVERSARIAL REVIEW

### A. Use Paperclip `upgrade`

Rejected for this local-path promotion because it reuses the old recorded `packagePath` and cannot point at the new immutable candidate path through the current API.

### B. Overwrite the existing 0.3.0 package directory and call upgrade/reload

Rejected. It destroys content-addressed rollback/provenance and makes ambiguous failure recovery harder.

### C. Hard uninstall with purge, then install 0.3.1

Rejected. Purge deletes plugin-scoped config through FK cascade and would unnecessarily recreate authority/state.

### D. Soft uninstall + reinstall the new reviewed local path

Accepted. It is Paperclip-native, preserves ID/config, switches package provenance explicitly and dynamically reloads the worker.

### E. Restart/recreate Paperclip after reinstall

Rejected as unnecessary. Plugin lifecycle load activates the worker in-process. A restart adds outage/risk and is not required by the pinned plugin loader.

### F. Clear/resume Ana before promotion

Rejected. ADR 0155/0156 already proved the historical `error` is provider-invokable and 0.3.1 exists specifically so Wandora does not mutate lifecycle merely to satisfy its former idle-only gate.

## Future execution sequence

A separate production execution slice may perform only this sequence:

1. reconcile exact `main`, PRs and live runtime;
2. require Paperclip/Core healthy and Organization Adapter exactly `0.3.0 / ready`;
3. require Ana unchanged `active + supervised` in Wandora and historical `error` in Paperclip;
4. require MED-1 `done`, live runs 0, active recovery none, scheduler inactive;
5. require Wandora work count 1 and outbound attempts 0;
6. verify current config hash `83d5cb...` without printing secret material;
7. verify rollback 0.3.0 package/tree hashes;
8. verify candidate run/artifact/source/hash/provenance and semantic manifest equality;
9. stage exact candidate into the frozen persistent hash-addressed path;
10. verify extracted five-file package and package version 0.3.1;
11. official instance-admin soft uninstall exactly once, **without purge**;
12. if response is ambiguous, read back plugin status/config before any further mutation;
13. require same plugin row/ID is retained and company config still exists;
14. official instance-admin local-path install exactly once from the candidate path;
15. if install response is ambiguous, read back plugin list/inspect/config before retry;
16. require exactly one Organization Adapter, same plugin ID, `0.3.1 / ready`;
17. require company config response hash unchanged and same secret-ref identity;
18. require plugin health GREEN;
19. require no Paperclip restart occurred;
20. require Ana historical status/error timestamp unchanged;
21. require MED-1 still done, live runs 0, historical runs 2, recovery none;
22. require work count still 1, outbound 0, Human Send OFF, Gateway outbound OFF;
23. STOP.

No second legitimate customer work belongs to the promotion execution.

## Ambiguity / retry rules

The two mutations are separately non-repeatable by assumption.

### Soft uninstall

If the response is lost/ambiguous:

- read plugin inspect/list/config first;
- if status is already `uninstalled`, do not uninstall again;
- if still `ready 0.3.0`, reconcile logs/state before considering one reviewed retry;
- if config disappears, STOP and use rollback evidence; never continue to install blindly.

### Install

If the response is lost/ambiguous:

- read plugin inspect/list/config first;
- if same ID is already `0.3.1 / ready`, treat install as converged;
- if `installed`/error, STOP and inspect activation failure;
- if still uninstalled with intact config, one reviewed retry may be considered only after proving no install actually landed;
- never issue repeated installs merely because the client timed out.

## Rollback

If 0.3.1 fails after reinstall:

1. do not mutate Ana/work as remediation;
2. require no work/run/outbound drift;
3. soft-uninstall failed 0.3.1 without purge;
4. reinstall exact retained 0.3.0 local package from its content-addressed path;
5. require same plugin ID, `0.3.0 / ready`;
6. require config hash/secret-ref unchanged;
7. require plugin health GREEN and all work/run/outbound counters unchanged;
8. STOP.

Do not hard-purge.

## Hard stops

STOP before or during a future execution if:

- repository main/candidate provenance changes unexpectedly;
- CI artifact is expired/unavailable without a newly qualified replacement;
- candidate package or ZIP hash differs;
- live plugin is not exactly one `0.3.0 / ready`;
- live plugin/config/secret-ref identity drifts;
- capabilities/webhooks/managed-agent declaration differ beyond version/readiness implementation;
- Paperclip/Core is unhealthy;
- Ana identity/count/org-chain/scheduler changes unexpectedly;
- a live run or active recovery exists;
- MED-1 is not `done`;
- work count is not exactly 1 before promotion;
- outbound attempts are nonzero unexpectedly;
- Human Send/Gateway outbound is enabled;
- any proposed path requires hard purge, direct SQL, lifecycle normalization, Paperclip restart or a customer-work smoke test.

## VALIDATION / NO EFFECT

This preflight performed read-only production inspection and reused already-created read-only candidate/rollback custody.

No live plugin uninstall/install, package staging into Paperclip storage, Paperclip restart, plugin config mutation, Ana lifecycle mutation, work, issue, wakeup, run, model call, migration or outbound effect occurred.

Decision: **GO for a separate Organization Adapter 0.3.1 Production Promotion Execution V1 using soft-uninstall without purge + local-path reinstall, with no Paperclip restart.**
