# Paperclip VendaERP Read-Only MCP V1

Provider-side, stateless MCP adapter for the eight ADR 0202 VendaERP read operations.

It is designed for Paperclip `local_stdio`, so Paperclip remains authority for connection identity, installs/grants, secret custody, policy, audit and tool invocation. The adapter owns no durable state and accepts no URL or HTTP method from callers.

Production is not activated by this package. The future Paperclip connection must resolve exactly these grant secret refs into the approved template environment:

- `env.VENDAERP_AUTHORIZATION_TOKEN`
- `env.VENDAERP_USER`
- `env.VENDAERP_APP`

The runtime origin is fixed to `https://whitelabel.vendaerp.com.br`, matching the official VendaERP API explorer. Every provider request is GET-only, uses a bounded timeout, follows no redirects, performs no automatic retry, and projects provider responses into bounded provider-neutral DTOs.

Run `npm test` or `npm run verify`. Tests use an injected fetch function and never call VendaERP.