# ADR 0369 — Semantic Fast Read Scoped Persistent Rollout Admission V1

Date: 2026-10-01

Status: **GREEN / CODE-ONLY QUALIFICATION / SCOPED PERSISTENT ROLLOUT CONTRACT / NO PRODUCTION EFFECT**

## Context

ADR 0368 proved one supervised owner-browser Semantic Fast Read end to end through Ana → Paperclip → governed VendaERP read and then restored the exact gates-OFF baseline. That attestation proves the path works; it does not justify turning the feature on globally or reusing the attestation overlay as permanent customer configuration.

The rollout problem is Wandora product/effect admission: exactly which Wandora organization, digital employee and business capabilities may enter the already-qualified read path. It is not a reason to duplicate Paperclip operational authority or create new durable product state.

ADR 0168 remains binding: portability is contract decoupling, not provider implementation duplication.

## Authority and reuse gate

- Wandora owns semantic authority and the product/effect decision to admit a configured organization/employee/capability into Semantic Fast Read.
- Paperclip remains operational authority for workforce lifecycle, Connections, organization grants, Tool Policy, runs, Tool Gateway execution, terminal result and audit.
- Organization Adapter continues to project the operationally available Wandora business capabilities from that Paperclip state.
- Mastra/Mistral and TypeSafe/JEV remain provider implementations behind existing Wandora-owned boundaries.
- No table, migration, state machine, service, subsystem, provider mirror or new durable registry is introduced.

## Decision

Permanent global activation is rejected. Persistent rollout uses an optional, configuration-backed Wandora admission policy composed of:

1. exact `(organizationId, employeeId)` target pairs;
2. an allowlist of canonical `BusinessCapability` values.

The process-global Fast Read, Semantic Fast Read and Semantic Selector flags remain coarse kill switches. When rollout configuration is absent, existing attestation behavior remains unchanged. A persistent rollout composition must use the dedicated `compose.semantic-fast-read-rollout.yaml` overlay, not the attestation overlay.

The rollout configuration is supplied by the deployment environment:

```text
WANDORA_SEMANTIC_FAST_READ_ROLLOUT_TARGETS=<organization-uuid>:<employee-uuid>[,...]
WANDORA_SEMANTIC_FAST_READ_ROLLOUT_CAPABILITIES=<BusinessCapability>[,...]
```

Both values must be present together. Parsing is bounded, target UUIDs are canonicalized, unsupported capabilities fail startup qualification, and the capability list reuses the existing canonical `BUSINESS_CAPABILITIES` contract.

## Runtime admission

When the rollout policy is configured:

1. a target not present in the exact organization/employee allowlist returns `rollout-not-enabled` before capability projection, JEV, semantic selector or Paperclip dispatch;
2. an enrolled target obtains the existing operational capability projection through the Organization Adapter/Paperclip boundary;
3. Core computes `effectiveCapabilities = operationalCapabilities ∩ rolloutCapabilities`;
4. an empty effective set returns `capability-not-advertised` before JEV;
5. only `effectiveCapabilities` are visible to the semantic decision, the existing deterministic-read gate and the signed Fast Read intent.

This does not replace or weaken Paperclip Tool Policy. A capability must pass both Wandora rollout admission and the existing provider-operational projection.

## Persistent Compose contract

`infra/stacks/core/compose.semantic-fast-read-rollout.yaml` is a distinct persistent rollout overlay. It sets:

```text
WANDORA_FAST_READ_EXECUTION_ENABLED=true
WANDORA_SEMANTIC_FAST_READ_ENABLED=true
WANDORA_SEMANTIC_SELECTOR_ENABLED=true
WANDORA_HUMAN_SEND_PROPOSAL_ENABLED=false
```

and requires the exact rollout target/capability environment values. It adds no image, build, network, port, secret store or volume. Secret custody continues to come from the existing custody/model overlays.

The attestation overlay remains attestation-only and does not gain rollout variables.

## Initial future canary scope

The first future persistent canary is intentionally narrower than the total adapter capability surface:

- one exact organization/employee pair;
- capability `business.products.price` only.

ADR 0368 directly proved the product-price path. Broader search/stock/order capabilities require their own evidence before being added to a customer rollout allowlist.

This ADR does not activate that canary.

## Observability and stop conditions

The Core startup event exposes only the boolean `semanticFastReadRollout`; it does not log tenant IDs, employee IDs, customer text or secret material. Existing Fast Read latency stages, Paperclip terminal run evidence and governed Connection activity remain the operational evidence surfaces.

A future production rollout must stop/rollback if any of the following occurs:

- a non-enrolled target reaches semantic/provider dispatch;
- a capability outside the authorized canary set is selected or executed;
- an unexpected retry or second tool execution occurs;
- a write/destructive tool is selected;
- the returned logical model is not `wandora-deterministic-read-v1`;
- token usage is not exactly zero;
- Core, Paperclip or Organization Adapter becomes degraded;
- grant or Tool Policy evidence drifts from the qualified read-only posture;
- Human Send or Messaging Gateway outbound is ON;
- source/image/Compose provenance or rollback evidence no longer matches the intended pre-effect state.

## Rollback boundary

A future persistent rollout effect must be immediately reversible by removing the rollout + custody effect overlays and restoring the exact pre-effect gates-OFF Core composition and image.

Historical ADR 0367 rollback evidence is not standing authorization for a later mutation. Immediately before any real rollout, the then-current production baseline and rollback receipt must be freshly reconciled; if the baseline changed, rollback evidence must be refreshed for that actual state.

## Test-driven qualification

The slice was implemented with explicit RED → GREEN evidence:

- initial admission tests proved the pre-change service still dispatched a non-enrolled target and exposed capabilities outside the intended rollout set;
- runtime configuration RED proved the rollout object was absent before the parser existed;
- a later adversarial test proved an empty operational/rollout capability intersection still called the semantic decision once; the final guard now returns before that call.

Implementation candidate `3b63623f249c050536c0484c8db26a1d505ffae7` completed all seven workflows associated with that exact code head successfully, including Core CI, Semantic Fast Read CI with disposable E2E, Paperclip Mastra Adapter CI and Core Candidate Artifact.

Core CI additionally qualifies the persistent rollout Compose render separately from the attestation render and proves Human Send/outbound remain outside the rollout overlay.

## Production effect statement

This slice is repository/code qualification only. It performed:

- no production Core recreation;
- no Semantic Fast Read activation on the VPS;
- no Ana customer request;
- no VendaERP read;
- no Mistral customer-path request;
- no Paperclip lifecycle mutation;
- no Human Send or Messaging Gateway outbound activation;
- no database migration or table creation;
- no merge of PR #369 or PR #377.

## Next boundary

After this PR is fully reviewed and integrated under explicit human authority, any real canary rollout is a separate production-effect slice. It must begin from fresh Git/CI/runtime evidence, prove current Paperclip operational capability/policy, prove immediate rollback, define stop conditions, receive a second adversarial review, and obtain explicit human approval before mutation.
