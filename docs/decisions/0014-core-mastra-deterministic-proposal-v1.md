# ADR 0014 — Core → Mastra Deterministic Supervised Proposal V1

Date: 2026-09-15
Status: **Accepted for implementation; live enablement remains a separate reviewed operation.**

## Context

Messaging Gateway → Wandora Core Supervised V1 is live and proven with a real WhatsApp handset event. The current production ingress deliberately stops after durable canonical inbound state with the qualification work item at `attention-required` and the inbound receipt at `supervision-required`. It performs no Agent Runtime call and no outbound messaging call.

ADR 0005 already accepts Mastra as the first implementation behind Wandora's provider-neutral `AgentRuntime` boundary. Its deterministic spike proved the current Mastra workflow/tool APIs on Node 22.23.2 without a model-provider credential.

The next uncertainty is whether that accepted runtime can be integrated into Core without weakening the supervised production boundary.

The existing full `AnaInboundService` is not the correct live entry point for this slice. After a proposal with `commitment = none`, that service proceeds to outbound preparation and `MessagingGateway.sendText()`. The only current digital-employee autonomy mode is `supervised`, so wiring a runtime directly to that full path would make a technical shortcut override the product's supervision semantics.

The current schema also has no generic customer-facing proposal/draft entity. `wandora.approvals` represents sensitive actions requiring a human decision and must not be repurposed as a generic store for every safe draft merely because it already contains proposed text.

A second-pass inspection of the exact pinned `@mastra/core 1.66.0` runtime found that Mastra feature telemetry is enabled by default and uses PostHog unless `MASTRA_TELEMETRY_DISABLED` is set. Although the inspected feature telemetry does not directly include customer message text, Wandora has no need for that framework egress in this customer-processing path.

## Decision

Integrate Mastra into the **existing supervised ingress service**, not the outbound-capable full Ana service.

The new Core Agent Runtime mode is explicit and opt-in:

`WANDORA_AGENT_RUNTIME_MODE=mastra-deterministic`

The default remains `disabled`.

The deterministic mode is valid only when:

- Core runs in database mode; and
- authenticated supervised Gateway ingress is enabled.

No model-provider secret is accepted or required by this mode.

The Wandora deterministic adapter unconditionally sets:

`MASTRA_TELEMETRY_DISABLED=true`

before constructing the Mastra runtime. Operators cannot opt this customer-processing mode back into Mastra framework telemetry through an environment override.

## Mastra boundary

Core implements `MastraDeterministicAgentRuntime` behind the existing Wandora-owned `AgentRuntime` interface.

The Mastra workflow receives only the minimum input needed for this proof:

- normalized customer text.

Organization IDs, phone/customer address, provider IDs, connection IDs and database identifiers are not included in the Mastra workflow input.

The workflow returns only the Wandora-owned `EmployeeProposal` shape:

- `kind = send-text`;
- deterministic text;
- `commitment = none`;
- rationale.

Mastra workflow/run IDs and framework internals do not cross the adapter boundary.

Observability is not configured for this V1 path and the pinned Core runtime's framework telemetry is explicitly disabled. The deterministic proposal path therefore requires no model call and no Mastra telemetry egress.

## Durable supervised result

When deterministic mode is enabled, `AnaSupervisedIngressService`:

1. executes the existing canonical `acceptInbound(...)` path;
2. asks the Agent Runtime for a proposal;
3. validates that the proposal is a non-empty `send-text` action;
4. stores the proposal only inside the private durable inbound receipt result;
5. keeps the canonical work item at `attention-required`;
6. completes the receipt as `supervision-required`.

The receipt therefore becomes the internal evidence artifact for this narrow runtime proof. It is not promoted as a customer-facing proposal model.

No database migration is introduced in this slice.

## Side-effect boundary

The deterministic supervised path must create:

- no `wandora.approvals` row;
- no `wandora_private.outbound_attempts` row;
- no outbound message;
- no Messaging Gateway send call;
- no model-provider call;
- no Mastra framework telemetry egress.

The live inbound path remains supervised even when Mastra is enabled.

The existing outbound-capable `AnaInboundService` remains a tested domain component but is **not** the production Gateway entry point and must not be promoted as one until autonomy/outbound policy is reviewed separately.

## Failure and replay behavior

If the deterministic runtime fails before receipt completion, Core marks the receipt failed using the existing durable retry boundary. A later retry may re-enter processing without external-send ambiguity because this slice performs no external side effect.

A completed duplicate returns the durable stored result, including the previously generated proposal, without creating a second message, work item or runtime-driven side effect.

## Verification

The PR must prove:

- the Mastra adapter returns exactly the Wandora `EmployeeProposal` contract;
- `MASTRA_TELEMETRY_DISABLED=true` is forced by the adapter;
- deterministic execution succeeds while network access is forbidden in the test;
- blank input fails;
- runtime mode is disabled by default;
- deterministic mode is rejected in standby mode;
- deterministic mode is rejected unless supervised Gateway ingress is enabled;
- one supervised inbound event stores the deterministic proposal in the private receipt;
- replay returns the same durable proposal;
- work remains `attention-required`;
- `approvals = 0`;
- `outbound_attempts = 0`;
- existing Gateway/Core/RLS/role/image tests remain green.

## Consequences

Positive:

- Mastra enters the production-shaped Core without model-provider cost or outbound risk;
- the customer-facing supervision meaning remains stronger than implementation convenience;
- no premature generic proposal schema is introduced before the Web human-review experience is designed;
- provider/framework metadata remains internal;
- unnecessary framework telemetry egress is disabled at the adapter boundary;
- the first later model-backed proposal can reuse the same Wandora adapter contract.

Trade-offs:

- proposal evidence initially lives in the private receipt result rather than a customer-facing proposal table;
- the deterministic response is intentionally static and proves orchestration/boundaries, not language quality;
- a later slice must define the durable customer-facing proposal/review contract before exposing drafts in Wandora Web.

## Live enablement boundary

Merge does not enable Mastra in production. Live activation requires a separate reviewed operation that sets `WANDORA_AGENT_RUNTIME_MODE=mastra-deterministic`, deploys the merged Core image and proves a synthetic supervised event with zero approvals/outbound before any additional real handset proof.

No Mistral, Chutes or other model credential is required or permitted for this V1 mode.
