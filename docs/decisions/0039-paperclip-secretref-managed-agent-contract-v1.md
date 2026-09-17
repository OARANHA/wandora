# ADR 0039 — Paperclip SecretRef + Managed Agent Contract V1

Date: 2026-09-16
Status: **Accepted laboratory contract. Customer hiring and production activation remain NOT approved.**

## Context

ADR 0038 accepted minimum private Wandora state for an Organization Adapter, based on an earlier disposable proof that called Paperclip `agent-hires` directly. That proof established that repeated equal `agent-hires` calls may create different agents, so Wandora cannot treat that endpoint as an idempotent external effect.

Before activation, the installed Paperclip plugin runtime was inspected and a narrower provider-native path was tested: company-scoped plugin configuration, Paperclip `secret-ref` resolution and `ctx.agents.managed.reconcile()` using a stable plugin resource key.

The goal was to remove the earlier in-memory `TEST_KEYS` proof mechanism, prove literal company isolation, and determine whether Paperclip managed resources make any ADR 0038 safety state unnecessary.

## Proven laboratory evidence

Using the exact installed Paperclip image `wandora/paperclip:v2026.831.1` in a disposable/laboratory instance:

1. a headless plugin declared `multiCompanyConfig: true` plus capabilities `agents.managed`, `webhooks.receive` and `secrets.read-ref`;
2. its company config contained only a Paperclip `secret_ref`; the raw HMAC value was not persisted in plugin config and was resolved only at runtime with `ctx.secrets.resolve(ref, { companyId, configPath: "hmacSecret" })`;
3. omitting `secrets.read-ref` caused the host to reject runtime secret resolution; adding the declared capability allowed the same operation;
4. trying to save a secret reference owned by Company D into Company A's plugin config failed with HTTP 400: `Plugin config references a secret outside the selected company`;
5. with a valid Company D HMAC, D -> D `agents.managed.reconcile()` succeeded;
6. the same D-authorized worker attempt against Company A failed in the Paperclip host before effect with company-context authorization errors for both `agents.managed.reconcile` and `secrets.resolve`;
7. sequential replay of the same managed agent key returned `created` and then `resolved` with the same agent ID and one agent row;
8. Paperclip's managed-agent implementation preserves operator edits during normal reconcile, can relink a recoverable binding by its managed-resource marker, and uses explicit `reset()` to reapply manifest defaults;
9. when company policy requires board approval, creation of a managed agent enters Paperclip's native `pending_approval` flow.

A separate concurrency probe then challenged the assumption that sequential idempotency implied an exactly-once creation primitive. In a fresh disposable company with a synthetic test-only HMAC, 20 simultaneous first-time reconcile webhooks produced:

```text
HTTP 200: 15
HTTP 502: 5
managed agent rows: 10
unique managed agent IDs: 10
```

The disposable company was deleted after the probe. No production tenant, live Paperclip company, real credential or customer effect was involved.

Therefore `managed.reconcile()` is a useful stable/recoverable provider primitive, but it is **not sufficient by itself to serialize concurrent first creation**.

## Decision

### 1. Final normal Organization Adapter mechanism

For Wandora-managed digital employees, the preferred provider path is:

```text
Wandora Organization Adapter
  -> company-scoped Paperclip plugin webhook
  -> HMAC verified with company-scoped Paperclip secret_ref
  -> ctx.agents.managed.reconcile(stableAgentKey, companyId)
  -> Paperclip-managed agent / approval / lifecycle
```

The normal tenant path must not use a broad Board API key or a shared multi-company API credential. Raw HMAC values do not belong in plugin config, Git, browser contracts or Wandora provider metadata.

### 2. Paperclip remains lifecycle authority

Paperclip owns:

- managed-agent creation/relink/reset behavior;
- provider-side agent lifecycle and status;
- board-approval behavior for new agents;
- provider-side configuration revisions, hierarchy/coordination, tasks/issues, assignments and runs.

Wandora must not reimplement those state machines.

### 3. ADR 0038 private journal remains required, but for a narrower reason

`wandora_private.digital_employee_hire_operations` remains justified as a Wandora **request-idempotency and concurrency serialization boundary**, not as a second provider lifecycle and not as compensation for missing managed-resource reconciliation.

Before the first provider effect for a Wandora idempotency key, the Organization Adapter must atomically reserve/claim the operation and compare the canonical request hash. Competing same-key requests must not both enter Paperclip concurrently.

Required contract:

```text
same idempotency key + same canonical request
  -> one claimed external-effect path
  -> later callers reuse/reconcile the same Wandora employee/provider binding

same idempotency key + different canonical request
  -> idempotency conflict before provider effect

claimed/ambiguous operation
  -> fail closed from blind concurrent creation
  -> use Paperclip managed get/reconcile under the serialized recovery path
```

The exact lease/claim implementation and minimum DB grants remain part of the next runtime slice. This ADR does not activate them.

### 4. Direct `agent-hires` is no longer the preferred Wandora provisioning primitive

The earlier non-idempotent `agent-hires` evidence remains factually valid and explains why ADR 0038 originally required an external-effect journal. New evidence supersedes the preferred implementation mechanism: Wandora should use Paperclip managed resources where the employee is declared/owned by the Wandora plugin contract.

This does **not** make the journal unnecessary because the concurrency probe proved a first-create race in managed reconcile when calls are allowed to execute concurrently.

### 5. Provider bindings remain private

ADR 0038 organization and digital-employee provider bindings remain valid minimum replaceability/reconciliation state. Provider company/agent IDs remain private and never become customer-facing identifiers.

## Security invariants

- plugin configuration is company-scoped;
- the HMAC secret is a Paperclip `secret_ref`, not inline config;
- runtime secret resolution carries the same company context and config path;
- the Paperclip host, not only Wandora worker code, enforces company scope;
- a signature valid for one company cannot authorize managed-agent or secret operations in another company;
- browser and customer APIs never receive Paperclip secret refs, raw secrets or agent/company IDs;
- the Organization Adapter must serialize a first create before invoking `managed.reconcile()`;
- uncertain/concurrent external effects are never converted into blind direct `agent-hires` retries.

## Relationship to migration 010

Migration `20260916_010_organization_adapter_state_v1.sql` remains **merged but not live** and remains structurally compatible with this decision. No production application is authorized by this ADR.

The older abandoned `digital_employee_work_assignments` direction is unrelated to the current migration 010 and must not be described as though the current Organization Adapter migration were abandoned.

## Versioned proof

The safe proof artifact is versioned at:

```text
spikes/paperclip-organization-adapter-control-plane-v1/
```

The proof contains no operational credential. Its manifest requires `secret-ref` configuration and its worker resolves the value only at runtime.

## Next executable slice

Implement and verify the **minimum private Organization Adapter runtime contract**, still without a customer-facing `Contratar funcionário` action:

1. reserve/claim ADR 0038 hire operation with canonical request hash under concurrency;
2. prove same-key/same-request concurrent callers produce only one Paperclip first-create effect;
3. prove same-key/changed-request fails before provider effect;
4. call company-scoped plugin `managed.reconcile()` using the accepted HMAC/secret-ref boundary;
5. persist/reconcile the private provider binding without leaking provider IDs;
6. prove process crash/timeout recovery through the serialized managed-resource path;
7. prove minimum DB grants and tenant authorization;
8. only then review production migration 010 application, provider configuration and customer hiring activation as separate decisions.
