# ADR 0153 — Paperclip Customer-Work Usage Companion Core Promotion Preflight V1 — NO EFFECT

Date: 2026-09-21
Status: **Accepted preflight — GO for a separate amended production execution; NO EFFECT performed here**

Builds on: ADR 0144, ADR 0148, ADR 0150, ADR 0151, ADR 0152

## Decision summary

Fresh evidence found that ADR 0151's adapter-only production promotion cannot truthfully satisfy its **prospective usage** claim.

Live Core currently returns only:

```text
executionId
model
summary
```

from the private Paperclip execution bridge.

The merged/current Core returns normalized `usage` in addition to those fields.

Therefore:

- `wandora_mastra@0.4.0` alone fixes customer-work terminalization but does not create Paperclip token telemetry with the current live Core;
- the companion Core usage-return change is also required for end-to-end prospective usage/cost-event recording;
- the lifecycle repair and usage path remain backward-compatible independently;
- the production execution must promote **Core companion + adapter 0.4.0 as one compatibility-qualified slice** if it continues to claim both lifecycle and usage.

No production mutation is performed by this preflight.

## REAL NOW

Canonical repository:

```text
main = 2e3a9e41eb0013c14da079d95120f03a85ee8f90
ADR 0151 = canonical
PR #205  = merged
```

Live Paperclip:

```text
image  = wandora/paperclip:v2026.916.0
source = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
health = healthy

wandora_mastra
  version = 0.3.0
  loaded  = true
  count   = exactly 1
```

Live Core:

```text
image    = wandora/core:organization-adapter-candidate-d5f98ed92a29
image id = sha256:1444f760e2fc61c3c4763e5f9ca8738df88a807bc2a7df1490562cade251cf14
source   = d5f98ed92a29b351b243c4873bf17a2d13cdfc78
health   = healthy
user     = node
rootfs   = read-only
runtime  = mastra-supervised-model
logical profile = wandora-supervised-v1
```

Live effect boundary remains:

```text
Human Send       = OFF
Gateway outbound = OFF
```

MED-1:

```text
id              = 42a8a8df-f6d9-4a4e-a3aa-662a05dc6154
status          = blocked
live runs       = []
active recovery = none
checkoutRunId   = null
executionRunId  = null
historical runs = exactly 2
historical Core model calls = exactly 1
outbound attempts = 0
```

## PROVEN GAP — LIVE CORE DOES NOT RETURN USAGE

Direct inspection of the compiled code actually running in `wandora-core` proves:

```js
return { executionId, model: result.model, summary: result.summary };
```

The cached-result branch also omits usage.

Therefore live Core cannot provide normalized usage to either adapter 0.3.0 or 0.4.0.

This is not inferred from image age; it is proven from the compiled production artifact.

## PROVEN CURRENT-MAIN DELTA

A Git diff between live Core source:

```text
d5f98ed92a29b351b243c4873bf17a2d13cdfc78
```

and current:

```text
main@2e3a9e41eb0013c14da079d95120f03a85ee8f90
```

shows exactly one executable Core source/package delta:

```text
M apps/core/src/paperclip-execution/service.ts
```

No other file under:

```text
apps/core/src
apps/core/package.json
```

differs.

The companion change returns normalized usage from the already-live Agent Runtime result through the existing private Paperclip bridge.

It does not:

- add a model call;
- change model provider/model;
- add a retry;
- change work admission;
- change result persistence;
- change external-effect authority;
- add a table/migration;
- add a dependency.

## PROVEN CROSS-VERSION COMPATIBILITY

### Core-new -> adapter 0.3.0

Live 0.3.0 `successPayload()` extracts only:

```text
executionId
model
summary
```

and ignores unknown/additive fields.

Therefore a Core response that also contains `usage` remains compatible with live adapter 0.3.0.

### Adapter 0.4.0 -> Core-old

Adapter 0.4.0 normalizes:

```text
value.usage === undefined
  -> usage = null
```

and omits adapter usage when null.

Therefore the lifecycle remediation also remains compatible with the current Core.

### Consequence

The two changes are individually backward-compatible, which permits an ordered zero-work rollout without an atomic multi-container switch.

## PAPERCLIP USAGE / COST-EVENT SEMANTICS

Pinned Paperclip v2026.916.0 source proves:

```text
adapter result
  -> normalize result.usage
  -> updateRuntimeState(...)
  -> if tokens > 0 OR billed cost > 0
     costService.createEvent(...)
```

For a future Wandora run where normalized usage is returned but no authoritative cost is supplied:

```text
inputTokens       = recorded
outputTokens      = recorded
cachedInputTokens = recorded
costCents         = 0
costStatus        = unpriced
```

This means 0.4.0 + companion Core will create Paperclip operational token evidence.

It does **not** mean Paperclip's monetary budget hard-stop will govern those calls, because pinned v2026.916.0 supports only:

```text
BUDGET_METRICS = ["billed_cents"]
```

and observes the sum of `costEvents.costCents`.

No provider-pricing engine is introduced by this slice.

## COMPANION CORE CANDIDATE

The already-GREEN Core Candidate Artifact workflow associated with the final PR #204 qualification is:

```text
workflow             = Core Candidate Artifact #135
workflow run id      = 35603026602
artifact id          = 10640665492
artifact name        = core-organization-adapter-candidate-61cbb34d4bfde0350cc765111dc778b22a2a168f
artifact ZIP digest  = sha256:ffebefcbc96596fc97b8506ad0a20fae3f749529f2b75ebddacb3113456cc5b3

artifact source      = 61cbb34d4bfde0350cc765111dc778b22a2a168f
image tag            = wandora/core:organization-adapter-candidate-61cbb34d4bfd
archive sha256       = f278d4466a849a55379297b043dd62eb037eb1659d50513179c35a3d012087a5
OCI config digest    = sha256:c612aac3269b086eb6c05707cf6debe7ca70b97608b284e2b6a4c2d6df0bf2b4
OCI manifest digest  = sha256:6c38930a45591970fd47d699c9881a9c9bd881272028268431ba3bf1c73c2873
image user           = node
candidate contract   = organization-adapter-core-v1
```

The Actions workflow built from the PR merge-ref source SHA, not the branch head.

That provenance nuance is explicitly resolved:

```text
git diff artifact-source..current-main -- apps/core infra/stacks/core
= zero files
```

and the critical source blob is identical on artifact source and current main:

```text
apps/core/src/paperclip-execution/service.ts
blob = 6578e72f5e75a5d062bc11ecf7904569efa6bc95
```

Therefore this candidate is executable-source equivalent to current main for Core.

The GitHub artifact is short-lived. If it is expired or unavailable when the execution slice starts:

> **STOP and produce/qualify a new Core Candidate Artifact through canonical CI. Do not rebuild an unqualified replacement on the VPS.**

## LIVE CORE ROLLBACK

Exact current rollback:

```text
image ref = wandora/core:organization-adapter-candidate-d5f98ed92a29
image id  = sha256:1444f760e2fc61c3c4763e5f9ca8738df88a807bc2a7df1490562cade251cf14
revision  = d5f98ed92a29b351b243c4873bf17a2d13cdfc78
candidate = organization-adapter-core-v1
user      = node
rootfs    = read-only
restart   = unless-stopped
groups    = ["987"]
networks  = wandora-core, wandora-data
```

The live model-provider credential remains mounted read-only. Its value was not read.

## FROZEN LIVE COMPOSE INPUTS

The current live Core was created from these exact overlay inputs:

```text
d028a7bed2af02fcc0bab3bcbe6e7297d0857549792542c54a4760ff0624dda6  /opt/wandora/stacks/core/compose.yaml
8b044de0cd49cab664fe5b0a6b4db6e638d16956b3ec5cb9bb6eb958fe696d9e  /opt/wandora/stacks/core/compose.database.yaml
36f047128914a846b7a667e67ab9daf40725e67fa9c320ddd35f8be62c9e3eed  /opt/wandora/stacks/core/compose.gateway-ingress.yaml
aa6661847833a9df0a6f5af56dbf26af28b9041dce5560684b126ffbb849644e  /opt/wandora/stacks/core/compose.agent-runtime-deterministic.yaml
f1ace87f21280aa2e41c7d4260b43f66d0cd39ded211d088ecb09864bf7cf8a2  /opt/wandora/stacks/core/compose.human-api.yaml
1b3f100dfa62a64a6d1cab0d307bcb9b52ba8ee848f3e1b49dece59761d3c394  /opt/wandora/stacks/core/compose.organization-adapter.yaml
e5f695eb5bfed785b6f441444b8f7334a3da22f71ae14bfd2258afa06e7d0320  /opt/wandora/stacks/core/compose.human-digital-employee-hire.yaml
98d084c6f3da52b97949e5cdb16d25f7cd972a44173749186ca43794a799f9ab  /opt/wandora/stacks/core/compose.paperclip-execution-bridge.yaml
fdeb55f4a4a7e472a931fbaecdd60a8a7b122bc7fba46e34478e212124491cb9  /home/wandora-admin/executions/customer-owner-activation-production-execution-v1-20260920T1856Z/activation-overlay.yaml
a6840e56f087f2cf26321b4bdf5090300d48aeab6e179ff0ec72dce29c9546ee  /home/wandora-admin/executions/first-legitimate-work-production-execution-v1-20260921T0107Z/web-bridge-resume/customer-work-overlay.yaml
f5e1989a6e1d9560c70d06d202d078eecebce597421f949b45657ec6dd8e7f8c  /opt/wandora/stacks/core/compose.agent-runtime-model.yaml
```

Future companion promotion must preserve these inputs byte-for-byte unless fresh reconciliation proves an intentional superseding change.

The intended Core mutation is **image only**.

## CAPABILITY AUTHORITY / REUSE GATE

No capability authority changes.

```text
Paperclip
  = issue/run lifecycle
  = runtime usage/cost-event ledger
  = billed-cents operational budget policy

Wandora Agent Runtime
  = normalized model usage production
  = logical profile
  = execution safety policy

Mastra
  = current runtime implementation

Mistral
  = current model implementation/provider

Wandora
  = customer work/result semantic contract
  = customer commercial/billing semantics
  = final external-effect authorization
```

No new usage table, cost engine, model router, pricing table or budget ledger is introduced.

## DECISION

ADR 0151's **adapter-only** production execution order is superseded.

The next execution slice is GO only with the following amended order after fresh reconciliation:

```text
1. re-read canonical main / ADR 0151 / ADR 0152 / ADR 0153
2. prove Paperclip healthy + exactly one loaded wandora_mastra@0.3.0
3. prove MED-1 still blocked/quiescent
4. prove historical runs=2 / Core model calls=1 / outbound=0
5. verify frozen adapter 0.4.0 candidate + rollback assets
6. verify companion Core candidate artifact availability/provenance
7. verify live Core rollback image + exact overlay hashes
8. render companion Core composition and prove image-only intentional delta
9. start Paperclip native Task Drain
10. wait for draining=true / activeRuns=0 / pendingWakes=0 / quiescent=true

11. promote only Core to the companion candidate image
12. preserve all existing live overlays/mounts/networks/flags
13. require Core healthy + /healthz=200 + /readyz=200
14. require runtime still mastra-supervised-model
15. require Human Send OFF + Gateway outbound OFF
16. require no new work/run/model/outbound activity

17. stage frozen wandora_mastra@0.4.0 persistent package
18. official authenticated adapter get/readback
19. dispatch exactly one adapter replacement
20. ambiguous install response => readback first; never blind repeat
21. require registry version=0.4.0 and requiresRestart=true
22. restart/recreate only Paperclip once
23. remember restart clears Task Drain
24. require Paperclip healthy
25. require exactly one loaded wandora_mastra@0.4.0
26. require official adapter test-environment PASS
27. require Core healthy and no new work/run/model/outbound

28. perform the already-qualified board-authenticated MED-1 status-only blocked -> done repair
29. read back MED-1=done
30. require historical Paperclip runs still exactly 2
31. require Core historical model calls still exactly 1
32. require outbound still 0 / Human Send OFF / Gateway outbound OFF
33. STOP
```

No new customer work belongs to this execution.

The end-to-end usage path is proven structurally in this execution; it is not proven by causing another production model call.

A later legitimate work event may naturally validate prospective token/cost-event ingestion. Do not create work merely as telemetry smoke.

## WHY CORE FIRST

Core-first is preferred in the amended order because:

1. Paperclip remains on the already-live compatible adapter 0.3.0;
2. Task Drain remains active in the old Paperclip process during the Core restart;
3. 0.3.0 ignores the additive Core `usage` field;
4. no run should be admitted while drained;
5. after Core is healthy, 0.4.0 can be replaced and Paperclip restarted;
6. Paperclip restart is the point that clears the process-local drain.

This produces no compatibility-invalid intermediate state.

## SECOND ADVERSARIAL REVIEW

### Adapter-only promotion

Rejected for the combined lifecycle+usage claim.

It would fix terminal disposition but leave Paperclip token telemetry absent for new runs because live Core omits usage.

### Core-only promotion

Insufficient.

The live 0.3.0 adapter ignores usage, so Paperclip would still receive no usage.

### Core-first while Paperclip is drained

Accepted.

0.3.0 tolerates the extra response field and no new run should enter while the old Paperclip process is drained.

### Adapter-first then Core

Technically compatible but rejected as the preferred order.

It would require Paperclip restart first, which clears the drain, then a second component restart while work admission is no longer held. Core-first keeps the process-local drain useful across the Core mutation and leaves only Paperclip's own restart after adapter replacement.

### Build a new Core image directly on VPS

Rejected.

Use the traceable CI artifact. If it is unavailable/expired, regenerate through canonical CI.

### Treat token event with costCents=0 as budget enforcement

Rejected.

It is unpriced usage evidence. Current hard-stop budget metric is billed cents.

### Add a Wandora pricing table now

Rejected.

No customer/product requirement justifies making Wandora the operational provider-pricing authority merely to produce a non-zero Paperclip budget event.

### Run another Mistral task to prove telemetry

Rejected.

Structural/disposable evidence is sufficient for promotion. A production model call is a separate customer-work effect.

### Rollback ambiguity

If Core promotion fails before adapter replacement:

1. keep Paperclip Task Drain active;
2. restore exact live Core image with frozen overlays;
3. require Core healthy/ready;
4. prove counters unchanged;
5. end Task Drain through official DELETE if the old Paperclip process remains healthy and no adapter mutation happened;
6. STOP.

If adapter replacement/restart fails after companion Core is healthy:

1. do not repair MED-1;
2. restore retained 0.3.0 registration/package according to ADR 0151 rollback;
3. restart only Paperclip as required;
4. require healthy + one loaded 0.3.0;
5. Core companion may remain only if all safety gates are green because it is backward-compatible with 0.3.0; otherwise restore Core rollback;
6. prove counters/outbound unchanged;
7. STOP.

No rollback ever replays customer work.

## EXECUTION PERFORMED

This preflight performed only:

- canonical repository reconciliation;
- live read-only Paperclip/Core inspection;
- compiled live Core inspection;
- pinned Paperclip cost/budget source inspection;
- Git/source-diff comparison;
- CI artifact metadata/log inspection;
- read-only Docker metadata/mount/overlay hash inspection;
- repository documentation.

It did not:

- download/load a Core artifact into Docker;
- recreate Core;
- start Task Drain;
- replace the adapter;
- restart Paperclip;
- mutate MED-1;
- create customer work/run;
- call Mistral;
- apply a migration;
- enable Human Send/Gateway outbound;
- send a message.

## VALIDATION / VERDICT

```text
live Paperclip             = healthy / wandora_mastra@0.3.0
live Core                  = healthy / d5f98ed...
MED-1                      = blocked / quiescent
historical runs            = 2
historical model calls     = 1
outbound                   = 0

adapter 0.4 candidate      = qualified/frozen by ADR 0151
companion Core executable  = exact one-file runtime delta
cross-version compatibility= GREEN
Core CI artifact           = available at preflight time
Core rollback              = exact live image retained
overlay hashes             = frozen
production mutation        = NONE
```

Verdict:

> **GO for a separate amended Core+adapter production execution slice, subject to fresh artifact availability/provenance and REAL NOW reconciliation.**

ADR 0151 remains authoritative for adapter candidate, Task Drain semantics, adapter replacement ambiguity, MED-1 repair and rollback details except where this ADR explicitly supersedes the adapter-only execution order.
