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
| Human identity/session | canonical Wandora user/membership semantics and authorization | Supabase Auth supplies identity/session |\n| Auth transactional e-mail delivery | sender identity choice, rollout/custody policy and customer-access semantics | Supabase Auth creates invite/recovery mail; Resend SMTP supplies transport behind that Auth boundary |
| Wandora durable facts | policy facts, mappings, projections, audit evidence, product state that must survive provider replacement | Supabase PostgreSQL is storage infrastructure |
| Digital-employee organization/control plane | Wandora-facing employee identity/contract, customer policy and replaceability boundary | Paperclip through Organization Adapter, subject to adapter proof |
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

## Mandatory question before new domain code

Before adding a material table/entity/service/workflow/state machine, answer:

> **Is this a Wandora-unique product rule, or are we rebuilding a capability already supplied by an accepted component?**

If the answer is uncertain, the implementation is blocked until the relevant provider/adapter is inspected.

Absence from the current Wandora schema is not evidence that Wandora should own the capability.

## Examples

### “Contratar Ana”

Customer language and authorization are Wandora-owned. The operation must first determine which employee/control-plane capabilities Paperclip already provides and define the Organization Adapter. Wandora may keep a stable employee ID/mapping/policy projection; it must not automatically grow a second agent-control-plane because a local table is convenient.

### “Ana respondeu uma mensagem”

Wandora owns the supervised product contract and policy. Mastra supplies execution through the Agent Runtime Adapter. Evolution supplies transport through Messaging Gateway. Neither provider's IDs become the customer's contract.

### Platform Admin

Platform Admin controls Wandora. It exercises Supabase/Paperclip/Mastra/Evolution capabilities through Wandora contracts/adapters. It is not a stitched collection of provider consoles and it is not a reimplementation of every provider console.

## Current safety hold

The abandoned unmerged `digital_employee_work_assignments` / migration 010 direction is **not authoritative** and must not be revived without explicitly passing ADR 0036's Capability Reuse Gate after Paperclip adapter analysis.
