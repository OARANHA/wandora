# ADR 0267 — Digital Employee Development Production Activation V1

Status: **COMPLETE / GREEN / MIGRATION 020 + CORE-ONLY PRODUCTION ACTIVATION**  
Date: 2026-09-25

## Objective

Activate ADR 0266 in production with the minimum required effects:

1. apply migration 020;
2. verify the new employee-development storage boundary;
3. promote the exact qualified Core candidate;
4. validate Core readiness while Paperclip admission is drained;
5. restore admission explicitly.

No Web, Paperclip, Messaging Gateway, Mastra provider, customer work or outbound behavior is changed by this activation.

## Canonical source

```text
main = 0a361bbefcdff4208cef49cc5ce380330c690355
PR #349 = MERGED
source tree = b1689520192385730ae4427bd450a173243175ea
```

PR #349 passed all seven workflows before merge:

- Core CI
- Core Candidate Artifact
- Paperclip Mastra Adapter CI
- Paperclip OpenAPI Compatibility
- Platform Admin CI
- Messaging Gateway CI
- Web CI

## Exact Core artifact

```text
artifact id =
10853827684

artifact name =
core-organization-adapter-candidate-f3225586d0825334d2c9c697a1720512a65d47f8

GitHub ZIP digest =
sha256:8f25566bb46801591e63bafb7679ec596e4187e72bc6c9c9aa9b887f34a8a3ee

candidate source =
f3225586d0825334d2c9c697a1720512a65d47f8

candidate source tree =
b1689520192385730ae4427bd450a173243175ea

candidate image =
wandora/core:organization-adapter-candidate-f3225586d082

archive sha256 =
42dbdbace4b381559a1d2520a94558531a9b536a3ce3672483082b7535389178

OCI manifest / loaded image id =
sha256:639649b4ed99547e708f17ee2dda71beb04da728af113073705f928ddf55c4b9

revision =
f3225586d0825334d2c9c697a1720512a65d47f8

candidate contract =
organization-adapter-core-v1

user =
node
```

The candidate source tree exactly matches merged `main`.

## Production baseline before mutation

Core:

```text
image =
wandora/core:organization-adapter-candidate-46741f8d82d0

image id =
sha256:789efb36999246b62c7b7a95211903d3a74504471c1cde9d0f4aa4c11deb4cc4

revision =
46741f8d82d041b3f3cdde3d209c923e630db968

health = healthy
restart = 0
```

Paperclip:

```text
image = wandora/paperclip:v2026.916.0
health = healthy
restart = 0
```

The previous Core image remained locally available as the rollback target.

## Migration 020

A read-only production check before activation returned:

```text
ABSENT
```

for:

```text
wandora.digital_employee_development_entries
```

Therefore the new Core could not be promoted first because ADR 0266 readiness intentionally fails closed when the boundary is missing.

The exact migration from canonical source was staged at:

```text
/opt/wandora/ops-workspace/adr0267-migration-020/20260925_020_digital_employee_development_contract_v1.sql
```

SHA256:

```text
48e62ab048de13e4f7d0b09aed3d719d945824d18ec1f836d0d4945b89b440ee
```

The production migration transaction completed successfully through `COMMIT`.

Post-migration readback returned:

```text
wandora.digital_employee_development_entries
```

The activation ordering was therefore:

```text
migration 020
  -> storage boundary verified
  -> Core promotion
```

## Task Drain

Before Core mutation:

```text
draining=true
activeRuns=0
pendingWakes=0
quiescent=true
```

The drain TTL was extended during the maintenance window and remained active until protected validation completed.

## Core candidate load

The exact archive was loaded manually because the Remote Ops Docker proxy does not permit `docker load`.

Readback:

```text
ID=sha256:639649b4ed99547e708f17ee2dda71beb04da728af113073705f928ddf55c4b9
REV=f3225586d0825334d2c9c697a1720512a65d47f8
CANDIDATE=organization-adapter-core-v1
USER=node
```

## Core-only promotion

The live twelve-file Compose project was reused.

Required existing host interpolation values were preserved, including:

```text
WANDORA_CORE_SECRET_GID = 987
WANDORA_CORE_DB_PASSWORD_FILE =
/opt/wandora/stacks/core/secrets/wandora_core_db_password

WANDORA_GATEWAY_CORE_INGRESS_SECRET_FILE =
/opt/wandora/stacks/core/secrets/gateway-core-ingress-hmac

WANDORA_ORGANIZATION_ADAPTER_SECRET_DIR_HOST =
/opt/wandora/secrets/organization-adapter

WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE_HOST =
/opt/wandora/stacks/core/secrets/paperclip-execution-bridge-hmac

WANDORA_MODEL_API_KEY_FILE_HOST =
/opt/wandora/stacks/core/secrets/wandora_model_provider_api_key
```

The first compose attempt failed during interpolation before any recreate because required environment values were not supplied. The live Core remained unchanged and healthy. No runtime action was repeated blindly.

The corrected promotion force-recreated only `core` with `--no-deps`.

## Protected validation

New Core:

```text
container =
247966e5a24d23d9a75082766725a3e977d63648612fd1cc9bf0602d3a141452

image =
wandora/core:organization-adapter-candidate-f3225586d082

image id =
sha256:639649b4ed99547e708f17ee2dda71beb04da728af113073705f928ddf55c4b9

revision =
f3225586d0825334d2c9c697a1720512a65d47f8

candidate =
organization-adapter-core-v1

health = healthy
restart = 0
healthz = 200
readyz = 200
```

Startup log reports:

```text
digitalEmployeeDevelopment=true
agentRuntime=mastra-supervised-model
paperclipExecutionBridge=true
```

The only maintenance-window warning observed was the operational Docker CLI user's inability to read its own `~/.docker/config.json`; it was not a Core runtime failure.

Paperclip remained unchanged:

```text
same container id =
9a1a2706e8fef9a0ccc80de7fb85fa96e357fc60ed7a7a571e20635b7ed78f83

image =
wandora/paperclip:v2026.916.0

health = healthy
restart = 0
```

Other production services remained healthy and unchanged.

## Task Drain completion

After protected validation:

```text
wasActive=true
```

Final readback:

```text
draining=false
activeRuns=0
pendingWakes=0
quiescent=true
```

Admission was restored explicitly; the TTL was not used as the restoration mechanism.

## Capability authority

Authority remains unchanged:

- Wandora owns the provider-neutral employee-development semantic contract.
- Paperclip continues to own Skills, Decision Training, control-plane lifecycle and Tool Gateway operations.
- Mastra remains runtime/memory/context authority.
- No memory/RAG/Skills/Decision Training capability was internalized.

ADR 0168 remains preserved.

## Production effect

```text
migration 020 applied = yes
Core image promoted = yes
Web recreated = no
Paperclip recreated = no
Messaging Gateway recreated = no
provider/model call = no
customer work executed = no
outbound effect = no
```

## Decision

**COMPLETE / GREEN.**

Digital Employee Development V1 is now live at the storage + Core contract/runtime boundary.

The customer-facing Web editing experience remains a separate future slice. Candidate-learning generation/persistence also remains a separate future decision.
