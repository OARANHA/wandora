# ADR 0260 — 28PRO Ana VendaERP Product Read Success V1

Status: **COMPLETE / NORMAL FLOW SUCCESS / ONE TOOL CALL / ZERO RETRY / ZERO OUTBOUND**
Date: 2026-09-25

## Objective

Validate that Ana can perform a real customer product read through the normal production path after ADR 0258/0259:

Wandora -> Paperclip -> Ana/Mastra -> Tool Gateway -> VendaERP.

## Preconditions

- Wandora main included ADR 0258 GetAll routing.
- Live VendaERP MCP hash matched the promoted candidate.
- Paperclip and Core were healthy.
- Task Drain was OFF/quiescent.
- No temporary policies were present.

## Guarded execution

Temporary Paperclip-native guards were installed under Task Drain:

- block the seven non-product VendaERP tools for Ana on the active connection;
- rate_limit=1 for Ana + active VendaERP connection + product catalog entry + vendaerp_search_products.

Dry-run policy qualification used consumeRateLimit=false and writeAuditEvent=false:
- seven alternate tools = denied by block policy;
- vendaerp_search_products = allowed.

Task Drain was then stopped before owner submission.

The owner submitted exactly one normal Wandora customer work requesting:
- only vendaerp_search_products;
- exactly pageSize=5 / skip=0;
- no name/code/category/brand/EAN filters;
- no second attempt.

## Proven execution

Paperclip run:
- runId = dd8fcd32-278e-446f-8fb5-de2a1a0d67b1
- issue = PRO-17 / b6b17757-9f9b-4895-a83d-af976350c4d5

Paperclip logs prove exactly one POST /api/tool-gateway/tools/call for the run.

Safe Tool Connection activity proves exactly two matching events:
- policy_decision: allow / allow_profile / success
- call_completed: allow / tool_completed / success

No errorCode or provider diagnostic was present.

The issue reached status=done with no blocker and no scheduled retry.

Ana's final issue comment returned five real products:

1. Produto EXEMPLO — code 1 — sale price R$ 14,50 — stock 10
2. Serviço EXEMPLO — code 2 — sale price R$ 14,50 — stock 10
3. PREMIUM PLUS — code 3 — sale price R$ 890,00 — stock 0
4. USUÁRIO ADICIONAL — code 4 — sale price R$ 48,00 — stock 0
5. EMISSÃO NFSE — code 5 — sale price R$ 0,00 — stock 0

Core recorded normal supervised model usage and no execution error.

## Cleanup

Both temporary policies were deleted.

Final state:
- Tool Policies = []
- Task Drain OFF
- activeRuns = 0
- pendingWakes = 0
- quiescent = true
- zero retry
- zero outbound

## Decision

The 28PRO Ana product-read path is now proven operational end-to-end for the existing vendaerp_search_products capability.

Future endpoint/schema questions for VendaERP must use the authoritative VendaERP Swagger at https://cw.vendaerp.com.br/api/swagger/index.html and its v1/swagger.json. If that authority is ambiguous, ask the owner before inferring provider behavior.
