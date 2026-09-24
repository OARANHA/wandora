# ADR 0257 — 28PRO VendaERP Product Response Diagnostic V3 Production Execution V1

Status: **SAFE STOP / NO EFFECT / OWNER SESSION REQUIRED / NO PROVIDER CALL**  
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
- Provider/model/outbound call performed? **No.**
- Task Drain or temporary policies created? **No.**
- Historical Ana/work state rewritten? **No.**

## Decision

**SAFE STOP BEFORE EFFECT.**

The hard-budget design remains GREEN, but ADR 0257 cannot start the protected mutation sequence until a genuine 28PRO owner browser session is available for the canonical POST.

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
