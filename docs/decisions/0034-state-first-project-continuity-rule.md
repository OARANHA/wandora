# ADR 0034 — State-First Project Continuity Rule

Date: 2026-09-16
Status: **Accepted operational rule.**

## Context

Wandora is being built incrementally through tested vertical slices. Several customer-facing surfaces and runtime paths already exist and some have been proven end-to-end in live conditions.

A planning error can occur when a new discussion starts from an abstract product model instead of the actual repository/live state. That can make already-built or already-proven capabilities sound as if they still need to be designed from zero, causing duplicated work, incorrect prioritization and loss of project continuity.

A second planning error is also possible: after a real gap is found, the absence of a local Wandora schema/service can be mistaken for evidence that Wandora must implement the missing capability itself. ADR 0036 closes that gap by requiring a capability-authority/reuse review before local design begins.

## Decision

Before proposing, prioritizing or implementing any material next step, the agent must use this order:

1. **Observed current state** — what actually exists in the repository, deployed runtime and canonical data/contracts.
2. **Proven evidence** — what has already passed CI, verifiers, live checks, end-to-end tests or explicit user validation.
3. **Remaining gaps** — what is incomplete, placeholder, disconnected, unproven or intentionally deferred.
4. **Capability authority / reuse gate** — determine whether the gap belongs to Wandora itself or is already wholly/partly provided by Paperclip, Mastra, Evolution, Supabase or another accepted component. Apply ADR 0036 before inventing new domain state.
5. **Next decision** — only after the first four steps, apply the mandatory decision → second adversarial review → execution → validation cycle.

## State-first rule

Do **not** describe an existing capability as if it were unbuilt merely because the current discussion is conceptual.

Do **not** redesign a customer journey from zero when the project already contains working screens, contracts or live flows. First inventory what is real and preserve it; then close only the remaining gaps unless there is explicit evidence requiring redesign.

Do **not** infer project state from generic SaaS/product architecture when repository/live evidence is available.

Do **not** infer local implementation ownership merely because a capability is absent from the current Wandora schema. A missing local table can mean the capability belongs behind an already accepted adapter.

If remembered context, documentation and observed runtime conflict, inspect the authoritative sources and reconcile the discrepancy before making a new material decision.

## Required planning format

For material product work, the internal planning sequence is:

```text
REAL NOW
  ↓
PROVEN / TESTED
  ↓
GAPS
  ↓
CAPABILITY AUTHORITY / REUSE GATE
  ↓
DECISION
  ↓
SECOND ADVERSARIAL REVIEW
  ↓
EXECUTION
  ↓
VALIDATION
```

A useful status classification for existing customer surfaces is:

- **REAL** — connected to canonical contracts and proven in the intended path;
- **PARTIAL** — UI or contract exists but some persistence/action/integration/proof is incomplete;
- **PLACEHOLDER** — visual/product intent exists but no real contract/action yet.

The goal is to convert PARTIAL/PLACEHOLDER gaps without rebuilding REAL capabilities and without recreating mature provider capabilities inside Wandora.

## Wandora-specific application

The proven customer journey and existing screens must be treated as existing product state, not future concepts. For example, when `Trabalho`, `Conversas`, Human Session, multi-organization selection or supervised messaging have already been implemented/proven, subsequent planning starts from those facts.

Platform Admin work must not cause the customer product to be described as if it had not already been built. Conversely, customer-facing work must not erase the separate Platform Admin trust boundary already established.

A new customer action such as “Contratar funcionário” must first be decomposed into Wandora-owned product semantics versus the control-plane/runtime/transport capabilities already assigned to Paperclip, Mastra, Evolution and Supabase. Only the minimum demonstrably Wandora-owned state may be added after that review.

## Consequences

Positive:

- preserves continuity across long sessions and new chats;
- avoids duplicate implementation and unnecessary redesign;
- prevents local schema growth from silently turning Wandora into partial reimplementations of accepted components;
- keeps priorities grounded in actual customer progress;
- makes the second adversarial review operate on current evidence and explicit capability ownership rather than assumptions;
- reduces technical and product debt caused by solving already-solved problems twice.

Trade-off:

- material planning may require a brief repository/live-state and provider-capability audit before selecting the next slice.

That audit is considered part of correct execution, not overhead to skip.

## Relationship to existing rules

This rule **precedes** the existing mandatory decision cycle in practical use:

**state real → evidence already proven → gaps → capability authority/reuse gate → decision → second adversarial review → execution → validation**.

It does not replace ADRs or the authority order. It defines how current state and capability ownership must be recovered before using them to choose new work.
