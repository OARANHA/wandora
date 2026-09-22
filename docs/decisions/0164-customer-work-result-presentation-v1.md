# ADR 0164 — Customer Work Result Presentation V1

Status: **ACCEPTED / IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**
Date: 2026-09-22

## Context

ADR 0161 proved that legitimate supervised customer work can execute end to end and return an internal result to the authenticated owner.

The production screenshot then exposed a product-surface defect: Markdown markers from the model result, such as `**texto**`, were rendered literally.

That is a presentation problem, not a reason to change the customer-work execution contract or to trust model output as HTML.

## REAL NOW entering the slice

The canonical base was:

```text
main = 675682857047fefac8927e0ceae88e5fad24845c
PR #219 = merged
open PRs = 0
post-merge Core/Web/Platform Admin/Messaging Gateway CI = GREEN
```

The existing customer-work result remains a Wandora-owned internal result projection:

```text
result.summary = model-produced text
result.model   = provider-neutral logical model identity
```

No external effect is authorized by rendering that text.

## Capability Authority / Reuse Gate

No backend capability, model call, workflow or storage change is required.

This slice is customer presentation only:

- existing work result remains authoritative;
- Web decides how to present text safely;
- the model is not trusted to emit executable markup;
- no new knowledge/grounding subsystem is created here.

## Decision

Implement a small Wandora-owned safe result formatter/renderer rather than accepting raw HTML or importing a broad Markdown runtime.

Supported presentation primitives:

- headings;
- paragraphs;
- bold emphasis;
- inline code;
- unordered lists;
- ordered lists;
- block quotes.

Links/images written as Markdown keep their visible label/alt text but their targets are discarded. Model output therefore cannot introduce a clickable destination through this renderer.

Raw HTML remains ordinary React text and is escaped by React.

The renderer explicitly does **not** use:

- `dangerouslySetInnerHTML`;
- `innerHTML`;
- model-provided `href`;
- raw HTML parsing.

## Dashboard preview

The compact latest-work preview on `Início` does not render rich content. It uses a plain-text formatter that:

- removes supported Markdown markers;
- removes link targets;
- preserves visible labels;
- truncates only after normalization.

This prevents raw Markdown syntax from leaking into the compact dashboard card.

## Validation

A dedicated build verifier was added:

```text
WANDORA_WEB_WORK_RESULT_SAFE_RENDERING_V1_OK
```

It proves:

- headings/lists/quotes are parsed;
- strong/code inline tokens are parsed;
- Markdown link targets do not survive parsing;
- preview text does not retain raw strong markers or URL targets;
- the React renderer contains no `dangerouslySetInnerHTML`, `innerHTML` or `href=`;
- the customer-work panel uses the safe renderer;
- the dashboard uses the plain-text preview.

The implementation head passed:

```text
Web CI               = GREEN
Core CI              = GREEN
Platform Admin CI    = GREEN
Messaging Gateway CI = GREEN
```

Existing customer-work idempotency and activation/hire bridge verifiers remain unchanged and GREEN.

## Second adversarial review

Rejected alternatives:

1. use `dangerouslySetInnerHTML` after sanitizing model output;
2. allow arbitrary model-generated links;
3. alter the backend result schema merely for formatting;
4. add a full Markdown/HTML dependency before proving it is needed;
5. reinterpret formatting work as authorization for external actions.

The accepted implementation is deliberately inert and presentation-only.

## Decision

**Customer Work Result Presentation V1 is accepted as a code foundation.**

This ADR does not claim the new renderer is live in production until a separate Web promotion is explicitly executed and validated.

## Next axis

Continue Customer Product Surface Canonicalization page-by-page.

Recommended next focus:

- `Conversas` visual canonicalization against existing real conversation reads;
- then `Empresa / Regras da casa` capability-authority review for grounding before broader autonomous outbound behavior.
