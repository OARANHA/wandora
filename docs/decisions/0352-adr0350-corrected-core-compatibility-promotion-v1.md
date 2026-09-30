# ADR 0352 — ADR 0350 Corrected Core Compatibility Promotion V1

Date: 2026-09-30

Status: **EXECUTED / GREEN / CORRECTED CORE LIVE / ALL EFFECT GATES OFF / NO HUMAN FAST READ**

## Objective

Promote only the already-qualified Core containing the ADR 0350 semantic correction, while preserving the exact current production topology and keeping every Semantic Fast Read/customer/outbound effect gate OFF.

This slice does not authorize Semantic Fast Read re-attestation, Human Fast Read, provider/business calls, Human Send or outbound effects.

## REAL NOW

Immediately before the production mutation, authoritative Git evidence was:

- `refs/heads/main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 = open / draft / mergeable;
- exact PR head = `004551f445a89ad7b4489360bb05c0c0551ca825`;
- `refs/pull/369/merge = a49504c7c41ee255fa25cc3944ef0f718cc9a696`;
- verified merge parents = exactly `e4c7c36...` + `004551f...`;
- exact PR head CI = **17/17 workflows completed GREEN**.

The PR REST object's `base.sha` still reported historical `ce805822...`. During preflight that field was briefly misinterpreted as the live main tip and correctly caused a fail-closed pause. Raw Git branch/ref reads then proved `refs/heads/main` remained `e4c7c36...`; there had been no main regression. For deployment provenance, actual Git refs are authoritative over stale PR base metadata.

Production baseline before mutation:

- Core = `wandora/core:organization-adapter-candidate-14534e57256f`;
- Core OCI/image id = `sha256:ac253a9479338f0d47954937209323229314ef513125a71dd266558b3bfe1c8b`;
- Core revision = `14534e57256f0a73c49feb3944a1068921468f94`;
- Core healthy / restart 0;
- exact 14-file production Compose chain;
- Paperclip v2026.916.1 healthy;
- exactly one Organization Adapter 0.6.1 ready / lastError=null;
- Messaging Gateway healthy / outbound OFF;
- Task Drain = false / 0 / 0 / quiescent=true;
- custody and attestation overlays absent.

## PROVEN EVIDENCE

### Exact candidate provenance

Current Core Candidate Artifact:

- workflow run `36669756777`;
- artifact id `11077542990`;
- artifact name `core-organization-adapter-candidate-a49504c7c41ee255fa25cc3944ef0f718cc9a696`;
- GitHub ZIP digest `sha256:e59b40dba92a7d52f7aaca112ae915075949385c9ceef6682471bf9decf5dcad`.

The ZIP was downloaded to governed workspace and independently SHA-256 verified against GitHub.

Candidate manifest:

- `candidate_contract=organization-adapter-core-v1`;
- `source_sha=a49504c7c41ee255fa25cc3944ef0f718cc9a696`;
- `image_tag=wandora/core:organization-adapter-candidate-a49504c7c41e`;
- `oci_config_digest=sha256:2fa2ff782d0686d986ff63ea830604802a15730ed6c105eb7a49605285cba356`;
- `oci_manifest_digest=sha256:ec37d2f730e0069521745fc620085f5d2353dc583117808d955f9e6975604005`;
- `image_user=node`;
- archive SHA-256 `926dfcc4d7d50d81beb3080fb7fa0e43d90f08b3b4b8efe8124ef06230ed26ee`.

Host-independent archive hashing matched the manifest and `SHA256SUMS`. The exact CI candidate job also passed its portable provenance re-load/re-check.

### Image load

The normal MCP Docker image-load path was tried first and failed before effect because the broker rejected the nested workspace path. It was not retried blindly.

A separately reviewed/human-approved managed-admin `docker load` then executed exactly once and returned:

`Loaded image: wandora/core:organization-adapter-candidate-a49504c7c41e`.

Managed-admin image inspection proved:

- image id `sha256:ec37d2f730e0069521745fc620085f5d2353dc583117808d955f9e6975604005`;
- revision `a49504c7c41ee255fa25cc3944ef0f718cc9a696`;
- contract `organization-adapter-core-v1`;
- user `node`.

### Exact gates-OFF render

The exact current production Core composition contains 14 files:

1. `/opt/wandora/stacks/core/compose.yaml`
2. `/opt/wandora/stacks/core/compose.database.yaml`
3. `/opt/wandora/stacks/core/compose.gateway-ingress.yaml`
4. `/opt/wandora/stacks/core/compose.agent-runtime-deterministic.yaml`
5. `/opt/wandora/stacks/core/compose.human-api.yaml`
6. `/opt/wandora/stacks/core/compose.organization-adapter.yaml`
7. `/opt/wandora/stacks/core/compose.human-digital-employee-hire.yaml`
8. `/opt/wandora/stacks/core/compose.paperclip-execution-bridge.yaml`
9. `/home/wandora-admin/executions/customer-owner-activation-production-execution-v1-20260920T1856Z/activation-overlay.yaml`
10. `/home/wandora-admin/executions/first-legitimate-work-production-execution-v1-20260921T0107Z/web-bridge-resume/customer-work-overlay.yaml`
11. `/opt/wandora/stacks/core/compose.agent-runtime-model.yaml`
12. `/opt/wandora/stacks/core/compose.customer-company-onboarding.yaml`
13. `/opt/wandora/stacks/core/compose.semantic-fast-read.yaml`
14. `/opt/wandora/ops-workspace/vigia-first-client-promotion-20260929/compose.vigia.yaml`

Using the protected production env plus a temporary non-secret candidate image override, managed-admin read-only render proved:

- `docker compose ... config --quiet` = exit 0;
- `docker compose ... config --images` = exactly `wandora/core:organization-adapter-candidate-a49504c7c41e`.

The merge-ref `compose.semantic-fast-read.yaml` explicitly keeps:

- `WANDORA_FAST_READ_EXECUTION_ENABLED=false`;
- `WANDORA_SEMANTIC_FAST_READ_ENABLED=false`;
- `WANDORA_SEMANTIC_SELECTOR_ENABLED=false`;
- `WANDORA_HUMAN_SEND_PROPOSAL_ENABLED=false`.

Custody/attestation overlays were not part of the composition.

### Rollback boundary

Immediately before Core recreation, receipt

`/opt/wandora/ops-workspace/production-rollback-freeze-v2-14534e57256f0a73c49feb3944a1068921468f94.metadata`

was freshly read and terminated in:

`ROLLBACK_FREEZE_V2_OK`.

It preserved the exact pre-promotion Core/Paperclip/OA/Gateway/gates-OFF baseline and recorded no activation/provider/customer/outbound effect.

## GAPS

No new capability, state machine, table, service or provider subsystem was missing.

The only gap from ADR 0351 was deployment convergence: the ADR 0350 semantic correction was qualified in repository/CI but not yet present in the live Core.

## CAPABILITY AUTHORITY / REUSE GATE

ADR 0168 remains binding.

This promotion changes no authority boundary:

- Wandora remains semantic/policy/effect authority;
- TypeSafe/JEV remains replaceable semantic-decision provider;
- Mastra + model provider remain replaceable runtime/selector implementation;
- Paperclip remains run/lifecycle/Connections/grants/secrets/Tool Gateway authority;
- VendaERP remains replaceable business-system provider.

No provider capability was internalized.

## DECISION

Promote exactly the corrected Core candidate `a49504c...`, recreate only `wandora-core`, keep all effect gates OFF, validate, reconcile the stable non-secret selector only after success, then hard stop.

Do not open Semantic Fast Read in this slice.

## SECOND ADVERSARIAL REVIEW

An initial review returned deny because it inherited the incorrect premise that current main was `ce805822...`.

After authoritative raw Git refs proved current main remained `e4c7c36...` and merge-ref provenance closed exactly, the review was rerun on the corrected evidence.

JEV 1.13.0 returned:

- decision = `confirm`;
- `confirm=0.95`;
- confidence = `0.93`.

The review itself did not authorize mutation; a separate one-use human approval remained required.

## EXECUTION

One separately human-approved managed-admin action recreated only Core using the exact 14-file composition:

`docker compose ... up -d --no-deps --force-recreate --no-build --pull never --wait core`

Result:

- exit code 0;
- Core Recreated;
- Core Started;
- Core Healthy.

No dependency/service recreation was requested.

## VALIDATION

Fresh post-promotion inspect proved:

- container image = `wandora/core:organization-adapter-candidate-a49504c7c41e`;
- image/OCI digest = `sha256:ec37d2f730e0069521745fc620085f5d2353dc583117808d955f9e6975604005`;
- revision = `a49504c7c41ee255fa25cc3944ef0f718cc9a696`;
- contract = `organization-adapter-core-v1`;
- user = `node`;
- health = healthy;
- restart count = 0;
- exact 14-file Compose provenance preserved;
- read-only rootfs preserved;
- `CapDrop=ALL`;
- `no-new-privileges=true`;
- no published host port;
- `wandora-core` and `wandora-data` networks preserved;
- database, gateway-ingress, model-provider, Organization Adapter, Paperclip bridge and Vigia read-only mounts preserved;
- no TypeSafe/`wfri1` custody/attestation mounts introduced.

Core startup log proves:

- `fastReadExecution=false`;
- `semanticFastRead=false`;
- `humanSendProposal=false`;
- `vigiaTelemetry=true`.

The selector gate is independently proven OFF by the exact rendered convergence overlay.

Neighbor invariants:

- Paperclip retained the prior start time and remains healthy;
- exactly one `wandora.organization-adapter-v1@0.6.1`, status ready, lastError null;
- Gateway retained the prior start time, remains healthy and logs `outboundEnabled=false`;
- Task Drain = `false / 0 / 0 / quiescent=true`.

Only after all post-promotion checks passed, stable selector

`/opt/wandora/ops-workspace/core-runtime-image.env`

was updated to:

`WANDORA_CORE_IMAGE=wandora/core:organization-adapter-candidate-a49504c7c41e`.

A separate human-approved read-only managed-admin `config --images`, using the stable selector and exact same 14-file production chain, returned exactly:

`wandora/core:organization-adapter-candidate-a49504c7c41e`.

## PRODUCTION EFFECT BOUNDARY

Executed:

- candidate image load;
- one Core-only recreation;
- non-secret stable selector reconciliation.

Not executed:

- Semantic Fast Read opening;
- custody/attestation overlay activation;
- Human Fast Read;
- TypeSafe/System One customer-path call;
- Mistral selector customer-path call;
- Paperclip Fast Read run;
- VendaERP read/write;
- Human Send;
- Gateway outbound;
- WhatsApp;
- Paperclip/OA mutation;
- migration/database mutation;
- any other service recreation.

## DOCUMENTATION / HARD STOP

Record this ADR in `docs/CANONICAL_STATE.md` and `docs/WANDORA_PROJECT_SOURCE.md`, then require exact documentation-head CI GREEN.

After that, hard stop.

The next slice is a new:

**Semantic Fast Read Bounded Production Re-Attestation after ADR 0350 — FRESH PREFLIGHT / CONTROLLED EFFECT**

It must restart from REAL NOW and re-read every mutable freshness gate. This ADR does not authorize that opening.

