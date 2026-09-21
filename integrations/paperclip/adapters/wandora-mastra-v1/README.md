# Wandora Mastra External Adapter V1

Canonical production-installable Paperclip external adapter source for the `wandora_mastra` execution type.

This package is an **artifact only**. Merging it does not install it into live Paperclip, mount a bridge secret, enable the private Core bridge, resume an employee, or enable Human Send/Gateway outbound.

## Trust boundary

- Paperclip supplies a run-scoped local agent JWT to the adapter.
- The adapter requires the JWT and forwards it only in the dedicated `x-wandora-paperclip-run-token` header.
- A separate file-backed Wandora HMAC authenticates Paperclip adapter -> Wandora Core.
- The request signs `timestamp + "." + exact JSON body`.
- The JSON body contains only Paperclip agent/company/run IDs and the reviewed task allow-list.
- Raw runtime context, provider internals, MCP configuration and the run token never enter the JSON body.
- The bridge URL is operator-owned and must be exactly the private canonical Core route.

Required runtime environment when this adapter is installed later:

```text
WANDORA_PAPERCLIP_EXECUTION_BRIDGE_URL=http://wandora-core:8788/internal/v1/paperclip/execution
WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE=/run/secrets/wandora/paperclip-execution-bridge.hmac
WANDORA_PAPERCLIP_EXECUTION_BRIDGE_TIMEOUT_MS=60000
```

The secret file must contain at least 32 characters and is never logged or returned.

The bridge timeout is bounded to 10-120 seconds and the production contract pins it to 60 seconds. Model-backed Core execution must terminate earlier than this bridge deadline so Paperclip does not abandon a request while Core is still waiting on a model provider.
