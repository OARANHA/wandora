# ADR-0001 — Portainer + Docker Compose for the initial Wandora infrastructure

Status: Accepted

## Context

Wandora needs a simple, inspectable deployment model for a dedicated VPS while the product is still validating its architecture. The goal is to minimize platform engineering overhead and make it easy to run independent infrastructure candidates such as Paperclip, Mastra-related services, messaging adapters, databases and observability components.

## Decision

Use:

- Docker Engine as the container runtime;
- Docker Compose as the deployment definition format;
- Portainer as the operator-facing management console;
- Portainer Stacks to deploy Compose definitions from version-controlled sources where practical.

GitHub remains the canonical source for infrastructure manifests and documentation. Portainer is not the only source of configuration truth.

## Initial stack strategy

Prefer multiple bounded stacks over one giant Compose file.

Candidate layout:

```text
wandora-edge
  reverse proxy / TLS / shared ingress

wandora-data
  PostgreSQL/Supabase-related components if self-hosted later
  Redis only when justified

wandora-org
  Paperclip and its direct runtime dependencies

wandora-agents
  Mastra runtime / Wandora agent services

wandora-messaging
  Evolution API laboratory adapter and supporting components

wandora-observability
  logs/traces/metrics when introduced

wandora-app
  Wandora Core + Wandora Front when product implementation begins
```

The exact split may change after spikes. Do not create empty stacks just to match this diagram.

## Networking rules

- Use dedicated Docker networks by trust boundary where practical.
- Do not expose PostgreSQL, Redis, Docker APIs or internal service ports to the public Internet.
- External ingress goes through a reverse proxy/TLS layer.
- Webhook ingress must be explicit and narrowly scoped.
- Portainer itself must be access-controlled and should not be treated as a public customer service.

## Versioning rules

- Infrastructure manifests live under `infra/` in this repository.
- Pin production-intended image versions or digests where appropriate.
- Avoid unmanaged `latest` tags for critical services.
- Changes to material infrastructure dependencies should be reviewed and documented before deployment.

## Secrets

- Never commit `.env` files with real credentials.
- Keep only `.env.example` / variable contracts in Git.
- Production/laboratory secrets must be injected through Portainer, environment configuration, a secrets manager or another documented secure mechanism.
- Do not expose the Docker socket to application containers unless a specific reviewed requirement exists.

## Consequences

### Positive

- low operational complexity;
- easy visual inspection and manual intervention during the laboratory phase;
- standard Compose manifests remain portable outside Portainer;
- easy separation of experimental stacks;
- no early Kubernetes overhead.

### Negative

- Portainer adds another privileged management surface that must be secured;
- manual changes in Portainer can create configuration drift if not reflected in Git;
- Docker Compose is not intended to solve every later high-scale orchestration requirement.

## Exit criteria

Reconsider this decision only when concrete evidence shows that Compose/Portainer is limiting reliability, scale, deployment safety or isolation. Do not migrate to Kubernetes merely for architectural prestige.
