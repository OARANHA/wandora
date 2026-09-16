# Paperclip -> Wandora/Mastra Adapter V1 Spike

Purpose: prove the narrow execution bridge accepted by ADR 0037 without installing anything into live Paperclip or creating customer/business data.

## What this proves

The spike loads a Wandora external adapter through the exact Paperclip external-adapter loader shipped in the pinned live image. The adapter declares `supportsLocalAgentJwt=true` and proves a fail-closed request contract to a private Wandora execution bridge.

Trust is deliberately split:

- a dedicated Wandora HMAC authenticates Paperclip-adapter -> Wandora;
- Paperclip's run-scoped agent JWT is forwarded opaquely for scoped callbacks to Paperclip;
- Wandora does not receive Paperclip's JWT master signing secret;
- the Paperclip run token is not placed in the JSON body or result state;
- Paperclip runtime context is reduced to an explicit task allow-list before crossing the bridge.

## Run

```bash
./verify-live-image.sh
```

Default image:

```text
wandora/paperclip:v2026.831.1
```

Override only for an explicit compatibility test:

```bash
PAPERCLIP_IMAGE=<reviewed-image> ./verify-live-image.sh
```

The verifier runs with `--network none`, a read-only root filesystem and only this spike directory mounted read-only. It uses synthetic secrets and IDs only.

## Required green assertions

- Paperclip external loader accepts the adapter;
- adapter declares `supportsLocalAgentJwt=true`;
- missing Paperclip run token fails closed;
- missing Wandora bridge HMAC secret fails closed;
- signature covers exact timestamp + exact JSON body;
- timestamp is bounded in the mock verifier;
- run token is carried only in its dedicated secret header;
- company/agent/run plus the reviewed task projection arrive intact;
- unreviewed provider/MCP-like context does not cross the bridge;
- successful Wandora response maps to Paperclip's `AdapterExecutionResult`.

## Non-goals

This spike does not install an adapter into live Paperclip, create companies/agents/tasks, contact Mastra, call live Wandora APIs, use production secrets, or approve customer hiring. The next separate gate is a disposable Paperclip control-plane contract proof using non-customer data only.
