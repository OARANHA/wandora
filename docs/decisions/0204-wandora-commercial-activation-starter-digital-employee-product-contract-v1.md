# ADR 0204 — Wandora Commercial Activation + Starter Digital Employee Product Contract V1

Status: **ACCEPTED PRODUCT CONTRACT / NO PRODUCTION EFFECT**
Date: 2026-09-23

## Context

ADR 0201 proved invite acceptance and company-profile onboarding without creating a digital employee. That was correct for a safe first-access smoke, but it is not the final Wandora product promise.

Wandora is sold as digital work capacity, not as empty software that later asks the customer whether they want to hire their first employee.

The product rule is therefore:

> A commercially activated Wandora customer starts with at least one starter digital employee included in the product.

Additional employees, roles, teams, departments and managers are later expansion capabilities.

## Important separation

Identity/company onboarding and commercial activation are distinct transitions.

```text
invite / account / company onboarding
-> Wandora identity + organization + owner membership + company profile

commercial activation / entitlement
-> provider control-plane company
-> starter digital employee
-> provider bindings
-> supervised activation
-> first-use readiness
```

Completing an invite alone MUST NOT be treated as proof of purchase, entitlement or commercial activation.

The exact future source of commercial entitlement (plan, checkout, operator activation, billing provider or equivalent) is not defined by this ADR and must not be invented.

For controlled early-beta tenants, an explicit operator-reviewed entitlement may represent the commercial activation decision until billing is introduced.

## Starter employee V1

The existing canonical employee is reused:

```text
catalog key = ana-commercial-v1
display name = Ana
role = commercial-assistant
autonomy = supervised
```

No second starter catalog, lifecycle engine or provisioning subsystem is introduced.

## Capability Authority / Reuse Gate

Existing proven capabilities are composed rather than duplicated:

- Wandora organization/identity/profile: existing onboarding contract;
- starter entitlement: Wandora-owned product policy;
- Paperclip company/control plane: Paperclip-owned implementation behind Organization Adapter;
- starter hire: existing idempotent catalog hire contract;
- provider employee binding: existing Organization Adapter state;
- lifecycle activation: existing `agents.resume`-backed activation contract;
- work execution: Paperclip durable work + Mastra runtime boundary;
- external messages/effects: separate Wandora approval/effect gates.

Existing `digital_employee_catalog_hire_eligibility` is already Wandora-owned product policy and is the leading candidate to represent whether `ana-commercial-v1` may be provisioned for the tenant. It must not be repurposed as a complete billing ledger.

## Product invariant

A customer-facing state described as **Wandora active / ready for work** is invalid if the organization has no starter digital employee, unless a future plan explicitly defines a different product.

Therefore:

```text
account created != commercially active customer
company profile completed != commercially active customer

commercially active customer V1
= active Wandora organization
+ starter entitlement
+ exactly one Paperclip company binding
+ exactly one `ana-commercial-v1` hire
+ exactly one Wandora employee/provider binding
+ Ana active + supervised
```

Activation of Ana does not create work, call Mastra, send messages or authorize ERP writes.

## Paperclip company timing

ADR 0203 stated that 28PRO could lazily obtain a Paperclip company when an integration is explicitly connected.

This ADR **supersedes that timing assumption**.

For commercially activated Wandora customers, the Paperclip company/control-plane container is required by the starter employee itself and therefore must be materialized/reused as part of starter-employee provisioning, before optional ERP integration.

This does not mean every invite or incomplete onboarding creates Paperclip state.

Correct boundary:

```text
identity/profile onboarding
  -> no Paperclip side effect required

commercial activation
  -> Paperclip company reconcile
  -> starter employee reconcile/hire
  -> starter employee activate

optional business-system connection
  -> attach tools/connections to the already-existing operational company/employee context
```

## ERP consequence

VendaERP and future ERP providers are tools of the customer's workforce, not the reason the workforce exists.

Therefore the intended first-use progression is:

```text
Wandora commercially activated
-> Ana exists and is active/supervised
-> customer connects ERP / WhatsApp / email / other tools
-> Ana receives authorized read capabilities
-> later supervised mutations
-> later additional employees / teams
```

Connecting an ERP must not create the customer's first employee as a side effect.

## Mobile/conversational product requirement

The starter employee must eventually be usable from mobile conversational surfaces.

Authorization remains:

```text
channel address
-> verified Wandora identity/contact
-> organization relationship/role
-> capability/effect authorization
-> starter/additional employee
-> approved tools
```

Owners/admins, human employees, customers and suppliers can have different relationships. A telephone number alone is never authorization.

## Second adversarial review

Rejected:

- making invite acceptance equal purchase;
- creating a new starter-employee state machine;
- auto-creating Paperclip companies for every unentitled signup;
- keeping the initial employee as an optional post-purchase add-on;
- coupling starter employee creation to ERP connection;
- creating a second employee catalog just to encode starter semantics;
- auto-running work or sending messages when the employee activates;
- treating eligibility as a billing ledger;
- granting ERP write/fiscal effects because Ana exists.

Accepted:

- explicit commercial-activation/entitlement boundary;
- reuse `ana-commercial-v1` as starter employee V1;
- compose existing Paperclip company bootstrap + hire + activation contracts;
- keep activation supervised and effect-free;
- attach integrations only after workforce/control-plane readiness.

## Migration / state decision

No new table or migration is approved in this ADR.

Before adding durable activation state, implementation must first prove whether existing organization status, eligibility, provider bindings and completed hire/activation projections are sufficient. Billing/plan state is a separate future authority question.

## 28PRO implication

28PRO has completed identity/company onboarding but currently has no digital employee or Paperclip company binding.

Under this product contract, 28PRO is therefore **onboarded but not yet starter-workforce ready**.

No production mutation is authorized by this ADR. A dedicated preflight must reconcile collisions and then provision exactly one starter employee through the existing boundaries.

## MEDICSPRO compatibility

MEDICSPRO already demonstrates the desired postcondition:

- one Paperclip company binding;
- one `ana-commercial-v1` hire;
- one canonical employee/provider binding;
- Ana active + supervised;
- no implicit outbound effect.

MEDICSPRO remains valid evidence and is not to be reprovisioned.

## Next executable slice

**Starter Digital Employee Commercial Activation Composition V1 — CODE ONLY / NO EFFECT**

It must:

1. define a provider-neutral `starter workforce readiness` projection/contract;
2. reuse existing eligibility, provider-company binding, catalog hire and activation capabilities;
3. define idempotent sequencing and ambiguity recovery across those already-separated effects;
4. keep company bootstrap distinct from invite/profile onboarding;
5. expose no Paperclip IDs to customer contracts;
6. prove `ready` only when the exact starter employee is active + supervised and provider bindings reconcile;
7. create no work, Mastra run, messaging/outbound or ERP connection;
8. require no new table unless existing state is proven insufficient.

After that code-only slice is GREEN, run a separate **28PRO Starter Digital Employee Production Activation Preflight V1 — NO EFFECT** before any real Paperclip/hire/activation mutation.
