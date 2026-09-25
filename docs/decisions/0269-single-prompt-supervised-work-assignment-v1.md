# ADR 0269 — Single-Prompt Supervised Work Assignment V1

Status: **IMPLEMENTED IN CODE / WEB ONLY / NO PRODUCTION EFFECT**  
Date: 2026-09-25

## Context

The live Team work form currently requires both `title` and `description` before a supervised work request can be submitted.

For a business user, a natural-language request such as:

```text
Qual o valor do Desenvolvimento Web?
```

is already a complete work request. Requiring a second mandatory field is an implementation detail leaking into the customer experience.

## Decision

The first field becomes the canonical required customer request.

The optional second field becomes extra detail only.

If no extra detail is supplied:

```text
title = normalized request
description = normalized request
```

If extra detail is supplied:

```text
title = normalized request
description =
<normalized request>

Detalhes adicionais:
<normalized optional detail>
```

This preserves the existing Core `title + description` contract without requiring a backend/schema change and without model-based enrichment.

## Authority / Reuse Gate

No new:

- table;
- migration;
- API endpoint;
- work lifecycle;
- model call;
- semantic extraction;
- prompt service;
- provider capability.

The Web only adapts natural customer input to the existing supervised-work contract.

ADR 0168 remains preserved.

## Idempotency

The work idempotency fingerprint continues to be computed from the exact `title + description` payload sent to Core.

Uncertain/retry behavior is unchanged.

## UX

Required:

```text
O que você quer que Ana faça?
```

Example:

```text
Qual o valor do Desenvolvimento Web?
```

Optional:

```text
Detalhes adicionais (opcional)
```

The submit button now requires only the main request.

## Validation

Local validation on the operational VPS:

```text
TypeScript = GREEN
WANDORA_WEB_OWNER_WORK_FLOW_V1_OK
```

The VPS host uses Node 18 while canonical Web CI uses the reviewed Node 22 image; GitHub-hosted Web CI remains the authoritative build gate.

## Second adversarial review

Jev returned `allow`.

Safeguards preserved:

- no Core/API/schema change;
- no provider/model call;
- no inferred intent;
- exact payload remains deterministic;
- idempotency and uncertain retry remain intact;
- outbound remains blocked.

## Effect boundary

```text
production Web promotion = 0
Core change = 0
DB change = 0
Paperclip change = 0
provider/model call = 0
customer work = 0
outbound = 0
```
