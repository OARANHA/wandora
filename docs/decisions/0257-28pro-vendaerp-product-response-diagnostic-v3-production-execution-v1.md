# ADR 0257 — 28PRO VendaERP Product Response Diagnostic V3 Production Execution V1

Status: **SAFE STOP / NO EFFECT / PAPERCLIP BOARD AUTH VALIDATED / GOVERNED API GAP / OWNER SESSION REQUIRED / NO PROVIDER CALL**
Date: 2026-09-24

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
