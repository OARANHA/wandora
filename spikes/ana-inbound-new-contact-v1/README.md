# Ana — Inbound New-Contact Contract V1

This spike freezes the smallest useful supervised workflow for Wandora's first digital employee: **Ana, Assistente Comercial Digital**.

It is a contract proof, not production service code. It uses in-memory state and a fake planner/messaging transport in tests. No live customer database, WhatsApp send or production migration is touched.

## Business responsibility

Ana initially owns one responsibility: receive a WhatsApp contact routed through a Wandora-owned messaging connection, understand the first commercial need and keep the conversation moving without creating commitments the company has not approved.

A new sender does **not** become a sales opportunity automatically. The canonical first objects are contact, conversation and qualification work.

## Canonical flow

```text
normalized inbound text
  -> resolve active Wandora messaging connection
  -> enforce organization ownership
  -> reject duplicate Wandora event
  -> resolve active Ana employee
  -> upsert contact
  -> upsert conversation
  -> append inbound message
  -> reuse/create one qualification work item for that conversation
  -> obtain proposed reply
  -> evaluate Wandora policy
       -> safe: send through Messaging Gateway
       -> commitment: create human approval, do not send
  -> append canonical audit records
```

Provider IDs, Evolution instance names and Mastra run IDs are not part of these customer-facing business objects.

## Approval boundary

The V1 policy allows only non-committing text replies. The following proposal kinds stop for a human before any outbound message is sent:

- discount;
- special price;
- delivery deadline promise;
- payment terms;
- contractual commitment.

The approval object carries the Wandora organization, employee, work item and proposed action. The Messaging Gateway is never called when approval is required.

## Idempotency and continuity

A duplicate normalized Wandora event returns the stored result and does not invoke the planner or transport again. A later event from the same customer reuses the same contact, conversation and active qualification work item instead of creating artificial work per message.

## Audit semantics

The contract emits Wandora-owned audit records for accepted inbound work, approval requests and outbound sends. Audit actor IDs are Wandora system/digital-employee IDs; provider/runtime IDs do not become audit actors. Each audit record carries the normalized Wandora event as its correlation ID.

## Verification

`npm run verify` runs strict TypeScript and the Node test suite. The same suite is also built and executed in the pinned Node 22 container with `--network none`.

The tests prove safe reply, duplicate-event idempotency, approval blocking, cross-tenant connection rejection, conversation/work continuity, disabled-connection denial and paused-employee denial.

## Production boundary

Before real autonomous traffic, this contract must be promoted into reviewed Wandora Core persistence/service code, durable idempotency/audit state, real policy/approval persistence, and the already accepted provider-neutral Messaging Gateway. The spike itself must never be deployed as the production source of truth.
