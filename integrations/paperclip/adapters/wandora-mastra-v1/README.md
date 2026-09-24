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


## Customer-work terminal disposition

For a reviewed Wandora customer-work request carrying the private `wandora-work-v1` correlation marker, Core success means the supervised result has already been committed to the Wandora work receipt.

Only after that success, the adapter uses the same Paperclip run-scoped JWT and Paperclip's server-owned resolved listener (`PAPERCLIP_LISTEN_HOST` / `PAPERCLIP_LISTEN_PORT`) to update the exact executing Paperclip issue to `done`. Wildcard binds follow Paperclip's own `buildPaperclipEnv` host rule and normalize to `localhost` while the port remains server-owned, so this same-process mutation never traverses the public URL, Traefik, or an identity-only proxy. This is Paperclip lifecycle state, not a Wandora task-state clone.

The completion write is bounded and fail-closed:

- one exact issue only;
- no customer/provider identifiers are selected by the browser;
- an ambiguous local update is read back before any repeat;
- a repeat update is permitted only when readback proves the issue is still `todo` or `in_progress`;
- no model/provider request is repeated by issue-finalization recovery;
- non-customer work preserves the legacy adapter lifecycle.

Normalized Wandora execution usage is returned as Paperclip adapter `usage` with `usageBasis=per_run`. The logical model remains `wandora-supervised-v1`; concrete provider/model identity stays implementation telemetry.

## Customer-work read-tool failure disposition

`wandora_mastra@0.5.0` adds one narrow failure-side lifecycle mapping without changing Paperclip lifecycle authority. When, and only when, all of the following are true:

- the task carries the canonical private `wandora-work-v1` marker;
- Core returns HTTP `422`; and
- the bounded response is exactly `{"error":"read-tool-failed"}`;

the same run-scoped Paperclip identity moves the exact issue to native `blocked` with an `unblockDescriptor` owned by the executing Paperclip agent. The unblock action requires the read-tool problem to be resolved and a **fresh explicitly authorized Wandora customer work** before any later read.

The adapter then still fails the current run. It does **not** turn the provider/tool failure into success and it does not invent a Wandora retry or lifecycle engine. Paperclip remains the issue/run/recovery authority.

The blocking write is bounded and fail-closed:

- one exact customer-work issue only;
- unrelated `422` responses preserve legacy behavior;
- non-customer work preserves legacy behavior;
- an ambiguous block write is read back before any repeat mutation;
- a pre-existing native `blocked` status is accepted without overwrite/retry;
- if native blocking cannot be persisted, the adapter still fails and Wandora's durable `execution_uncertain` gate prevents a successor run from reaching model/tool/provider execution for that work.
