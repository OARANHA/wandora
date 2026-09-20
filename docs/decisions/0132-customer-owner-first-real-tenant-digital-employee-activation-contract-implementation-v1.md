# ADR 0132 — Customer Owner First Real Tenant Digital-Employee Activation Contract Implementation V1

- Status: **Accepted implementation checkpoint — code/CI GREEN; production activation still prohibited**
- Date: **2026-09-20**
- Scope: record the merged customer-owner activation contract implementation after ADR 0131, including the narrow Paperclip resume artifact, Core/Web contract, least-privilege database finalization boundary and disposable/rehearsal proof. This ADR does **not** authorize applying migration 015, installing Organization Adapter v0.2.0 live, enabling the activation runtime overlay, resuming MEDICSPRO Ana, creating a wakeup/run, enabling Human Send or enabling Gateway outbound.

## REAL NOW

Canonical Git after implementation merge:

```text
main before implementation merge = 096a243395cdee0c4986ec0330c04a9e8c157916
PR #182 head                  = c6d9e2d00431f475e6226b430c73af07bbd8d960
PR #182                       = merged
main after merge              = 60527c39ddd962367674c82db16156caa201fa35
```

All implementation-head workflows are GREEN:

```text
Paperclip Mastra Adapter CI       = run 35504790747 / #53  / success
Core Candidate Artifact           = run 35504790785 / #91  / success
Platform Admin CI                 = run 35504790796 / #419 / success
Core CI                           = run 35504790766 / #557 / success
Organization Adapter Plugin CI    = run 35504790863 / #178 / success
Web CI                            = run 35504790782 / #494 / success
Messaging Gateway CI              = run 35504790744 / #526 / success
```

Fresh read-only production reconciliation after the implementation merge proved:

```text
wandora-paperclip         = wandora/paperclip:v2026.916.0 / healthy
wandora-core              = wandora/core:organization-adapter-candidate-0a40dac127ae / healthy
wandora-web               = wandora/web:owner-access-candidate-5f135e90 / healthy
wandora-messaging-gateway = wandora/messaging-gateway:origin-fix-94cfb4de / healthy
supabase-db               = supabase/postgres:17.6.1.136 / healthy

MEDICSPRO employees                  = 1
MEDICSPRO Ana                        = paused + supervised
MEDICSPRO control binding            = 1
MEDICSPRO employee binding           = 1
MEDICSPRO hire operation             = 1 completed / ana-commercial-v1
MEDICSPRO outbound attempts          = 0
migration 015 activation functions   = 0 / absent live

Core activation flag                 = absent / OFF
Human Send flag                      = absent / OFF
Gateway outbound flag                = absent / OFF
```

No production deployment, plugin install, migration application, resume or external effect occurred in the implementation slice.

## PROVEN EVIDENCE

### 1. Organization Adapter v0.2.0 candidate is narrow and immutable

The canonical candidate remains under:

```text
integrations/paperclip/plugins/organization-adapter-v1/
```

The candidate adds only the lifecycle capability required by ADR 0131:

```text
agents.managed
agents.resume
webhooks.receive
secrets.read-ref
```

The activation action is separately signed/company-scoped and uses the fixed managed catalog employee. Its lifecycle path is:

```text
agents.managed.get(ana-commercial-v1, companyId)
-> if paused: agents.resume(agentId, companyId)
-> agents.managed.get(ana-commercial-v1, companyId)
-> require exact idle readback
```

The implementation and rehearsal explicitly reject any `agents.invoke` use. Activation creates no task, wakeup, heartbeat or run.

The package verifier is pinned to Paperclip v2026.916.0 / source `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`, passed typecheck/tests/manifest validation/reproducible packaging and retained the forbidden-material scan. The upstream v916 SDK's literal RSA placeholder is excluded only by its exact known bundled placeholder shape; other forbidden key/material hits still fail the package.

### 2. Core activation contract is owner/admin + exact mapping + provider-first

The canonical customer contract exists behind a disabled-by-default runtime gate:

```text
POST /api/v1/organizations/:organizationId/digital-employees/:employeeId/activate
```

Before provider lifecycle mutation, Core requires the authenticated owner/admin for the exact organization and reconciles the exact Wandora employee, completed catalog hire, employee-provider binding and control-plane company binding.

The browser supplies no Paperclip company/agent identifier and no activation body.

Provider reconciliation happens before Wandora projects the employee active. Ambiguous provider response uses the same convergent activation contract; the plugin begins from exact managed readback so an already-idle provider state converges without a second lifecycle transition.

### 3. Migration 015 is least-privilege and remains unapplied

The implementation introduced the **candidate-only** migration:

```text
infra/stacks/supabase/migrations/20260920_015_digital_employee_activation_projection_v1.sql
```

It creates no table, journal, scheduler, task model or duplicate lifecycle state.

It deliberately does **not** grant `UPDATE` on `wandora.digital_employees` to `wandora_core_runtime`.

Instead it exposes two private `SECURITY DEFINER` helpers only to the Core runtime:

```text
wandora_private.lock_catalog_digital_employee_activation_v1(uuid, uuid)
wandora_private.activate_catalog_digital_employee_projection_v1(uuid, uuid)
```

The first acquires the serialized employee lock and revalidates the tenant/exact fixed catalog employee/completed hire/bindings without changing lifecycle state. The second permits only the bounded Wandora projection finalization `paused -> active` after the Core has reconciled the provider.

Both helpers compare the requested organization to the transaction-local Core organization scope, use fixed search paths, expose no provider ID, are revoked from PUBLIC/browser roles and keep direct employee-table UPDATE unavailable to the runtime.

The dedicated SQL verifier proved direct runtime UPDATE remains denied, browser/service roles cannot execute the helpers, cross-tenant execution is denied, exact paused/active replay converges, and binding mismatch fails closed.

**Migration 015 is not applied in production by this ADR.**

### 4. Web activation surface remains a projection, not authority

The reviewed Web bridge permits only the exact UUID activation route to Core.

It forwards Authorization, strips Cookie, does not forward the hire Idempotency-Key, sends no provider identifier/body and leaves the generic `/api/` catch-all closed.

`Equipe` exposes `Ativar` only from Core-projected activation availability. UI state never authorizes the effect; Core revalidates the full boundary.

### 5. Mastra remains a ready reused dependency, not part of activation

The existing Paperclip -> Wandora/Mastra adapter/runtime path remains separately qualified.

The implementation-head **Paperclip Mastra Adapter CI** passed the disposable Paperclip -> Core -> deterministic Mastra E2E attestation and deterministic artifact build.

This proves the execution dependency remains compatible, but activation itself does **not** call Mastra.

The contract is intentionally:

```text
activation:
Wandora -> Organization Adapter -> Paperclip resume/readback -> Wandora projection

later authorized work:
Paperclip run -> wandora_mastra -> Core -> Agent Runtime -> Mastra
```

No activation step creates the later run.

## CAPABILITY AUTHORITY / REUSE GATE

PASS.

- **Paperclip** remains authority for managed employee lifecycle and native pause/resume.
- **Wandora** owns owner/admin authorization, tenant/employee identity, customer activation semantics, bindings/reconciliation and the `paused|active` product projection.
- **Mastra** remains the execution runtime behind the already-live Agent Runtime/bridge and is not duplicated or invoked by activation.
- **Messaging effects** remain Wandora-owned independent effect gates.

Migration 015 does not create a competing lifecycle engine; it is only the minimum privilege boundary needed to commit the Wandora-owned product projection without giving the Core runtime generic table UPDATE.

## DECISION

**Customer Owner First Real Tenant Digital-Employee Activation Contract Implementation V1 is COMPLETE / GREEN in code and CI.**

The implementation is now canonical in `main`, but the production activation boundary remains closed.

Explicitly **not live / not authorized yet**:

- migration 015;
- Organization Adapter v0.2.0 installation/promotion;
- `agents.resume` in the live Organization Adapter;
- customer activation runtime overlay;
- real MEDICSPRO Ana resume;
- any activation-created wakeup/run/heartbeat;
- Human Send;
- Gateway outbound.

The next production work must begin from current live state and must not infer deployment from merge.

## SECOND ADVERSARIAL REVIEW

The final review attempted to invalidate the implementation and rejected these shortcuts:

- granting generic `UPDATE(status)` on `wandora.digital_employees` to the Core runtime;
- using `SELECT ... FOR UPDATE` directly as the runtime role when that would implicitly require table UPDATE authority;
- creating a new activation journal merely for convergence;
- accepting a raw Paperclip agent ID from Web/Core activation input;
- treating Paperclip `idle` as a run;
- calling `agents.invoke` to prove readiness;
- adding `agents.pause` as rollback authority without a demonstrated requirement;
- installing v0.2.0 or applying migration 015 merely because implementation CI is green;
- changing production to make the CI pass;
- weakening referential integrity to simulate an impossible missing control-binding state in tests.

The last test failure was corrected by respecting the real FK contract: missing hire and employee binding are exercised as fail-closed states, while PostgreSQL itself proves a referenced control binding cannot be orphaned.

## EXECUTION

This slice changed only Git/code/test artifacts and merged PR #182.

It did **not** mutate production.

## VALIDATION

Implementation head `c6d9e2d00431f475e6226b430c73af07bbd8d960` passed all seven workflows listed above.

Fresh production readback after merge still proves:

```text
Ana / Wandora             = exactly 1 / paused + supervised
migration 015             = absent
activation runtime gate   = OFF / absent
Human Send                = OFF / absent
Gateway outbound          = OFF / absent
MEDICSPRO outbound        = 0
Paperclip/Core/Web/Gateway= healthy
```

Therefore Git implementation completion did not leak into live activation.

## NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Digital-Employee Activation Production Preflight V1 — NO EFFECT.**

That preflight must, from fresh REAL NOW evidence:

1. reconcile `main`, PRs, production Core/Web/Paperclip and exact MEDICSPRO Wandora + Paperclip employee state;
2. prove migration 015 is still absent and rehearse apply/verify/rollback on a protected disposable restore before any live database change;
3. identify the exact merged Organization Adapter v0.2.0 artifact/provenance and prove live still has v0.1.0 before promotion;
4. prove the activation overlay/candidate Core/Web composition and rollback assets;
5. revalidate Paperclip Ana has no pending wakeup/run and no timer heartbeat that would dispatch work on resume;
6. revalidate Human Send and Gateway outbound remain OFF;
7. freeze an exact future execution order and stop.

The preflight must **not** apply migration 015, install v0.2.0, grant live `agents.resume`, deploy the activation overlay, resume Ana, create a run or enable outbound.
