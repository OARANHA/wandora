# ADR 0064 — Customer Hire Contract Implementation V1

- Status: **Accepted implementation — code/CI complete, production gate OFF**
- Date: 2026-09-18
- Scope: close the paused-first customer hire implementation slice, record the legacy-employee collision discovered during adversarial review, and freeze the next production preflight without enabling any customer effect

## REAL NOW

Implementation is carried by PR #109 on `feat/customer-hire-contract-v1`.

The reviewed contract is present in code, but no production deployment or customer-hire activation is part of this ADR.

Production safety boundary remains:

```text
Organization Adapter = live
Customer Digital-Employee Hire = OFF / dedicated flag not applied
Human Send = OFF
Gateway outbound = OFF
customer activation = unavailable
Empresa Exemplo Paperclip company/binding = absent
```

## PROVEN EVIDENCE

Core now implements:

- first-time catalog hire finalization as `paused + supervised`;
- completed hire replay returning the same canonical employee with current `paused|active` status;
- exact POST `/api/v1/organizations/:organizationId/digital-employees`;
- owner/admin authorization through the existing Organization Adapter service;
- required stable `Idempotency-Key`;
- exact catalog request validation;
- provider-safe error mapping with no provider reference leakage;
- a dedicated `WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED` gate;
- fail-closed startup rules requiring Human API + Organization Adapter before that gate may be enabled;
- a separate compose overlay for the customer-hire effect.

Web now implements:

- `/start` behind the authenticated app/session boundary;
- selected canonical Wandora organization, not editable company identity;
- Ana-only V1 catalog hire;
- stable browser idempotency key reused on retries;
- success redirect to canonical `Equipe`;
- customer-facing paused state as “Contratada · aguardando ativação”;
- no Clara, fake WhatsApp connection, unpersisted knowledge write, or `Ativar` control.

The reviewed Nginx bridge forwards Authorization + Idempotency-Key for the exact digital-employees route, strips Cookie, and leaves the generic `/api/` boundary closed.

CI on the implementation head proved:

- Core base verifier = green;
- Organization Adapter production-activation rehearsal = green;
- deterministic Agent Runtime + Human API + Organization Adapter overlay validation = green;
- Web CI = green;
- Core Candidate Artifact = green;
- Messaging Gateway CI = green;
- Platform Admin CI = green.

## LEGACY EMPLOYEE COLLISION DISCOVERY

Read-only production inspection during the second adversarial review found that `Empresa Exemplo` already has a legacy canonical employee:

```text
display_name = Ana
role = commercial-assistant
status = active
autonomy = supervised
Paperclip provider binding = absent
```

That means the ADR 0063 idea of using `Empresa Exemplo` as a naive first-hire canary is no longer valid.

The existing row does not carry a proven catalog key or provider identity that would justify automatic adoption as `ana-commercial-v1`.

## DECISION — FAIL CLOSED, DO NOT AUTO-ADOPT

Automatic adoption based only on display name, role and autonomy is rejected.

Before reserving a new catalog operation, the Organization Adapter now checks for a matching legacy employee in the tenant. If one exists without an existing catalog hire operation, hire fails with `catalog-conflict` before journal reservation or provider effect.

This check is read-only. The adversarial review rejected granting broader UPDATE authority merely to use `SELECT ... FOR UPDATE`; the lock was unnecessary because a found legacy row immediately aborts and a missing row cannot be protected by a row lock.

No new lifecycle table or provider-facing identity field is introduced by this slice.

## SECOND ADVERSARIAL REVIEW

Rejected:

- treating Organization Adapter ON as customer hire ON;
- adding the customer-hire flag to the existing Organization Adapter overlay;
- enabling the gate in the base Core stack;
- exposing provider company/agent refs to Web;
- auto-adopting the legacy `Empresa Exemplo` Ana by name/role similarity;
- granting broader table UPDATE privileges just to support a rejecting collision probe;
- provisioning `Empresa Exemplo` in Paperclip during code implementation;
- adding `Ativar` before the production execution bridge and least-privilege resume contract exist;
- enabling Human Send or Gateway outbound as a side effect of hiring.

## EFFECT BOUNDARY

This ADR authorizes the implementation merge only.

It does **not** authorize:

- production deployment of a new Core/Web image;
- applying the customer-hire compose overlay;
- provisioning `Empresa Exemplo` in Paperclip;
- creating or adopting a provider binding for its legacy Ana;
- customer activation;
- Human Send;
- Gateway outbound.

## DECISION

**Customer Hire Contract Implementation V1 is complete at code/CI level and remains production-disabled.**

The earlier ADR 0063 statement that `Empresa Exemplo` may be used as the first customer-like hire canary is superseded by this ADR.

## NEXT EXECUTABLE SLICE

**Customer Hire Canary Selection + Legacy Employee Reconciliation Preflight V1.**

That preflight must choose, with evidence, between:

1. a clean customer-like organization with no legacy employee collision; or
2. an explicit operator-reviewed legacy reconciliation/adoption contract that proves exact identity/history before any provider binding is created.

Until that decision is accepted, `Empresa Exemplo` must not be used as a naive hire canary and the customer-hire runtime gate remains OFF.
