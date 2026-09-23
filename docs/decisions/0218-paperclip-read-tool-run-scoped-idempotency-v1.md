# ADR 0218 — Paperclip Read Tool Run-Scoped Idempotency V1

Status: **CANDIDATE / CODE ONLY FOR FIX / PRODUCTION FINDING RECORDED**
Date: 2026-09-23

## Context

ADR 0217 qualified the Core-only bridge promotion required for the bounded 28PRO VendaERP end-to-end proof.

Production Core was subsequently promoted to:

```text
wandora/core:organization-adapter-candidate-fa64d98c5b87
revision = fa64d98c5b87e3fcd78ec9c0d0eb8d2d40d3d64d
health = healthy
restart count = 0
```

A temporary Paperclip-only issue with no `wandora-work-v1` marker then exercised the native path:

```text
Paperclip issue/wakeup
-> native Paperclip run JWT
-> Wandora private execution bridge
-> Paperclip Tool Gateway session
-> supervised Mastra
-> Paperclip Tool Gateway call
-> local_stdio VendaERP MCP
-> GET-only vendaerp_probe
```

The run succeeded and reported the VendaERP read-only connection as connected.

However, the model invoked the same `vendaerp_probe {}` five times, matching the supervised runtime's `maxSteps: 5`. These were five independently authorized read calls, not adapter retries.

The temporary proof issue was deleted. Wandora work operations and outbound attempts remained 0/0.

A separate pre-existing Paperclip issue `PRO-1` was observed and intentionally left untouched.

## Capability Authority / Reuse Gate

Paperclip v2026.916.0 already owns Tool Gateway invocation idempotency through:

```text
POST /api/tool-gateway/tools/call
body.idempotencyKey
```

When the same company-scoped idempotency key already exists, Paperclip reuses the existing invocation instead of executing the provider again.

Therefore Wandora must not add a durable or in-memory read-result cache, tool-invocation table, runtime-memory subsystem, or competing execution authority.

## Decision

The ADR 0211 read-tool bridge will supply a deterministic opaque idempotency key for each read operation.

The key is derived from:

- Paperclip run ID;
- exact admitted catalog entry;
- tool name;
- canonicalized JSON parameters.

Only the SHA-256 digest is sent:

```text
wandora-read-v1:<sha256>
```

Properties:

- same run + tool + parameters => same key;
- different run => different key;
- different catalog/tool/parameters => different key;
- no raw argument, run UUID, token or credential appears in the key;
- Wandora persists no idempotency state;
- Paperclip remains the durable replay/execution authority.

## Second adversarial review

Rejected:

- Wandora-side result caching;
- a new invocation table;
- VendaERP-specific logic in the generic bridge;
- reducing `maxSteps` globally just to hide this behavior;
- allowing repeated provider hits while merely suppressing telemetry.

Accepted:

- reuse Paperclip's existing `idempotencyKey`;
- keep Wandora's role limited to deriving an opaque run-scoped operation identity;
- let Paperclip own replay, audit and provider execution.

ADR 0168 remains preserved.

ADR 0208 remains preserved: generic REST execution is still NO-GO.

## Validation

Local validation on the candidate branch:

- Core typecheck: GREEN;
- Core build: GREEN;
- `paperclip-tool-gateway-read-bridge.test.ts`: 3/3 GREEN;
- repeated identical read calls produce the same opaque idempotency key.

The full local Core integration suite cannot run correctly against the host environment because the direct DB path lacks its CI tenant identifier and fails with `ENOIDENTIFIER`. GitHub-hosted Core CI remains the authoritative full verifier.

## Promotion gate

After CI/merge, a fresh Core candidate must be promoted through the same ADR 0217 image-only Compose gate.

A new Paperclip-only proof is then permitted.

GREEN requires:

```text
one actual vendaerp_probe provider execution
+
zero or more Paperclip idempotent replays
+
Wandora work = 0
+
Wandora outbound = 0
+
no write/destructive tool
```
