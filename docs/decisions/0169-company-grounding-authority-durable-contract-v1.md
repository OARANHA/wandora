# ADR 0169 — Empresa / Regras da Casa Grounding Authority + Durable Contract V1

Status: **ACCEPTED CANDIDATE / IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**
Date: 2026-09-22

## Context

The first model-backed MEDICSPRO work proved that an employee can produce a useful supervised result while still inventing unsupported company facts. Examples included unverified customer counts, product capabilities and success claims.

This is a grounding/authority/provenance problem, not merely a prompt-tuning problem.

ADR 0168 requires provider portability by contract decoupling rather than capability duplication.

## REAL NOW

Canonical base:

```text
main = 90e9871f8424c68d34b911c3b4a17975b6b33218
PR #224 = merged
open PRs = 0
normal CI = GitHub-hosted ubuntu-24.04
```

Production readback entering this slice:

```text
Web = wandora/web:candidate-65908b76c667 / healthy
Paperclip = wandora/paperclip:v2026.916.0 / healthy
Core = healthy
Gateway = healthy
/conversations = 200
/api/v1/me unauthenticated = 401
Human Send = OFF
Gateway outbound = OFF
```

The live Wandora schema contains organization identity, memberships, employees, work, conversations, approvals and audit, but no official-company-fact or house-rule contract.

## Capability Authority / Reuse Gate

Paperclip already owns/supplies control-plane Skills, Decisions, Decision Training, Execution Policy, Connections/grants/secrets, company/agent organization and task/run lifecycle. Those remain delegated.

Mastra remains runtime implementation authority for execution and, when separately adopted, memory, retrieval, prompt/context assembly, tools, runtime skills, observability and evals. Those remain delegated.

Neither specialist is the durable semantic authority for statements such as:

- an official fact about a customer company;
- an owner-authored house rule;
- an owner-approved correction that becomes company truth;
- the provider-neutral reference proving where that truth came from.

Those semantics must survive Paperclip or Mastra replacement without turning Wandora into a replacement control plane/runtime.

## Decision

Adopt **Regras da Casa** as the Wandora product vocabulary for company-owned grounding.

Wandora owns only the minimum durable semantic declarations:

```text
fact
rule
provenance
source reference
active/retired lifecycle
creating Wandora user + timestamps
```

The first code-only contract is `wandora.organization_grounding_entries`.

It is explicitly not:

- a knowledge base;
- a document store;
- a prompt store;
- a memory store;
- a vector store;
- a retrieval/RAG engine;
- an embeddings/chunking subsystem;
- a skill store;
- a second Paperclip policy/decision engine.

### Read authority

`wandora_core_runtime` receives tenant-scoped **SELECT only** through RLS.

No Core INSERT/UPDATE/DELETE is granted in V1.

`anon`, `authenticated` and `service_role` receive no direct table access.

A later owner mutation contract must be separately authorized and audited before writes are exposed.

### Provenance

Supported provenance classes:

- `owner_statement`;
- `approved_source`;
- `approved_correction`.

`approved_source` and `approved_correction` require a provider-neutral `source_ref`.

No model output becomes an official fact merely because it was generated.

## Runtime boundary

This ADR does **not** wire grounding into Mastra.

A later runtime-projection slice may supply a bounded provider-neutral input:

```text
officialFacts[]
houseRules[]
workContext
```

The runtime must distinguish those from inference and unknown information.

How the runtime assembles/retrieves context remains replaceable specialist implementation. This ADR does not authorize RAG/memory/vector infrastructure.

## Product surface classification

- organization identity: **REAL**;
- Pessoas com acesso: **REAL/DERIVABLE** from memberships, pending product wiring;
- Regras da Casa: **FUTURE** until migration + owner mutation/read surface are promoted;
- Ferramentas: **FUTURE/PARTIAL**, no invented connected tools;
- Ensinar a equipe: **FUTURE**, despite Paperclip Decision Training existing operationally;
- documents/sources: **FUTURE**, no connected documents are claimed;
- organizational memory/RAG/knowledge base: **QUARANTINE as customer-facing claims** until an accepted capability requires them.

## Second adversarial review

Rejected:

1. using Paperclip Skills/Decisions/Decision Training as the only copy of company truth;
2. using Mastra Memory as official company truth;
3. building a Wandora retrieval/vector/memory engine for portability;
4. storing provider-native IDs as the grounding semantic contract;
5. auto-promoting model inference into company facts;
6. granting runtime write access before an owner-authorized mutation contract exists;
7. direct authenticated-table access for Web convenience.

Accepted:

- minimum Wandora semantic state;
- read-only Core projection boundary;
- provider-neutral source reference;
- later separate owner-write, product-surface and runtime-projection slices.

## Validation

Disposable Supabase/PostgreSQL 17.6.1.136 proof:

```text
migration 017 apply = GREEN
RLS enabled = proven
Core tenant A read = 2 entries
Core tenant B read = 0 entries
cross-tenant leakage = 0
Core write attempt = denied
approved_source without source_ref = rejected
ORGANIZATION_GROUNDING_CONTRACT_V1_OK
ORGANIZATION_GROUNDING_V1_VERIFY_OK
```

No production migration or customer data mutation occurred.

## Documentation evidence

Detailed matrix:

`docs/research/COMPANY_GROUNDING_CAPABILITY_AUTHORITY_REVIEW_V1.md`

## Next slices

The next implementation should remain separated:

1. **Organization Grounding Owner Mutation + Customer Read Contract V1 — code-only/no production effect**, with owner/admin authorization, audit and bounded reads.
2. **Organization Grounding Runtime Projection V1 — code-only/no production effect**, consuming only active official facts/rules through the Agent Runtime contract.
3. production migration/promotion only after both contracts are independently reviewed.

Do not enable Human Send or Gateway outbound as part of these slices.