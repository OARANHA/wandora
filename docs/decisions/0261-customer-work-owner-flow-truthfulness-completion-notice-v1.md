# ADR 0261 — Customer Work Owner Flow Truthfulness + Completion Notice V1

Status: **IMPLEMENTED IN BRANCH / NO PRODUCTION EFFECT**  
Date: 2026-09-25

## Context

Owner review of the live 28PRO customer UI exposed a product-flow ambiguity:

- Equipe accepts supervised work but does not clearly carry the owner into the place where it can be followed;
- Trabalho promises to show what the team is doing but currently renders only the separate attention-required queue;
- Conversas correctly represents canonical customer/channel conversations, but the product does not make the boundary between conversations and internal employee work obvious;
- Aprovações still contains prototype/demo records even though current product policy requires customer surfaces to render only real state;
- no customer-visible completion notice exists when an internal supervised work result becomes ready.

ADR 0260 already proves genuine owner-originated supervised work can complete through Wandora -> Paperclip -> Ana/Mastra -> Tool Gateway -> VendaERP. This slice changes only customer presentation and read projection.

## REAL NOW

At slice entry:

- main = `b36d7b163760ebd1821bc19deb1d242a5f575707`;
- open PRs = 0;
- ADR 0260 records one successful real 28PRO product work with one provider call, five real products, zero retry and zero outbound;
- production Work page reads only `/work/attention-required`;
- Team's per-employee customer-work panel already reads the canonical per-employee work contract;
- Conversations remains canonical, bounded and read-only under ADR 0166;
- no durable unread-work-result model exists.

## Capability Authority / Reuse Gate

No new table, migration, notification subsystem, work lifecycle, state machine or provider capability is justified.

Reuse:

- existing Wandora digital-employee read;
- existing per-employee supervised customer-work GET;
- existing attention-required queue;
- existing safe work-result renderer;
- existing TanStack Query polling while the Web session is active.

Authority remains separated:

- Paperclip owns operational work lifecycle;
- Wandora owns the customer-facing work projection and semantics;
- Web owns transient presentation feedback only;
- messaging conversations remain a separate canonical read surface.

The Web must not invent durable unread/read state.

## Decision

### 1. Trabalho becomes the owner operational center

The page must show:

- work currently in progress;
- results ready for owner review;
- uncertain/reconciliation states;
- recent supervised work with safe result rendering;
- attention-required work as a distinct section rather than the whole page.

### 2. Team confirms successful assignment

After a successful supervised-work POST, Team must show a clear confirmation and a direct `Acompanhar trabalho` link to Trabalho.

### 3. Completion notice is session-local only

AppShell may poll the existing read contracts and show an ephemeral toast when a work item transitions to `review-ready` during the active browser session.

The first successful poll establishes a baseline. Existing historical results do not become invented unread notifications.

### 4. Conversas stays conversations

Internal supervised assignments/results are not copied into Conversas. Conversas remains the provider-neutral canonical customer/channel history from ADR 0166.

### 5. Remove fictitious approvals

Until a canonical approvals contract exists, Aprovações must render a truthful empty state and route the owner to Trabalho for supervised results and attention-required work.

No fake people, discounts, order numbers or approval records remain.

## Second adversarial review

Rejected:

1. create a notification table merely to support a toast;
2. treat `review-ready` as a durable unread flag;
3. copy internal tasks into the conversation history;
4. turn the attention-required queue into a second work lifecycle;
5. retain demo approvals because they make the screen look populated;
6. change Core/Paperclip contracts before proving the existing read surfaces are insufficient;
7. enable outbound or create a new work item to validate this UX slice.

## Validation contract

Web build must include a dedicated verifier proving:

- post-submit `Acompanhar trabalho` CTA exists;
- Work renders supervised lifecycle plus separate attention-required semantics;
- completion notification explicitly remains session-local/no durable unread state;
- Approvals contains no known demo records;
- Conversations retains its read-only boundary.

Expected verifier:

`WANDORA_WEB_OWNER_WORK_FLOW_V1_OK`

## Effect boundary

This ADR authorizes code and CI only.

It does not authorize:

- production Web promotion;
- customer-work creation;
- provider/model call;
- outbound send;
- Paperclip policy mutation;
- migration or persistent notification state.

A separate production promotion slice is required after merge and exact-head CI.
