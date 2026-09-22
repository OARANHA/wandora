# ADR 0178 — MEDICSPRO First Real Organization Grounding Content Preflight V1

Status: **ACCEPTED / NO EFFECT / OWNER CONFIRMATION REQUIRED BEFORE FIRST RULE**
Date: 2026-09-22

## Context

ADRs 0169–0177 make the grounding contract live end-to-end without creating any real MEDICSPRO grounding row.

This preflight identifies the first real candidate content from owner-authored or canonical evidence only. It does not treat model output, inference, chat memory, Paperclip state or runtime memory as company truth.

## REAL NOW

Canonical repository and production were reconciled before content review:

- `main = 85707e38fe013bde728602d4f8efb35f155265dd`;
- PR #236 = merged;
- push workflows on that exact main: Core, Web, Platform Admin and Messaging Gateway = GREEN;
- migration 017 = LIVE / verified;
- `wandora.organization_grounding_entries` = PRESENT;
- MEDICSPRO grounding rows = 0;
- MEDICSPRO customer work operations = 2;
- MEDICSPRO outbound attempts = 0;
- Ana = exactly 1 `active + supervised`;
- Web = `wandora/web:candidate-1800aa3d3fb4`, healthy / restart 0;
- Core = `wandora/core:organization-adapter-candidate-d90b225e6cc2`, healthy / restart 0;
- Paperclip = `wandora/paperclip:v2026.916.0`, healthy / restart 0;
- Messaging Gateway = `wandora/messaging-gateway:origin-fix-94cfb4de`, healthy / restart 0.

No grounding mutation, model call, customer work, provider run, wakeup, task session or outbound effect occurred during this preflight.

## Evidence boundary

The strongest owner-approved source is the first authenticated MEDICSPRO customer work:

`wandora:customer-work-operation:9a4bc45c-cb6e-410d-8e46-3d7b84fc85ab`

Owner-authored description:

> Prepare uma abordagem comercial curta e profissional para apresentar o MedicsPro a uma clínica que ainda não conhece o sistema. Considere que o MedicsPro ajuda na organização da rotina da clínica, reunindo agenda, pacientes, informações clínicas e gestão financeira em um único ambiente.

The second authenticated owner work is:

`wandora:customer-work-operation:6099d8a0-7b0b-4903-8d9e-738bf80e9a14`

It asks for an approach to a medical clinic and asks to explain benefits for organization and atendimento, but does not add a stronger objective feature source than the first work.

No separate official website, product document or owner-supplied company profile was found in the canonical repository or attached project sources during this preflight.
## Candidate set

### F1 — ACCEPT

- tipo: `fact`
- customer-facing text: **O MedicsPro reúne agenda, pacientes, informações clínicas e gestão financeira em um único ambiente.**
- evidence: explicit premise authored by the authenticated MEDICSPRO owner in the first real customer work;
- sourceLabel: **Solicitação do proprietário — trabalho comercial MEDICSPRO**
- sourceRef: `wandora:customer-work-operation:9a4bc45c-cb6e-410d-8e46-3d7b84fc85ab`
- autoridade: `owner-approved`
- ambiguity risk: **low**
- action: **ACCEPT**

This is the only candidate with sufficiently direct owner evidence and objective wording for first insertion.

### F2 — NEEDS OWNER CONFIRMATION

- tipo: `fact`
- customer-facing text: **O MedicsPro é uma solução voltada a clínicas médicas.**
- evidence: both authenticated works ask to present MedicsPro to a clinic / medical clinic and call it a system/solution;
- sourceLabel: **Solicitações do proprietário — trabalhos comerciais MEDICSPRO**
- sourceRef: `wandora:customer-work-operation:6099d8a0-7b0b-4903-8d9e-738bf80e9a14`
- autoridade: owner-authored evidence exists, but the proposed market-positioning wording is inferred;
- ambiguity risk: **medium** — the product may serve a broader audience;
- action: **NEEDS OWNER CONFIRMATION**
### F3 — NEEDS OWNER CONFIRMATION

- tipo: `fact`
- customer-facing text: **O MedicsPro ajuda clínicas na organização da rotina e do atendimento.**
- evidence: first work states help with organization; second work asks to highlight help with organization and atendimento;
- sourceLabel: **Solicitações do proprietário — trabalhos comerciais MEDICSPRO**
- sourceRef: `wandora:customer-work-operation:6099d8a0-7b0b-4903-8d9e-738bf80e9a14`
- autoridade: owner-authored intent, but phrased as a benefit claim;
- ambiguity risk: **medium**
- action: **NEEDS OWNER CONFIRMATION**

### R1 — NEEDS OWNER CONFIRMATION

- tipo: `rule`
- proposed customer-facing text: **Materiais comerciais preparados pela equipe digital devem ser entregues para revisão antes de qualquer envio externo.**
- evidence: both legitimate owner works explicitly requested internal material for review and prohibited external sending;
- sourceLabel: **Solicitações do proprietário — trabalhos comerciais MEDICSPRO**
- sourceRef: `wandora:customer-work-operation:6099d8a0-7b0b-4903-8d9e-738bf80e9a14`
- autoridade: direct owner instructions, but each was scoped to an individual work item;
- ambiguity risk: **high** — durable organization policy cannot be inferred from two task-scoped instructions;
- action: **NEEDS OWNER CONFIRMATION**

This rule must not be inserted unless the owner explicitly confirms that the supervision preference is durable for MEDICSPRO.
## Explicit rejects

### REJECT — duplicate organization identity

`MEDICSPRO` as organization name, its slug, owner membership and employee state are already canonical Wandora product state. Copying them into grounding would create duplicate authority.

### REJECT — platform anti-hallucination rule as MEDICSPRO rule

Rules such as “do not invent company facts”, “unknown remains unknown” and “do not promote model inference to official truth” are already global runtime/product guardrails from ADR 0171. Persisting them again as a tenant house rule would duplicate authority.

### REJECT — external-effect authorization as MEDICSPRO rule

Human Send, Gateway outbound and effect authorization are Wandora policy/effect boundaries. They must not be represented as company grounding merely because individual works also prohibited sending.

### REJECT — Ana/model outputs

No result text from Ana/Mastra/Mistral is an official source. The previously observed invented claims remain evidence of why grounding is needed, not candidate grounding.

## Capability Authority / Reuse Gate

- semantic authority: Wandora official facts + owner-authored house rules;
- durable state: existing migration 017 only;
- operational task/lifecycle authority: Paperclip;
- runtime memory/retrieval/context assembly: Mastra/replacement runtime;
- effect authorization: Wandora;
- replacement boundary: provider-neutral grounding projection already defined by ADR 0171.
No new table, migration, knowledge store, RAG, vector search, embedding, chunking, memory subsystem, context assembler, skill store or policy engine is required.

## Second adversarial review

Each candidate was challenged against:

1. official truth vs inference;
2. adequacy of evidence;
3. fact vs rule semantics;
4. Wandora ownership vs provider duplication;
5. wording precision and behavior risk;
6. secret/sensitive-data leakage;
7. survivability under Paperclip/Mastra replacement.

Results:

- F1 survives all seven checks;
- F2 and F3 fail the no-inference/precision threshold without explicit owner confirmation;
- R1 has direct task evidence but fails durability/scope proof;
- rejected items belong to existing Wandora product/runtime authorities rather than tenant grounding;
- no candidate contains secrets, credentials, personal medical data or provider-native identifiers.

## Decision

The preflight is **GREEN for content discovery** and **NO EFFECT**.

There is sufficient evidence for a future execution to insert **F1 only**.

There is **not** sufficient evidence to claim a first durable MEDICSPRO `rule` yet. Therefore a future execution that intends to establish both facts and Regras da Casa must first obtain explicit owner confirmation for R1 or another owner-authored durable rule.

F2/F3 may be added only after explicit owner confirmation or a stronger approved official source.

## Future execution boundary

A future **MEDICSPRO First Real Organization Grounding Content Execution V1** may use only the exact accepted/confirmed set current at execution time through the canonical customer-facing Core contract.

It must not use direct SQL, provider state, model output or inferred content as a substitute for owner approval.

This preflight creates zero grounding rows and changes no production state.
