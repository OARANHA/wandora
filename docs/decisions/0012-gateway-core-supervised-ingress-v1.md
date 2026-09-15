# ADR 0012 — Gateway to Core Supervised Ingress V1

Date: 2026-09-14
Status: **Accepted for implementation; live enablement remains a separate reviewed operation.**

## Context

Wandora already has a validated Evolution Messaging Gateway laboratory boundary, a live least-privilege Core database runtime and durable Ana inbound state. The next step is to connect normalized inbound messaging to Core without prematurely enabling a model, automatic reply or external side effect.

The shared private `wandora-core` Docker network is transport isolation, not caller authentication: Core, Evolution, the laboratory Gateway and other private services may coexist on it. Network membership alone therefore cannot authorize a Core business mutation.

Calling the full `AnaInboundService.handle()` from the first real Gateway wiring would also be too broad. That path can invoke the Agent Runtime and outbound Messaging Gateway, while those production implementations and their operator controls are not yet promoted.

## Decision

Introduce an opt-in private Core ingress boundary at:

`POST /internal/v1/gateway/inbound`

The route is closed by default and exists only when database mode plus explicit Gateway-ingress configuration are enabled. No public hostname or host-published port is introduced.

Gateway-to-Core requests use a dedicated shared secret stored outside Git/chat. The Gateway signs the exact normalized request body with HMAC-SHA256 over `<unix-seconds>.<raw-body>`. Core requires the timestamp to be within five minutes and compares the signature in constant time.

The Core contract accepts only Wandora-owned fields:

- canonical `organizationId`;
- normalized `eventId`;
- canonical provider-neutral `connectionId`;
- normalized sender address;
- text;
- occurrence timestamp.

Evolution instance names, webhook envelopes, API keys, JIDs and provider message IDs do not cross this boundary.

A newly accepted inbound event is persisted through the existing `wandora_core_runtime` least-privilege repository path. Core creates/reuses canonical contact, conversation and qualification work, persists the inbound message/audit/receipt, then marks the work `attention-required` and completes the receipt with `supervision-required`.

This V1 ingress performs **no Agent Runtime call and no outbound messaging call**. It proves safe real ingress first. Model proposal and outbound transport are promoted in later slices.

## Authorization and idempotency

HMAC caller authentication is necessary but not sufficient for tenant authorization. Core still sets `wandora.organization_id` transaction-locally and RLS independently requires the canonical messaging connection to be visible inside that organization. A signed request cannot claim another organization's connection.

The existing durable inbound receipt remains the replay boundary. A completed duplicate returns the previously stored Wandora result without creating duplicate contacts, messages, work or sends. An event already processing returns a conflict rather than racing a second mutation.

Invalid/stale authentication fails before body processing or durable state. Unsupported/invalid normalized input fails before business mutation.

## Verification

The canonical Core verifier now executes test files serially because multiple integration suites share one disposable PostgreSQL fixture database and perform fixture resets.

PR evidence must prove:

- valid signed normalized inbound persists exactly once and returns `supervision-required`;
- replay returns the durable duplicate result;
- invalid and stale signatures return 401 with zero durable state;
- a foreign organization cannot claim a canonical messaging connection;
- supervised ingress produces no approval and no outbound attempt;
- the route remains 404 when the ingress feature is not configured;
- existing RLS, runtime-role, Ana workflow, TypeScript and image-smoke tests remain green.

## Consequences

Positive:

- the first Gateway→Core real path can be enabled without model/provider cost or external messaging risk;
- private-network access alone cannot impersonate the Gateway;
- tenant authorization remains independently enforced by Core/RLS;
- inbound business state becomes visible/inspectable before automation is enabled;
- later provider replacement does not change the Core ingress contract.

Trade-offs:

- a dedicated internal secret must be generated, stored and rotated operationally;
- supervised inbound work intentionally stops at `attention-required` until later runtime/outbound slices are accepted;
- Evolution→Gateway promotion and provider-instance→canonical-connection mapping remain separate work.

## Live enablement boundary

Merging this decision/code does not enable the route in production. Live enablement requires a separate reviewed operation that:

1. deploys the merged Core image;
2. generates the dedicated Gateway→Core secret outside Git/chat;
3. mounts that secret through a versioned private Compose path;
4. promotes/configures the Wandora Messaging Gateway to sign only normalized canonical envelopes;
5. establishes a controlled canonical organization/connection/employee for the supervised proof;
6. proves one deterministic/private request before cutting over a real Evolution webhook;
7. proves a real inbound handset event only after all earlier checks are green.

No Mistral, Chutes or other model token is required for this boundary.
