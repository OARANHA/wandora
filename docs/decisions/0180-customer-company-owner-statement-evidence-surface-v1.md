# ADR 0180 — Customer Company Owner-Statement Evidence Surface V1

Status: **ACCEPTED CANDIDATE / CODE ONLY / NO PRODUCTION EFFECT**
Date: 2026-09-22

## Context

ADR 0179 froze the first real MEDICSPRO grounding execution as three `fact` entries plus one `rule` entry.

All four are now directly confirmed by the owner and therefore truthfully use `provenanceType=owner_statement`. The owner also requested preservation of a provider-neutral `sourceRef`.

The Core contract already supports optional `sourceRef/sourceLabel` for `owner_statement`, but the customer `/company` form exposed source evidence only when the user selected `approved_source`.

That UI mismatch could force a truthful owner statement to be mislabeled as approved-source evidence merely to preserve the reference.

## Capability Authority / Reuse Gate

No new capability is required.

- semantic authority remains Wandora grounding;
- durable state remains migration 017;
- Core mutation/read contract remains unchanged;
- Web is only the authenticated customer client;
- Paperclip/Mastra boundaries remain unchanged.

ADR 0168 remains binding: portability is contract decoupling, not implementation duplication.

## Decision

Keep the existing provenance checkbox:

- unchecked = `owner_statement`;
- checked = `approved_source`.

Expose `sourceRef` and `sourceLabel` fields for both modes.

For `owner_statement`:

- evidence reference is optional;
- blank values serialize as `null`.

For `approved_source`:

- `sourceRef` remains required;
- `sourceLabel` remains optional.

No Core or database contract changes.

## R1 classification

This slice does not change entry classification.

The MEDICSPRO execution remains frozen as:

- F1/F2/F3 = `fact`;
- R1 = `rule`.

The Web already renders active `rule` entries under **Regras da Casa**.

## Second adversarial review

Rejected:

- changing F2/F3/R1 to `approved_source` merely because a sourceRef is present;
- adding a new provenance enum;
- duplicating evidence into another table;
- changing Core/schema to compensate for a Web-only mismatch;
- bypassing the normal owner session.

Accepted:

- make the existing Web client faithfully expose the already-live Core contract.

## Validation

Production-shaped local Web Docker build passed:

- TypeScript typecheck = GREEN;
- invite/recovery verifiers = GREEN;
- customer hire/work bridge verifiers = GREEN;
- company grounding surface verifier = GREEN;
- grounding API bridge verifier = GREEN;
- Vite production build = GREEN.

Dedicated regression assertions now prove:

- `owner_statement` may preserve optional sourceRef;
- approved-source reference remains required;
- the evidence field is present independently of provenance selection.

## Production boundary

This ADR is code-only.

It does not deploy Web, create grounding, call a model, create work/run/wakeup/session, alter providers, enable Human Send/Gateway outbound or send any external message.

After merge and immutable artifact qualification, a separate Web-only promotion may deploy the corrected customer form.
