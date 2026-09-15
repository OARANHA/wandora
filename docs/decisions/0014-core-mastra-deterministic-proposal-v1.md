# ADR 0014 — Core → Mastra Deterministic Supervised Proposal V1

Date: 2026-09-15
Status: **Accepted, implemented and live in supervised deterministic mode.**

## Context

Messaging Gateway → Wandora Core Supervised V1 is live and proven. Before this ADR, production ingress deliberately stopped after durable canonical inbound state with the qualification work item at `attention-required` and the inbound receipt at `supervision-required`. It performed no Agent Runtime call and no outbound messaging call.

ADR 0005 already accepts Mastra as the first implementation behind Wandora's provider-neutral `AgentRuntime` boundary. Its deterministic spike proved the required Mastra workflow/tool APIs on Node 22.23.2 without a model-provider credential.

The uncertainty addressed here is whether that accepted runtime can enter the live Core without weakening the supervised product boundary.

The full `AnaInboundService` is not the correct live entry point for this slice. After a proposal with `commitment = none`, that service proceeds toward outbound preparation and `MessagingGateway.sendText()`. The current digital-employee autonomy mode is `supervised`, so wiring the runtime directly to that full path would make an implementation shortcut override product supervision semantics.

The current schema also has no generic customer-facing proposal/draft entity. `wandora.approvals` represents sensitive actions requiring a human decision and must not be repurposed as a generic store for every safe draft merely because it already contains proposed text.

Inspection of the exact pinned `@mastra/core 1.66.0` runtime found that Mastra feature telemetry is enabled by default and uses PostHog unless `MASTRA_TELEMETRY_DISABLED` is set. Wandora has no need for that framework egress in this customer-processing path.

## Decision

Integrate Mastra into the **existing supervised ingress service**, not the outbound-capable full Ana service.

The Core Agent Runtime mode is explicit:

`WANDORA_AGENT_RUNTIME_MODE=mastra-deterministic`

The default remains `disabled`. Deterministic mode is valid only when:

- Core runs in database mode; and
- authenticated supervised Gateway ingress is enabled.

No model-provider secret is accepted or required by this mode.

The Wandora deterministic adapter unconditionally sets:

`MASTRA_TELEMETRY_DISABLED=true`

before any Mastra module is dynamically loaded. The production Compose overlay also sets the variable from process start. Operators cannot opt this customer-processing mode back into Mastra framework telemetry through an environment override.

## Mastra boundary

Core implements `MastraDeterministicAgentRuntime` behind the Wandora-owned `AgentRuntime` interface.

The Mastra workflow receives only:

- normalized customer text.

Organization IDs, phone/customer address, provider IDs, connection IDs and database identifiers are not included in the Mastra workflow input.

The workflow returns only the Wandora-owned `EmployeeProposal` shape:

- `kind = send-text`;
- deterministic text;
- `commitment = none`;
- rationale.

Mastra workflow/run IDs and framework internals do not cross the adapter boundary.

Observability is not configured for this V1 path and framework telemetry is explicitly disabled. The deterministic proposal path therefore requires no model call and no Mastra telemetry egress.

## Durable supervised result

When deterministic mode is enabled, `AnaSupervisedIngressService`:

1. executes the canonical `acceptInbound(...)` path;
2. asks the Agent Runtime for a proposal;
3. validates that the proposal is a non-empty `send-text` action;
4. stores the proposal only inside the private durable inbound receipt result;
5. keeps the canonical work item at `attention-required`;
6. completes the receipt as `supervision-required`.

The receipt is the internal evidence artifact for this narrow runtime proof. It is not promoted as the long-term customer-facing proposal model.

No database migration is introduced by this slice.

## Side-effect boundary

The deterministic supervised path must create:

- no `wandora.approvals` row;
- no `wandora_private.outbound_attempts` row;
- no outbound message;
- no Messaging Gateway send call;
- no model-provider call;
- no Mastra framework telemetry egress.

The live inbound path remains supervised even when Mastra is enabled.

The outbound-capable `AnaInboundService` remains a tested domain component but is **not** the production Gateway entry point and must not be promoted as one until autonomy/outbound policy is reviewed separately.

## Failure and replay behavior

If the deterministic runtime fails before receipt completion, Core marks the receipt failed using the durable retry boundary. A later retry may re-enter processing without external-send ambiguity because this slice performs no external side effect.

A completed duplicate returns the durable stored result, including the previously generated proposal, without creating a second message, work item or runtime-driven side effect.

Because PostgreSQL `jsonb` does not preserve object key order, replay equality must be tested structurally rather than by comparing `JSON.stringify(...)` byte order.

## Implementation and CI evidence

PR #33 merged to `main` as:

`bd40a4380f4a71be0b6ff0028dfc9799ef9fa68c`

The implementation pins:

- `@mastra/core 1.66.0`;
- `zod 4.6.4`;
- Node 22.23.2.

The final PR head and resulting `main` push both passed Core CI and Messaging Gateway CI. Core CI proved strict TypeScript/build, deterministic adapter behavior, supervised durable proposal behavior and the production Compose overlay. The Core suite reached 27/27 tests green.

A final pre-merge review found that telemetry disabling should happen before framework import, not merely before runtime construction. The adapter was hardened to use dynamic Mastra imports only after `MASTRA_TELEMETRY_DISABLED=true` is established, and the Compose overlay also forces the setting.

## Live activation — 2026-09-15

Live activation was performed as a separate reviewed operation after merge.

The exact VPS build context was verified byte-for-byte against commit `bd40a438…`, including the canonical package lock. Node 22.23.2 `npm ci`, typecheck and production build passed before image creation.

Promoted image:

`wandora/core:mastra-deterministic-bd40a438`

Before replacing production, a parallel private candidate container proved:

```text
healthz: 200
readyz: 200
published host ports: 0
networks: wandora-core + wandora-data
user: node
root filesystem: read-only
capabilities: ALL dropped
no-new-privileges: true
agentRuntime: mastra-deterministic
```

The live Core replacement retained an automatic rollback path to the previous image and completed without rollback.

Current live runtime:

```text
container: wandora-core
image: wandora/core:mastra-deterministic-bd40a438
mode: database
agent runtime: mastra-deterministic
MASTRA_TELEMETRY_DISABLED: true
healthz: 200
readyz: 200
published host ports: 0
```

### Direct signed Core proof

A controlled synthetic Gateway-signed event produced:

```text
receipt: completed / supervision-required
proposal: present / send-text / commitment none
work: attention-required
approvals: 0
outbound attempts: 0
inbound messages: 1
outbound messages: 0
```

Replay returned `200` with `duplicate=true`, and structural comparison proved the response result identical to the durable `jsonb` result.

### Messaging Gateway end-to-end proof

A second synthetic proof exercised the full private path:

```text
Evolution-compatible JWT webhook
  -> live Messaging Gateway
  -> normalized provider-neutral inbound event
  -> Gateway/Core HMAC
  -> live Core
  -> Mastra deterministic proposal
  -> PostgreSQL durable result
```

Both initial submission and replay returned HTTP 200 at the Gateway boundary. The durable event again proved:

```text
receipt: completed / supervision-required
proposal: present / send-text / commitment none
work: attention-required
approvals: 0
outbound attempts: 0
inbound messages: 1
outbound messages: 0
provider-private sentinel in canonical result/message state: absent
```

No real WhatsApp message was sent by this activation operation.

## Consequences

Positive:

- Mastra is now present in the live production-shaped Core without model-provider cost or outbound risk;
- customer-facing supervision remains stronger than implementation convenience;
- no premature generic proposal schema was introduced;
- provider/framework metadata remains internal;
- unnecessary framework telemetry egress is disabled;
- a later model-backed proposal can reuse the same Wandora adapter contract.

Trade-offs:

- proposal evidence currently lives in the private receipt result rather than a customer-facing proposal table/projection;
- the deterministic response is intentionally static and proves orchestration/boundaries, not language quality;
- the next slice must define the customer-facing supervision/review contract before exposing drafts in Wandora Web or enabling any send action.

## Next boundary

The next approved direction is **Supervised Proposal Review V1 — Core → Wandora Web**.

That slice must expose a Wandora-owned tenant-authorized review experience without exposing `wandora_private.inbound_event_receipts` directly and without enabling automatic outbound sending.

No Mistral, Chutes, OpenAI or other model credential is required for this next UI/authorization slice.