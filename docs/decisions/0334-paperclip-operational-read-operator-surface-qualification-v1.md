# ADR 0334 — Paperclip Operational Read Operator Surface Qualification V1

Date: 2026-09-29

Status: **QUALIFIED IN CODE / 17/17 EXACT-HEAD CI GREEN / OPERATOR SURFACE NOT LIVE / FRESH OPERATIONAL SNAPSHOT STILL BLOCKED / READ-ONLY / NO VENDAERP / NO ATTESTATION OPEN / NO PRODUCTION MUTATION**

## Objective

Close the ADR 0333 operator-observability gap by qualifying the smallest safe read-only surface over the already Paperclip-owned `tools.operational.read`, without calling VendaERP, opening Semantic Fast Read attestation, extracting credentials, reading the Paperclip database, creating shadow state or promoting anything to production.

The target evidence remains:

- VendaERP Connection `active`;
- Connection `enabled`;
- Connection health `healthy` / `ok`;
- organization grant active;
- `installedForAgent=true`;
- `vendaerp_search_products` active;
- tool read-only;
- `isWrite=false`;
- `isDestructive=false`;
- `allowedByEffectiveProfile=true`.

This ADR qualifies the operator read boundary only. It does not claim that the fresh production snapshot has already been observed.

## REAL NOW

Fresh final reconciliation proved:

- `main` remains PR #369 base `8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 is open, draft and mergeable;
- exact pre-documentation source head is `26c8e190916fb0b6ded1196d94604882776f2a41`;
- **17/17 workflows are GREEN** at that head;
- Core is healthy;
- Paperclip is healthy;
- Messaging Gateway is healthy;
- Task Drain = `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- Core reports `fastReadExecution=false`, `semanticFastRead=false`, `humanSendProposal=false`;
- Gateway reports `outboundEnabled=false`;
- exactly one live `wandora.organization-adapter-v1@0.5.0` is `ready`, `lastError=null`.

No ambiguous prior production operation existed to retry. The code changes in this slice are repository-only.

## PROVEN EVIDENCE

### Existing safe provider-native building blocks

The ADR 0333 gap was rechecked rather than assumed.

The current Remote-Ops MCP schema still has no direct operational-snapshot read capability. The Paperclip CLI likewise has no direct `tools operational read` command.

However, pinned Paperclip already exposes an authenticated plugin data bridge:

- `POST /api/plugins/:pluginId/data/:key`;
- worker `ctx.data.register(...)` / `getData`;
- CLI `paperclipai plugin data`.

Pinned source proves that this bridge is not a generic unauthenticated data route:

1. the server requires Board organization access;
2. the bridge resolves/validates company scope through Paperclip authz;
3. a provided company id must pass `assertCompanyAccess`;
4. the host sends the authorized company id to the worker;
5. worker `handleGetData` merges caller params first and host `companyId` afterwards, so host scope wins over a caller-supplied duplicate.

Paperclip therefore already owns the authentication and tenant-boundary mechanics required for this operator read. No new Remote-Ops capability, Paperclip API subsystem or HMAC bypass is needed.

### Existing operational authority

The already-qualified Paperclip host extension exposes:

`ctx.toolAccess.readOperationalSnapshot({ companyId, agentId })`

The Organization Adapter already declares `tools.operational.read` and already consumes that snapshot for the semantic employee-capabilities projection. Paperclip remains the authority that derives the Connection, grant, install, catalog/profile and runtime-health evidence.

The host operational read is cache-only for catalog data and does not refresh/call the connected VendaERP provider.

### Fresh Tool Policy qualification

The governed Paperclip policy test for Ana/28PRO `vendaerp_search_products`, supplied with provider-owned Connection/Catalog context, remains:

- `decision=allow`;
- `reasonCode=allow_profile`;
- `allowed=true`;
- effective profile `259a5449-58ba-4d59-9774-92612e3caa91`;
- `matchedPolicyIds=[]`;
- `auditEvent=null`.

Company Tool Policies remain `[]`.

The qualification capability forces `consumeRateLimit=false` and `writeAuditEvent=false`; no temporary allow policy was created.

## GAPS

ADR 0333's observability gap was real, but it did **not** justify duplicating provider state.

The remaining post-qualification gap is now narrower:

- the safe read surface is qualified in repository source/CI;
- it is **not installed in the live OA**;
- therefore the fresh production snapshot cannot yet be read;
- package identity/version for a future promotion must be resolved explicitly before any install.

A read-only live probe confirms the current production OA does not expose the new key:

`paperclipai plugin data <live-plugin-id> operational-read ...`

returns:

`502 No data handler registered for key "operational-read"`.

That result is expected and is evidence that no promotion accidentally occurred.

## CAPABILITY AUTHORITY / REUSE GATE

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

Authority remains:

- **Paperclip**: Connections, installs, organization grants, Tool Catalog, profiles/policies, runtime health, Tool Gateway authorization/audit;
- **Organization Adapter**: bounded provider-neutral/operational projection across the existing adapter boundary;
- **Wandora**: semantic authority and effect authorization.

This slice did **not** create:

- Wandora integration registry;
- Connection mirror;
- install/grant mirror;
- catalog/profile mirror;
- operational cache;
- table/migration;
- state machine;
- lifecycle subsystem;
- secret manager;
- policy engine;
- execution/tool subsystem;
- provider refresh path;
- new Remote-Ops operational-state authority.

The new data handler directly projects current Paperclip-owned read evidence and persists nothing.

## DECISION

Reuse the existing Paperclip plugin data bridge as the operator-facing transport and add exactly one bounded Organization Adapter data key:

`operational-read`

The handler:

- requires a non-empty host-authorized `companyId`;
- rejects additional caller selectors;
- resolves the existing fixed managed catalog employee `ana-commercial-v1`;
- calls the existing `ctx.toolAccess.readOperationalSnapshot({companyId, agentId})`;
- filters to already adapter-mapped business-system tools;
- returns only allowlisted fields:
  - `runtimeHealth`;
  - Connection `displayName`, `status`, `enabled`, `healthStatus`, `organizationGrantActive`, `installedForAgent`;
  - tool `toolName`, `status`, `riskLevel`, `isReadOnly`, `isWrite`, `isDestructive`, `allowedByEffectiveProfile`.

It does not return Connection IDs, Catalog IDs, grant/profile IDs, provider tenant IDs, raw catalog/profile/grant objects, credential material, secret refs or arbitrary provider metadata.

The existing signed `employee-capabilities` and `employee-fast-read` webhook contracts remain unchanged.

## SECOND ADVERSARIAL REVIEW

The first independent JEV review requested `deep_review=0.82`, correctly forcing explicit proof of:

- Board/company authorization;
- company-scope anti-spoofing;
- whether `ctx.data` is smaller than adding a scoped API/MCP boundary;
- whether the projection would duplicate Paperclip state.

After source-level proof of the pinned Paperclip bridge, the focused re-review returned:

- `proceed_fast=0.95`;
- `deep_review=0.04`;
- `block=0.01`;
- confidence `0.94`.

After final CI exposed the package-version guard, a last boundary review favored separating promotion from qualification:

- `split_task=0.40`;
- `proceed_fast=0.36`;
- `block=0.19`;
- `deep_review=0.05`;
- confidence `0.20`.

The low-confidence model review does not override deterministic repository evidence. The canonical version gates and non-live readback make the stop boundary explicit.

## EXECUTION

Repository-only implementation on PR #369:

- added the bounded operational projection;
- registered the `operational-read` plugin data handler;
- added tests proving field allowlisting, mapped-tool filtering, fixed Ana resolution and caller-param rejection;
- added a pinned-Paperclip source verifier proving Board/company auth and host-scope overwrite;
- integrated that verifier into Organization Adapter package verification;
- documented the operator-read qualification in the OA README.

No production container, plugin, Connection, install, grant, catalog, profile, Tool Policy, Task Drain, Core gate, Gateway outbound or customer/provider state was changed.

No VendaERP, TypeSafe/System One, Mistral production, Human Fast Read or customer work call occurred.

## VALIDATION

Exact pre-documentation head:

`26c8e190916fb0b6ded1196d94604882776f2a41`

completed **17/17 workflows GREEN**, including:

- Organization Adapter Plugin CI;
- Integration Capability Projection CI;
- Semantic Fast Read CI;
- Core CI;
- Core Candidate Artifact;
- Paperclip Host Operational Read Extension CI;
- Paperclip Fast Read Patch Composition CI;
- Paperclip Synchronous Webhook Response CI;
- Paperclip Fast Read Run Result Read CI;
- Paperclip Fast Read Production Candidate CI;
- Paperclip OpenAPI Compatibility;
- Paperclip 916.1 OpenAPI Candidate CI;
- Paperclip Mastra Adapter CI;
- VendaERP Read-Only MCP CI;
- Messaging Gateway CI;
- Platform Admin CI;
- Web CI.

One implementation correction is intentionally preserved as evidence. A tentative OA package/manifest bump from `0.5.0` to `0.6.0` caused the existing OpenAPI compatibility and Paperclip production-candidate gates to fail because the canonical package pin is `0.5.0`. The version bump was reverted without weakening or bypassing those gates. The corrected head then completed 17/17 GREEN.

Final runtime readback remains inert and healthy:

- Core/Paperclip/Gateway healthy;
- Task Drain false/0/0/quiescent;
- Fast Read OFF;
- Semantic Fast Read OFF;
- Human Send OFF;
- Gateway outbound OFF;
- exactly one live OA 0.5.0 ready.

The production `operational-read` probe still fails with `No data handler registered`, proving the source qualification is not live.

## DOCUMENTATION / HARD STOP

This ADR records **operator-surface qualification only**.

It does not authorize:

- OA packaging/version mutation;
- OA production promotion;
- Semantic Fast Read attestation;
- custody/attestation overlays;
- Fast Read/Semantic Selector activation;
- Human Send/outbound;
- VendaERP/provider execution;
- customer work.

The qualified source must not be installed over the live `0.5.0` package merely by assuming same-version byte replacement is safe.

## NEXT BOUNDARY

Start a new slice:

**Organization Adapter Operational Read Surface Packaging + Promotion Qualification V1 — PACKAGE IDENTITY / READ-ONLY / NO VENDAERP / NO ATTESTATION OPEN**

That slice must:

1. freshly reconcile repo/PR/runtime;
2. resolve immutable package identity/version and exact artifact provenance without weakening the current canonical guards;
3. perform its own Capability Authority / Reuse Gate;
4. receive a fresh second adversarial review;
5. only then consider a separately reviewed production promotion of the operator-read surface with all effect gates OFF;
6. validate exactly one intended OA instance ready after promotion;
7. perform only the fresh bounded `operational-read` read;
8. stop again before Semantic Fast Read attestation.

Only a later slice, after the live snapshot proves the required Connection/grant/install/tool flags, may decide whether Semantic Fast Read attestation can resume.
