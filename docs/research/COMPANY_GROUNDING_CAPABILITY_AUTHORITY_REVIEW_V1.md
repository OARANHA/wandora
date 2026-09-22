# Empresa / Regras da Casa — Capability Authority Review V1

Date: 2026-09-22
Status: canonical review evidence for ADR 0169

## Problem

The second legitimate MEDICSPRO work proved that a useful model-backed answer can still invent unsupported company facts. The failure mode is not merely prompt quality. It is a missing durable semantic boundary between official company truth, owner rules, work context, inference and unknown information.

No MEDICSPRO fact is introduced by this review.

## REAL NOW

- Wandora durable organization state currently contains organization identity/status, memberships/roles, employees, customer work, conversations, approvals and product/effect audit.
- The live schema has no durable official-company-fact, house-rule or source-reference contract.
- Paperclip v2026.916.0 already owns/supplies organizational skills, decisions, Decision Training, Execution Policy, connections/grants/secrets, company/agent organization, tasks/runs and related control-plane history.
- Paperclip Tool Gateway and other experimental surfaces remain QUARANTINE unless separately qualified.
- Mastra is the runtime implementation. Persistent Memory, Observability and Evals are supported upstream but are not installed in the live Core. Retrieval, memory, context processing, prompt assembly, runtime tools and orchestration are execution mechanics, not company-truth authority.
- Human Send and Gateway outbound remain OFF.

## Authority matrix

| Capability | Semantic authority | Minimum Wandora durable state | Operational authority / implementation today | Replacement boundary | Wandora implementation requirement | Status |
| --- | --- | --- | --- | --- | --- | --- |
| organization identity/profile | Wandora | stable org id, name, slug, status | Supabase storage | storage migration only | YES — unique product semantics | REAL |
| official company facts | Wandora / customer owner | fact text, provenance, source reference, lifecycle | runtime consumes through Agent Runtime adapter; retrieval may be delegated | runtime/provider can change without changing fact contract | YES — unique product semantics, minimal state only | CONTRACT V1 |
| Regras da Casa / owner rules | Wandora / customer owner | rule text, provenance, lifecycle | runtime/control plane may consume/project | provider adapter/materialization changes | YES — unique product semantics, minimal state only | CONTRACT V1 |
| approved corrections becoming durable rules/facts | Wandora after explicit approval | approved correction as a new authoritative entry + evidence reference | Paperclip Decision Training may retain control-plane training evidence; Mastra evals may measure output quality | provider evidence can migrate independently | MINIMAL BINDING/FACT ONLY | FUTURE WRITE FLOW |
| source references | Wandora semantic reference | provider-neutral opaque source ref + label where needed | actual file storage/retrieval/indexing delegated | storage/retrieval provider can change | MINIMAL BINDING ONLY | CONTRACT V1 |
| organizational skills | Paperclip control plane | stable Wandora labels/projection only if customer-facing | Paperclip Skills | migrate/export provider state | NO — DELEGATE | REAL PROVIDER |
| runtime skills | runtime | none beyond policy/binding if required | Mastra runtime | replace runtime/provider | NO — DELEGATE | FUTURE ADOPTION |
| persistent/runtime memory | runtime | retention/privacy policy only; no memory copy | Mastra Memory when qualified | migrate/discard runtime memory by policy | NO — DELEGATE | FUTURE |
| retrieval/RAG/chunking/embeddings/vector search | runtime specialist | source semantics/references only | Mastra or future runtime provider | swap implementation/index | NO — DELEGATE | FUTURE |
| prompt/context assembly | runtime specialist under Wandora input contract | typed official facts/rules contract only | Mastra/Agent Runtime | replace runtime assembler | NO — DELEGATE | FUTURE PROJECTION |
| tools / organizational connections | Paperclip candidate operational authority; Wandora effect semantics remain final | stable product integration identity only if needed | Paperclip Connections/grants after qualification | migrate connection/grant state or reauthorize | NO — DELEGATE / QUARANTINE where experimental | PARTIAL |
| credentials / grants | specialist by domain | only Wandora-owned adapter/effect secrets | Paperclip secrets/connections; Messaging Gateway custody for transport | rotate/reauthorize provider state | NO — DELEGATE | REAL/PARTIAL |
| employee-specific operational instructions | Paperclip control plane | only Wandora-unique product constraints | Paperclip agent/profile/instruction surfaces | materialize through new provider | NO — DELEGATE by default | PROVIDER |
| work context | Wandora/Paperclip contract for admitted work | existing work receipt/projection only | Paperclip task/run + Agent Runtime | adapter migration | NO NEW STORE | REAL |
| inference / model hypothesis | none as official truth | never persisted as official fact automatically | model/runtime | replace model/runtime freely | FORBID AS OFFICIAL FACT | RULE |
| unknown information | explicit runtime state | none | runtime behavior | provider-independent contract | FORBID FABRICATION | RULE |
| control-plane decisions/training | Paperclip | no shadow database | Paperclip Decisions/Decision Training | export/migrate if adopted as dependency | NO — DELEGATE | REAL PROVIDER |
| runtime quality/evals | Mastra | product gate/acceptance policy only | Mastra Evals when adopted | replace eval implementation | NO — DELEGATE | FUTURE |
| compliance/external-effect audit | Wandora | durable product/effect audit | Wandora Core/Data | remains Wandora | YES — existing unique semantics | REAL |
| external-effect authorization | Wandora | effect policy/receipts | Wandora + Gateway adapters | provider-neutral | YES — existing unique semantics | REAL |

## Provider replacement

### If Paperclip is replaced

The customer-facing Wandora contracts that must remain stable are organization/employee identity, customer work semantics, Regras da Casa, official company facts, source references, product policy and effect authorization.

Paperclip lifecycle, tasks/runs, skills, Decisions/Decision Training, Connections/grants and operational history may be provided by the next control-plane provider and migrated/exported where the adopted capability requires it. Wandora must not internalize those engines merely for portability.

### If Mastra is replaced

Official facts, rules and source references remain available through the Wandora-owned grounding contract. The next runtime may completely replace memory, retrieval, embeddings/vector search, chunking, prompt/context assembly, orchestration, runtime skills, tools and eval mechanics.

## Minimum grounding contract

The minimum durable record is an appendable/reviewable declaration with:

- organization;
- kind: fact or rule;
- content;
- provenance: owner statement, approved source or approved correction;
- provider-neutral source reference when provenance requires evidence;
- optional source label;
- active/retired product lifecycle;
- creating Wandora user and timestamps.

It is deliberately **not** a document store, prompt store, vector store, memory store, skill store or policy engine.

Migration 017 implements only this minimum table and gives `wandora_core_runtime` tenant-scoped SELECT. It grants no Core writes and no browser/authenticated direct access.

## Runtime target contract

A later, separately reviewed runtime projection may supply:

```text
officialFacts[]  = active Wandora fact entries
houseRules[]     = active Wandora rule entries
workContext      = the admitted work/task
modelInference   = never promoted to official fact by execution alone
unknown          = must remain unknown; model must not invent an official fact
```

The assembly/retrieval mechanism remains a runtime concern. This review does not authorize RAG, embeddings, vector search, memory or generic retrieval infrastructure.

## Empresa surface honesty map

| Product block | Classification now | Rule |
| --- | --- | --- |
| organization name/basic identity | REAL | existing organization state |
| Pessoas com acesso | REAL / DERIVABLE | existing active memberships/roles; surface still needs product wiring |
| Regras da Casa | FUTURE until migration + owner write/read flow are promoted | never invent seeded rules |
| Ferramentas | FUTURE / PARTIAL | do not claim connections until a qualified customer-facing connection projection exists |
| Ensinar a equipe | FUTURE | Paperclip Decision Training is provider evidence, not yet a Wandora customer flow |
| official documents/sources | FUTURE | source references contract exists only in code candidate; no documents are connected |
| memory / knowledge base / RAG | QUARANTINE as product claims | no such Wandora capability is live |

## Second adversarial review

Rejected:

1. putting official company facts only in Paperclip Skills, Decisions or agent instructions;
2. using Mastra Memory as the company source of truth;
3. creating a Wandora knowledge-base/RAG/vector subsystem;
4. copying Paperclip organizational policies/skills/training state into Supabase;
5. persisting model inference automatically as fact;
6. making source refs provider-specific document IDs;
7. granting Core write authority before an owner-authorized mutation contract exists;
8. exposing direct authenticated table access just to simplify the Web.

Accepted:

- minimum Wandora semantic record for official facts/rules;
- provider-neutral provenance reference;
- Core read-only tenant-scoped access;
- separate later slices for owner mutation, customer projection and runtime grounding.

## First implementation slice

Code-only / NO PRODUCTION EFFECT:

- migration 017;
- SQL verifier;
- disposable Supabase/PostgreSQL proof;
- Core CI invocation of the verifier;
- no production migration;
- no MEDICSPRO data;
- no runtime injection;
- no write API;
- no Web feature;
- no model call;
- no outbound.