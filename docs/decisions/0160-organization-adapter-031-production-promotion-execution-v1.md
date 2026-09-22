# ADR 0160 — Organization Adapter 0.3.1 Production Promotion Execution V1

Status: **EXECUTED / GREEN / PRODUCTION LIVE**
Date: 2026-09-22

## Context

ADR 0159 froze the least-authority production promotion for Organization Adapter 0.3.1:

```text
soft uninstall (purge=false)
-> same plugin row/config retained
-> local-path install of exact qualified 0.3.1 package
-> in-process worker activation
-> no Paperclip restart
```

The purpose of this execution was only to remove the Wandora-owned historical-error admission false negative before a future second legitimate MEDICSPRO work. It did not authorize that work itself.

## REAL NOW before effect

Repository:

```text
main = 76965dd4445e94a872e079a14fce5ad1e76eaaca
open PRs = 0
ADR 0159 = canonical
```

Production immediately before mutation:

```text
Paperclip                  = wandora/paperclip:v2026.916.0 / healthy / restartCount 0
Paperclip container start  = 2026-09-21T22:52:35.08332636Z
Core                       = wandora/core:organization-adapter-candidate-61cbb34d4bfd
Core image id              = sha256:6c38930a45591970fd47d699c9881a9c9bd881272028268431ba3bf1c73c2873
Core                       = healthy
Organization Adapter       = exactly 1 / 0.3.0 / ready
plugin id                  = 86e77fe7-c7e4-4bee-afa3-46cdad575d0c
plugin installOrder        = 1
plugin config SHA-256      = 83d5cb41938ce4fdf9025b8a51c8df28e55caed70473ed40ed2f3a2835b1f326
Ana / Wandora              = exactly 1 / active + supervised
Ana / Paperclip            = error / wandora_execution_failed_409
Ana updatedAt              = 2026-09-21T11:49:40.115Z
Ana scheduler              = disabled / interval 0 / inactive
MED-1                      = done
MED-1 live runs            = 0
MED-1 historical runs      = 2
active recovery            = none
Wandora work operations    = 1 / result_recorded
MEDICSPRO outbound attempts= 0
Human Send                 = OFF
Gateway outbound           = OFF
```

## Candidate and rollback verification

Canonical CI artifact remained available and unexpired:

```text
Organization Adapter Plugin CI run = 35682666013 / #232
artifact id                        = 10675810790
source SHA                         = d4d9ecc69cce33f6b0553b8372e576c56a4d91ac
artifact ZIP SHA-256               = 2a6bba462b4998736493eb70f00da90ba8f4d99117bbae384fbeb87467d9ce2f
candidate package SHA-256          = 06a42a04dd0b6eff8ee377c1d4f1e40bbabce122767d0d77e92ee509d27d811d
artifact expires                   = 2026-09-29T03:19:34Z
```

Current main differs from the artifact source only by documentation for this capability. There is zero diff under:

```text
integrations/paperclip/plugins/organization-adapter-v1/**
.github/workflows/organization-adapter-plugin-ci.yml
```

Exact retained rollback package:

```text
0.3.0 package SHA-256 = c7bdc270b1fa13d7e3ceacba5455647bd98cc15f29e61046a2bbfad85e62ce82
```

The original live 0.3.0 content-addressed directory remained present and was not overwritten.

## SECOND ADVERSARIAL REVIEW

Immediately before mutation the accepted alternatives were rechecked:

- native `upgrade`: rejected because the pinned route cannot select a new local path;
- overwrite 0.3.0 path: rejected because it destroys immutable rollback/provenance;
- hard uninstall/purge: rejected because it would cascade-delete plugin config;
- restart Paperclip: rejected because plugin load activates the worker in-process;
- clear/resume Ana: rejected because the historical Paperclip error remains invokable and 0.3.1 fixes the Wandora-side gate;
- customer-work smoke test: rejected because a real second customer work is a separate effect.

Decision remained **soft uninstall without purge + one install from the new immutable local path**.

## Execution

### 1. Candidate staging

The candidate was staged into persistent Paperclip storage at:

```text
/paperclip/operator-packages/wandora-organization-adapter-v1/
  06a42a04dd0b6eff8ee377c1d4f1e40bbabce122767d0d77e92ee509d27d811d/
    package/
```

Exact package shape:

```text
README.md
compatibility.json
dist/manifest.js
dist/worker.js
package.json
```

Live staged file hashes:

```text
README.md          dc0da55874365d5b1d007e6949840a86fa167492938910a186b8b90af86180e4
compatibility.json 892ec07349edc501ca9a9d48e1529556180795463a762213b44476e71657fba5
dist/manifest.js   4914f13903a1edd88c4b260f1f2f5fb3661f56f9c001f5a48f3dccf6a1fa3c73
dist/worker.js     1b67c6164e977f64026c925a43818a7ba04ee2c603ee7ee9c4b4cf191a3264d3
package.json       12b677454716a39c78b9e0263a25cf7c8c417e9e3ea914a3cebddaed7f655572
```

A first staging shell attempt failed on an `awk` quoting error before the persistent target directory was created. State was reconciled before retry:

```text
temporary tgz = present / exact expected hash
candidate live path = absent
```

Only then was staging retried. No plugin lifecycle mutation had occurred at that point.

### 2. Soft uninstall

Exactly one official CLI soft uninstall was dispatched with purge omitted.

Unambiguous result:

```text
plugin id  = 86e77fe7-c7e4-4bee-afa3-46cdad575d0c
version    = 0.3.0
status     = uninstalled
installOrder = 1
updatedAt  = 2026-09-22T04:01:07.944Z
```

Immediate readback proved:

- same plugin row/ID;
- config SHA-256 unchanged at `83d5cb41...b1f326`;
- old 0.3.0 package path retained;
- new 0.3.1 path staged.

No blind retry occurred.

### 3. Local-path install

Exactly one official instance-admin local-path install was dispatched from the 0.3.1 content-addressed path.

Unambiguous result:

```text
plugin id     = 86e77fe7-c7e4-4bee-afa3-46cdad575d0c
version       = 0.3.1
status        = ready
installOrder  = 1
packagePath   = /paperclip/operator-packages/wandora-organization-adapter-v1/06a42a04.../package
updatedAt     = 2026-09-22T04:01:46.506Z
```

The target diagnostics independently proved:

```text
Paperclip version = v2026.916.0
source commit     = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
deployment        = authenticated / private
health            = ok
```

Worker log:

```text
2026-09-22T04:01:47.131Z
wandora_organization_adapter_ready
```

No Paperclip restart was performed.

## Validation

### Plugin

```text
installed plugin count for key = exactly 1
plugin id                       = unchanged
version                         = 0.3.1
status                          = ready
health                          = true
registry check                  = PASS
manifest check                  = PASS
status check                    = PASS
config SHA-256                  = unchanged
```

### Paperclip/Core

```text
Paperclip health       = healthy
Paperclip restartCount = 0
Paperclip startedAt     = unchanged
Core healthz            = 200
Core readyz             = 200
```

A read-only validation initially queried Core on port 8080 and received connection refused. Container inspect proved the canonical internal port is 8788; the corrected health/readiness checks both returned 200. No Core mutation or restart occurred.

### Ana / work / run state

```text
Ana id                  = unchanged
Ana Paperclip status    = error
Ana errorReason         = wandora_execution_failed_409
Ana updatedAt           = 2026-09-21T11:49:40.115Z
Ana lastHeartbeatAt     = 2026-09-21T11:49:40.115Z
Ana org chain           = healthy

MED-1                   = done
MED-1 updatedAt         = unchanged
live runs               = 0
historical runs         = 2
active recovery         = none
recovery actions        = 0

Wandora work operations = 1 / result_recorded
outbound attempts       = 0
Human Send              = OFF
Gateway outbound        = OFF
```

### Model/run side effects

Core logs since promotion contain:

```text
wandora.agent-runtime.model-usage events = 0
```

A broad Paperclip log grep initially returned one match because the plugin manifest capability list contains the literal string `issues.wakeup`. Inspection proved the line was only:

```text
plugin-loader: plugin installed successfully
```

and not a wakeup/run event.

Therefore no new customer work, issue wakeup, Paperclip run, Core execution, Mastra call, Mistral call or outbound attempt was created by the promotion.

## Rollback status

Rollback remains immediately available through the retained immutable 0.3.0 path/package. It was not needed.

## Decision

**Organization Adapter 0.3.1 Production Promotion Execution V1 is GREEN.**

Production now runs exactly one Organization Adapter `0.3.1 / ready` with the same plugin identity and company config, without Paperclip restart and without changing the historical Ana error projection or any work/run/outbound counters.

## Boundary / next slice

This execution does **not** authorize or manufacture the second legitimate MEDICSPRO customer work.

A future second legitimate work must still originate through the accepted authenticated customer-owner path and must begin with fresh pre-effect reconciliation. Do not clear/resume Ana merely for display normalization, do not use a synthetic webhook/task as smoke test, and keep Human Send/Gateway outbound OFF unless separately authorized.
