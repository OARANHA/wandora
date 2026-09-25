# ADR 0266 — Digital Employee Development Durable Contract Implementation V1

Status: **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**  
Date: 2026-09-25

## Context

ADR 0264 established the product/authority model for accumulated employee learning. ADR 0265 passed the reuse gate and proved a legitimate Wandora-owned gap: minimum provider-neutral employee-specific guidance with provenance/history.

This ADR implements that minimum contract without creating a Wandora memory, RAG, Skills or Decision Training engine.

## Decision

Add one minimal durable semantic contract:

```text
wandora.digital_employee_development_entries
```

with:

- exact organization + canonical Wandora employee scope;
- `responsibility | behavior | practice`;
- `owner_statement | approved_learning | approved_correction` provenance;
- provider-neutral source evidence;
- `active | retired` lifecycle;
- correction history through `supersedes_entry_id`;
- human actor + audit evidence.

The Core runtime receives SELECT only. Writes use bounded SECURITY DEFINER create/correct/retire functions with tenant + active owner/admin authorization.

No direct browser table access is granted.

## Human API

Core implements employee-scoped provider-neutral routes:

```text
GET  /api/v1/organizations/:organizationId/digital-employees/:employeeId/development
POST /api/v1/organizations/:organizationId/digital-employees/:employeeId/development
POST /api/v1/organizations/:organizationId/digital-employees/:employeeId/development/:entryId/correct
POST /api/v1/organizations/:organizationId/digital-employees/:employeeId/development/:entryId/retire
```

Active organization members may read. Only owner/admin may mutate.

Approved learning and correction require explicit evidence. Direct create cannot claim `approved_correction`.

## Runtime projection

The existing runtime contract remains structurally separated:

```text
officialFacts[]
houseRules[]
employeeGuidance[]
workContext
```

`employeeGuidance[]` contains only active entries for the exact canonical employee bound to the Paperclip execution.

The projection:

- is read-only and tenant-scoped;
- has a hard 100-entry bound;
- fails closed on overflow;
- exposes only kind/content/provenance type/source label;
- does not expose row IDs, sourceRef or provider IDs.

Core readiness fails closed when the employee-development storage boundary is unavailable while the Paperclip execution bridge is enabled.

## Provider boundary

Paperclip remains operational authority for Skills, agent skill assignment, managed instructions and Decision Training.

Mastra remains operational authority for runtime memory, semantic recall, working memory, observations and context mechanics.

This contract does not automatically materialize guidance into Paperclip Skills and does not persist Mastra memory.

## Candidate learning boundary

No candidate-learning queue/store is added.

Experience/model output does not become durable guidance automatically.

This implementation only supports already-authorized employee development entries. A future candidate-suggestion feature requires its own authority/effect decision.

## Validation contract

Dedicated verifier must prove:

- RLS + tenant isolation;
- Core SELECT-only table privilege;
- bounded mutation functions;
- owner/admin create;
- member mutation denial;
- approved-learning evidence requirement;
- correction history;
- cross-tenant denial;
- canonical audit actions;
- provider-neutral API behavior;
- exact employee runtime isolation;
- retired guidance exclusion;
- no sourceRef/row IDs in runtime projection;
- 100-entry overflow fail-closed;
- readiness failure when migration 020 boundary is missing;
- existing execution bridge tests remain GREEN.

Expected marker:

```text
DIGITAL_EMPLOYEE_DEVELOPMENT_V1_VERIFY_OK
```

## Second adversarial review

Jev reviewed the implementation plan after ADR 0265 and returned `allow`.

Safeguards preserved:

- migration is repository code only and is not applied in production;
- no Web editing surface yet;
- no provider mutation;
- no model/provider call;
- no customer work;
- no outbound effect;
- no candidate-learning persistence;
- no generic memory/skills/training engine.

## Effect boundary

```text
production migration applied = 0
production Core promotion = 0
production Web change = 0
Paperclip mutation = 0
Mastra mutation = 0
customer work = 0
provider/model call = 0
outbound = 0
```

## Next slice

After merge + GREEN CI, perform a separate **Digital Employee Development Production Activation Preflight V1 — NO EFFECT** before migration 020 or Core promotion.

A later Web slice may expose business-friendly `Responsabilidades` and `Aprendizados` only after the backend contract is promoted and validated.
