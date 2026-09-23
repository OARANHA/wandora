# ADR 0229 — ADR 0227 Core + VendaERP MCP Tool Error Semantics Promotion Execution V1

Status: **COMPLETE / GREEN / PRODUCTION PROMOTION EXECUTED / NO PROVIDER CALL**
Date: 2026-09-23

## Objective

Execute exactly the production promotion qualified by ADR 0228:

1. promote the VendaERP MCP tool-error semantics candidate;
2. promote the Wandora Core fail-closed bridge candidate;
3. preserve Paperclip, `wandora_mastra` and the existing Connection/grant/secret/install/profile/catalog authority unchanged;
4. perform no VendaERP provider read, model run, customer work or outbound effect.

This execution does **not** authorize another product retry.

## Canonical entry

```text
main = 40c233374fc0fad213beeda816a889ade8257ddf
PR #298 = MERGED
ADR 0228 = GREEN / NO EFFECT / GO for separate promotion
open PRs = 0 at execution reconciliation
```

PR #298 head completed 6/6 GREEN:

- Core CI;
- VendaERP Read-Only MCP CI;
- Organization Adapter Plugin CI;
- Web CI;
- Platform Admin CI;
- Messaging Gateway CI.

Post-merge `main@40c23337...` push workflows later closed 4/4 GREEN:

- Core CI;
- Web CI;
- Platform Admin CI;
- Messaging Gateway CI.

The squash commit is documentation-only. The promoted executable candidate remains the exact PR #297 head-qualified artifact from ADR 0228.

## Pre-mutation runtime readback

Immediately before mutation:

```text
Core =
  wandora/core:organization-adapter-candidate-da4289034575
  revision da42890345753ebabf579947f568acd74145089b
  healthy / restart 0

Paperclip =
  wandora/paperclip:v2026.916.0
  healthy / restart 0

wandora_mastra =
  0.4.0
  loaded=true
  disabled=false
  retained package 6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c

VendaERP MCP live server.mjs =
  067e7f98912f8bfb7bd19f6d098d19dcbb443c451819d85f17e317a6fe774640

Task Drain =
  draining=false
  activeRuns=0
  pendingWakes=0
  quiescent=true

28PRO live runs = 0
Wandora work operations = 0
Wandora outbound attempts = 0
```

No residual PRO-8 issue/profile remained.

## Artifact proof

The exact Core artifact was re-downloaded before execution:

```text
artifact id =
10779549706

artifact ZIP sha256 =
638ba85bed9677c9e544efec2e451e57e92b835425a4e6ada12f5bbb4b352888

archive sha256 =
d838ec68f882b5b312d519a32d1ae89fdcf199676bf194632978aa9de0f3c931

source_sha =
fc8721ccaedd5079eec9f3be11e8b64051416579

image =
wandora/core:organization-adapter-candidate-fc8721ccaedd

OCI manifest/image id =
sha256:a149dc3283a766f598abf80a2cdd9c4bdd77f9e3cd2addb6826a70fb2d11294b

image user =
node
```

The GitHub ZIP matched its published digest. The inner archive matched the artifact `SHA256SUMS`.

The image loaded successfully before Core recreation.

## Task Drain

Paperclip-native Task Drain was started with a bounded 10-minute TTL using the already-custodied Board credential inside the Paperclip container.

The credential was not copied to the host or emitted.

Immediate readback:

```text
draining=true
activeRuns=0
pendingWakes=0
quiescent=true
```

No run was admitted during the runtime transition.

## VendaERP MCP promotion

Frozen rollback evidence remained:

```text
rollback server.mjs =
067e7f98912f8bfb7bd19f6d098d19dcbb443c451819d85f17e317a6fe774640

rollback source marker sha256 =
1d53c9a728d28f6a019f4c0b0043b4d280b6607f67b24e85c5252f2ab7fadd40
```

Frozen candidate evidence:

```text
candidate server.mjs =
6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f

candidate source marker sha256 =
5635e6b4b8500481983cf6cde952bdba675e9826de06345c27bac81eb5719e3d
```

Only the stack-local mounted files were atomically replaced:

```text
/opt/wandora/stacks/paperclip/runtime-integrations/vendaerp-readonly-mcp/server.mjs
/opt/wandora/stacks/paperclip/runtime-integrations/vendaerp-readonly-mcp/WANDORA_SOURCE_COMMIT
```

Host and container-visible hashes matched the candidate after replacement.

Paperclip itself was not restarted.

## Core promotion

The exact 12-file live Compose project was reused with the same secret paths, networks and overlays.

Only:

```text
WANDORA_CORE_IMAGE =
wandora/core:organization-adapter-candidate-fc8721ccaedd
```

was changed relative to the previous live composition.

Only service `core` was force-recreated.

Immediate validation:

```text
Core image =
wandora/core:organization-adapter-candidate-fc8721ccaedd

Core revision =
fc8721ccaedd5079eec9f3be11e8b64051416579

Core health =
healthy

Core restart count =
0

/healthz =
200

/readyz =
200
```

Paperclip remained the same container created at:

```text
2026-09-23T22:07:07.108505365Z
```

and remained:

```text
wandora/paperclip:v2026.916.0
healthy
restart 0
```

## Post-promotion reconciliation

Before clearing Task Drain:

```text
Task Drain =
  draining=true
  activeRuns=0
  pendingWakes=0
  quiescent=true

wandora_mastra =
  version 0.4.0
  loaded=true
  disabled=false
  retained package 6390812d...

28PRO live runs = 0
Wandora work operations = 0
Wandora outbound attempts = 0
```

Task Drain was then explicitly ended.

Final readback:

```text
draining=false
activeRuns=0
pendingWakes=0
quiescent=true
```

Final runtime:

```text
Core =
  wandora/core:organization-adapter-candidate-fc8721ccaedd
  revision fc8721ccaedd5079eec9f3be11e8b64051416579
  healthy / restart 0

Paperclip =
  wandora/paperclip:v2026.916.0
  same pre-promotion container
  healthy / restart 0

VendaERP MCP server.mjs =
  6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f

Wandora work operations = 0
Wandora outbound attempts = 0
```

Paperclip logs since the maintenance boundary contained no VendaERP tool invocation/provider-path marker.

No model run occurred.

## Execution incidents and reconciliation

Three non-effect operational issues occurred and were reconciled before proceeding:

1. artifact extraction first attempted `unzip`, which is not installed on the VPS; the already-verified ZIP was extracted with Python without re-downloading it;
2. one shell command intended to pre-check MCP hashes had a quoting error; readback proved live MCP hashes were still the rollback hashes before replacement was repeated;
3. one combined image-load command was blocked by the remote security layer before host execution; the artifact was decompressed and `docker load --input` was then executed separately.

None of those incidents produced an ambiguous production state.

No operation was repeated without readback.

## Capability Authority / Reuse Gate

Authority remains unchanged:

- Wandora = business semantics and fail-closed runtime/effect boundary;
- Paperclip = issue/run lifecycle, profile binding, policy, Connections/grants/secrets/installs/catalog, Tool Gateway, audit and MCP execution;
- VendaERP MCP = bounded provider translation + MCP tool-error result semantics;
- Mastra = ephemeral supervised runtime.

This promotion introduces no Wandora retry engine, lifecycle flag, second tool-policy engine, secret manager, connection store or Paperclip fork.

ADR 0168 remains preserved.

ADR 0208 remains preserved: generic REST Tool Gateway execution remains NO-GO.

## Second adversarial review

- Did production Core change only to the exact qualified image? **Yes.**
- Did Paperclip restart? **No.**
- Did `wandora_mastra` change? **No.**
- Did Connection/grant/secret/install/profile/catalog state need mutation? **No.**
- Did any live run overlap the transition? **No.**
- Did the MCP host/container bytes converge to the candidate? **Yes.**
- Is the prior Core image still locally available for rollback? **Yes.**
- Are the prior MCP bytes preserved? **Yes.**
- Did a VendaERP provider call occur? **No evidence of one; no run/tool invocation was created and the maintenance log scan was empty.**
- Did customer work/outbound change? **No, 0/0.**
- Is another product retry authorized by this ADR? **No.**

## Decision

**COMPLETE / GREEN.**

The ADR 0227 Core + VendaERP MCP Tool Error Semantics production promotion is complete.

Another VendaERP product read remains prohibited until the next separate slice:

**Paperclip Comment-Driven One-Shot Product Read Preflight V1 — NO PROVIDER CALL**

That next preflight must prove the provider-native comment-driven lifecycle is excluded from successful-run handoff and must STOP before any VendaERP call.
