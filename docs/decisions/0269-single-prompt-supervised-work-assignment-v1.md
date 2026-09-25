# ADR 0269 — Single-Prompt Supervised Work Assignment V1

Status: **EXECUTED / GREEN / WEB ONLY**  
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


## Production promotion

Production promotion completed successfully as a Web-only effect after PR #353 merged and all normal workflows were GREEN.

Canonical source:

```text
main = 109ef9782f112493bd104b2c58a03d3db5708811
main tree = f65e14918dfaeec5b72bdfe882c92ac66c8ac4b7
artifact synthetic merge = 7edf5895f3e34fd17416d4f0e402d57a662e3492
artifact tree = f65e14918dfaeec5b72bdfe882c92ac66c8ac4b7
tree equality = true
```

Qualified Web artifact:

```text
artifact id = 10856915032
artifact name = web-candidate-7edf5895f3e34fd17416d4f0e402d57a662e3492
GitHub digest = sha256:67dc68bf01be185f6b9415a818a6a02dec6995500974e89a62d286f1dc14593e
image tag = wandora/web:candidate-7edf5895f3e3
archive sha256 = 7df7ff2758402a7b3fcad324ad97e6804dab1c95fcc5d42a5cc134f7e363041a
loaded image id = sha256:a54d696504ca52c739af19b2552c48708df05d26c197a9d2569f716ba94add5f
revision = 7edf5895f3e34fd17416d4f0e402d57a662e3492
candidate = wandora-web-reviewed-bridge-v1
```

Rollback baseline captured before effect:

```text
WANDORA_WEB_IMAGE=wandora/web:candidate-08e01651eb6d
backup = /opt/wandora/stacks/web/.env.adr0269.before
old Web health = healthy
old Web restart = 0
```

Only the Web service was recreated.

Post-promotion runtime:

```text
Web image = wandora/web:candidate-7edf5895f3e3
Web revision = 7edf5895f3e34fd17416d4f0e402d57a662e3492
Web health = healthy
Web restart = 0

Core = unchanged / healthy / restart 0
Paperclip = unchanged / healthy / restart 0
Messaging Gateway = unchanged / healthy / restart 0
```

Live local-Traefik validation:

```text
/healthz = 200
/        = 200
/team    = 200
/work    = 200
/login   = 200
```

Live bundle:

```text
/assets/index-CBzWL6F8.js
```

Verified live bundle markers:

- O que você quer que Ana faça?
- Qual o valor do Desenvolvimento Web?
- Detalhes adicionais (opcional).
- Atribuir trabalho supervisionado

Final production effect:

```text
Web recreate = 1
Core recreate = 0
Paperclip recreate = 0
Messaging Gateway recreate = 0
migration = 0
provider/model call = 0
customer work = 0
outbound = 0
```

ADR 0269 is now **EXECUTED / GREEN / WEB ONLY**.
