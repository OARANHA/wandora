# ADR 0397 — Paperclip Dynamic Managed Agent Ensure Provider Patch + Tests + Candidate CI V1

- Status: **Accepted — implementation candidate / CI pending**
- Date: 2026-10-02
- Scope: Paperclip provider patch overlay only
- Production effect: **none**

## Context

ADR 0396 qualified the missing Paperclip host capability required for dynamic
Wandora DigitalEmployee instances:

```text
agents.managed.dynamic
ctx.agents.managed.ensureDynamic(...)
```

The implementation must remain Paperclip-owned operational capability behind the
existing Organization Adapter boundary. It must not move Paperclip credentials
into Wandora Core, create a Wandora Agent lifecycle engine, or reinterpret
Wandora responsibility/effect/messaging semantics.

The exact provider base remains:

```text
Paperclip v2026.916.1
d554c4789ed3930f8a53ac9fdf6503b3187097da
```

and the production-compatible patch model remains the four already-qualified
provider deltas composed on that exact source.

## Decision

Implement the ADR 0396 contract as a **fifth versioned provider patch**:

```text
integrations/paperclip/patches/
  v2026.916.1-dynamic-managed-agent-ensure-v1.patch
```

The fifth patch is authored against the exact four-patch composed source and is
applied last by:

```text
integrations/paperclip/dynamic-managed-agent-v1/
  compose-qualified-patches.sh
```

No long-lived Paperclip fork is introduced.

## Capability boundary

Add the dedicated plugin capability:

```text
agents.managed.dynamic
```

and the worker/host method:

```text
agents.managed.ensureDynamic
```

with SDK surface:

```text
ctx.agents.managed.ensureDynamic(...)
```

The existing `agents.managed` capability remains unchanged and is insufficient
to invoke dynamic provisioning.

## V1 create-only contract

The caller supplies:

- invocation/company scope;
- opaque plugin-local `resourceKey`;
- bounded create-only Agent spec.

The caller does not supply:

- provider Agent ID;
- provider marker;
- plugin identity;
- approval ID;
- authoritative fingerprint;
- reset/update semantics;
- Wandora responsibility/effect/handoff/messaging semantics.

The host normalizes the requested immutable creation spec and computes the
authoritative SHA-256 fingerprint with Paperclip-native stable JSON.

Same key + same fingerprint resolves the same Agent. Same key + different
fingerprint conflicts.

## Provider-owned identity and immutability

The patch adds a distinct provider marker:

```json
{
  "paperclipDynamicManagedAgent": {
    "pluginKey": "...",
    "resourceKey": "...",
    "creationFingerprint": "sha256:..."
  }
}
```

Normal Agent create/update paths cannot forge, change or remove this marker.
Only the internal dynamic managed-Agent service receives the narrow metadata
override needed to create it.

The static `paperclipManagedResource` marker remains separate.

## Exactly-one semantics

Paperclip retains the exactly-one guarantee through all of:

1. one outer provider transaction;
2. `pg_advisory_xact_lock` derived from company + pluginKey + resourceKey;
3. provider-owned marker lookup including terminated Agents;
4. `pluginManagedResources` binding/audit;
5. a new provider-side unique index over:

```text
company_id
+ paperclipDynamicManagedAgent.pluginKey
+ paperclipDynamicManagedAgent.resourceKey
```

with no status predicate, therefore including terminated Agents.

A structural `23505` is treated only as a convergence signal after the losing
transaction has rolled back; a fresh locked read must resolve the same
fingerprint winner or fail closed.

Dynamic binding keys use a host-reserved `$dynamic-agent$:<sha256>` namespace.
The `$` prefix is invalid for manifest-declared static `agentKey`, preventing
static/dynamic binding-key collision while retaining `resourceKind="agent"`.

## Native approval lifecycle

The patch reuses Paperclip's existing `hire_agent` approval lifecycle.

When Board approval is required:

- exactly one pending Agent is created;
- exactly one native hire approval is created in the same outer transaction;
- replay returns that same Agent/approval;
- rejection terminates the Agent;
- later ensure conflicts rather than reprovisioning.

Revision/resubmit remains Paperclip-native. For a dynamic managed hire approval,
an omitted replacement payload is allowed, while a supplied replacement payload
must remain semantically identical to the immutable original creation payload.

No parallel approval state machine is added.

## Validation surface

The fifth patch includes focused tests for:

- dedicated capability isolation;
- same-key/same-spec replay;
- concurrent identical ensure -> one Agent;
- approval-required concurrency -> one Agent + one approval;
- changed immutable spec -> conflict;
- marker read-only enforcement;
- approval revision/resubmit immutability;
- rejection/termination -> no reprovision;
- static/dynamic binding namespace isolation;
- orphan binding fail-closed behavior;
- provider-side marker uniqueness including terminated rows;
- cross-company isolation.

The composition CI additionally reruns the four prior provider regression tests.

## Candidate CI

Two new GitHub-hosted `ubuntu-24.04` workflows are introduced:

- `Paperclip Dynamic Managed Agent Composition CI`
- `Paperclip Dynamic Managed Agent Candidate CI`

The candidate workflow:

- composes exact d554 + all five qualified patches;
- typechecks plugin SDK and server;
- runs focused provider tests;
- builds a distinct image tag:
  `wandora/paperclip:v2026.916.1-dynamic-managed-agent-v1`;
- starts it with synthetic credentials in authenticated/private mode on a fresh
  disposable volume;
- freezes exact Docker archive bytes;
- records the five patch SHA-256 values plus source/candidate provenance;
- uploads only a short-lived Actions artifact.

It does not push an image or contact a production/customer/model provider.

## Adversarial review and correction

Multiple JEV reviews remained conservative (`deep_review`) with very low block
probability. During that review an attempted simplification considered relying
only on the existing `pluginManagedResources` uniqueness constraint.

That simplification is **not adopted**. Re-reading accepted ADR 0396 restored the
explicit provider marker unique-index requirement. The resulting implementation
keeps both the managed-resource binding uniqueness and the marker-level
structural backstop.

This is consistent with the canonical rule that repository/accepted ADR evidence
outranks advisory model routing.

## Current validation state

At the time of this ADR commit:

- implementation files exist on the code-only branch;
- no production runtime/VPS mutation occurred;
- no production migration was applied;
- no real Agent was created;
- no image was pushed;
- CI result is **pending**.

The branch must not be described as qualified/green until exact-head workflows
complete successfully.

## Next gate

After exact-head CI is GREEN, reconcile the PR once and decide the next slice.
Production promotion remains a separate effect-authorizing decision with fresh
rollback/readback/quiescence checks.

No workforce runtime activation is authorized by this ADR.
