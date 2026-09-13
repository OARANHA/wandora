# ADR 0002 — Cloudflare as Wandora edge and DNS layer

## Status

Accepted for the laboratory architecture.

## Context

Wandora will run on a VPS with Docker and Portainer. Public services require stable domain/subdomain routing, TLS, and a security boundary that is independent from container implementation details. Administrative surfaces should not be exposed as ordinary public application endpoints.

## Decision

Use Cloudflare as the canonical external edge for Wandora.

Cloudflare will provide, as applicable:

- authoritative DNS for the Wandora domain;
- public hostname and subdomain resolution;
- proxying for public HTTP/HTTPS application traffic;
- edge TLS/security controls;
- Cloudflare Tunnel and Access for privileged administrative surfaces where practical.

GitHub remains the source of truth for deployable infrastructure configuration. Portainer remains the Docker/Compose operational console. Cloudflare configuration is infrastructure configuration, not application business logic.

## Initial hostname convention

Provisional names:

- `wandora.com.br` — public site;
- `app.wandora.com.br` — customer application;
- `api.wandora.com.br` — Wandora Core API when justified;
- `hooks.wandora.com.br` — externally required webhooks when useful;
- administrative endpoints — separate, non-customer surfaces protected with stronger controls.

Do not encode third-party implementation choices such as Paperclip, Mastra, Evolution or Portainer into customer-facing DNS contracts unless there is an explicit operational reason.

## Security position

- Prefer Cloudflare-proxied DNS records for public web traffic.
- Prefer end-to-end TLS with strict origin certificate validation for public origin traffic.
- Prefer Cloudflare Tunnel/Access for Portainer and similar administrative surfaces rather than exposing their native ports directly to the Internet.
- Internal databases, caches, organization engines, agent runtimes and Docker APIs remain private.
- Never expose the Docker socket or database ports through DNS/public ingress.

## Consequences

### Positive

- public naming is decoupled from Docker container topology;
- origin IP and admin services can receive stronger protection;
- subdomains can be added without redesigning application boundaries;
- moving workloads between containers or hosts does not require customer-facing API contract changes.

### Trade-offs

- Cloudflare becomes an external operational dependency;
- DNS, tunnel and access configuration must be documented and reproducible;
- Cloudflare-specific features should not leak into Wandora domain/business logic.

## Revisit when

Re-evaluate if Wandora becomes multi-region, requires active-active ingress, introduces a second infrastructure provider, or develops regulatory/data-residency requirements incompatible with this topology.
