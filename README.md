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

## Current phase

Wandora is **pre-MVP / architecture-validation**. The current objective is to establish a reproducible foundation and remove critical architectural uncertainty before freezing the minimum distributable product.

Current technology roles:

- **Paperclip** — validated laboratory candidate for organization/control-plane capabilities, behind a Wandora adapter;
- **Mastra** — primary agent-runtime candidate, currently under feasibility validation;
- **Supabase self-hosted / PostgreSQL** — accepted laboratory data/auth foundation and canonical Business Graph storage;
- **Evolution API** — laboratory WhatsApp provider behind Wandora's messaging gateway;
- **OpenAI / Chutes / other providers** — model providers behind a provider-neutral boundary;
- **Cloudflare + Traefik + Docker Compose + Portainer** — initial edge and VPS operations model.

These providers do not define the customer-facing Wandora contract. Wandora must remain able to replace them behind stable internal boundaries.

## Canonical documentation

Agents and contributors must read the repository authority in this order:

1. `AGENTS.md`;
2. accepted ADRs in `docs/decisions/`;
3. `docs/architecture.md`;
4. `docs/CANONICAL_STATE.md`.

`docs/CANONICAL_STATE.md` records the exact current handoff and next executable slice so another chat/agent can resume without reconstructing prior decisions.

## Deployment model

The laboratory environment runs on a dedicated VPS using:

- Docker Engine;
- Docker Compose / Portainer-compatible stacks;
- Portainer as the human operations console;
- Cloudflare as public edge;
- Traefik as VPS ingress;
- private Docker networks by default;
- explicit exposure only for services that require ingress;
- Git as the infrastructure source of truth.

Supabase may initially share the current VPS during laboratory/early-beta work, but its stable hostname and persistent-state design must allow later migration to a dedicated data-plane VPS.

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

> Use mature market infrastructure behind stable Wandora boundaries; build what makes Wandora uniquely valuable to the customer.
