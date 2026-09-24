# ADR 0255 — VendaERP Safe Product-Shape Fingerprint MCP Production Promotion Execution V1

Status: **COMPLETE / PROMOTED / NO PROVIDER CALL / ZERO OUTBOUND**  
Date: 2026-09-24

## Objective

Promote ADR 0253's allowlisted product-list structural fingerprint into the live VendaERP read-only MCP using the ADR 0254 qualified file-only path, without calling VendaERP or any model provider.

The promotion must preserve Paperclip as operational authority and must not modify Connection/template/grant/install/profile/catalog state.

## Canonical entry

Repository:

    main =
    da54546b3df2636536c19fd8ed142beb1c1e5b33

    ADR 0254 / PR #333 =
    MERGED

    post-merge push workflows =
    4/4 GREEN
      Core CI
      Messaging Gateway CI
      Platform Admin CI
      Web CI

Exact candidate executable identity qualified by ADR 0254:

    server.mjs SHA-256 =
    67a42d84b2faf86dd7986967afd2e73dcd180bd357a7b64c327a482511edf303

    source marker content =
    18549a59a5fd82fe1efbe07902dbc189a3ceb609

    source marker SHA-256 =
    e436a3b5029d30e1614dfaeb2717153361759ee2fdf8fa972f957341c36e5a56

Frozen rollback identity:

    server.mjs SHA-256 =
    c740d1237374fe065907857465fe63ba6052ddb97096631fdb5ca94f90f9db9b

    source marker content =
    c697c9c803ac03dfafa52bf730a7e28c6191fda6

    source marker SHA-256 =
    a24786e3011ca0a28dc3840af50917b4787c857f60db84ef638f69fa812accb6

Runtime at entry remained:

    Paperclip =
    wandora/paperclip:v2026.916.0
    healthy / restart 0

    Core =
    wandora/core:organization-adapter-candidate-46741f8d82d0
    revision 46741f8d82d041b3f3cdde3d209c923e630db968
    healthy / restart 0

    Task Drain =
    OFF / quiescent

    activeRuns =
    0

    pendingWakes =
    0

    VendaERP activity =
    72 events
    sha256 6dc3de78ff954bcebda966f4daaa5d0847f369d28eb5f43e99f2bfffc2eb35fb

    work =
    2 total

    unfinished =
    1

    outbound =
    0

Ana remained truthfully:

    error / wandora_execution_failed_422

The ADR 0252 work remained truthfully execution_uncertain. Neither state was rewritten for this maintenance operation.

## Reconciled execution history

The chat response stream was interrupted during this slice, so execution history was reconciled from Remote Desktop Commander tool-call history before any operation was repeated.

The recovered sequence proves:

1. at 2026-09-24T10:36:36Z, Paperclip-native Task Drain was started successfully;
2. the returned state was:

       draining=true
       activeRuns=0
       pendingWakes=0
       quiescent=true
       expiresAt=2026-09-24T10:46:36.017Z

3. a later pre-swap helper noticed the already-active drain and failed closed instead of creating a duplicate drain;
4. at 2026-09-24T10:36:53Z, the exact candidate files were copied to temporary files inside the live host directory;
5. temporary file hashes were verified before rename;
6. both files were atomically renamed over the live directory entries.

No duplicate file promotion occurred.

This reconciliation is required by the permanent continuity rule: after interruption, verify whether the prior operation executed before repeating it.

## Atomic live promotion

Live host directory:

    /opt/wandora/stacks/paperclip/runtime-integrations/vendaerp-readonly-mcp

Temporary candidate files were created inside that same directory.

They were normalized to:

    owner/group =
    wandora-admin:wandora-ops

    mode =
    0444

Before rename:

    TEMP_HASHES_OK

The final live host state immediately after rename was:

    server.mjs =
    owner wandora-admin:wandora-ops
    mode 0444
    size 22040
    SHA-256 67a42d84b2faf86dd7986967afd2e73dcd180bd357a7b64c327a482511edf303

    WANDORA_SOURCE_COMMIT =
    owner wandora-admin:wandora-ops
    mode 0444
    size 41
    SHA-256 e436a3b5029d30e1614dfaeb2717153361759ee2fdf8fa972f957341c36e5a56
    content 18549a59a5fd82fe1efbe07902dbc189a3ceb609

The Paperclip read-only bind mount exposed the exact same hashes and marker.

No Paperclip or Core restart occurred.

## Live validation under Task Drain

After promotion, while Task Drain was still active/quiescent:

    host hashes =
    exact candidate hashes

    container hashes =
    exact candidate hashes

    active VendaERP stdio process =
    none

    Paperclip =
    healthy / restart 0

    Core =
    healthy / restart 0

The live mounted MCP was then validated using separate containers with:

    --network none

MCP discovery result:

    LIVE_DISCOVERY_OK tools=8 network=none

All eight tools remained read-only/non-destructive.

Synthetic structural fingerprint validation on the live mounted bytes passed:

    object-items-array=OK
    array-non-object=OK
    object-Message=OK
    null=OK
    string=OK
    object-other=OK
    LIVE_SAFE_SHAPE_OK network=none

These probes injected response values in memory. They did not reach the VendaERP network.

## Provider-call / outbound proof

Before and after live validation:

    VendaERP activity =
    72 events

    activity SHA-256 =
    6dc3de78ff954bcebda966f4daaa5d0847f369d28eb5f43e99f2bfffc2eb35fb

    work =
    2 total

    unfinished =
    1

    outbound =
    0

Therefore the maintenance slice created:

- no VendaERP provider call;
- no model call;
- no customer work;
- no outbound;
- no retry/successor lifecycle;
- no new policy/rate-limit counter.

## Task Drain completion

After all protected live validations passed, Task Drain was explicitly ended through the native Paperclip API.

The stop returned:

    wasActive=true

Final Task Drain readback:

    draining=false
    activeRuns=0
    pendingWakes=0
    quiescent=true

This was an explicit stop before TTL expiry, not passive expiration.

## Final production state

    VendaERP MCP live server.mjs SHA-256 =
    67a42d84b2faf86dd7986967afd2e73dcd180bd357a7b64c327a482511edf303

    source marker =
    18549a59a5fd82fe1efbe07902dbc189a3ceb609

    source marker SHA-256 =
    e436a3b5029d30e1614dfaeb2717153361759ee2fdf8fa972f957341c36e5a56

    Task Drain =
    OFF / quiescent

    activeRuns =
    0

    pendingWakes =
    0

    Paperclip =
    healthy / restart 0

    Core =
    healthy / restart 0

    VendaERP activity =
    72 events
    sha256 6dc3de78ff954bcebda966f4daaa5d0847f369d28eb5f43e99f2bfffc2eb35fb

    work =
    2

    unfinished =
    1

    outbound =
    0

    Ana =
    error / wandora_execution_failed_422

No template, Connection, grant, install, profile, catalog, secret, database schema or migration changed.

## Capability Authority / Reuse Gate

Authority remains:

- Paperclip owns Tool Gateway transport, Connection/template/grant/install/profile/catalog state, lifecycle, policy/rate-limit and audit.
- VendaERP MCP owns provider-specific parsing and safe structural classification.
- Wandora Core owns customer-work semantics.
- Mastra remains replaceable behind the Wandora-owned adapter/contract boundary.

No operational capability was internalized.

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## Second adversarial review

- Was work repeated merely because chat output was interrupted? **No. Tool history was reconciled first.**
- Was the Task Drain duplicated? **No. The second starter failed closed when it found the existing drain.**
- Were the files promoted twice? **No. History proves one atomic rename sequence only.**
- Exact candidate hashes live in host and container? **Yes.**
- Rollback had been frozen before mutation? **Yes.**
- Network disabled for live functional probes? **Yes.**
- Real provider call? **No.**
- Model call? **No.**
- Outbound? **No.**
- Parser broadened? **No.**
- Paperclip/Core restarted? **No.**
- Connection/template/catalog mutated? **No.**
- Ana/error-state force-reconciled? **No.**
- Final Task Drain OFF/quiescent? **Yes.**

## Decision

**COMPLETE / PROMOTED / NO PROVIDER CALL / ZERO OUTBOUND.**

The live VendaERP MCP now carries the allowlisted structural fingerprint from ADR 0253.

The next provider-facing diagnostic, if approved in a separate slice, must remain hard-budgeted and may use this safe `shape` evidence to determine the real 28PRO response envelope without persisting raw provider payload.
