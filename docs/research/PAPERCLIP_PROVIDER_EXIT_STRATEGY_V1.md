# Paperclip Provider Exit Strategy V1

Date: 2026-09-21
Status: **Research design — NO EFFECT**

## Objective

Paperclip is the current operational control-plane provider. Wandora must be able to replace it without changing customer identity or product semantics.

The exit strategy should reuse Paperclip's own portability facilities where they are faithful, while explicitly covering provider-owned state that Paperclip does not export.

## Proven live/pinned portability surface

Pinned v2026.916.0 contains:

- company export;
- export preview;
- export fidelity report;
- company import preview/apply;
- selective export of:
  - company;
  - agents;
  - projects;
  - issues;
  - skills;
- adapter overrides on import;
- collision strategy;
- portability metadata for environment inputs;
- issue/task artifact portability.

This means Paperclip is not treated as an opaque database.

## Proven fidelity gaps

Pinned Paperclip's own `paperclip-export-fidelity-v1` warns when the company contains data not included in the export bundle.

Explicit unsupported-history warnings:

```text
approvals_not_exported
cost_history_not_exported
activity_history_not_exported
```

The fidelity report also counts:

- labels;
- issue label references;
- blocker relations;
- issue documents;
- issue work products;
- issue attachments;
- issue monitors.

These counts exist specifically so export fidelity can be reasoned about instead of assumed.

## Wandora exit principle

Do **not** build a shadow Paperclip database merely to preserve portability.

Use:

```text
Paperclip native export
+
Wandora provider-binding/receipt manifest
+
targeted historical exports only for adopted non-portable capabilities
```

instead of:

```text
duplicate every Paperclip table in Wandora
```

## Minimum Wandora-owned exit manifest

The migration manifest must contain only the correlation and policy data Wandora needs to rematerialize a provider:

```text
Wandora organization ID
current control-plane provider key
provider company ref

Wandora employee ID
employee catalog key / role / autonomy
provider agent ref

Wandora work ID
provider work/issue ref when known
provider run/result receipt references needed for reconciliation

active provider-backed schedules/policies adopted by Wandora
provider object refs needed to export/recreate them

outstanding customer-facing review/approval projection if Wandora exposes it
outstanding external-effect authorization remains Wandora-owned separately
```

Never put provider secrets into the manifest.

## Migration classes

### Class 1 — rematerializable configuration

Examples:

- companies;
- agents;
- org relationships;
- projects/goals;
- routines/schedules;
- skill definitions/policy;
- task review policy;
- budget policy;
- tool/connection access policy.

Target strategy:

1. export portable definition when native export supports it;
2. otherwise read through official API;
3. translate into provider-neutral Wandora migration model;
4. create target-provider equivalent;
5. update provider binding atomically after validation.

### Class 2 — active operational state

Examples:

- open issues;
- active/queued runs;
- scheduled retries;
- recovery actions;
- open approvals;
- pending interactions;
- active tool sessions.

Target strategy:

- do not live-migrate blindly;
- enter a controlled quiescence/drain window;
- let safe active executions settle when possible;
- freeze/reconcile ambiguous effects;
- migrate open work with explicit status semantics;
- retain old provider read-only until reconciliation window closes.

### Class 3 — immutable historical evidence

Examples:

- completed runs;
- activity history;
- cost history;
- historical approvals;
- provider audit events.

Target strategy:

- normally **do not recreate history as if it happened in the new provider**;
- export/retain an immutable archive where product/compliance requires it;
- keep Wandora's own customer/effect/compliance audit authoritative for Wandora-owned commitments.

This prevents false history.

## Capabilities requiring targeted exit work if adopted

### Approvals

Paperclip native company export explicitly does not include approval history.

If Wandora adopts Paperclip task approvals as a customer-visible feature, the adoption slice must also define:

- open-approval migration semantics;
- historical decision archive requirement;
- whether Wandora needs a normalized approval projection for customer retention.

### Costs

Paperclip native export explicitly does not include cost history.

If Paperclip becomes the operational cost ledger for Wandora model work:

- keep normalized model-usage receipts at the Wandora runtime boundary;
- define cost-ledger export for provider migration/accounting;
- never equate Paperclip operational costs with Wandora invoices/pricing.

### Activity

Paperclip native export explicitly does not include activity history.

Paperclip activity remains specialist operational history. Wandora must keep its own product/effect/compliance audit for Wandora-owned actions.

### Connections / MCP

Connection credentials and grants are security state, not ordinary portable company content.

Future adoption must define:

- provider-neutral connection intent/identity;
- explicit reauthorization when credentials cannot safely migrate;
- revocation of old provider sessions/tokens;
- no copying of secrets through a generic export manifest.

### Secrets

Provider secrets should usually be re-bound/re-authorized, not copied through a provider migration bundle.

### Cases/Pipelines

Currently quarantined/experimental. If adopted later, the adoption decision must include an export model because they are not part of the currently proven Wandora exit contract.

## Provider replacement sequence — conceptual

```text
1. freeze new provider-backed work admission
2. reconcile active work/effects
3. native Paperclip export + fidelity report
4. export targeted non-portable adopted state
5. build provider-neutral migration package
6. provision target provider in shadow/quarantined mode
7. create company/employee/work policy equivalents
8. validate correlations
9. switch Wandora provider bindings
10. keep old provider read-only for bounded reconciliation
11. revoke old credentials/connections
12. validate customer-facing invariants
13. archive/delete old provider according to retention policy
```

This is a future provider-replacement contract, not an executable runbook today.

## Exit test for new Paperclip capability adoption

No new Paperclip capability should become a material Wandora dependency without answering:

1. How is its current configuration exported?
2. How are open instances reconciled?
3. Does native company export cover it?
4. What does export fidelity say?
5. What provider IDs must remain private bindings?
6. Are secrets transferable or must they be reauthorized?
7. Which historical records need immutable retention?
8. What is the target-provider-neutral semantic representation?

If these cannot be answered, the capability remains **QUARANTINE**.

## Current conclusion

Paperclip replacement is feasible by architecture, but not “free”.

The strongest current portability properties are:

- stable Wandora IDs;
- generic provider binding tables;
- customer UI negative tests against Paperclip leakage;
- provider-specific logic concentrated in internal adapters/bridges;
- Paperclip's own company portability facility.

The main future portability risks are created only if Wandora broadly adopts provider-specific:

- approvals;
- cost/activity history;
- Tool Gateway/Connections;
- Cases/Pipelines;
- chat/conversation persistence;
- plugin UI/data models

without adding a migration contract at adoption time.
