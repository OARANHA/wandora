# Paperclip Organization Adapter Audit V1 — 2026-09-16

## Purpose

Record the state-first capability audit required by ADR 0036 before Wandora implements customer digital-employee hiring/control-plane behavior.

No customer data, Wandora tenant state, live Paperclip company/agent/task state or production credential was modified by this audit.

## Audited installed runtime

The audit used the Paperclip source and image actually installed on the Wandora VPS:

```text
image: wandora/paperclip:v2026.831.1
source commit: 65ec059bde30d98c92165b24a30a540800dd1f6f
deployment mode: authenticated
exposure: private
health: ok
```

The live Paperclip container was inspected read-only. The execution-contract spike ran in disposable containers with `--network none`, read-only root filesystem and synthetic data/secrets only.

## Capability findings

The installed Paperclip version already exposes material control-plane capabilities including:

- companies and company memberships;
- agent directory and organization view;
- company-scoped `agent-hires`;
- agent lifecycle, permissions and configuration revisions;
- issues/tasks, assignment and checkout/run ownership;
- approvals;
- goals, projects and routines;
- adapter registry plus external adapter plugins.

`POST /api/companies/:companyId/agent-hires` already handles role/configuration, skills, budget, lifecycle state, optional board approval, audit activity and default task-assignment permission. Rebuilding these semantics in Wandora Core would duplicate a mature selected capability provider.

## Authorization findings

### Board API keys

Board API keys authenticate as the owning Paperclip user and inherit that user's active company memberships/permissions. The key itself does not provide an independent per-company scope.

Consequence: a broad instance-admin or multi-company board key is not acceptable as the normal tenant Organization Adapter credential.

The intended tenant path is a dedicated technical Paperclip identity limited to the mapped company and the minimum required grants. Its exact provisioning/lifecycle remains a separate proof gate.

### Company creation

Creating a Paperclip company requires a board actor with instance-admin authority in authenticated deployment mode. This is a platform-level operation and must remain separate from normal tenant employee lifecycle operations.

### Hiring

A same-company board actor with the `agents:create` authorization can use `agent-hires` without instance-admin authority. This supports a tenant-scoped service identity design.

## Execution adapter findings

The built-in generic HTTP adapter can invoke an HTTP endpoint, but it does not declare `supportsLocalAgentJwt`. Using it for Wandora would encourage a static shared secret and would not automatically receive Paperclip's run-scoped agent credential.

Paperclip's external adapter contract is a better fit. It supports:

- custom runtime adapters;
- `supportsLocalAgentJwt=true`;
- a run-scoped `authToken` supplied by the Paperclip harness;
- structured `AdapterExecutionResult` returned to Paperclip;
- external adapter loading without modifying Paperclip core.

The installed Hermes adapter demonstrates the intended pattern: it accepts the harness-minted run token, refuses config-supplied Paperclip API keys, and uses the run token for scoped callbacks.

## Run-token boundary

The installed Paperclip run JWT contains agent/company/run attribution and is signed using a key derived from the instance + company. Paperclip additionally validates company/agent/run consistency and issue mutation ownership.

The installed tests include rejection for cross-company access, missing/forged run identity and mismatched run headers.

Wandora must not receive the Paperclip master JWT signing secret merely to validate this token.

## Accepted trust split

```text
Paperclip external adapter -> Wandora private bridge
  authentication: dedicated Wandora directional HMAC

Wandora/Mastra -> Paperclip callback
  authentication: opaque Paperclip run-scoped JWT
```

The bridge signs timestamp + exact JSON body. The run JWT travels separately and is never placed in the request body, logs or product state.

The bridge request also uses an explicit task-context allow-list. It does **not** forward Paperclip's entire runtime context; provider internals such as managed MCP metadata/tokens must stay behind the Paperclip boundary unless separately reviewed.

## Reproducible live-image spike

Repository path:

```text
spikes/paperclip-wandora-mastra-adapter-v1/
```

Before the final execution on the VPS, the changed materialized files were checked with `git hash-object` against the GitHub branch blobs:

```text
package.json          0e2f537c36b6f0c991548c912c069d3d62ae4488
index.mjs             b176a5e5a151664c55c0b10f8e08b1f39bbf7e9a
run-spike.mjs         4edc8672510e8a7c9230aa7dfeb137720a52ef59
verify-live-image.sh  1f596c60b84a56c565313380468d30bd75db27f5
```

The verifier ran the exact live Paperclip image with no external network access:

```text
loader = ok
supportsLocalAgentJwt = true
missingRunTokenFailClosed = true
missingBridgeSecretFailClosed = true
signatureOk = true
timestampOk = true
runTokenOk = true
bodyOk = true
contextMinimized = true
result exitCode = 0
provider = wandora
model = deterministic-spike
executionId = exec-spike-1
```

The `contextMinimized` assertion deliberately placed synthetic provider-internal/MCP-like data in the source context and proved it did not cross the adapter boundary.

This proves the adapter/plugin and trust contract, not customer functionality.

## What was NOT done

- no adapter was installed into live Paperclip;
- no Paperclip company/agent/task was created;
- no production Paperclip board/API key was created or used;
- no Wandora customer tenant was mutated;
- no Supabase migration was added;
- no Mastra live execution was triggered;
- no Human Send/Gateway outbound switch was enabled.

## Next executable gate

Use only disposable/non-customer Paperclip state to prove the full Organization Adapter contract:

1. create/select an isolated Paperclip test company using the separate platform-level path;
2. create a company-scoped technical identity with minimum grants;
3. prove company-scoped read/org/agent-hire operations;
4. prove cross-company denial;
5. install/load the reviewed `wandora_mastra` external adapter only in the controlled proof context;
6. hire a disposable agent using that adapter;
7. create/assign a disposable task and prove Paperclip -> private Wandora bridge -> Mastra-compatible execution -> scoped Paperclip callback;
8. prove retry/idempotency/reconciliation behavior;
9. clean up or archive disposable state;
10. only then design customer `Contratar funcionário` APIs/UI.
