# Wandora Web Preview — Customer Experience Deployment V1

Status: **public preview validated; product-owner review remains the gate before durable Ana promotion**

## Purpose

Put the already accepted customer Product Shell and first-day journey in a real browser-accessible environment before investing further in backend implementation. This preview is for product/UX evaluation, not production customer traffic.

## Public surface

- customer preview: `https://app.wandora.com.br`
- first-day journey: `https://app.wandora.com.br/start`
- normal shell routes: `/`, `/team`, `/work`, `/conversations`, `/approvals`, `/company`
- health probe: `/healthz`

## Deployment shape

The preview runs as a versioned `wandora-web` Docker container on the private `wandora-edge` network. It publishes no direct application host port. Traefik routes the public hostname to the container and Cloudflare proxies `app.wandora.com.br`.

The edge adds HSTS, frame denial, nosniff, strict referrer policy and `X-Robots-Tag: noindex, nofollow, noarchive` while this remains a preview.

## Runtime evidence

Validated on 2026-09-14:

- `wandora-web` reached Docker health `healthy`;
- container is attached to `wandora-edge` with no host port binding;
- private `wandora-web:8080/healthz` returned `ok`;
- local Traefik TLS routing returned HTTP 200;
- Cloudflare DNS record for `app.wandora.com.br` is proxied;
- public DNS resolves to Cloudflare edge addresses rather than the VPS origin address;
- public `/`, `/start`, `/team`, `/work`, `/conversations`, `/approvals`, `/company` and `/healthz` all returned HTTP 200.

## Browser evidence

A Playwright Chromium smoke was run against the **public hostname**, not a local test server, at both 390×844 and 1440×1100.

It proved:

- every current customer route loads;
- no browser-console errors were observed;
- no horizontal document overflow was observed;
- `/start` does not leak the normal application shell;
- the complete six-step first-day journey can be completed;
- `Começar trabalho supervisionado` transitions into `Início`;
- desktop and mobile screenshots were visually reviewed after the public deployment.

## Safety/product boundary

The preview still uses mock/product-contract data. `Conectar WhatsApp` and `Começar trabalho supervisionado` model the intended experience but do not provision a real customer connection or activate autonomous employee work.

Publishing the web preview does **not** mean production auth, Core persistence, customer billing or Ana autonomous sending is complete.

## Product gate

Before the durable Ana vertical slice is promoted, the product owner should navigate the public preview as if they had just paid for Wandora and identify any confusing language, missing information, unnecessary setup or visual friction.

UX corrections found through that direct use should be resolved before they become expensive backend assumptions.

## Next technical slice after product-owner review

**ANA VERTICAL SLICE V1 — durable Core state + supervised real-path wiring**

Promote only the accepted Ana contract into durable Wandora Core state and services, preserving tenant isolation, idempotency, audit and human approval boundaries while wiring the existing Web, Supabase, Agent Runtime and Messaging Gateway boundaries.
