# ADR 0294 — Semantic Fast Read + Product Selector Production Convergence Preflight V2

Date: 2026-09-26  
Status: **PREFLIGHT COMPLETE / NEXT PRODUCTION EXECUTION NO-GO / ARTIFACT + ACTIVATION-CONTRACT GAPS PROVEN / NO PRODUCTION EFFECT**

## Objective

Reconcile the fully qualified Semantic Fast Read + concrete product-selector path against the real production runtime, freeze the current rollback/dependency order, verify platform-owned Mistral credential purpose/custody without reading the secret value, and decide whether a production execution/attestation slice is ready.

This ADR is a read-only production preflight. It does not authorize deployment, restart, migration, plugin promotion, provider/model call, VendaERP call, customer work, WhatsApp wiring or outbound effect.

Permanent guardrail:

> Portability = desacoplamento do contrato, não duplicação da implementação.  
> Provider replacement não implica internalização.

## REAL NOW

Repository reconciliation:

```text
main = 8d6a65f519de5c1c49607314b49968af608c7164

PR #369
  state     = open / draft / mergeable
  branch    = feat/semantic-fast-read-runtime-wiring-v1
  head      = 8fe81cb2b2b0cb603e9f33b5325b6756377a7c61
  merge ref = bc2f98bd52074d13a3cae2752ba04c95cbba1d99

PR #370
  state  = open / draft / mergeable
  head   = 11fd59599b21493a0fe335f4c32354989a6083a2
```

PR #369 exact head has 16/16 PR workflows GREEN.

The post-primary-gates Core candidate is the rerun job:

```text
Core Candidate Artifact run = 36261398833
post-gates job              = 108458569619 / GREEN
artifact id                 = 10912856284
artifact name               = core-organization-adapter-candidate-bc2f98bd52074d13a3cae2752ba04c95cbba1d99
GitHub artifact digest      = sha256:778e873bcd6252d112f69c876dc980ec113f3ff7fdfe0c50fa8ef1aa209248a8

candidate source sha        = bc2f98bd52074d13a3cae2752ba04c95cbba1d99
image tag                   = wandora/core:organization-adapter-candidate-bc2f98bd5207
OCI config digest           = sha256:926af165102c244248a0db180c3766bca988779a7e41c8872161566ef28a948f
OCI manifest digest         = sha256:a0cf838cc79439652961aa04cbc3d9b50930117fa6bcdec4e4deade6325b2061
candidate archive sha256    = 77593828dcd69a258c4e814752d540105a43e7b79ab8135243ed385b6799d315
candidate contract          = organization-adapter-core-v1
image user                  = node
```

The artifact is short-lived. Any later execution must revalidate retention/digest and, if expired, rebuild from the exact authorized source rather than substituting a moving head.

## Production Core

Read-only reconciliation:

```text
image     = wandora/core:organization-adapter-candidate-f3225586d082
revision  = f3225586d0825334d2c9c697a1720512a65d47f8
image id  = sha256:639649b4ed99547e708f17ee2dda71beb04da728af113073705f928ddf55c4b9
health    = healthy
restarts  = 0
readyz    = HTTP 200 / {"status":"ready","service":"wandora-core"}
runtime   = mastra-supervised-model
```

The exact live source revision predates all of these config keys:

- `WANDORA_FAST_READ_EXECUTION_ENABLED`;
- `WANDORA_SEMANTIC_FAST_READ_ENABLED`;
- `WANDORA_SEMANTIC_SELECTOR_ENABLED`;
- `WANDORA_TYPESAFE_JEV_API_KEY_FILE`.

Therefore Semantic Fast Read and the product selector are not merely disabled by an environment choice in the current binary; the live revision does not contain those activation boundaries.

Current startup evidence also proves:

```text
gateway ingress                = ON
Paperclip execution bridge     = ON
Human API                      = ON
Human Send Proposal            = OFF
Organization Adapter           = ON
agent runtime                  = mastra-supervised-model
```

Messaging Gateway is healthy and currently reports:

```text
outboundEnabled = false
```

## Platform-owned Mistral credential

The existing model-provider credential is already mounted into live Core:

```text
host:
  /opt/wandora/stacks/core/secrets/wandora_model_provider_api_key

container:
  /run/secrets/wandora/model-provider.api-key

mount:
  read-only
```

The live model runtime uses:

```text
WANDORA_MODEL_PROVIDER = mistral
WANDORA_MODEL_ID       = mistral-small-2603
WANDORA_MODEL_API_KEY_FILE = /run/secrets/wandora/model-provider.api-key
```

ADR 0144 remains authoritative: when Wandora pays the Mistral account, this credential is semantically Wandora platform-owned; its filesystem path is deployment configuration, not provider/domain authority.

ADR 0293 reuses the same `WANDORA_MODEL_API_KEY_FILE` only for the qualified `MastraMistralSemanticSelectorProvider`. This is purpose-compatible reuse of the same platform Mistral inference credential, not a new credential purpose or new secret authority.

**Decision: do not create a selector-specific Mistral secret.**

### Metadata evidence gap

The MCP secret-path guard correctly returned `SECRET_PATH_DENIED` when asked to inspect the secret directory, so the secret value was not read and the guard was not bypassed.

The parent secrets directory is currently:

```text
/opt/wandora/stacks/core/secrets
mode 0700
owner wandora-admin
group wandora-ops
```

ADR 0144 recorded the model credential itself as:

```text
mode 0640
owner wandora-admin
group wandora-ops
```

The current exact file mode/owner/group could not be re-read through available MCP capabilities. Before any production mutation, execute only this metadata command and do not print the secret:

```bash
sudo stat -c 'path=%n mode=%a owner=%U group=%G uid=%u gid=%g type=%F' \
  /opt/wandora/stacks/core/secrets/wandora_model_provider_api_key
```

Until that readback is captured, exact current file metadata remains an explicit pre-execution evidence gap.

## Production Paperclip

Read-only reconciliation:

```text
image    = wandora/paperclip:v2026.916.0
image id = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
commit   = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
health   = healthy / status=ok
restarts = 0
mode     = authenticated / private
backup health reported by Paperclip = enabled / ok
```

Task Drain / quiescence:

```text
draining     = false
activeRuns   = 0
pendingWakes = 0
quiescent    = true
```

These are mutable operational facts and must be re-read immediately before any future mutation.

### Exact qualified Paperclip target

Qualified source target:

```text
v2026.916.1
commit = d554c4789ed3930f8a53ac9fdf6503b3187097da
```

Current-head CI composes and verifies the retained Fast Read patches against that exact source, including:

- host operational read;
- synchronous bounded webhook response;
- Fast Read run terminal-result read.

Exact retained patch evidence includes:

```text
host-operational-read patch sha256
= fc0ce000b2fa5051f10fb71cfece71df17e9b4953779486d951b3f2990cd8bfb

fast-read-run-result-read patch sha256
= 8972f5d500012f706ccce82dee8aef055aa99f8b97a1d34f89856a3e1d311c6f
```

The current-head Paperclip 916.1 OpenAPI candidate is also GREEN:

```text
workflow run        = 36261398817
artifact id         = 10912496462
artifact digest     = sha256:4cb289e13d02cc5b35b88585db374901fd92fabd6c4b10f87220ca102da6648e
OpenAPI JSON sha256 = 55383e4b9aceee52544a5e8a93b7c04526f10cb13ce91082185df0691bd7e740
paths               = 685
```

However, this is an OpenAPI artifact, not a deployable Paperclip image.

**Blocking gap:** there is still no production-promotable `v2026.916.1 + qualified Fast Read patches` image artifact with exact OCI/image digest, build provenance and disposable startup proof.

Do not rebuild this capability inside Wandora. The next repository-only slice must package the already-qualified Paperclip source+patch composition through the normal GitHub-hosted CI boundary.

## Organization Adapter

Live plugin:

```text
key         = wandora.organization-adapter-v1
version     = 0.3.1
status      = ready
plugin id   = 86e77fe7-c7e4-4bee-afa3-46cdad575d0c
packagePath = /paperclip/operator-packages/wandora-organization-adapter-v1/
              06a42a04dd0b6eff8ee377c1d4f1e40bbabce122767d0d77e92ee509d27d811d/package
lastError   = null
```

Its live manifest has only reconcile/activate/work webhooks and does not contain the Fast Read host capabilities.

Qualified candidate:

```text
version             = 0.5.0
Paperclip image pin = wandora/paperclip:v2026.916.1
Paperclip commit    = d554c4789ed3930f8a53ac9fdf6503b3187097da
artifact id         = 10912626242
artifact digest     = sha256:e7d44860ed75b7d1d39f249035b09d9d519b3e3daffcb08cfb2016b9069cb29f
package sha256      = f4e733613e72e771eb18361dbdbf420c810c5b8bbe31361a64040a2081cc2ae2
```

Candidate 0.5.0 adds the bounded provider-neutral capability projection and synchronous `employee-fast-read` webhook and declares the required Paperclip host capabilities, including:

- `agents.invoke`;
- `agent.runs.read`;
- `tools.operational.read`.

Its instance config schema still has one required field only:

```text
hmacSecret = company-scoped Paperclip secret-ref
```

Therefore 0.5.0 reuses the same company HMAC secret authority and does not require a second plugin credential/config subsystem.

## Production activation inputs still missing

The exact Core candidate has disabled-by-default gates, but the live stack does not yet have a reviewed Semantic Fast Read activation overlay.

Future Core config requires, when enabled:

```text
WANDORA_FAST_READ_EXECUTION_ENABLED
WANDORA_FAST_READ_INTENT_SECRET_FILE

WANDORA_SEMANTIC_FAST_READ_ENABLED
WANDORA_TYPESAFE_JEV_API_KEY_FILE
WANDORA_TYPESAFE_JEV_TIMEOUT_MS

WANDORA_SEMANTIC_SELECTOR_ENABLED
WANDORA_SEMANTIC_SELECTOR_TIMEOUT_MS
```

Current production mount evidence contains neither:

- a TypeSafe/JEV API key mount for Core;
- a Fast Read intent-HMAC mount.

Those are separate authorities from the Mistral credential:

- TypeSafe/JEV key authenticates the replaceable semantic-route provider;
- Fast Read intent HMAC is Wandora-owned signing material for `wfri1`;
- Mistral platform credential remains the existing Wandora platform model-provider credential and is reused unchanged by the selector.

Do not reuse unrelated HMAC material merely to avoid adding the required Fast Read intent signing secret. Do not reuse or copy a JEV MCP credential unless its production System One purpose/custody is separately proven.

No new secret manager is justified.

## Capability Authority / Reuse Gate

### Semantic authority

**Wandora-owned.**

Wandora owns:

- `BusinessCapability`;
- customer/tenant authorization;
- route/selector confidence and ambiguity policy;
- deterministic-read gate;
- signed `wfri1`;
- deterministic post-filter;
- final Fast Read allow/deny decision;
- external-effect policy.

### Durable product state

**No new durable state is justified.**

Rejected:

- provider registry;
- product catalog/cache;
- ERP mirror;
- run/result mirror;
- Connection/grant mirror;
- Tool Gateway mirror;
- provider execution store;
- selector memory;
- retry state machine.

### Operational authority

**Paperclip-owned.**

Paperclip remains authority for lifecycle, runs, wakeups, Connections, grants, operational secrets, tools, Tool Gateway authorization/execution, terminal result and operational audit.

### Provider implementation

Replaceable implementations remain:

- TypeSafe/JEV for semantic route decision;
- Mastra + Mistral for structured product selector extraction;
- VendaERP for the business-system read implementation;
- Paperclip for the current workforce/control-plane implementation.

### Replacement boundary

Stable Wandora-owned replacement boundaries are:

- `SemanticDecisionProvider`;
- `SemanticSelectorProvider`;
- `OrganizationAdapterFastReadBridge`;
- `BusinessCapability`;
- signed `FastReadIntent` / `wfri1`;
- deterministic normalized read result.

### ADR 0168 Exit Test

If Paperclip, TypeSafe/JEV, Mastra/Mistral or VendaERP is replaced tomorrow:

- customer-facing Wandora semantics remain unchanged;
- organization/employee authorization remains Wandora-owned;
- `BusinessCapability`, route/selector contract, signed intent and deterministic result stay stable;
- only adapters, provider config/credential binding and legitimately provider-owned operational state change.

**Exit Test = PASS.**

No provider implementation is being internalized.

## What can be proven with zero provider/customer/outbound effect

This preflight proved without live TypeSafe/Mistral selector/VendaERP/customer/WhatsApp effects:

1. exact repository heads and PR state;
2. all 16 current-head PR workflows GREEN;
3. exact post-gates Core candidate provenance/digests;
4. live Core image/revision/health/readiness;
5. live Core source does not contain the new Fast Read/semantic gates;
6. live Mistral credential mount path is present and read-only, without reading the value;
7. live Paperclip exact version/commit/image/health;
8. live Organization Adapter exact version/status/manifest/package path;
9. exact Organization Adapter 0.5.0 candidate package/provenance;
10. exact Paperclip 916.1 source target and patch-composition/OpenAPI CI;
11. Task Drain active-runs/pending-wakes/quiescence;
12. Human Send remains OFF;
13. Messaging Gateway outbound remains OFF;
14. no new semantic/operational subsystem is required.

No provider call or ERP call is needed to prove those facts.

## Current rollback set and refresh rule

Current exact runtime anchors:

```text
Core rollback anchor
  image    = wandora/core:organization-adapter-candidate-f3225586d082
  revision = f3225586d0825334d2c9c697a1720512a65d47f8
  image id = sha256:639649b4ed99547e708f17ee2dda71beb04da728af113073705f928ddf55c4b9

Paperclip rollback anchor
  image    = wandora/paperclip:v2026.916.0
  commit   = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
  image id = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced

Organization Adapter rollback anchor
  version     = 0.3.1
  plugin id   = 86e77fe7-c7e4-4bee-afa3-46cdad575d0c
  package hash-addressed path id
              = 06a42a04dd0b6eff8ee377c1d4f1e40bbabce122767d0d77e92ee509d27d811d
```

The existing Paperclip v916.0 database already contains the migrations from the prior production upgrade. The next execution must not rely on an old pre-v916 backup as its immediate rollback capture.

Immediately before any future Paperclip/adapter/Core mutation, freeze a **fresh current-state rollback set** using the existing ADR 0129/0130 operational pattern:

- exact current v916.0 image ID/tag;
- current Paperclip database backup plus schema-faithful recovery artifact when required by the runbook;
- matching `master.key` custody evidence without printing content;
- current Paperclip compose/bridge wrapper;
- current plugin/adapter store;
- exact Organization Adapter 0.3.1 package/config state;
- exact Core current image/config;
- hashes/manifests under protected custody.

Any durable drift after capture invalidates the capture and requires deliberate refresh before mutation.

## Frozen future promotion order

No step below is authorized by this ADR. This is only the future order after all blockers close.

### Phase 0 — artifact/config preparation, no production effect

1. Build a deployable Paperclip candidate in GitHub-hosted CI from exact `d554c478...` plus the already-qualified Fast Read patch composition.
2. Freeze image/OCI digest, source SHA, patch hashes and provenance; run disposable startup/compatibility proof.
3. Add/review a production activation overlay for Core that explicitly defaults all new gates OFF and contains only file-backed secret/mount references.
4. Revalidate the current Mistral secret metadata with the metadata-only `stat` command above.
5. Prove exact TypeSafe/JEV credential custody/mount source and the distinct Fast Read intent-HMAC custody plan. Do not create a new Mistral secret.

### Phase 1 — pre-mutation freeze

6. Reconcile repository/head/artifacts again.
7. Capture a fresh rollback set.
8. Re-read Task Drain and require `activeRuns=0`, `pendingWakes=0`, `quiescent=true`.
9. Require Human Send OFF, Messaging Gateway outbound OFF and WhatsApp Fast Read disconnected.

### Phase 2 — compatibility convergence with semantic gates OFF

10. Promote exact patched Paperclip 916.1 candidate first, while Organization Adapter remains 0.3.1.
11. Require Paperclip health/version/provenance and no unexpected run/wakeup/outbound.
12. Upgrade exactly one Organization Adapter registration to 0.5.0 using the existing company-scoped `hmacSecret` config; require status `ready`.
13. Validate bounded capability projection and plugin health without provider/model/ERP/customer effect.
14. Promote the exact qualified Core candidate with these flags explicitly OFF:

```text
WANDORA_FAST_READ_EXECUTION_ENABLED=false
WANDORA_SEMANTIC_FAST_READ_ENABLED=false
WANDORA_SEMANTIC_SELECTOR_ENABLED=false
WANDORA_HUMAN_SEND_PROPOSAL_ENABLED=false
Messaging Gateway outbound=false
WhatsApp Fast Read wiring=absent
```

15. Require Core `/healthz` and `/readyz` GREEN and existing non-Fast-Read paths unchanged.

### Phase 3 — separately authorized bounded attestation

Only after a new decision/review may a bounded attestation window enable:

```text
WANDORA_FAST_READ_EXECUTION_ENABLED=true
WANDORA_SEMANTIC_FAST_READ_ENABLED=true
WANDORA_SEMANTIC_SELECTOR_ENABLED=true
```

Human Send, Messaging Gateway outbound and WhatsApp wiring remain OFF throughout that attestation.

## Smallest future production attestation

The minimum useful live attestation is **one explicitly authorized owner/admin Human Fast Read request**, not WhatsApp, against one already-authorized tenant/employee/Business System read grant.

It should prove, in one bounded correlation:

1. one TypeSafe/JEV semantic route call;
2. one Mistral structured product-selector call only because the approved route needs a selector;
3. one Paperclip issue-less Fast Read run;
4. exactly one read-only VendaERP operation (`vendaerp_search_products`) through Tool Gateway;
5. zero retries;
6. exact selector/deterministic post-filter match;
7. the real product price belongs to the requested product;
8. no second ERP read;
9. no ERP write;
10. no Human Send / Gateway outbound / WhatsApp message;
11. terminal result is Paperclip-owned and bounded;
12. latency evidence is present for the qualified stages;
13. no new durable Wandora operational state.

A GREEN attestation is evidence for a later activation decision. It does not itself authorize WhatsApp.

## Gaps / blockers

Production execution/attestation is currently blocked by:

1. no deployable Paperclip 916.1 + qualified Fast Read patches image artifact/provenance;
2. no reviewed production activation overlay for the new Core gates/mounts;
3. no qualified live Core mount/custody for `WANDORA_TYPESAFE_JEV_API_KEY_FILE`;
4. no qualified live Core mount/custody for the distinct `WANDORA_FAST_READ_INTENT_SECRET_FILE`;
5. exact current owner/mode/group metadata of the existing Mistral key has not been re-read because the MCP secret guard correctly denies that path;
6. a fresh immediately-pre-mutation rollback capture does not exist yet and must be created only when execution is actually ready;
7. PR #369 remains draft/open; any head change invalidates exact-head artifact assumptions and requires reconciliation.

These are deployment/evidence gaps, not reasons to create a new Wandora runtime subsystem.

## Decision

**NO-GO for the next production execution/attestation slice.**

The architecture and qualified code are sufficient to continue, but the production execution contract is not yet complete.

The next executable slice is narrower and repository/CI-only:

**Semantic Fast Read Production Convergence Artifact + Activation Contract Preparation V1 — CODE/CI ONLY / NO PRODUCTION EFFECT**

That slice should close only:

- deployable patched Paperclip 916.1 image artifact/provenance;
- explicit Core activation overlay with all new gates OFF by default;
- exact secret mount/custody references without reading secret values;
- disposable startup/compatibility validation;
- candidate/rollback runbook deltas.

It must still stop before production mutation or live provider/ERP/customer effects.

## Second adversarial review

The first independent post-decision JEV review did not endorse fast execution:

```text
deep_review  = 0.43
block        = 0.38
proceed_fast = 0.10
split_task   = 0.09
```

The decision was narrowed further to documentation plus a separate artifact/config preparation slice. The focused pass remained deliberately non-affirmative and nearly tied:

```text
deep_review  = 0.28
block        = 0.28
proceed_fast = 0.27
split_task   = 0.17
```

Because deterministic evidence already proves missing production-promotable artifacts and activation inputs, the absence of an affirmative adversarial signal reinforces the conservative **NO-GO**. JEV remains advisory and does not override the proven deployment gaps.

## Effect boundary

```text
production deploy                = 0
Paperclip restart/upgrade        = 0
Organization Adapter promotion   = 0
Core promotion                   = 0
Compose production mutation      = 0
migration                        = 0
secret creation/movement         = 0
secret value read/emission       = 0
TypeSafe/JEV live call           = 0
Mistral selector live call       = 0
VendaERP live call               = 0
customer Fast Read               = 0
WhatsApp wiring/outbound         = 0
ERP write                        = 0
new Wandora operational subsystem= 0
```

ADR 0294 is **PREFLIGHT COMPLETE / NEXT PRODUCTION EXECUTION NO-GO / NO PRODUCTION EFFECT**.
