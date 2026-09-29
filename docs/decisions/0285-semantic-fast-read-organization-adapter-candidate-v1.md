# ADR 0285 — Semantic Fast Read Organization Adapter Candidate V1

Status: **CANDIDATE QUALIFIED / PRODUCTION ACTIVATION NO-GO / NO PRODUCTION EFFECT**  
Date: 2026-09-26

## Context

ADR 0283 left Semantic Fast Read production convergence blocked on a live Organization Adapter capability projection/result-return path and deployable candidate evidence. ADR 0284 then qualified the missing Paperclip-owned terminal run-result read boundary.

This ADR records the resulting repository-only candidate convergence. It does not authorize a production Paperclip upgrade, Organization Adapter promotion, runtime feature activation, concrete JEV wiring, provider/model use, VendaERP use, migration or outbound effect.

Permanent guardrail:

> Portabilidade = desacoplamento do contrato, não duplicação da implementação.  
> Provider replacement não implica internalização.

## REAL NOW

At the decision checkpoint:

```text
repository = OARANHA/wandora
PR         = #369
branch     = feat/semantic-fast-read-runtime-wiring-v1
head       = 28acf5d1f7e1c6ceb6fc1ec899be6bdfa666412a
PR state   = open / draft / mergeable
```

The following exact-head gates are GREEN:

- Semantic Fast Read CI, including the dedicated disposable end-to-end attestation;
- Organization Adapter Plugin CI;
- Paperclip OpenAPI Compatibility;
- Paperclip 916.1 OpenAPI Candidate CI;
- Integration Capability Projection CI;
- Core Candidate Artifact;
- Web CI;
- Messaging Gateway CI;
- Platform Admin CI;
- VendaERP Read-Only MCP CI.

Provider-extension workflows that are unchanged by this decision may still be reconciling on this head; their previously-qualified individual boundaries remain independently pinned and must remain green before PR merge.

## Proven evidence

### 1. Paperclip-owned run-result observation is qualified

The retained exact-version provider delta adds:

```text
capability = agent.runs.read
client     = ctx.agentRuns.get({ companyId, agentId, runId })
source     = heartbeatService.getRun(runId)
```

The host independently enforces:

- invocation company scope;
- exact agent membership;
- exact run/company/agent binding;
- read-only access;
- bounded output;
- no Board or agent credential exposure;
- no log/process/session/error-detail/provider-secret projection;
- no mutation/lifecycle surface.

The retained run-result patch is pinned at:

```text
Paperclip = v2026.916.1
commit    = d554c4789ed3930f8a53ac9fdf6503b3187097da
patch SHA-256 = 8972f5d500012f706ccce82dee8aef055aa99f8b97a1d34f89856a3e1d311c6f
```

### 2. The three Paperclip Fast Read provider deltas compose

The candidate requires three already-qualified provider-owned deltas:

1. `tools.operational.read`;
2. `agent.runs.read`;
3. bounded synchronous webhook response.

Because the first two touch adjacent insertion points in the Paperclip SDK, direct sequential patch application is not a reliable composition method.

The repository now contains a deterministic candidate compositor:

`integrations/paperclip/fast-read-convergence-v1/compose-qualified-patches.sh`

It:

- starts from exact clean Paperclip v2026.916.1 source;
- keeps every individual retained patch unchanged and independently auditable;
- allows overlap resolution only when both conflicting deltas are insertion-only relative to the exact upstream base;
- fails closed on deletion/replacement conflicts;
- applies the synchronous webhook replacement patch with exact-context semantics;
- rejects conflict markers;
- runs `git diff --check`;
- proves the composed capability markers exist.

The composition workflow additionally typechecks the composed plugin SDK/server and runs focused provider-boundary tests.

### 3. Organization Adapter 0.5.0 is a candidate, not a production replacement

The installable candidate now declares:

```text
wandora.organization-adapter-v1@0.5.0
Paperclip source = v2026.916.1@d554c478...
capabilities += tools.operational.read
capabilities += agent.runs.read
webhook += employee-capabilities
```

Its productionized capability projection reuses the ADR 0282 mapping but does not persist or mirror Paperclip operational state.

`employee-capabilities` returns only the provider-neutral integration/capability projection.

`employee-fast-read`:

- preserves the existing correlation/idempotency receipt;
- invokes the managed employee at most once;
- observes only that exact returned Paperclip run id;
- performs at most 25 reads with a 200 ms maximum interval;
- never retries `agents.invoke`;
- fails closed on missing run, failed/cancelled/timed-out/interrupted/scheduled-retry, malformed result or timeout;
- returns the bounded terminal deterministic result through the qualified synchronous webhook response;
- creates no Wandora lifecycle/state/result mirror.

### 4. Paperclip remains result authority

Exact v2026.916.1 `heartbeat_runs` has `resultJson` and `usageJson`; it does not have separate model/summary columns.

The existing Wandora Mastra adapter already validates the Core response:

- `executionId`;
- optional bounded `model`;
- bounded `summary`;
- normalized usage.

Previously it persisted only `executionId` in `resultJson`, which caused the plugin's legitimate Paperclip-owned result read to observe a succeeded run without enough bounded result fields.

The candidate correction persists only the already-sanitized safe projection:

```json
{
  "executionId": "...",
  "model": "wandora-deterministic-read-v1",
  "summary": "..."
}
```

No raw provider payload, tool output, credential, logs, process state or internal metadata is added.

### 5. Disposable end-to-end proof is GREEN

The Semantic Fast Read CI proves the composed candidate path in disposable infrastructure.

The attestation proves:

- issue-less Fast Read;
- exactly one Paperclip run for the accepted correlation;
- exactly one bounded read tool invocation;
- deterministic result persisted in the Paperclip-owned run;
- zero input/output/cached model tokens;
- zero agentic/model calls;
- replay of the same correlation does not invoke again;
- expired intent fails;
- unauthorized capability fails;
- ambiguous duplicate tool capability fails;
- negative terminal runs return synchronous webhook failure;
- negative cases do not add tool invocations.

No real provider or VendaERP operation is performed; the read tool is a disposable fixture.

### 6. Paperclip 916.1 is candidate-qualified without production promotion

Production remains pinned to Paperclip v2026.916.0.

A separate candidate lane proves exact upstream v2026.916.1:

```text
source commit = d554c4789ed3930f8a53ac9fdf6503b3187097da
OpenAPI paths = 685
OpenAPI SHA-256 = 55383e4b9aceee52544a5e8a93b7c04526f10cb13ce91082185df0691bd7e740
```

The real `buildOpenApiDocument()` export is byte-identical to the currently qualified v2026.916.0 HTTP contract, and all reviewed source/supplement/generator input hashes are unchanged.

The OpenAPI gate now distinguishes:

- canonical production pins, which remain strictly v2026.916.0;
- the explicit Organization Adapter 0.5.0 candidate record, which may target exact v2026.916.1 only with the retained qualification evidence.

No `compose.yaml` production pin changed.

## Capability Authority / Reuse Gate

### Wandora semantic authority

Wandora owns:

- `BusinessCapability`;
- semantic decision policy;
- deterministic-read admission;
- signed `FastReadIntent`;
- customer-safe result semantics.

### Paperclip operational authority

Paperclip owns:

- managed employee invocation;
- run lifecycle;
- terminal run state/result/usage;
- Connection/catalog/grant/Profile projection;
- Tool Gateway authorization;
- run/tool audit.

### Durable product state

No new durable Wandora state is justified by this candidate.

### Replacement boundary

The Organization Adapter remains the provider-specific boundary. A future control-plane provider may implement capability projection, invocation and terminal result observation differently without changing Wandora's semantic/customer contract.

## Second adversarial reviews

Relevant reviews selected:

- narrow Paperclip host run-result read after source proof: `proceed_fast`;
- Organization Adapter capability projection + bounded exact-run observation: `proceed_fast`;
- explicit Paperclip 916.1 candidate lane while production remains 916.0: `proceed_fast`;
- bounded result persistence correction inside the provider adapter: `proceed_fast = 0.86`.

## Decision

**Organization Adapter 0.5.0 + exact Paperclip v2026.916.1 composed Fast Read provider deltas are a QUALIFIED REPOSITORY CANDIDATE.**

**Production activation remains NO-GO.**

This ADR does not authorize:

- production Paperclip upgrade;
- Organization Adapter 0.5.0 production installation;
- Core Fast Read customer activation;
- concrete JEV/TypeSafe runtime wiring;
- new secrets/credentials;
- migration or table creation;
- provider/model/VendaERP call;
- VPS/runtime mutation;
- outbound.

## Remaining gap / next slice

The provider-side Fast Read path is now candidate-qualified.

The next code-only slice is the **Core Organization Adapter Fast Read Bridge V1**:

1. extend the Wandora-owned provider-neutral Organization Adapter contract for:
   - ephemeral available-capability projection;
   - bounded Fast Read dispatch/result;
2. reuse existing Human owner/admin authorization and exact active managed-employee/provider binding checks;
3. map the Paperclip implementation to the signed `employee-capabilities` and `employee-fast-read` webhooks;
4. wire `HumanDigitalEmployeeFastReadService` only after a concrete `SemanticDecisionProvider` boundary is separately qualified;
5. keep concrete JEV/TypeSafe auth/network/custody work under ADR 0276;
6. keep production activation blocked until a fresh convergence/promotion preflight.

## Effect boundary

```text
production deploy = 0
Paperclip production upgrade = 0
Organization Adapter production promotion = 0
Core Fast Read runtime activation = 0
migration/table = 0
Wandora run/result mirror = 0
Board/agent credential in Core = 0
provider/VendaERP real call = 0
production model/JEV call = 0
customer work = 0
outbound = 0
VPS mutation = 0
```

ADR 0285 is **CANDIDATE QUALIFIED / PRODUCTION ACTIVATION NO-GO / NO PRODUCTION EFFECT**.
