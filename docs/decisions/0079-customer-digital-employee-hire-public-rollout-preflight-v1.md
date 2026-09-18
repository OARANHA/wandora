# ADR 0079 — Customer Digital-Employee Hire Public Rollout Preflight V1

- Status: **Accepted preflight — public hire remains OFF**
- Date: 2026-09-18
- Scope: freeze the rollout boundary after the successful customer-hire canary and before any normal-live activation

## REAL NOW

Canonical Git entering this preflight:

```text
main = 8a65b3cc2afe63969d725eb33cde0cbc6428fe60
PR #125 = merged — customer-hire canary execution
PR #126 = merged — browser hire idempotency hardening
open PRs = 0
```

ADR 0078 proves one clean customer-like hire end-to-end:

```text
Ana = paused + supervised
Wandora employee/provider-binding/hire-operation = 1/1/1
Paperclip managed Ana = 1 / paused
same-key replay = same employee
different-key/same-catalog replay = same employee
```

The private candidate and ephemeral browser-session material were removed after proof.

Normal live effects remain:

```text
Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

Live Web is still the older `wandora/web:team-read-b31db507`; PR #126 is not deployed.

## PR #126 BROWSER CONTRACT

The preflight found that the Web originally kept the hire idempotency key only in memory. PR #126 now:

- persists only the opaque operation key in `sessionStorage`;
- namespaces it by organization + catalog;
- reuses it after browser reload;
- fails closed if safe storage is unavailable or invalid;
- clears it only after a validated success;
- keeps ambiguous retry bound to the organization that started it;
- blocks retry after a tenant switch until the original organization is selected;
- avoids redirecting a late success into another active organization's Team view.

The verifier executes the real idempotency helper and proves reload reuse, tenant isolation, storage failures, invalid keys and selective cleanup.

All four PR #126 CI workflows passed. Its reviewed Web candidate artifact is retained as evidence only and is not live.

## LIVE MULTI-TENANT SCOPE

Production currently has three active organizations.

Two have Paperclip control-plane bindings. One, `Empresa Exemplo`, has no control-plane binding and already has a legacy active Ana.

The hire runtime flag `WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED` is process-wide, not tenant-scoped.

Current Core behavior is fail-closed:

- owner/admin required;
- member and foreign-tenant requests fail before durable/provider effects;
- missing provider binding returns provider-neutral unavailable state before provider effect;
- a matching legacy employee returns `catalog-conflict` before journal/provider effect;
- one catalog operation per organization/provider/catalog is enforced durably;
- ambiguous provider outcome requires same-operation recovery.

Therefore a global flag is safe as a kill switch, but it is not sufficient as product rollout policy.

## PAUSED-FIRST BOUNDARY

Catalog hire still means:

```text
catalog = ana-commercial-v1
role = commercial-assistant
autonomy = supervised
new employee = paused
provider managed agent = paused
```

The reviewed Web says hiring does not start work or send messages. Team renders paused employees as `Contratada · aguardando ativação`. No reviewed Start/Team action activates an employee.

Hire remains separate from Agent Runtime execution, Human Send and Gateway outbound.

## TENANT PROVISIONING DOES NOT MEAN HIRE READY

Private Tenant Provisioning V2 intentionally creates an active organization + owner with zero digital employees and no Paperclip/control-plane wiring.

A newly active Wandora organization is therefore not automatically ready for catalog hire.

## CAPABILITY AUTHORITY / REUSE GATE

No existing Wandora table/function expresses customer hire entitlement/readiness.

The existing control-plane binding must **not** be reused as customer eligibility:

1. it is an integration mapping, not product policy;
2. accepted wiring order creates the binding before all provider-side wiring is complete;
3. binding presence can therefore exist during a valid incomplete-wiring window;
4. exposing that as “ready to hire” would mix provider integration state with Wandora customer policy.

Also rejected:

- making every active organization implicitly eligible;
- an environment-variable list of organization IDs;
- making provider IDs/configuration customer-visible;
- a generic feature-flag framework without a broader proven need;
- changing tenant provisioning to create provider state automatically.

## DECISION

Customer hire requires two independent gates:

```text
global runtime kill switch
AND
Wandora-owned tenant + catalog eligibility
```

The global flag remains an emergency/capability switch.

Tenant/catalog eligibility is a small provider-neutral Wandora policy fact, enabled by an operator only after that tenant's required control-plane wiring has been independently validated.

The intended minimum semantic shape is:

```text
organization_id
catalog_key
enabled
created_at
updated_at
```

One row per organization + catalog key.

Rules:

- private/browser-inaccessible state;
- Core may read it but may not grant it;
- operator/platform authority owns enable/disable;
- no provider identifiers or provider configuration fields;
- eligibility is enabled only after provider wiring validation;
- disabling eligibility blocks creation of new catalog-hire operations without deleting already-successful hires;
- an already-reserved operation may still be safely replayed/reconciled under its frozen operation context; the process-wide runtime gate remains the absolute kill switch when all customer-hire continuation must stop.

This is deliberately specific to customer catalog hire. It is not a general-purpose feature-flag framework.

## CUSTOMER-SAFE PROJECTION

Web must not infer readiness from provider state.

Core should project customer-safe hire availability through the existing tenant-authorized digital-employees read model, for example:

```json
{
  "items": [],
  "hire": {
    "catalogKey": "ana-commercial-v1",
    "available": true
  }
}
```

The exact response vocabulary is frozen in the implementation slice, but it must remain provider-neutral.

The browser must never receive provider references or provider configuration details.

## SERVER-SIDE ENFORCEMENT

Eligibility is not only UI state.

Before journal reservation or provider effect, POST must require:

```text
authorized owner/admin
+ active organization
+ runtime hire gate ON
+ exact tenant/catalog eligibility ON
+ existing catalog/legacy conflict checks
```

Eligibility OFF must fail before provider effect with a provider-neutral customer response.

## ROLLOUT / ROLLBACK

Future tenant rollout order:

```text
tenant exists
-> provider/control-plane wiring
-> independent validation
-> tenant/catalog eligibility ON LAST
-> customer hire becomes available
```

Rollback is eligibility OFF and/or global runtime gate OFF.

Rollback must never delete successful employees, hire journals, provider bindings or managed agents.

## CURRENT TENANT CONSEQUENCES

- Customer Hire Canary already has a completed catalog hire; no eligibility change is needed to preserve it.
- Internal Supervised Proof already has completed catalog proof state; the global flag must not imply a new customer hire entitlement.
- Empresa Exemplo has a legacy active Ana and no control-plane binding; it is not eligible without a separate reconciliation/wiring decision.

## PROVENANCE

Current production Web remains the older image.

PR #126 produced a reviewed Web candidate but did not deploy it.

PR #126 changed no Core source, so its Core CI correctly produced no Core candidate artifact.

A later rollout must select/build exact current-main Core and Web candidates and prove source/image provenance before promotion.

## EFFECT BOUNDARY

This preflight performs no production activation.

Still not performed:

- tenant eligibility migration/state;
- eligibility enablement;
- Web/Core promotion;
- global customer-hire enablement;
- employee activation;
- Human Send;
- Gateway outbound.

## DECISION

**Customer Digital-Employee Hire — Public Rollout Preflight V1 is complete as a design. Public rollout is not yet authorized.**

The remaining product-boundary gap is tenant-scoped customer eligibility.

## NEXT EXECUTABLE SLICE

**Customer Digital-Employee Hire — Tenant Eligibility Contract Implementation V1.**

Implementation/CI only. It must:

1. add minimal private organization+catalog eligibility state;
2. keep write authority operator-owned and browser-inaccessible;
3. enforce eligibility before journal/provider effects;
4. expose only customer-safe availability on the authorized read path;
5. make Web show/enable hire only when allowed;
6. preserve owner/admin authorization, tenant isolation and PR #126 idempotency semantics;
7. prove eligibility OFF blocks before provider calls;
8. prove eligibility ON preserves existing catalog dedupe;
9. prove legacy collision remains fail-closed;
10. prove disabling eligibility does not delete successful state;
11. keep normal live hire, Human Send and Gateway outbound OFF.

Do not apply a production migration, deploy a candidate, enable tenant eligibility, enable the global hire gate, activate Ana or enable outbound in that implementation slice.
