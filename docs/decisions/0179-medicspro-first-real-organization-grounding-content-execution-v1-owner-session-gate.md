# ADR 0179 — MEDICSPRO First Real Organization Grounding Content Execution V1 — Owner Authorization + Browser Effect Gate

Status: **AUTHORIZED / PRE-EFFECT READY / WAITING FOR NORMAL OWNER BROWSER MUTATION**
Date: 2026-09-22

## Context

ADR 0178 completed the first real MEDICSPRO grounding content preflight with one accepted fact and three candidates requiring owner confirmation.

The owner has now explicitly confirmed:

- F2: MedicsPro is in fact aimed at medical clinics;
- F3: MedicsPro helps clinics organize their routine and service;
- R1: no commercial material prepared by the digital team may leave without prior review, with no exception.

The owner also explicitly authorizes **MEDICSPRO First Real Organization Grounding Content Execution V1** using the canonical customer-facing grounding contract and forbids direct SQL.

## REAL NOW

Immediately before this execution checkpoint:

- canonical main = `b32335509c1906e323733d6fd9e83b614a0b6711`;
- open PRs = 0;
- migration 017 = LIVE / verified;
- MEDICSPRO grounding rows = 0;
- MEDICSPRO work operations = 2;
- MEDICSPRO outbound attempts = 0;
- Ana = exactly one `active + supervised`;
- Web = `wandora/web:candidate-1800aa3d3fb4`, healthy / restart 0;
- Core = `wandora/core:organization-adapter-candidate-d90b225e6cc2`, healthy / restart 0;
- Paperclip = `wandora/paperclip:v2026.916.0`, healthy / restart 0;
- Messaging Gateway = `wandora/messaging-gateway:origin-fix-94cfb4de`, healthy / restart 0;
- Human Send and Gateway outbound remain OFF by absence.

## Canonical mutation contract

The customer-facing create contract is:

`POST /api/v1/organizations/:organizationId/grounding`

with:

- normal human owner/admin authorization;
- `Idempotency-Key`;
- `entryType = fact | rule`;
- `provenanceType = owner_statement | approved_source`;
- optional provider-neutral `sourceRef` / `sourceLabel`.

The Web renders active `fact` entries under **Fatos oficiais da empresa** and active `rule` entries under **Regras da Casa**.

Therefore R1 is frozen as a formal `rule`, never as a fact.

## Frozen execution payloads

All four entries use:

- `provenanceType = owner_statement`;
- `sourceRef = wandora:customer-work-operation:9a4bc45c-cb6e-410d-8e46-3d7b84fc85ab`;
- `sourceLabel = Confirmação do proprietário MEDICSPRO — 2026-09-22`.

### F1

- idempotency key: `medicspro-grounding-20260922-f1`
- entryType: `fact`
- content: **O MedicsPro reúne agenda, pacientes, informações clínicas e gestão financeira em um único ambiente.**

### F2

- idempotency key: `medicspro-grounding-20260922-f2`
- entryType: `fact`
- content: **O MedicsPro é voltado a clínicas médicas.**

### F3

- idempotency key: `medicspro-grounding-20260922-f3`
- entryType: `fact`
- content: **O MedicsPro ajuda clínicas na organização da rotina e do atendimento.**

### R1

- idempotency key: `medicspro-grounding-20260922-r1`
- entryType: `rule`
- content: **Nenhum material comercial preparado pela equipe digital pode ser enviado externamente sem revisão prévia do proprietário, sem exceção.**

## Provenance decision

The owner has now directly confirmed every statement, so `owner_statement` is the truthful provenance class for all four entries.

The retained `sourceRef` is contextual evidence requested by the owner. It does not change the authority class into `approved_source` and does not imply that the historical work alone proved F2/F3/R1 before the explicit owner confirmation.

## Capability Authority / Reuse Gate

No capability authority changes:

- Wandora = official facts + owner-authored house rules + provenance semantics;
- Paperclip = control-plane lifecycle / task / run authority;
- Mastra/replacement runtime = memory, retrieval, context assembly and execution;
- Wandora effect policy = Human Send / Gateway outbound.

No new table, migration, RAG, retrieval, vector search, embedding, chunking, memory store, prompt store, document store, policy engine or provider subsystem is introduced.

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication.

## Second adversarial review

The execution payloads were challenged against:

1. fact vs rule classification;
2. owner authority;
3. provenance truthfulness;
4. provider-neutral source semantics;
5. duplication of existing Wandora/Paperclip/Mastra authority;
6. secrets/sensitive data;
7. external-effect leakage;
8. replay/idempotency behavior.

Result:

- F1/F2/F3 are correctly `fact`;
- R1 is correctly `rule`;
- all four are owner-approved;
- `owner_statement` is the correct provenance class;
- the requested sourceRef is provider-neutral;
- no secret or personal medical data is present;
- the operation is grounding-only and does not authorize outbound;
- deterministic retained idempotency keys prevent blind duplication if dispatch becomes ambiguous.

## Owner-session effect gate

The mutation still requires a **normal authenticated MEDICSPRO owner/admin session**.

Canonical history explicitly rejects:

- Auth-admin/service-role impersonation;
- minted privileged JWTs;
- extracting browser tokens/passwords/refresh tokens;
- direct SQL as a substitute for the customer path.

The current operator/tooling session has no legitimate access to the owner's browser authentication state.

Therefore production mutation must stop at this boundary rather than violate the customer authorization model.

The allowed completion path is:

```text
normal authenticated MEDICSPRO owner session
-> canonical Web/Core grounding POST
-> exactly F1/F2/F3 as fact
-> exactly R1 as rule
-> readback through customer grounding GET
-> database reconciliation
-> STOP
```

## Effect status

**No grounding row has been created by this checkpoint.**

No model call, work, issue, run, wakeup, task session, provider mutation, Human Send, Gateway outbound or external message is authorized or produced here.

Execution remains authorized and ready once the normal owner-session customer mutation is available.
