# ADR 0400 — Organization Adapter Dynamic Managed Employee Provider Bridge Candidate V1

- Status: **IMPLEMENTED CANDIDATE / EXACT-HEAD CI PENDING / NO PRODUCTION EFFECT**
- Date: 2026-10-02
- Base: PR #398 exact head `233b4546dcbaaf7a281b40a30c9c1a6c182bb000` — 13/13 GREEN
- Scope: provider-bound dynamic employee ensure inside Organization Adapter only

## REAL NOW

PR #398 was freshly revalidated open/draft/mergeable/unmerged at exact head
`233b4546dcbaaf7a281b40a30c9c1a6c182bb000` with **13/13 completed/success** workflows.

The Paperclip dynamic managed Agent primitive is qualified for paused creation
and native Board approval. Organization Adapter 0.6.1 remains singleton-shaped
around one static `CATALOG_KEY`, while current Core activation/work/Fast Read
still validate the static managed-Agent hash. Switching Core hire alone would
therefore create an internally inconsistent runtime.

## CAPABILITY AUTHORITY / REUSE GATE

Wandora owns canonical employee instance identity and the customer meaning of
hire versus activation. Paperclip owns Agent creation, exactly-one semantics,
native approval and operational lifecycle. Organization Adapter remains the
replaceable company-scoped HMAC boundary.

No new Wandora lifecycle table/enum is justified. In particular,
`pending_approval` remains Paperclip operational state and is not persisted or
returned as a Wandora projection.

## DECISION

Create a distinct Organization Adapter **0.7.0** candidate while preserving all
0.6.1 static paths.

Add:

- capability `agents.managed.dynamic`;
- sibling signed webhook `employee-ensure-dynamic`;
- exact request `{ companyId, employeeId, catalogKey }`;
- canonical employee UUID validation;
- resource key `wandora-digital-employee:<employee UUID>`;
- create spec derived from the existing catalog template;
- `initialStatus = paused`, budget `0`, existing `wandora_mastra` adapter.

The bridge calls `ctx.agents.managed.ensureDynamic`.

Success is returned only after exact provider correlation and exact Agent state
`paused`. The response is limited to the private adapter binding:

```json
{ "providerAgentRef": "<private Paperclip Agent id>" }
```

If the Agent is still `pending_approval` or any state other than `paused`,
the webhook fails closed. Because ensureDynamic is provider-idempotent, replay
after native approval resolves the same Agent; ADR 0399 preserves paused state.

## COMPATIBILITY

0.7.0 is built/tested against
`wandora/paperclip:v2026.916.1-dynamic-managed-agent-v1`.
The Organization Adapter workflow composes the exact five qualified provider
deltas before building the SDK/package. Historical 0.6.1 is not overwritten.

## VALIDATION

Tests require strict HMAC/body/UUID validation, no caller-supplied provider
identifier, UUID-derived resource keys, same-employee replay, distinct resources
for two employee UUIDs on the same catalog template, bounded paused create spec,
fail-closed pending approval, same-Agent success after approval replay, and
fail-closed provider correlation/state. Existing static plugin tests remain.

## SECOND ADVERSARIAL REVIEW

Initial design projected `approval-pending` and received
`deep_review=0.59`. The design was refined to return no provider lifecycle
projection: pending approval simply fails closed.

Refined review:
`proceed_fast=0.58, deep_review=0.38, block=0.03, split_task=0.01`.

## EFFECT BOUNDARY

No Core consumption, schema/hire-journal change, production plugin upgrade,
Paperclip promotion/migration/restart, registry push, real Agent creation,
customer/workforce activation or merge is authorized.

## NEXT GATE

After exact-head CI GREEN, qualify Core-side provider client + employee-instance
binding migration separately, including removal of static managed hash
assumptions before any runtime switch.
