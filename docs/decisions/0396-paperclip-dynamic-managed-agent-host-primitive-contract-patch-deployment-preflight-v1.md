# ADR 0396 — Paperclip Dynamic Managed Agent Host Primitive Contract + Patch Deployment Preflight V1

Date: 2026-10-02

Status: **HOST PRIMITIVE CONTRACT QUALIFIED / PATCH-OVERLAY DEPLOYMENT PATH QUALIFIED / CODE CANDIDATE NEXT / DOCUMENTATION ONLY / NO PRODUCTION EFFECT**

## Context

ADR 0395 proved that the multi-employee workforce cannot safely use raw Paperclip Agent creation after an ambiguous timeout.

This slice closes the next narrower question:

> What exact provider-side primitive must exist, and how should Wandora carry it against the currently promoted Paperclip runtime without introducing a long-lived provider fork or weakening current capability boundaries?

No provider source, migration, image or production state is changed here.

## REAL NOW

Fresh exact-head reconciliation proved:

- PR #395 is open, draft, mergeable and unmerged;
- PR #395 exact head = `aca8f826783fb464fccf9b82c95a0888ea8b0556`;
- one exact-head CI read observed 10/10 workflows completed successfully;
- no workflow rerun or polling occurred.

### Production Paperclip authority

Production is not the v2026.916.0 OpenAPI baseline.

ADR 0303 proves current production as:

- Paperclip build version: `v2026.916.1`;
- upstream source: `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
- production tag: `wandora/paperclip:v2026.916.1`;
- exact promoted frozen artifact/image;
- upstream source plus four Wandora-qualified provider patches.

The existing four-patch composition is canonical operational precedent for a bounded provider delta.

The v2026.916.0/dffc material remains compatibility/baseline evidence only.

## PROVEN EVIDENCE

### Current plugin Agent API remains static-managed only

At production source `d554c478…`, `PluginAgentsClient` exposes:

- list;
- get;
- pause;
- resume;
- invoke;
- `managed.get`;
- `managed.reconcile`;
- `managed.reset`.

The capability map includes `agents.managed`, but no dynamic managed Agent creation capability.

The static managed service requires `declarationFor(agentKey)`, which resolves only manifest-declared Agent keys.

### Current static reconcile has a create window

The current managed flow is effectively:

```text
get binding
 -> find relink candidate
 -> create Agent
 -> maybe create hire approval
 -> upsert managed-resource/plugin-entity binding
```

Without stronger provider serialization, two dynamic callers could both observe missing state before either binding exists.

### Paperclip already has the correct concurrency techniques

The same production source already uses PostgreSQL transaction-scoped advisory locks for idempotent provider mutations.

Built-in Agents also prove the structural backstop pattern:

- provider-owned metadata marker;
- provider-side unique index;
- losing race raises `23505`;
- service re-resolves to the winner.

### Deterministic hashing already exists

Paperclip's managed-resource support includes sorted stable JSON and SHA-256 stock hashing.

A new provisioning fingerprint can reuse that provider-native deterministic normalization pattern rather than introducing Wandora hashing semantics.

## 1. Capability decision

Add a new explicit plugin capability:

```text
agents.managed.dynamic
```

Do **not** silently expand `agents.managed`.

Rationale:

- static manifest-managed reconciliation and arbitrary runtime instance creation are materially different authority;
- a plugin upgrade requesting dynamic Agent creation deserves explicit operator review;
- least privilege remains visible in the Paperclip manifest/capability model.

## 2. SDK semantic contract

Add a host method with semantics equivalent to:

```text
ctx.agents.managed.ensureDynamic({
  companyId,
  resourceKey,
  spec
})
```

Exact TypeScript naming may be adjusted during code review, but the semantic boundary is frozen here.

The corresponding worker/host protocol operation is:

```text
agents.managed.ensureDynamic
```

and is gated only by:

```text
agents.managed.dynamic
```

## 3. V1 input

### companyId

Required canonical Paperclip company scope.

### resourceKey

Required opaque plugin-local stable resource key.

Requirements:

- string;
- trimmed;
- non-empty;
- bounded length;
- never interpreted by Paperclip as customer business meaning.

For Wandora the Organization Adapter may derive:

```text
wandora-employee:<canonical DigitalEmployee UUID>
```

### spec

A bounded **create-only** Agent request.

V1 may carry only provider creation fields needed to materialize the Agent, for example:

- display name/name;
- role;
- title;
- icon;
- capabilities;
- adapter type;
- adapter preference;
- adapter config;
- runtime config;
- permissions;
- monthly budget;
- requested initial status `idle | paused`.

V1 excludes:

- provider Agent ID;
- plugin identity;
- provider marker;
- approval ID;
- caller-supplied fingerprint;
- arbitrary reassignment;
- reset/update semantics;
- managed instruction-bundle mutation;
- skills;
- business responsibility;
- effect authority;
- MessagingConnection selection.

## 4. Host-owned creation fingerprint

The plugin does not supply the authoritative fingerprint.

The host must:

1. validate the request;
2. normalize the **requested** V1 spec to explicit deterministic defaults/nulls;
3. canonicalize object ordering with provider-native stable JSON;
4. compute SHA-256;
5. store that creation fingerprint in provider-owned metadata.

Important:

The fingerprint is computed from requested immutable creation semantics **before** contextual choices such as adapter preference are resolved from the current company population.

Therefore a retry does not become a conflict merely because unrelated company state changed.

## 5. Replay rule

### Same resource key + same creation fingerprint

Return the same provider Agent.

This is a replay.

### Same resource key + different creation fingerprint

Return conflict.

V1 does not silently mutate an existing employee instance during ensure.

Any future rename/default reconciliation contract is separate.

## 6. Provider-owned marker

Paperclip injects a new provider-owned marker equivalent to:

```json
{
  "paperclipDynamicManagedAgent": {
    "pluginKey": "...",
    "resourceKey": "...",
    "creationFingerprint": "sha256:..."
  }
}
```

`pluginId` may also be retained for audit/provenance but is not the stable semantic resource key.

The marker must not be supplied or overwritten by the plugin caller.

## 7. Marker immutability

The normal Agent create/update API must not be able to:

- forge;
- change;
- remove

the dynamic managed Agent marker.

Paperclip already protects built-in Agent metadata through an internal mutation override.

The dynamic marker needs an equivalent provider-owned write guard.

Only the internal dynamic managed-Agent service may write it.

## 8. Provider-side uniqueness

Add a new Paperclip migration with a provider-side unique index over the new marker identity:

```text
company_id
+ paperclipDynamicManagedAgent.pluginKey
+ paperclipDynamicManagedAgent.resourceKey
```

where the marker exists.

V1 intentionally includes terminated rows in uniqueness.

Reason:

A rejected or terminated employee instance must not be silently recreated by calling ensure again.

The marker is new, so this constraint does not reinterpret historical static managed Agents.

## 9. Transaction and lock

The strong ensure path must execute under:

```text
database transaction
+ pg_advisory_xact_lock(...)
```

The lock key is derived from:

```text
companyId
+ pluginKey
+ resourceKey
```

The entire provider mutation shares that transaction:

- exact marker lookup;
- Agent creation;
- native hire approval creation when required;
- `pluginManagedResources` binding;
- provider audit.

The existing Paperclip services are transaction-compatible because `agentService(db)` and `approvalService(db)` operate on the provided DB handle.

An Agent service nested transaction/savepoint remains inside the outer provider transaction.

## 10. Ensure state machine

Under the transaction-scoped lock:

### Existing exact marker, matching fingerprint, live Agent

Repair/upsert current `pluginManagedResources` binding if necessary and return the same Agent.

### Existing exact marker, different fingerprint

Conflict.

### Existing exact marker, terminated Agent

Conflict.

No automatic reprovision in V1.

### Existing exact marker, pending approval

Require exactly one open or revision-requested native `hire_agent` approval for that Agent.

Return the same Agent and approval.

If the pending Agent has no coherent approval, fail closed as provider-state inconsistency.

### No existing marker

Create one Agent.

If the company requires Board approval:

- force `pending_approval`;
- create exactly one native `hire_agent` approval inside the same outer transaction.

Otherwise:

- apply the requested allowed initial status.

Then persist current managed-resource binding and provider audit.

## 11. Native approval lifecycle is retained

Dynamic ensure does not invent another approval system.

Existing Paperclip behavior already provides:

- approve -> activate pending Agent;
- revision requested/resubmit -> continue same approval;
- reject -> terminate pending Agent.

After rejection:

```text
ensure(same resourceKey)
 -> finds terminated provider marker
 -> conflict
```

No second Agent is created.

## 12. Structural race backstop

The advisory lock is the normal serialization mechanism.

The unique index remains a structural guarantee against accidental/concurrent implementation defects.

A `23505` on the dynamic marker index must be treated as a convergence signal:

- re-read exact marker;
- verify company/plugin/resource key;
- verify creation fingerprint;
- return winner if semantically identical;
- otherwise conflict.

## 13. Static and dynamic managed markers remain distinct

Do not reuse the current static `paperclipManagedResource` marker for dynamic V1.

Static managed code assumes a manifest-declared `agentKey`.

Dynamic V1 therefore uses its own provider marker while still writing `pluginManagedResources` for provider-owned binding/audit.

This prevents dynamic instances from being accidentally interpreted as static manifest singletons.

## 14. Tenant behavior

The identity scope is:

```text
company + pluginKey + resourceKey
```

The same resourceKey in another company is valid and distinct.

Cross-company relink is forbidden.

No provider Agent from another company may satisfy ensure.

## 15. Wandora semantics remain outside this primitive

The provider primitive does not know:

- Atendimento;
- Vendas;
- Fiscal;
- Financeiro;
- employee responsibility;
- effect authority;
- handoff policy;
- messaging line;
- customer identity.

Those remain Wandora-owned semantics.

Paperclip receives only enough information to materialize exactly one operational Agent.

## 16. Existing production patch governance

Production v2026.916.1 is already built from:

```text
exact upstream d554c478...
+ provider patch 1
+ provider patch 2
+ provider patch 3
+ provider patch 4
-> qualified/frozen candidate
```

This is the existing provider-extension governance model.

No separate runtime fork is required to qualify the dynamic ensure primitive.

## 17. Fifth patch decision

Future implementation should add a fifth versioned provider patch, conceptually:

```text
v2026.916.1-dynamic-managed-agent-ensure-v1.patch
```

It must be generated and tested against the **exact four-patch composed tree** because it overlaps SDK/host files already modified by prior patches.

Do not regenerate or reinterpret the historical four-patch candidate.

## 18. Composition rule

Create a new composition wrapper for this capability.

It must:

1. require exact upstream source `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
2. run the existing qualified four-patch composition first;
3. require a clean expected composed state;
4. exact-context `git apply --check` the fifth patch;
5. apply the fifth patch last;
6. reject conflict markers/fuzz/unexpected drift;
7. run `git diff --check`;
8. emit a distinct success marker.

## 19. Migration contract

The future patch may add the next available migration in the exact d554-derived composed source.

At the time of this preflight:

- upstream d554 migration sequence ends at 0279;
- the current four Wandora provider patches add no Paperclip DB migration.

The code slice must re-check this before choosing a filename.

No production migration is authorized by this ADR.

## 20. Candidate identity

The fifth-patch candidate must have a **new** candidate contract/tag/artifact.

It must not overwrite:

```text
wandora/paperclip:v2026.916.1
```

or alter the provenance of the already-promoted image.

Candidate provenance must contain:

- upstream source SHA;
- build version;
- Wandora source SHA;
- all five patch paths;
- SHA-256 for all five patches;
- Docker archive hash;
- compressed artifact hash;
- manifest/config identity where applicable;
- disposable startup result.

## 21. Mandatory CI for the code slice

The implementation slice must prove:

- exact d554 source checkout;
- current four-patch composition;
- exact fifth-patch application;
- no merge conflict markers;
- SDK typecheck;
- server typecheck;
- database migration startup on disposable authenticated/private Paperclip;
- host-client/protocol/worker tests;
- dynamic ensure service tests;
- concurrent same-key calls -> one Agent;
- Board-approval company concurrent calls -> one Agent + one approval;
- same-key/same-spec replay -> same Agent;
- same-key/different-spec -> conflict;
- rejected/terminated -> no reprovision;
- pending revision -> same Agent/approval;
- cross-company isolation;
- marker readonly guard;
- current Fast Read/provider patch regression suite;
- disposable health startup;
- frozen artifact/provenance.

## 22. Fork / upstream decision

No long-lived OARANHA Paperclip runtime fork is created in this slice.

Reason:

- the existing patch-overlay governance already produces exact, reviewable provider deltas;
- a fork would add a second source-of-truth and synchronization burden before it is needed.

The capability is generic enough to propose upstream.

If an upstream PR requires a fork, a temporary OARANHA fork may later be created solely as the contribution vehicle.

Production continues to use the Wandora-qualified patch artifact until a released upstream version containing equivalent semantics passes a separate compatibility/concurrency qualification.

Never switch production to upstream `main` or `latest` by implication.

## 23. Upstream retirement rule

A later upstream release may replace the fifth patch only after proving:

- equivalent capability boundary;
- equivalent replay behavior;
- equivalent marker protection;
- equivalent tenant isolation;
- equivalent Board approval behavior;
- equivalent termination behavior;
- equivalent concurrency guarantee;
- existing Wandora Organization Adapter compatibility.

Only then may the local patch be removed.

## 24. Capability Authority / Reuse Gate

### Wandora owns

- canonical employee UUID;
- catalog template semantics;
- hire authorization;
- employee lifecycle product meaning;
- provider-neutral employee/provider binding;
- responsibility;
- future effect authority.

### Paperclip owns

- Agent row;
- exactly-one provider Agent provisioning;
- provider marker;
- provider transaction/locking;
- provider approval;
- provider managed-resource binding;
- provider runtime/task lifecycle.

### Organization Adapter plugin

Translates the Wandora provisioning request to the provider ensure operation.

It does not own canonical workforce state.

## 25. Adversarial cases

### Concurrent identical creates

Must converge to one Agent.

### Response lost after commit

Retry same resource/spec returns the same Agent.

### Changed spec on retry

Conflict.

### Board approval required

One pending Agent + one approval.

### Approval rejected

Agent terminates; ensure does not recreate.

### Revision requested

Same Agent/approval remains authoritative.

### Marker edited through normal Agent API

Rejected.

### Same UUID-like resource key in another company

Separate valid Agent.

### Cross-company candidate

Never satisfies ensure.

### Provider patch unavailable

Fail closed; no REST-create fallback is silently activated.

## 26. Final adversarial review

The first contract review requested deeper review:

- deep_review = 0.45;
- proceed_fast = 0.42;
- block = 0.08;
- confidence = 0.26.

The deep review then verified:

- transaction compatibility of Agent/approval services;
- native approval rejection behavior;
- stable provider hashing;
- provider marker mutation protection precedent;
- provider advisory-lock precedent;
- production source/patch authority.

Final review:

- proceed_fast = 0.74;
- deep_review = 0.13;
- block = 0.07;
- split_task = 0.06;
- confidence = 0.65.

## 27. Decision

Decision:

**QUALIFY THE HOST PRIMITIVE AND PATCH-OVERLAY DELIVERY CONTRACT; AUTHORIZE ONLY A CODE-ONLY PROVIDER CANDIDATE AS THE NEXT SLICE.**

No production effect follows from this decision.

## 28. Effect boundary

This slice performs:

```text
Paperclip source patch = 0
Paperclip migration = 0
Paperclip image build = 0
fork creation = 0
upstream PR = 0
Agent creation = 0
credential creation = 0
Wandora schema/runtime change = 0
production/VPS mutation = 0
rollout = 0
merge = 0
```

## 29. Next slice

Next executable slice:

**Paperclip Dynamic Managed Agent Ensure Provider Patch + Tests + Candidate CI V1 — CODE ONLY / NO PRODUCTION EFFECT**

Allowed scope:

- create fifth provider patch;
- create focused tests;
- extend composition CI;
- create new disposable candidate CI/provenance;
- update compatibility documentation needed for the code candidate.

Explicitly still forbidden:

- production deploy;
- production migration;
- real customer Agent creation;
- reusable-catalog Wandora runtime implementation;
- effect-authority runtime;
- handoff runtime;
- merge by implication.
