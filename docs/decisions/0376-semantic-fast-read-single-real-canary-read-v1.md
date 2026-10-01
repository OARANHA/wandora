# ADR 0376 — Semantic Fast Read Single Real Canary Read V1

Date: 2026-10-01

Status: **BLOCKED / FAIL-CLOSED / PRECHECK GREEN / SINGLE REAL CANARY NOT EXECUTED / NO CUSTOMER OR VENDAERP EFFECT**

## Objective

Execute at most one real canary request for the already-enrolled production tuple:

- Wandora organization 28PRO `7a531811-9fea-4395-b0b2-2e2b0fce0570`;
- Wandora Ana `7b401163-8102-42db-b595-3a2017f54003`;
- sole capability `business.products.price`.

The intended single question was frozen as:

`Qual é o preço do produto PREMIUM PLUS?`

No automatic retry, second customer request, fallback capability, Human Send, Messaging Gateway outbound, Paperclip lifecycle mutation or direct VendaERP bypass was allowed.

ADR 0168 remains binding: portability is contract decoupling, not implementation duplication. Paperclip remains operational authority for lifecycle/runs/Connections/grants/Tool Gateway/tool execution/result/audit; Wandora remains semantic/product/effect-rollout authority; Mastra remains a replaceable runtime provider.

## REAL NOW — Git / CI

Fresh reconciliation immediately before the effect decision proved:

- `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #378 remained open / draft / mergeable / unmerged;
- branch `feat/semantic-fast-read-scoped-rollout-current-main-v1`;
- source head `d808718e0f15193f0985a75ee5a5b192ab021410`;
- merge ref `672c93646f7c3f234bf6e0b24f515a8d7974caed`;
- merge parents exactly:
  - `c78266bb08c2d903d942d0ad87d6cb03438811a4`;
  - `d808718e0f15193f0985a75ee5a5b192ab021410`;
- exact source head CI: **12/12 GREEN**.

No PR merge was performed.

## Fresh production preflight

Core remained the exact ADR0375 activated container:

- container `28c86cd5de7d...`;
- image `wandora/core:organization-adapter-candidate-9ee338303292`;
- revision `9ee338303292173db8e1b21bef9c8c5067c104a4`;
- OCI manifest `sha256:fbb3c420b25fc9ae141f8ece5ab69bec9daef203a36e268eea4c363da3a84a5f`;
- healthy;
- restart count 0.

The same immutable live container and Compose labels still prove the exact 16-file provenance from ADR0375: prior 14-file baseline + `compose.semantic-fast-read-custody.yaml` + `compose.semantic-fast-read-rollout.yaml`.

Fresh Core startup readback still reports:

- `fastReadExecution=true`;
- `semanticFastRead=true`;
- `semanticFastReadRollout=true`;
- `humanSendProposal=false`.

Messaging Gateway remained healthy / restart 0 with `outboundEnabled=false`.

Task Drain remained:

- `draining=false`;
- `activeRuns=0`;
- `pendingWakes=0`;
- `quiescent=true`.

Paperclip remained `wandora/paperclip:v2026.916.1`, source `d554c4789ed3930f8a53ac9fdf6503b3187097da`, healthy.

Organization Adapter remained exactly one `wandora.organization-adapter-v1@0.6.1`, status `ready`, `lastError=null`.

External adapter `wandora_mastra@0.6.0` remained loaded and enabled.

Ana remained safe for a single execution:

- Paperclip agent `428b6730-3df4-4b92-b90a-a87f87c401f9`;
- status `idle`;
- `errorReason=null`;
- organization chain healthy;
- runtime `lastRunId=51170b58-99a8-4de8-aad2-d6915737e7f0`;
- `lastRunStatus=succeeded`;
- `lastError=null`;
- runtime `updatedAt=2026-10-01T07:07:58.623Z`.

Therefore no post-ADR0375 Ana run had appeared.

## Fresh Paperclip operational evidence

The existing provider-owned Organization Adapter `operational-read` was reused. It is read-only/cache-only and did not call VendaERP.

Fresh projection returned:

- `runtimeHealth=ok`;
- Connection `Wandora VendaERP Read-Only V1` active/enabled/healthy;
- `organizationGrantActive=true`;
- `installedForAgent=true`;
- `vendaerp_search_products` active;
- risk `read`;
- `isReadOnly=true`;
- `isWrite=false`;
- `isDestructive=false`;
- `allowedByEffectiveProfile=true`.

Fresh official Tool Policy list for 28PRO remained empty.

Fresh non-consuming/non-auditing Tool Policy test for Ana + Connection `8e2c23f4-73f5-444a-8647-71428819ea91` + `vendaerp_search_products` returned:

- decision `allow`;
- reason `allow_profile`;
- `auditEvent=null`.

No policy, Connection, grant or lifecycle mutation was performed.

## Capability Authority / Reuse Gate

No new capability or subsystem was justified.

The only authorized path remained:

authenticated Human Fast Read
→ existing Semantic Fast Read
→ existing Organization Adapter
→ Paperclip Tool Gateway
→ existing read-only VendaERP Connection
→ `business.products.price`.

No direct VendaERP call, Paperclip CLI execution bypass, Docker tool execution, lifecycle repair, new registry, retry engine, cache or provider mirror was authorized.

## Frozen effect decision

The proposed effect was exactly:

- one customer request;
- one attempt;
- question `Qual é o preço do produto PREMIUM PLUS?`;
- only `business.products.price`;
- zero automatic retry;
- zero second request;
- no fallback capability;
- Human Send OFF;
- Messaging Gateway outbound OFF;
- no Paperclip lifecycle mutation.

## Second adversarial review

The effect-adjacent JEV guard review returned:

- top decision: `allow`;
- `allow=0.46`;
- `confirm=0.21`;
- `review=0.10`;
- `deny=0.23`;
- confidence `0.28`.

That is not a clear or confirmable GO under this slice's fail-closed rule.

A focused follow-up routing review was attempted to distinguish the remaining authority gap, but the advisory provider returned `fetch failed` and produced no decision. No effect was performed after that ambiguity.

The canonical customer execution authority also remains the authenticated owner-browser Human Fast Read session. This session had no authenticated browser/computer surface for `app.wandora.com.br`. ADR0368 explicitly kept the browser token browser-owned and out of Remote-Ops/MCP/operator state. No credential-copy or operator/provider bypass was introduced.

## Decision

**FAIL-CLOSED.**

The technical runtime preflight was GREEN, but the mandatory second adversarial review did not provide a sufficiently clear/confirmable GO, and the canonical browser-owned execution surface was not available to this session.

Therefore the real canary request was not executed.

## Post-decision validation

Fresh state-first readback after the blocked review proved:

- Ana still points to historical run `51170b58-99a8-4de8-aad2-d6915737e7f0`;
- `lastRunStatus=succeeded`;
- `lastError=null`;
- Task Drain still `false / 0 / 0 / quiescent=true`;
- Core still `28c86cd5de7d...` / `9ee338...`, healthy;
- Paperclip still `v2026.916.1`, healthy;
- Gateway still healthy;
- all seven production containers retained their identities;
- no new Ana run;
- no VendaERP tool execution;
- no Human Send;
- no Gateway outbound;
- no rollout expansion.

## Effect accounting

`SINGLE REAL CANARY REQUEST EXECUTED = NO`

`VENDAERP TOOL EXECUTIONS = 0`

`AUTOMATIC RETRY = NO`

`SECOND CUSTOMER REQUEST = NO`

`HUMAN SEND = OFF`

`GATEWAY OUTBOUND = OFF`

`ROLLOUT EXPANSION = NONE`

`PR #378 MERGED = NO`

## Next boundary

Do not repeat the canary from historical evidence.

A future canary attempt must again begin from fresh REAL NOW, re-prove the same exact rollout/runtime/Paperclip/Connection state, obtain a clear effect-adjacent adversarial GO, and use the canonical authenticated owner-browser Human Fast Read authority without copying browser credentials into operator/MCP state.

No approval or review result from this checkpoint may be reused.
