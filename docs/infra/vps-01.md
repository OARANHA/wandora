# VPS-01 — Wandora Laboratory

## Provisioned capacity

- Region: EU
- OS baseline: Ubuntu 24.04 LTS
- CPU: 6 vCPU
- RAM: 12 GB
- Disk: 200 GB SSD
- IPv4: 13.140.190.149
- IPv6: 2a02:c207:2357:5572::1/64

## Purpose

This server is the initial Wandora laboratory and early product host. It is not yet a production-grade multi-region environment.

## Canonical edge model

```text
Internet
  |
  v
Cloudflare
  |
  +--> public Wandora hostnames
  +--> protected operator hostnames through Access/Tunnel
  |
  v
VPS-01
  |
  +--> Docker Engine
  +--> Portainer
  +--> versioned Compose stacks from GitHub
```

## Initial bootstrap policy

1. Start from clean Ubuntu 24.04 LTS.
2. Apply security updates before installing application services.
3. Keep server clock in UTC; application/tenant time zones are handled at product level.
4. Install Docker from Docker's official repository and the Compose plugin.
5. Configure Docker log rotation before running long-lived services.
6. Install Portainer, but do not expose its native port publicly.
7. Until Cloudflare Access/Tunnel is configured, operator access to Portainer should be through an SSH local tunnel only.
8. Public application services should later be exposed through Cloudflare-managed hostnames.
9. PostgreSQL, Redis, Paperclip internals, Mastra internals and Docker daemon/socket remain private.
10. Create off-server backups before any canonical customer data exists.

## Resource strategy

The server has enough capacity for the laboratory phase if model inference remains external. Do not deploy local LLMs to this host during V0.

Likely initial workloads:

- Portainer;
- cloudflared;
- Paperclip spike;
- Mastra/Wandora runtime spike;
- messaging gateway spike;
- Wandora Core/front when implementation starts;
- lightweight caches/auxiliary services where justified.

Avoid adding heavyweight observability, vector databases, workflow engines or duplicated infrastructure until a concrete requirement exists.
