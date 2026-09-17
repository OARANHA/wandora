# ADR 0051 — Operator Consoles Production Preflight V1

- Status: **DRAFT — Cloudflare Access proven; versioned origin composition pending final CI/live validation**
- Date: 2026-09-17
- Scope: prepare `control.wandora.com.br` for Paperclip and `runtime.wandora.com.br` for a separate Mastra operator Studio without weakening provider/runtime boundaries

## REAL NOW

Canonical Git at slice start:

```text
main = 5b0ddff86d9fafc765d2599d7434b2d5411d5da7
PR #96 = merged
```

Live provider/runtime observations before any console origin change:

```text
wandora-paperclip = wandora/paperclip:v2026.831.1, healthy
Paperclip binding = 127.0.0.1:3100 -> 3100/tcp
Paperclip network = wandora-core only
Paperclip deployment mode = authenticated/private
wandora-core = wandora/core:team-read-b31db507, healthy/private
standalone Mastra Studio = ABSENT
control/runtime Traefik routes = ABSENT
```

The two DNS records already existed and were Cloudflare-proxied. No DNS mutation was needed.

## PROVEN EVIDENCE

Cloudflare Access is now proven on the exact two hostnames before any origin route exists. Unauthenticated external requests return HTTP `302` to the Cloudflare Access login domain and advertise `www-authenticate: Cloudflare-Access` for both:

```text
control.wandora.com.br = Access intercepted
runtime.wandora.com.br = Access intercepted
policy = Wandora Operator Only
allow = exact authorized operator email
bypass = none observed/configured
```

A second adversarial check tested direct origin access from an external machine using the VPS public IP with the target Host/SNI. Direct TCP/443 access timed out for `control`, `runtime`, `app` and `status`, so the current public origin cannot be bypassed simply by resolving the hostname directly to the VPS.

A disposable Mastra Studio proof was run with Node `22.23.2`, Mastra CLI `1.29.0`, no model/provider secret, telemetry disabled and no production data/credential. Studio and API returned HTTP 200 on container-local port 4111 and the disposable container was removed afterwards.

The historical Mastra spike is not equivalent to current Core execution. Current Core embeds `ana-deterministic-supervised-proposal-v1`; therefore the operator Studio candidate mirrors only that deterministic diagnostic workflow and is explicitly not the live Core process.

Paperclip remains configured with `PAPERCLIP_PUBLIC_URL=http://localhost:3100`. Tests showed requests with an external forwarded host are rejected, while the current localhost host contract answers. The selected bridge therefore preserves the upstream `Host: localhost:3100`, clears `X-Forwarded-Host`, and rewrites only upstream localhost redirects back to `https://control.wandora.com.br/`. Whether all browser auth/navigation paths work correctly must be proven after protected origin deployment before this ADR is accepted.

## GAPS

1. The versioned operator-console composition must pass its dedicated CI before production promotion.
2. The protected Paperclip bridge must be browser/runtime validated without changing Paperclip's current public/auth URL unless evidence requires a separately reviewed change.
3. The isolated Mastra Studio must be validated live as diagnostic-only, with no model key, Core DB credential, customer data, HMAC or outbound capability.
4. `portainer.wandora.com.br` remains a separate Access-hardening gap and is deliberately outside this slice.

## DECISION

Use two operator-only paths behind the already-proven Cloudflare Access gate:

```text
control.wandora.com.br
  -> Cloudflare Access
  -> Traefik on wandora-edge
  -> wandora-control-bridge on wandora-edge + wandora-core
  -> private wandora-paperclip:3100

runtime.wandora.com.br
  -> Cloudflare Access
  -> Traefik on wandora-edge
  -> isolated wandora-runtime-console on wandora-edge
```

Traefik remains off `wandora-core`. Paperclip itself remains off `wandora-edge`. Core remains off `wandora-edge`.

The Mastra console contains only the deterministic supervised proposal smoke contract and receives no production model/provider key, database credential, Organization Adapter HMAC, Messaging Gateway credential or customer-facing authority.

## SECOND ADVERSARIAL REVIEW

Rejected:

- adding Paperclip directly to `wandora-edge`;
- adding Core directly to `wandora-edge`;
- publishing routes before proving Cloudflare Access;
- assuming Cloudflare Access is sufficient without testing direct-origin bypass;
- exposing the historical Mastra spike unchanged as the production runtime;
- adding model/provider secrets or customer data to Studio merely to populate the UI;
- changing Paperclip `PAPERCLIP_PUBLIC_URL` speculatively before the narrower bridge is validated;
- widening this slice to Portainer hardening.

The challenge that survived review is browser behavior behind Paperclip's existing localhost auth/public contract. That remains an explicit live-validation gate rather than being hidden by a speculative provider reconfiguration.

## EXECUTION / VALIDATION SO FAR

Completed:

```text
control DNS/proxy existence = proven
runtime DNS/proxy existence = proven
Cloudflare Access interception = proven on both hosts
direct-origin 443 bypass = blocked from external probe
Mastra isolated Studio startup = proven disposable, then removed
versioned bridge/Studio/Traefik composition = present in PR #97
Paperclip public URL = unchanged
Core edge attachment = absent
Paperclip edge attachment = absent
Organization Adapter = OFF
migrations 010/011 = not applied
production HMAC = not created
Human Send = OFF
Gateway outbound = OFF
```

Not yet completed:

```text
dedicated Operator Consoles CI = final green pending
production operator containers = not started
production control/runtime Traefik routers = not installed
post-deploy Access + browser validation = pending
```

## Stop condition / next action

Do not promote the origin composition until the dedicated CI is green and the reviewed PR is merged. After promotion, validate internal provider reachability plus external Access interception again. Any requirement to change Paperclip authentication/public URL is a new evidence-driven decision, not an automatic part of deployment.
