# ADR 0029 — Normal-Beta Supervised Outbound Policy V1

Status: Accepted
Date: 2026-09-16

## Context

ADR 0027 Canonical Confirmation V2 and ADR 0028 active-work reuse are proven live. A real human-reviewed proposal produced exactly one successful outbound attempt and one canonical outbound message, the authorized handset received the WhatsApp message, and the work moved to `waiting-customer`.

After the proof, both external-effect switches were returned to OFF.

The current runtime still has two deliberate single-target constraints:

- Core Human Send is activated with one `WANDORA_HUMAN_SEND_PROPOSAL_CONNECTION_ID`;
- the live Messaging Gateway is configured for one canonical organization/connection/provider instance.

Those constraints are safe for controlled beta operation but are not a general multi-tenant routing architecture.

## First decision considered

Generalize Gateway/Core outbound routing now so one runtime can serve arbitrary provider-bound connections across many tenants.

## Adversarial review

That decision is rejected for this phase.

It would widen routing, provider-binding access, failure domains and operational blast radius before a second real beta connection proves the need. The existing single-target runtime already supports one supervised beta connection safely and reversibly.

Adding a database flag alone is also rejected as incomplete because Gateway remains single-target; such a flag would imply multi-connection capability that does not yet exist.

## Decision

Normal-Beta Supervised Outbound Policy V1 is intentionally narrow:

1. at most one provider-bound beta connection is active per Messaging Gateway deployment;
2. Human Send remains supervised only;
3. every external send requires the existing explicit Confirmation V2 human step;
4. Core and Gateway master effect switches remain OFF by default;
5. activation is an operator action for an explicitly approved organization/connection pair;
6. the configured Core connection ID must equal the Gateway canonical connection ID;
7. the Gateway canonical organization/connection/provider instance must already be verified before activation;
8. activation must preserve the directional HMAC separation and mounted-secret boundaries;
9. activation must not mutate Empresa Exemplo merely to create a provider channel;
10. historical `uncertain` attempts are never retried automatically;
11. `commitment != none` remains outside Human Send and stays on the approval boundary;
12. after a beta activation window, the intended final state must be explicitly chosen and verified; default is OFF.

## What this policy does not claim

This policy does **not** make the Gateway multi-tenant.

It does not provide:

- arbitrary dynamic provider routing;
- multiple simultaneous provider connections in one Gateway process;
- autonomous outbound;
- customer-controlled provider credentials;
- customer-controlled enable flags;
- automatic retry of ambiguous delivery attempts.

Those require separate evidence and an explicit later architecture decision.

## Activation invariant

Before Human Send can become available, all of these must agree:

```text
approved organization
approved messaging connection
Core outbound connection id
Gateway organization id
Gateway connection id
provider binding / Evolution instance
```

A mismatch fails closed. No operator should 'fix' a mismatch by broadening authorization or bypassing canonical state.

## Operational sequence

Every beta activation follows:

**decision → second adversarial review → activation → health/readiness proof → zero-effect baseline → human confirmation → durable/provider proof → final-state shutdown/decision**

The exact runbook is `docs/infra/normal-beta-supervised-outbound-v1.md`.

## Exit criteria for V1

Revisit the single-target architecture only when at least one of these becomes true:

- a second concurrent beta connection is materially required;
- operator activation overhead becomes a real bottleneck;
- customer onboarding requires self-service channel connection;
- isolation requirements justify one Gateway per tenant/connection;
- evidence supports a safe provider-neutral multi-connection routing layer.

Until then, do not generalize routing preemptively.
