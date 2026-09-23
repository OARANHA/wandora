# ADR 0211 — Wandora Mastra ↔ Paperclip Tool Gateway Read Tool Bridge Candidate V1

Status: **CODE ONLY / GREEN / NO PRODUCTION EFFECT**  
Date: 2026-09-23

## Context

ADR 0210 selected Paperclip `local_stdio` MCP as the provider-side execution boundary for VendaERP read operations.

The current Wandora employee runtime is external to Paperclip: Ana executes through the `wandora_mastra` adapter and Wandora Core. Paperclip therefore does not inject its native-runner connector tools directly into the current Mastra execution.

Pinned Paperclip v2026.916.0 already exposes a governed run-scoped Tool Gateway session/list/call contract for external adapters. This slice qualifies the narrow bridge required to reuse that authority without creating a Wandora tool engine, secret manager or second grant system.

## REAL NOW

Entry state:

```text
main = a1ae7eaca7dc468ad8f45eb84b60ade95f5337aa
PR #274 = MERGED
open PRs before this slice = 0
Paperclip live = wandora/paperclip:v2026.916.0
Paperclip pin = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
```

Production remained unchanged during this slice.

The VPS Desktop Commander transport was offline during implementation. No VPS operation was repeated or inferred from chat state. GitHub and disposable GitHub-hosted CI were used as the execution/validation substrate.

## Capability authority / reuse gate

No new durable state is required.

### Wandora semantic authority

Wandora continues to own:

- provider-neutral Business System operation semantics;
- tenant and employee product authorization;
- read/write policy;
- customer/mobile authorization;
- external-effect authorization;
- the Agent Runtime contract and what data/tools may enter a model execution.

### Paperclip operational authority

Paperclip continues to own:

- ToolConnection identity;
- installs and grants;
- credential/secret custody;
- catalog and tool descriptors;
- run-scoped agent identity;
- Tool Gateway session identity;
- tool policy;
- tool invocation journal/audit;
- MCP execution.

### Mastra provider implementation

Mastra remains the current Agent Runtime implementation. It receives only ephemeral, already-authorized read-tool descriptors/callbacks for one supervised execution.

### Replacement boundary

Replacing Paperclip changes the connection/grant/Tool Gateway adapter boundary. Replacing Mastra changes the Agent Runtime adapter/tool materialization. Neither replacement requires moving the other provider's operational state into Wandora.

This preserves ADR 0168:

> Portability = contract decoupling, not implementation duplication.

## Proven Paperclip contract

Exact pinned Paperclip v2026.916.0 provides:

```text
POST /api/tool-gateway/sessions
GET  /api/tool-gateway/tools
POST /api/tool-gateway/tools/call
```

For an authenticated agent run:

- the session route derives company/agent scope from the run identity;
- the returned Tool Gateway token is short-lived;
- tool listing is policy-filtered;
- tool calls are policy/audit mediated;
- connection/grant/secret resolution remains inside Paperclip.

The bridge does not call the generic `rest_api` execution path. ADR 0208 remains unchanged.

## Candidate contract

The Wandora Core bridge:

1. receives the Paperclip run JWT that the existing private execution handler has already independently validated through `/api/agents/me`;
2. creates a short-lived Tool Gateway session using that run JWT;
3. lists tools using only the returned Tool Gateway token;
4. admits only descriptors that are:
   - connection-backed;
   - `mcp_local_stdio` or `mcp_remote_http`;
   - explicitly classified `risk = read`;
   - bound to valid connection/catalog identifiers;
5. materializes those tools as ephemeral `RuntimeReadTool` callbacks;
6. executes tool calls through Paperclip using only the ephemeral Tool Gateway token;
7. passes neither the run JWT nor the Tool Gateway token into model messages or durable Wandora state.

Paperclip self/virtual/plugin tools without the qualified connection-backed MCP shape do not cross this bridge.

Write/destructive/approval-bearing tools do not cross this V1 bridge. A Tool Gateway denial or approval requirement fails closed.

## Mastra execution boundary

The pinned Wandora dependency is `@mastra/core@1.66.0`.

Validation proved its relevant API contract:

- tools are configured on the `Agent`, not supplied per `generate()` call;
- the current generate path supports `structuredOutput`;
- a supervised run with read tools therefore receives a fresh ephemeral Mastra Agent containing only that run's authorized read tools;
- executions without read tools retain the pre-existing static Agent path.

The deterministic Mastra runtime does not use this Tool Gateway bridge. This preserves the existing disposable Paperclip→Core→deterministic-Mastra attestation and prevents an unnecessary tool-session dependency.

## Work/idempotency semantics

The bridge preserves the existing customer-work contract:

- a cached exact work result returns before any Tool Gateway session is opened;
- after a work execution is prepared, Tool Gateway resolution and model execution share the same failure boundary;
- if Tool Gateway resolution fails after preparation, the work is marked execution-uncertain;
- the bridge performs no retry of provider/tool effects.

## Security boundary

The candidate does not:

- persist Paperclip run JWTs;
- persist Tool Gateway tokens;
- resolve Paperclip secret plaintext in Wandora;
- place credentials/session tokens in prompts;
- expose arbitrary URLs, methods or provider credentials to the model;
- bypass Paperclip connection grants/policy;
- create a parallel tool catalog or grant model;
- authorize any write/external effect.

Tool results are treated as untrusted operational data, not as instructions that may modify policy or authorize effects.

## Validation

Reviewed implementation head:

```text
824c8af8c21097a8ecb5d4f53ca9c99aecc214bd
```

Exact-head workflows were **7/7 GREEN**:

- Core CI;
- Core Candidate Artifact;
- Paperclip Mastra Adapter CI;
- Paperclip OpenAPI Compatibility;
- Web CI;
- Platform Admin CI;
- Messaging Gateway CI.

Important proofs include:

- Core typecheck/build GREEN;
- complete Core functional suite GREEN;
- Tool Gateway bridge negative tests GREEN;
- run JWT appears only in session establishment and not list/call/model input;
- only connection-backed `risk=read` MCP descriptors cross the bridge;
- cached work skips Tool Gateway;
- post-preparation Tool Gateway failure marks work uncertain;
- Paperclip loader/runtime overlay GREEN against exact pinned source;
- disposable Paperclip→Core→Mastra E2E GREEN;
- deterministic Core candidate artifact/provenance GREEN.

No live VendaERP request or credential was used.

## SECOND ADVERSARIAL REVIEW

The implementation was corrected by three concrete negative findings before acceptance:

1. Direct native connector-runtime tools do not automatically reach `wandora_mastra`; the run-scoped Tool Gateway is the reusable external-runtime boundary.
2. The pinned Mastra API does not accept per-call `tools` or `experimental_output`; tools must live on an ephemeral Agent using the supported structured-output path.
3. Wiring the bridge into the deterministic runtime broke the existing disposable E2E; the bridge is therefore scoped only to `mastra-supervised-model`.

These corrections reduce rather than expand Wandora-owned operational surface.

## Decision

**GO FOR THE READ-TOOL BRIDGE CANDIDATE / CODE ONLY / NO PRODUCTION EFFECT.**

The qualified route is:

```text
Paperclip run JWT
→ Wandora independent run-identity verification
→ Paperclip Tool Gateway short-lived session
→ Paperclip policy-filtered connection-backed MCP read tools
→ ephemeral Mastra Agent tools
→ Paperclip Tool Gateway call
→ provider-neutral read result
```

Generic REST Tool Gateway remains **NO-GO** under ADR 0208.

Write/destructive tools and external effects remain outside this contract.

## Effect boundary

This slice performed no:

- production deployment;
- migration;
- Paperclip upgrade or source patch;
- ToolConnection creation;
- install/grant mutation;
- secret creation/rotation;
- real credential entry;
- VendaERP API request;
- production Mastra/model run;
- customer work;
- outbound effect.

## Next safe slice

**28PRO VendaERP Read-Only Connection Activation Preflight V1 — NO EFFECT**

That preflight must reconcile the real production/runtime state, prove the exact approved stdio template/install/grant/secret plan, and remain no-effect. Production connection/template/grant/secret creation or real VendaERP calls require a separately authorized execution slice.
