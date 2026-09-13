# Wandora Security Baseline

Wandora will eventually execute actions on behalf of businesses. Security boundaries must exist before convenience.

## Repository

- Never commit secrets, production tokens, private keys, customer exports or real credentials.
- Use example environment files with placeholders only.
- Treat third-party API keys as revocable secrets with least privilege.

## VPS

- Use a dedicated non-root operational account where practical.
- Keep SSH key-based access; do not rely on password-only administration.
- Restrict inbound ports to those actually required by the chosen ingress model.
- Keep Docker daemon and Docker socket private.
- Back up canonical data outside the VPS once persistent data exists.

## Cloudflare / public edge

- Cloudflare is the canonical DNS/public edge for Wandora.
- Prefer proxied records for public HTTP/HTTPS application traffic.
- Prefer end-to-end TLS with strict certificate validation at the origin.
- Prefer Cloudflare Tunnel/Access for privileged administrative surfaces such as Portainer where practical.
- Do not treat an obscure subdomain as an authentication mechanism.
- Do not expose databases, Redis, Docker APIs, Paperclip internals, Mastra internals or other private services through public DNS.
- Cloudflare API tokens used for automation must be narrowly scoped, revocable and kept out of Git.

## Portainer

- Portainer is a privileged operator surface.
- Do not expose its native management port as an ordinary public endpoint.
- Prefer a Cloudflare-protected administrative path (Tunnel/Access) when the VPS is configured.
- Use strong authentication and TLS.
- Avoid storing undocumented manual-only configuration in Portainer; version stack definitions in Git.
- Portainer API tokens, if later used for automation, must be narrowly scoped and revocable.

## Containers

- Prefer non-root containers where upstream images support it.
- Pin critical image versions.
- Avoid `privileged: true` unless explicitly justified and reviewed.
- Avoid mounting `/var/run/docker.sock` into application containers.
- Do not publish internal database/cache ports to the Internet.

## Agents and tools

- LLMs must never receive raw infrastructure credentials when a mediated tool can perform the action instead.
- Sensitive or irreversible business actions require explicit policy and, by default, human approval.
- Maintain tenant identity through every tool invocation and business-data access.
- Never trust agent memory as canonical authorization state.

## Remote automation

When remote VPS automation is introduced, prefer revocable, audited access mechanisms over sharing a root password. Exact design will be recorded in a separate ADR after the VPS is provisioned.
