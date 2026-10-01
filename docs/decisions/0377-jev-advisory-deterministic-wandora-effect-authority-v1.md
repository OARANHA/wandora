# ADR 0377 — JEV Advisory / Deterministic Wandora Effect Authority V1

Date: 2026-10-01

Status: **ACCEPTED / GOVERNANCE CLARIFICATION / DOCUMENTATION ONLY / NO CUSTOMER OR PROVIDER EFFECT**

## Context

ADR 0287 already establishes the authority boundary for TypeSafe/JEV:

- TypeSafe/JEV supplies probabilistic judgments only;
- it does not define customer authorization;
- it does not define Wandora deterministic Fast Read thresholds;
- Wandora-owned deterministic policy remains authoritative.

ADR 0376 later applied a slice-local fail-closed rule that required a sufficiently clear/confirmable JEV GO before the single real canary could execute. That wording unintentionally promoted an advisory probabilistic review into an authorization authority.

This ADR corrects that governance mismatch without rewriting ADR 0376's historical facts. ADR 0376 remains true that its canary was not executed.

ADR 0168 remains binding: portability is contract decoupling, not implementation duplication.

## Decision

**JEV advises. Wandora decides.**

The mandatory second adversarial review remains part of the Wandora execution discipline:

`DECISION → SECOND ADVERSARIAL REVIEW → EXECUTION`

but its role is advisory evidence, not independent authorization.

Effect authorization is Wandora-owned and deterministic. A production/customer effect may execute only when every canonical deterministic gate required for that slice is proven GREEN immediately before the effect.

A JEV result:

- may identify a missing proof, contradiction or risk that must be investigated;
- may recommend deeper review;
- may never widen the authorized scope;
- may never override a deterministic Wandora DENY;
- may never authorize an effect when required deterministic evidence is missing;
- does **not** independently veto an otherwise fully proven deterministic Wandora GO merely because its probability distribution is low-confidence or its top advisory class is `review`.

If an advisory review identifies a concrete new factual gap, that gap becomes an ordinary deterministic evidence gap and must be resolved or the action remains blocked.

If the advisory output is merely probabilistically uncertain and identifies no new factual gap, the Wandora-owned deterministic gate remains authoritative.

Any future policy that wants a numeric JEV threshold to be binding must define that threshold explicitly in a newer accepted ADR. No implicit probability threshold is created by this ADR.

## Deterministic authority for Semantic Fast Read

For the current Semantic Fast Read single-real-canary boundary, Wandora-owned deterministic authorization includes the canonical evidence required by the active rollout/runbook, including:

- exact authenticated tenant/user role authorization;
- exact enrolled organization + employee target;
- exact allowed Wandora `BusinessCapability` scope;
- exact current Git/source/CI provenance required by the slice;
- healthy current Core/Web/Paperclip/Organization Adapter runtime posture;
- current provider operational projection;
- current Paperclip Tool Policy authorization;
- read-only / non-write / non-destructive tool semantics;
- Task Drain/quiescence requirements;
- Human Send OFF;
- Messaging Gateway outbound OFF;
- exactly one request;
- no retry;
- no second customer request;
- no fallback capability;
- no direct provider/tool/credential bypass.

Failure or uncertainty in any required deterministic gate remains fail-closed regardless of JEV advice.

## Data minimization for advisory review

Second adversarial review should receive the minimum evidence necessary to reason about the proposed effect.

Do not send browser cookies, JWTs, bearer tokens, session/local storage, provider credentials, secrets or raw protected payloads to JEV.

Where concrete identifiers are not required for the review, prefer abstract facts such as:

- authenticated owner proven;
- exact enrolled target proven;
- read-only policy GREEN;
- provider connection healthy;
- single request / no retry;
- outbound OFF.

The production Semantic Decision Provider contract from ADR 0287 remains unchanged and continues to receive only its already-qualified bounded semantic inputs.

## Supersession scope

This ADR supersedes only the conflicting governance interpretation in ADR 0376 that a clear JEV GO is itself required as an authorization condition.

It does **not**:

- retroactively execute the ADR 0376 canary;
- change ADR 0376's historical effect accounting;
- weaken deterministic fail-closed policy;
- make the second adversarial review optional;
- change Paperclip operational authority;
- change Mastra/runtime authority;
- change VendaERP tool policy;
- change rollout scope;
- enable Human Send or Messaging Gateway outbound;
- authorize a PR merge;
- authorize the current canary by implication.

A future canary execution still requires fresh REAL NOW, fresh deterministic evidence, a recorded second adversarial review, an explicit Wandora-owned deterministic GO, exactly one canonical owner-browser request, and post-effect validation.

## Capability Authority / Reuse Gate

No new capability, table, migration, service, state machine, policy engine or provider mirror is justified.

The existing authority split remains:

- Wandora: semantic/product/authorization/effect authority;
- JEV/TypeSafe: advisory probabilistic judgment / semantic provider behind Wandora contracts;
- Paperclip: operational employee/run/Connection/grant/Tool Gateway/audit authority;
- Mastra: replaceable runtime implementation;
- VendaERP: replaceable business-system provider implementation.

## Effects

Documentation/governance only.

No production mutation, provider call, customer request, Ana run, VendaERP execution, Human Send, Gateway outbound, rollout expansion or PR merge is performed by this ADR.
