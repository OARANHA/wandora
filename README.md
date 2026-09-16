# Wandora

Wandora is a product initiative for small and medium businesses to hire, train, govern and measure digital employees alongside human teams.

## Product thesis

Wandora is not a chatbot, workflow builder, generic AI-agent platform or CRM-with-AI. The intended product experience is an operating layer where a business owner sees:

- people and digital employees as one team;
- work in progress, decisions and outcomes;
- clear autonomy boundaries and approvals;
- shared business context and structured operational memory;
- simple integrations presented as employee tools rather than technical connectors.

CRM, messaging, scheduling, finance and other systems are tools used by employees inside a Wandora-governed company.

The customer-facing language remains business-first. Terms such as LLM, RAG, MCP, workflow node, prompt and token are implementation details and should not define the product experience.

## Architectural principle

Wandora owns the product contract, customer/operator vocabulary, stable product identity, authorization and policy. Specialist systems provide capabilities behind Wandora-owned adapters.

**Owning a Wandora contract does not mean reimplementing the provider's capability inside Wandora.** Before a new table, workflow, state machine, assignment model, agent registry or admin subsystem is introduced, ADR 0036 requires checking whether an accepted component already supplies that capability and defining the minimum Wandora-owned state/adaptation required.

See `docs/CAPABILITY_AUTHORITY.md` for the canonical capability map.

## Current phase

Wandora is **early-beta / architecture-and-product validation**. The current objective is to connect the existing customer experience to real, provider-neutral Wandora contracts while preserving replaceable specialist capability boundaries.

Current technology roles:

- **Paperclip** — validated laboratory candidate for digital-employee organization/control-plane capabilities, behind a Wandora `Organization Adapter`; its production adapter boundary still requires proof before customer hiring/control-plane flows depend on it;
- **Mastra** — accepted initial Agent Runtime implementation behind a Wandora `Agent Runtime Adapter`; deterministic supervised execution is already proven in the live Core;
- **Supabase self-hosted / PostgreSQL** — accepted data/auth infrastructure for Wandora-owned durable facts, mappings, projections and policy-relevant state; it is not the Wandora business backend;
- **Evolution API** — accepted initial WhatsApp provider behind Wandora's Messaging Gateway;
- **Mistral / Chutes / OpenAI / other providers** — replaceable model providers behind provider-neutral boundaries;
- **Cloudflare + Traefik + Docker Compose + Portainer** — initial edge and VPS operations model.

These providers do not define the customer-facing Wandora contract. Wandora must remain able to replace them behind stable internal boundaries without recreating their full native domains in Wandora PostgreSQL/Core.

## Canonical documentation

Agents and contributors must read the repository authority in this order:

1. `AGENTS.md`;
2. accepted ADRs in `docs/decisions/`;
3. `docs/CAPABILITY_AUTHORITY.md`;
4. `docs/architecture.md`;
5. `docs/CANONICAL_STATE.md`.

`docs/CANONICAL_STATE.md` records the exact current handoff and next executable slice so another chat/agent can resume without reconstructing prior decisions.

## Deployment model

The laboratory/early-beta environment runs on a dedicated VPS using:

- Docker Engine;
- Docker Compose / Portainer-compatible stacks;
- Portainer as a protected operator console;
- Cloudflare as public edge;
- Traefik as VPS ingress;
- private Docker networks by default;
- explicit exposure only for services that require ingress;
- Git as the infrastructure source of truth.

Supabase may initially share the current VPS during early-beta work, but its stable hostname and persistent-state design must allow later migration to a dedicated data-plane VPS.

## Repository structure

```text
wandora/
├── AGENTS.md
├── README.md
├── SECURITY.md
├── apps/          # Wandora-owned customer/admin applications
├── services/      # Wandora-owned runtime/gateway services
├── packages/      # shared contracts and libraries
├── infra/         # deployment manifests, stack definitions and runbooks
└── docs/          # product, architecture, canonical handoff, research and ADRs
```

Empty directories are created only when their first real artifact exists. We do not scaffold unused services merely to make the repository look complete.

## Guiding principle

> Use mature market infrastructure behind stable Wandora boundaries; build what makes Wandora uniquely valuable to the customer. Reuse specialist capability before reimplementing it.
