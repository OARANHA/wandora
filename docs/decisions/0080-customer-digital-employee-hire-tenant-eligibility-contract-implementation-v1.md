# ADR 0080 — Customer Digital-Employee Hire — Tenant Eligibility Contract Implementation V1

- Status: **Accepted implementation — code/CI green, not applied to production**
- Date: 2026-09-18
- Scope: implement the Wandora-owned organization+catalog eligibility contract selected by ADR 0079, including Core enforcement, customer-safe read projection, Web gating and browser-safe reconciliation behavior

## REAL NOW

Canonical base before this slice:

```text
main = 7ef4b71af6aa16fb05d87923f017f91814937051
PR #128 = feat/customer-hire-tenant-eligibility-v1
open PRs before #128 = 0
```

Read-only production revalidation during the slice:

```text
wandora-core              = healthy
wandora-web               = healthy
wandora-paperclip         = healthy
wandora-messaging-gateway = healthy

normal live Customer Digital-Employee Hire = OFF / flag absent
Human Send                                = OFF / flag absent
Gateway outbound                          = OFF / flag absent
migration 013 table                       = ABSENT
```

The successful ADR 0078 canary remains paused and no production effect was executed by this implementation slice.

## PROVEN EVIDENCE

ADR 0079 proved that a process-wide runtime flag cannot represent tenant readiness and that a control-plane binding cannot double as customer eligibility.

The required customer availability contract is:

```text
global runtime hire gate ON
AND
organization + catalog eligibility ON
AND
normal authorization / conflict / provider-safety checks
=
new customer catalog hire may begin
```

Existing completed or reserved journal state remains authoritative for replay/reconciliation and is not erased by later eligibility changes.

## CAPABILITY AUTHORITY / REUSE GATE

Eligibility is a Wandora-owned product policy fact, not Paperclip state.

Minimum durable state is therefore one private relation keyed by:

```text
organization_id + Wandora catalog_key
```

No provider IDs, provider config or secret material belong in this fact.

The second adversarial review rejected reusing `wandora_platform_provisioner` for eligibility changes. That role is dedicated to tenant provisioning; giving it rollout-policy authority would cross capability boundaries.

A dedicated capability role is used instead:

```text
wandora_customer_hire_operator
  NOLOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOREPLICATION
  NOBYPASSRLS
```

It receives schema USAGE plus EXECUTE only on the controlled setter. It receives no direct table SELECT/INSERT/UPDATE/DELETE and no tenant-provisioning authority.

Core receives tenant-scoped SELECT only.

Browser roles and optional Supabase service roles receive no authority over the eligibility table or setter.

## DECISION

Migration 013 adds:

```text
wandora_private.digital_employee_catalog_hire_eligibility
  organization_id
  catalog_key
  enabled
  created_at
  updated_at

wandora_private.set_digital_employee_catalog_hire_eligibility(
  organization_id,
  catalog_key,
  enabled
)
```

The setter:

- normalizes the Wandora catalog key;
- rejects invalid/null inputs;
- allows enabling only for an active Wandora organization;
- allows disabling even after organization suspension;
- performs a deterministic upsert;
- is callable only through the dedicated NOLOGIN operator capability.

The migration tolerates optional Supabase roles being absent while revoking/checking them whenever they exist.

## CORE ENFORCEMENT

A brand-new catalog hire must pass eligibility before journal reservation or provider effect.

The reserve order remains fail-closed:

```text
owner/admin + active organization
-> existing same-key operation
-> existing same-catalog operation
-> tenant/catalog eligibility
-> legacy collision check
-> provider binding check
-> reserve durable operation
-> provider reconciliation
-> local finalization
```

Existing operations are handled before eligibility so rollback of eligibility does not destroy safe reconciliation/dedupe semantics.

A material idempotency gap found during adversarial review was also closed:

- incomplete catalog operation + different idempotency key => conflict;
- incomplete catalog operation + original key => may reconcile through the existing contract;
- completed catalog operation + different key/same catalog => returns the existing completed employee without creating a second operation/provider agent.

## CUSTOMER-SAFE READ MODEL

Authorized `GET /api/v1/organizations/:id/digital-employees` now returns:

```text
items: [...]
hire:
  catalogKey
  available
  state = available | already-hired | reconciliation-required | unavailable
```

The projection is provider-neutral and contains no provider company refs, agent refs, secrets or credentials.

Important behavior:

- global gate OFF => hire projection fails closed without requiring migration 013 to exist;
- owner/admin + eligibility ON + valid wiring/no legacy collision => `available`;
- completed catalog operation => `already-hired`;
- incomplete operation => `reconciliation-required`;
- member, eligibility OFF, legacy collision or missing wiring => `unavailable`.

## WEB CONTRACT

`Equipe` and `/start` no longer expose hire merely from owner/admin role.

The Web requires the Core `hire` projection.

For `reconciliation-required`:

- a browser may resume only if it still possesses the original opaque idempotency key in the organization-scoped session key;
- another browser/session without that key does not invent a new operation;
- tenant switches remain isolated;
- successful completion clears the local opaque key;
- availability query errors fail closed.

This preserves and strengthens the PR #126 reload/tenant-bound idempotency contract.

## SECOND ADVERSARIAL REVIEW

Rejected alternatives:

1. **Reuse `wandora_platform_provisioner`** — rejected because tenant provisioning and customer-hire rollout policy are different operator capabilities.
2. **Direct operator DML on eligibility table** — rejected; use one controlled SECURITY DEFINER setter.
3. **Control-plane binding as eligibility** — already rejected by ADR 0079 because wiring exists before full readiness.
4. **Eligibility checked before journal replay** — rejected because disabling eligibility must not strand a reserved/uncertain operation or invalidate completed dedupe.
5. **Different key may resume unfinished catalog hire** — rejected as unsafe ambiguity; only the original key may resume.
6. **Web role-only gating** — rejected because owner/admin is authorization, not rollout readiness.
7. **Assume every Supabase service role exists** — rejected after disposable PostgreSQL proof; migration must remain portable and condition optional-role revokes/checks.

## VALIDATION

Final technical head before this ADR/checkpoint:

```text
1aec9dab577e36fb8f810f3c71d6a772604373b4
```

Final green workflows for that technical head:

```text
Core CI                    run 35342325894 = success
Web CI                     run 35342325859 = success
Platform Admin CI          run 35342325774 = success
Messaging Gateway CI       run 35342325740 = success
Core Candidate Artifact    run 35342325793 = success
```

Core CI proves:

- historical Ana migration-010 harness remains green;
- Private Tenant Provisioning V2 remains green;
- canonical disposable migration sequence 001 -> 013;
- migration 013 safe reapply;
- dedicated operator role/function privilege boundary;
- RLS and tenant-scoped Core read;
- eligibility ON/OFF behavior;
- member and cross-tenant closure;
- legacy collision fail-closed;
- eligibility OFF before provider calls;
- original-key-only unfinished replay;
- same-key uncertain reconciliation;
- completed catalog dedupe after eligibility OFF;
- Organization Adapter production-activation rehearsal remains green;
- deterministic runtime/Human API/Organization Adapter overlays remain green.

Reviewed CI artifacts were produced but not promoted:

```text
Core artifact id   = 10545199430
Core artifact      = core-organization-adapter-candidate-ce8aa48c2371d06ebd23b4c9b90c561cfdf09edd
Core zip digest    = sha256:d2751466aa2b611cf4c7fa1722565628503b9d0a14228d752b70d28df72c0162

Web artifact id    = 10545264062
Web artifact       = web-candidate-ce8aa48c2371d06ebd23b4c9b90c561cfdf09edd
Web zip digest     = sha256:d2cfa90bdd504c8d127c245b6bc3b014054fa34fa35752dbff7b3ce8408066e6
```

These artifacts are CI evidence only. They were not loaded/promoted to production by this slice.

## EFFECT BOUNDARY

Not performed:

- migration 013 in production;
- grant/assumption of the new NOLOGIN operator capability by any live login/service;
- any tenant eligibility row in production;
- Core/Web candidate promotion;
- global Customer Digital-Employee Hire activation;
- employee activation;
- Human Send activation;
- Gateway outbound activation.

## DECISION RESULT

**Tenant Eligibility Contract Implementation V1 is complete in code/CI and production remains unchanged.**

## NEXT EXECUTABLE SLICE

**Customer Digital-Employee Hire — Production Activation Preflight V2.**

Preflight only. Before any effect it must:

1. revalidate current `main`, live DB/runtime and all active organizations;
2. re-read migration 013 and prove it is still absent live;
3. select exact post-merge Core/Web artifacts and verify provenance;
4. freeze migration/deploy/rollback order with global hire still OFF;
5. define live post-migration checks proving zero eligibility rows by default;
6. define exact operator path for a future tenant eligibility change without creating a general-purpose privileged login;
7. verify each candidate tenant's wiring/legacy state independently;
8. keep eligibility enablement and global customer-hire activation as separately reviewed effects.

The next slice must not apply migration 013, deploy candidates or enable eligibility merely because this implementation is green.
