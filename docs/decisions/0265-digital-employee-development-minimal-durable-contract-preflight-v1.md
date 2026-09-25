# ADR 0265 — Digital Employee Development Minimal Durable Contract Preflight V1

Status: **ACCEPTED PREFLIGHT / NO PRODUCTION EFFECT**  
Date: 2026-09-25

## Context

ADR 0264 established the product and authority model for accumulated learning:

- reusable employee template;
- company-wide official facts / Regras da Casa;
- employee-specific approved responsibility / behavior / practice;
- current work context;
- provider-owned runtime memory, skills and decision-training mechanics.

This preflight answers the next question before any migration:

> Can approved employee-specific development be represented safely with existing Wandora-owned state, or is a new minimum durable contract justified?

## REAL NOW

At entry:

```text
main = 53fab86de4ad8a7047d66cabbff52e85b5395a82
ADR 0264 = merged via PR #346
duplicate PR #347 = closed without merge
production Web = wandora/web:candidate-72ce1b29158e / healthy
Paperclip = wandora/paperclip:v2026.916.0 / healthy
Core = wandora/core:organization-adapter-candidate-46741f8d82d0 / healthy
Messaging Gateway = healthy
```

No production effect is part of this preflight.

## Existing Wandora state inspected

### `wandora.digital_employees`

Current durable fields are only:

```text
id
organization_id
display_name
role
status
autonomy_mode
created_at
updated_at
```

The current customer employee API likewise exposes only canonical identity/role/status/autonomy plus derived activation/work availability.

It has no:

- multi-valued responsibilities;
- approved behavior/practice declarations;
- provenance;
- source evidence;
- correction history;
- retirement lifecycle;
- independent per-entry audit semantics.

Therefore adding a free-form JSON blob or a few text columns to `digital_employees` would collapse unrelated lifecycle/history into the employee identity row and is rejected.

### Organization grounding

`wandora.organization_grounding_entries` is explicitly:

- organization-scoped;
- `fact | rule`;
- official company truth / Regras da Casa;
- projected into runtime for the whole organization.

Casually adding employee scope to this table is rejected because it would overload company truth with employee directives and create risk that one employee's guidance is projected to another employee.

Company-wide facts/rules remain in organization grounding.

### Work/result state

`wandora_private.digital_employee_work_operations` is an idempotency/dispatch/result receipt journal.

It is not authoritative employee-development state and must not be reused as a long-term learning store.

## Provider reuse evidence

### Paperclip

Exact live v2026.916.0 provides:

- company Skills library;
- per-agent Skill assignment;
- Skill version/policy/audit;
- managed agent instructions;
- Decision Training examples/snapshots;
- human-only Decision Training writes;
- export/retention semantics.

These remain operational provider capabilities.

They are not sufficient as the only durable copy of customer-visible responsibility/behavior/practice semantics because those meanings must survive Paperclip replacement.

### Mastra

Current Mastra supplies:

- persistent message history;
- Working Memory;
- Observational Memory;
- semantic recall;
- memory processors/storage.

These are runtime context/memory mechanics, not authoritative customer-approved employee semantics.

## Proven Wandora-owned gap

The following statement is a legitimate product fact about one employee instance:

> Ana at organization X should present product name, code, price and stock in that order.

It is:

- not company-wide truth by necessity;
- not current-work-only context;
- not necessarily a packaged procedural Skill;
- not merely episodic runtime memory;
- customer-visible and expected to survive provider replacement.

Existing Wandora state cannot represent it with provenance/history without semantic abuse.

Therefore a **minimum employee-development durable semantic contract is justified in principle**.

This is positive evidence of Wandora ownership under ADR 0036 / ADR 0168; it is not inferred merely from absence of a current table.

## Contract decision

Responsibilities and approved accumulated learning use one semantic entry contract because both are durable employee-specific guidance with the same:

- tenant/employee scope;
- human authorization boundary;
- provenance;
- correction semantics;
- active/retired lifecycle;
- runtime projection boundary.

The semantic kind is separate from how the entry became authoritative.

### Entry kinds

First accepted vocabulary:

```text
responsibility
behavior
practice
```

Definitions:

- **responsibility** — what the employee is expected to own, prioritize or escalate;
- **behavior** — how the employee should work or communicate;
- **practice** — an approved reusable way of carrying out recurring work.

There is intentionally no generic `knowledge` kind.

Company facts remain organization grounding; live business data remains tool/provider data; episodic recollection remains runtime memory.

### Provenance

First accepted provenance vocabulary:

```text
owner_statement
approved_learning
approved_correction
```

- `owner_statement` — owner/admin directly establishes guidance;
- `approved_learning` — a human explicitly promotes evidence from prior experience/work into durable employee guidance;
- `approved_correction` — a human explicitly replaces an existing active entry.

`approved_learning` and `approved_correction` require provider-neutral source evidence.

A model suggestion by itself is not provenance authority.

## Minimum future persistence shape

A future code-only implementation is authorized to model no more than the following semantics:

```text
id
organization_id
employee_id
entry_kind
content
provenance_type
source_ref
source_label
supersedes_entry_id
status = active | retired
created_by_user_id
created_at
updated_at
```

Required constraints:

- tenant + employee composite foreign key to canonical `wandora.digital_employees`;
- content bounded and non-empty;
- `approved_learning` / `approved_correction` require source evidence;
- correction creates a replacement row and retires the prior row;
- historical content is not edited in place;
- no provider IDs in customer-facing semantics;
- owner/admin-only mutations;
- tenant-scoped reads;
- direct browser table access forbidden;
- Core arbitrary table write should remain avoided in favor of bounded mutation functions, following organization-grounding precedent.

This ADR approves the **shape requirement**, not a production migration.

## Candidate learning is separate

A candidate-learning suggestion is not an authoritative entry.

Canonical flow:

```text
experience
  -> candidate suggestion
  -> classify
  -> explicit human/policy approval
  -> durable employee-development entry
```

This preflight does not approve:

- a candidate-learning table;
- automatic candidate persistence;
- automatic self-learning;
- automatic promotion of model output;
- autonomous mutation by Mastra/Paperclip.

A later candidate-learning product slice must prove whether suggestions need durable queue state at all.

## Runtime projection direction

The existing Agent Runtime structure:

```text
officialFacts[]
houseRules[]
workContext
```

should later become structurally:

```text
officialFacts[]
houseRules[]
employeeGuidance[]
workContext
```

`employeeGuidance[]` contains only active entries for the exact canonical Wandora employee assigned to the work.

Each runtime item should expose only minimum semantics such as:

```text
kind
content
provenance type
optional human-facing source label
```

It must not expose database IDs, provider IDs or provider-native training objects to the model.

The projection must be bounded and fail closed on overflow rather than silently dropping approved guidance.

This is still contract direction; runtime implementation requires the next code slice.

## Paperclip / Mastra projection boundary

Do not automatically turn every employee-development entry into a Paperclip Skill.

Examples:

- “Use a concise friendly tone” -> direct semantic guidance;
- “Prioritize pre-sales qualification” -> direct semantic responsibility;
- “Present stock before price” -> direct semantic practice;
- “Execute a browser QA workflow” -> may justify a Paperclip Skill;
- “Read VendaERP stock” -> Connection/Tool capability;
- prior conversation memory -> Mastra memory.

Paperclip Decision Training may preserve provider-owned training evidence, but customer-approved employee guidance remains a Wandora semantic contract.

## Conflict / precedence

For behavioral instruction:

```text
Wandora safety / authorization / external-effect policy
  > company house rules
  > employee guidance
  > current work request
```

Official company facts remain reference truth and cannot be silently redefined by employee guidance.

If an employee-specific statement should become company-wide, the product should create/approve a company grounding entry instead of duplicating it across employees.

## Customer UX implication

Future employee detail may expose:

```text
Visão geral
Responsabilidades
Aprendizados
Autonomia
```

Both `Responsabilidades` and approved `Aprendizados` may read from the same durable semantic entry contract while filtering/presenting by entry kind and provenance.

This does not require exposing technical provenance names to business users.

## Second adversarial review

Initial Jev routing again requested deep review.

The deep review explicitly compared:

1. extending `digital_employees` with text/JSON;
2. reusing organization grounding with nullable employee scope;
3. relying only on Paperclip Skills/Decision Training;
4. relying only on Mastra memory;
5. a new minimum Wandora semantic entry contract.

A second Jev guard review returned `allow` for option 5 with no-effect safeguards.

Rejected:

- JSON blob on employee row;
- employee-scoped company grounding overload;
- generic Wandora memory;
- generic Wandora Skills;
- Decision Training clone;
- storing raw work history as learning;
- generic `knowledge` bucket;
- automatic learning promotion;
- candidate-learning persistence without a separate requirement.

## Decision

A new minimum Wandora-owned employee-development semantic state is **justified**.

The next code-only slice may implement this contract because the reuse gate is now passed.

## Effect boundary

```text
new table/migration applied = 0
Core API change = 0
Web change = 0
Paperclip mutation = 0
Mastra mutation = 0
customer work = 0
model/provider call = 0
outbound = 0
production effect = 0
```

## Next executable slice

**Digital Employee Development Durable Contract Implementation V1 — CODE ONLY / NO PRODUCTION EFFECT**

It must:

1. add the minimum durable schema and verifier;
2. use bounded SECURITY DEFINER create/correct/retire functions rather than broad Core writes;
3. expose provider-neutral owner/admin mutation + member read contracts through Core;
4. preserve correction history;
5. add a bounded employee-specific runtime projection contract;
6. keep provider operational Skills/Decision Training/Memory delegated;
7. add no candidate-learning queue;
8. add no Web editing surface yet;
9. apply no production migration and perform no provider/model/customer-work effect.
