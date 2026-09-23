# ADR 0215 — 28PRO VendaERP Read-Only Activation Execution Phase 1 V1

Status: **PRODUCTION PHASE 1 GREEN / READ-ONLY RUNTIME MOUNT PROMOTED**
Date: 2026-09-23

## Context

ADRs 0212–0214 qualified the Paperclip-owned activation shape and the stack-local deployment path for the VendaERP read-only MCP adapter.

This ADR records the first production effect of **28PRO VendaERP Read-Only Connection Activation Execution V1**:

- stage the exact reviewed adapter artifact;
- mount it read-only into the live Paperclip container;
- recreate Paperclip through the existing Compose project;
- prove health, checksum integrity and local MCP discovery;
- stop before any VendaERP connection/grant/secret/provider call.

## Entry state

Repository:

```text
main = 3bf7ccc0efb2a0b365fdd8896b9e4edffd477502
ADR 0214 = merged
```

Paperclip before recreate:

```text
image = wandora/paperclip:v2026.916.0
restart count = 0
health = healthy
container id = 9f4ca914e5fb9166c509f3a7ec8cfc497bc4663b8e2010721117835eca3bb29a
```

28PRO before activation state:

```text
ToolApplications = 0
ToolConnections = 0
custom stdio templates = 0
profiles = 0
policies = 0
VendaERP secrets = 0
work operations = 0
outbound attempts = 0
```

## First execution attempt and recovery

The first staging command stopped before any container recreate because `sudo` required a password.

Reconciliation proved:

- no privileged mutation had occurred;
- `/opt/wandora/stacks/paperclip` is the existing writable deployment boundary;
- ADR 0214 was created and merged before execution resumed.

A later Compose validation also stopped before recreate because the existing bridge overlay references the required interpolation variable:

```text
WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE_HOST
```

The live mount proved the canonical non-secret path is:

```text
/opt/wandora/stacks/core/secrets/paperclip-execution-bridge-hmac
```

Execution resumed from Compose validation only, with that path exported. Staging and overlay edits were not repeated.

## Exact artifact provenance

Source commit:

```text
3bf7ccc0efb2a0b365fdd8896b9e4edffd477502
```

Source and staged runtime SHA-256:

```text
3f051655ba01a73a204a7a68ede30e9c49e636916d625c7546787e5c73bd6f92
```

Host staging path:

```text
/opt/wandora/stacks/paperclip/runtime-integrations/vendaerp-readonly-mcp
```

Container path:

```text
/opt/wandora/integrations/vendaerp-readonly-mcp
```

The bind mount is read-only.

A source-commit marker is staged alongside the adapter.

## Deployment mutation

The existing Paperclip execution-bridge Compose overlay was backed up before modification.

Backup:

```text
/opt/wandora/stacks/paperclip/compose.paperclip-execution-bridge.yaml.bak.20260923T131802Z
```

The overlay gained exactly one mount:

```text
./runtime-integrations/vendaerp-readonly-mcp:
  /opt/wandora/integrations/vendaerp-readonly-mcp:ro
```

The existing two-file Compose project was used:

```text
compose.yaml
compose.paperclip-execution-bridge.yaml
```

Rendered Compose validation succeeded before recreate.

## Post-recreate validation

Paperclip after recreate:

```text
container id = 0f7d8f1638b27dbbb4e95a70d10408914effddf5f73fc118d16c705e067fc98b
image = wandora/paperclip:v2026.916.0
restart count = 0
health = healthy
```

Effective live mount:

```text
bind
/opt/wandora/stacks/paperclip/runtime-integrations/vendaerp-readonly-mcp
->
/opt/wandora/integrations/vendaerp-readonly-mcp
mode = ro
```

Container SHA-256 matched the staged/source SHA-256 exactly.

## Live local MCP proof

Without creating secrets or calling VendaERP, the adapter was invoked directly inside the live Paperclip container with:

```text
--tenant voepro
```

MCP `initialize` + `tools/list` completed successfully.

Result:

```text
LIVE_MOUNT_MCP_OK tools=8
```

The returned surface matched exactly the eight ADR 0210 reads and all were read-only/non-destructive.

No tool call was made, so there was no provider request.

## Post-effect state reconciliation

After the recreate:

```text
28PRO ToolApplications = 0
28PRO ToolConnections = 0
28PRO custom stdio templates = 0
28PRO profiles = 0
28PRO policies = 0
28PRO company secrets = existing Organization Adapter HMAC only

Ana Paperclip = idle / wandora_mastra / lastHeartbeatAt null
Ana Wandora = active / supervised

28PRO work operations = 0
28PRO outbound attempts = 0
```

Therefore the infrastructure promotion did not activate ERP access, alter Ana lifecycle, dispatch work or create outbound effects.

## Capability authority

No authority changed.

- Wandora: product semantics, tenant/effect policy.
- Paperclip: connection/grant/secret/catalog/profile/audit/MCP execution.
- Mastra: ephemeral runtime materialization.
- VendaERP: replaceable provider adapter target.

The production effect is only deployment plumbing required for Paperclip's already-qualified `local_stdio` capability.

## Rollback

If the mount itself needs rollback before ERP connection activation:

1. restore the saved execution-bridge overlay backup;
2. recreate Paperclip using the existing two-file Compose project;
3. verify health/restart count;
4. confirm the VendaERP mount is absent;
5. remove the stack-local runtime artifact.

No database rollback is required because no Paperclip ERP control-plane state exists yet.

## Decision

**PHASE 1 GREEN.**

The next activation phase is credential/control-plane activation and still requires the real owner-provided `Authorization-Token`.

Before provider access, the next phase must:

1. custody the three credentials as Paperclip company-scoped `local_encrypted` secrets;
2. create the approved stdio template;
3. create the mcp_stdio ToolApplication and ToolConnection;
4. create the shared organization grant using exactly the three env secret refs;
5. install only to Ana;
6. materialize catalog and prove exactly eight read tools;
7. create/bind the Ana default-deny exact-catalog profile;
8. prove another agent/company cannot use the connection;
9. only then perform one explicit GET-only `vendaerp_probe`.

No customer work, model run, outbound or ERP write is authorized by this ADR.
