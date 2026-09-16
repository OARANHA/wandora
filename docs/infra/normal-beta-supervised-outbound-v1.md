# Normal-Beta Supervised Outbound V1 — Operator Runbook

Date: 2026-09-16
Authority: ADR 0029

## Purpose

Operate the already-proven Human Send / Canonical Confirmation V2 path for one explicitly approved provider-bound beta connection without pretending the current Gateway is general multi-tenant routing.

## Default state

Production default is fail-closed:

```text
WANDORA_HUMAN_SEND_PROPOSAL_ENABLED = absent
WANDORA_GATEWAY_OUTBOUND_ENABLED    = absent
```

No activation should begin by editing canonical business rows to fit runtime configuration.

## Preconditions

Before activation, verify all of the following without printing secret values:

- Core, Web, Gateway and Evolution are healthy;
- the intended organization is active;
- the intended human operator has active `owner` or `admin` membership;
- the intended messaging connection is active and WhatsApp;
- the intended conversation/work/proposal are current;
- proposal is `send-text` and `commitment=none`;
- the proposal is aligned to the latest inbound event;
- Core configured outbound connection ID matches the intended connection;
- Gateway configured organization ID matches the intended organization;
- Gateway configured connection ID matches the intended connection;
- Gateway provider instance is the intended Evolution instance;
- Core→Gateway outbound HMAC is distinct from Gateway→Core ingress HMAC;
- Evolution API key and HMACs are mounted from operator-controlled secret files;
- rollback metadata for Core and Gateway is captured before recreate;
- historical `uncertain` attempts remain untouched.

Any mismatch is a stop condition.

## Activation order

1. Capture zero-effect baseline:
   - outbound attempt count;
   - canonical outbound message count;
   - current proposal/work state.
2. Enable Gateway outbound first using the reviewed outbound overlay.
3. Wait for Gateway healthy.
4. Confirm no new outbound attempt/message exists.
5. Enable Core Human Send using the reviewed Human Send overlay and exact approved connection ID.
6. Wait for Core healthy, `/healthz=200`, `/readyz=200`.
7. Confirm enabling capability created no new outbound attempt/message.
8. Verify the reviewed `Trabalho` item exposes a Core-owned Confirmation V2 snapshot.
9. The human must explicitly review and confirm the send in Web.
10. Verify one durable attempt and provider outcome.
11. On success, verify one canonical outbound message and expected work transition to `waiting-customer`.
12. Confirm external receipt only through the authorized test/customer context; never store personal destination data in Git notes.

## Failure handling

### Before human confirmation

If Core/Gateway health, configuration agreement or zero-effect baseline fails:

- do not send;
- disable/revert the component that changed;
- preserve evidence;
- investigate before another activation.

### `delivery-uncertain`

Do not retry automatically.

The durable ambiguous attempt is evidence. A future retry requires a separate reconciliation contract; do not delete or reset the attempt to manufacture retryability.

### Provider rejection

Do not widen CORS, provider binding, tenant authorization or recipient validation merely to make the request pass. Diagnose the exact boundary.

## Shutdown / final-state rule

After the activation window, explicitly choose the final state. Until a later policy says otherwise, the canonical final state is:

```text
WANDORA_HUMAN_SEND_PROPOSAL_ENABLED = absent
WANDORA_GATEWAY_OUTBOUND_ENABLED    = absent
```

Disable Core Human Send first, verify healthy, then disable Gateway outbound and verify healthy.

Confirm database counts did not change during shutdown.

## Evidence to record

Record only non-secret operational facts:

- date/time window;
- image tags / source heads;
- approved organization/connection using canonical IDs only when appropriate for private operator evidence;
- health/readiness outcomes;
- pre/post attempt/message counts;
- final attempt state;
- final work state;
- whether external receipt was observed;
- final switch state.

Do not record:

- API keys;
- HMAC values;
- JWTs;
- passwords;
- real phone numbers;
- message bodies containing personal/customer data.

## Current limitation

One Gateway deployment is one canonical provider-bound organization/connection target in V1. A second simultaneous beta connection is an architecture trigger, not a reason to overload this runbook.
