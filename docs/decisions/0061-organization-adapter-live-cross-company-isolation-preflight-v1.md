# ADR 0061 — Organization Adapter Live Cross-Company Isolation Preflight V1

- Status: **Accepted preflight — live A/B execution NOT yet performed**
- Date: 2026-09-18
- Scope: freeze the minimum reversible live topology needed to close the remaining Organization Adapter cross-company isolation gate without provisioning `Empresa Exemplo`, exposing customer hiring, or enabling messaging effects

## REAL NOW

Canonical Git at preflight:

```text
main = 1141af04b68bd3a4d72bf4d915ce7caa64faafce
open PRs = 0
```

Live runtime was reverified read-only:

```text
Core = wandora/core:organization-adapter-candidate-068d30a49d9b, healthy
Organization Adapter = ON
Gateway ingress = ON
Human API = ON
deterministic Agent Runtime = ON
Human Send = OFF
Gateway outbound = OFF

Paperclip = wandora/paperclip:v2026.831.1, healthy/private/authenticated
PAPERCLIP_ALLOWED_HOSTNAMES = wandora-paperclip
Paperclip companies = 1
plugin = wandora.organization-adapter-v1@0.1.0, ready
```

Wandora production state:

```text
organizations = 2
control-plane Paperclip bindings = 1
completed Organization Adapter hire operations = 1
digital-employee provider bindings = 1

Wandora Internal Supervised Proof -> Paperclip company 815d499e-4231-4e6b-b7fc-67f0ba22a595
Empresa Exemplo -> no Paperclip binding
```

Paperclip live state for the internal company:

```text
plugin config = 1
Organization Adapter company secret = 1
agents = 1
managed resources = 1
```

No second live Paperclip company exists.

## PROVEN EVIDENCE

ADR 0040 already proved the final signed request contract against disposable infrastructure:

```text
A secret -> A target       -> accepted
same A replay              -> same managed agent
A secret -> B target       -> invalid_wandora_signature
B managed resource after denial -> 0
B secret -> B target       -> accepted
```

The live Paperclip build is the same pinned provider build used by the accepted Organization Adapter work.

The installed provider source also proves:

1. company deletion is an authenticated Board/company operation through `DELETE /api/companies/:companyId`;
2. the company service removes company child state transactionally;
3. `plugin_config.company_id`, `plugin_managed_resources.company_id` and `plugin_company_settings.company_id` all reference `companies.id` with `ON DELETE CASCADE`;
4. company secrets and agents are removed by the company service before the company row is removed.

Therefore a second company can be used as a bounded provider-side proof fixture without creating a durable Wandora organization or provider binding, provided cleanup and post-cleanup verification are mandatory parts of the same execution slice.

## GAP

The remaining gate is not a missing implementation. It is missing **live evidence** that the production Paperclip instance, production plugin configuration model and production HMAC custody preserve the already-proven A/B isolation contract.

Using `Empresa Exemplo` merely to produce that evidence would unnecessarily turn a provider-isolation test into customer-like provisioning.

The disposable proof is strong evidence for the contract, but it does not prove the current live instance's two-company configuration/custody boundary because production currently contains only company A.

## DECISION

Use one **ephemeral provider-only company B** named:

```text
Wandora Cross-Company Isolation Proof B
```

This company is a live test fixture, not a Wandora customer organization and not a control-plane binding target.

The future execution is frozen as follows:

1. reverify `main`, live Core/Paperclip health, current A counts and effect switches;
2. create exactly one company B through the authenticated Paperclip company API;
3. verify company B is active and the creating operator has the expected access;
4. create one strong random B-only Organization Adapter HMAC in Paperclip secret custody without printing or committing the value;
5. configure the existing `wandora.organization-adapter-v1` plugin for B using only B's own `secret_ref`;
6. verify B has one config, one adapter secret, zero agents and zero managed resources;
7. attempt to configure B using company A's secret reference and require Paperclip to reject it without changing B's valid configuration;
8. read A HMAC material only from the existing mounted custody boundary, never printing it;
9. send the exact private webhook contract naming company B while signing with company A's HMAC;
10. require signature denial and prove B still has zero agents and zero managed resources;
11. do **not** execute a B-secret -> B-target reconcile, because that would create a provider agent and is unnecessary to prove the negative isolation property;
12. delete company B through the authenticated Paperclip company API;
13. verify B company/config/secret/managed-resource/agent state is absent and Wandora DB bindings/operations/employees are unchanged;
14. because Paperclip refreshes the worker's configured-company set on plugin config writes, re-POST the **exact existing A config JSON** after B deletion to force the runtime scope back to the current database set (A only); do not rotate or replace A's secret;
15. verify A still references the same secret_ref and retains exactly one existing Ana/managed resource, with the plugin healthy/ready;
16. reverify Organization Adapter ON, Human Send OFF and Gateway outbound OFF.

If company-B deletion fails, stop. Do not use direct SQL cleanup. Preserve the residual fixture and document it for a separate reviewed cleanup.

## WHY NOT `Empresa Exemplo`

Rejected provisioning `Empresa Exemplo` merely as a test target because:

- it would create durable provider/customer topology before customer hiring is approved;
- it would blur a security verifier with real product provisioning;
- the current gap is provider isolation evidence, not customer onboarding;
- ADRs 0055–0057 explicitly deferred a second customer provider company until its need was proven.

The ephemeral B fixture is narrower: no Wandora organization is created, no Wandora provider binding exists, no customer contract references B, and cleanup is part of the same proof.

## SECOND ADVERSARIAL REVIEW

The first proposal was to create `Empresa Exemplo` as company B. Rejected as unnecessarily broad.

A second proposal was to retain a permanent provider-only sentinel company. Rejected because it would create long-lived topology with no Wandora binding.

A third proposal was to treat ADR 0040's disposable proof as sufficient and skip the live gate. Rejected because ADRs 0057/0060 explicitly retain a live cross-company gate before customer-facing activation.

A fourth proposal was to prove B validity with a B-secret -> B-target reconcile. Rejected because the positive call would create a real managed agent and adds no evidence necessary for the negative A-secret -> B-target property.

A fifth proposal was to clean up with direct SQL. Rejected. Provider state is mutated only through Paperclip's authenticated API; failure to clean up is a stop condition, not permission to bypass the provider contract.

A sixth proposal was to assume company deletion alone restores the plugin worker's in-memory company scope. Rejected after source review: plugin config writes explicitly recompute configured companies, while the company deletion service does not perform that worker refresh. The cleanup therefore re-saves A's already-existing config unchanged after B deletion. The expected metadata/activity timestamp change is acceptable; A's semantic config and secret_ref must remain identical.

## EFFECT BOUNDARY

This preflight itself performs no provider mutation.

The separately reviewed execution may create only the ephemeral B company, one B secret and one B plugin config required for the negative proof, followed by their API cleanup and one semantic no-op re-save of A's existing plugin config solely to refresh the worker's configured-company scope.

It must not:

- create or bind `Empresa Exemplo` in Paperclip;
- create a Wandora organization or control-plane binding for B;
- create a managed B employee;
- add customer `Contratar/Ativar`;
- enable Human Send;
- enable Gateway outbound;
- change migrations 010/011;
- alter company A's HMAC material.

## DECISION

**Organization Adapter Live Cross-Company Isolation Preflight V1 is complete as a plan.**

The next separately reviewed slice is **Organization Adapter Live Cross-Company Isolation Execution V1** using the exact bounded sequence above.
