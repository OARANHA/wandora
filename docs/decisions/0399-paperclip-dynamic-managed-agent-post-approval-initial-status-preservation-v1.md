# ADR 0399 — Paperclip Dynamic Managed Agent Post-Approval Initial Status Preservation V1

- Status: **IMPLEMENTED CANDIDATE / EXACT-HEAD CI PENDING / NO PRODUCTION EFFECT**
- Date: 2026-10-02
- Scope: provider lifecycle continuity for dynamic managed Agents through native Board approval
- Base: PR #397 exact head `a9b0f76d21758aea6ee70ce32796c400e08969fe` — 13/13 GREEN
- Production effect: **none**

## REAL NOW

Fresh post-GREEN reconciliation proved PR #397:

- open;
- draft;
- mergeable;
- unmerged;
- exact head `a9b0f76d21758aea6ee70ce32796c400e08969fe`;
- exact-head workflows **13/13 completed/success**.

ADR 0398 qualified atomic `initialStatus = idle | paused` creation for companies
that do not require Board approval. It deliberately left post-approval behavior
open.

Read-only provider evidence proves the remaining gap:

`agentService.activatePendingApproval()` unconditionally transitions a pending
Agent to `idle`.

Therefore a dynamic managed hire that requested `paused` would become
operational immediately after native Board approval. That violates the accepted
Wandora product contract from ADR 0063/0064:

```text
Contratar != Ativar
new customer DigitalEmployee = paused + supervised
activation = separate explicit effect
```

## CAPABILITY AUTHORITY / REUSE GATE

### Wandora-owned semantic authority

- canonical DigitalEmployee identity;
- customer meaning of hire versus activation;
- paused-first product policy.

### Durable Wandora product state

No new state is required. Existing DigitalEmployee status and private provider
binding remain sufficient.

### Paperclip operational authority

Paperclip continues to own:

- Agent lifecycle;
- `pending_approval`;
- native `hire_agent` approvals;
- approval resolution;
- operational pause/resume state;
- provider marker/fingerprint and audit.

### Provider implementation

The correction stays inside the existing dynamic managed provider primitive and
native approval path.

### Replacement boundary

Organization Adapter remains the provider boundary. No Paperclip lifecycle
state or approval state is mirrored into Wandora.

ADR 0168 remains binding: portability is contract decoupling, not duplication.

## DECISION

The immutable native hire approval payload for a dynamic managed Agent records:

```text
dynamicManagedRequestedInitialStatus = idle | paused
```

This value is provider-derived from the already normalized create-only spec. It
is not supplied as an independent authoritative fingerprint or marker.

When `activatePendingApproval()` resolves a pending Agent:

1. read the provider-owned dynamic managed marker from the existing Agent;
2. if no dynamic marker exists, preserve generic Paperclip behavior:
   `pending_approval -> idle`;
3. if the marker exists, require the approval payload to contain exactly
   `idle` or `paused`;
4. invalid/missing dynamic status fails closed;
5. requested `paused` transitions atomically to:
   - `status = paused`;
   - `pauseReason = system`;
   - `pausedAt = now`;
6. requested `idle` transitions to `idle` with cleared dynamic pause fields.

No adapter-side “approve then pause” race is introduced.

## VALIDATION CONTRACT

Focused provider tests require:

- paused request + Board approval:
  `pending_approval -> paused`;
- approved paused Agent has native `pauseReason = system` and `pausedAt`;
- idle request + Board approval:
  `pending_approval -> idle`;
- generic/non-dynamic pending approval remains `idle` after approval through
  Paperclip's existing `agents-pending-approval-config.test.ts`;
- dynamic approval payload immutability remains enforced;
- rejection still terminates;
- same-resource replay and uniqueness behavior remain unchanged.

Both dynamic managed Agent workflows run the generic pending-approval regression
in addition to the focused dynamic tests.

## SECOND ADVERSARIAL REVIEW

The decision was challenged against:

- Organization Adapter create-then-pause;
- a new Wandora lifecycle/state mirror;
- modifying generic Paperclip approval behavior;
- proceeding to Adapter wiring first.

Result:

```text
proceed_fast = 0.61
deep_review  = 0.38
block        = 0.01
split_task   = 0.00
```

Provider-side preservation is preferred because the provider owns the native
approval transition and can make it atomic. The implementation is explicitly
marker-gated so ordinary Paperclip hires retain their existing behavior.

## EFFECT BOUNDARY

This slice does not authorize:

- merge of #397 or this stacked PR;
- registry push;
- production deployment/migration;
- Paperclip restart/recreate;
- Organization Adapter upgrade;
- Core/schema change;
- real Agent creation;
- customer/workforce activation;
- messaging/model/provider outbound effect.

## NEXT GATE

After exact-head CI GREEN, re-enter the Organization Adapter dynamic managed
employee bridge decision with the full paused-first lifecycle now proven across
both no-approval and Board-approval companies.
