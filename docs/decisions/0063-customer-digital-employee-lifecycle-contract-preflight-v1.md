# ADR 0063 — Customer Digital-Employee Lifecycle Contract Preflight V1

- Status: **Accepted preflight — no customer hire/activation effect executed**
- Date: 2026-09-18
- Scope: define the customer meaning of `Contratar` versus `Ativar`, the provider-company bootstrap boundary, the minimum paused-first hire contract, and the real `/start` product path before any customer-facing mutation is enabled

## REAL NOW

Canonical Git at preflight:

```text
main = 369f04fdf2dd4cf1b203ca80690610a142b66df2
open PRs = 0
```

Live runtime reverified read-only:

```text
Core = wandora/core:organization-adapter-candidate-068d30a49d9b, healthy
Paperclip = wandora/paperclip:v2026.831.1, healthy
Messaging Gateway = healthy

Organization Adapter = ON
Human Send = OFF / flag absent
Gateway outbound = OFF / flag absent

Wandora organizations = 2
Paperclip control-plane bindings = 1
digital-employee provider bindings = 1
completed hire operations = 1
Empresa Exemplo Paperclip binding = 0
```

ADR 0062 closed the live A/B isolation gate and removed its ephemeral fixture. Production returned to one Paperclip company: the internal supervised-proof company.

## PROVEN PRODUCT / CODE STATE

The current customer read contract is already real:

```text
GET /api/v1/organizations/:organizationId/digital-employees
```

It is tenant-authorized, provider-neutral and powers the real `Equipe` page.

There is still no customer hire POST route.

The existing Organization Adapter service already provides the hard part of hire safety:

- owner/admin authorization;
- tenant-local database scope;
- stable catalog key;
- per-organization provider-company binding lookup;
- idempotency key + canonical request hash;
- same-key replay;
- catalog conflict detection;
- conservative `uncertain` state;
- stable Wandora employee ID;
- private provider binding;
- provider reconciliation through the company-scoped HMAC/plugin contract.

No second hire journal or customer lifecycle table is justified.

The current service does, however, finalize newly reconciled Wandora employees as `active`.

Paperclip's managed-agent contract explicitly provisions the same catalog Ana as `paused` with the provider reason:

```text
Provisioned paused by plugin wandora.organization-adapter-v1; requires explicit activation.
```

Paperclip already exposes least-privilege plugin capabilities for `agents.pause` and `agents.resume`, and host services independently enforce configured-company scope before those actions. The currently installed Wandora Organization Adapter plugin does **not** request those capabilities.

The Paperclip -> Wandora -> Mastra execution bridge remains a laboratory-proven direction under ADR 0037. It is not installed/activated as a production customer execution path.

## CURRENT `/start` CLASSIFICATION

The current `/start` page is a product-experience prototype, not a production contract.

It is currently outside `SessionGate` and includes several placeholders or unsupported claims:

- free-form company name/site instead of the canonical selected Wandora organization;
- outcome options that include `Clara`, which is not in `WANDORA_CATALOG_V1`;
- a fake WhatsApp-connect toggle;
- business-summary/rules fields with no canonical write contract;
- a final “Começar trabalho supervisionado” action that performs no real activation.

Those elements must not be silently connected to production.

## CAPABILITY AUTHORITY / REUSE GATE

### What Wandora owns

- the customer meaning of hiring and activation;
- the stable digital-employee ID and customer-facing projection;
- owner/admin authorization;
- tenant isolation;
- hire idempotency;
- the rule that activation is explicit;
- the rule that a customer-visible employee may remain paused until execution prerequisites are satisfied.

### What Paperclip owns

- provider company/control-plane lifecycle;
- provider-managed agent lifecycle;
- pause/resume execution state;
- native agent/task/run coordination.

### Minimum Wandora state

Existing state is sufficient for V1 hire:

- `wandora.digital_employees`;
- `wandora_private.control_plane_provider_bindings`;
- `wandora_private.digital_employee_provider_bindings`;
- `wandora_private.digital_employee_hire_operations`.

No new lifecycle table is approved by this preflight.

## DECISION — CUSTOMER SEMANTICS

### `Contratar`

`Contratar` means:

1. authorize an owner/admin for the selected active Wandora organization;
2. select a manifest-declared Wandora catalog employee;
3. require a stable customer-request idempotency key;
4. reconcile exactly one provider-managed employee through the existing Organization Adapter;
5. create/return the stable Wandora employee projection;
6. leave the employee **paused + supervised** after first hire;
7. perform no work execution, no messaging send and no external business commitment.

A successfully hired employee exists in `Equipe`, but has not yet been permitted to execute work.

### `Ativar`

`Ativar` is a separate future effect.

It means explicitly permitting the already-hired employee to execute work through the provider/runtime chain. It must not be inferred from hire completion.

Before a customer activation route exists, a later slice must prove at minimum:

- production Paperclip -> Wandora/Mastra execution bridge;
- mapped company/employee compatibility;
- least-privilege Organization Adapter `agents.resume` capability;
- provider-side resume confirmation before Wandora projects `active`;
- safe replay/failure semantics for activation;
- required tool/integration readiness;
- no implicit enablement of Human Send or Gateway outbound.

Therefore **Ativar remains unavailable in this slice**.

## DECISION — WANDORA STATUS

The existing `wandora.digital_employee_status` enum already has:

```text
paused
active
```

No new lifecycle enum/table is needed.

For future first-time catalog hires, Organization Adapter finalization should insert:

```text
status = paused
autonomy = supervised
```

The hire result type should accept and return the actual canonical status `paused | active`.

This preserves safe replay after a later activation: replaying the original hire operation returns the same employee even if that employee has subsequently become active.

The historical internal canary may remain `active` in Wandora as proof data; it must not be used as the semantic template for the first customer hire.

## DECISION — PROVIDER COMPANY BOOTSTRAP

Provider-company creation is **lazy at first hire**, not part of generic Wandora organization onboarding.

Reason:

- organizations that never hire a digital employee do not need Paperclip state;
- Paperclip company creation is a higher-trust instance-admin effect;
- the current Paperclip route has no Wandora idempotency contract;
- company names are not unique identifiers;
- creation also establishes owner membership and initializes provider-side company capability.

The normal customer Core must not receive instance-admin authority.

### Important implementation split

The customer hire POST must **not** create a Paperclip company inline until a separate Provider Company Bootstrap Automation contract proves idempotency, ambiguity recovery and secret/config custody.

For the first customer-like live canary, `Empresa Exemplo` may be pre-provisioned through the already-proven protected operator path only after the customer hire code is reviewed and still disabled in production.

General self-service rollout requires a later higher-trust bootstrap automation slice. Provider bootstrap remains invisible to the browser.

## DECISION — CUSTOMER API V1

The minimum future hire route is:

```http
POST /api/v1/organizations/:organizationId/digital-employees
Authorization: Bearer <Supabase session>
Idempotency-Key: <stable client-generated key>
Content-Type: application/json

{
  "catalogKey": "ana-commercial-v1"
}
```

V1 rules:

- exact authenticated organization route;
- owner/admin only;
- member -> 403;
- malformed organization/body/idempotency -> 400/404 fail closed;
- unknown catalog employee -> product-safe unavailable/not-found response;
- same key + same request -> same employee;
- same key + changed request -> 409;
- same catalog employee with a different key -> same existing catalog operation/employee under the existing adapter contract;
- provider ambiguity may be retried only through the same idempotency operation;
- response exposes only Wandora-owned employee fields;
- provider company/agent refs, plugin config, secret refs and credentials never cross the customer API.

The route must have its own **disabled-by-default runtime gate**. Organization Adapter being ON does not imply customer hire is ON.

A future implementation should construct the customer hire handler only when both are true:

```text
Organization Adapter runtime = available
Customer Digital-Employee Hire = explicitly enabled
```

## DECISION — `/start` V1

`/start` becomes a real authenticated **first-hire** experience, not a fake company-creation/integration wizard.

Minimum V1:

1. route is protected by the existing human session boundary;
2. uses the explicitly selected canonical Wandora organization;
3. exposes only catalog employees actually supported by `WANDORA_CATALOG_V1`;
4. V1 therefore exposes only `Ana / ana-commercial-v1`;
5. shows that the employee will be hired **paused and supervised**;
6. owner/admin may explicitly confirm `Contratar Ana`;
7. a stable idempotency key is generated once for that attempt and reused on retry;
8. on success, redirect to `Equipe`;
9. `Equipe` renders the canonical `paused` state as a customer-friendly “Contratada · aguardando ativação”/equivalent presentation;
10. no `Ativar` button is rendered until the separate activation contract exists.

Remove from the real V1 path:

- editable company identity;
- `Clara` or any catalog item not actually supported;
- fake WhatsApp connection;
- business knowledge/rules fields without a write contract;
- “Começar trabalho supervisionado” when no execution activation occurred.

## FIRST CUSTOMER-LIKE CANARY GATE

`Empresa Exemplo` remains unprovisioned during this preflight.

Before it becomes the first customer-like hire canary:

1. Customer Hire Contract Implementation V1 must be code/CI green with the runtime gate OFF;
2. first-time hire must finalize `paused`;
3. existing hire replay/idempotency tests must remain green;
4. exact customer route authorization/isolation and no-provider-leak tests must be green;
5. `/start` must be session/tenant-bound and free of fake provider effects;
6. a separate provider-company bootstrap preflight must freeze `Empresa Exemplo` company creation, HMAC custody, plugin config and Wandora binding;
7. only then may `Empresa Exemplo` be provisioned as a bounded canary prerequisite;
8. the customer hire runtime gate may be enabled only in a separately reviewed live canary/deployment step;
9. Human Send and Gateway outbound remain separate effects.

## SECOND ADVERSARIAL REVIEW

Rejected:

- treating `Contratar` and `Ativar` as synonyms;
- marking a first customer hire `active` merely because the existing internal canary does so;
- inventing a new local lifecycle table when `paused|active` already exists and Paperclip owns the provider lifecycle;
- activating the Paperclip agent before the production execution bridge exists;
- adding `agents.resume` to the live plugin as part of hire;
- creating a Paperclip company during generic organization onboarding;
- giving normal Core an instance-admin Paperclip credential;
- hiding provider company creation inside the customer hire request before its own idempotency/recovery proof;
- provisioning `Empresa Exemplo` merely to complete this documentation preflight;
- keeping the current public/fake `/start` and wiring only its final button;
- exposing unsupported `Clara`;
- representing fake WhatsApp/knowledge inputs as production readiness;
- making customer hire available merely because Organization Adapter is already ON.

## EFFECT BOUNDARY

This preflight performs no customer/provider mutation.

Still unchanged:

```text
Empresa Exemplo Paperclip company/binding = absent
customer hire route = absent
customer activation route = absent
Customer Digital-Employee Hire runtime gate = absent/OFF
Human Send = OFF
Gateway outbound = OFF
```

## DECISION

**Customer Digital-Employee Lifecycle Contract Preflight V1 is complete as a plan.**

Next executable slice:

**Customer Hire Contract Implementation V1 — code/CI only, runtime gate OFF.**

That slice should implement the paused-first Core/Web contract above without provisioning `Empresa Exemplo`, changing live Paperclip, enabling customer hire, activating employees, or enabling outbound effects.
