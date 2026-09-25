# ADR 0268 — Owner Work 70/30 + Digital Employee Development Web V1

Status: **IMPLEMENTED IN CODE / WEB ONLY / NO PRODUCTION EFFECT**  
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
