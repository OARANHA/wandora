# ADR 0225 — ADR 0223 Core + Paperclip Adapter Convergence Execution V1

Status: **GREEN / PRODUCTION CONVERGENCE COMPLETE / NO PROVIDER RETRY**
Date: 2026-09-23

## Result

The ADR 0223 convergence is complete in production.

Canonical entry:

```text
main = af987155e235dc72ab1dbf9e143709dd054e9491
PR #292 = merged
ADR 0224 = canonical
```

Final runtime:

```text
Core
  image    = wandora/core:organization-adapter-candidate-da4289034575
  revision = da42890345753ebabf579947f568acd74145089b
  health   = healthy
  restarts = 0

Paperclip
  image    = wandora/paperclip:v2026.916.0
  health   = healthy
  restarts = 0

wandora_mastra
  version  = 0.4.0
  loaded   = true
  disabled = false
  package  = /paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/0e53cda6e3b76492e89d50727befccfbab3d246a79155e15dd9929137d97fbb3/package

VendaERP MCP
  server.mjs sha256 = 067e7f98912f8bfb7bd19f6d098d19dcbb443c451819d85f17e317a6fe774640

Ana
  status      = idle
  adapterType = wandora_mastra
  errorReason = null

Paperclip live runs = 0
Task Drain = off / quiescent
Wandora work operations = 0
Wandora outbound attempts = 0
```

Official `wandora_mastra` test-environment returned HTTP 200 / `status=pass`.

No VendaERP provider retry occurred.

## Convergence proof

The live Core matches the ADR 0223 candidate artifact:

```text
wandora/core:organization-adapter-candidate-da4289034575
source = da42890345753ebabf579947f568acd74145089b
```

The active adapter package operational files are:

```text
index.mjs        = a8928675fd80145e330e3a775f4ba3891b295edd48404331238db2a4980dfd39
package.json     = f52507a1759ba6f6b137e9548ea0cea15c9a6b31fff1ea5f3ade5e4c2d05a12f
compatibility    = d3a741523b6b4e61adcd600051e80885ac1714c4982958b26a279ef8bba316e8
```

These are byte-identical to both:

- the ADR 0223 CI candidate; and
- the previously retained pre-ADR0221 package at `6390812d...`.

Therefore the redundant Wandora-owned per-task marker/allowlist path is no longer active in Core or adapter.

Paperclip remains the operational authority for issue-scoped tool visibility.

## Operational deviation from ADR 0224

ADR 0224 planned to reuse the already-retained Paperclip package path `6390812d...`.

The completed runtime instead activated another hash-addressed package path:

```text
0e53cda6e3b76492e89d50727befccfbab3d246a79155e15dd9929137d97fbb3
```

The package bytes are identical to `6390812d...`.

Recent Paperclip logs also show two successful `POST /api/adapters/install` calls for the same `0e53cda6...` path before the final stable runtime.

This is an operational replay/de-duplication deviation, not a semantic or capability divergence:

- one adapter type remains registered;
- adapter bytes equal the approved ADR 0223 candidate;
- no additional execution authority was created;
- no provider call occurred;
- final runtime is healthy and quiescent.

A new restart solely to rewrite the package path is not justified. The extra retained package is treated as inert package-store residue and may be cleaned only in a separate maintenance slice if Paperclip provides a safe native cleanup boundary.

## Capability Authority

Final authority remains:

```text
business-semantic choice = Wandora
tool profile/binding/effective access = Paperclip
connection/grant/secret/catalog/policy/audit/MCP execution = Paperclip
supervised ephemeral execution = Mastra
provider translation = VendaERP MCP
provider data = VendaERP
```

ADR 0168 is preserved.

## Next slice

A provider retry is still not authorized by this execution record.

Next:

**28PRO VendaERP Bounded Product Read Retry Preflight V2 — NO PROVIDER CALL**

That preflight must:

1. create a temporary Paperclip-only proof issue;
2. create or reuse an active profile with `defaultAction=deny`;
3. include exactly the catalog entry for `vendaerp_search_products`;
4. bind that profile to the proof issue with `targetType=issue`;
5. prove effective visibility exposes exactly one read tool;
6. prove no write/destructive tool is visible;
7. retain safe MCP error-code observability;
8. require Core/Paperclip healthy, Ana idle, live runs empty, work/outbound 0/0;
9. STOP before calling VendaERP.

## Decision

**GREEN. Runtime convergence is complete.**

No provider retry occurred.
