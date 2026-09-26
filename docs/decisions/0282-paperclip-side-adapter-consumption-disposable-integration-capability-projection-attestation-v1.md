# ADR 0282 — Paperclip-side Adapter Consumption + Disposable Integration Capability Projection Attestation V1

Status: **CODE COMPLETE / DISPOSABLE ATTESTATION GREEN / NO PRODUCTION EFFECT**  
Date: 2026-09-25

## Context

ADR 0278 defined the Wandora-owned Integration Capability Plane as a projection, not a
registry. ADR 0279 proved that Paperclip remains operational authority for Applications,
Connections, grants, catalog, Tool Profiles/policies, readiness/health, Tool Gateway
authorization and audit. ADR 0280 identified the missing safe plugin read boundary.
ADR 0281 then qualified one narrow Paperclip-host-owned capability:

`tools.operational.read`

through:

`ctx.toolAccess.readOperationalSnapshot({ companyId, agentId })`

The retained ADR 0281 patch is pinned to exact Paperclip
`v2026.916.1@d554c4789ed3930f8a53ac9fdf6503b3187097da` and uses cache-only catalog
reads. It exposes no Board credential, provider credential, secret ref or Paperclip
object IDs and performs no mutation/provider refresh.

Permanent guardrail:

> Portabilidade = desacoplamento do contrato, não duplicação da implementação.  
> Provider replacement não implica internalização.

## REAL NOW / proven evidence

At implementation qualification:

- Wandora `main@55a48280c3aa68542546f4bc0f6c2c3cb00f0d4f`;
- PR #367 branch `feat/adr0282-paperclip-integration-projection-attestation`;
- implementation qualification head `5e2baa5e25b0f3aa19096c3a2807809178da0126`;
- no production Paperclip promotion;
- no migration/table;
- no provider/model call;
- no VendaERP call;
- no customer work;
- no outbound effect.

## Decision

The Organization Adapter may consume the ADR 0281 bounded operational snapshot and
derive a provider-neutral integration projection using one explicit finite
provider-tool-to-`BusinessCapability` map.

The mapping is adapter-local and replaceable. Provider tool names are not Wandora
customer semantics and are not persisted as a Wandora registry.

The adapter exports the actual mapped semantic set as
`ADAPTER_MAPPED_BUSINESS_CAPABILITIES`; CI proves that this non-empty set is a strict
subset of Wandora's canonical `BusinessCapability` authority.

## Projection semantics

The adapter distinguishes:

1. **supported capabilities** — capabilities explicitly represented by accepted,
   read-only, non-write, non-destructive provider tools;
2. **organization-enabled capabilities** — the supported subset whose current
   Paperclip-owned operational evidence is ready.

Organization readiness fails closed unless the bounded snapshot proves the required
connection/runtime conditions, including active/enabled connection state,
healthy/ok health, active organization grant, installation for the exact agent and
effective Tool Profile admission.

Operational evidence may narrow semantic support. It never creates a new semantic
capability.

Current-run Tool Gateway authorization remains a separate final authority. An
organization-level projection cannot grant runtime tool execution by itself.

## Capability Authority / Reuse Gate

### Semantic authority

Wandora owns:

- `BusinessCapability`;
- customer-facing integration meaning;
- semantic routing/Fast Read policy;
- projection/intersection rules.

### Durable product state

No new durable state is introduced.

Specifically not authorized:

- Wandora integration registry;
- Connection mirror;
- grant mirror;
- Tool Catalog mirror;
- Tool Profile mirror;
- readiness/health mirror;
- provider tool registry;
- credential/secret copy.

### Operational authority

Paperclip continues to own:

- Applications and Connections;
- grants/install state;
- Tool Catalog;
- Tool Profiles/policies;
- runtime/connection health;
- run lifecycle;
- Tool Gateway authorization/execution/audit.

### Provider implementation

The explicit VendaERP tool mapping is an implementation detail of the current
Paperclip-side adapter.

### Replacement boundary

If Paperclip or VendaERP is replaced, the adapter mapping and provider operational
read implementation may change. Wandora `BusinessCapability`, customer semantics and
Fast Read contract remain stable.

## Disposable attestation

The dedicated `Integration Capability Projection CI` executes on GitHub-hosted
`ubuntu-24.04` and:

- checks out exact Paperclip source
  `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
- applies and digest-verifies the retained ADR 0281 host patch;
- rebuilds the patched Paperclip plugin SDK;
- re-runs host capability, tenant and cache-only proof;
- builds and tests the disposable adapter consumption;
- verifies the actual compiled/exported semantic map is a non-empty subset of Wandora
  semantic authority;
- runs a static no-shadow-state/no-admin-boundary verifier.

Implementation head `5e2baa5e25b0f3aa19096c3a2807809178da0126` completed all eight relevant
PR workflows GREEN:

- Integration Capability Projection CI — run `36201952698`;
- Semantic Fast Read CI;
- Organization Adapter Plugin CI;
- Core CI;
- Web CI;
- Platform Admin CI;
- Messaging Gateway CI;
- Paperclip OpenAPI Compatibility.

The host proof and disposable adapter tests remained GREEN. The static boundary
verifier also executed successfully.

## CI verifier correction

An earlier head failed only at the semantic-subset verifier with
`adapter_semantic_map_empty`.

The adapter itself had already passed its tests. The failure came from a brittle inline
source regex that discovered zero capabilities.

The accepted correction does not widen capability authority. It imports the
adapter's compiled/exported `ADAPTER_MAPPED_BUSINESS_CAPABILITIES` and compares that
actual runtime-build artifact against the canonical Wandora semantic vocabulary.

## Second adversarial review

Before the CI correction, the adversarial route review selected `proceed_fast` for
the CI-only fix.

After the exact implementation head became GREEN, completion review returned
`verify_more`, not because of an authority or implementation defect, but because the
canonical ADR/checkpoint had not yet been committed and the exact final documentation
head still required CI revalidation.

Therefore this ADR is not a deploy authorization.

## Effect boundary

```text
new migration/table = 0
Wandora integration/tool registry = 0
Paperclip operational-state mirror = 0
plugin.state operational snapshot = 0
Board/admin credential in Core/plugin = 0
provider credential/secret copy = 0
Paperclip production patch/upgrade = 0
VendaERP/provider call = 0
model call = 0
customer work = 0
outbound = 0
production effect = 0
```

## Final merge gate

The exact final PR head containing this ADR and canonical checkpoint must complete its
triggered GitHub-hosted CI GREEN before merge is evaluated.

A later production Paperclip promotion, runtime enablement or real Fast Read/provider
execution requires a separate effect-authorizing preflight/execution.

ADR 0282 is **CODE COMPLETE / DISPOSABLE ATTESTATION GREEN / NO PRODUCTION EFFECT**.
