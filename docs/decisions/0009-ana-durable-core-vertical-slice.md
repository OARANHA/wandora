# ADR 0009 — Ana durable Core vertical slice V1

Date: 2026-09-14
Status: **Accepted; live database foundation applied and verified on 2026-09-14**

## Context

ADR 0007 froze Wandora-owned organization/auth identity and the Ana V1 product contract froze the first employee responsibility. The next risk was persistence and orchestration: contact, conversation, work, approvals, idempotency and audit must survive process restarts without becoming Mastra/Evolution state.

The slice must preserve the human experience already reviewed in Wandora Web: customers see conversations, work and approvals rather than provider/runtime implementation details.

## Decision

Promote the accepted Core identity contract and Ana's first workflow into versioned Supabase/PostgreSQL migrations and a real `apps/core` TypeScript service boundary.

Canonical durable state includes digital employees, contacts, conversations, messages, qualification work items, approvals and Wandora audit records. Private durable state includes normalized inbound-event receipts and outbound-attempt idempotency/reconciliation state.

The service keeps provider boundaries abstract through `AgentRuntime` and `MessagingGateway` interfaces. It never calls Mastra or Evolution-specific APIs as business logic.

Outbound safety is conservative. A planned attempt becomes `sending` before transport. If transport or post-send persistence is ambiguous, the attempt becomes `uncertain`, the work item becomes `attention-required`, and the same idempotency key is not automatically sent again.

Commercial commitments remain behind human approval. In V1, active `owner`/`admin` members may approve or reject; cross-organization actors cannot decide an approval.

The reviewed Core multitenant/auth and Ana V1 migrations are part of this accepted foundation and are now applied to the live Wandora Supabase PostgreSQL database. Application to production did not enable customer traffic, runtime/model calls or autonomous employee behavior by itself.

## Evidence

A reproducible verifier creates a disposable Supabase PostgreSQL 17.6.1.136 instance, applies both migrations, validates SQL invariants, then runs `apps/core` under pinned Node 22.23.2.

Verified behavior includes tenant isolation, one active qualification context, inbound/outbound deduplication, replay-safe duplicate events, durable approval/rejection, cross-tenant approval denial, disabled/foreign connection denial before customer-state creation, paused-employee denial before customer-state creation, in-progress receipt collision handling, ambiguous-delivery protection and safe retry after Agent Runtime failure.

Current integration evidence: strict TypeScript plus 10/10 Node tests green (one parent suite + nine behavioral subtests).

Before live application, a logical snapshot of the actual live database was restored into disposable Supabase PostgreSQL 17.6.1.136. Exact Git migration blobs were applied successfully against that restored state. A separate production verifier was then introduced that executes inside `SET TRANSACTION READ ONLY` and checks schemas, tables, RLS, grants, functions, policies, constraints, indexes and triggers without inserting synthetic data.

Live application evidence on 2026-09-14:

```text
MIGRATION_001_LIVE_OK
MIGRATION_002_LIVE_OK
ANA_LIVE_POSTVERIFY_V1_OK
SUPABASE_POST_MIGRATION_HEALTH_OK
ANA_LIVE_MIGRATION_V1_OK
SUPABASE_PUBLIC_POST_MIGRATION_SMOKE_OK
```

After application, the new Wandora tables contained no synthetic customer rows.

## Consequences

Positive:

- Ana's business state survives runtime/container restarts;
- transactional truth remains independent from model memory;
- human approvals are durable and auditable;
- duplicate inbound/outbound work is structurally constrained;
- provider adapters remain replaceable;
- the live PostgreSQL foundation now exists before provider/runtime wiring starts;
- production post-verification can be repeated safely without mutating business data.

Still separate from this decision:

- production Core database credentials/role provisioning;
- wiring the real Mastra runtime adapter and Messaging Gateway implementation;
- exposing Core read/API endpoints to Wandora Web;
- selecting/configuring a real model provider token;
- enabling unsupervised customer traffic.

A Mistral credential that was accidentally committed to Git must be treated as compromised and must not be reused. A fresh credential may be provisioned only when a real model call is materially required and only through an approved secret path.

## Next step

Provision a private, least-privilege production Core database role/credential path, then wire this durable Core service to the already validated Messaging Gateway and Mastra Agent Runtime Adapter in **supervised real-path mode**. Surface the resulting canonical state in Wandora Web before any autonomous production enablement.
