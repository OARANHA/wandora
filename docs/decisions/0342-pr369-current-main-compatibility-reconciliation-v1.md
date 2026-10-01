# ADR 0342 — PR #369 Current-Main Compatibility Reconciliation V1

Date: 2026-09-29

Status: **GREEN / CURRENT-MAIN COMPATIBILITY PROVEN / 17/17 PR CI GREEN / EPHEMERAL CURRENT-MAIN MERGE GREEN / PRODUCTION UNCHANGED / HARD STOP BEFORE SEMANTIC FAST READ OPENING**

## Objective

Close only the compatibility gap between the current Wandora `main` and PR #369 before any bounded Semantic Fast Read production attestation opening.

The required question was:

> Does current `main` plus PR #369 still preserve the Semantic Fast Read contracts, Core HTTP body forwarding, Fast Read execution separation, Paperclip execution boundaries, outbound-off posture and bounded-attestation composition?

This ADR does **not** authorize any production opening.

## REAL NOW

At closure:

- current `main` = `e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 branch = `feat/semantic-fast-read-runtime-wiring-v1`;
- reconciled code head = `47dde9eeeb2660fb6fa8337a14e3610a80e1d552`;
- PR state = open / draft;
- GitHub reports the PR mergeable and clean;
- exact head `47dde9eeeb2660fb6fa8337a14e3610a80e1d552` completed **17/17 workflows with conclusion success**;
- the branch intentionally remains one commit behind the latest `main`, because the final current-main delta was proven compatible ephemerally rather than pushed only to obtain a fresh green head.

The current-main-only commit is:

- `e4c7c36bb1091ba38d39b85fa259bae94553fc52`
- `fix: tornar configuração cliente Vigia reproduzível (#376)`

Its delta is limited to:

- `apps/core/src/vigia/telemetry.ts`: trace-readback polling intervals;
- `infra/stacks/core/compose.vigia-telemetry.yaml`: an explicit, separate Vigia client overlay.

## PROVEN EVIDENCE

### Reconciliation commit already present in PR #369

The earlier compatibility conflict against `main@ce8058223cd322995318fad15ae958b9533f3b3e` was real and limited to:

- `apps/core/src/runtime/config.ts`;
- `apps/core/src/runtime/main.ts`.

The resolved PR head `47dde9eeeb2660fb6fa8337a14e3610a80e1d552` is a two-parent reconciliation commit with parents:

- original PR head `14f343c39e40c39f50bfda6fba6e0b3df7433122`;
- `main@ce8058223cd322995318fad15ae958b9533f3b3e`.

Its resolution preserves both sides without combining their authority:

- Vigia telemetry is injected only into the generic `PaperclipExecutionService`;
- `PaperclipFastReadExecutionService` remains a separate Fast Read execution path;
- no Vigia client is injected into `PaperclipFastReadExecutionService`.

### Exact PR-head CI

For exact head `47dde9eeeb2660fb6fa8337a14e3610a80e1d552`, GitHub completed **17/17 workflows GREEN**, including:

- Core CI;
- Semantic Fast Read CI;
- Paperclip Mastra Adapter CI;
- Paperclip Fast Read Production Candidate CI;
- Paperclip Fast Read Patch Composition CI;
- Paperclip Fast Read Run Result Read CI;
- Paperclip Synchronous Webhook Response CI;
- Paperclip Host Operational Read Extension CI;
- Paperclip OpenAPI Compatibility;
- Paperclip 916.1 OpenAPI Candidate CI;
- Organization Adapter Plugin CI;
- Integration Capability Projection CI;
- VendaERP Read-Only MCP CI;
- Messaging Gateway CI;
- Web CI;
- Platform Admin CI;
- Core Candidate Artifact.

The Semantic Fast Read workflow itself proved Core typecheck, focused Fast Read tests, adapter contracts, Organization Adapter packaging and the dedicated disposable Semantic Fast Read E2E.

### Exact current-main combination proof

Because `main` advanced once more after the reconciliation commit, a second disposable worktree was created from exact PR head `47dde9eeeb2660fb6fa8337a14e3610a80e1d552` and exact current main `e4c7c36bb1091ba38d39b85fa259bae94553fc52`.

The local no-commit merge:

- used exact immutable SHAs;
- completed automatically;
- had zero unresolved files;
- passed `git diff --check`;
- introduced only the two expected current-main Vigia files/deltas.

On that exact combined tree:

- `npm ci` succeeded with 0 vulnerabilities;
- Core `npm run typecheck` = GREEN;
- Core `npm run build` = GREEN;
- focused tests = **64/64 pass, 0 fail**.

The focused suite covered:

- runtime configuration;
- Fast Read disabled-by-default behavior;
- Semantic Fast Read dependency gates;
- signed Fast Read intent;
- Human API / HTTP body forwarding;
- semantic selector path;
- VendaERP Fast Read adapter;
- Paperclip Organization Adapter provider boundary;
- Vigia runtime configuration;
- Vigia public telemetry client.

### Contract-specific source proof

The exact reconciled source preserves:

- Core HTTP body forwarding for the Fast Read route up to the reviewed `12_100` byte bound;
- matching `12_100` bound in the Human Fast Read parser;
- separate construction of `PaperclipFastReadExecutionService`;
- no `vigia` / `workTelemetry` dependency in `apps/core/src/paperclip-execution/fast-read.ts`;
- Fast Read handler dispatch to the separate `fastReadService` when `parsed.fastRead` is present;
- generic Paperclip execution remains the only path receiving optional Vigia work telemetry.

The Semantic Fast Read convergence and bounded-attestation overlays still:

- keep `WANDORA_HUMAN_SEND_PROPOSAL_ENABLED=false`;
- do not add Vigia configuration;
- do not add Messaging Gateway outbound configuration;
- do not add `WANDORA_CORE_OUTBOUND_SECRET_FILE`;
- do not add a Human Send connection id.

The new Vigia overlay is separate and opt-in; it is not part of the bounded Semantic Fast Read attestation composition.

## GAPS

No compatibility gap remains for this slice.

The PR branch is deliberately not rebased/pushed with the final one-commit Vigia-only main delta. That was a conscious minimal-change decision because:

1. the exact PR code head already has 17/17 CI GREEN;
2. the latest main-only delta is independent from Fast Read authority;
3. the exact `PR + current main` tree was proven with a clean ephemeral merge;
4. that exact combined tree passed typecheck, build and 64/64 focused tests.

Any later `main` movement invalidates this point-in-time proof and must be reconciled again before a production opening.

## CAPABILITY AUTHORITY / REUSE GATE

ADR 0168 remains satisfied.

### Semantic authority

Wandora owns:

- Semantic Fast Read admission;
- signed intent contract;
- bounded attestation gates;
- customer-facing HTTP contract;
- the separation between generic work execution and Fast Read execution.

### Durable product state

This slice introduced no new durable state.

No table, migration, state machine, registry, broker, lifecycle service or new subsystem was created.

### Operational authority

Paperclip remains the operational authority for:

- agent/run lifecycle;
- Tool Gateway execution;
- provider-side operational state;
- plugin runtime boundaries.

Mastra remains the specialist runtime/model boundary already accepted by the architecture.

### Provider implementation

Vigia remains an optional external telemetry provider behind a separate client/overlay.

Its presence does not transfer Fast Read execution authority and does not become part of the bounded Semantic Fast Read attestation composition.

### Replacement boundary

Portability continues to mean contract decoupling, not duplicating provider implementation.

## DECISION

Classify **PR #369 Current-Main Compatibility Reconciliation V1 as GREEN** for the repository/runtime state proven in this ADR.

No additional branch rebase/push is required merely to obtain another green head for the Vigia-only final main delta.

The next slice may be:

**Semantic Fast Read Bounded Production Attestation — Opening Mutation V1**

but only after a brand-new REAL NOW and effect-authorization sequence.

## SECOND ADVERSARIAL REVIEW

Before the final disposable current-main proof, JEV guard returned:

- choice = `allow`;
- `allow = 0.79`;
- `confirm = 0.14`;
- `review = 0.04`;
- `deny = 0.02`;
- confidence = `0.72`.

After the 17/17 CI result and exact current-main ephemeral validation, completion review returned:

- choice = `complete`;
- `complete = 0.52`;
- `verify_more = 0.26`;
- `incomplete = 0.22`;
- confidence = `0.28`.

The deterministic evidence above is the authority for closure; JEV is advisory only.

## EXECUTION

Execution in this slice was limited to:

- GitHub read/reconciliation;
- read-only production status/log checks;
- disposable Git worktrees under the existing authorized ops workspace;
- local no-commit merges;
- dependency install in the disposable worktree;
- typecheck/build/tests.

Not executed:

- PR merge into `main`;
- production deploy;
- Core restart/recreate;
- Semantic Fast Read opening;
- Vigia production enablement;
- provider/customer call;
- VendaERP execution;
- Human Send;
- Messaging Gateway outbound;
- WhatsApp outbound;
- migration;
- secret mutation;
- Paperclip lifecycle mutation;
- broker-capacity expansion;
- `host_admin_prepare/apply`.

## VALIDATION

Fresh production readback during this reconciliation proved:

- `wandora-core` healthy on image `wandora/core:organization-adapter-candidate-b2cffbb54089`;
- `wandora-paperclip` healthy on `wandora/paperclip:v2026.916.1`;
- `wandora-messaging-gateway` healthy;
- Remote-Ops healthy;
- Task Drain = `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- Core startup = `fastReadExecution=false`;
- Core startup = `semanticFastRead=false`;
- Core startup = `humanSendProposal=false`;
- Gateway startup = `outboundEnabled=false`.

No production state changed during the compatibility proof.

## HARD STOP

This ADR authorizes **no production opening**.

Do not infer authority to enable:

- Semantic Fast Read;
- Fast Read Execution;
- Semantic Selector;
- Vigia telemetry;
- TypeSafe/JEV runtime calls;
- Mistral/model calls;
- VendaERP/customer reads;
- Human Send;
- Messaging Gateway outbound;
- WhatsApp/outbound.

## NEXT BOUNDARY

Next slice, if still desired:

**Semantic Fast Read Bounded Production Attestation — Opening Mutation V1**

It must start again from:

`REAL NOW → PROVEN EVIDENCE → GAPS → CAPABILITY AUTHORITY / REUSE GATE → DECISION → SECOND ADVERSARIAL REVIEW → EXECUTION → VALIDATION → DOCUMENTATION`

and must re-read all mutable production freshness gates immediately adjacent to any opening effect.
