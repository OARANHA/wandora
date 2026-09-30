# ADR 0357 — Semantic Fast Read bounded re-attestation adapter package drift and 0.6.0 requalification V1

Date: 2026-09-30

Status: **CODE-ONLY REQUALIFICATION / PRODUCTION WINDOW CLOSED / NO VENDAERP CALL / PAPERCLIP ANA ERROR PRESERVED**

## Objective

Record the single bounded production re-attestation failure after ADR 0355 and correct the immutable package/provenance boundary for the existing `wandora_mastra` external adapter without changing its execution logic or performing another production request.

ADR 0168 remains binding:

> Portabilidade = desacoplamento do contrato, não duplicação da implementação. Provider replacement não implica internalização.

## REAL NOW before source mutation

Repository provenance immediately before this slice:

- `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 head = `5adea9668800b46e7bce89b910eeb65c0faac883`;
- merge ref = `639d10074202ac45c0cbb8212b744ab48233c2c7`;
- merge parents are exactly current main + PR head;
- exact-head workflows = **17/17 GREEN**.

Production baseline before the attempt had current Rollback Freeze V2 ready for Core `f279acc98687da894a1ce6570273b5949552a8c7`.

The bounded window was opened only after fresh policy/OA/custody/render/body-forwarding/outbound gates were green.

## The one authorized production request

The browser-owned owner/admin boundary selected:

- organization = `28PRO`;
- role = `owner`;
- employee = `Ana`;
- employee status in Wandora = `active`;
- request = `Qual é o preço do produto PREMIUM PLUS?`.

Exactly one Human Fast Read POST was executed.

Browser result:

- HTTP = `500`;
- body = `{"error":"internal-error"}`.

No retry or second request was executed.

## Mandatory close

The already-approved mandatory close executed immediately after the result.

Post-close evidence:

- Core returned to `wandora/core:organization-adapter-candidate-f279acc98687`;
- image id remained `sha256:c8994cc7b9a6bff15b212eba215d5a1360ee217b84df18a1b59409fb9fd1a4d8`;
- revision remained `f279acc98687da894a1ce6570273b5949552a8c7`;
- exact 14-file gates-OFF composition restored;
- startup `fastReadExecution=false`;
- startup `semanticFastRead=false`;
- `humanSendProposal=false`;
- TypeSafe/`wfri1` custody mounts removed;
- Paperclip healthy;
- Messaging Gateway healthy;
- Task Drain = false / 0 / 0 / quiescent=true.

## Proven request path

Paperclip persistent logs prove:

- correlation id = `33e070c7-1677-432b-9e50-1ba07512cc87`;
- one `employee-capabilities` request returned 200;
- selector authority reached the signed intent with selector:
  - `kind=product`;
  - `by=name`;
  - `value=PREMIUM PLUS`;
- Paperclip dispatch latency completed successfully;
- exactly one Fast Read run was created:
  `86b101a9-0f7b-412d-b25c-7ef1e1b49be7`;
- the run failed once with `wandora_execution_failed_400`;
- the Organization Adapter `employee-fast-read` webhook returned 502;
- the Core-facing Human request surfaced as HTTP 500 `internal-error`.

The run is terminal `failed / adapter_failed`, attempt 1, with no predecessor/successor and no scheduled retry.

## No Business System / outbound effect

The governed Paperclip Tool Connection activity projection for:

- run `86b101a9-0f7b-412d-b25c-7ef1e1b49be7`;
- tool `vendaerp_search_products`;
- qualified 28PRO VendaERP Connection

returned:

- `count=0`;
- `matchingRunToolCount=0`.

Therefore the single request did **not** call VendaERP.

The Messaging Gateway log window `09:57–10:01 UTC` was empty and its running configuration remained `outboundEnabled=false`.

No Human Send or WhatsApp effect occurred.

## Failure boundary

The external adapter threw `wandora_execution_failed_400` only after its private HTTP call to:

`http://wandora-core:8788/internal/v1/paperclip/execution`.

The current Core execution handler returns 400 only for `invalid-execution-request` at its bounded request parser. Identity, Fast Read Intent, execution binding and Tool Gateway failures map to different status classes.

The real run identity is valid:

- Paperclip agent id = `428b6730-3df4-4b92-b90a-a87f87c401f9`;
- Paperclip company id = `5d7ec217-118c-4292-8136-0a9ab16926ea`;
- run id = valid UUID;
- stored `paperclipWake.agentMessage` has `source=plugin_invoke`, the Organization Adapter plugin key and the exact `WANDORA_FAST_READ_V1` envelope.

## Root cause — immutable adapter package drift

Production Paperclip still registers:

- type = `wandora_mastra`;
- version = `0.5.0`;
- package =
  `/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/64795ff7d2c519ef6303ab0944bac02d27aadf8b919860b832c2e6fac4defb62/package`.

ADR 0239/0240 prove that `64795ff7...` is the exact `0.5.0` artifact promoted for read-tool failure disposition.

That promotion predates ADR 0277.

ADR 0277 later qualified the issue-less Semantic Fast Read transport in source:

- require `paperclipWake.agentMessage.source === "plugin_invoke"`;
- require the Organization Adapter plugin key;
- require the exact `WANDORA_FAST_READ_V1` envelope;
- forward `workId=null`, request, correlation and signed intent to Core.

ADR 0277 explicitly had **NO PRODUCTION EFFECT**.

The source package version remained `0.5.0` after those later semantics were added. This allowed semantically different source bytes to share the old version label while production correctly retained the older content-addressed `64795...` package.

The live package therefore cannot be treated as equivalent to current Fast Read-capable source merely because both report `0.5.0`.

## Durable provider-side effect

The failed run changed the Paperclip managed Ana to:

- `status=error`;
- `errorReason=wandora_execution_failed_400`.

The existing Organization Adapter activation contract intentionally rejects `error` as an unexpected state and only converges `paused -> idle` or already-`idle`.

This ADR does not reset or mask that provider-owned state.

## CAPABILITY AUTHORITY / REUSE GATE

No new subsystem is justified.

Reuse:

- Paperclip-native run/lifecycle authority;
- the existing external `wandora_mastra` adapter contract;
- the existing ADR 0277 Fast Read transport implementation;
- existing disposable Fast Read E2E;
- existing Paperclip Mastra Adapter CI;
- existing Organization Adapter and Tool Gateway boundaries.

No Wandora-owned lifecycle, retry engine, run mirror, adapter registry or provider execution clone is introduced.

## Decision

Create a new immutable package identity for the already-qualified current adapter bytes:

`@wandora/paperclip-adapter-mastra@0.6.0`.

The source execution logic in `index.mjs` is not changed.

Requalify package metadata/CI by:

1. pinning compatibility to production Paperclip `v2026.916.1`;
2. pinning Paperclip source `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
3. recording the issue-less Fast Read transport contract in compatibility metadata;
4. updating the adapter-specific CI to compose the same qualified v916.1 provider deltas;
5. statically requiring `0.6.0`, `fastReadWake` and `WANDORA_FAST_READ_V1`;
6. keeping the existing contract tests;
7. relying on the same exact-head Semantic Fast Read CI for the full disposable Fast Read E2E against v916.1.

Any later production promotion must use the new deterministic `0.6.0` artifact hash emitted by CI, never overwrite or reinterpret `64795...`.

## Second adversarial review

The routing review selected `proceed_fast` with probability 0.61.

The exact source action review returned `confirm` as the leading decision. Confidence was low because adapter packaging and production recovery are safety-sensitive; therefore this slice is deliberately restricted to source/package provenance only.

No production installation, reload, restart, agent recovery or customer/provider effect is permitted by this ADR.

## Production boundary

This code-only requalification performs no:

- Paperclip adapter install/reinstall/reload;
- Paperclip restart;
- Core recreation;
- agent resume/status mutation;
- Fast Read opening;
- TypeSafe/Mistral customer call;
- Paperclip run creation;
- VendaERP call;
- Human Send;
- Messaging Gateway outbound;
- migration or database mutation.

Production remains closed on the gates-OFF Core baseline, with Paperclip Ana's error state preserved as incident evidence.

## Next boundary

After exact-head CI GREEN:

1. obtain and independently hash the deterministic `0.6.0` adapter artifact from the exact head;
2. prove the artifact's four package files and Fast Read transport bytes;
3. separately qualify Paperclip-native recovery semantics for the current Ana `error` state without creating work/run;
4. separately preflight a Task-Drain-protected adapter `0.6.0` production promotion with rollback of `64795...`;
5. promote/reload only the external adapter under fresh human approval;
6. validate exactly one loaded `0.6.0` and provider lifecycle state;
7. only after a fresh current-baseline rollback/freshness review may another bounded production Fast Read attestation be considered.

Do not execute a second browser request from this incident.
