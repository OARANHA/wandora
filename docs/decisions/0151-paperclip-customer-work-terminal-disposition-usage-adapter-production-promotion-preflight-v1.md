# ADR 0151 — Paperclip Customer-Work Terminal Disposition + Usage Adapter Production Promotion Preflight V1 — NO EFFECT

Date: 2026-09-21  
Status: **Accepted preflight — GO for a separate production execution slice; zero production mutation**

Builds on: ADR 0118, ADR 0138, ADR 0145, ADR 0148, ADR 0150

## Decision summary

The repository-qualified `wandora_mastra@0.4.0` remediation is ready for a separately reviewed production promotion.

This preflight performed no adapter install, no Paperclip restart/recreate, no issue mutation, no customer work, no model call and no outbound action.

The future execution is narrowly authorized to:

1. stage the exact 0.4.0 package under persistent Paperclip content-addressed storage;
2. replace the single live `wandora_mastra@0.3.0` registration exactly once through Paperclip's official instance-admin local-path adapter install boundary;
3. restart/recreate only Paperclip because replacement is expected to require restart;
4. validate health, adapter load, bridge environment and the existing MEDICSPRO safety state;
5. only after 0.4.0 is healthy, terminalize the historical MED-1 issue from `blocked` to `done` through Paperclip's authenticated board issue-update API/CLI, with no comment, resume, reassignment or run identity;
6. validate that historical run count/model-call count/outbound count did not increase.

The historical first work must not be replayed and its historical two-run evidence must remain intact.

## REAL NOW

Canonical repository:

```text
main = c44634ea8f03b491db32fbde9917a2b7a7fcbd16
PR #204 = merged
ADR 0150 = canonical
```

Production runtime:

```text
Paperclip image     = wandora/paperclip:v2026.916.0
Paperclip health    = healthy
live adapter type   = wandora_mastra
live adapter version= 0.3.0
loaded              = true
disabled            = false
supportsLocalAgentJwt = true
live registration count = exactly 1
adapter test-environment = PASS

Core model calls historical = exactly 1
Core model usage           = 333 input / 372 output / 705 total / 0 cached
Wandora work operations    = exactly 1
Paperclip historical runs  = exactly 2
outbound attempts          = 0
Human Send                 = OFF
Gateway outbound           = OFF
Ana / Wandora              = active + supervised
```

The live registry points to:

```text
/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
78e4b57ee2f12a898f697f5b9c491e820d8f68d589fce55a3fdde1fc4ed82798/
package
```

and reports package version `0.3.0`.

## PROVEN CANDIDATE ARTIFACT

The exact current-main package was independently rebuilt with the same deterministic recipe as CI:

- clone exact `main@c44634ea...`;
- run `npm pack` twice;
- require equal names and equal SHA-256;
- require the tarball to contain only:
  - `package/README.md`
  - `package/compatibility.json`
  - `package/index.mjs`
  - `package/package.json`;
- reject embedded development/local URL endpoints, private keys and bearer literals.

Frozen candidate:

```text
package  = wandora-paperclip-adapter-mastra-0.4.0.tgz
sha256   = 6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c
source   = c44634ea8f03b491db32fbde9917a2b7a7fcbd16
Paperclip image = wandora/paperclip:v2026.916.0
Paperclip source= dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
adapter type    = wandora_mastra
```

Preflight asset root:

```text
/home/wandora-admin/preflights/
paperclip-customer-work-terminal-promotion-v1/
```

Candidate root:

```text
.../candidate-0.4.0/
```

The PR-head package files that passed the final 7/7 CI round are blob-identical to the four package files now on merged `main`.

Final disposable E2E evidence from PR #204:

```text
PAPERCLIP_WANDORA_CUSTOMER_WORK_SINGLE_RUN_COMPLETION_OK
customer_work_run_count          = 1
customer_work_continuation_count = 0
customer_work_usage              = 11|7|2
run_status                       = succeeded
```

## PROVEN ROLLBACK

The exact pre-promotion live registry and live 0.3.0 package were copied read-only to:

```text
.../rollback-0.3.0/
```

Frozen hashes:

```text
adapter-plugins.json
  cecc516bb05bcb076f148e24a645cbe174869e8826d9f1e9df4723e3253e7af1

package.tgz
  78e4b57ee2f12a898f697f5b9c491e820d8f68d589fce55a3fdde1fc4ed82798

package.json
  296fc0faac0ffb50fbc39557255aa43ef95c3ee7f0ca111ad7a65dfc57ebccc3

index.mjs
  f9cd4fac07f516fd4558935a7a674b3fe6b1afdf46f3f5ba35adb9aff6ab5bb8
```

The original live 0.3.0 hash-addressed package remains present in persistent Paperclip storage. The future promotion must not delete it.

## MED-1 HISTORICAL REPAIR READINESS

Official board CLI readback proved:

```text
issue id          = 42a8a8df-f6d9-4a4e-a3aa-662a05dc6154
identifier        = MED-1
status            = blocked
assignee agent    = Ana
checkoutRunId     = null
executionRunId    = null
reviewPolicy      = null
executionPolicy   = null
scheduledRetry    = null
activeRecoveryAction = null
blockedBy         = []
review attention  = none
live runs         = []
```

The only historical recovery record is already resolved:

```text
kind        = active_run_watchdog
status      = resolved
owner       = board
wake policy = null
outcome     = blocked
```

There are no unresolved blockers, no pending tool-action review and no active run.

Pinned Paperclip source proves that a simple terminal `status=done` issue update:

- clears checkout/execution run locks;
- performs Paperclip-owned terminal cleanup/finalization;
- does not itself enqueue an assignee wake;
- only wakes in separate paths such as resume/comment/recovery/blocked-notification behavior.

The supported CLI contract is:

```text
paperclipai issue update <issue-id>
  --status done
  --api-base http://127.0.0.1:3100
  --json
```

The future historical repair must use the existing protected board credential store:

```text
PAPERCLIP_AUTH_STORE=/paperclip/operator-cli/activation-v1/auth.json
```

Credential metadata was verified without reading its value:

```text
mode  = 0600
owner = node:node
```

The repair command MUST NOT include:

- `--comment`;
- `--run-id`;
- `--api-key`;
- `--assignee-agent-id`;
- resume/reopen semantics;
- any direct SQL update.

If the issue-update response is ambiguous, read back MED-1 and run counts before any repeat.

## CAPABILITY AUTHORITY / REUSE GATE

No new capability is introduced.

```text
adapter installation/replacement
  = Paperclip instance-admin adapter API/CLI

issue terminal lifecycle
  = Paperclip board issue API/CLI

customer work identity/result
  = Wandora

run lifecycle
  = Paperclip

model execution
  = existing Wandora Agent Runtime / Mastra boundary

current model provider
  = Mistral implementation behind wandora-supervised-v1

external effects
  = Wandora Human Send / Gateway outbound
```

The normal customer Core still receives no board/instance-admin credential.

## DECISION

The production-promotion execution is GO as a separate slice, with this exact order:

```text
1. REAL NOW reconciliation
2. prove 1 work / 2 historical runs / 1 model call / 0 outbound
3. prove MED-1 still blocked with no live run and no active recovery
4. prove live adapter exactly 0.3.0 and test-environment PASS
5. verify candidate 0.4.0 hash/provenance
6. verify rollback 0.3.0 registry/package hashes
7. stage candidate under persistent hash-addressed Paperclip package storage
8. official authenticated adapter get readback
9. dispatch exactly one adapter install/replace using local persistent directory
10. if response ambiguous: readback first; do not blindly repeat
11. require version=0.4.0 and requiresRestart=true
12. recreate/restart only Paperclip exactly once
13. require Paperclip healthy
14. require exactly one wandora_mastra / 0.4.0 / loaded
15. require official test-environment PASS
16. require Ana still active + supervised and no new live run/model/outbound
17. board-authenticated MED-1 update: status=done only
18. read back MED-1=done
19. require historical heartbeat run count still exactly 2
20. require Core model call count still exactly 1
21. require outbound attempts still 0; Human Send OFF; Gateway outbound OFF
22. STOP
```

No new customer work belongs to this execution.

## SECOND ADVERSARIAL REVIEW

### Duplicate adapter install

Replacement is non-repeatable by assumption. Exactly one install request may be dispatched. A timeout/broken response is `execution_uncertain`; adapter readback and registry state must resolve the ambiguity before any retry.

### Duplicate registration

Post-install state must remain exactly one `wandora_mastra` registration. A second registration is a hard failure.

### Paperclip restart

Replacement of an existing external adapter on v2026.916.0 has historically returned `requiresRestart=true`. Only Paperclip may be recreated/restarted. Core, Web, Gateway, Supabase and model provider state remain untouched.

### Historical work replay

Forbidden. MED-1 terminal repair changes Paperclip task disposition only. It does not call Wandora work admission, execution bridge, Agent Runtime or provider.

### Accidental wake

MED-1 has no active run, no scheduled retry, no active recovery, no blockers and no review path. The repair uses status-only board mutation with no comment/resume/reassignment. Source inspection shows no wake dispatch for this simple terminalization path.

### Usage distortion

Historical Paperclip runtime token counters remain as recorded by 0.3.0. Do not synthesize/backfill 705 tokens into Paperclip history. Core's historical model-usage event remains the authoritative evidence for that work. New 0.4.0 executions report normalized per-run usage prospectively.

### Secret exposure

The protected board credential store is reused by file reference only. No token value is printed, copied into commands, Git or Wandora business state.

### Outbound

Human Send and Gateway outbound remain OFF before, during and after promotion. No messaging smoke is permitted.

### Rollback

If 0.4.0 cannot become healthy/loaded:

1. stop before MED-1 repair;
2. restore the frozen pre-promotion `adapter-plugins.json` pointing to retained 0.3.0;
3. recreate/restart only Paperclip;
4. require healthy + one loaded `wandora_mastra@0.3.0`;
5. require MED-1 still blocked, historical runs=2, model calls=1, outbound=0;
6. STOP.

If 0.4.0 is healthy but MED-1 repair is ambiguous/fails, keep 0.4.0 only if all runtime safety gates remain green, read back MED-1 and stop. Do not replay the work.

## EXECUTION

This ADR is a NO-EFFECT preflight.

Performed:

- canonical repository reconciliation;
- live read-only registry/package/version checks;
- official authenticated adapter readback;
- official no-effect `test-environment`;
- deterministic current-main artifact build in isolated preflight storage;
- rollback copies in isolated preflight storage;
- official board CLI readback of MED-1;
- pinned source inspection of terminal issue-update semantics.

Not performed:

- adapter install/replace;
- Paperclip restart/recreate;
- MED-1 mutation;
- Core/Web/Gateway mutation;
- migration;
- new work/issue/wakeup/run;
- provider/model call;
- Human Send/Gateway outbound enablement;
- message delivery.

## VALIDATION

Preflight conclusion:

```text
repository                 = main@c44634ea...
candidate                   = wandora_mastra@0.4.0 / sha256 6390812d...
rollback                    = exact live 0.3.0 frozen
live adapter                = 0.3.0 / loaded / test-environment PASS
MED-1                       = blocked / no live run / no active recovery
historical Paperclip runs   = 2
historical Core model calls = 1
outbound attempts           = 0
Human Send                  = OFF
Gateway outbound            = OFF
production mutation         = NONE

next slice = production promotion execution
```

## Next executable slice

**Paperclip Customer-Work Terminal Disposition + Usage Adapter Production Promotion Execution V1**

It must start with fresh reconciliation and follow the frozen order above. It must not create or replay customer work.
