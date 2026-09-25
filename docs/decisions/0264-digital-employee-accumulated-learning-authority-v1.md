# ADR 0264 — Digital Employee Accumulated Learning Authority V1

Status: **ACCEPTED ARCHITECTURE / DOCUMENTATION ONLY / NO PRODUCTION EFFECT**  
Date: 2026-09-25

## Context

Wandora now has a live starter digital employee product, company-wide official grounding, supervised work, real ERP read capability and an owner-facing Work surface.

The next product requirement is different from company-wide grounding:

> the same starter employee template must be able to become better adapted to the company and to its own role over time without turning every observation, model inference or conversation into permanent truth.

Example:

- `ana-commercial-v1` is reused across many companies;
- one company may be a young fashion retailer and expect informal language;
- another may be an industrial distributor and expect technical/formal language;
- some instructions belong to the whole company;
- some responsibilities/preferences belong only to Ana's role inside that company;
- past experience may be useful without being authoritative.

The product therefore needs a durable distinction between **experience**, **learning candidate**, **approved learning**, **company truth**, **procedural skill** and **runtime memory**.

This ADR establishes authority boundaries only. It does not add a table, migration, API, runtime memory store or provider mutation.

## REAL NOW

At decision time:

```text
main = 58cd7fac2e39c1fd8d14a1cd383e1a28f4ca27bf
open PRs = 0
production Web = wandora/web:candidate-72ce1b29158e
production Web = healthy / restart 0
Paperclip = wandora/paperclip:v2026.916.0
Core = healthy
Messaging Gateway = healthy
```

Existing canonical capabilities:

1. **Company grounding**
   - ADR 0169/0170/0171;
   - Wandora owns official company facts and Regras da Casa;
   - runtime receives bounded `officialFacts[]` and `houseRules[]`;
   - current durable grounding contract is organization-scoped only.

2. **Paperclip skills**
   - company skill library exists;
   - skills can be installed/imported/versioned/audited;
   - company skills can be attached to individual agents;
   - hire/create supports `desiredSkills`;
   - Paperclip is operational authority for skill catalog/assignment/policy.

3. **Paperclip Decision Training**
   - captures human-approved training examples from interactions, approvals and execution decisions;
   - snapshots issue/comments/runs/decision state;
   - requires a human user for writes;
   - tracks author, notes/history, retention and export;
   - Paperclip is operational authority for this decision-training evidence.

4. **Mastra memory**
   - persistent message history;
   - Working Memory;
   - Observational Memory;
   - semantic recall;
   - storage-backed resource/thread scoping and memory processors;
   - Mastra remains replaceable runtime authority for memory/context mechanics.

## Product model

The customer-facing model is:

```text
TEMPLATE DA FUNÇÃO
Ana Comercial V1
        |
        v
EMPRESA
fatos oficiais + Regras da Casa
        |
        v
ANA NESTA EMPRESA
responsabilidades + comportamento/aprendizados aprovados
        |
        v
TRABALHO ATUAL
pedido/contexto temporário
```

The same catalog template must remain reusable across companies. Company adaptation does not create a new catalog employee template.

## Learning taxonomy

### 1. Experience / episodic memory

Examples:

- previous messages;
- tool results;
- prior work outcomes;
- observations from repeated execution;
- temporary conversational preferences.

Authority:

```text
semantic authority = not official truth by default
operational authority = Mastra/runtime or other accepted runtime provider
durable Wandora state = none by default
```

Experience may influence runtime context according to policy, but it is not automatically an official fact, company rule or approved employee instruction.

### 2. Company-wide authoritative learning

Examples:

- “Never promise stock without checking the ERP.”
- “Our return period is X days.”
- “The company tone is informal.”
- “This product line is discontinued.”

When authoritative for the whole company, the learning belongs in the existing Wandora company-grounding contract as:

- official fact; or
- Regras da Casa.

Do not create an employee-specific duplicate.

### 3. Procedural capability / skill

Examples:

- how to execute a defined workflow;
- how to use a tool correctly;
- how to produce a repeatable artifact;
- a packaged role/domain procedure.

Authority:

```text
customer/product semantic intent = Wandora
operational skill catalog/assignment = Paperclip
runtime materialization = current runtime/provider
```

Do not create a generic Wandora Skills implementation.

### 4. Decision-training evidence

Examples:

- human confirms the correct handling of a task;
- a specific approval/outcome becomes a training example;
- a correction is intentionally retained as decision evidence.

Authority:

```text
operational training evidence = Paperclip Decision Training
Wandora external-effect/product policy = remains Wandora-owned
```

Do not create a generic Wandora decision-training table.

### 5. Employee-specific approved learning

This is the real product gap.

Examples:

- “When Ana presents products, show name, code, price and stock in that order.”
- “Ana should prioritize launches when serving this customer segment.”
- “Ana should use a casual but concise tone.”
- “For this role, Ana should ask for width and height before preparing this kind of quote.”

These statements are:

- specific to one Wandora digital employee inside one organization;
- customer-visible product semantics;
- expected to survive provider replacement;
- not necessarily company-wide truth;
- not merely runtime episodic memory;
- not necessarily a reusable procedural Skill.

Therefore Wandora may eventually require a **minimum provider-neutral employee-specific semantic contract**.

This ADR deliberately does **not** choose its persistence shape yet.

A future implementation must first prove whether the requirement can be represented safely by existing durable Wandora employee state, existing organization grounding plus a valid scope extension, or another minimum contract. A new table/migration is not authorized merely because the current organization grounding table is organization-scoped.

## Accumulated-learning flow

The intended product flow is:

```text
EXPERIENCE
work / correction / observation
        |
        v
LEARNING CANDIDATE
“this may be worth keeping”
        |
        v
CLASSIFICATION + AUTHORITY
        |
        +--> company fact / Regra da Casa
        |
        +--> employee-specific approved learning
        |
        +--> Paperclip Skill / Decision Training evidence
        |
        +--> remain episodic / discard
        v
AUTHORIZED FUTURE USE
```

A model or runtime provider may suggest a candidate.

It may not silently promote that candidate into authoritative Wandora state.

## Human authority and autonomy

Current customer autonomy remains:

```text
supervised
```

The Team surface must not make `Aprendiz`, `Com supervisão` and `De confiança` freely clickable until real policy contracts exist.

Accumulated learning and execution autonomy are distinct concepts.

A future autonomy system may govern how much freedom an employee has to:

- propose learning;
- apply low-risk learned preferences;
- require human confirmation;
- alter behavior within pre-approved boundaries.

This ADR does not authorize those future autonomy transitions.

## Precedence

When instructions conflict, the intended semantic ordering is:

```text
Wandora safety / authorization / external-effect policy
        ↓
company Regras da Casa
        ↓
catalog role/template obligations
        ↓
employee-specific approved learning / role directives
        ↓
current work request
```

Official company facts are reference truth rather than simply imperative instructions and must remain clearly distinguished from behavioral rules.

No lower layer can authorize an effect forbidden by a higher authority boundary.

## Provider replacement boundary

If Mastra is replaced:

- employee/customer semantic contracts remain;
- runtime memory implementation, storage, semantic recall and context assembly may change/migrate.

If Paperclip is replaced:

- employee/customer semantic contracts remain;
- skill catalog/assignment and decision-training operational state may migrate to the replacement provider.

Wandora must not solve either replacement problem by cloning the providers' full memory, skill or training engines.

The Exit Test remains:

> Can the customer continue to see the same employee, company rules and approved employee-specific learning while only provider adapters/configuration and legitimately provider-owned operational state change?

## UX consequence

The Team/employee surface should eventually distinguish:

```text
Visão geral
Responsabilidades
Aprendizados
Autonomia
```

Possible customer vocabulary:

- **Responsabilidades** — what Ana is expected to own in this company;
- **Aprendizados** — approved knowledge/preferences specific to Ana plus reviewable candidates;
- **Autonomia** — what Ana may do without human intervention.

The customer should not need to understand prompts, RAG, embeddings, Paperclip Skills, Decision Training or Mastra Memory.

A candidate learning may present business actions such as:

```text
[ Ensinar à Ana ]
[ Aplicar à empresa inteira ]
[ Ignorar ]
```

but those actions are only product direction until a separately reviewed mutation contract exists.

## Capability Authority / Reuse Gate

Do not build:

- Wandora agent memory engine;
- generic message-memory store;
- vector database for employee learning;
- embeddings/chunking/retrieval subsystem;
- generic Skills catalog;
- generic Decision Training store;
- automatic learning promotion;
- duplicate company grounding rows merely to customize an employee.

Reuse:

- existing organization grounding for company-wide authoritative truth;
- Paperclip Skills for provider-owned procedural skills/agent assignment;
- Paperclip Decision Training for operational decision-training evidence;
- Mastra memory primitives for runtime episodic/working/semantic memory.

Potential Wandora-owned gap:

- the minimum durable, provider-neutral semantics of **approved employee-specific role/learning declarations**, if the next reuse proof shows no existing Wandora-owned state can represent them correctly.

## Second adversarial review

The first review classified this subject as deep-review material.

Evidence review then confirmed the exact capability overlap above.

A second Jev guard review returned `allow` for this architecture-only decision with the explicit restriction that no new state/migration/runtime engine be introduced in this slice.

Rejected:

1. store all Ana memory in Wandora for portability;
2. treat Mastra Working Memory as official company truth;
3. store every correction as a permanent employee rule;
4. clone Paperclip Decision Training for customer UX;
5. clone Paperclip Skills to make Wandora look provider-independent;
6. attach employee-specific instructions to company grounding without a reviewed scope contract;
7. let autonomy labels mutate learning or execution authority automatically.

## Effect boundary

This ADR performs:

```text
schema/migration = 0
Core API = 0
Web behavior = 0
Paperclip mutation = 0
Mastra mutation = 0
customer work = 0
model/provider call = 0
outbound = 0
production effect = 0
```

## Next executable slice

**Digital Employee Role + Approved Learning Reuse Preflight V1 — NO EFFECT**

It must:

1. inspect current Wandora employee/catalog durable fields and customer contracts;
2. determine whether responsibilities and approved employee-specific learning are one semantic contract or two;
3. prove whether an existing Wandora-owned structure can represent the minimum semantics without abusing organization grounding;
4. define provenance, approval, correction, retirement and tenancy semantics;
5. define the adapter projection toward Paperclip Skills/Decision Training and Mastra runtime context without making any one provider the customer contract;
6. define candidate-learning generation separately from authoritative mutation;
7. produce a migration/state decision only after this proof;
8. make no production mutation, provider call or customer work.
