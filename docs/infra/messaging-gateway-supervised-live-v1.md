# Messaging Gateway → Core Supervised Live Proof V1

Date: 2026-09-15
Status: **LIVE PROOF COMPLETE**

## Purpose

Record the first production supervised WhatsApp inbound proof through the promoted private Wandora Messaging Gateway into Wandora Core without enabling model execution, approval side effects or outbound messaging.

This document records operational evidence only. It does not expose secret values, raw provider credentials or customer-facing provider identifiers.

## Preconditions completed

Before the live cutover:

- PR #29 had merged the authenticated private Gateway → Core supervised ingress;
- PR #30 had merged the promoted private Evolution Messaging Gateway runtime;
- PR #31 had merged the controlled internal supervised-proof fixture and read-only verifier;
- Core and Gateway CI were green on `main`;
- a fresh logical PostgreSQL backup was created with checksum verification;
- that backup was restore-tested in an isolated temporary database before any live fixture mutation;
- the controlled internal fixture created exactly one internal organization, one active WhatsApp messaging connection and one supervised Ana employee;
- no contact, conversation, message, approval or outbound attempt was created by the fixture itself.

## Private runtime state

The promoted services run only on private Docker networks.

Wandora Core:

- container: `wandora-core`;
- database mode;
- non-root;
- read-only root filesystem;
- capabilities dropped;
- `no-new-privileges`;
- no host-published port;
- `/healthz = 200`;
- `/readyz = 200`;
- database identity remains `wandora_core_runtime`, `CONNECTION LIMIT 4`, no `BYPASSRLS`.

Messaging Gateway:

- container: `wandora-messaging-gateway`;
- inbound-only runtime;
- non-root;
- read-only root filesystem;
- capabilities dropped;
- `no-new-privileges`;
- no host-published port;
- `/healthz = 200`;
- no database credential.

## Authentication boundaries

Two independent credentials are used and remain outside Git/chat:

1. Evolution → Messaging Gateway: Evolution 2.3.7 per-webhook `jwt_key`, producing short-lived HS256 Bearer JWTs.
2. Messaging Gateway → Core: dedicated HMAC-SHA256 secret over timestamp + exact normalized request body.

The credentials are not reused across hops.

The Evolution signing key is stored in a non-world-readable operator-controlled file and mounted read-only into the Gateway. The Gateway → Core HMAC secret is also file-backed and mounted only into the services that need it.

## Evolution API 2.3.7 CORS finding

During pre-cutover diagnostics, Evolution management endpoints returned HTTP 500 when called server-to-server without an `Origin` header.

Inspection of the installed 2.3.7 source showed the CORS middleware rejects an absent origin when `CORS_ORIGIN` is restricted and the global error middleware converts that ordinary CORS error into HTTP 500.

Using an already configured allowed Origin produced the expected API behavior:

- credentials verification: HTTP 200;
- `GET /webhook/find/wandora-lab-01`: HTTP 200;
- nonexistent instance: HTTP 404.

No database repair or direct Evolution database mutation was required.

## Rollback protection

Immediately before webhook cutover, the existing per-instance Evolution webhook configuration was saved in an operator-controlled `0600` rollback snapshot with SHA-256 checksum.

The saved configuration preserved the previous laboratory destination and event set. The secret value itself is not recorded in this document.

## Synthetic proof before cutover

Before changing the real Evolution webhook:

1. Core ingress was enabled privately and proved fail-closed without HMAC (`401`).
2. The promoted Gateway was started privately and proved fail-closed without a valid Evolution JWT (`401`).
3. A synthetic provider-shaped event with valid provider authentication traversed Gateway → Core.
4. Core created exactly one contact, one conversation, one inbound message, one qualification work item and one completed inbound receipt.
5. The work item stopped at `attention-required` and the receipt result was `supervision-required`.
6. `approvals = 0` and `outbound_attempts = 0`.
7. Raw Evolution message identity did not become canonical Wandora message identity.

## Live webhook cutover

The selected Evolution instance remained `open` throughout the operation.

The official Evolution API was used to change only the per-instance webhook destination/authentication boundary:

- destination: private `wandora-messaging-gateway` service;
- enabled: true;
- events: only `MESSAGES_UPSERT`;
- `webhookByEvents = false`;
- `webhookBase64 = false`;
- dedicated `jwt_key` present;
- no public Gateway hostname or host port introduced.

The post-cutover readback returned HTTP 200 and matched the intended configuration.

Core, Gateway and Evolution all remained healthy after the cutover.

## Real handset proof

A real WhatsApp message was sent from another handset to the number connected to `wandora-lab-01` with the text:

`Teste real Wandora 001`

Evolution received the event and the promoted Gateway/Core path persisted it canonically.

Observed canonical result:

- one new inbound message with body `Teste real Wandora 001`;
- `direction = inbound`;
- one new work item with `kind = qualify-new-contact`;
- work item `status = attention-required`;
- one new durable inbound receipt;
- receipt `status = completed`;
- receipt result `status = supervision-required`;
- `approvals = 0`;
- `outbound_attempts = 0`.

The event was represented once in canonical state.

## Idempotency evidence

The live event had exactly:

- one canonical message for its normalized `source_event_id`;
- one inbound receipt for its normalized `event_id`.

Structural replay protection remains enforced by:

- primary key on `wandora_private.inbound_event_receipts (organization_id, event_id)`;
- unique index on inbound `wandora.messages (organization_id, source_event_id)`.

The live transport replay probe was intentionally not forced when the execution environment blocked a second direct secret-read probe. CI already proves durable duplicate replay behavior, and the live database constraints above remain the structural replay boundary.

## Result

**Messaging Gateway → Wandora Core Supervised V1 is complete in production for the controlled internal proof path.**

The real inbound path now reaches durable canonical Wandora state and stops for human/supervised attention without invoking Mastra, a model provider or outbound WhatsApp.

## Next slice

Proceed with **Core → Agent Runtime Adapter → Mastra deterministic proposal V1**.

Constraints for that slice:

- no real model credential yet;
- no Mistral/Chutes call;
- do not switch the live supervised ingress to an outbound-capable path;
- deterministic Mastra output must remain an internal proposal/evidence artifact first;
- provider/framework IDs must remain implementation details;
- human approval and outbound side-effect boundaries remain unchanged;
- only after deterministic runtime integration is green should the first real model-backed proposal be considered.
