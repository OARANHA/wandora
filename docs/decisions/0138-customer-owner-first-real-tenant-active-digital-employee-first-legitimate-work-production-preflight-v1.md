# ADR 0138 — Customer Owner First Real Tenant Active Digital-Employee First Legitimate Work Production Preflight V1

- Status: **Accepted preflight — GREEN for a separately reviewed production-promotion execution; no real work authorized**
- Date: 2026-09-20
- Builds on: ADR 0126, ADR 0135, ADR 0136, ADR 0137
- Scope: production-readiness qualification for the first customer-safe supervised work contract after the real MEDICSPRO Ana activation
- Production authorization: **promotion execution only in a separate slice; no MEDICSPRO work submission, wakeup/run or outbound effect is authorized by this ADR**

## REAL NOW

Canonical Git entering this preflight:

```text
main = 9cfee15d1916e1cd9e770866ad1a1dd4c4dfb63c
PR #190 = fix/work-admission-concurrent-idempotency-v1
```

The preflight found two additional idempotency gaps, corrected them in PR #190, qualified the corrected head, and merged it.

Final repository state:

```text
PR #190 final head = 768be4e0177f52cbc957a517640457a4b6905a2a
PR #190 CI         = 5 / 5 GREEN
merge commit        = e867585622abd0ee020bf45756eda6b53ef4fec8
main after merge    = e867585622abd0ee020bf45756eda6b53ef4fec8
```

The PR synthetic merge commit used by the candidate-build workflows was:

```text
ad93c055d6f8c6754ea2fdaf648acb56fadab3be
```

Git comparison proved it is exactly one merge commit ahead of the PR head with `files=[]`; the candidate artifacts therefore represent the same source tree as final head `768be4e...`.

Fresh final read-only production reconciliation before merge proved:

```text
Core       = wandora/core:organization-adapter-candidate-8d2a53e3c264 / healthy / restart 0
Web        = wandora/web:candidate-eda946c36ec4 / healthy / restart 0
Paperclip  = wandora/paperclip:v2026.916.0 / healthy / restart 0
Gateway    = wandora/messaging-gateway:origin-fix-94cfb4de / healthy / restart 0

Wandora Ana       = exactly 1 / active + supervised
Paperclip Ana     = exactly 1 / idle / wandora_mastra
assigned issues   = 0
heartbeat runs    = 0
task sessions     = 0
routine runs      = 0
runtime session   = null
runtime last run  = null
runtime tokens    = 0 / 0 / cached 0
runtime cost      = 0

migration 016     = absent
work gate         = OFF / absent
Human Send        = OFF
Gateway outbound  = OFF
outbound attempts = 0
```

Live Paperclip extension baseline:

```text
Organization Adapter = wandora.organization-adapter-v1@0.2.0 / ready
wandora_mastra        = 0.1.0 / external / loaded / disabled=false
Paperclip source      = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
```

No production container, migration, plugin, adapter, work item, issue, wakeup, run or outbound state was mutated by this preflight.

## PROVEN EVIDENCE

### 1. PR #190 end-to-end idempotency hardening

The second adversarial review of the already-qualified ADR 0137 implementation found two production-relevant retry gaps.

#### Core concurrent same-key reservation

The migration journal already enforces uniqueness for the work idempotency boundary, but two concurrent requests could leave the losing request on a raw PostgreSQL unique violation.

The correction reuses the already-accepted hire pattern:

```text
reserve
-> unique violation
-> exact re-read/reconcile
```

A new integration test proves:

```text
concurrent same-key work admission
= same Wandora work id
= exactly one journal row
= exactly one provider effect
```

The migration-aware Organization Adapter verifier executed against disposable PostgreSQL:

```text
migration 016 apply #1 = PASS
migration 016 apply #2 = PASS
DIGITAL_EMPLOYEE_WORK_ADMISSION_V1_VERIFY_OK
integration tests = 30 / 30 GREEN
```

#### Browser timeout / refresh / rapid duplicate / 503

The ADR 0137 UI initially held the idempotency UUID only in React memory. A timeout followed by browser refresh could therefore allocate a new UUID for the same unresolved intent.

The corrected browser contract now stores only:

```text
opaque UUID
+ SHA-256 request fingerprint
```

in `sessionStorage`, scoped by organization + employee.

It does **not** persist title or description.

The same UUID is reused across:

- network timeout;
- browser refresh;
- rapid duplicate submit / double-click;
- HTTP 409 uncertain/reconciliation responses;
- HTTP 503 availability responses after a Wandora reservation may already exist.

The key is cleared only after:

- canonical successful response; or
- definite pre-effect 400 / 403 / 404 response.

Changed work content while an unresolved operation exists fails closed.

Final Web verifier evidence:

```text
WANDORA_WEB_CUSTOMER_WORK_BROWSER_IDEMPOTENCY_V1_OK
typecheck = GREEN
build     = GREEN
```

### 2. Migration 016 disposable production-derived proof

Before any migration test, a read-only custom-format backup of the live Wandora schemas was captured:

```text
/home/wandora-admin/preflights/first-legitimate-work-production-preflight-v1/wandora-pre-migration-016.dump
mode       = 0600
size       = 182242 bytes
SHA-256    = c147f14f12eac393fff79d647491b9a883f90f30ea8eff10f965cede143aa7e0
```

The dump restored into an isolated Supabase/PostgreSQL proof target and preserved the production-derived MEDICSPRO/Ana facts.

Migration 016 was applied twice and the canonical verifier passed. The lab was removed after validation; the protected dump/hash evidence remains.

This backup is **preflight evidence only**. A future production execution must capture a fresh pre-mutation backup immediately before applying migration 016 rather than treating this file as a current rollback point.

Canonical source blobs on the final repository line:

```text
migration 016 blob = 7605139e385b95a89d42828fdb1a7c412c2b1f23
verifier blob      = 11b550f502fa57edd5747ec690fbac6e0c4d5c5f
work compose blob  = a46c243f0fa3ed5f3ab436f68b52909f11663662
```

### 3. Final Core/Web candidate provenance after hardening

The corrected PR head completed:

```text
Web CI                 #525 = GREEN
Core CI                #593 = GREEN
Messaging Gateway CI   #557 = GREEN
Platform Admin CI      #450 = GREEN
Core Candidate Artifact #110 = GREEN
```

Core candidate:

```text
workflow run        = 35548266370
artifact id         = 10616919491
artifact name       = core-organization-adapter-candidate-ad93c055d6f8c6754ea2fdaf648acb56fadab3be
artifact ZIP digest = sha256:20f52b5060f71121b6e7ff136c5d50274d97d1d23ea20089ed7fab9e2fa4c70f
image archive SHA   = 3a075adca71a025fef085f0daa65fe914757e9f30c829d32fd8ee6e33b04e1c5
OCI manifest        = sha256:e72305b0bfa562bf75b6d010935d17532c6c69e1a9ff42e97476976c1d6dc648
OCI config          = sha256:72e871c5db9c4884d586a542e1ed1d438a593da9223d10ffde2cdb8d7dd09201
candidate contract  = organization-adapter-core-v1
```

Web candidate:

```text
workflow run        = 35548266372
artifact id         = 10617101562
artifact name       = web-candidate-ad93c055d6f8c6754ea2fdaf648acb56fadab3be
artifact ZIP digest = sha256:638482b649f82f18f82d6978625b8c9265ce4cb04c861df44d59c7bd16eb089a
OCI manifest        = sha256:1cfb72cea447fb5841f3a09820ab8c1a60ccf2a030ac17443ff3db1c02d3cd74
OCI config          = sha256:78b020e27ec9cb35fd5f89a78e24ec82a1d2eb3c494e982ed474bfeb471e7c25
```

The artifacts are short-lived GitHub artifacts. Production execution must either consume them while valid and verify the recorded digests, or rebuild from the exact merged source under the canonical candidate workflow and freeze the replacement provenance before deployment.

### 4. Organization Adapter v0.3 and wandora_mastra@0.2.0 provenance

These artifacts were already qualified by ADR 0137 and are unchanged by PR #190.

Organization Adapter v0.3:

```text
Wandora source head  = 21ba162b463dbdeb6be3c84419c46afa0d465335
workflow run         = 35542277310
artifact id          = 10615660122
artifact ZIP digest  = sha256:ce89336cc257677d3a9bda66292c7cb7b7ea450c53a2899b69286b45641c0889
installable tgz SHA  = c7bdc270b1fa13d7e3ceacba5455647bd98cc15f29e61046a2bbfad85e62ce82
package blob         = 9f7065ba0641240917ea744e614cb982ef22c4f9
manifest blob        = 3fb0cd459002f92e07036fa1c465523a16665159
```

Exact approved v0.3 capabilities:

```text
agents.managed
agents.resume
issues.read
issues.create
issues.wakeup
plugin.state.read
plugin.state.write
webhooks.receive
secrets.read-ref
```

`agents.invoke` remains absent.

`wandora_mastra@0.2.0`:

```text
Wandora source head = 21ba162b463dbdeb6be3c84419c46afa0d465335
workflow run        = 35542277359
artifact id         = 10615058851
artifact ZIP digest = sha256:61a480c29e0f4384273dbc10e0cab41dc28605e557db0997218f779a0c22f76b
package blob        = f7032ca95ac6b1cf93d98a1ac8ec1f122bc4603f
compatibility blob  = 49cb1996ce3da298b69dc21d3587ee650d204965
Paperclip image     = wandora/paperclip:v2026.916.0
Paperclip source    = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
```

An independent local deterministic two-pack check on the same final source produced byte-identical `wandora-paperclip-adapter-mastra-0.2.0.tgz` packages with SHA-256:

```text
7429bdd9c98d86b9060c8ac8b82b105eeeaf8382756218688a638b206a4da8b6
```

The GitHub artifact digest remains the canonical CI artifact identity.

## CAPABILITY AUTHORITY / REUSE GATE

The authority split from ADR 0137 remains unchanged:

```text
Wandora
  customer auth / tenant policy
  stable work request / idempotency
  minimum reconciliation receipt
  supervised customer result projection

Paperclip
  durable issue/task
  assignment
  wakeup/run lifecycle
  plugin-isolated dispatch receipt

Mastra
  execution-local reasoning/workflow
  behind the existing Agent Runtime boundary
```

No new task engine, scheduler, hierarchy, run store or outbound path is approved.

## SECOND ADVERSARIAL REVIEW

### Concurrent same-key requests

The old raw unique-violation behavior was insufficient. PR #190 now reuses the existing hire race-reconcile pattern and proves one work row + one provider effect.

### Timeout/refresh and browser-generated duplicate work

React-memory-only idempotency was insufficient. The final browser contract survives refresh and duplicate submit through opaque session storage.

### HTTP 503 after Wandora journal reservation

Treating 503 as definitely pre-effect was unsafe because the journal may already exist before provider availability is discovered. The final contract preserves the same idempotency key on 503.

### Trusting PR branch SHA when CI built a synthetic merge SHA

Rejected. Git comparison proved `ad93c055...` is one merge commit ahead of `768be4e...` with no changed files. Artifact provenance is therefore source-tree equivalent and both identities are recorded.

### Replacing wandora_mastra without restarting Paperclip

Rejected. Paperclip v2026.916.0 adapter install logic reports `requiresRestart=true` when replacing an already installed external adapter. The production execution must restart only Paperclip after promoting 0.2.0, then revalidate Ana and all zero-work counters before continuing.

### Assuming plugin upgrade automatically handles capability escalation

Rejected.

Paperclip v2026.916.0 source inspection found an important implementation mismatch:

- lifecycle comments describe `upgrade_pending` for new capabilities;
- `pluginLoader.upgradePlugin()` rejects capability escalation before updating the package/manifest;
- local `POST /api/plugins/install` for the same plugin key updates the same registry row and then loads it, and therefore does not independently enforce the upgrade capability-review path.

Therefore production promotion must **not** rely on the automatic upgrade route as its authority decision.

This ADR explicitly reviews and approves only the exact v0.3 capability set frozen above. The execution must:

1. verify the exact package hash/manifest before installation;
2. preserve the existing plugin ID and company-scoped config/secret reference;
3. install only that reviewed package;
4. immediately verify v0.3 / ready / exact capabilities;
5. stop on any manifest or config drift.

### Plugin load silently pausing/resuming Ana

Paperclip `loadSingle()` starts the plugin worker and replays stored company config, but does not reconcile managed agents automatically. Promotion should therefore not change Ana's lifecycle state. The execution must still prove Ana remains `idle` and zero work/run state after plugin promotion.

### Enabling outbound to make the first work visible

Rejected. Human Send and Gateway outbound remain separate Wandora-owned authorities and must stay OFF during promotion and the future first supervised work.

## DECISION

The production preflight is **GREEN** for a separately reviewed:

**Customer Owner First Real Tenant Active Digital-Employee First Legitimate Work Production Execution V1 — NO REAL WORK**

This decision authorizes only the production-promotion sequence below. It does **not** authorize the first MEDICSPRO work request.

## FROZEN PRODUCTION EXECUTION ORDER

A future production execution must start with a new REAL NOW and stop on any baseline drift.

### Gate 0 — fresh rollback and provenance capture

Before mutation:

1. reconfirm `main`, exact candidate provenance and artifact availability;
2. capture a fresh protected pre-migration Wandora PostgreSQL backup and SHA-256;
3. freeze current Core/Web/Paperclip compose/config hashes;
4. freeze live Organization Adapter v0.2 identity/config presence without exposing secret material;
5. freeze live `wandora_mastra@0.1.0` registration/package path;
6. reprove Ana active+supervised / idle and every work/run/outbound counter at zero.

### Gate 1 — migration 016

Apply migration 016 once through the reviewed production migration path.

Then:

- run the canonical verifier;
- prove the journal is empty;
- prove Ana/bindings/hire/outbound state unchanged.

Do not create a work operation as a smoke test.

### Gate 2 — wandora_mastra@0.2.0

Install/replace only the exact reviewed 0.2.0 artifact.

Then perform the required Paperclip restart.

After restart require:

```text
Paperclip healthy
wandora_mastra = 0.2.0 / loaded
Ana = idle / wandora_mastra
issues = 0
heartbeat runs = 0
task sessions = 0
routine runs = 0
runtime last run = null
tokens/cost = 0
```

Any delta stops the execution before plugin/Core/Web promotion.

### Gate 3 — Organization Adapter v0.3

Verify the exact v0.3 tgz hash and manifest capability set **before** installation.

Promote the same plugin key only after that explicit approval.

Immediately require:

- same plugin ID;
- version 0.3.0;
- status ready;
- exact approved capabilities;
- company-scoped config still present;
- existing secret reference still bound without revealing it;
- Ana still idle;
- no issue/wakeup/run/session/routine created.

Do not call `employee-work`.

### Gate 4 — Core candidate with work gate still OFF

Promote the exact qualified Core candidate while preserving all currently live overlays except the new work overlay.

Require health/readiness and prove:

```text
WANDORA_HUMAN_DIGITAL_EMPLOYEE_WORK_ENABLED = absent/OFF
Human Send = OFF
Gateway outbound = OFF
```

### Gate 5 — Web candidate

Promote the exact qualified Web candidate and validate normal owner login/team behavior.

Because Core still projects work unavailable while the work gate is OFF, the new customer work action must not become usable yet.

### Gate 6 — enable the customer-work overlay last

Only after Gates 1–5 are green, apply the reviewed work overlay:

```text
WANDORA_HUMAN_DIGITAL_EMPLOYEE_WORK_ENABLED=true
WANDORA_ORGANIZATION_ADAPTER_WORK_WEBHOOK_URL=http://wandora-paperclip:3100/api/plugins/wandora.organization-adapter-v1/webhooks/employee-work
```

Require Core readiness GREEN and customer-safe availability projection for the exact active MEDICSPRO Ana.

Then **STOP**.

Do not submit title/description, do not create a Paperclip issue, and do not trigger a wakeup/run merely to prove the promotion.

## ROLLBACK / STOP TRIGGERS

Immediate stop before the next gate if any of these occur:

- candidate artifact/hash mismatch;
- migration verifier failure;
- journal unexpectedly non-empty before real work;
- Paperclip restart/health failure;
- adapter version/load mismatch;
- Organization Adapter plugin ID/config/secret-reference drift;
- Ana not exactly `active + supervised` in Wandora and `idle / wandora_mastra` in Paperclip;
- any assigned issue, wakeup, heartbeat run, task session or routine appears;
- runtime session/last-run/tokens/cost changes from zero baseline;
- outbound attempt count changes;
- Human Send or Gateway outbound becomes enabled;
- Core/Web readiness/login regression.

The fresh pre-mutation backup and exact previous images/packages/configuration are the rollback anchors. Do not improvise manual production SQL merely to force a later gate green.

## EXECUTION PERFORMED BY THIS PREFLIGHT

This preflight performed only:

- canonical Git/ADR reconciliation;
- read-only live Wandora/Paperclip/runtime inspection;
- production-derived disposable PostgreSQL restore/migration verification;
- local/disposable Web/Core verification;
- adversarial source review of Paperclip v2026.916.0 plugin/adapter lifecycle behavior;
- PR #190 repository hardening and CI qualification;
- merge of PR #190;
- cleanup of disposable containers/networks/images.

It did **not**:

- apply migration 016 live;
- deploy Core/Web candidates;
- promote Organization Adapter v0.3;
- promote `wandora_mastra@0.2.0`;
- enable the customer-work gate;
- create MEDICSPRO work;
- create Paperclip issue/wakeup/run;
- invoke Mastra for MEDICSPRO;
- enable Human Send or Gateway outbound.

## VALIDATION

Final production state remained:

```text
Wandora Ana                 = exactly 1 / active + supervised
Paperclip Ana               = exactly 1 / idle / wandora_mastra
Paperclip assigned issues   = 0
Paperclip heartbeat runs    = 0
Paperclip task sessions     = 0
Paperclip routine runs      = 0
runtime session             = null
runtime last run            = null
runtime tokens/cost         = 0 / 0
MEDICSPRO outbound attempts = 0

migration 016               = absent
customer work gate          = OFF
Human Send                  = OFF
Gateway outbound            = OFF
critical runtime            = healthy
```

## OUTCOME

```text
FIRST LEGITIMATE WORK PRODUCTION PREFLIGHT
= COMPLETE / GREEN

PRODUCTION PROMOTION
= ELIGIBLE FOR SEPARATELY REVIEWED EXECUTION V1

FIRST REAL MEDICSPRO WORK
= NOT AUTHORIZED BY THIS ADR
```

After the production promotion is independently completed and validated, the first real work must still originate from an actual authenticated MEDICSPRO owner instruction. It must stop at the supervised internal result; external effects remain separately gated.
