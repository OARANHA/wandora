# ADR 0392 — Semantic Fast Read Digital Employee Responsibility, Effect Authority & Cross-Employee Handoff Qualification V1

Date: 2026-10-02

Status: **RESPONSIBILITY BOUNDARY PROVEN / GENERIC EFFECT AUTHORITY NOT PROVEN / AUTOMATIC CROSS-EMPLOYEE HANDOFF NOT PROVEN / PAPERCLIP REUSE REQUIRED / DOCUMENTATION ONLY / NO PRODUCTION EFFECT**

## Context

ADR 0391 proved that employee responsibility is not messaging-line ownership and that employee execution identity remains distinct from communication identity. The next question is upstream of MessagingConnection selection:

> When a real digital company has different employees for atendimento, vendas, fiscal, financeiro and suporte, what does employee responsibility mean, what authority actually permits an effect, and how may work move between employees without turning every employee into a superuser or creating a second task engine?

This ADR does not assume the desired business flow already exists. It qualifies existing Wandora, Paperclip and Mastra authority first.

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## REAL NOW

Fresh GitHub reconciliation before this decision proved:

- repository main = e4c7c36bb1091ba38d39b85fa259bae94553fc52;
- PR #389 is open/draft/mergeable/unmerged at a3415b07ae20c15ebd0d26ddffd55ce0e9bb1370;
- PR #390 is open/draft/mergeable/unmerged at 7526dadef6c34ec60ceb376c0678a0ad73bd7a1f;
- PR #391 is open/draft/mergeable/unmerged at 956f9d65ecb43843ccb635a107a61cbfbf7aae71;
- #389 → #390 → #391 remain a stacked Semantic Fast Read chain rather than merged main state;
- one exact-head CI read for #391 observed 10/10 workflows completed successfully;
- no workflow was rerun and no polling occurred.

No mutable production/runtime fact is needed to decide the ownership boundaries in this slice. No provider, customer, model or production call was made.

## PROVEN EVIDENCE

### Employee identity is Wandora-owned

The canonical digital_employees row belongs to exactly one Wandora organization and keeps the customer-facing employee identity independent from provider/runtime identity.

The current baseline role remains coarse: commercial-assistant, status active/paused and autonomy supervised. That role is not a substitute for the later employee-specific responsibility contract.

### Responsibility is an employee-development semantic

ADRs 0264–0266 and migration 020 establish a provider-neutral employee-development contract with three kinds:

- responsibility;
- behavior;
- practice.

The canonical definition is narrow:

- responsibility = what this employee is expected to own, prioritize or escalate;
- behavior = how the employee should work or communicate;
- practice = an approved reusable way of performing recurring work.

Each entry belongs to exactly one organization and one canonical employee, has provenance, active/retired lifecycle and owner/admin mutation authority. Multiple active responsibility entries are structurally allowed for the same employee.

The runtime projection sends active entries to the exact employee as employeeGuidance. Mastra receives them as guidance below Wandora safety/authorization and organization rules.

Therefore responsibility is **semantic guidance**. It is not executable authority.

The existing doctrine gives an explicit contrasting example:

- “Ana is responsible for pre-sales qualification” is employee responsibility;
- “Ana should be able to read VendaERP stock” is governed Connection/Tool capability.

That distinction remains binding.

## 1. What responsibility means today

Current responsibility represents:

- customer-approved employee-specific guidance;
- expected ownership/prioritization/escalation of a domain of work;
- durable provider-neutral product semantics;
- one input to runtime grounding for the exact employee.

It does **not** currently represent:

- BusinessCapability authorization;
- external-effect authorization;
- tool grant;
- provider credential/access;
- task assignment policy;
- automatic routing;
- MessagingConnection ownership;
- permission to borrow another employee's access;
- permission to bypass human approval.

Therefore responsibility = vendas does not imply create order, invoice, issue/send NF-e, send WhatsApp, choose Commercial line, or possess a VendaERP connection.

## 2. Responsibility and effect authority are distinct

They are distinct in the current architecture and must remain distinct.

Responsibility answers:

> What is this employee expected to care for, own, prioritize or escalate?

Effect authority answers:

> Is this exact actor/employee allowed to perform this exact state-changing or externally visible operation now?

No generic DigitalEmployee → EffectAuthority relation exists today.

Instead, current authority is capability-specific.

| Boundary | Current authority | What it proves | What it does not prove |
| --- | --- | --- | --- |
| employee responsibility | Wandora employee-development contract | durable employee-specific guidance | tool/effect permission |
| semantic BusinessCapability | Wandora semantic routing vocabulary | provider-neutral meaning of a read capability | employee durable grant |
| integration operational availability | Paperclip projection through Organization Adapter | organization/provider readiness and available read capabilities | business responsibility |
| run-scoped read-tool authorization | Paperclip Tool Gateway | exact run may call admitted read tool | write/destructive authority |
| Paperclip issue assignment | Paperclip | organizational work assignee/run lifecycle | Wandora business responsibility meaning |
| Human Send | Wandora Core + authenticated owner/admin + canonical confirmation | one supervised outbound messaging effect | generic employee send grant |
| commercial commitment approval | Wandora approvals | reviewed commitment decision | arbitrary provider write |
| Mastra tool/runtime execution | Mastra | execution mechanism | durable authorization |
| ERP create/update/fiscal write | not qualified in this path | nothing | must fail closed |

A runtime authorization can only narrow capability availability. It may never infer a broader effect authority from responsibility text.

## 3. Owner/Admin today

The product hypothesis that owner/admin configures authorities but does not personally execute every operation is reasonable, but it is not the current generic model.

Current proven behavior is stronger and more supervised:

- owner/admin creates/corrects/retires employee responsibility guidance;
- owner/admin is required for customer employee work admission;
- owner/admin is required for Fast Read admission through Organization Adapter;
- owner/admin is required for Human Send;
- stronger commercial commitments remain under explicit Wandora approval.

Therefore current owner/admin is both an administrative authority and, for several supervised V1 flows, an execution/admission gate.

This ADR does not widen owner/admin into an implicit superuser capable of performing missing employee effects. It also does not create a durable employee effect-grant table.

A future contract may allow owner/admin to establish bounded employee effect authority, but that requires a separate qualification of:

- vocabulary of effects;
- grant scope;
- provenance;
- revocation;
- in-flight behavior;
- human-review requirements;
- tenant isolation;
- runtime revalidation;
- audit evidence.

## 4. Existing work ownership and handoff capability

Two work representations must not be conflated.

### Canonical inbound work_items

The early messaging vertical defines wandora.work_items with:

- exactly one organization;
- exactly one employee_id;
- exactly one conversation_id;
- one work kind in the original vertical;
- one lifecycle status.

The table has no transfer history, previous assignee, accepted_by, handoff reason or cross-employee routing policy.

It is therefore not evidence of a general handoff state machine.

### Paperclip organizational work

The capability map explicitly assigns to Paperclip:

- issues/tasks;
- assignments;
- parent/child work;
- heartbeat/run lifecycle;
- organizational recurrence;
- task-completion governance.

The pinned Paperclip API also exposes issue mutation with assigneeAgentId, assigneeUserId, parentId, assignment policy, protected-agent approval controls and recovery/escalation primitives.

This is strong REUSE-GATE evidence that operational reassignment/handoff should reuse Paperclip rather than create a parallel generic Wandora task engine.

### Current Organization Adapter limitation

The existing customer-work adapter resolves one exact managed catalog employee, creates/fetches one Paperclip issue and requires:

- issue assignee = that managed agent;
- stable Wandora origin id;
- consistent title/description;
- valid non-terminal state.

If the issue assignee differs, the adapter fails as customer_work_issue_inconsistent.

Therefore Paperclip has provider capability for reassignment, but Wandora has **not** yet qualified or exposed cross-employee handoff semantics.

## 5. Capability mismatch behavior

Current Fast Read is exact-employee scoped:

- owner/admin admission;
- exact organization + exact employee;
- available BusinessCapabilities projected from operational state;
- semantic decision constrained to that set;
- signed intent contains the same employee;
- Paperclip run/tool authorization may narrow again.

If the needed capability is absent, the path fails/falls back. It does not:

- expand the employee's authority;
- search another employee;
- impersonate another employee;
- borrow another employee's connection/grant;
- run as owner/admin implicitly;
- ask the provider to invent business routing.

Therefore capability mismatch must fail closed today.

Capability mismatch is a plausible future **handoff trigger**, but it is not yet an automatic handoff rule. Before automatic handoff can exist, the product must prove:

1. which semantic responsibility/effect is required;
2. which employees are eligible;
3. how multiple eligible employees are resolved;
4. who authorizes initiation;
5. whether acceptance is required;
6. what exact Paperclip assignment primitive is used;
7. what minimum Wandora correlation/audit must survive provider replacement.

## 6. Cardinality matrix

| Relation | Cardinality proven today | Authority | State |
| --- | --- | --- | --- |
| Organization → DigitalEmployee | 1 → 0..N; each employee belongs to exactly 1 organization | Wandora | canonical durable |
| DigitalEmployee → Responsibility | 1 → 0..N active/historical entries; each entry belongs to exactly 1 employee | Wandora | semantic durable guidance |
| DigitalEmployee → Capability | no durable canonical relation; 0..N may be projected at runtime for exact employee | Wandora meaning + Paperclip operational projection | ephemeral/read-time |
| DigitalEmployee → Effect Authority | **not proven as a generic relation** | capability/effect-specific | gap |
| DigitalEmployee → Tool/Provider Access | no Wandora durable access graph; Paperclip owns installs/grants/profiles/runtime authorization | Paperclip | provider operational |
| DigitalEmployee → WorkItem | for wandora.work_items, employee 1 → 0..N and each item → exactly 1 employee | Wandora early messaging vertical | canonical but not generic handoff engine |
| Paperclip Agent → Issue | agent may own multiple issues; issue supports nullable/reassignable assignee | Paperclip | provider operational |
| WorkItem → Conversation | for wandora.work_items, N → 1 mandatory; assigned Paperclip work is a separate path and need not be Conversation-bound | Wandora | canonical early messaging vertical |
| Conversation → MessagingConnection | N → 1 mandatory | Wandora | canonical durable |
| Responsibility → MessagingConnection | no relation | none | not modeled |

This matrix deliberately separates descriptive guidance, semantic authority, authorization, operational tool access, runtime execution and provider credential state.

## 7. Paperclip qualification

Paperclip already provides substantial operational substrate relevant to handoff:

- task/issue ownership;
- assignee mutation;
- parent/child work;
- assignment policy;
- protected-agent controls;
- task review/approval;
- Connections/grants;
- Tool Profiles;
- Tool Gateway authorization;
- run lifecycle and audit;
- recovery/escalation primitives.

Those capabilities remain Paperclip operational authority.

They do **not** make Paperclip the business semantic authority for:

- what “Comercial” means;
- what “Fiscal” means;
- which employee is responsible for customer X;
- whether a sale requires a commercial handoff;
- which business effect an employee is allowed to perform;
- which messaging identity represents the interaction.

Wandora may add only the minimum provider-neutral semantic/policy/correlation layer proven necessary. It must not copy the Paperclip issue/task state machine, grants or tool catalog.

## 8. Mastra qualification

Mastra remains runtime implementation for:

- agent loops;
- tool calls;
- workflows;
- runtime context;
- same-execution coordination;
- model execution.

Mastra task lists, goals, signals, workflow suspend/resume, memory and tool hooks are execution-local mechanisms. They do not become durable organizational responsibility, assignment or external-effect authorization.

A Mastra tool hook may enforce a runtime guard, but it is never the durable authority granting an order creation, invoice action, WhatsApp send or other external effect.

## Relation to MessagingConnection

This slice preserves the separation:

RESPONSIBILITY
→ authorized employee/effect policy
→ communication identity selection
→ Conversation
→ execution

It explicitly rejects a permanent shortcut such as:

Iris = WhatsApp Comercial

because responsibility, execution identity and communication identity are different axes.

An employee may hold multiple responsibilities without receiving multiple messaging identities. Conversely, one communication identity may serve work handled by different authorized employees, depending on future product policy.

ADR 0391 therefore remains blocked correctly: responsibility alone cannot choose Commercial versus Support.

## Mandatory adversarial cases

### Case A — Atendimento tries to sell

If Atendimento only has responsibility for initial service and lacks a separately qualified sales effect authority, it must not conclude the sale.

Current behavior: fail closed / require human-controlled next work. Automatic transfer to a commercial employee is not yet authorized.

Future candidate: semantic mismatch may request a Paperclip-backed handoff, but only after target-selection and handoff authorization are proven.

### Case B — Iris closes a sale

Responsibility = vendas can establish that sales are Iris's domain.

That still does not grant:

- create order;
- alter order;
- charge;
- invoice;
- send an external confirmation.

Each effect requires its own qualified BusinessCapability/effect policy and runtime authorization. The current VendaERP path in this chain is read-oriented; no write authority is inferred.

### Case C — NF-e

A completed sale followed by fiscal work does not authorize Iris to issue/send NF-e merely because she closed the sale.

If a Fiscal employee is required, the product currently lacks the generic effect-grant and automatic handoff semantics to perform that transition autonomously.

Result: fail closed and escalate under the currently supervised authority. Do not borrow Fiscal credentials or owner authority.

### Case D — same employee, multiple responsibilities

Supported semantically: one employee may have multiple active responsibility entries.

No evidence requires two messaging identities. Responsibility entries contain no MessagingConnection field and ADR 0391 keeps execution identity separate from communication identity.

### Case E — several employees with the same responsibility

Multiple employees may independently carry equivalent responsibility guidance.

No canonical Wandora selector currently chooses Iris A versus Iris B.

Paperclip can represent assignment operationally, but load-balancing, priority, queueing, customer affinity or other employee-selection policy is not proven Wandora semantic authority yet.

### Case F — no employee has required capability/effect authority

Fail closed.

A human escalation is appropriate, but the exact portable escalation contract is not yet canonical. Paperclip recovery/escalation primitives are reuse candidates and must not be silently promoted into Wandora semantics without qualification.

### Case G — revocation during in-flight work

Retiring a responsibility entry removes it from future employeeGuidance projections but does not itself cancel provider work or revoke a tool grant.

Paperclip grants/tool policy remain independently revalidated at the operational boundary.

There is no generic Wandora effect-authority grant today, so generic in-flight revocation semantics are unproven. A future grant model must define whether work pauses, is reassigned, requires human review or is allowed to finish, and must recheck authority at the actual effect boundary.

Until then: no stale responsibility or earlier capability observation may authorize a later external effect.

### Case H — provider replacement

Replacing Paperclip must not destroy Wandora responsibility semantics.

Replacement may require migration/rebinding of provider-owned assignments/runs/grants, while the Wandora-owned employee identity, responsibility guidance, policy and minimum correlation/audit remain stable.

Replacing Mastra changes runtime execution, not responsibility/effect authority.

Replacing Evolution changes messaging transport, not employee responsibility.

Replacing VendaERP changes business-system adapter, not the meaning of sales/fiscal responsibility.

### Case I — cross-tenant

Employee, responsibility entry, canonical work item, Conversation and MessagingConnection are organization-scoped.

Provider bindings map the same Wandora organization to provider company/agent state.

Any future handoff must reject a target employee outside the same canonical organization before provider execution. A provider-level reassignment cannot widen tenant scope.

### Case J — owner/admin

Owner/admin has administrative authority and currently also performs several supervised admission/effect gates.

That must not be interpreted as:

- owner credentials may be substituted for an employee;
- missing employee capability may execute “as owner” automatically;
- owner/admin Fast Read admission grants sender identity;
- owner/admin can bypass effect-specific policy.

The future direction may separate “owner grants bounded authority” from “employee executes within that authority”, but this requires a dedicated effect-authority contract.

## GAPS

The repository does not yet prove:

- a generic employee effect-authority vocabulary;
- durable per-employee effect grants;
- whether effect grants should be Wandora durable state or projections from existing policy/provider state;
- a semantic handoff request/acceptance contract;
- an eligible-employee resolver;
- tie-breaking when several employees share responsibility/capability;
- automatic mismatch-to-handoff behavior;
- in-flight revocation semantics;
- a portable human escalation contract;
- whether a canonical Wandora WorkItem is reassigned, replaced or only correlated to a reassigned Paperclip Issue;
- a pre-Conversation responsibility/employee → MessagingConnection rule.

These gaps are not permission to add tables.

## CAPABILITY AUTHORITY / REUSE GATE

### Semantic authority

Wandora owns:

- customer meaning of employee responsibility;
- canonical employee identity;
- provider-neutral business/effect vocabulary when qualified;
- customer policy and authorization for external effects;
- tenant boundary;
- minimum portable handoff policy/correlation if later proven necessary;
- communication-identity semantics.

### Durable product state

Already proven Wandora-owned:

- employee identity;
- responsibility/behavior/practice entries and provenance/history;
- canonical Conversation/Message/WorkItem facts for the early messaging vertical;
- external-effect audit/evidence where already implemented.

Not proven in this slice:

- generic effect grants;
- generic handoff state;
- routing queues;
- copied provider assignments;
- copied tool grants.

### Operational authority

Paperclip remains operational authority for organizational task/issue assignment, reassignment, run lifecycle, Connections/grants/tool policy and Tool Gateway authorization.

Mastra remains execution runtime.

Messaging Gateway/provider remains messaging transport.

Business-system provider remains the concrete ERP implementation behind qualified adapters.

### Replacement boundary

If Paperclip is replaced, responsibility and any future Wandora-owned effect/handoff policy remain stable; provider task/run/assignment state changes behind an adapter.

If Mastra is replaced, runtime execution changes while employee semantics and effect policy remain stable.

If messaging/ERP providers change, provider bindings/adapters change while canonical employee/business semantics remain stable.

## DECISION

Decision: **QUALIFY THE RESPONSIBILITY BOUNDARY; BLOCK GENERIC EFFECT AUTHORITY AND AUTOMATIC HANDOFF UNTIL A MINIMUM REUSE-BASED CONTRACT IS PROVEN.**

Specifically:

1. responsibility remains semantic guidance only;
2. responsibility must never silently expand capability/effect authority;
3. no generic employee effect-grant state is created here;
4. no Wandora task/handoff engine is created;
5. Paperclip issue assignment/reassignment is the leading operational reuse substrate for future cross-employee handoff;
6. capability mismatch fails closed today;
7. future automatic handoff requires a Wandora-owned target/authorization semantic contract plus Paperclip-backed operational execution;
8. Conversation and MessagingConnection remain separate from responsibility;
9. no employee/role/responsibility → MessagingConnection shortcut is authorized.

## SECOND ADVERSARIAL REVIEW

A second adversarial JEV route review received the proposed decision and the evidence above.

Result:

- proceed_fast = 0.65;
- deep_review = 0.22;
- block = 0.12;
- split_task = 0.01;
- confidence = 0.53.

JEV is advisory. The low confidence reinforces the narrow execution choice: documentation only, no schema/runtime/provider effect.

## EXECUTION

Authorized execution for this slice is limited to:

- this ADR;
- continuity checkpoints in WANDORA_PROJECT_SOURCE.md and CANONICAL_STATE.md;
- a draft documentation PR stacked on PR #391.

Explicitly not executed:

- schema/migration;
- Core runtime/service change;
- Paperclip mutation;
- provider/model call;
- customer work;
- Human Send;
- ERP write;
- outbound messaging;
- production/VPS mutation;
- rollout;
- merge.

## VALIDATION

Validation requirements for this documentation-only slice:

- exact PR #391 base SHA preserved;
- documentation diff only;
- no source/runtime/schema/infra files changed;
- no duplicate task/handoff engine proposed;
- Paperclip assignment authority preserved;
- responsibility remains distinct from capability/effect/messaging identity;
- all mandatory adversarial cases addressed;
- CI checked once after PR creation; if pending, stop without polling.

## DOCUMENTATION / NEXT SLICE

The next architecture slice should be:

**Digital Employee Effect Authority & Paperclip-backed Cross-Employee Handoff Minimal Contract Preflight V1**

Its job is not to implement a task engine. It must decide the minimum portable Wandora contract for:

- effect vocabulary and grant/authorization semantics;
- how a required effect maps to eligible employees;
- who may initiate/approve/accept handoff;
- how ambiguity among eligible employees fails or resolves;
- how revocation affects in-flight work;
- what minimum Wandora audit/correlation is needed;
- which existing Paperclip assignment/reassignment primitive executes the handoff.

Only after those semantics are explicit should the MessagingConnection question resume:

> Given a responsibility, an authorized employee and an authorized effect, how is exactly one valid communication identity selected for a new Conversation?
