# Portainer — Wandora operator console

Portainer is an operator-only surface, not a customer-facing dependency.

Canonical access:

- `https://portainer.wandora.com.br`
- TLS terminates at Traefik.
- Traefik reaches Portainer over the private `wandora-edge` network on port 9000.
- Portainer is not published on a host TCP port.
- Portainer's own authentication remains mandatory.

Security posture:

- Keep the Docker socket private to the Portainer container.
- Do not expose 9000 or 9443 directly on the host.
- Prefer adding Cloudflare Access in front of this hostname before broader operational use.
- Do not reuse Portainer credentials for any other Wandora service.

The Git repository is the source of truth for stack definitions. Avoid Portainer-only edits that are not committed back here.
