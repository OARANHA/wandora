# ADR 0054 — Paperclip Protected Operator Public URL

- Status: **DRAFT — evidence proven; Git change under review; live promotion pending**
- Date: 2026-09-17
- Scope: align Paperclip browser security with the protected `control.wandora.com.br` operator origin without widening provider exposure or activating Organization Adapter effects

## REAL NOW

After the operator-console slice:

```text
control.wandora.com.br
  -> Cloudflare Access
  -> Traefik TLS
  -> wandora-control-bridge
  -> private wandora-paperclip:3100
```

Paperclip remained:

```text
deployment mode     = authenticated
deployment exposure = private
host binding        = 127.0.0.1:3100
network             = wandora-core
PAPERCLIP_PUBLIC_URL= http://localhost:3100
bootstrapStatus     = bootstrap_pending
```

The protected browser UI loaded successfully, but account creation from
`https://control.wandora.com.br` failed with `Invalid origin`.

## PROVEN EVIDENCE

The pinned Paperclip source proves two independent browser-security boundaries:

1. `board-mutation-guard.ts` accepts browser mutations only when Origin/Referer matches the request host or explicitly configured `PAPERCLIP_PUBLIC_URL`.
2. Better Auth derives trusted origins and secure-cookie behavior from the configured public/auth URL and allowed hostnames.

The control bridge intentionally preserves `Host: localhost:3100` and clears the external forwarded host, so the current localhost public URL cannot authorize the real browser origin.

The private hostname guard separately and unconditionally accepts loopback hostnames, including `localhost`. Therefore changing `PAPERCLIP_PUBLIC_URL` to the operator HTTPS hostname does not require widening the internal Host allow-list.

## GAP

The browser-visible operator origin and Paperclip's declared public/auth origin disagree.

## DECISION

Set exactly:

```text
PAPERCLIP_PUBLIC_URL=https://control.wandora.com.br
```

Keep all other boundaries unchanged:

```text
Paperclip network        = wandora-core only
host port                = 127.0.0.1:3100 only
control bridge upstream  = Host: localhost:3100
Cloudflare Access        = required
Cloudflare SSL           = Full (strict)
Organization Adapter     = OFF
migrations 010/011       = absent
production HMAC          = absent
Human Send               = OFF
Gateway outbound         = OFF
```

## SECOND ADVERSARIAL REVIEW

Rejected:

- rewriting the browser `Origin` header in Nginx;
- trusting arbitrary `X-Forwarded-Host`;
- disabling the Paperclip browser mutation guard;
- weakening Cloudflare from Full (strict);
- exposing Paperclip directly on `wandora-edge`;
- adding a broad `PAPERCLIP_ALLOWED_HOSTNAMES` list;
- bundling instance-admin claim, organization creation, plugin installation or Organization Adapter activation into this origin fix.

The source proves loopback remains accepted for the bridge hop, so the one-variable change is sufficient and narrower than proxy-header manipulation.

## EXECUTION GATE

Before live promotion:

1. Compose must render successfully;
2. no forbidden Organization Adapter/outbound wiring may appear;
3. PR checks must be green;
4. live Paperclip health and current effect switches must be rechecked.

After promotion:

1. verify Paperclip remains private/healthy;
2. verify `PAPERCLIP_PUBLIC_URL=https://control.wandora.com.br`;
3. verify Cloudflare Access still intercepts externally;
4. verify account/sign-in browser mutation no longer returns `Invalid origin`;
5. stop before creating the first Paperclip organization until its provider-company role in Preflight V2 is reviewed.
