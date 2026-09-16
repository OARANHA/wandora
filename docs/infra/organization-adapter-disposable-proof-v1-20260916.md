# Organization Adapter Disposable Proof V1 — 2026-09-16

Status: **Laboratory evidence only. No production activation.**

## Purpose

Record the provider facts that justify ADR 0038's minimum private Wandora state without promoting Paperclip internals into customer contracts.

## Environment

- Paperclip image: `wandora/paperclip:v2026.831.1`
- isolated disposable Paperclip instance/volume; live Paperclip data was not reused;
- deployment mode for the functional proof: `local_trusted`, private/localhost-only;
- canonical versioned adapter from `spikes/paperclip-wandora-mastra-adapter-v1/`;
- adapter file hashes were verified against Git before installation.

## Proven functional path

The disposable environment created two distinct Paperclip companies. `Ana Proof` was hired in Company A through `agent-hires` and assigned disposable task `WAN-1`.

The canonical `wandora_mastra_spike` external adapter was installed only in the disposable Paperclip instance and configured to call a private localhost Wandora proof bridge.

Moving `WAN-1` into executable state caused Paperclip to start a real run. The observed bridge evidence was:

```text
signatureOk = true
timestampOk = true
runTokenPresent = true
validBody = true
callbackStatus = 200
callbackOk = true
```

The task subsequently read `status = done`.

This proves the intended trust split for the laboratory direction:

```text
Paperclip run
 -> external wandora_mastra adapter
 -> Wandora directional HMAC
 -> private Wandora bridge/runtime
 -> opaque Paperclip run JWT callback
 -> same Paperclip task updated
```

## Idempotency finding

Repeating the same `agent-hires` request returned HTTP `201` again and produced a different Paperclip agent ID.

Therefore equal Paperclip hire requests are not a sufficient Wandora idempotency contract. A later Wandora hire operation must reserve its own idempotency key and must not blindly replay an ambiguous provider effect.

## Reconciliation finding

Paperclip agent metadata preserved and returned synthetic non-secret markers equivalent to:

```text
wandoraEmployeeId
wandoraHireKey
```

This supports conservative reconciliation after an ambiguous response: first search the mapped Paperclip company for the Wandora markers; reconcile exactly one match; fail closed on multiple matches; retry only under a separately reviewed zero-match policy.

## Authorization evidence boundary

The automation environment blocked creating/manipulating an additional Paperclip API credential for a literal Company A credential -> Company B live probe.

No claim is made that this literal disposable credential probe ran. Cross-company denial remains supported by the audited installed Paperclip authorization code/tests and is retained as an explicit activation gate in ADR 0038.

## Production impact

None.

- no adapter installed into live Paperclip;
- no live Paperclip company/agent/task created by this proof;
- no Wandora production database migration applied;
- no Core/Web/Gateway image changed;
- no outbound effect switch enabled;
- no customer hire action enabled.
