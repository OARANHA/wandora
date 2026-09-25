## 2026-09-24 — governed operator runtime reconciliation

Fresh-session runtime reconciliation proves the Remote-Ops-MCP schema and read/qualification path are now operational:

- governed `docker_exec` to `wandora-paperclip` + `paperclipai` is operational; `paperclipai --version` returns `0.3.1`;
- `paperclip_task_drain_status` returns Task Drain OFF, quiescent, activeRuns=0, pendingWakes=0;
- `paperclip_tool_policies_list` returns no current 28PRO policies;
- `paperclip_tool_policy_test` for Ana + the active VendaERP connection/catalog entry + `vendaerp_search_products {"pageSize":5,"skip":0}` returns `allow / allow_profile` with no audit event.

This removes the earlier stale-session/schema and read-only semantic capability gap.

Production execution remains **NO-GO / NO EFFECT** for a narrower reason: this operator session exposes no governed mutation capability for Task Drain start/stop or Tool Policy create/delete, and the official `paperclipai 0.3.1` CLI exposes no public command for those mutations. Generic HTTP/container shell, protected auth-store reads, DB writes or Board-key bypass remain forbidden by this ADR.

The independent canonical owner-session gate also remains unresolved: the customer-work POST still requires a normal authenticated human owner Bearer session. Temporary guards must not be installed while either gate is unresolved.

No Task Drain mutation, policy mutation, provider/model call, rate-limit consumption, customer work or outbound occurred during this reconciliation.

# ADR 0257 — 28PRO VendaERP Product Response Diagnostic V3 Production Execution V1

Status: **COMPLETE / EXECUTED / EXACT SAFE DIAGNOSTIC = invalid-provider-response / product-list-shape / shape=null / ONE PROVIDER CALL / ZERO RETRY / ZERO OUTBOUND**
Date: 2026-09-24


## Production execution result — 2026-09-25

The previously documented SAFE STOP gates were later resolved without bypassing the accepted trust boundaries:

- governed Remote-Ops-MCP Paperclip capabilities were implemented behind the existing operational adapter boundary and promoted after canonical review/CI;
- a genuine authenticated 28PRO owner session submitted exactly one customer work through the normal Wandora route;
- temporary Paperclip block/rate-limit guards were installed only for the bounded execution and removed afterward.

The admitted run was:

`d6ec458f-31ce-43f6-a2ae-60da58ac1c32`

Paperclip request logs prove exactly one:

`POST /api/tool-gateway/tools/call`

for that run, with no second Tool Gateway call in the relevant execution window. The completed tool invocation is `7ba22b32-4884-4ab3-8924-1a54a25c0d71`.

Official Paperclip activity for Ana proves:

- Connection: `8e2c23f4-73f5-444a-8647-71428819ea91`;
- Catalog Entry: `165fcdca-8021-41dd-90e5-f0f143adeac3`;
- upstream tool: `vendaerp_search_products`;
- arguments: `{"pageSize":5,"skip":0}`;
- Tool Gateway outcome: `call_completed / success / tool_completed`;
- safe provider diagnostic: `invalid-provider-response / product-list-shape / shape=null`.

The exact safe structural classifier therefore resolves the ADR 0256 uncertainty: the live provider response reached the parser as JSON `null` at the list-shape gate. This is not a direct product array and is not the `product-name-missing` path.

The safe Tool Connection readback initially returned zero matches when filtering by upstream name `vendaerp_search_products`. Reconciliation proved Paperclip persists the Tool Gateway event name as the namespaced descriptor `mcp.wandora-vendaerp-readonly-v1-8e2c23f4:vendaerp-search-products`. Using that persisted name returns exactly two events for the run: `policy_decision allow/allow_profile` and `call_completed success/tool_completed`.

Both persisted Tool Call events expose `rateLimitState=null`; no numeric counter is therefore asserted from this readback. The hard one-call proof instead rests on the execution-specific policy design plus the single Tool Gateway call/no-retry evidence. No further provider call was made to recover evidence.

Final reconciliation after cleanup:

- Task Drain OFF;
- quiescent=true;
- activeRuns=0;
- pendingWakes=0;
- Tool Policies=[];
- Paperclip healthy;
- Core healthy;
- no additional provider/model/outbound call during readback or documentation.

Remote-Ops-MCP support used for governed evidence recovery is canonical in its own repository: PR #23 introduced `paperclip_tool_connection_activity_safe`; PR #24 aligned its read window with Paperclip's official max 100 and passed CI. A duplicate PR #25 created after interruption was reconciled and closed without merge.

### Final decision

ADR 0257 is **COMPLETE**.

The next slice is a parser-compatibility decision based on proven `shape=null`. It must not assume that documented direct-array evidence describes this live failure. Any parser change must remain in the replaceable VendaERP provider adapter, pass the Capability Authority / Reuse Gate, receive a second adversarial review, and preserve fail-closed behavior. No new provider call is authorized by this ADR.


## Objective

Execute one bounded 28PRO `vendaerp_search_products` diagnostic with the ADR 0255 safe `code/reason/shape` observability, using the Paperclip-native hard one-provider-call budget and preserving zero outbound.

The intended effect budget remains:

- exactly one `vendaerp_search_products({"pageSize":5,"skip":0})`;
- exactly one real VendaERP HTTP GET;
- zero retry;
- zero second tool;
- zero second provider call;
- zero outbound;
- persist only allowlisted `code`, `reason`, `shape`.

## REAL NOW reconciliation

Remote Git readback through the authorized `wandora-agent` deploy-key path proved:

```text
refs/heads/main =
bbca752b5d2f2b952e88b63b73322cba52678702
```

The operational checkout is on that exact commit.

Runtime readback through `@MCP_WANDORA_VPS` proved:

```text
Paperclip = wandora/paperclip:v2026.916.0
Core      = wandora/core:organization-adapter-candidate-46741f8d82d0
Web       = wandora/web:candidate-0a7f36833188
Gateway   = wandora/messaging-gateway:origin-fix-94cfb4de

Paperclip/Core/Web/Gateway = running + healthy
```

ADR 0255 / ADR 0256 evidence remains authoritative for the live VendaERP MCP structural classifier and for the hard-budget design.

### Paperclip operator-auth reconciliation

The governed `wandora-agent` Docker exec boundary now permits only `wandora-paperclip` + `paperclipai`. The official CLI executed successfully inside the live Paperclip container:

```text
paperclipai version = 0.3.1
source               = board_key
isInstanceAdmin      = true
28PRO membership     = owner / active
28PRO company        = 5d7ec217-118c-4292-8136-0a9ab16926ea
keyId                = 97334a78-a4cc-480e-8b6b-62763b4ab3bb
```

The protected credential store remained in place and was not read, copied, exported or printed. The token never appeared in argv, environment output, Git or chat.

Pinned CLI/source inspection proves Paperclip v0.3.1 does **not** expose public CLI commands for `GET /api/companies/:companyId/tools/policies`, `POST /api/companies/:companyId/tools/policy/test`, or `GET /api/instance/task-drain`, and it exposes no generic authenticated API-request command. Those server routes remain official Paperclip APIs, but using them through this operator boundary still requires a governed capability that preserves the protected Board credential without reading/exporting the auth store.

## Capability Authority / Reuse Gate

No new Wandora limiter, retry engine, lifecycle state, response store, table, migration or scheduler is justified.

Authority remains:

- Paperclip: Task Drain, Tool Gateway policy/rate-limit, lifecycle and governed activity;
- VendaERP MCP: provider-specific request/response parsing and safe structural classification;
- Wandora Core: customer-work authorization and durable business semantics;
- Mastra: replaceable runtime execution.

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

## Execution gate discovered before any mutation

The canonical customer-work route is:

```text
POST /api/v1/organizations/:organizationId/digital-employees/:employeeId/work
```

Fresh source readback proves the route calls:

```text
service.getSessionContext(request.authorization)
```

before customer-work admission and uses the verified human session user id as `actorUserId`.

The human token verifier requires:

```text
Authorization: Bearer <valid Supabase human access token>
```

and fails closed when the token is absent.

No operator/service route exists in this customer-work contract. Creating the work by direct database write, forged actor id, service-role/admin impersonation, plugin-internal bypass, or secret extraction would violate the accepted authorization boundary and is not permitted by this execution slice.

The `wandora-agent` target has no authorized human browser Bearer session available to the execution broker.

## Second adversarial review

- Can the diagnostic be performed by calling the Tool Gateway directly and still satisfy this ADR? **No.** That would bypass the requested canonical legitimate customer-work lifecycle.
- Can the owner identity be synthesized from the known Wandora user id? **No.**
- Can a Supabase service/admin credential stand in for the human Bearer session? **No.**
- Can the browser session be extracted from server containers? **No.** Browser session material is not a server-side credential surface and secret-custody controls must not be bypassed.
- Should temporary Paperclip guards be installed while the owner-session gate is unresolved? **No.** Do not leave production policies active awaiting an external manual step.
- Should the sole provider slot be consumed through another path merely to obtain `shape`? **No.**
- Should `curl`, `node`, arbitrary shell, direct `auth.json` reads, DB access or a second auth subsystem be introduced merely to reach the three Paperclip control-plane routes? **No.** The missing capability must remain narrow, governed and Paperclip-official.
- Is the existing Board credential itself still a blocker? **No.** It was freshly validated via official `paperclipai auth whoami`, with instance-admin authority and active owner membership in 28PRO.
- Provider/model/outbound call performed? **No.**
- Task Drain or temporary policies created? **No.**
- Historical Ana/work state rewritten? **No.**

## Decision

**SAFE STOP BEFORE EFFECT.**

The hard-budget design remains GREEN. Paperclip operator identity is no longer an unknown: the protected Board key is valid and instance-admin. The current control-plane blocker is narrower: the governed operator boundary still lacks a non-secret, allowlisted way to invoke the three official Paperclip routes required to read/qualify Task Drain and Tool Policy without exposing the Board token. The genuine 28PRO owner browser session remains a separate later gate for the canonical customer-work POST.

### Governed capability decision after second review

A temporary Paperclip-CLI source candidate was explored only in an isolated workspace and was **not promoted**. Validation was abandoned after the execution broker repeatedly restarted while installing the Paperclip monorepo dependencies under an unsupported host Node 18 runtime (Paperclip requires Node >=24.11). A separate loose `adr0257-paperclipai-candidate` wrapper was discovered in the operational workspace; live `paperclipai ops:task-drain-status` proved it is **not installed**. It is not authoritative and was not executed as an operator path.

The selected boundary is instead the existing `remote-ops-mcp` operational control plane: add three explicit semantic capabilities that proxy only Paperclip's official APIs using the already-protected Board credential inside `wandora-paperclip`:

- Task Drain status read (`GET /api/instance/task-drain`);
- company Tool Policy list (`GET /api/companies/:companyId/tools/policies`);
- Tool Policy read-only qualification (`POST /api/companies/:companyId/tools/policy/test`) with `consumeRateLimit=false` and `writeAuditEvent=false` enforced server-side by the capability.

Rejected alternatives remain: generic HTTP proxy, arbitrary container `node`/`curl`/shell, direct auth-store reads, new Board keys, Paperclip database access, or a Wandora-owned duplicate policy subsystem.

Current `remote-ops-mcp` canonical source was reconciled at `65fc66d781090308d4d4a8dddc305f0bf4dc4474`. Its governed Docker exec path is already narrow and working. However this target has read-only anonymous HTTPS access to `OARANHA/remote-ops-mcp` but no authenticated GitHub write credential: a `git push --dry-run` fails before mutation with `could not read Username for 'https://github.com'`. Therefore no unversioned production hotfix is permitted; the capability change must first be committed/pushed to that repository and pass its normal build/test path.

The required operator intervention is minimal and contains no secret disclosure:

1. establish/confirm a normal authenticated 28PRO owner session in the Wandora Web;
2. do **not** submit a customer work yet;
3. return control to this slice.

After that gate is available, execute the frozen sequence without variation:

```text
reconcile
-> Task Drain ON/quiescent
-> install 7-tool block + product rate_limit=1
-> dry-run matrix consumeRateLimit=false
-> prove remaining=1
-> Task Drain OFF
-> exactly one canonical owner customer work
-> capture code/reason/shape
-> prove counter 1->0 and exactly one provider GET
-> prove no retry/other tool/outbound
-> delete only temporary policies
-> final Task Drain OFF/quiescent
-> STOP
```

Do not broaden the parser or change PascalCase handling in this slice.
