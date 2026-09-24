# ADR 0243 — 28PRO VendaERP Canonical Customer-Work One-Shot Product Read Execution V1 — Owner Session Gate Safe Stop

Status: **SAFE STOP / OWNER SESSION REQUIRED / NO PROVIDER CALL / NO PRODUCTION MUTATION**  
Date: 2026-09-24

## Objective

Execute the ADR 0242 bounded READ-ONLY proof through the canonical Wandora customer-work path, with at most one `vendaerp_search_products({"pageSize":5,"skip":0})` provider dispatch.

This ADR records the truthful outcome of the execution attempt: the slice stopped before the first production mutation because the canonical work-admission boundary requires a genuine authenticated 28PRO owner session that was not available to this execution channel.

## REAL NOW

Repository:

```text
main = 3e8fcacd2e1a68fbf0a1e7cf75cffe798f3069fe
PR #315 = MERGED
open PRs = 0
post-merge workflows = 4/4 GREEN
```

Runtime revalidated before effect:

```text
Paperclip = wandora/paperclip:v2026.916.0
Paperclip health = healthy
Paperclip restart = 0

Core = wandora/core:organization-adapter-candidate-4a54b5d8f14c
Core revision = 4a54b5d8f14c469989fad277189f6ebdfb8fb1f0
Core health = healthy
Core restart = 0

Ana Paperclip =
  id 428b6730-3df4-4b92-b90a-a87f87c401f9
  idle / wandora_mastra

vendaerp_search_products =
  catalogEntryId 165fcdca-8021-41dd-90e5-f0f143adeac3
  active / risk=read

Task Drain =
  draining=false
  activeRuns=0
  pendingWakes=0
  quiescent=true

temporary block/rate-limit policies = 0
28PRO work operations = 0
28PRO outbound attempts = 0

VendaERP activity =
  events=68
  sha256=47de715854412222801f1f03c89b27d28ab64d0c2a5e824e04453539900e0c36
```

The exact product-read intent remains the ADR 0220/0242 bounded request:

```text
Consulte o VendaERP e mostre até 5 produtos do catálogo
com as informações comerciais básicas disponíveis.

tool = vendaerp_search_products
parameters = {"pageSize":5,"skip":0}
```

## Proven identity boundary

The live Core customer-work route is:

```text
POST /api/v1/organizations/:organizationId/digital-employees/:employeeId/work
```

Its canonical implementation requires:

```text
Authorization
-> HumanSupervisionReadService.getSessionContext(...)
-> session.user.id
-> OrganizationAdapterService.ensureCatalogEmployeeWork(actorUserId=...)
```

The route accepts only the bounded `title` + `description` body plus a stable `Idempotency-Key`.

A no-session request was deliberately used only as a structural probe and returned:

```text
HTTP 401
{"error":"unauthorized"}
```

No work was created.

This confirms that private Core/network access is not authority to create customer work.

## Capability Authority / Reuse Gate

Authority is unchanged:

- **Wandora** owns customer-work semantic authorization, actor/tenant identity, idempotency and durable result semantics.
- **Paperclip** owns Task Drain, Tool Gateway policy, rate-limit counter, issue/run lifecycle, audit and MCP dispatch.
- **Mastra** owns only the ephemeral supervised model/tool loop.
- **VendaERP MCP** owns bounded read translation to the provider.

ADR 0168 remains binding:

> **Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.**

No new capability is required.

## Second adversarial review

The review asked whether the absence of an owner browser session could be bypassed safely.

Rejected:

1. minting an owner JWT with Auth/admin authority;
2. extracting/persisting a customer's session token merely to make the proof green;
3. using Supabase service-role impersonation;
4. inserting the work directly in PostgreSQL;
5. calling Organization Adapter directly as operator;
6. creating a synthetic Paperclip issue instead of canonical Wandora customer work.

Those approaches conflict with the already accepted customer-work authorization boundary, including ADR 0139, ADR 0161 and ADR 0207.

The legitimate effect must remain:

```text
genuine authenticated customer/owner
-> Wandora Web/Core customer-work contract
-> actorUserId derived from the human session
-> Organization Adapter
-> Paperclip
```

## Why Task Drain and policies were not installed

ADR 0242 requires the temporary guards to be active before admission, then Task Drain to be released and the single canonical customer work submitted immediately.

At this execution point there was no genuine 28PRO owner session ready to submit the work.

Installing:

- the seven-tool `block` policy; and
- the product `rate_limit=1`

would therefore create temporary production control-plane state with no safe way to complete the bounded execution window in the same transaction-like operational sequence.

The fail-closed choice was to stop **before** Task Drain and policy mutation.

## Production effects

None.

Specifically:

- no Task Drain start/stop;
- no temporary policy creation;
- no rate-limit counter;
- no customer work;
- no Paperclip issue;
- no wakeup;
- no run;
- no Mastra execution;
- no Mistral/model call;
- no Tool Gateway provider dispatch;
- no VendaERP HTTP request;
- no outbound effect;
- no migration;
- no runtime restart/replacement;
- no connection/grant/secret/profile/catalog mutation.

## Final validation

Final readback still showed:

```text
Task Drain OFF / quiescent
activeRuns=0
pendingWakes=0
temporary policies=0
Ana=idle / wandora_mastra
vendaerp_search_products=active / read
VendaERP activity=68 / same SHA-256
Paperclip healthy / restart 0
Core healthy / restart 0
```

The already-observed Wandora 28PRO work/outbound baseline remained `0/0`; no successful work-admission response occurred in this slice.

## Decision

**SAFE STOP / OWNER SESSION REQUIRED / NO PROVIDER CALL / NO PRODUCTION MUTATION.**

ADR 0242 remains valid and is not superseded. Its hard one-call budget is still the required execution guard.

The next attempt must not become another generic preflight. It is the same bounded execution, but it must begin only when a genuine authenticated 28PRO owner session is ready at the normal Wandora customer-work surface.

The coordinated order remains:

1. reconcile exact main/runtime and require zero drift;
2. require the owner session already ready;
3. Task Drain ON/quiescent;
4. install seven-tool block policy;
5. install product `rate_limit=1`;
6. dry-run policy matrix with `consumeRateLimit=false`;
7. prove counter unconsumed and drain still quiescent;
8. Task Drain OFF;
9. immediately submit exactly one owner-originated canonical customer work;
10. no retry/manual wake/duplicate work;
11. allow at most one product provider dispatch;
12. capture authoritative rate counter and VendaERP activity before cleanup;
13. delete only temporary policies;
14. validate no live run/pending wake/outbound drift;
15. STOP.

No password, refresh token, bearer token or secret should be copied into ADRs, chat or Git.
