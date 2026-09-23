# ADR 0219 — 28PRO VendaERP End-to-End Read Proof V1

Status: **PRODUCTION GREEN / E2E READ PATH PROVEN / PAPERCLIP LIFECYCLE HANDOFF NOT INTERNALIZED**
Date: 2026-09-23

## Scope

This ADR records the production promotion of the ADR 0218 duplicate-read collapse and the repeated bounded 28PRO end-to-end proof:

```text
Paperclip issue/run identity
-> Wandora Core
-> Paperclip Tool Gateway session
-> ephemeral RuntimeReadTool
-> supervised Mastra
-> Paperclip Tool Gateway call
-> Paperclip-owned grant/secret/MCP execution
-> VendaERP read-only provider
```

No Wandora customer work, outbound action, ERP write, migration or Web/Paperclip deployment was part of this proof.

## Entry state

Canonical repository after ADR 0218 merge:

```text
main = 2e2607bd3454bd6c8303d2ec40a1cb906dd19c16
```

ADR 0218 exact-head qualification:

```text
PR #283 head = 240cbc425f861be0b6642db2540dbafdc793ff4a
9/9 GREEN
- Core CI
- Core Candidate Artifact
- Paperclip Mastra Adapter CI
- Paperclip OpenAPI Compatibility
- VendaERP Read-Only MCP CI
- Organization Adapter Plugin CI
- Platform Admin CI
- Messaging Gateway CI
- Web CI
```

## Fixed Core candidate

Core Candidate Artifact run:

```text
workflow run = 35872890686
artifact id = 10755947487
artifact name = core-organization-adapter-candidate-3b39a14f5c238257b0fd087ed0c32494948a92cc
artifact ZIP sha256 = 8fdfad007746b5ff7b1ecb18618446ff85a0fc5f3c3a0d0629a547a5113be513
archive sha256 = 908a8127378442d68d4ff0efa6c55fcadb49c7253728a1a8785e3955fee1c559
image = wandora/core:organization-adapter-candidate-3b39a14f5c23
image id / OCI manifest digest = sha256:1dd167a8a914eece572ed9004c16ff10d0a97734d3bad65e6f45c011622b1a47
config digest = sha256:18cfa488e57a2a36db1834d73478ee2082f6a6dff0295dfc2f4ca839747db0d4
image user = node
source sha = 3b39a14f5c238257b0fd087ed0c32494948a92cc
```

The artifact ZIP and inner archive digests were reverified on the VPS.

Blob equivalence to merged main:

```text
apps/core/ = 101/101 identical
infra/stacks/core/ = 15/15 identical
```

## Promotion gate

Before promotion, production still ran:

```text
wandora/core:organization-adapter-candidate-fa64d98c5b87
healthy
restart = 0
```

Full live Compose rendering against old and fixed candidate produced exactly one delta:

```diff
- image: wandora/core:organization-adapter-candidate-fa64d98c5b87
+ image: wandora/core:organization-adapter-candidate-3b39a14f5c23
```

No secret, mount, network, flag, database or overlay delta existed.

## Production promotion

The exact verified archive was loaded and only Core was recreated through the existing full Compose project.

Post-promotion:

```text
Core image = wandora/core:organization-adapter-candidate-3b39a14f5c23
Core revision = 3b39a14f5c238257b0fd087ed0c32494948a92cc
health = healthy
restart count = 0
created = 2026-09-23T14:23:08.091179906Z
```

## Proof baseline

Immediately before the repeated proof:

```text
active pending Ana issues = 0
Wandora customer work operations = 0
Wandora outbound attempts = 0
```

The proof used one synthetic non-customer Paperclip issue:

```text
identifier = PRO-3
issue id = 654c6d28-d85d-40a3-bd02-4ae7cda3433d
title = Wandora VendaERP E2E read proof after dedupe
wandora-work-v1 marker = absent
```

The task requested one read-only `vendaerp_probe` and no other tool.

## End-to-end result

Paperclip produced two runs for the same issue:

```text
a085c647-9e32-413a-815e-1cc0067b333a = succeeded
9062c9e1-7f64-49ed-acd4-d658b1abc292 = succeeded disposition handoff
```

Both summaries reported `connected=true`.

Paperclip ToolConnection audit, filtered by the exact PRO-3 issue ID, proved:

```text
total completed provider calls = 2

run a085c647...:
  vendaerp_probe calls = 1

run 9062c9e1...:
  vendaerp_probe calls = 1
```

Therefore ADR 0218 corrected the observed behavior from **five identical provider reads per Mastra run to exactly one per run**.

Both provider calls were:

- connection-backed;
- `mcp_local_stdio`;
- `risk=read`;
- allowed by the effective Paperclip profile;
- successful;
- `connected=true`.

The synthetic issue was then explicitly closed as `done`.

Post-proof:

```text
Wandora customer work operations = 0
Wandora outbound attempts = 0
```

## Paperclip lifecycle handoff

The second run is not a duplicate Mastra step inside one execution. It is a separate Paperclip-owned lifecycle/disposition recovery run.

The Paperclip adapter already passes structured `wakeReason` metadata, including `finish_successful_run_handoff`.

The second adversarial review rejects using that signal to recreate or take ownership of Paperclip issue lifecycle inside Wandora.

Current boundary remains:

- Paperclip decides issue lifecycle, handoff and disposition recovery;
- Wandora decides semantic/effect policy and read-tool admission;
- Mastra executes supervised runtime reasoning;
- Paperclip executes the admitted provider tool.

A future optimization may reduce disposition-run model/tool cost only if it can reuse Paperclip lifecycle capabilities without internalizing them.

## Capability Authority / Reuse Gate

No new durable cache or execution state exists.

ADR 0218 memoization is run-scoped and ephemeral.

Paperclip remains the owner of:

- session identity;
- grant/secret resolution;
- catalog/profile policy;
- MCP execution;
- call audit;
- lifecycle/handoff.

Wandora remains the owner of:

- semantic/product/effect authority;
- the narrow read-tool admission adapter;
- the rule that identical admitted reads in one execution are not multiplied.

ADR 0168 remains preserved.

ADR 0208 remains preserved.

## Rollback

If the fixed Core image itself must be rolled back:

```text
rollback image =
wandora/core:organization-adapter-candidate-fa64d98c5b87
```

Use the unchanged full Compose file set and secret host paths, recreate only Core, then require health/restart invariants.

Paperclip VendaERP connection state does not need rollback for a Core-only rollback.

## Decision

**GREEN.**

The production path Wandora → Paperclip Tool Gateway → supervised Mastra → Paperclip-owned VendaERP MCP read execution is proven.

ADR 0218 duplicate-call collapse is proven in production: one identical provider read per run.

Known residual behavior: a successful non-customer synthetic issue can trigger a separate Paperclip disposition handoff run. This remains Paperclip lifecycle authority and is not hidden or reimplemented by Wandora.

No ERP write, customer work or outbound effect occurred.
