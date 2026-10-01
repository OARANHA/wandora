# ADR 0349 — Semantic Fast Read Bounded Production Attestation Semantic Fallback V1

Date: 2026-09-30

Status: **EXECUTED ONCE / HTTP 200 SEMANTIC FALLBACK / ZERO PAPERCLIP FAST READ / ZERO VENDAERP / MANDATORY CLOSE GREEN / NEXT SLICE CODE+CI ONLY**

## Objective

Record the first legitimate browser-owned owner/admin Semantic Fast Read production attestation that reached the Wandora semantic admission boundary, returned a controlled semantic fallback, executed no Paperclip Fast Read or VendaERP read, and closed back to the exact gates-OFF production baseline.

This ADR records completed evidence only. It does not authorize another browser request or another production opening.

## REAL NOW

Repository immediately before this documentation checkpoint:

- canonical `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 branch = `feat/semantic-fast-read-runtime-wiring-v1`;
- pre-documentation PR head = `8d322686971b0334826588503fd5c428a7b3f714`;
- PR #369 = open / draft / mergeable;
- pre-documentation exact-head CI = **17/17 GREEN**;
- merge ref observed before documentation = `fe9c19868ed12c9ef7f9da1a7e445f1d9e000f9f`.

Production baseline before opening:

- Core tag = `wandora/core:organization-adapter-candidate-14534e57256f`;
- Core image id = `sha256:ac253a9479338f0d47954937209323229314ef513125a71dd266558b3bfe1c8b`;
- Core revision = `14534e57256f0a73c49feb3944a1068921468f94`;
- exact 14-file gates-OFF composition;
- Paperclip `v2026.916.1` healthy;
- exactly one Organization Adapter `0.6.1` ready;
- Gateway outbound OFF;
- Task Drain = `false / 0 / 0 / quiescent=true`.

The current `14534e...` Rollback Freeze V2 receipt was independently captured and validated before the attestation opening.

## Pre-open qualification

The final 16-file composition appended, after the exact live 14-file chain:

1. `compose.semantic-fast-read-custody.yaml`;
2. `compose.semantic-fast-read-attestation.yaml` last.

The protected render input order was:

1. current production `promotion.env`;
2. `semantic-fast-read-attestation-render-v1.env`;
3. stable `core-runtime-image.env` last.

Fresh render gates passed:

- `docker compose ... config --quiet` = exit 0;
- `docker compose ... config --images` resolved exactly `wandora/core:organization-adapter-candidate-14534e57256f`;
- attestation overlay bytes remained the qualified source bytes;
- Fast Read Execution + Semantic Fast Read + Semantic Selector were the only semantic effect gates enabled;
- Human Send remained OFF.

Fresh business/provider gates immediately adjacent to the opening were GREEN:

- Paperclip healthy;
- Task Drain quiescent;
- Gateway `outboundEnabled=false`;
- Tool Policies = `[]`;
- exact 28PRO/Ana/VendaERP `vendaerp_search_products` dry-run policy = `allow / allow_profile`, no matched temporary policy, no audit event;
- OA operational-read = runtime healthy, VendaERP Connection active/enabled/healthy, organization grant active, installed for Ana, product search active/read-only/non-write/non-destructive/allowed.

## Browser-owned identity proof

The legitimate already-authenticated browser preflight proved:

- Wandora organization `7a531811-9fea-4395-b0b2-2e2b0fce0570` = `28PRO`, role `owner`;
- Wandora employee `7b401163-8102-42db-b595-3a2017f54003` = `Ana`, status `active`.

Canonical prior ADRs reconcile those Wandora identities to:

- Paperclip company `5d7ec217-118c-4292-8136-0a9ab16926ea` = `28PRO`;
- Paperclip agent `428b6730-3df4-4b92-b90a-a87f87c401f9` = `Ana`.

Live Paperclip readback independently confirmed the same company/agent identity and healthy organization chain.

Ana's Paperclip `status=error` is a historical terminal diagnostic projection from a prior failed run. Existing canonical ADR/source evidence proves `error` remains invokable and requires no `resume`, `clear-error` or other lifecycle mutation before execution.

## Exact bounded human request

Exactly one browser-owned POST was made for:

`Qual é o preço do produto PREMIUM PLUS?`

The browser received:

```json
{
  "fastRead": {
    "kind": "fallback",
    "reason": "needs-more-context"
  }
}
```

with HTTP 200.

The response evidence was recovered from the browser Network response after the Console had been cleared. The request was **not repeated**.

## Proven execution boundary

Backend reconciliation after the one response proved:

- the request reached the Organization Adapter `employee-capabilities` webhook;
- no `employee-fast-read` webhook was observed;
- Ana's Paperclip runtime-state remained on the historical run `d7cc89a3-2ea6-4a30-bb79-b0cb7105726b` from 2026-09-25;
- no new Paperclip run was created by this attestation;
- therefore no issue-less Paperclip Fast Read dispatch occurred;
- therefore no Tool Gateway `vendaerp_search_products` execution occurred;
- no retry occurred;
- no second ERP read occurred;
- no Human Send, Gateway outbound or WhatsApp occurred.

The attestation reached the semantic provider boundary but stopped before the product selector and before provider/business execution.

## Root cause classification

Current Core policy is fixed to:

- `minimumConfidence = 0.90`;
- `maximumNeedsMoreContext = 0.10`;
- `maximumNeedsHumanReview = 0.10`;
- `minimumNeedsDataOrToolLookup = 0.90`.

The observed `needs-more-context` fallback proves the semantic decision exceeded the allowed `needsMoreContext <= 0.10` boundary. The exact numeric provider value was not preserved and must not be invented.

Current source calls the concrete Mastra+Mistral `SemanticSelectorProvider` only when the first Wandora gate fails specifically with `missing-selector`.

Because this live request failed first as `needs-more-context`:

- the product selector was not invoked;
- `PREMIUM PLUS` was not converted into the qualified bounded `ProductSelector`;
- the signed `wfri1` Fast Read intent was not issued;
- Paperclip/VendaERP dispatch did not occur.

This is a semantic orchestration/decision-contract gap, not evidence of a VendaERP, Paperclip, authorization, credential, browser-auth or outbound failure.

## Mandatory close

Immediately after the single browser response, the already-reviewed close operation recreated only Core on the exact 14-file pre-window composition.

Final state after close:

- Core exact tag/digest/revision = unchanged `14534e...`;
- Core healthy, restart 0;
- custody + attestation overlays absent;
- TypeSafe/`wfri1` attestation-only mounts absent;
- `fastReadExecution=false`;
- `semanticFastRead=false`;
- `humanSendProposal=false`;
- Gateway `outboundEnabled=false`;
- Paperclip healthy;
- Task Drain = `false / 0 / 0 / quiescent=true`.

The attestation window is **CLOSED**.

## Capability Authority / reuse gate

ADR 0168 remains binding.

Do not compensate for this result by:

- lowering semantic thresholds blindly;
- adding regex/entity parsing in Core;
- duplicating a product catalog/cache in Wandora;
- pre-reading VendaERP to manufacture selector candidates;
- internalizing TypeSafe/JEV or Mistral provider implementation;
- adding another orchestration/runtime subsystem;
- repeating the browser request merely to recover provider details.

Wandora continues to own the semantic contract and admission policy. TypeSafe/System One remains the replaceable semantic-decision provider. Mastra+Mistral remain the replaceable selector implementation. Paperclip remains operational authority for run/tool execution. VendaERP remains the read provider.

## Decision and second adversarial review

Decision: close this production attestation as a **safe semantic fallback with zero business-provider effect** and move the next work into a repository/CI-only slice.

Before this documentation mutation, JEV 1.13.0 reviewed the exact documentation/checkpoint action and returned:

- choice = `allow`;
- confidence = `0.61`;
- probabilities: `allow=0.70`, `confirm=0.17`, `review=0.09`, `deny=0.04`.

## Next boundary

Next slice:

**Semantic Fast Read Explicit Product Context / Selector Admission Compatibility V1 — CODE+CI ONLY / NO PRODUCTION EFFECT**

Start from fresh repository truth. Before changing policy or sequencing:

1. reproduce/qualify the exact request `Qual é o preço do produto PREMIUM PLUS?` through the current semantic-decision contract in a non-production/disposable test boundary;
2. preserve the exact current `needsMoreContext <= 0.10` safety policy unless evidence justifies a contract change;
3. determine the smallest provider-neutral correction that allows an explicitly named product to reach the already-qualified selector path without relaxing unrelated semantic failures;
4. add a regression test using the exact production request text;
5. prove the selector is invoked at most once, dispatch remains zero on ambiguity, and the correction does not create a pre-admission ERP read;
6. run a second adversarial review and exact-head CI;
7. stop before any production deployment/reopening.

A later production retry is a new attestation slice requiring fresh REAL NOW, rollback/provider/custody gates, a new opening decision/review/approval, exactly one browser-owned request and mandatory close.

This ADR does **not** authorize that retry.
