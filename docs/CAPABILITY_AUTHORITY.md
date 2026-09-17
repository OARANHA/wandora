# Wandora — Capability Authority Map

Status: **Canonical architectural guardrail**

Read with ADR 0036. If a local implementation idea conflicts with this map, stop implementation and resolve the authority boundary before writing code or migrations.

## The one-sentence rule

**Wandora owns the product contract and experience; specialist components lend capabilities through Wandora-owned adapters. Owning the contract does not mean reimplementing the provider's domain inside Wandora.**

## Product topology

```text
CUSTOMER                                  WANDORA OPERATOR
app.wandora.com.br                        Platform Admin
        |                                      |
        +-------------------+------------------+
                            v
                    Wandora Core/API
              contracts + authorization + policy
                 orchestration + stable IDs
                            |
          +-----------------+------------------+------------------+
          |                 |                  |                  |
          v                 v                  v                  v
  Organization Adapter  Agent Runtime      Messaging         Data/Auth
          |              Adapter            Gateway           Boundary
          v                 |                  |                  |
      Paperclip             v                  v                  v
                         Mastra             Evolution          Supabase
                            |
                            v
                    Model/Tool providers
```

Native consoles — Paperclip UI, Mastra Studio, Evolution Manager, Supabase Studio and Portainer — are protected operator/engineering surfaces. They are not the normal customer experience and they do not replace Platform Admin.

## Authority by capability

| Capability | Wandora owns | Specialist capability / implementation |
| --- | --- | --- |
| Customer product experience | vocabulary, UX, authorization, policy, stable product IDs | Wandora Web/Core |
| Platform operation | operator contracts, authorization, audit, coherent cross-tenant controls | Wandora Platform Admin over adapters |
| Human identity/session | canonical Wandora user/membership semantics and authorization | Supabase Auth supplies identity/session |
| Wandora durable facts | policy facts, mappings, projections, audit evidence, product state that must survive provider replacement | Supabase PostgreSQL is storage infrastructure |
| Digital-employee organization/control plane | Wandora-facing employee identity/contract, customer policy, request idempotency and replaceability boundary | Paperclip through Organization Adapter; managed resources supply provider lifecycle/reconcile/relink/reset |
| Agent/workflow execution | Wandora Agent Runtime contract, allowed inputs/outputs and policy | Mastra through Agent Runtime Adapter |
| WhatsApp/messaging transport | provider-neutral connection/send/receive contracts and effect policy | Evolution/Meta/etc through Messaging Gateway |
| Model inference | model-neutral product/runtime contract and policy | Mistral/Chutes/OpenAI/etc behind provider boundary |
| Deployment/runtime | desired versioned platform topology in Git | Docker/Compose/Portainer/Traefik/Cloudflare provide infrastructure capability |

## Minimal-state rule

When a specialist component implements a capability, Wandora may still persist what Wandora genuinely owns, for example:

- stable Wandora identifier;
- tenant ownership;
- provider mapping/reference;
- authorization/policy state;
- customer-facing projection/cache where justified;
- audit/reconciliation evidence;
- idempotency/version state required to make adapter operations safe.

This is **not** permission to clone the provider's complete control-plane/runtime domain into PostgreSQL.

For Paperclip specifically, ADR 0039 proves an important distinction: `agents.managed.reconcile()` provides stable-key reconciliation/relink behavior and preserves operator edits, but simultaneous first reconciles can still race and create duplicates. Therefore Wandora's private hire-operation journal is legitimate **request serialization/idempotency state**; it must never expand into a second agent lifecycle.

## Mandatory question before new domain code

Before adding a material table/entity/service/workflow/state machine, answer:

> **Is this a Wandora-unique product rule, or are we rebuilding a capability already supplied by an accepted component?**

If the answer is uncertain, the implementation is blocked until the relevant provider/adapter is inspected.

Absence from the current Wandora schema is not evidence that Wandora should own the capability.

## Examples

### “Contratar Ana”

Customer language, tenant authorization, stable Wandora identity and request idempotency are Wandora-owned. Paperclip supplies the managed-agent lifecycle behind the Organization Adapter. The accepted provider path is company-scoped plugin configuration using a Paperclip `secret_ref`, followed by `agents.managed.reconcile(stableAgentKey, companyId)` under a Wandora-owned serialized operation claim.

Wandora may keep its stable employee ID, private provider binding and minimal operation journal. It must not grow a second agent-control-plane, hierarchy, assignment engine or lifecycle because a local table is convenient.

### “Ana respondeu uma mensagem”

Wandora owns the supervised product contract and policy. Mastra supplies execution through the Agent Runtime Adapter. Evolution supplies transport through Messaging Gateway. Neither provider's IDs become the customer's contract.

### Platform Admin

Platform Admin controls Wandora. It exercises Supabase/Paperclip/Mastra/Evolution capabilities through Wandora contracts/adapters. It is not a stitched collection of provider consoles and it is not a reimplementation of every provider console.

## Current safety hold

The earlier abandoned `digital_employee_work_assignments` / native assignment-control-plane direction is **not authoritative** and must not be revived without explicitly passing ADR 0036's Capability Reuse Gate.

Do not confuse that abandoned direction with the current `20260916_010_organization_adapter_state_v1.sql`. The current migration 010 is accepted by ADR 0038, remains merged-but-not-live, and contains only private provider bindings plus the narrow external-effect/idempotency journal preserved by ADR 0039.
