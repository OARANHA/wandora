# ADR 0264 — Digital Employee Development + Accumulated Learning Authority V1

Status: **ACCEPTED ARCHITECTURE / DOCUMENTATION ONLY / NO PRODUCTION EFFECT**  
Date: 2026-09-25

## Context

Customer review of the live Team surface exposed a product gap.

The existing starter employee contract correctly reuses one catalog template:

```text
catalog key = ana-commercial-v1
display name = Ana
role = commercial-assistant
autonomy = supervised
```

That template can serve many companies, but the same Ana role must adapt to the company where she works.

Examples:

- a youth fashion store may want informal language and launch-first selling behavior;
- an industrial distributor may want concise technical language and stock/specification-first answers;
- a healthcare company may impose stricter wording, evidence and escalation rules.

The owner also expects the employee to improve over time instead of requiring the same correction repeatedly.

This creates a distinction that the current customer UI does not yet expose cleanly:

1. what comes from the reusable employee template;
2. what is official company truth / Regras da Casa;
3. what is specific to this employee in this company;
4. what belongs only to the current work;
5. what is operational memory/training evidence versus customer-approved durable learning.

## REAL NOW

At entry:

```text
main = 58cd7fac2e39c1fd8d14a1cd383e1a28f4ca27bf
open PRs = 0
production Web = wandora/web:candidate-72ce1b29158e / healthy
Paperclip = wandora/paperclip:v2026.916.0 / healthy
Core = wandora/core:organization-adapter-candidate-46741f8d82d0 / healthy
Messaging Gateway = wandora/messaging-gateway:origin-fix-94cfb4de / healthy
```

ADR 0263 is documented as production GREEN.

## Proven capability evidence

### Company-wide semantic truth already exists in Wandora

ADRs 0169–0171 already establish:

- official company facts;
- Regras da Casa;
- provenance/source evidence;
- active/retired lifecycle;
- provider-neutral runtime projection.

The current Agent Runtime contract projects:

```text
officialFacts[]
houseRules[]
workContext
```

Those semantics are Wandora-owned and must not be duplicated into employee-specific state.

### Paperclip already supplies operational skills and decision-training capability

The exact live Paperclip source for `v2026.916.0` exposes:

- company skill library;
- skill install/import/version/audit/reset;
- per-agent desired skill assignment;
- skill attachment during hire/create;
- managed agent instruction bundles;
- Decision Training examples and snapshots;
- company-scoped decision-training list/export;
- human-only Decision Training writes.

Important exact-provider behavior:

```text
catalog install != agent attach
company skill -> agent desired skill assignment
Decision Training write -> human board user only
Decision Training snapshot -> issue/comments/runs/decision evidence at a fixed cutoff
```

Therefore Wandora must not create a second generic Skills catalog, generic Decision Training store or agent-instruction control plane.

### Mastra already supplies runtime memory mechanics

Current Mastra documentation exposes:

- message history;
- observational memory;
- working memory;
- semantic recall;
- memory processors;
- persistent storage providers;
- resource/thread-scoped memory sharing/isolation.

Therefore Wandora must not create a generic runtime memory, semantic-recall, retrieval/RAG, embeddings or context-assembly subsystem merely to make employees “learn”.

## Product decision — two-hat review

### Wandora-owner hat

The durable customer contract must remain provider-neutral.

If Paperclip or Mastra is replaced tomorrow, the customer must not lose the meaning of an approved statement such as:

> Ana at this company should present product name, code, price and stock in this order.

That meaning belongs to the Wandora product contract even if Paperclip currently materializes skills/training and Mastra currently applies memory/context during execution.

### Business-owner hat

A normal business owner should experience:

> “Ana already knows how to be a commercial assistant. I teach how she works here, and she gets better over time.”

The customer should not need to understand prompts, embeddings, RAG, Mastra memory, Paperclip skills or Decision Training.

## Canonical four-layer model

```text
1. TEMPLATE / FUNCTION
   Ana Comercial V1
   reusable baseline capability and role

2. COMPANY
   official facts + Regras da Casa
   shared truth/rules for the whole workforce

3. EMPLOYEE @ COMPANY
   responsibilities + behavior + approved working practices
   specific to this employee in this company

4. CURRENT WORK
   title + description + temporary work context
   applies only to the current task
```

These layers must remain distinguishable in both customer UX and runtime contracts.

## Accumulated learning model

The product may support accumulated learning, but **experience is not automatically durable truth**.

Canonical progression:

```text
experience / work history
        ↓
candidate learning
        ↓
human/policy authorization
        ↓
approved employee learning
        ↓
future work guidance
```

In supervised mode, model inference, conversation history, tool output or a successful task result MUST NOT silently become approved durable learning.

### Company-wide learning

If a learned statement should apply to the whole workforce, it belongs in existing organization grounding.

Example:

> Never promise stock without checking the ERP.

That is a company rule, not an Ana-only memory.

### Employee-specific learning

If the statement is specific to the role/practice of one employee, it belongs to the employee-development semantic layer.

Examples:

- prioritize launches when suggesting fashion products;
- present product name, code, price and stock in that order;
- use a concise technical tone for industrial customers;
- escalate requests outside the employee's assigned commercial responsibility.

This semantic layer is not a generic memory transcript.

## Semantic classes

The first provider-neutral product vocabulary is:

- **responsibility** — what this employee is expected to own/prioritize;
- **behavior** — how this employee should work or communicate;
- **practice** — an approved reusable way of performing recurring work.

This ADR intentionally does **not** define a generic “knowledge” class.

Official company facts remain organization grounding. Live ERP/catalog facts remain business-system/tool data. Runtime recollection remains specialist memory.

## Authority split

### Semantic authority

Wandora owns:

- customer meaning of employee development;
- responsibility / behavior / approved practice vocabulary;
- customer authorization and supervision;
- provider-neutral provenance/audit reference;
- distinction between candidate and approved learning;
- promotion to company-wide grounding when applicable.

### Durable product state

This ADR proves that a minimum portable semantic state is legitimate **if implementation requires persistence**, because approved employee-specific guidance must survive replacement of Paperclip/Mastra.

However, this ADR does not yet approve a table or migration.

A later implementation ADR must prove the smallest durable representation and must first test whether existing Wandora state can safely express it without semantic collision.

### Operational authority

Paperclip remains operational authority for:

- Skills catalog;
- skill assignment/release/policy;
- Decision Training evidence;
- managed agent instructions/control-plane configuration.

Mastra remains operational authority for:

- runtime memory;
- working memory;
- semantic recall;
- observations;
- context/memory processors;
- runtime execution mechanics.

### Provider implementation

Current providers:

```text
control-plane / skills / decision training = Paperclip
runtime memory/context/execution = Mastra
```

### Replacement boundary

Provider replacement may require:

- re-materializing skills/instructions;
- migrating legitimate provider-owned training/memory state;
- changing adapter bindings/configuration.

It must not change the customer-facing meaning of:

- employee responsibilities;
- approved behavior;
- approved practices;
- organization facts/rules.

## Runtime contract direction

The future runtime boundary should preserve structural separation:

```text
officialFacts[]
houseRules[]
employeeGuidance[]
workContext
```

Where:

- `officialFacts[]` = factual authority for the company;
- `houseRules[]` = mandatory company rules;
- `employeeGuidance[]` = approved responsibility/behavior/practice for this employee;
- `workContext` = current task only.

This is a contract direction, not code authorization.

## Precedence / conflict semantics

Not all layers are the same kind of authority.

### Effect and safety precedence

```text
Wandora safety / authorization / external-effect policy
        >
company house rules
        >
employee-specific guidance
        >
current work request
```

A work request cannot authorize an external effect or override a higher rule merely because it is newer.

### Fact semantics

Official facts are reference truth, not a command-priority layer.

Employee guidance and work context cannot silently redefine an official company fact.

## Autonomy consequence

The current Team surface must continue treating:

```text
Aprendiz
Com supervisão
De confiança
```

as a maturity visualization, not freely selectable buttons.

ADR 0163 already rejected making those levels actionable without a real autonomy/policy contract.

Future autonomy may govern not only external action freedom but also how much learning can be consolidated without human review.

For current `supervised` autonomy:

- the employee may accumulate experience operationally;
- the system may eventually suggest candidate learning;
- durable approved learning requires explicit human/policy authorization.

## Customer UX direction

The employee surface should ultimately distinguish:

```text
Visão geral
Responsabilidades
Aprendizados
Autonomia
```

“Aprendizados” means approved reusable guidance and pending candidate suggestions, not raw runtime memory.

A future customer-facing candidate flow may present:

```text
Ana percebeu um padrão em trabalhos anteriores.

[Ensinar à Ana]
[Transformar em Regra da Casa]
[Ignorar]
```

No candidate-learning flow is authorized by this ADR.

## Explicit non-goals

Do not build as a consequence of this ADR:

- generic Wandora memory;
- chat transcript memory store;
- vector database;
- embeddings;
- semantic recall engine;
- retrieval/RAG;
- chunking;
- context assembler;
- generic Skills catalog;
- Decision Training clone;
- generic prompt/instruction editor;
- automatic self-modifying agent;
- automatic promotion of model output to durable learning;
- free-form autonomy switching.

## Second adversarial review

The first Jev routing review requested deep review rather than fast implementation.

After exact live Paperclip inspection and current Mastra documentation review, a second Jev guard review returned `allow` for the architecture decision with the following boundary:

- approve semantic authority only;
- delegate operational memory/skills/training;
- approve no table/migration yet;
- approve no automatic learning promotion;
- require a separate implementation ADR for minimum durable state.

Rejected alternatives:

1. store every work/result as “Ana memory” in Wandora;
2. use Mastra Working Memory as the only portable customer truth;
3. use Paperclip Decision Training as the only copy of customer-approved employee guidance;
4. duplicate company Regras da Casa per employee;
5. make Paperclip skill assignment itself the customer semantic contract;
6. let successful model output become learning automatically;
7. classify all business knowledge as employee-specific learning;
8. expose prompts/skills/provider objects directly to business customers.

## Effect boundary

This decision is documentation/architecture only.

```text
table/migration = 0
Core API change = 0
Web change = 0
Paperclip mutation = 0
Mastra mutation = 0
production effect = 0
customer work = 0
model/provider call = 0
outbound = 0
```

## Next slice

**Digital Employee Development Minimal Durable Contract Preflight V1 — CODE/DESIGN REVIEW BEFORE MIGRATION**

It must:

1. inspect all existing Wandora employee/configuration state before adding persistence;
2. prove whether approved `responsibility | behavior | practice` requires new durable state;
3. define exact provenance/lifecycle/correction semantics if persistence is required;
4. define mapping/materialization to Paperclip skills/instructions without making Paperclip IDs public product identity;
5. define runtime projection as `employeeGuidance[]` without creating a memory engine;
6. keep organization grounding authoritative for company-wide facts/rules;
7. keep Mastra memory/retrieval/context mechanics delegated;
8. define candidate-learning suggestion semantics separately from approved learning;
9. authorize no production migration or automatic learning.
