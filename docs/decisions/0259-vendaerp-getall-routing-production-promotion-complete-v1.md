# ADR 0259 — VendaERP GetAll Routing Production Promotion Complete V1

Status: **COMPLETE / PROMOTED / NO PROVIDER CALL / ZERO OUTBOUND**
Date: 2026-09-25

## Objective

Promote the ADR 0258 VendaERP read-only MCP bytes to the existing Paperclip bind mount without calling VendaERP.

## Proven runtime state

Before effect:
- Wandora main = aa82d08b2ef1399e5c2fda8751bf769bc806444c
- live MCP server SHA-256 = 67a42d84b2faf86dd7986967afd2e73dcd180bd357a7b64c327a482511edf303
- candidate SHA-256 = 25c740fd94ae3fb052b7177eae0a34be25e04deab9a0392a70e9de2696e9cb26
- Paperclip/Core healthy
- Task Drain OFF/quiescent

Second adversarial review approved replacing only the stack-local MCP source under Task Drain.

## Execution

Task Drain was started with bounded TTL and reached:
- draining=true
- activeRuns=0
- pendingWakes=0
- quiescent=true

The broker could not write the bind-mount path because the filesystem was read-only from that execution context. The owner performed the minimum sudo copy of the exact candidate bytes and source marker.

Post-effect:
- live MCP server SHA-256 = 25c740fd94ae3fb052b7177eae0a34be25e04deab9a0392a70e9de2696e9cb26
- WANDORA_SOURCE_COMMIT = aa82d08b2ef1399e5c2fda8751bf769bc806444c
- live source contains filtered /api/request/Produtos/Pesquisar and unfiltered /api/request/Produtos/GetAll routing
- Paperclip healthy
- Core healthy
- no Paperclip/Core restart was required
- no Tool Gateway/provider/model/outbound call occurred during promotion

Task Drain was stopped and final state is OFF/quiescent with activeRuns=0 and pendingWakes=0.

## Capability authority

Only the replaceable VendaERP MCP adapter changed. Connection/grant/secret/profile/catalog state remained untouched. ADR 0168 remains preserved.

## Next

A separate bounded customer-work execution may now validate Ana through the normal path using the existing vendaerp_search_products capability. The execution should retain a one-call guard and no retry.
