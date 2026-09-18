# ADR 0081 — Customer Digital-Employee Hire — Production Activation Preflight V2

- Status: **Accepted preflight — foundation not activated**
- Date: 2026-09-18
- Scope: freeze the production activation sequence for the tenant-eligibility contract after ADR 0080, without applying migration 013, deploying candidates or enabling any customer-hire effect

## REAL NOW

Canonical Git at the start of this preflight:

```text
main = e438518bb52be8119883c4350295dac58cd70ef2
PR #128 = merged
open PRs = 0
main tree = 1438f0b4c33a7dda4d7ec8de94755f4e5f93122e
```

PR #128 completed ADR 0080 in code/CI. Production was then revalidated read-only.

Live runtimes:

```text
wandora-core
  image    = wandora/core:organization-adapter-candidate-068d30a49d9b
  health   = healthy
  restarts = 0

wandora-web
  image    = wandora/web:team-read-b31db507
  health   = healthy
  restarts = 0

wandora-paperclip
  image    = wandora/paperclip:v2026.831.1
  health   = healthy
  restarts = 0

wandora-messaging-gateway
  image    = wandora/messaging-gateway:origin-fix-94cfb4de
  health   = healthy
  restarts = 0
```

The live Core start event still proves:

```text
mode                     = database
gatewayIngress           = true
humanApi                 = true
humanSendProposal        = false
organizationAdapter      = true
agentRuntime             = mastra-deterministic
```

Live effect switches remain absent/OFF:

```text
WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED = absent / OFF
WANDORA_HUMAN_SEND_PROPOSAL_ENABLED         = absent / OFF
WANDORA_GATEWAY_OUTBOUND_ENABLED             = absent / OFF
```

Migration 013 remains completely absent from the live Supabase database:

```text
wandora_private.digital_employee_catalog_hire_eligibility = ABSENT
wandora_customer_hire_operator role                         = ABSENT
set_digital_employee_catalog_hire_eligibility(...)         = ABSENT
```

Therefore this preflight starts from a genuinely pre-migration state, not from a partially applied migration.

## PROVEN EVIDENCE — CI AND CANDIDATE PROVENANCE

The final PR #128 validation set is green:

```text
Core CI                    35342874204 = success
Web CI                     35342874195 = success
Platform Admin CI          35342874198 = success
Messaging Gateway CI       35342874222 = success
Organization Adapter CI    35342874228 = success
Core Candidate Artifact    35342874221 = success
```

The workflows built against the GitHub PR merge ref:

```text
af542864d267c0d186bae7272b208a4ee676f1cc
```

That merge ref, PR head `2032e63a...` and canonical `main@e438518b...` all resolve to the exact same source tree:

```text
1438f0b4c33a7dda4d7ec8de94755f4e5f93122e
```

Therefore rebuilding merely to change commit metadata would add no source evidence. The reviewed PR artifacts are accepted as **current-main tree-equivalent candidates**.

Selected Core candidate:

```text
workflow run   = 35342874221
artifact id    = 10546175795
artifact       = core-organization-adapter-candidate-af542864d267c0d186bae7272b208a4ee676f1cc
artifact zip   = sha256:58921a23ea4b6bd0a281815f02900b8e604e37317791b320e91409ce4fd341c6
image tag      = wandora/core:organization-adapter-candidate-af542864d267
runner image   = sha256:080a26843cbdc3187349367f939d7aae0d1daadbbb5e1455b9449f8187f62a44
candidate tar  = sha256:895b7791c2c546b91c2a6413ba9e3184132244c02c1c88eee2ae1a67178adc03
```

Selected Web candidate:

```text
workflow run   = 35342874195
artifact id    = 10545940553
artifact       = web-candidate-af542864d267c0d186bae7272b208a4ee676f1cc
artifact zip   = sha256:97a2ee934d59c98f8fa9d4be2a58792ce312f063afcbe89704144b4c429dbdfa
image tag      = wandora/web:candidate-af542864d267
runner image   = sha256:56675f744f50580ce189743b55352a36947040f134bf7ea1d080468fc8b70ce4
```

Both artifacts are retained only as reviewed evidence/candidates. This preflight does not download, load, run or deploy them.

## PROVEN EVIDENCE — ACTIVE ORGANIZATIONS

Production has three active Wandora organizations. Each was inspected independently.

### Wandora Internal Supervised Proof

```text
control-plane Paperclip binding = 1
Wandora digital employees       = 2
employee provider bindings      = 1
catalog hire operations         = 1
ana-commercial-v1 operation     = completed
Paperclip company agents        = 1
Paperclip Ana                   = paused / wandora_mastra
```

This tenant already contains proof/legacy employee state plus a completed catalog operation. It is not a candidate for a fresh catalog hire.

### Empresa Exemplo

```text
control-plane Paperclip binding = 0
Wandora digital employees       = 1
existing Ana                    = active / supervised
employee provider bindings      = 0
catalog hire operations         = 0
```

This tenant has a legacy Ana and no Paperclip control-plane binding. It remains fail-closed and is not eligible for rollout without a separate reconciliation/wiring decision.

### Wandora Customer Hire Canary

```text
control-plane Paperclip binding = 1
Wandora digital employees       = 1
Ana                             = paused / supervised
employee provider bindings      = 1
catalog hire operations         = 1
ana-commercial-v1 operation     = completed
Paperclip company agents        = 1
Paperclip Ana                   = paused / wandora_mastra
```

This tenant already completed the exact catalog hire canary. It must project `already-hired`, not become eligible for another hire.

### Tenant conclusion

There is currently **no active production tenant that should receive a new `ana-commercial-v1` eligibility row**.

This is not a blocker to activating the dormant contract foundation later. It is a blocker to combining foundation deployment with customer rollout.

## GAPS

The remaining production gaps are intentionally separated:

1. migration 013 is not live;
2. the reviewed Core candidate is not live;
3. the reviewed Web candidate is not live;
4. no live operator path for eligibility exists because the NOLOGIN role/function do not exist before migration 013;
5. no tenant should be made eligible yet;
6. the global customer-hire gate remains OFF;
7. the current live Web is pre-rollout and does not expose the new eligibility-driven hire experience.

No gap requires enabling customer hire during this preflight.

## CAPABILITY AUTHORITY / REUSE GATE

ADR 0080 already established that eligibility is a minimal Wandora-owned product-policy fact rather than Paperclip state.

This preflight does not add another feature-flag framework, provider readiness table or control-plane state.

The production operator boundary remains exactly:

```text
wandora_customer_hire_operator
  -> NOLOGIN
  -> EXECUTE controlled setter only
  -> no direct table DML
  -> no tenant-provisioning authority
```

The existing `wandora_platform_provisioner` must not be reused for eligibility.

## DECISION

Production activation is split into three independent slices.

### A. Dormant foundation activation

A later separately authorized execution slice may:

```text
fresh backup / rollback evidence
-> apply migration 013
-> prove eligibility table exists with exactly 0 rows
-> prove operator role is NOLOGIN / least privilege
-> prove Core read-only authority
-> keep global customer-hire gate OFF
-> deploy reviewed Core candidate
-> validate Core healthy/ready with hire OFF
-> deploy reviewed Web candidate
-> validate customer surfaces fail closed
```

No tenant eligibility is enabled in this slice.

### B. Global capability activation

A later separately reviewed effect may enable the process-wide customer-hire runtime gate only after the dormant foundation is live and healthy.

With zero eligibility rows, turning on the global gate must still expose no new hire opportunity.

This is an independent effect and is not authorized by this ADR.

### C. Tenant rollout

For each tenant:

```text
tenant state reviewed
-> provider/control-plane wiring reviewed
-> legacy/catalog collision reviewed
-> Paperclip company/config/agent state reviewed
-> tenant-specific eligibility ON LAST
```

Eligibility remains tenant+catalog policy and is the last tenant-specific exposure step.

No current active tenant is selected for this step by this preflight.

## FUTURE OPERATOR PATH

Do not create a new general-purpose login or grant the NOLOGIN capability to an application account.

After migration 013 exists, an explicit operator action uses the already protected local database administration boundary and assumes the capability only inside one transaction:

```sql
BEGIN;
SET LOCAL ROLE wandora_customer_hire_operator;

SELECT *
FROM wandora_private.set_digital_employee_catalog_hire_eligibility(
  <reviewed organization uuid>,
  'ana-commercial-v1',
  <true-or-false>
);

COMMIT;
```

Operational constraints:

- execute only through the protected local/VPS database operator path;
- never place database credentials in command history, Git, chat or logs;
- no persistent membership/grant to a login/service;
- validate the organization and exact catalog key immediately before the transaction;
- read back the resulting row after commit;
- enabling requires a separate tenant-readiness review;
- disabling is allowed as a rollback action even if an organization is later suspended.

The existing `supabase_admin` session is already a privileged local administrative boundary and can perform a transactional `SET LOCAL ROLE`; this ADR does not create another login.

## LIVE POST-MIGRATION VALIDATION — READ ONLY

Immediately after a future migration 013 execution and before any Core/Web promotion, production validation must prove at minimum:

```text
table exists
setter exists
operator role exists
operator role NOLOGIN / no superuser / no create-db / no create-role / no bypass-RLS
eligibility row count = 0
Core has SELECT only
Core has no setter EXECUTE
operator has setter EXECUTE
operator has no direct table SELECT/INSERT/UPDATE/DELETE
platform provisioner has no eligibility table/setter authority
browser/Supabase service roles have no eligibility authority
RLS enabled
expected tenant-scoped Core read policy exists
global customer-hire gate still OFF
```

The production post-check is read-only. The CI verifier may use rolled-back fixture mutations in disposable PostgreSQL, but live post-verification must not create even temporary customer eligibility rows merely to prove the contract.

## DEPLOY ORDER

The frozen later execution order is:

```text
1. revalidate main + live flags + live images
2. obtain fresh DB backup/restore confidence
3. apply migration 013
4. run read-only zero-row/authority postverify
5. confirm global customer-hire gate OFF
6. promote Core candidate
7. prove Core healthy + ready, zero new hire/provider effects
8. promote Web candidate
9. prove Web healthy and no tenant exposes new hire
10. stop — no eligibility/global-gate activation in foundation slice
```

Core precedes Web deliberately.

The old Web consumes only `items` from the digital-employees response and ignores the new extra `hire` field, so the new Core is backward compatible with the current Web.

The new Web depends on the Core `hire` projection and therefore must not be promoted before the Core contract exists.

## ROLLBACK ORDER

All rollback paths preserve successful employee/hire/provider state.

### Migration failure

Migration 013 is transactional. On failure:

```text
rollback transaction
-> no deploy
-> global hire remains OFF
```

### Post-migration validation failure

If migration commits but postverify fails:

```text
stop
-> no Core/Web deploy
-> global hire remains OFF
-> no eligibility rows
-> investigate exact drift before any destructive schema reversal
```

Because the contract is dormant with zero rows, destructive rollback is not preferred over a controlled diagnosis.

### Core promotion failure

```text
restore previous Core image:
wandora/core:organization-adapter-candidate-068d30a49d9b
-> verify healthy/ready
-> leave migration 013 inert
-> global hire OFF
```

### Web promotion failure

```text
restore previous Web image:
wandora/web:team-read-b31db507
-> verify healthy
-> keep Core/new schema only if independently healthy
-> otherwise restore previous Core as well
```

### Future rollout failure

If a later tenant rollout has a problem:

```text
global kill switch OFF if broad stop is required
and/or tenant/catalog eligibility OFF for scoped rollback
```

Never delete a completed employee, hire operation, provider binding or Paperclip managed agent as rollback.

## SECOND ADVERSARIAL REVIEW

The initial plan was challenged against the following failure modes.

### 1. Rebuild because the squash commit SHA differs

Rejected.

Commit identity differs, but the Git tree is byte-identical between reviewed PR merge ref and current main. Rebuilding would produce new artifact identity without new source evidence.

### 2. Deploy Web before Core

Rejected.

The new Web requires the `hire` projection. The new Core is backward compatible with the current Web because the old Web ignores additional response fields. Therefore Core first is the safer compatibility direction.

### 3. Deploy Core before migration 013

Rejected for the production sequence.

Although the new Core fails closed with the global hire gate OFF and does not require migration 013 for normal readiness in that state, migration-first gives a simpler invariant: the database boundary exists before any runtime capable of enabling the feature is promoted.

### 4. Reuse control-plane binding as rollout eligibility

Rejected again.

Binding proves mapping, not complete tenant rollout readiness.

### 5. Reuse `wandora_platform_provisioner`

Rejected again.

Provisioning and customer-hire entitlement are different capabilities.

### 6. Create a dedicated LOGIN operator

Rejected.

The migration deliberately creates a NOLOGIN capability role. Local privileged operator session + transactional `SET LOCAL ROLE` avoids another credential and prevents persistent broad authority.

### 7. Enable eligibility for the canary because its wiring is proven

Rejected.

The canary already has a completed catalog hire, so eligibility would add no customer value and could confuse rollout semantics.

### 8. Enable eligibility for Internal Supervised Proof

Rejected.

It already contains multiple proof/employee states plus a completed catalog operation.

### 9. Reconcile Empresa Exemplo inside this activation

Rejected.

It has a legacy active Ana and no control-plane binding. Reconciliation/wiring is a separate product/integration decision, not an activation prerequisite.

### 10. Turn on the global flag in the same foundation deployment

Rejected.

It is an independent production effect. The foundation can be proven while the kill switch remains OFF.

## EXECUTION PERFORMED BY THIS PREFLIGHT

This preflight performed only read-only production inspection and repository documentation.

It did **not**:

- apply migration 013;
- create the eligibility role/function/table;
- create an eligibility row;
- download/load/run the selected candidates on production;
- deploy Core or Web;
- enable the global customer-hire flag;
- enable Human Send;
- enable Gateway outbound;
- activate any employee;
- mutate Paperclip provider state.

## VALIDATION

Final preflight evidence:

```text
main                                        = e438518bb52be8119883c4350295dac58cd70ef2
main tree                                   = 1438f0b4c33a7dda4d7ec8de94755f4e5f93122e
open PRs entering documentation execution   = 0

live migration-013 table                    = ABSENT
live migration-013 role                     = ABSENT
live migration-013 setter                   = ABSENT

live Core                                   = healthy / 0 restarts
live Web                                    = healthy / 0 restarts
live Paperclip                              = healthy / 0 restarts
live Messaging Gateway                     = healthy / 0 restarts

global customer hire                       = OFF
Human Send                                 = OFF
Gateway outbound                           = OFF

active tenants eligible for a NEW catalog hire now = 0
```

## DECISION RESULT

**Customer Digital-Employee Hire — Production Activation Preflight V2 is complete as a no-effect production plan.**

The reviewed migration/code/artifacts are ready for a separate dormant-foundation execution, but no production activation effect is authorized by this ADR.

## NEXT EXECUTABLE SLICE

**Customer Digital-Employee Hire — Dormant Production Foundation Activation V1.**

That slice may apply migration 013 and promote the selected Core/Web candidates **only while customer hire remains globally OFF and with zero eligibility rows**.

It must stop after proving the dormant foundation healthy.

Tenant eligibility enablement and global customer-hire activation remain separate later effects and require their own REAL NOW → PROVEN EVIDENCE → DECISION → SECOND ADVERSARIAL REVIEW → EXECUTION → VALIDATION cycles.
