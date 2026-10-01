# ADR 0378 — Semantic Fast Read Owner-Browser Single Real Canary Execution V3

Date: 2026-10-01

Status: **ACCEPTED / SINGLE REAL CANARY = SUCCESS / EXACTLY ONE OWNER-BROWSER REQUEST / EXACTLY ONE GOVERNED VENDAERP READ**

## Context

This checkpoint executes the separately governed single real canary authorized only after fresh REAL NOW reconciliation under ADR 0168, ADR 0369, ADR 0375, ADR 0376 and ADR 0377.

The frozen customer request was exactly:

`Qual é o preço do produto PREMIUM PLUS?`

The enrolled scope remained exactly one Wandora organization/employee pair and one BusinessCapability:

- organization: 28PRO `7a531811-9fea-4395-b0b2-2e2b0fce0570`;
- employee: Ana `7b401163-8102-42db-b595-3a2017f54003`;
- Paperclip company: `5d7ec217-118c-4292-8136-0a9ab16926ea`;
- Paperclip Ana: `428b6730-3df4-4b92-b90a-a87f87c401f9`;
- VendaERP Connection: `8e2c23f4-73f5-444a-8647-71428819ea91`;
- BusinessCapability: `business.products.price`;
- expected provider tool: `vendaerp_search_products`.

No rollout expansion, provider bypass, lifecycle repair, Human Send, Messaging Gateway outbound, migration, new subsystem or PR merge was authorized.

## REAL NOW and deterministic gates

Immediately before effect:

- live `refs/heads/main` = `e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #378 head = `b2270175e5379d52f52b26d1a2d9d534f18a6693`;
- `refs/pull/378/merge` = `7a9eac0abc149ff1f84f442902fdeb2bf7173b40`;
- merge parents were frozen base `c78266bb08c2d903d942d0ad87d6cb03438811a4` + PR head; the frozen base itself parents live main `e4c7c36...` + the preserved convergence parent;
- PR #378 remained open, draft, mergeable and unmerged;
- exact PR head had 12/12 triggered workflows completed successfully.

Production evidence remained aligned with ADR 0375:

- Web route for the exact Fast Read path was live;
- Core container remained `28c86cd5de7d...`, image `wandora/core:organization-adapter-candidate-9ee338303292`, revision `9ee338303292173db8e1b21bef9c8c5067c104a4`, manifest `sha256:fbb3c420b25fc9ae141f8ece5ab69bec9daef203a36e268eea4c363da3a84a5f`;
- the same immutable 16-file custody+rollout provenance remained live, so the ADR 0375 exact rollout tuple had not changed without container recreation;
- Core reported Fast Read/Semantic/rollout enabled and Human Send disabled;
- Paperclip, Core and Messaging Gateway were healthy;
- Gateway remained `outboundEnabled=false`;
- Task Drain was `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- Organization Adapter `0.6.1` was `ready`;
- `wandora_mastra@0.6.0` was loaded and enabled;
- Ana was idle and healthy before effect, with prior last run `51170b58-99a8-4de8-aad2-d6915737e7f0`;
- provider operational evidence was current: Connection active/enabled/healthy, organization grant active, installed for Ana, product-search read-only/non-write/non-destructive/effective-profile allowed;
- fresh Tool Policy test returned `allow / allow_profile` and wrote no audit event.

## Browser-owned precheck

The owner performed a read-only precheck inside the already authenticated browser at `app.wandora.com.br`.

It proved:

- session valid;
- exact 28PRO membership;
- role exactly `owner`;
- exact Ana active;
- absence of `wandora.active-organization-id` was accepted because exact owner membership was unambiguous;
- Fast Read POSTs executed by precheck: `0`.

No browser credential was copied to MCP, shell, container, script environment or temporary file.

## Deterministic decision and second adversarial review

All mandatory deterministic gates were GREEN.

**WANDORA DETERMINISTIC DECISION = GO**

One effect-adjacent JEV/TypeSafe advisory review was then executed with minimized non-secret facts. It returned `allow=0.72`, `confidence=0.63` and no new concrete factual gap.

Under ADR 0377, this advisory result did not replace Wandora's deterministic effect authority and did not require approval-shopping or a repeat review.

## Single execution

The owner browser executed exactly one POST to:

`/api/v1/organizations/7a531811-9fea-4395-b0b2-2e2b0fce0570/digital-employees/7b401163-8102-42db-b595-3a2017f54003/fast-read`

with the exact body:

`{"request":"Qual é o preço do produto PREMIUM PLUS?"}`

Browser result:

- HTTP `200`;
- `kind=completed`;
- correlationId `e31a9039-362d-4a8d-8643-2f10dcd8cea6`;
- model `wandora-deterministic-read-v1`;
- summary: `PREMIUM PLUS\nCódigo: 3\nPreço: R$ 890,00`;
- token usage all zero.

No retry, second question, fallback capability or alternate route was executed.

## Post-effect reconciliation

Paperclip created exactly one new Ana run after the previously observed run:

- run `38468c3b-4a89-4ba1-898b-c74bfc5263a6`;
- status `succeeded`;
- started `2026-10-01T19:19:17.075Z`;
- finished `2026-10-01T19:19:19.283Z`;
- exitCode `0`;
- execution phase `completed`;
- execution attempt `1`;
- `retryOfRunId=null`;
- `processLossRetryCount=0`;
- `scheduledRetryAttempt=0`;
- no predecessor/successor retry run.

Core logs tie the same browser correlationId to one successful sequence through capability projection, semantic decision, product selector, Tool Gateway, `paperclip.read_tool`, dispatch roundtrip and response.

Safe Connection activity for that run and the qualified VendaERP product-search tool returned exactly two audit rows:

1. `policy_decision` — `allow / allow_profile / success`;
2. `call_completed` — `allow / tool_completed / success`.

Those two rows are the decision and completion audit records for **one tool execution**, not two ERP calls.

The audited tool was:

`mcp.wandora-vendaerp-readonly-v1-8e2c23f4:vendaerp-search-products`

No second tool execution, retry, write tool or destructive tool was observed.

Post-effect health remained GREEN:

- Core healthy;
- Paperclip healthy;
- Messaging Gateway healthy;
- Gateway outbound remained OFF;
- Human Send remained OFF by unchanged live Core configuration;
- Task Drain remained `false / 0 / 0 / quiescent=true`.

## Decision

**SINGLE REAL CANARY = SUCCESS**

The V3 canary proved exactly one authenticated owner-browser customer Fast Read and exactly one governed read-only VendaERP product-search execution through the canonical Wandora route.

This success is bounded to the enrolled 28PRO/Ana/`business.products.price` scope. It does not authorize rollout expansion, additional customer calls, Human Send, outbound messaging, provider bypass, migration, subsystem internalization or merge of PR #378.

ADR 0168 remains binding: portability is contract decoupling, not implementation duplication. Paperclip and other specialist providers remain replaceable behind Wandora-owned contracts/adapters.

This ADR is the terminal checkpoint for this slice.
