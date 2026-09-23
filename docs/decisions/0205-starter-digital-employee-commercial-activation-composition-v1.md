# ADR 0205 — Starter Digital Employee Commercial Activation Composition V1

Status: **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**
Date: 2026-09-23

## Context

ADR 0204 defines the V1 product rule: a commercially activated Wandora customer starts with one included digital employee. Invite/company-profile onboarding remains separate and does not itself prove entitlement.

Existing production-proven capabilities already cover Paperclip company bootstrap, tenant eligibility, idempotent catalog hire, provider bindings and supervised activation. This slice must compose/read those facts without introducing a duplicate provisioning engine.

## Decision

Add a provider-neutral starter-workforce readiness projection using existing durable state only.

Customer-facing states are:

```text
commercial-activation-required
provider-company-required
hire-required
activation-required
ready
reconciliation-required
```

The projection exposes only:

- `ready`;
- `state`;
- whether starter provisioning is currently allowed by existing product policy;
- starter catalog key/name/status.

It exposes no Paperclip company ID, agent ID, secret, provider binding reference or provider-specific error.

## Classification rules

1. unfinished hire (`planned|creating|uncertain`) -> `reconciliation-required`;
2. completed hire is accepted only when exactly one control-plane binding, exactly one matching starter employee and exactly one reconciled employee/provider binding agree;
3. completed + paused -> `activation-required`;
4. completed + active -> `ready`;
5. orphan/matching employee without completed canonical hire -> `reconciliation-required`;
6. no starter + policy disabled -> `commercial-activation-required`;
7. policy enabled + no provider company binding -> `provider-company-required`;
8. policy enabled + exact provider company binding + no hire -> `hire-required`;
9. multiple provider bindings or any inconsistent projection -> fail closed as `reconciliation-required`.

Existing `digital_employee_catalog_hire_eligibility` is read as starter-provisioning policy. It is **not** renamed or elevated into a billing/plan ledger.

## API

Read-only authenticated route:

`GET /api/v1/organizations/:organizationId/starter-workforce`

The Web Nginx boundary allows only the exact UUID-scoped route and forwards Authorization only. No Idempotency-Key is needed because the route is read-only.

## Capability Authority / Reuse Gate

No new table, migration, provider lifecycle or state machine is introduced.

The projection derives from:

- Wandora organization/membership;
- existing starter hire eligibility;
- existing Paperclip control-plane provider binding;
- existing catalog hire journal;
- existing Wandora employee record;
- existing employee/provider binding.

Paperclip continues to own provider company/agent lifecycle. The readiness projection does not create or mutate provider state.

## Second adversarial review

Rejected:

- a new commercial-activation table before billing/entitlement authority exists;
- treating eligibility as proof of payment;
- auto-provisioning as a side effect of GET;
- leaking provider identifiers in readiness;
- considering a name-matched legacy Ana as ready;
- calling Paperclip or Mastra merely to compute readiness;
- coupling ERP connection to starter provisioning.

## Validation

Local strict TypeScript typecheck/build is GREEN.

Dedicated tests cover:

- commercial activation required;
- provider-company required;
- hire required;
- activation required;
- ready;
- reconciliation-required for unfinished/inconsistent states;
- provider-neutral route response;
- GET-only/closed-without-service behavior.

Dedicated tests: 6/6 GREEN.

## Effect boundary

This slice performs no:

- eligibility mutation;
- Paperclip company creation;
- hire;
- activation;
- work creation;
- Mastra run;
- messaging/outbound;
- ERP connection;
- migration or production deployment.

## Next executable slice

**28PRO Starter Digital Employee Production Activation Preflight V1 — NO EFFECT**

The preflight must reconcile 28PRO against this readiness contract, prove zero collisions, freeze exact Paperclip company bootstrap + eligibility + hire + activation sequencing, and define ambiguity recovery before any mutation.
