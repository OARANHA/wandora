# ADR 0219 — 28PRO VendaERP End-to-End Read Tool Proof V1

Status: **PRODUCTION GREEN**
Date: 2026-09-23

## Scope

This ADR closes the bounded end-to-end proof for the already-activated 28PRO VendaERP read-only capability.

The proof verifies the complete production path:

```text
Paperclip issue / native run JWT
-> Wandora private execution bridge
-> Paperclip Tool Gateway session
-> ephemeral RuntimeReadTool
-> supervised Mastra
-> Paperclip Tool Gateway call
-> Paperclip-owned grant/secret resolution
-> local_stdio VendaERP MCP adapter
-> VendaERP GET-only read
```

No Wandora customer work, outbound effect, ERP write or migration is part of this proof.

## Entry state

Canonical implementation:

```text
main = 2e2607bd3454bd6c8303d2ec40a1cb906dd19c16
PR #283 = MERGED
ADR 0218 = accepted
PR #283 head = 240cbc425f861be0b6642db2540dbafdc793ff4a
exact-head workflows = 9/9 GREEN
```

The exact-head workflows included:

- Core CI;
- Core Candidate Artifact;
- Paperclip Mastra Adapter CI;
- Paperclip OpenAPI Compatibility;
- VendaERP Read-Only MCP CI;
- Organization Adapter Plugin CI;
- Web CI;
- Platform Admin CI;
- Messaging Gateway CI.

## Fixed Core artifact

Core Candidate Artifact workflow run:

```text
run = 35872890686
artifact id = 10755947487
artifact = core-organization-adapter-candidate-3b39a14f5c238257b0fd087ed0c32494948a92cc
ZIP sha256 = 8fdfad007746b5ff7b1ecb18618446ff85a0fc5f3c3a0d0629a547a5113be513
archive sha256 = 908a8127378442d68d4ff0efa6c55fcadb49c7253728a1a8785e3955fee1c559
image = wandora/core:organization-adapter-candidate-3b39a14f5c23
OCI config digest = sha256:18cfa488e57a2a36db1834d73478ee2082f6a6dff0295dfc2f4ca839747db0d4
OCI manifest digest = sha256:1dd167a8a914eece572ed9004c16ff10d0a97734d3bad65e6f45c011622b1a47
```

Blob equivalence against canonical main:

```text
apps/core/ = 101/101 identical
infra/stacks/core/ = 15/15 identical
```

Production Core is now:

```text
image = wandora/core:organization-adapter-candidate-3b39a14f5c23
revision = 3b39a14f5c238257b0fd087ed0c32494948a92cc
health = healthy
restart count = 0
```

The prior Core image remains the rollback boundary.

## Final bounded proof

Paperclip-only synthetic issue:

```text
id = 654c6d28-d85d-40a3-bd02-4ae7cda3433d
identifier = PRO-3
title = Wandora VendaERP E2E read proof after dedupe
status = done
wandora-work-v1 marker = absent
```

Paperclip created two native lifecycle runs for the same issue:

### Assignment run

```text
run = a085c647-9e32-413a-815e-1cc0067b333a
source = assignment
status = succeeded
Tool Gateway invocations = 1
tool = vendaerp_probe
parameters = {}
policy = allow
result = connected=true
transport = local_stdio
```

### Paperclip handoff run

```text
run = 9062c9e1-7f64-49ed-acd4-d658b1abc292
reason = finish_successful_run_handoff
source = automation
status = succeeded
Tool Gateway invocations = 1
tool = vendaerp_probe
parameters = {}
policy = allow
result = connected=true
transport = local_stdio
```

The second run is a separate Paperclip lifecycle run and is not hidden or collapsed across run boundaries.

## ADR 0218 result

Before ADR 0218, each Mastra run executed the identical `vendaerp_probe {}` five times.

After ADR 0218:

```text
actual Tool Gateway calls per run = 1
```

Therefore the run-scoped duplicate collapse works as designed.

It does not suppress distinct calls, does not cache across runs and does not replace Paperclip lifecycle/orchestration authority.

## Post-proof safety state

Production runtime:

```text
Core = healthy / restart 0
Paperclip = healthy / restart 0
```

VendaERP catalog:

```text
entries = 8
risk levels = read only
write/destructive entries = 0
```

Wandora 28PRO:

```text
digital employee work operations = 0
outbound attempts = 0
```

No customer-work marker was used.

No ERP write/destructive tool was invoked.

No provider credential was exposed to Core durable state, Mastra messages or model prompts.

## Capability Authority / Reuse Gate closure

Authority remains unchanged:

- Wandora owns semantic/product/effect authority and the narrow runtime admission adapter;
- Paperclip owns connection, install, grant, secret custody, catalog, profiles, policy, Tool Gateway audit and MCP execution;
- Mastra owns ephemeral supervised runtime execution;
- VendaERP remains a replaceable provider behind the MCP adapter.

ADR 0168 remains preserved.

ADR 0208 remains preserved: generic REST Tool Gateway execution is still NO-GO.

### Why ADR 0218 remains bridge-local

During adversarial review, Paperclip's native `idempotencyKey` capability was also inspected.

Paperclip v2026.916.0 resolves an existing company-scoped idempotency key before re-executing the provider. However, its replay path returns the existing invocation as a replay before re-emitting the original denied/error semantics. For the ADR 0211 fail-closed bridge, this is not equivalent to memoizing the original rejected Promise.

Therefore ADR 0218 intentionally keeps only **ephemeral per-run duplicate collapse** in the Wandora adapter:

- no durable Wandora state;
- no cross-run cache;
- first call still passes all Paperclip policy/grant/secret checks;
- identical repeats reuse that same in-run Promise;
- a denied/unavailable first call remains denied/unavailable for repeats;
- Paperclip remains the only provider execution and durable audit authority.

A future Paperclip version may allow this bridge-local guard to be removed if provider-owned idempotent replay preserves the original success/error semantics required by the Wandora contract.

## Final decision

**28PRO VendaERP End-to-End Read Tool Proof V1 = GREEN.**

The production system has now proven a real, credential-backed, least-privilege read path from Paperclip run identity through Wandora Core and supervised Mastra to VendaERP, without customer work, outbound effects or ERP writes.

## Next safe slice

The next slice may move from connectivity proof to one **bounded business-semantic read proof**, for example an owner-supervised request that exercises one of the already-approved provider-neutral reads such as product search, stock, price-table lookup, party search or order search.

That next slice must first decide the exact business question and expected redaction/output contract. It must remain read-only and must not create sales orders, invoices, messages or any other external effect.
