# ADR 0009 — Ana durable Core vertical slice V1

Date: 2026-09-14
Status: **Accepted for reviewed code/migrations; live production application remains a separate deployment step**

## Context

ADR 0007 froze Wandora-owned organization/auth identity and the Ana V1 product contract froze the first employee responsibility. The next risk is persistence and orchestration: contact, conversation, work, approvals, idempotency and audit must survive process restarts without becoming Mastra/Evolution state.

The slice must preserve the human experience already reviewed in Wandora Web: customers see conversations, work and approvals rather than provider/runtime implementation details.

## Decision

Promote the accepted Core identity contract and Ana's first workflow into reviewed Supabase/PostgreSQL migrations and a real `apps/core` TypeScript service boundary.

Canonical durable state includes digital employees, contacts, conversations, messages, qualification work items, approvals and Wandora audit records. Private durable state includes normalized inbound-event receipts and outbound-attempt idempotency/reconciliation state.

The service keeps provider boundaries abstract through `AgentRuntime` and `MessagingGateway` interfaces. It never calls Mastra or Evolution-specific APIs as business logic.

Outbound safety is conservative. A planned attempt becomes `sending` before transport. If transport or post-send persistence is ambiguous, the attempt becomes `uncertain`, the work item becomes `attention-required`, and the same idempotency key is not automatically sent again.

Commercial commitments remain behind human approval. In V1, active `owner`/`admin` members may approve or reject; cross-organization actors cannot decide an approval.

## Evidence

A reproducible verifier creates a disposable Supabase PostgreSQL 17.6.1.136 instance, applies both migrations, validates SQL invariants, then runs `apps/core` under pinned Node 22.23.2.

Verified behavior includes tenant isolation, one active qualification context, inbound/outbound deduplication, replay-safe duplicate events, durable approval/rejection, cross-tenant approval denial, ambiguous-delivery protection and safe retry after Agent Runtime failure.

Current integration evidence: strict TypeScript plus 7/7 Node integration tests green.

## Consequences

Positive:

- Ana's business state survives runtime/container restarts;
- transactional truth remains independent from model memory;
- human approvals are durable and auditable;
- duplicate inbound/outbound work is structurally constrained;
- provider adapters remain replaceable.

Still separate from this decision:

- applying migrations to live Supabase;
- production Core database credentials/role provisioning;
- wiring the real Mastra runtime adapter and Messaging Gateway implementation;
- exposing Core read/API endpoints to Wandora Web;
- selecting a real model provider/token;
- enabling unsupervised customer traffic.

## Next step

Wire this durable Core service to the already validated Mastra Agent Runtime Adapter and Messaging Gateway in **supervised real-path mode**, then surface the resulting canonical state in Wandora Web before any autonomous production enablement.
