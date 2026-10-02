# ADR 0395 — Paperclip Dynamic Digital-Employee Provisioning Bridge & Idempotent Reconciliation Qualification V1

Date: 2026-10-02

Status: **MACHINE TRUST BOUNDARY QUALIFIED / PAPERCLIP HOST DYNAMIC ENSURE GAP PROVEN / WANDORA IMPLEMENTATION BLOCKED / DOCUMENTATION ONLY / NO PRODUCTION EFFECT**

## Context

ADR 0394 established the target workforce identity model:

- DigitalEmployee is the canonical employee instance;
- a catalog key is reusable template/offering semantics;
- multiple employees may come from the same template;
- each employee must map to a distinct provider Agent;
- provider IDs remain private replaceable bindings.

This ADR asks how Wandora can ask Paperclip to materialize exactly one Agent for one canonical employee without placing a Paperclip control-plane credential in Core, without using a human browser/session, and without risking duplicate Agents after timeout/retry.

This is qualification only. It authorizes no Paperclip fork, source patch, deployment, schema migration, runtime activation or real Agent creation.

## REAL NOW

Fresh reconciliation after PR #394 GREEN proved:

- PR #394 is open, draft, mergeable and unmerged;
- exact head = 4c7c4f581bdcfb351d96a7d1ff210570c80915a9;
- one exact-head CI read observed 10/10 workflows completed successfully;
- no workflow was rerun;
- no polling occurred.

The existing machine trust path remains:

~~~text
Wandora Core
  -> signed HMAC request
  -> Paperclip Organization Adapter plugin
  -> Paperclip host SDK
~~~

## 1. Current plugin Agent surface is not dynamic

Pinned Paperclip v2026.916.1 exposes plugin capabilities for:

- agents.read;
- agents.pause;
- agents.resume;
- agents.invoke;
- agents.managed.

There is no current plugin-host capability equivalent to dynamic agents.create or agents.provision.

PluginAgentsClient exposes list/get/pause/resume/invoke and managed get/reconcile/reset only.

The managed path is explicitly for manifest-declared managed Agents.

Therefore arbitrary runtime keys such as:

~~~text
wandora-employee:<canonical-employee-uuid>
~~~

cannot be reconciled through the current managed API unless every key was predeclared in the static manifest.

That cannot support arbitrary N employee instances.

## 2. Dynamic REST creation exists

Paperclip Core already exposes:

~~~text
POST /api/companies/:companyId/agent-hires
POST /api/companies/:companyId/agents
~~~

These are provider-domain Agent creation primitives and remain the functionality to reuse.

The missing piece is a safe plugin-host bridge to that provider authority.

## 3. Machine authority decision

Wandora Core must not become a Paperclip board client.

Rejected for Core:

- browser session;
- browser cookie;
- Board session;
- Board API Key;
- human OAuth/session material;
- dedicated Paperclip Agent API Key.

Core should know only canonical organization/employee data, its signed Organization Adapter request, normalized result/error, and the private provider Agent reference needed for the existing binding relation.

The Organization Adapter plugin remains the Paperclip boundary.

## 4. Why Agent API Key is not enough

An Agent API Key is a legitimate machine credential and a suitably granted Agent can have agents:create authority.

But the reviewed agent-hires duplicate suppression is based on:

~~~text
runId + request fingerprint
~~~

when req.actor.runId exists.

A generic direct API-key request is not proven to carry that run-scoped identity.

Therefore:

~~~text
machine credential != replay-safe hire
~~~

## 5. Why an Agent/LLM run is not the provisioning bridge

A workaround could invoke a provisioner Agent and have it call agent-hires from inside a run.

Rejected.

Employee creation is control-plane state and must not depend on:

- model interpretation;
- prompt compliance;
- tool selection;
- model availability;
- stochastic runtime behavior.

The model may operate an employee after creation; it must not be required to create the employee safely.

## 6. Plugin self-HTTP fallback is technically possible

Paperclip plugins expose:

- ctx.http for outbound HTTP;
- ctx.secrets for secret references;
- ctx.entities for plugin-owned durable records.

plugin_entities has provider-side uniqueness for external IDs within company/plugin/entity scope.

So this fallback is technically possible:

~~~text
Core
 -> HMAC plugin endpoint
 -> plugin journal keyed by canonical employee
 -> plugin resolves dedicated machine credential
 -> plugin calls Paperclip REST agent-hires
 -> plugin records provider Agent ref
~~~

A dedicated Agent API Key would be preferable to a Board credential if this fallback were ever separately approved.

But this fallback is not selected as the canonical bridge.

## 7. Why self-HTTP is not strong idempotency

After a successful response, the path is straightforward.

The hard case is:

~~~text
create sent
Paperclip may or may not have committed
response becomes uncertain
~~~

The plugin can mark the operation uncertain, list Agents, search a stable metadata marker, recover if exactly one appears, and conflict if more than one appears.

But zero visible matches does not prove the first request can never finish later.

Blind retry remains unsafe.

Therefore self-HTTP can provide:

> fail-closed at-most-once automatic sending

but not:

> safe replayable exactly-one provisioning

It can strand a hire in uncertain state and it adds a credential solely so a Paperclip plugin can call its own host by HTTP.

## 8. Provider-side exactly-one precedent exists

Paperclip built-in Agents already solve a closely related race.

The provider uses:

- a provider-owned metadata marker;
- a partial unique index over company + marker key for non-terminated Agents;
- create-time uniqueness enforcement;
- 23505 conflict detection;
- re-resolution to the winning Agent.

The built-in service explicitly treats a concurrent losing insert as reconciliation, not as a second valid resource.

This proves the correct specialist-side pattern:

~~~text
stable resource key
+ provider-owned uniqueness
+ concurrent create convergence
+ re-resolution
~~~

## 9. Existing managed-resource uniqueness is reusable evidence

Paperclip also has plugin_managed_resources with uniqueness on:

~~~text
company_id
+ plugin_id
+ resource_kind
+ resource_key
~~~

This is strong reuse evidence.

But it is not already a dynamic Agent solution because:

- current Agent reconcile requires static manifest declaration;
- resource_id is required;
- dynamic instance creation is not exposed by that API;
- binding uniqueness alone is not proof that Agent insertion itself is race-safe.

No claim is made that the current table can be reused unchanged.

## 10. Required semantic primitive

The missing provider capability is an ensure operation, not raw create.

Exact API and capability names remain TBD.

Semantic shape:

~~~text
ensureDynamicManagedAgent({
  companyId,
  resourceKey,
  requestFingerprint,
  defaults
}) -> {
  agentId,
  state
}
~~~

For Wandora, resourceKey may be derived from:

~~~text
wandora-employee:<canonical employee UUID>
~~~

Paperclip need not understand the business meaning of that UUID. It only guarantees stable resource identity for the calling plugin.

## 11. Request fingerprint semantics

resourceKey answers:

> which provider resource is this?

requestFingerprint answers:

> is this a replay of the same provisioning contract?

Required behavior:

- same resourceKey + same fingerprint -> return the same provider Agent;
- same resourceKey + incompatible fingerprint -> conflict;
- mutable presentation/default reconciliation, if later allowed, must be explicitly separate from immutable provisioning identity.

## 12. Provider-side concurrency requirement

The ensure primitive must serialize or structurally constrain creation inside Paperclip.

Acceptable implementation families include:

- provider-side unique origin marker + losing-race re-resolution;
- transactional resource claim + Agent creation;
- provider-side advisory lock + durable binding;
- another equivalent exactly-one provider-owned mechanism.

The deterministic requirement is:

> two concurrent ensure calls for the same company/plugin/resourceKey cannot leave two active Agents.

This guarantee must be enforced where Agent rows are created.

It cannot depend on Wandora preflight reads.

## 13. Recovery semantics

### Existing valid binding

Return the same live same-company Agent.

### Binding missing, exactly one valid origin marker

Relink and return that Agent.

### No binding and no candidate

Create exactly once under provider-side serialization.

### More than one candidate

Conflict / manual reconciliation.

Never choose first/newest/oldest/alphabetical/default.

### Cross-company candidate

Reject.

### Terminated candidate

Fail closed until reprovision-after-termination semantics are separately qualified.

## 14. Plugin capability boundary

The new provider operation must remain host capability-gated.

A plugin must not gain unrestricted Agent creation implicitly.

The extension should require an explicitly reviewed capability or an explicitly extended managed-Agent contract.

Exact capability name is intentionally not fixed here.

## 15. Target Wandora flow after provider support exists

~~~text
owner/admin authorizes catalog hire
 -> Wandora reserves canonical employee UUID + hire operation
 -> Core sends signed HMAC request
 -> Organization Adapter validates request
 -> plugin calls Paperclip dynamic ensure
 -> Paperclip returns exactly one Agent
 -> plugin returns provider Agent ref
 -> Core verifies/persists employee-provider binding
 -> Wandora activation finalizes
~~~

If the plugin response is lost:

~~~text
Core retries same HMAC operation
 -> plugin retries same resourceKey + fingerprint
 -> Paperclip returns same Agent
~~~

No blind raw create occurs.

## 16. State ownership

### Wandora

- canonical employee UUID;
- catalog template provenance;
- hire authorization;
- hire-operation journal;
- provider binding;
- product lifecycle;
- responsibility;
- future effect authority.

### Paperclip

- provider Agent row;
- provider Agent operational lifecycle;
- provider Agent runtime configuration;
- provider managed-resource uniqueness;
- concurrency convergence;
- provider approvals/tasks/runs.

### Organization Adapter plugin

Boundary translator only.

It must not become a second workforce authority.

## 17. Failure matrix

| Case | Required result |
| --- | --- |
| same request replay | same Agent |
| concurrent same request | exactly one active Agent |
| same key, incompatible fingerprint | conflict |
| lost response after successful create | retry resolves same Agent |
| binding missing, one exact marker | relink |
| two exact legacy matches | conflict |
| cross-company Agent | reject |
| terminated Agent | block pending reprovision policy |
| capability unavailable | fail closed |
| capability not approved | fail closed |
| invalid HMAC | reject before mutation |
| no Paperclip credential in Core | expected design |

## 18. Rejected alternatives

### Board credential in Core

Rejected: wrong authority boundary and avoidable secret expansion.

### Agent API Key in Core

Rejected: still crosses the provider boundary and does not prove replay-safe hire creation.

### Plugin self-HTTP as canonical path

Not selected. It is a possible fail-closed fallback but introduces a credential, a journal/create gap and uncertain zero-match liveness.

### LLM-mediated provisioning

Rejected as nondeterministic control-plane behavior.

### Team catalog install

Not selected as employee-instance identity; it is package/import provenance, not arbitrary N instances of one Wandora employee template.

### Built-in Agent registry

Not selected as generic workforce; it proves the uniqueness pattern but represents fixed registry-owned capacity.

### Generated static manifest slots

Rejected as artificial capacity and non-product semantics.

## 19. Capability Authority / Reuse Gate

The Reuse Gate result is:

> extend the specialist control plane at its native Agent authority boundary; do not internalize provider Agent lifecycle in Wandora.

The required capability belongs in Paperclip host/plugin SDK semantics because only Paperclip can atomically constrain Paperclip Agent creation.

Wandora should consume the resulting adapter contract.

## 20. GAPS

Remaining gaps:

- exact plugin capability name;
- exact SDK method/input/output;
- exact uniqueness/locking implementation;
- request fingerprint canonicalization;
- immutable vs mutable provisioning fields;
- terminated Agent reprovision policy;
- behavior when Paperclip requires board approval for new Agents;
- concurrency/lost-response/relink test matrix;
- upstream contribution vs maintained fork;
- pinned build/deployment strategy;
- clean retirement path for a fork after upstream adoption.

## 21. Decision

Decision:

**BLOCK WANDORA WORKFORCE IMPLEMENTATION UNTIL PAPERCLIP EXPOSES A DYNAMIC, PROVIDER-SIDE, REPLAY-SAFE MANAGED AGENT ENSURE PRIMITIVE.**

Specifically:

1. retain Core -> signed HMAC -> Organization Adapter as machine boundary;
2. do not place Paperclip administrative credentials in Core;
3. do not use an LLM run for provisioning;
4. do not use raw dynamic REST create as the canonical retryable path;
5. keep plugin self-HTTP + machine key only as a separately qualified fallback candidate;
6. reuse Paperclip managed-resource and built-in exactly-one patterns;
7. require provider-side convergence for dynamic employee resource keys;
8. same key + same fingerprint must replay to the same Agent;
9. incompatible replay must fail closed;
10. perform no Wandora schema/runtime implementation yet.

## 22. Adversarial review

Initial review:

- block = 0.61;
- deep_review = 0.25;
- proceed_fast = 0.13;
- confidence = 0.46.

That low confidence triggered deeper review of ctx.http, ctx.secrets, ctx.entities, plugin entity uniqueness, team catalog behavior, built-in Agent concurrency and managed-resource uniqueness.

Refined review:

- block = 0.92;
- deep_review = 0.07;
- proceed_fast = 0.01;
- split_task = 0.00;
- confidence = 0.89.

The refined result agrees with the deterministic decision.

## 23. Effect boundary

~~~text
Wandora schema/migration = 0
Wandora runtime change = 0
Paperclip source change = 0
Paperclip plugin change = 0
Paperclip Agent create = 0
credential creation = 0
provider/model call = 0
customer work = 0
outbound = 0
production/VPS mutation = 0
rollout = 0
merge = 0
~~~

## 24. Next slice

Next executable architecture slice:

**Paperclip Dynamic Managed Agent Host Primitive Contract + Upstream/Fork Deployment Preflight V1 — NO EFFECT**

It must determine:

- exact Paperclip host extension point;
- exact SDK/capability contract;
- exact resource-key and fingerprint validation;
- exact uniqueness/locking strategy;
- exact same-company checks;
- exact approval behavior;
- exact concurrency/retry/relink tests;
- upstream contribution vs OARANHA-maintained fork;
- how Wandora pins/verifies the resulting Paperclip build;
- how future upstream releases retire the fork cleanly.

Only after that provider primitive is proven may Wandora resume reusable catalog-hire schema/runtime implementation.
