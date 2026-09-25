# ADR 0268 — Owner Work 70/30 + Digital Employee Development Web V1

Status: **EXECUTED / GREEN / WEB ONLY**  
Date: 2026-09-25

## Objective

Turn the now-live employee-development backend contract into a business-facing customer experience while also correcting the desktop Work layout.

This slice implements two connected product flows without adding backend state:

1. Work becomes a desktop 70/30 operational layout:
   - main supervised-work history/result area on the left;
   - exceptional human-attention queue on the right;
   - mobile remains stacked;
   - the attention panel is bounded and scrolls internally when needed.

2. Team / Ana exposes real employee development:
   - Responsabilidades;
   - Aprendizados;
   - Autonomia.

A reviewed work result can also become the source of an explicitly approved learning through **Ensinar à Ana**.

## Authority preserved

No new product state is introduced.

The Web reuses the production contract created by ADR 0265/0266 and activated by ADR 0267:

```text
GET  /api/v1/organizations/:organizationId/digital-employees/:employeeId/development
POST /api/v1/organizations/:organizationId/digital-employees/:employeeId/development
```

The Web proxy opens only that exact employee-development base endpoint for this slice.

Paperclip Skills / Decision Training remain provider-owned operational capabilities.

Mastra memory / working memory / semantic recall remain runtime-provider capabilities.

Company-wide official facts / Regras da Casa remain organization grounding and are not reused as employee-specific guidance.

## Work desktop layout

The previous stacked layout rendered:

```text
supervised work history
attention-required area
```

one below the other.

Desktop now renders:

```text
┌─────────────────────────────┬───────────────────┐
│ Work history/results ~70%   │ Your attention    │
│                             │ ~30%              │
│ bounded history viewport    │ bounded/sticky    │
└─────────────────────────────┴───────────────────┘
```

Implementation uses:

```text
xl:grid-cols-[minmax(0,2.15fr)_minmax(20rem,0.85fr)]
```

The black attention area remains an exceptional decision queue. It does not become a learning inbox.

## Team employee-development surface

Each real digital employee now has a customer-facing development area with tabs:

```text
Responsabilidades | Aprendizados | Autonomia
```

### Responsabilidades

Reads active `responsibility` entries.

Owner/admin may add a direct responsibility using:

```text
kind = responsibility
provenanceType = owner_statement
```

### Aprendizados

Reads active `behavior | practice` entries.

Owner/admin may directly teach a behavior/practice using:

```text
provenanceType = owner_statement
```

The surface shows provenance in business language such as:

- Orientação direta;
- Aprendizado aprovado;
- Correção aprovada.

### Autonomia

Only the currently real autonomy contract is shown:

```text
supervised
```

Learning does not change autonomy automatically.

Future levels remain non-actionable.

## Reviewed work -> approved learning

A work result drawer now offers:

```text
Ensinar à Ana
```

only to owner/admin and only when a real work result exists.

The customer must type the exact learning to preserve.

The work result is **not** copied automatically into employee guidance and no model performs extraction.

The user classifies the learning as:

```text
practice
behavior
responsibility
```

The mutation uses:

```text
provenanceType = approved_learning
sourceRef = work:<canonical-work-id>
sourceLabel = Trabalho “<title>”
```

Therefore work provides evidence/provenance, while the human explicitly determines the authoritative future guidance.

## Human authority

Read access follows the Core contract.

Mutation controls are rendered only for active organization owner/admin roles.

A member may see development but does not receive create controls.

The Core remains authoritative and independently enforces owner/admin mutation.

## Idempotency

Each visible create draft receives one browser-generated idempotency key.

The same key is retained while that same draft remains open and is reused if the user retries after an error.

A successful mutation invalidates the exact employee-development query.

This slice does not introduce a durable browser queue or candidate-learning store.

## Web proxy boundary

The Nginx bridge explicitly proxies only:

```text
/api/v1/organizations/<uuid>/digital-employees/<uuid>/development
```

with:

- Authorization forwarded;
- Idempotency-Key forwarded;
- Cookie stripped;
- generic /api remains closed by default.

Correct/retire endpoints are not opened by this Web slice because this first customer surface does not use them.

## Verification

Added:

```text
apps/web/scripts/verify-employee-development-surface-v1.mjs
```

It proves:

- desktop 70/30 Work structure;
- attention radar remains separate;
- Team exposes the real development panel;
- exact Core development endpoint is used;
- work-derived learning uses `approved_learning`;
- work source provenance is present;
- no automatic result promotion;
- idempotency key is forwarded;
- no Paperclip/Mastra operational capability is introduced.

The existing reviewed bridge verifier also proves the new Nginx boundary.

Local VPS validation:

- TypeScript: GREEN;
- reviewed Web bridge verifier: GREEN;
- existing Work operator drawer verifier: GREEN;
- employee-development surface verifier: GREEN;
- full Web verifier suite reaches and passes all product verifiers;
- final Vite bundling cannot execute under the VPS host Node 18 because current Vite requires Node >=20.19 / >=22.12.

This is an environment mismatch only. Canonical Web CI uses the reviewed Docker build based on Node 22.23.2 and remains the authoritative build gate.

## Capability Authority / Reuse Gate

No new:

- table;
- migration;
- Core service;
- memory store;
- candidate-learning queue;
- prompt store;
- RAG/vector system;
- Paperclip Skill clone;
- Decision Training clone;
- autonomy state machine.

This is a Web projection/mutation client over the already accepted Wandora-owned semantic contract.

ADR 0168 remains preserved.

## Second adversarial review

Jev reviewed the proposed UX before implementation and returned `allow`.

Safeguards preserved:

- no auto-learning;
- no result-summary auto-promotion;
- owner/admin mutation only;
- future autonomy levels remain non-clickable;
- attention-required remains actual exceptional work;
- company rules remain separate;
- no provider mutation.

## Effect boundary

```text
production Web promotion = 0
production Core change = 0
production DB change = 0
Paperclip mutation = 0
Mastra mutation = 0
customer work = 0
provider/model call = 0
outbound = 0
```

## Next gate

Open PR and require normal CI GREEN.

Production Web promotion, if qualified, is a separate Web-only effect using the exact CI candidate artifact.


## Production promotion

Production promotion completed successfully as a Web-only effect after PR #351 merged and all normal workflows were GREEN.

Canonical source:

```text
main = 87165b070ebf5c152d04511d2d0c1b248b8b7313
main tree = 9510a018fc6a94490b78b0ffc6083cef17f421fb
artifact synthetic merge = 08e01651eb6df1e2a3b5592827123064d0ec8486
artifact tree = 9510a018fc6a94490b78b0ffc6083cef17f421fb
tree equality = true
```

Qualified Web artifact:

```text
artifact id = 10854889675
artifact name = web-candidate-08e01651eb6df1e2a3b5592827123064d0ec8486
GitHub digest = sha256:7f3781bc3b171eda7522f07210e333ab15b38a2bcc4041040c73f2682ded485e
image tag = wandora/web:candidate-08e01651eb6d
archive sha256 = a79b0b14022c2c125ea119997a9ab9fd60248230b0d89775e74df7cff9259e67
loaded image id = sha256:c9b0695c7755b552004b0fb7c87fcae66d68b947a65016c464e94d43a388981e
revision = 08e01651eb6df1e2a3b5592827123064d0ec8486
candidate = wandora-web-reviewed-bridge-v1
```

Rollback baseline captured before effect:

```text
WANDORA_WEB_IMAGE=wandora/web:candidate-72ce1b29158e
backup = /opt/wandora/stacks/web/.env.adr0268.before
old Web health = healthy
old Web restart = 0
```

Only the Web service was recreated.

Post-promotion runtime:

```text
Web image = wandora/web:candidate-08e01651eb6d
Web revision = 08e01651eb6df1e2a3b5592827123064d0ec8486
Web health = healthy
Web restart = 0

Core = unchanged / healthy / restart 0
Paperclip = unchanged / healthy / restart 0
Messaging Gateway = unchanged / healthy / restart 0
```

Live local-Traefik validation:

```text
/healthz        = 200
/               = 200
/team           = 200
/work           = 200
/conversations  = 200
/approvals      = 200
/company        = 200
/login          = 200
/api/v1/me      = 401 unauthenticated
```

Live bundle:

```text
/assets/index-DZeet7lm.js
```

Verified live bundle markers:

- Responsabilidades
- Aprendizados
- Autonomia
- Ensinar à Ana
- O resultado deste trabalho não vira aprendizado automaticamente.
- COMO ...
- SÓ INTERROMPE VOCÊ QUANDO PRECISA.

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

ADR 0268 is now **EXECUTED / GREEN / WEB ONLY**.
