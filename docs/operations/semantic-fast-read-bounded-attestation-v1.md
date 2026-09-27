# Semantic Fast Read bounded attestation V1

Status: **CONTRACT ONLY / NO PRODUCTION AUTHORIZATION**

This runbook defines the future bounded production attestation window for Semantic Fast Read. It does not authorize opening that window and it must not be executed from historical evidence.

## Authority and reuse boundary

ADR 0168 remains binding.

- Wandora owns semantic/product/effect authorization, the `BusinessCapability` vocabulary, the signed `wfri1` intent and deterministic post-filtering.
- Paperclip remains operational authority for workforce lifecycle, runs, Connections/grants, tools, Tool Gateway authorization/execution, terminal result and audit.
- TypeSafe/System One remains the replaceable semantic-route provider.
- Mastra + Mistral remain the replaceable semantic-selector/runtime implementation.
- VendaERP remains a replaceable Business System read provider.
- Messaging Gateway/Evolution remains a separate transport boundary.

This attestation contract creates no registry, lifecycle, run mirror, cache, retry engine, secret manager, provider implementation, table or migration.

## Repository contract

The future Core composition must start from the exact live Core Compose provenance captured immediately before execution and append, in this order:

1. `compose.semantic-fast-read.yaml` — canonical gates-OFF compatibility contract;
2. `compose.semantic-fast-read-custody.yaml` — existing read-only TypeSafe/System One + `wfri1` mounts;
3. `compose.semantic-fast-read-attestation.yaml` — attestation-only override, last.

The final render must prove:

```text
WANDORA_FAST_READ_EXECUTION_ENABLED=true
WANDORA_SEMANTIC_FAST_READ_ENABLED=true
WANDORA_SEMANTIC_SELECTOR_ENABLED=true
WANDORA_HUMAN_SEND_PROPOSAL_ENABLED=false
```

The existing Mistral platform credential continues to come only from `compose.agent-runtime-model.yaml`. The attestation overlay adds no secret, volume, image, build, network or published port.

Messaging Gateway outbound and WhatsApp Fast Read are not part of this Core overlay and must remain OFF/absent throughout the window.

## Fresh pre-mutation gate

Before any future production mutation, capture fresh evidence for all of the following:

1. exact `main`, PR source head, merge ref and exact-head CI;
2. exact live Core image/revision/health/restart and active Compose provenance;
3. exact Paperclip image/source/health/restart;
4. exactly one expected Organization Adapter version/id in `ready` state with `lastError=null`;
5. Task Drain `draining=false`, `activeRuns=0`, `pendingWakes=0`, `quiescent=true`;
6. Messaging Gateway healthy with `outboundEnabled=false`;
7. Human Send OFF and WhatsApp Fast Read disconnected;
8. rollback readiness for the immediately current live state;
9. metadata/existence of the already-qualified TypeSafe, `wfri1` and Mistral custody without reading values;
10. exact provider/Business System authorization required by the single test request.

Then make an explicit bounded effect decision and run a second independent adversarial review. Historical ADR evidence cannot substitute for this fresh gate.

## Smallest useful live attestation

The future attestation is exactly one explicitly authorized owner/admin **Human Fast Read** request. It is not a WhatsApp test.

Use one already-authorized tenant, employee and Business System read grant. The selected request should require a product selector and price read so the complete qualified path is exercised once.

Required evidence for one correlation:

1. one TypeSafe/System One semantic-route call;
2. one Mistral structured selector call only when the approved route requires it;
3. one Paperclip issue-less Fast Read run;
4. exactly one read-only `vendaerp_search_products` Tool Gateway operation;
5. zero automatic retries;
6. no second ERP read;
7. no ERP write;
8. selector/deterministic post-filter matches the requested product;
9. returned price belongs to that exact product;
10. Paperclip owns the terminal run/result evidence;
11. bounded latency evidence exists for the qualified stages;
12. zero Human Send, Gateway outbound or WhatsApp message;
13. no new durable Wandora operational state.

A GREEN attestation is evidence for a later activation decision. It is not customer rollout authorization.

## Mandatory window close

Any future authorization to open this attestation window must also cover closing it.

After the single request, or immediately on any ambiguity/failure:

1. remove the attestation overlay from the active Core Compose invocation;
2. return the Core to the pre-attestation gates-OFF composition;
3. remove the custody overlay too unless a separately reviewed decision explicitly permits inert mounts to remain;
4. recreate only Core using the exact pre-attestation image unless a different exact image is separately authorized;
5. prove all three Fast Read/Semantic gates are OFF again;
6. prove Human Send, Gateway outbound and WhatsApp remain OFF;
7. reconcile Paperclip/OA/Task Drain and record whether any durable provider-side run/result evidence was created by the one authorized test.

Do not continue to a second request in the same window.

## Stop conditions

Stop before mutation if any freshness requirement is missing, the exact render differs, a required secret/provider grant cannot be proven safely, Task Drain is not quiescent, outbound is enabled, or the second adversarial review does not support the exact bounded effect.

Never widen Remote-Ops/secret permissions or create a duplicate Wandora subsystem merely to make the attestation easier.
