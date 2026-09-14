# Ana — Assistente Comercial Digital / Inbound New-Contact Contract V1

Status: **contract frozen by executable spike; production wiring remains separate**

## Human promise

A business owner who hires Ana should understand her as an employee with a narrow first responsibility, not as an agent builder configuration.

Ana's first job is to receive a new WhatsApp contact, acknowledge the person, understand the initial need and keep the qualification conversation moving under company rules.

The owner should see a contact, a conversation, work assigned to Ana and, when necessary, an approval. They should not see provider instances, model runs, prompts, tokens or infrastructure IDs.

## What counts as the first contact

For V1, the workflow starts from a normalized inbound text event received on an active Wandora messaging connection owned by the organization.

If the sender is not yet known to that organization/channel, Wandora creates the canonical contact. If the sender already exists, Wandora reuses the contact and conversation. A later message is continuity of the same qualification work, not a new work item by default.

The workflow does not create an opportunity, quote, deal or sale merely because someone sent a message. Those states require later business evidence and policy.

## Responsibility and limits

Ana may make low-risk conversational moves that do not commit the company: greet, acknowledge, ask clarifying questions and continue qualification using confirmed company knowledge.

Ana must stop for human approval before sending any reply that creates or implies a discount, special price, delivery deadline, payment condition or contractual commitment. Ambiguous policy should follow the same conservative boundary when production policy is implemented.

A disabled messaging connection or paused employee prevents work before customer state is created or any planner/transport action occurs.

## Canonical state owned by Wandora Core

The first vertical slice needs durable forms of these Wandora-owned concepts:

- organization and active messaging connection;
- digital employee assignment/status;
- contact;
- conversation;
- inbound/outbound message record;
- qualification work item;
- approval request;
- normalized event result/idempotency receipt;
- audit record.

Provider bindings remain private. Provider message IDs or runtime run IDs may be stored internally for reconciliation, but are not the canonical IDs shown to the customer or used as audit actors.

## What the owner sees

`Início` should show that Ana received/handled a new contact and whether anything needs attention. `Equipe` shows Ana's responsibility/status. `Trabalho` shows the active qualification item. `Conversas` shows the customer thread. `Aprovações` appears only when Ana crosses the autonomy boundary.

The same customer continuing the same qualification should remain understandable as one piece of work rather than a stream of artificial tasks.

## Idempotency and audit

Duplicate normalized inbound events must not re-plan or re-send. Separate later events may produce later replies but reuse the same business context. Accepted inbound work, approval requests and outbound sends are auditable using canonical organization and Wandora actor IDs plus the Wandora-normalized event correlation ID.

## Executable evidence

The V1 spike passes strict TypeScript and seven tests locally and inside a pinned Node 22 container with networking disabled. The tests cover safe reply, duplicate-event idempotency, human-approval blocking, cross-tenant connection denial, contact/conversation/work reuse, disabled-connection denial and paused-employee denial.

The spike uses in-memory stores and fake planner/transport implementations. It proves the business contract only; it does not authorize production autonomous sending.

## Next executable slice

**WANDORA WEB PREVIEW — CUSTOMER EXPERIENCE DEPLOYMENT V1**

Publish the already validated customer Product Shell and `/start` first-day journey at `app.wandora.com.br` as a clearly non-production-data preview so the product can be evaluated by a human operator before deeper backend promotion. After that review, proceed with **ANA VERTICAL SLICE V1 — durable Core state + supervised real-path wiring**.
