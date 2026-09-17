# Wandora Operator Consoles V1

These services expose engineering/operator consoles only after Cloudflare Access is proven on the exact hostnames. They are not customer product surfaces and do not replace Wandora Platform Admin.

## Hostnames

- `control.wandora.com.br` -> Paperclip UI through `wandora-control-bridge`
- `runtime.wandora.com.br` -> isolated Mastra Studio diagnostic console

## Security boundary

- Cloudflare Access must intercept both hostnames before Traefik routes are enabled.
- The VPS public origin must remain unreachable directly from the Internet.
- Traefik stays only on `wandora-edge`; it is not attached to `wandora-core`.
- The Paperclip bridge alone joins `wandora-edge` + `wandora-core` and forwards only HTTP to the existing private Paperclip service.
- The Mastra console has no model key, database credential, customer data, Organization Adapter HMAC, Messaging Gateway credential or outbound capability.
- The Mastra workflow is a deterministic operator smoke matching the current supervised proposal shape; it is not the live Core process.

## Non-effects

Deploying these consoles does not apply migrations 010/011, install/configure the Organization Adapter plugin, create HMAC custody, enable Organization Adapter, enable Human Send, enable Gateway outbound or create a customer hiring route.

## Validation

Before promotion verify Cloudflare Access redirects unauthenticated requests for both hosts, direct-origin 443 remains blocked, Compose renders without secrets, the bridge reaches Paperclip, Mastra Studio answers locally, and the live effect switches remain OFF after deployment.
