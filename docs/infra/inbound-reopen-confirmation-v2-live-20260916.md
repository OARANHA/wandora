# Inbound Reopen + Canonical Confirmation V2 — Live Proof

Date: 2026-09-16

## Scope

This record captures the production proof that closed two connected boundaries:

1. ADR 0028 supervised inbound reuse for an already-active work item;
2. ADR 0027 Canonical Confirmation V2 through a real human-supervised WhatsApp delivery.

No personal destination number, message body, provider credential, HMAC or API key is recorded here.

## Core promotion

Core was promoted from:

```text
wandora/core:canonical-confirm-a1ee4755
```

to:

```text
wandora/core:inbound-reopen-384bfee6
```

Rollback metadata was captured before recreate. The live Core retained the same private networks and mounted secret boundaries and returned:

```text
healthz = 200
readyz  = 200
health  = healthy
```

Human Send remained disabled during this promotion.

## Real failed inbound replay

The real WhatsApp inbound that had previously produced a canonical `422` was identified by its existing normalized `eventId` and matched back to the original provider message identifier using the same SHA-256 normalization contract as the Messaging Gateway.

The same normalized event was reprocessed through the existing private Gateway → Core client path. No manual UPDATE/INSERT was used to repair business state.

Observed result:

```text
Core ingress HTTP = 202
receipt            = completed
event_messages     = 1
event_proposals    = 1
conversation_works = 1
work_status        = attention-required
outbound_attempts  = 3
outbound_messages  = 1
```

This proves the inbound replay did not duplicate the inbound message, did not create a duplicate work item and did not create an outbound side effect.

## Controlled Confirmation V2 activation

After the inbound proof, the outbound activation was reviewed separately.

The canonical proposal used for the real proof had:

```text
commitment = none
```

Gateway outbound was enabled first and verified healthy. Core Human Send was then enabled for the configured canonical provider-bound connection and verified:

```text
Core healthz = 200
Core readyz  = 200
Gateway health = healthy
```

Merely enabling the capabilities produced no outbound effect. Counters remained:

```text
outbound_attempts = 3
outbound_messages = 1
```

## Real human-supervised send

The human reviewed the Core-owned Confirmation V2 snapshot in Wandora Web and explicitly confirmed the send.

The external destination handset subsequently received the WhatsApp message.

Post-send canonical state showed exactly one new outbound effect:

```text
outbound_attempts = 4
outbound_messages = 2
```

The newest attempt was:

```text
status = succeeded
idempotency key = proposal-send:<canonical proposal id>
proposal linkage = exact proposal created from the replayed inbound
work linkage = same active work item
source event linkage = same replayed inbound event
```

The newest canonical outbound message was linked to the same conversation and used the proposal-send source event.

The work transitioned from:

```text
attention-required
```

to:

```text
waiting-customer
```

The proposal itself remained `commitment=none`.

## Proven properties

The combined proof establishes:

- repeated inbound on an `attention-required` work reuses the same work;
- the failed receipt can complete through the normal private processing path without direct DB repair;
- inbound idempotency preserves one inbound message;
- supervised proposal creation is renewed without duplicate work;
- enabling outbound capability alone does not send;
- a real outbound effect requires the explicit human confirmation step;
- the successful attempt is durably linked to the exact human-reviewed canonical proposal/work/source event;
- one canonical outbound message is persisted on success;
- the work moves to `waiting-customer` after the send;
- the message was observed on the explicitly authorized handset;
- no personal destination data or secret material is committed to Git.

## Process

The operational sequence followed:

**decision → second adversarial review → execution → validation**

Rollback information was captured before promotion and before controlled capability activation. No historical `uncertain` outbound attempt was retried or rewritten.
