# ADR 0217 — Paperclip Read Tool Run-Scoped Idempotency V1

Status: **CANDIDATE / CODE ONLY FOR FIX / PRODUCTION FINDING RECORDED**
Date: 2026-09-23

## Context

ADR 0216 activated the 28PRO VendaERP connection as a Paperclip-owned, connection-backed, MCP `risk=read` capability.

To exercise the ADR 0211 path end to end, production Core first had to be promoted from the older `0a7f3683...` image to the already-qualified Core candidate whose `apps/core/` and `infra/stacks/core/` blobs are byte-identical to canonical `main@ff123b508080d1700610488d590e5916f6585aea`.

The promotion preflight proved that the full 12-file production Compose render changes exactly one field:

```text
/services/core/image
```

No migration, flag, secret mount, network, database configuration or product state changed.

The promoted Core is:

```text
image = wandora/core:organization-adapter-candidate-fa64d98c5b87
revision = fa64d98c5b87e3fcd78ec9c0d0eb8d2d40d3d64d
health = healthy
restart count = 0
runtime = mastra-supervised-model
```

## First bounded E2E proof

A temporary Paperclip-only issue was created without a `wandora-work-v1` marker, so the adapter projected `workId=null`.

The native path executed:

```text
Paperclip issue/wakeup
-> native Paperclip run JWT
-> Wandora private execution bridge
-> Paperclip Tool Gateway session
-> policy-filtered VendaERP read tool
-> ephemeral supervised Mastra Agent
-> Paperclip Tool Gateway call
-> local_stdio MCP adapter
-> VendaERP GET-only probe
```

The run succeeded and returned that the read-only VendaERP connection was connected.

However, the model invoked the same `vendaerp_probe {}` call five times in one run. This corresponds to the supervised Mastra runtime's `maxSteps: 5`.

All five invocations were independently authorized `risk=read` GET-only calls. They were not automatic retries by the VendaERP adapter, but repeating provider reads is unnecessary and should not be the steady-state behavior.

The temporary proof issue created for this run was deleted after reconciliation.

Post-run Wandora state remained:

```text
digital employee work operations = 0
outbound attempts = 0
```

A separate pre-existing Paperclip issue `PRO-1`, created before this proof, was observed and intentionally left untouched because it was not created by this run.

## Capability Authority / Reuse Gate

Paperclip v2026.916.0 already provides Tool Gateway call idempotency:

```text
POST /api/tool-gateway/tools/call
body.idempotencyKey
```

Paperclip persists and resolves that key within its own Tool Gateway invocation authority. Repeated calls with the same key reuse the existing invocation instead of executing the MCP provider again.

Therefore Wandora must **not** add:

- a durable read-result cache;
- a tool-invocation table;
- a runtime-memory subsystem;
- provider-side retry/dedup state;
- a parallel tool execution authority.

## Decision

The Wandora ADR 0211 bridge will provide a deterministic, opaque idempotency key for each read call.

The key is:

- scoped to the current Paperclip run;
- scoped to the exact admitted catalog entry/tool;
- derived from canonicalized JSON parameters;
- SHA-256 opaque;
- free of provider credentials and raw tool arguments;
- never persisted by Wandora.

Format:

```text
wandora-read-v1:<sha256>
```

Paperclip remains the sole durable idempotency/execution authority.

Different runs receive different keys even for the same tool/arguments.
Different tools or parameters receive different keys in the same run.
Repeated identical calls in the same run receive the same key.

## Security and replacement boundary

The change does not alter:

- run JWT custody;
- Tool Gateway token custody;
- provider secret custody;
- ToolConnection/grant/install/profile ownership;
- catalog admission;
- read-only risk filtering;
- Mastra model inputs;
- VendaERP adapter implementation;
- ADR 0208 generic REST NO-GO.

No credential, run JWT, gateway token, raw argument or provider response is embedded in the idempotency key.

## Second adversarial review

Rejected:

- adding an in-memory or durable result cache to Wandora;
- reducing Paperclip to a passive transport;
- special-casing VendaERP in the generic bridge;
- hiding repeated calls only in telemetry while still hitting the provider;
- changing `maxSteps` globally merely to suppress one repeated tool pattern.

Accepted:

- use the existing Paperclip `idempotencyKey` input;
- derive only an opaque run-scoped identity for the requested read operation;
- let Paperclip own invocation reuse and audit.

## Validation requirement

Before promotion, CI must prove:

1. the bridge still exposes only connection-backed MCP `risk=read` tools;
2. identical tool + arguments within one run generate the same opaque idempotency key;
3. the key does not expose the run UUID or raw arguments;
4. existing fail-closed Tool Gateway behavior remains unchanged.

After merge, a fresh Core candidate must be promoted through the same image-only Compose gate.

Then one new Paperclip-only proof run may be created. The expected provider behavior is:

```text
one actual vendaerp_probe execution
+
zero or more Paperclip idempotent replays
```

The proof is GREEN only if Wandora work/outbound remain 0/0 and no write/destructive tool is invoked.
