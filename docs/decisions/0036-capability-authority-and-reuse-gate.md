# ADR 0036 — Capability Authority and Reuse Gate

Date: 2026-09-16
Status: **Accepted architectural guardrail.**

## Why this ADR exists

Wandora intentionally composes mature specialist systems behind Wandora-owned contracts. A dangerous drift occurs when a missing local table, service or workflow is interpreted as permission to implement the capability natively in Wandora Core without first checking whether an adopted component already owns or materially provides that capability.

That drift would gradually turn Wandora into partial reimplementations of Paperclip, Mastra, Evolution, Supabase or future providers, increasing cost, coupling and inconsistency while defeating the adapter architecture already accepted in ADRs 0003, 0005, 0006 and 0015.

A concrete near-miss occurred while evaluating customer digital-employee hiring: a local `digital_employee_work_assignments` domain was provisionally designed before re-evaluating Paperclip's organization/control-plane responsibility. That work was stopped before merge or production application.

## Core principle

**Wandora owns the product contract, identity vocabulary, authorization, policy and customer/operator experience. Specialist components lend capabilities through Wandora-owned adapters. Wandora ownership of a contract does not imply Wandora-native reimplementation of the underlying capability.**

Provider/framework identifiers never become customer-facing Wandora identity merely because the provider implements the capability.

## Capability authority map

Current intended responsibility boundaries are:

- **Wandora Web / Platform Admin** — customer/operator experience, Wandora vocabulary and approved actions.
- **Wandora Core/API** — product contracts, tenant/platform authorization, policy, supervision, orchestration, stable Wandora IDs and provider-neutral adapter contracts.
- **Supabase** — identity/session plus PostgreSQL/data infrastructure for Wandora-owned durable facts, mappings, projections and policy-relevant state. Supabase Studio remains an operator diagnostic surface.
- **Paperclip / Organization Adapter** — organization/control-plane capability for digital employees, including employee coordination concepts that Paperclip demonstrably supports. Paperclip UI remains an operator/engineering surface; its IDs/schema must not leak into customer contracts.
- **Mastra / Agent Runtime Adapter** — agent/workflow/tool execution. Mastra does not own Wandora tenancy, customer authorization or public employee identity.
- **Evolution / Messaging Gateway** — WhatsApp transport/provider capability. Evolution Manager is an operator diagnostic surface; customers see Wandora messaging concepts only.
- **Model providers** — replaceable model inference behind Wandora runtime/provider boundaries.
- **Docker/Portainer/Traefik/Cloudflare** — deployment, runtime and edge capabilities; they are not Wandora product-domain models.

This map defines architectural intent, not blind delegation. A provider capability is promoted into a production path only after its Wandora adapter contract and failure semantics are proven.

## Mandatory Capability Reuse Gate

Before creating any material new Wandora domain entity, table, state machine, workflow engine, scheduler, assignment model, agent registry, integration lifecycle, admin subsystem or equivalent capability, the decision must answer all of the following **before implementation**:

1. **What exact customer/operator capability is missing?**
2. **Does an already adopted component provide all or part of it?** Explicitly inspect Paperclip, Mastra, Evolution, Supabase and any other accepted component relevant to the domain.
3. **Which layer should be authoritative for the underlying capability?** Distinguish Wandora contract authority from implementation/state authority.
4. **What minimal Wandora-owned state is actually required?** Prefer stable Wandora IDs, authorization/policy facts, mappings, projections, audit evidence and replaceability boundaries over copying a provider's whole domain.
5. **What adapter contract prevents provider leakage?** Browser and Platform Admin must use Wandora contracts, not provider schemas.
6. **What happens if the provider is unavailable or replaced?** Define failure, reconciliation and idempotency behavior before coupling the product path.
7. **Would the proposed Wandora-native implementation duplicate a provider capability?** If yes, default decision is **do not build it** unless an ADR documents a concrete product/security/reliability reason why the provider capability is insufficient.

A material change that cannot answer these questions is **BLOCKED** from execution.

## Anti-reimplementation rule

The following reasoning is explicitly invalid:

> “The concept does not exist in our PostgreSQL schema, therefore Wandora must create it.”

The correct sequence is:

```text
missing product capability
  -> inspect accepted capability providers
  -> identify authority boundary
  -> define Wandora adapter/contract
  -> persist only required Wandora-owned state
  -> implement native domain only if reuse is proven insufficient
```

## State ownership vs contract ownership

Wandora must preserve stable product identity and semantics even when a provider implements the capability.

For example, a digital employee may have a stable Wandora ID and tenant-visible name while its organization/control-plane representation is implemented by Paperclip and its execution is implemented by Mastra. Wandora may persist a mapping/projection necessary for authorization, customer rendering, audit or provider replacement without cloning the full Paperclip or Mastra domain.

Similarly, “Connect WhatsApp” is a Wandora product action even when Evolution implements transport.

## Platform Admin implication

Platform Admin is the Wandora cockpit over the same adapter boundaries. It should progressively expose Wandora-owned controls that exercise provider capabilities through adapters. It must not become a second implementation of Paperclip, Mastra Studio, Evolution Manager, Supabase Studio or Portainer.

Native consoles remain protected deep-diagnostic/emergency tools.

## Relationship to ADR 0034 state-first rule

ADR 0034 remains mandatory, but its practical sequence is extended to:

```text
REAL NOW
  -> PROVEN EVIDENCE
  -> GAPS
  -> CAPABILITY AUTHORITY / REUSE GATE
  -> DECISION
  -> SECOND ADVERSARIAL REVIEW
  -> EXECUTION
  -> VALIDATION
```

The reuse gate happens before a gap becomes a local design.

## Consequence for the abandoned assignment direction

The provisional unmerged `digital_employee_work_assignments` / migration 010 direction is rejected as an authoritative next step. No such migration was merged or applied live.

Before customer hiring/assignment work continues, Paperclip's current control-plane API/capabilities and the Wandora `Organization Adapter` must be audited/proven. Only state that remains demonstrably Wandora-owned after that audit may be added to Core/PostgreSQL.

## Enforcement

This ADR is enforced through:

- `AGENTS.md` mandatory planning rules;
- `docs/architecture.md` capability-authority section;
- the repository PR template requiring an authority/reuse declaration for material domain changes;
- adversarial review explicitly checking for provider-capability duplication.

A future ADR may supersede a specific provider choice, but it may not silently remove the capability-reuse principle.