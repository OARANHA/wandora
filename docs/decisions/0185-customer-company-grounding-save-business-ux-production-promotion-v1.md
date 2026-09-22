# ADR 0185 — Customer Company Grounding Save + Business UX Production Promotion V1

Status: **EXECUTED / GREEN / CORE + WEB**
Date: 2026-09-22

## Context

ADR 0184 fixed two customer-facing problems discovered during the first real MEDICSPRO grounding attempt:

1. Core HTTP did not read POST bodies for the canonical grounding create/correct routes, causing deterministic `400 invalid-grounding-request` before authentication;
2. the `/company` UI exposed internal/technical terminology instead of business-friendly language.

The durable grounding contract, migration 017, fact/rule semantics, provenance semantics and provider boundaries were not changed.

## Canonical source and CI

Promotion source:

```text
main = d8349b353bb7cc46423ea8ba60e8989522ef6b17
PR #243 = MERGED
```

All post-merge push workflows on that exact main were GREEN:

- Core CI
- Core Candidate Artifact
- Web CI
- Platform Admin CI
- Messaging Gateway CI
- Paperclip Mastra Adapter CI

A duplicate PR #244 was closed without merge after reconciliation proved #243 already contained the exact slice.

## Artifact qualification

### Core

GitHub Actions artifact:

```text
artifact id = 10720184087
name = core-organization-adapter-candidate-d8349b353bb7cc46423ea8ba60e8989522ef6b17
artifact ZIP sha256 = a42c810643ed990b7733a8fb87001fdfb5829ac5499bd8357a30af03b7f701c6
source_sha = d8349b353bb7cc46423ea8ba60e8989522ef6b17
source_tree_sha = 62ddd04c16c4400715e4410873a2a0f97fa2975b
image_tag = wandora/core:organization-adapter-candidate-d8349b353bb7
OCI manifest/image id = sha256:0566fb5ce0aa566300fb1eb25c0af33de33d40e84e30c2fd7f3f12de8154f770
OCI config digest = sha256:5a0eebdf299f8b541e566058a06d9c8ae15d2217b94e4af60fbe634ba8846b2b
archive sha256 = b69530f1f9612f0e10630a13e539fba9df8c75196ae13a343b38152937b40d37
```

Internal `SHA256SUMS` verified the Core archive.

Exact-artifact isolated runtime proof, without secrets/database/external network:

```text
grounding create rawBody forwarded = true
grounding correct rawBody forwarded = true
```

### Web

GitHub Actions artifact:

```text
artifact id = 10721560040
name = web-candidate-d8349b353bb7cc46423ea8ba60e8989522ef6b17
artifact ZIP sha256 = f98f05b55b78b372cc155d945d949a3e64f6ff5482f697810e450071697f6527
source_sha = d8349b353bb7cc46423ea8ba60e8989522ef6b17
source_tree_sha = 62ddd04c16c4400715e4410873a2a0f97fa2975b
image_tag = wandora/web:candidate-d8349b353bb7
artifact manifest image id = sha256:c36e55025a283096d287c86c56784724d9e13ff8d65aa8dc772e0507d107e8c4
web-image.tar sha256 = eb36a0bd37465c3f7f6df4a2bc5037aee0d99b96f299383ab09889dcfe3b737f
manifest.txt sha256 = 7a4111152bd8f9336b5f607ffe3b8c1b1cb246608924122f4161ef48a5230f12
```

Internal `SHA256SUMS` verified both Web payload files.

Disposable Web candidate on the private `wandora-core` network:

```text
/healthz = 200
/company = 200
/api/v1/me without session = 401
grounding without session = 401
restart = 0
```

## Second adversarial review

Before promotion:

- Core old/new rendered Compose was proven identical except for the Core image selector;
- no migration/schema/table/provider change existed;
- migration 017 remained live/verified;
- MEDICSPRO grounding rows remained 0;
- works remained 2;
- outbound attempts remained 0;
- Ana remained exactly one `active + supervised`;
- Human Send and Gateway outbound remained OFF by absence.

Rejected:

- rebuilding production artifacts on the VPS;
- changing migration 017;
- creating grounding during promotion;
- changing Paperclip/Mastra authority;
- bypassing normal owner authentication;
- mixing housekeeping with this slice.

## Rollback evidence

Execution directory:

`/home/wandora-admin/executions/company-grounding-save-business-ux-production-promotion-v1`

Rollback selectors:

```text
Core before = wandora/core:organization-adapter-candidate-d90b225e6cc2
Web before  = wandora/web:candidate-8fb5201b0229
```

Backups:

```text
core-image.before sha256 = b59dc33fa5e39c3c48dd7c8c93b8ee6a9ddefc57931f0b5cdb30075624c18e16
web.env.before sha256    = 437497816518e4ac2d4f62e3cf57d1f420b4aa61dea1a8e248e6e63a0cae2812
```

## Execution

### Core

Only the Core image selector changed:

```text
before = wandora/core:organization-adapter-candidate-d90b225e6cc2
after  = wandora/core:organization-adapter-candidate-d8349b353bb7
```

The same live Compose overlays were reused. Health/ready rollback was prepared before replacement.

Post-promotion Core:

```text
healthy
restart = 0
healthz = 200
readyz = 200
source revision = d8349b353bb7cc46423ea8ba60e8989522ef6b17
```

Critical end-to-end regression proof:

A syntactically valid grounding POST through the live Core **without authentication** now returns:

```text
401 unauthorized
```

Before this fix the same shape returned:

```text
400 invalid-grounding-request
```

This proves the body now reaches the canonical handler before normal authorization, without creating any grounding row.

### Web

Only the Web image selector changed:

```text
before = wandora/web:candidate-8fb5201b0229
after  = wandora/web:candidate-d8349b353bb7
```

Post-promotion public proof:

```text
/healthz = 200
/login = 200
/company = 200
/team = 200
/work = 200
/conversations = 200
/api/v1/me without session = 401
grounding without session = 401
out-of-contract grounding route = 404
generic unreviewed API route = 404
```

Live bundle proof confirms the customer-facing language:

- `O QUE SUA EQUIPE DIGITAL PRECISA SABER?`
- `Informação da empresa`
- `Adicionar à empresa`

Internal identifiers remain unchanged behind the UI:

- `fact`
- `rule`
- `owner_statement`
- `approved_source`
- provider-neutral `sourceRef/sourceLabel`

## Final production state

```text
Core = wandora/core:organization-adapter-candidate-d8349b353bb7
Web = wandora/web:candidate-d8349b353bb7
Paperclip = wandora/paperclip:v2026.916.0
Messaging Gateway = wandora/messaging-gateway:origin-fix-94cfb4de

all four services = healthy
Core/Web restart = 0
Paperclip/Gateway unchanged

MEDICSPRO grounding rows = 0
MEDICSPRO works = 2
MEDICSPRO outbound attempts = 0
Ana = exactly one active + supervised

Human Send = OFF
Gateway outbound = OFF
```

No grounding row, model call, customer work, provider run, wakeup, task session or external message was created by the promotion.

## Capability Authority

No authority changes.

- Wandora owns official facts, owner-authored house rules and provenance semantics;
- Paperclip remains control-plane/lifecycle authority;
- Mastra/replacement runtime remains memory/retrieval/context assembly/runtime execution;
- effect authorization remains Wandora-owned.

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication.

## Decision

**Customer Company Grounding Save + Business UX Production Promotion V1 is COMPLETE / GREEN.**

The next effect may resume the already-authorized **MEDICSPRO First Real Organization Grounding Content Execution V1** through a normal authenticated owner/admin session.

The frozen semantic set remains:

- F1/F2/F3 = `fact`;
- R1 = `rule`;
- provenance = `owner_statement`;
- sourceRef = `wandora:customer-work-operation:9a4bc45c-cb6e-410d-8e46-3d7b84fc85ab`.
