# ADR 0275 — Semantic Fast Read + Integration Capability Plane V1 Preflight

Status: **PREFLIGHT GREEN / GO FOR CODE-ONLY CONTRACT + DISPOSABLE ATTESTATION / NO PRODUCTION EFFECT**  
Date: 2026-09-25

## Context

Wandora already proves the normal agentic path:

```text
Wandora -> Paperclip -> Ana / wandora_mastra -> Core / Agent Runtime -> Mastra
        -> Paperclip Tool Gateway -> VendaERP
```

ADR 0260 proved one genuine 28PRO product read through this path. Paperclip Connections/grants/secrets, Tool Gateway, VendaERP MCP, run-scoped identity and existing Wandora effect boundaries are already qualified and must not be duplicated.

A separate repository, `OARANHA/wandora-paperclip-semantic-decision-plugin`, now provides an advisory semantic-decision capability backed by TypeSafe/Jev. Its V1 worker requires an existing Paperclip Issue (`ctx.issues.get(issueId, companyId)`) and returns structured signals including `deterministic_tooling`, `generative_reasoning`, `human_review`, `unknown`, `needsDataOrToolLookup`, `needsMoreContext` and `needsHumanReview`.

The product question is whether bounded commercial reads such as price, stock and price-table lookup can avoid unnecessary open-ended model execution while preserving Paperclip operational authority.

## Permanent guardrail

ADR 0168 remains controlling:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply capability internalization.

No second ERP executor, secret store, grant system, tool registry, Tool Gateway, task/run lifecycle or runtime memory/context subsystem is authorized by this ADR.

## Proven evidence

1. **Current semantic plugin is post-Issue only.** Its manifest exposes advisory UI/actions over Paperclip Issues, and the worker loads the existing Issue before provider classification. Therefore installing or invoking that plugin after Issue creation does not constitute a true pre-Issue fast path.
2. **Paperclip can create an operational run without an Issue.** The official `agent wake` / `POST /api/agents/:id/wakeup` path accepts source, trigger, JSON payload and idempotency key. The server runs the existing adapter.
3. **Tool Gateway requires run identity, not Issue identity.** Agent sessions require companyId + agentId + runId; `issueId` is optional. Connection authorization/token paths refuse agents that are not on an active run.
4. **Tool execution authority is already Paperclip-owned.** Tool profile/policy, Connections/grants/secrets/catalog, session identity and audit remain at Paperclip. Wandora already admits only qualified read tools into the runtime boundary.
5. **Runtime currently has a healthy `wandora-jev-mcp` provider component, but JEV is not product authority.** The semantic decision contract must remain provider-neutral.
6. **Remote-Ops-MCP is healthy and Task Drain is OFF/quiescent.** No production mutation was required for this preflight.

## Decision

### 1. Where semantic decision must happen

The **routing decision must occur in Wandora before customer-work Issue admission** if the goal is to avoid unnecessary generative execution and Issue-backed work lifecycle for bounded reads.

The stable Wandora semantic contract is:

```text
request
  -> semantic decision
      -> deterministic_read
      -> agentic_work
      -> clarify
      -> human_review
```

JEV/TypeSafe is the current provider implementation only. The existing Paperclip plugin remains useful as an advisory post-Issue surface but is not the pre-Issue execution boundary.

### 2. Paperclip Issue requirement

A Paperclip Issue is **not technically required** for run-scoped Tool Gateway authorization. Paperclip supports an on-demand agent run with payload/idempotency before Issue creation, and Tool Gateway sessions are run-scoped.

However, Wandora has **not yet proved** an issue-less customer-safe result-return contract through the current `wandora_mastra` adapter. Therefore:

- architectural boundary: **pre-Issue Paperclip run is legitimate**;
- production readiness: **NO-GO until disposable attestation proves result return, terminal disposition and zero generative call**.

### 3. Deterministic read path

Candidate path:

```text
customer request
  -> Wandora auth / tenant / employee policy
  -> provider-neutral semantic decision
  -> only when deterministic_read is high-confidence and lookup is required
  -> Paperclip on-demand wakeup with stable idempotency + narrow fast-read payload
  -> normal Paperclip run identity
  -> existing Connections/grants/secrets + Tool Gateway
  -> one bounded read tool
  -> typed provider-neutral result
  -> deterministic response renderer
  -> terminal run
```

The fast-read payload must describe intent and bounded business capability, not a raw provider tool name as customer contract.

### 4. Mastra/model behavior

`deterministic_read` must **not invoke the generative Mastra/model path**.

The smallest safe implementation is an explicit bounded execution mode at the existing Paperclip adapter / Wandora Agent Runtime boundary, with fail-closed behavior if the mode is unknown or unsupported. It may reuse existing Tool Gateway adaptation and typed result normalization, but must not enter open-ended agent/workflow reasoning.

A deterministic renderer may produce short templates such as price/stock answers or a clarification list. It is presentation logic, not a second reasoning engine.

### 5. Ambiguity and unknown

Fast read is forbidden when any of these apply:

- semantic decision = `unknown` or low confidence;
- `needsMoreContext` is above the accepted threshold;
- human review is required;
- product identity is ambiguous;
- tool lookup returns multiple plausible products and no exact deterministic discriminator exists;
- requested operation is write/destructive/approval-bearing;
- required capability/grant is absent.

Examples such as “site normal” must not silently select a product. The bounded response is a clarification request listing safe candidate labels, or escalation to normal agentic work when synthesis is needed.

### 6. Observability, audit and idempotency

Do not invent a second lifecycle.

Paperclip remains operational authority for:

- run creation/status/terminal disposition;
- Tool Gateway session/call audit;
- connection/grant/policy enforcement;
- run identity and usage.

Wandora may retain only its existing/minimum request correlation, tenant authorization and customer-safe result projection where required by the product. No new fast-read table or state machine is authorized by this preflight.

Wakeup idempotency and Tool Gateway call idempotency must use correlation derived from the Wandora request. A retry must not create a second provider read.

## Integrations capability plane

`integrations.wandora.com.br` is **not created or canonized as a deployment by this ADR**.

The Wandora-owned concept is a customer-facing **Integration Capability Projection**:

```text
VendaERP
  connected
  Ana may consult:
    products
    prices
    stock
```

Authority split:

| Dimension | Authority |
| --- | --- |
| semantic authority | Wandora product vocabulary: integration, business capability, customer-visible availability |
| durable product state | none required in V1 if projection can be derived; only stable Wandora IDs/binding or explicit customer policy may be persisted when proven necessary |
| operational authority | Paperclip Connections/grants/secrets/catalog/profiles/policies + Tool Gateway |
| provider implementation | VendaERP MCP today; future ERP adapters behind the same business-capability contract |
| replacement boundary | provider adapter/tool-to-business-capability mapping + Paperclip/provider binding; customer-facing Wandora capability names remain stable |

Integrations must **not** copy connection credentials, grants, tool catalogs, policies or secret state into Wandora. It is a product/control-plane projection over operational provider state plus genuinely Wandora-owned authorization/policy.

## Second adversarial review

The first Jev adversarial pass selected `deep_review`, not `proceed_fast`.

The review found two real risks:

1. using Paperclip `wakeup` directly with the current agentic adapter could accidentally enter the generative model path;
2. proving a run can exist without an Issue is not enough to prove a customer-safe result-return and terminal lifecycle.

The decision was therefore narrowed:

- **GO** for a code-only provider-neutral semantic routing contract plus disposable issue-less fast-read attestation;
- **NO-GO** for production enablement, live provider call, new persistence or `integrations.wandora.com.br` creation.

## Minimum next slice

Implement code only:

1. provider-neutral `SemanticRouteDecision` contract at the Wandora request-admission boundary;
2. current JEV provider adapter behind that contract, with no product dependency on JEV identity;
3. explicit `deterministic_read` execution payload/mode for the existing Paperclip adapter / Agent Runtime boundary;
4. deterministic typed renderer for bounded read/clarification outputs;
5. disposable E2E attestation using synthetic/read-only tools:
   `Wandora -> semantic decision -> Paperclip wakeup/run -> Tool Gateway -> synthetic read -> deterministic response`;
6. prove:
   - no Issue created for deterministic branch;
   - exactly one Paperclip run;
   - exactly one tool call;
   - zero Mastra/model call;
   - run terminates;
   - duplicate idempotency does not execute again;
   - ambiguous/multi-match/low-confidence falls out of fast path;
   - normal agentic work remains unchanged.

No migration, new table, production provider call, customer work, model call, outbound, deploy or live JEV enablement is authorized.

## Preflight answers

1. **Semantic decision location:** Wandora request admission, before Issue creation.
2. **Issue mandatory?** No for run/tool authorization; current issue-less result-return still requires disposable proof.
3. **Tool Gateway authorization:** Paperclip on-demand run -> run-scoped Tool Gateway session -> existing grants/profiles/policies.
4. **Short Ana response without generative Mastra:** deterministic typed renderer over authorized read result.
5. **Wandora-owned Integrations role:** provider-neutral customer projection of connected business capabilities and Wandora policy, not provider operational state.
6. **State surviving Paperclip replacement:** stable Wandora integration/capability semantics, optional stable binding IDs/customer policy/audit only when necessary.
7. **Paperclip-only state:** connection lifecycle, grants, secrets, catalog, profiles, tool policies, run/session execution and tool audit.
8. **Unknown/ambiguity:** fail out of fast path; clarify or route to normal agentic/human review; never guess a product.
9. **Observability/idempotency:** reuse Paperclip run + Tool Gateway audit/idempotency and existing Wandora correlation/projection; no second lifecycle.

ADR 0275 is **PREFLIGHT GREEN / GO FOR CODE-ONLY CONTRACT + DISPOSABLE ATTESTATION / NO PRODUCTION EFFECT**.
