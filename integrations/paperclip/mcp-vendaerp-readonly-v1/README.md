# Paperclip VendaERP Read-Only MCP V1

Provider-side, stateless MCP adapter for the eight ADR 0202 VendaERP read operations.

It is designed for Paperclip `local_stdio`, so Paperclip remains authority for connection identity, installs/grants, secret custody, policy, audit and tool invocation. The adapter owns no durable state and accepts no URL or HTTP method from callers.

Production is not activated by this package. The future Paperclip connection must resolve exactly these grant secret refs into the approved template environment:

- `env.VENDAERP_AUTHORIZATION_TOKEN`
- `env.VENDAERP_USER`
- `env.VENDAERP_APP`

The runtime origin is derived only from the tenant subdomain fixed by the approved Paperclip command template: `https://<tenant>.vendaerp.com.br`. The checked-in 28PRO candidate template uses `--tenant voepro`, producing `https://voepro.vendaerp.com.br`. The tenant is not a tool argument and arbitrary URLs are rejected. Every provider request is GET-only, uses a bounded timeout, follows no redirects, performs no automatic retry, and projects provider responses into bounded provider-neutral DTOs.

Run `npm test` or `npm run verify`. Tests use an injected fetch function and never call VendaERP.

## Safe provider-error observability

Tool failures keep their normalized top-level code. For product parsing, `invalid-provider-response` may additionally carry one allowlisted structured `reason`: `product-list-shape` or `product-name-missing`.

The text MCP error remains `{"error":"invalid-provider-response"}` for compatibility. The optional `reason` exists only in `structuredContent.error` and the safe stderr event. Unknown reason strings are discarded. Never log or persist raw provider responses, URLs, request arguments, credentials, product fields, or business payloads for this diagnostic.
