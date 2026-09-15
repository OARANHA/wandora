# Gateway → Core Supervised Live Proof V1

Status: **runbook accepted for the controlled internal proof; execution remains a separate reviewed production operation.**

## Purpose

This runbook defines the smallest live proof that a real Evolution inbound event can traverse the promoted Wandora Messaging Gateway and reach Wandora Core without enabling model execution or outbound WhatsApp.

The proof uses an explicitly synthetic Wandora-internal tenant. It is **not customer data**, not an onboarding shortcut and not a production customer account.

## Canonical proof identities

These UUIDs are stable operational identities for this proof only:

- organization: `3ddc8ca6-8961-4ad3-99e0-d7f869249a61`
- messaging connection: `b3149620-7505-460c-ac62-f7ea50762dee`
- digital employee: `a9e99be5-185d-4b2b-a42f-eedba759034f`

Human users, memberships and provider-binding rows are intentionally absent because the supervised inbound boundary does not require them.

## Versioned foundation operation

Apply only the reviewed operation:

`infra/stacks/supabase/operations/20260914_gateway_supervised_proof_fixture_v1.sql`

The operation is transactional, idempotent and fail-closed on identifier/slug collisions. It creates only:

- active internal proof organization;
- active canonical WhatsApp messaging connection;
- active supervised `commercial-assistant` named Ana.

It does not create contacts, conversations, messages, approvals or outbound attempts. Those must appear only as evidence of the subsequent ingress proof.

Immediately verify using:

`infra/stacks/supabase/verifiers/VERIFY_20260914_GATEWAY_SUPERVISED_PROOF_FIXTURE_V1_LIVE.sql`

The verifier is read-only.

## Credential boundary

Generate two fresh independent secrets on the VPS only after the exact merged images and fixture are ready:

1. Evolution → Gateway webhook JWT key;
2. Gateway → Core HMAC secret.

Never record either value in Git, chat, logs or environment-value configuration. Store them in operator-controlled non-world-readable files and mount them read-only.

The Evolution JWT key must not be reused as the Gateway → Core HMAC secret.

## Deployment order

1. Verify current Core/Evolution/Gateway health and capture rollback configuration.
2. Take and validate a fresh PostgreSQL logical backup.
3. Apply and verify the controlled internal proof fixture.
4. Build/deploy the exact merged Messaging Gateway image privately, without changing the Evolution webhook.
5. Build/deploy the exact merged Core image with database mode plus the opt-in Gateway-ingress overlay.
6. Prove Core health/readiness and no public host port.
7. Send one synthetic Evolution-shaped request to the new Gateway using a locally generated valid provider JWT.
8. Verify the event reaches Core and stops at `supervision-required`.
9. Replay the exact same synthetic provider event and prove durable idempotency.
10. Only then cut the selected Evolution instance webhook from the laboratory Gateway to the promoted private Gateway.
11. Perform one supervised real handset inbound proof.

## Synthetic end-to-end invariants

Before cutting over the real Evolution webhook, the synthetic proof must show exactly one new inbound path for its synthetic event:

- one canonical contact;
- one conversation;
- one inbound message carrying only normalized text/address/event ID;
- one qualification work item in `attention-required`;
- one completed durable receipt whose result is `supervision-required`;
- zero approvals;
- zero outbound attempts;
- no raw Evolution instance, JID, API key, server URL or raw provider message ID in canonical message/work state.

Replaying the same provider event must return the durable duplicate outcome without increasing those counts.

## Evolution cutover contract

The selected instance remains `wandora-lab-01` for this proof.

After synthetic proof is green, configure only:

- webhook URL: `http://wandora-messaging-gateway:8787/providers/evolution/webhook`
- enabled: true
- by-events: false
- base64: false
- events: `MESSAGES_UPSERT` only
- per-webhook header configuration: `jwt_key` with the fresh Evolution → Gateway key.

Before changing it, preserve the current exact webhook configuration in a protected operator-only rollback file. Never print the current secret header value.

If the supported Evolution API route cannot read/set the webhook reliably, stop the cutover and investigate. Do not mutate the Evolution database directly merely to bypass an API error without a separate reviewed decision.

## Real handset proof

The user should be asked to send one WhatsApp message only after all synthetic checks and webhook cutover checks are green.

Success means the handset event creates/reuses canonical supervised work and stops at `attention-required` / `supervision-required` with no automated reply.

No Mistral, Chutes, Mastra model call or outbound WhatsApp is required in this proof.

## Cleanup and retention

Do **not** automatically delete the internal proof tenant after the handset proof. Once dependent proof rows exist, deletion becomes a destructive operation with different risk and evidentiary value.

Keep the clearly named internal proof tenant until a later explicit cleanup operation is reviewed. It must never be presented as customer data or counted as a real customer account in product metrics.

## Recovery boundary

The preferred rollback before real handset cutover is configuration rollback, not database restore:

- return Evolution webhook to the captured laboratory configuration;
- disable the Core Gateway-ingress overlay if necessary;
- stop/remove the promoted Gateway if necessary;
- keep durable internal proof evidence intact unless a separate data-cleanup operation is approved.

A database restore is reserved for actual database corruption or an explicitly reviewed recovery case, not ordinary cutover rollback.
