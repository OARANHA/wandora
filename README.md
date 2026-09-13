# Wandora

Wandora is an experimental product initiative for small and medium businesses to hire, train, govern and measure digital employees alongside human teams.

## Product thesis

Wandora is not a chatbot, workflow builder or generic AI-agent platform. The intended product experience is an operating layer where a business owner sees:

- people and digital employees as one team;
- work in progress, decisions and outcomes;
- clear autonomy boundaries and approvals;
- shared business context and structured operational memory;
- simple integrations presented as employee tools rather than technical connectors.

The customer-facing language should remain business-first. Terms such as LLM, RAG, MCP, workflow node, prompt and token are implementation details and should not define the product experience.

## Current phase

The project is intentionally **pre-MVP**. Before freezing the minimum distributable product, Wandora will validate a small set of architectural spikes.

Current leading candidates:

- **Paperclip** — organization/control plane for digital employees;
- **Mastra** — agent runtime, tools, memory and durable workflows;
- **Arcade** — authenticated tools/OAuth and action authorization;
- **Supabase/PostgreSQL** — canonical business data and Business Graph;
- **Chutes/OpenAI/other providers** — model providers behind a provider-neutral boundary;
- **Evolution API and official WhatsApp providers** — messaging adapters behind Wandora's own messaging boundary.

These are candidates, not permanent dependencies. Wandora must own its product contracts and avoid exposing third-party schemas directly to the client.

## Deployment model

The laboratory environment will run on a dedicated VPS using:

- Docker Engine;
- Docker Compose / Portainer Stacks;
- Portainer as the human operations console;
- private Docker networks by default;
- explicit reverse-proxy exposure only for services that need ingress.

See `docs/architecture.md` and `docs/decisions/0001-portainer-and-docker.md`.

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
└── docs/          # product, architecture, research and ADRs
```

Empty directories will be created only when their first real artifact exists. We do not scaffold unused services merely to make the repository look complete.

## Guiding principle

> Use mature market infrastructure behind stable Wandora boundaries; build what makes Wandora uniquely valuable to the customer.
