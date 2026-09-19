# ADR 0116 — Customer Owner First Real Tenant Digital-Employee Activation Preflight V1

- Status: **Accepted preflight — NO-GO for MEDICSPRO activation; Ana remains paused + supervised**
- Date: 2026-09-19
- Scope: revalidate the exact prerequisites for the first real MEDICSPRO digital-employee activation without activating/resuming Ana, without enabling Human Send and without enabling Gateway outbound.

## REAL NOW

Canonical Git entering the preflight:

```text
main = d56734eac2c7063ecdcb245ef5d5848554ebf56e
open PRs = 0
ADR 0115 = accepted / hire GREEN
```

Current primary runtime, revalidated read-only:

```text
wandora-core              = wandora/core:organization-adapter-candidate-af542864d267, healthy
wandora-web               = wandora/web:owner-access-candidate-5f135e90, healthy
wandora-paperclip         = wandora/paperclip:v2026.831.1, healthy
wandora-messaging-gateway = wandora/messaging-gateway:origin-fix-94cfb4de, healthy
supabase-auth             = supabase/gotrue:v2.196.0, healthy
supabase-db               = supabase/postgres:17.6.1.136, healthy

Organization Adapter                 = ON
Customer Digital-Employee Hire       = ON
Human Send                           = OFF / enable flag absent
Gateway outbound                     = OFF / enable flag absent
```

Older proof/candidate containers are still present on the host. They are not treated as canonical runtime evidence and were not removed in this no-effect preflight. Cleanup remains a separate operational concern.

## PROVEN EVIDENCE

### 1. Exact MEDICSPRO mapping remains compatible

A fresh read-only PostgreSQL reconciliation proved:

```text
organization = b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5 | medicspro | active

Wandora employee:
  id       = b7eb53d4-498a-4277-b11f-17ddc42b3fe3
  name     = Ana
  role     = commercial-assistant
  status   = paused
  autonomy = supervised

control-plane provider:
  provider             = paperclip
  provider company ref = a63f27a8-dbac-4552-a456-b3a21302226b

employee provider binding:
  provider           = paperclip
  provider agent ref = managed:v1:fc48d5f57c40be499f5fe1d3aaf2a651ee41cad5963b7582d6ae8dcffa89d1a8

hire operation:
  catalog key = ana-commercial-v1
  status      = completed
  employee id = b7eb53d4-498a-4277-b11f-17ddc42b3fe3

global unfinished hire operations = 0
```

The first read-only SQL attempt had an ambiguous unqualified `status` column in the final SELECT. PostgreSQL aborted the read-only transaction before any write was possible. The corrected read-only query then completed successfully; no state was changed or retried blindly.

The live Paperclip company independently returns exactly the expected managed employee:

```text
agent id        = da6cfc6b-e16f-483a-95f1-bacee8e54365
company id      = a63f27a8-dbac-4552-a456-b3a21302226b
name            = Ana
role            = commercial-assistant
title           = Assistente Comercial Digital
status          = paused
adapterType     = wandora_mastra
budget          = 0
lastHeartbeatAt = null
org chain       = healthy
managed key     = ana-commercial-v1
plugin          = wandora.organization-adapter-v1
```

Therefore identity/mapping compatibility is **GREEN**.

### 2. The production execution adapter is absent

ADR 0037 remains only an accepted laboratory direction for the Paperclip -> Wandora/Mastra bridge.

A fresh live Paperclip adapter listing contains the built-in/current registered adapters but does **not** contain `wandora_mastra`.

An exact read:

```text
paperclipai adapter get wandora_mastra
```

returns:

```text
404 Adapter "wandora_mastra" is not registered.
```

The current Ana record naming `adapterType=wandora_mastra` is therefore only a configuration reference; it is **not** evidence that a production execution bridge exists.

This is a hard activation blocker.

### 3. The live Organization Adapter does not have resume authority

The installed production plugin is:

```text
wandora.organization-adapter-v1
version = 0.1.0
status  = ready
```

Its live manifest capabilities are exactly:

```text
agents.managed
webhooks.receive
secrets.read-ref
```

It does **not** request:

```text
agents.resume
agents.pause
```

The canonical Git manifest matches the installed capability set.

The exact pinned Paperclip plugin SDK confirms that:

- `ctx.agents.resume(agentId, companyId)` requires `agents.resume`;
- resume changes a valid non-terminated/non-pending agent from paused to Paperclip status `idle`;
- the provider route rejects an invalid organization reporting chain before resume.

The live MEDICSPRO Ana currently has a healthy organization chain, so the remaining blocker is authority/contract, not org-chain repair.

Using the existing broad Board/operator credential for normal customer activation would violate the accepted Organization Adapter trust boundary. The future customer activation must use company-scoped plugin authority, not an instance-admin shortcut.

This is a second hard activation blocker.

### 4. Wandora has no customer activation contract yet

Current canonical Core code exposes Organization Adapter catalog reconciliation/hire only. `OrganizationAdapterProvider` has no resume/activation operation.

The customer HTTP runtime has the digital-employee collection GET/POST used for read/hire, but no activation route.

The current `Equipe` UI truthfully renders a paused employee as:

```text
Contratada · aguardando ativação
```

and renders no `Ativar` action.

No activation idempotency/reconciliation contract is implemented.

This is expected and remains fail-closed.

## GAPS

Before the first MEDICSPRO activation can be authorized, all of these must be closed:

1. **Production execution bridge**
   - promote the already-proven ADR 0037 `wandora_mastra` external adapter into a canonical production-installable artifact;
   - expose the private Wandora execution bridge behind the existing Agent Runtime -> Mastra boundary;
   - prove HMAC + bounded timestamp + opaque Paperclip run token + mapped company/employee checks;
   - install/activate it only in a separately reviewed production step.

2. **Least-privilege resume capability**
   - extend the Organization Adapter contract/package to request only the additional capability actually required: `agents.resume`;
   - keep company-scoped HMAC/config/secret_ref and host-enforced company scope;
   - do not give normal customer Core a Board/instance-admin credential.

3. **Customer activation contract**
   - owner/admin only;
   - exact organization + exact already-hired employee;
   - stable request idempotency identity;
   - provider confirmation before Wandora projects `active`;
   - fail closed on cross-company, stale mapping or incompatible provider state.

4. **Ambiguity/concurrency recovery**
   - no blind provider retry after timeout/reset/unreadable response;
   - reconcile the exact managed provider employee first;
   - if provider is already non-paused because the same activation effect completed, finish the Wandora projection without another resume;
   - if provider remains paused after an ambiguous call, preserve the original operation identity and stop for later reconciliation;
   - prove concurrent activation requests cannot create duplicate provider effects.
   - a new Wandora lifecycle/control-plane model is not approved. If existing state plus serialized provider-first reconciliation cannot prove these properties, only the minimum external-effect operation journal may be proposed under a newer ADR.

5. **Runtime/tool readiness**
   - `wandora_mastra` must be registered and healthy before resume;
   - activation must not imply WhatsApp/Human Send/outbound authority;
   - any tool requiring an external business effect remains unavailable until its own reviewed gate is enabled.

## CAPABILITY AUTHORITY / REUSE GATE

### Capability needed

Allow an already-hired customer digital employee to begin provider/runtime execution without granting unrelated messaging or administrative authority.

### Existing specialist capabilities

Paperclip already owns:

- managed agent identity;
- pause/resume lifecycle;
- org-chain validation;
- external agent adapter dispatch.

Mastra already remains the accepted Wandora execution runtime behind `AgentRuntime`.

### Wandora-owned semantics

Wandora retains:

- customer `Ativar` vocabulary/UX;
- owner/admin authorization;
- tenant and stable employee identity;
- explicit activation policy;
- provider/Wandora reconciliation;
- customer-safe `paused|active` projection;
- idempotency and ambiguity handling at the product boundary.

### Reuse result

**PASS — reuse Paperclip resume + external adapter and the existing Wandora Agent Runtime/Mastra boundary.**

Do **not** build a second employee runtime, scheduler, task engine or Paperclip-like lifecycle in Core.

The existing `wandora.digital_employees.status = paused|active` remains sufficient for customer projection. This preflight does not approve a new lifecycle table.

## DECISION

**NO-GO for MEDICSPRO activation now.**

Ana must remain:

```text
Wandora  = paused + supervised
Paperclip = paused
```

The two mandatory prerequisites currently fail independently:

```text
wandora_mastra registered live = NO
Organization Adapter agents.resume capability = NO
```

A customer `Ativar` route/button must remain absent until both are solved and the provider-first idempotent activation contract is green.

Future activation ordering is frozen as:

```text
customer owner/admin activation intent
  -> Wandora authorization + exact mapping + runtime readiness
  -> company-scoped Organization Adapter activation call
  -> Paperclip exact managed agent reconciliation
  -> Paperclip resume (paused -> idle)
  -> provider confirmation/readback
  -> ONLY THEN Wandora status paused -> active
  -> return customer-safe active projection
```

Human Send and Gateway outbound are not part of this transition and remain OFF.

## SECOND ADVERSARIAL REVIEW

Rejected:

- resuming Ana now merely because the provider exposes a native resume endpoint;
- treating `adapterType=wandora_mastra` as proof that the adapter is installed;
- using the protected Board/instance-admin credential for normal customer activation;
- adding `agents.resume` to production before a reviewed package/contract and execution bridge are ready;
- setting Wandora `active` before provider confirmation;
- directly updating Wandora status to simulate activation;
- blindly repeating resume after an ambiguous provider response;
- assuming Paperclip status must literally be `active`; the pinned provider resume contract converges to `idle`;
- enabling Human Send or Gateway outbound as an activation prerequisite;
- inventing a new Wandora task/lifecycle/control-plane subsystem;
- removing unrelated residual proof/candidate containers during this preflight.

The strongest safe path is to close the execution bridge first, then the least-privilege resume contract, then implement/rehearse customer activation before any live resume.

## EXECUTION

This preflight performed only:

- current Git/PR inspection;
- canonical document/ADR inspection;
- read-only production database reconciliation;
- read-only Paperclip plugin/adapter/agent inspection;
- exact pinned Paperclip source/SDK inspection;
- documentation of the decision.

No customer/provider mutation was dispatched.

Specifically, no `agent resume`, no plugin capability change, no adapter install, no Core/Web deploy, no migration, no HMAC/secret change, no Human Send enablement and no Gateway outbound enablement occurred.

## VALIDATION

Final no-effect state remains:

```text
MEDICSPRO employees                  = 1
MEDICSPRO Ana Wandora status         = paused
MEDICSPRO employee-provider bindings = 1
MEDICSPRO hire operations            = 1 completed
global unfinished hire operations    = 0

Paperclip MEDICSPRO agents           = 1
Paperclip Ana status                 = paused
Paperclip Ana adapterType            = wandora_mastra
Paperclip org chain                  = healthy
wandora_mastra registered live       = NO / 404

Organization Adapter plugin          = ready
live plugin agents.resume capability = NO

Human Send                           = OFF
Gateway outbound                     = OFF
```

Primary Core, Web, Paperclip, Messaging Gateway, Auth and PostgreSQL remain healthy.

## RESULT

**Customer Owner First Real Tenant Digital-Employee Activation Preflight V1 is COMPLETE and NO-GO for activation execution.**

The result is a truthful blocker, not a rollback: the hire remains successful and Ana remains safely hired but not working.

## NEXT EXECUTABLE SLICE

**Paperclip -> Wandora/Mastra Production Execution Bridge Contract Implementation V1 — code/CI only.**

That slice should promote the ADR 0037 laboratory adapter/bridge direction into canonical production-installable code and prove it against the pinned Paperclip image and existing Wandora Agent Runtime/Mastra boundary.

It must not install the adapter into live Paperclip, resume/activate Ana, grant `agents.resume` live, expose a customer activation route, enable Human Send or enable Gateway outbound.
