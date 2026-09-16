## Summary

Describe the smallest reviewed change and the user/operator outcome it enables.

## State-first evidence

- **Real now:**
- **Already proven/tested:**
- **Remaining gap addressed:**

## Capability Authority / Reuse Gate — REQUIRED for material domain changes

Before adding a table, entity, service, state machine, workflow, scheduler, assignment model, agent registry, integration lifecycle or admin subsystem, answer explicitly:

- **Missing capability:** What customer/operator capability is actually missing?
- **Existing provider capability:** Does Paperclip, Mastra, Evolution, Supabase or another accepted component already provide all or part of it?
- **Authority:** Who owns the underlying capability, and what specifically remains Wandora-owned?
- **Minimal Wandora state:** What stable ID, mapping, policy, projection, audit or reconciliation state must Wandora persist — and why?
- **Adapter boundary:** Which Wandora-owned adapter/contract prevents provider schema/IDs from leaking?
- **Failure/replacement:** What happens when the provider is unavailable or replaced?
- **Duplication verdict:** Does this PR reimplement provider capability? If yes, link the accepted ADR that proves reuse is insufficient.

If these questions are not applicable, explain why. Leaving them blank is not approval to bypass the gate.

## Second adversarial review

State the strongest concrete reason the first design could be wrong — especially provider-capability duplication, overly broad scope, unsafe effects, stale assumptions or irreversibility — and how the final design addresses it.

## Validation

List CI/verifiers/runtime proofs that demonstrate the resulting state rather than only intended configuration.

## Production impact

- [ ] No production change in this PR
- [ ] Production change requires a separate reviewed promotion
- [ ] External effects remain disabled unless explicitly reviewed

## Architecture checklist

- [ ] Customer/operator vocabulary remains Wandora-owned.
- [ ] Browser/Platform Admin do not consume raw provider schemas or IDs.
- [ ] Existing mature capabilities are reused behind adapters where appropriate.
- [ ] This change does not silently turn Wandora Core into a duplicate Paperclip/Mastra/Evolution/Supabase subsystem.
- [ ] New durable state is demonstrably Wandora-owned or justified by an accepted ADR.
