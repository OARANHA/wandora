# ADR 0051 — Operator Consoles Production Preflight V1

- Status: **DRAFT — blocked on Cloudflare Access account-side configuration; not canonical until reviewed/merged**
- Date: 2026-09-17
- Scope: prepare `control.wandora.com.br` for Paperclip and `runtime.wandora.com.br` for a separate Mastra operator Studio without exposing providers before Cloudflare Access is proven

## REAL NOW

Canonical Git at slice start:

```text
main = 5b0ddff86d9fafc765d2599d7434b2d5411d5da7
PR #96 = merged
```

Live provider/runtime observations before any console change:

```text
wandora-paperclip = wandora/paperclip:v2026.831.1, healthy
Paperclip binding = 127.0.0.1:3100 -> 3100/tcp
Paperclip network = wandora-core only
Paperclip deployment mode = authenticated/private
wandora-core = wandora/core:team-read-b31db507, healthy/private
standalone Mastra Studio = ABSENT
control/runtime Traefik routes = ABSENT
```

Both `control.wandora.com.br` and `runtime.wandora.com.br` already resolve through Cloudflare proxy addresses. Unauthenticated HTTPS requests currently return Cloudflare `526`, proving DNS/proxy existence but not a usable origin route.

For comparison, `portainer.wandora.com.br` currently reaches its origin and returns HTTP 200 without an Access interception. Therefore no zone-wide Cloudflare Access policy can be assumed.

## PROVEN EVIDENCE

ADR 0046 already selected provider-neutral operator hostnames and requires protected operator access rather than direct provider exposure.

Paperclip rejects the external `control.wandora.com.br` forwarded host while its current public URL remains `http://localhost:3100`. Pinned Paperclip source derives trusted host/auth behavior from `PAPERCLIP_PUBLIC_URL` / explicit auth public base and allowed hostnames. A correct operator bridge therefore cannot merely rewrite the public hostname to localhost; the public auth/origin contract must be changed deliberately when the protected bridge is activated.

A disposable Mastra Studio proof was run from the already-proven pinned spike using Node `22.23.2`, Mastra CLI `1.29.0`, no network, no provider/model secret, telemetry disabled, read-only root filesystem, dropped capabilities and writable tmpfs only where Mastra dev requires it. The Studio and API both returned HTTP 200 on container-local port 4111. The disposable container was then removed.

The existing spike is **not** equivalent to the current live Core runtime: it exposes the historical `normalizeContact` workflow, while current Core embeds the supervised deterministic Ana workflow. Therefore the old spike must not be exposed as though it were the live runtime console.

## GAPS

1. Cloudflare Access applications for `control.wandora.com.br` and `runtime.wandora.com.br` are not yet proven.
2. Paperclip is still configured for the localhost public/auth URL and has no reviewed dual-network operator bridge.
3. No canonical separate Mastra operator Studio artifact exists that accurately represents its diagnostic purpose without implying it is the live Core process.
4. `runtime.wandora.com.br` must not make Core public or receive Core/database/provider secrets.
5. `portainer.wandora.com.br` appears externally reachable without Cloudflare Access interception; this is a separate security-hardening gap and is not silently modified by this slice.

## DECISION

Use two operator-only bridges behind Cloudflare Access:

```text
control.wandora.com.br
  -> Cloudflare Access
  -> Traefik
  -> small Wandora operator bridge (wandora-edge + wandora-core)
  -> private Paperclip

runtime.wandora.com.br
  -> Cloudflare Access
  -> Traefik
  -> dedicated isolated Mastra operator Studio service
```

Paperclip itself remains off `wandora-edge`. Core remains off `wandora-edge`. The runtime Studio receives no production model key, Core DB credential, Organization Adapter HMAC or customer browser contract merely to provide an engineering console.

`runtime` must be presented as a diagnostic/operator Studio, not as proof that the Studio process is the production agent runtime.

## SECOND ADVERSARIAL REVIEW

Rejected:

- adding Paperclip directly to `wandora-edge`;
- adding Core directly to `wandora-edge`;
- creating Traefik routes before proving Cloudflare Access, because that would turn a DNS-only placeholder into an origin-reachable console;
- using Paperclip's current localhost public URL behind a Host-rewriting proxy, because browser auth/trusted-origin semantics would be misleading or broken;
- exposing the historical Mastra spike unchanged as the live runtime console;
- adding model/provider secrets or customer data to the Studio merely to make the UI look populated;
- widening this slice to repair Portainer without a separate reviewed boundary.

## EXECUTION / VALIDATION SO FAR

Completed without provider exposure:

```text
control DNS/proxy existence = proven
runtime DNS/proxy existence = proven
control origin route = not created
runtime origin route = not created
Paperclip public URL = unchanged
Mastra isolated Studio startup = proven disposable, then removed
Core edge attachment = absent
Paperclip edge attachment = absent
Organization Adapter = OFF
migrations 010/011 = not applied
production HMAC = not created
Human Send = OFF
Gateway outbound = OFF
```

## Stop condition / next action

Do not create either origin route until external unauthenticated requests are first proven to be intercepted by Cloudflare Access for the exact hostname.

Required account-side action is two Self-hosted Cloudflare Access applications, one for each hostname, with an allow policy restricted to the authorized Wandora operator identity and no bypass rule.

After that proof, this draft may proceed to the smallest versioned bridge/Studio composition and final validation.