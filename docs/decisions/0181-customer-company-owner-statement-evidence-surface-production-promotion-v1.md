# ADR 0181 — Customer Company Owner-Statement Evidence Surface Production Promotion V1

Status: **EXECUTED / GREEN / WEB ONLY**
Date: 2026-09-22

## Context

ADR 0180 corrected only the customer `/company` form so direct `owner_statement` grounding may preserve optional provider-neutral `sourceRef/sourceLabel`.

No Core/schema/provider contract changed.

The exact post-merge Web artifact from `main@8ee226bcc0ddec2f333348235c501320fb223152` was qualified before production promotion.

## Artifact qualification

GitHub-hosted Web CI run `35783888526` produced:

- artifact id = `10719012363`;
- artifact name = `web-candidate-8ee226bcc0ddec2f333348235c501320fb223152`;
- artifact ZIP sha256 = `4e0880faeabf10ae2cd21f7dd212b44ac75896eb119cf9372c491ad9b5fed455`;
- source SHA = `8ee226bcc0ddec2f333348235c501320fb223152`;
- source tree SHA = `5d499b45d468099e98cc765fa380398b48dc7fdc`;
- image tag = `wandora/web:candidate-8ee226bcc0dd`;
- manifest-declared image id = `sha256:cbf2c8d411db400adeedfa114749ec63a5c22942c17a2ea59b9eb80238c279d7`;
- `web-image.tar` sha256 = `0bde7bbb880e6b576823c4765181ccc5af0f972d2c47a8a276032b1d11dfe3be`;
- `manifest.txt` sha256 = `502695a8a21053181b648357e39642611b48a3309ec61b168ffa98adc99e7bee`;
- `SHA256SUMS` sha256 = `3fd7add6c75ba2981f5156da6ff8b8afcc1a2e59fe6a1c83ef2502172f6834ee`.

The ZIP digest matched GitHub metadata and internal SHA256SUMS verified both payload files.

## Second adversarial review

The exact loaded artifact was run as a disposable private Web candidate against the live Core.

Proof:

- healthz = 200;
- company = 200;
- /api/v1/me without session = 401;
- grounding without session = 401;
- out-of-contract grounding path = 404;
- generic API path = 404;
- candidate healthy / restart 0.

The disposable candidate was removed after proof.

## Pre-effect state

Immediately before promotion:

- MEDICSPRO grounding rows = 0;
- customer work operations = 2;
- outbound attempts = 0;
- Web = `wandora/web:candidate-1800aa3d3fb4`;
- Core/Paperclip/Gateway healthy / restart 0;
- all four post-merge push workflows on exact main = GREEN.

## Execution

Only the Web image selector changed:

- before = `wandora/web:candidate-1800aa3d3fb4`;
- after = `wandora/web:candidate-8ee226bcc0dd`.

The prior selector is preserved at:

`/home/wandora-admin/executions/company-owner-statement-source-evidence-promotion-v1/web.env.before`

sha256:

`8607cc7037d5f182ad55312807d5ed011daa287dc47d6554d93db1a70355ad59`

Only `wandora-web` was recreated.

Core, Paperclip and Messaging Gateway container IDs remained unchanged.

## Post-promotion validation

Public:

- /healthz = 200;
- /login = 200;
- /company = 200;
- /team = 200;
- /work = 200;
- /conversations = 200;
- /api/v1/me without session = 401;
- grounding without session = 401;
- out-of-contract grounding path = 404;
- generic unreviewed API = 404.

Live Web:

- image = `wandora/web:candidate-8ee226bcc0dd`;
- source revision = `8ee226bcc0ddec2f333348235c501320fb223152`;
- candidate contract = `wandora-web-reviewed-bridge-v1`;
- healthy / restart 0.

Final customer state remains:

- MEDICSPRO grounding rows = 0;
- works = 2;
- outbound attempts = 0;
- Ana = exactly one active + supervised employee.

No grounding mutation, model call, customer work, provider run, wakeup, task session or external message occurred during this promotion.

## Capability Authority

No authority changes.

The Web now faithfully exposes the already-live Core provenance contract.

F1/F2/F3 remain `fact`; R1 remains `rule`.

## Decision

**Customer Company Owner-Statement Evidence Surface Production Promotion V1 is COMPLETE / GREEN.**

The remaining MEDICSPRO grounding execution effect must originate from a normal authenticated owner/admin customer session using the frozen ADR 0179 payloads and idempotency keys.
