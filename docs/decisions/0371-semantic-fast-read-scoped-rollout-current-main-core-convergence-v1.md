# ADR 0371 — Semantic Fast Read Scoped Rollout Current-Main Core Convergence V1

Status: **QUALIFIED / CURRENT-MAIN-COMPATIBLE CORE CANDIDATE GREEN / PRODUCTION NO-GO / NO PRODUCTION EFFECT**

Date: 2026-10-01

## Context

ADR 0370 completed the scoped canary activation preflight but rejected the then-produced Core artifact because its merge provenance closed over PR #369 + PR #377 without the current `main` tip. The rejected artifact `11151382368` MUST NOT be used for production promotion.

This slice was limited to CODE / GIT / CI / CANDIDATE provenance convergence. It did not authorize production activation.

The required target tree was:

`current main + necessary PR #369 work + PR #377 scoped rollout`

while preserving, in production, Fast Read OFF, Semantic Fast Read OFF, Semantic Selector OFF, Human Send OFF and Messaging Gateway outbound OFF.

## REAL NOW

Repository evidence before execution:

- live `main` resolved directly as `e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 remained open/draft/mergeable:
  - head `bf5c82319f0815562d45cad90a2db0ea57b9251b`;
  - current merge ref `c78266bb08c2d903d942d0ad87d6cb03438811a4`;
  - exact head workflow set 17/17 GREEN;
- PR #377 remained open/draft/mergeable:
  - head `54b6120c81b735fd86d8e042e7bc18f0b0f96595`;
  - former stacked merge ref `fd7470a9ac3ce437ceebc61572481b0e8af28bc3`;
  - exact head workflow set 12/12 GREEN before this slice.

Production readback remained:

- Core `wandora/core:organization-adapter-candidate-83baca411096`;
- Core revision `83baca4110966989b484341b5c58bb42d1eb5407`;
- Paperclip `wandora/paperclip:v2026.916.1`, healthy;
- Organization Adapter exactly `0.6.1`, ready;
- `wandora_mastra@0.6.0`, external, loaded and enabled;
- Task Drain `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- Fast Read Execution OFF;
- Semantic Fast Read OFF;
- Semantic Selector OFF;
- Human Send OFF;
- Messaging Gateway outbound OFF;
- custody, attestation and rollout overlays absent from the live Core composition.

The ADR 0367 receipt was read back and still ended in `ROLLBACK_FREEZE_V2_OK` for the live `83baca...` baseline.

## Provenance reconciliation

The ancestry mismatch was proven to be a narrow Git provenance problem, not an architectural conflict.

### Current main delta

Compared with PR #369's merge-base `ce8058223cd322995318fad15ae958b9533f3b3e`, current `main=e4c7c36...` is exactly one commit ahead.

That main-only commit changes only:

- `apps/core/src/vigia/telemetry.ts`;
- `infra/stacks/core/compose.vigia-telemetry.yaml`.

### PR #369 current-main closure

The current PR #369 merge ref `c78266bb...` was independently compared against both sides:

- `main e4c7c36... -> c78266...`: ahead, behind 0, merge-base exactly `e4c7c36...`;
- `PR369 bf5c823... -> c78266...`: ahead, behind 0, merge-base exactly `bf5c823...`;
- the only file delta from `bf5c823...` to `c78266...` is the two current-main Vigia files above.

Therefore `c78266...` mechanically closes over current main plus the exact PR #369 head.

The existing PR #369 Core Candidate workflow also produced artifact `11146751198` named for `c78266...`, corroborating that GitHub's pull-request candidate source is that merge ref.

### Live Core versus current PR #369

The live `83baca...` Core already contains current main plus an earlier PR #369 source snapshot `c524f3f30bc20f3e6a6941f3cafed1cfe5c49871`.

Current PR #369 head `bf5c823...` is only 11 commits ahead of that source snapshot, with changes concentrated in ADR 0366–0368 documentation, rollback helpers/verifiers and a Semantic Fast Read CI adjustment. No need exists to reconstruct or transport the full historical stack merely to repair ancestry.

### PR #377 exclusive delta

Compared with PR #369 head `bf5c823...`, PR #377 head `54b6120...` is 23 commits ahead, 0 behind, and changes exactly 15 files. Those files are the scoped rollout admission implementation, config/tests, CI assertions, rollout overlay, authority/runbook updates and ADRs 0369–0370.

No provider lifecycle, Connection/grant mirror, Tool Policy mirror, run store, tool registry, retry engine, secret manager or parallel operational subsystem is introduced.

## Capability Authority / Reuse Gate

ADR 0168 remains binding.

Wandora owns the product-semantic rollout admission contract. Paperclip remains operational authority for workforce lifecycle, Connections, grants, install/effective profile, Tool Policy, Tool Gateway, runs, terminal results, execution and operational audit.

The resulting flow continues to:

1. reject a non-enrolled organization/employee pair before semantic/provider work;
2. obtain the operational BusinessCapability projection through the existing Organization Adapter/Paperclip boundary;
3. intersect that projection with the Wandora rollout capability allowlist;
4. fail closed when the intersection is empty;
5. only then invoke semantic routing;
6. preserve the existing signed `wfri1`, Paperclip dispatch and Tool Gateway path.

## Decision and second adversarial review

The first proposal was to freeze `c78266...` as a named convergence branch and retarget PR #377 directly.

The first JEV review returned `deep_review=0.79`. A focused second pass still returned `deep_review=0.64`, highlighting avoidable risk in mutating the historical PR #377 metadata.

The decision was narrowed further:

- preserve PR #369 unchanged;
- preserve PR #377 unchanged;
- create a named convergence base at exact `c78266...`;
- create a named convergence head at exact `54b6120...`;
- open a new draft PR between those immutable refs;
- require a fresh merge ref, fresh CI and a fresh Core candidate;
- stop on any conflict or unexpected diff.

The action-specific JEV guard then returned:

- allow 0.62;
- confirm 0.28;
- review 0.08;
- deny 0.02.

Execution proceeded only after that second adversarial review.

## Execution

Created without new commits:

- base branch:
  `feat/semantic-fast-read-current-main-convergence-base-v1`
  -> `c78266bb08c2d903d942d0ad87d6cb03438811a4`;
- head branch:
  `feat/semantic-fast-read-scoped-rollout-current-main-v1`
  -> initially exact PR #377 head `54b6120c81b735fd86d8e042e7bc18f0b0f96595`.

Opened draft PR #378:

`Semantic Fast Read scoped rollout current-main convergence V1`

Initial PR #378 facts:

- base `c78266...`;
- head `54b6120...`;
- mergeable=true;
- 23 commits;
- 15 changed files;
- +1093 / -4;
- no merge performed.

GitHub generated merge ref:

`9ee338303292173db8e1b21bef9c8c5067c104a4`

with merge message:

`Merge 54b6120c81b735fd86d8e042e7bc18f0b0f96595 into c78266bb08c2d903d942d0ad87d6cb03438811a4`.

Independent compare evidence proves `9ee338...` is a descendant of:

- convergence base `c78266...`;
- rollout head `54b6120...`;
- current main `e4c7c36...`.

The head-to-merge delta is only the two current-main Vigia files. The base-to-merge delta is exactly the 15-file PR #377 rollout delta.

## Scoped rollout integrity

The converged source preserves the effect-inert compatibility overlay:

- `WANDORA_FAST_READ_EXECUTION_ENABLED=false`;
- `WANDORA_SEMANTIC_FAST_READ_ENABLED=false`;
- `WANDORA_SEMANTIC_SELECTOR_ENABLED=false`;
- `WANDORA_HUMAN_SEND_PROPOSAL_ENABLED=false`.

The separate rollout overlay:

- enables Fast Read Execution, Semantic Fast Read and Semantic Selector only when explicitly appended in a later authorized production mutation;
- requires both exact rollout targets and capability allowlist;
- keeps Human Send OFF;
- introduces no image/build/port/network/volume/secret mutation.

The intended first future canary remains exactly:

- Wandora organization 28PRO:
  `7a531811-9fea-4395-b0b2-2e2b0fce0570`;
- Wandora Ana:
  `7b401163-8102-42db-b595-3a2017f54003`;
- Paperclip company:
  `5d7ec217-118c-4292-8136-0a9ab16926ea`;
- Paperclip Ana:
  `428b6730-3df4-4b92-b90a-a87f87c401f9`;
- VendaERP Connection:
  `8e2c23f4-73f5-444a-8647-71428819ea91`;
- sole rollout BusinessCapability:
  `business.products.price`.

Tests on the converged source explicitly prove:

- non-enrolled target -> `rollout-not-enabled` before semantic/provider work;
- rollout capability set is intersected with the operational projection;
- empty operational intersection -> `capability-not-advertised` before semantic decision/dispatch.

## CI

For the code convergence head, PR #378 completed:

**12/12 workflows GREEN**

including:

- Core CI;
- Semantic Fast Read CI;
- Core Candidate Artifact;
- Organization Adapter Plugin CI;
- Integration Capability Projection CI;
- Paperclip Mastra Adapter CI;
- Paperclip Host Operational Read Extension CI;
- Paperclip Fast Read Run Result Read CI;
- Messaging Gateway CI;
- VendaERP Read-Only MCP CI;
- Web CI;
- Platform Admin CI.

No failed, cancelled or unexpected skipped workflow was accepted.

## Qualified Core candidate

The first Core Candidate build completed before the primary Core + Semantic gates and is not the promotion unit.

After both Core CI and Semantic Fast Read CI were GREEN, the Core Candidate job was deliberately rerun once.

Qualified post-gates job:

- workflow run: `36847123154`;
- job: `110321436487`;
- result: GREEN.

Frozen candidate:

- source / merge SHA:
  `9ee338303292173db8e1b21bef9c8c5067c104a4`;
- image:
  `wandora/core:organization-adapter-candidate-9ee338303292`;
- candidate contract:
  `organization-adapter-core-v1`;
- image user:
  `node`;
- archive SHA-256:
  `612f04b1e60ad40a97ea0663c293af03fce65793a10358f46c8a85865b801724`;
- OCI config digest:
  `sha256:6e7e5bab6dcd9d19a6d314ae04b1c2495c210bee3708ea06d5e32126008131b7`;
- OCI manifest digest:
  `sha256:fbb3c420b25fc9ae141f8ece5ab69bec9daef203a36e268eea4c363da3a84a5f`;
- Actions artifact ID:
  `11153574632`;
- Actions artifact digest:
  `sha256:fdca91b452d73e68b53be4608fe016e6bf6e2222803cd38ce14ae4083692217b`;
- artifact created:
  `2026-10-01T10:13:16Z`;
- artifact expires:
  `2026-10-08T10:13:15Z`.

The portable verifier returned `PORTABLE_CANDIDATE_ARCHIVE_V1_OK`, reloaded the archive and rechecked provenance. The workflow also verified the revision label, contract and `Config.User=node`, and fails closed if the loaded image contains baked enable/sensitive environment variables such as Organization Adapter enable/secret, HMAC, PASSWORD, TOKEN or API_KEY material.

The earlier non-current-main artifact `11151382368` remains explicitly non-authorized and must not be reused.

The preliminary pre-gates PR #378 artifact is also not the promotion unit.

## Completion review

JEV completion review returned:

- complete 0.96;
- verify_more 0.03;
- incomplete 0.01.

## Production effect

None.

This slice did not:

- deploy or recreate Core;
- alter Paperclip;
- alter Organization Adapter;
- alter Mastra;
- change production Compose;
- mount custody/attestation/rollout overlays;
- enable Fast Read, Semantic Fast Read or Semantic Selector;
- enable Human Send;
- enable Messaging Gateway outbound;
- mutate Task Drain;
- call TypeSafe, Mistral or VendaERP;
- perform customer work;
- merge PR #369, PR #377 or PR #378.

## Rollback authority

ADR 0367 remains the current rollback authority for the live Core `83baca411096...` baseline because production did not change.

A future successful promotion of `9ee338...` would make ADR 0367 historical for the former baseline. Before any subsequent scoped activation, a fresh Rollback Freeze V2 must be captured for the newly live Core baseline.

## Next boundary

The next production-bound action is NOT scoped activation.

It is a separately reviewed promotion preflight for the exact frozen Core candidate artifact `11153574632`, source `9ee338...`, with all effect gates remaining OFF.

That future slice must begin again with fresh REAL NOW and prove:

- current `main` and candidate provenance are still acceptable;
- exact artifact still exists and matches the frozen digest;
- live Core/Paperclip/OA/Mastra/Gateway identities;
- Task Drain quiescence;
- ADR 0367 rollback readiness for the current `83baca...` baseline;
- candidate import/staging identity;
- all effect gates remain OFF;
- no rollout overlay is added.

The next `APPROVE adm_...` is expected only for the one-use managed-admin/root apply that actually performs the production Core candidate promotion/recreate after its fresh prepare + adversarial review. No approval is generated in this ADR.

After that promotion is GREEN, capture a fresh rollback baseline for the new Core before considering the separate scoped activation of only 28PRO / Ana / `business.products.price`.
