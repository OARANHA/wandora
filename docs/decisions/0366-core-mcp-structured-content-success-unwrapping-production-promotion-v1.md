# ADR 0366 — Core MCP Structured Content Success Unwrapping Production Promotion V1

Date: 2026-10-01

Status: **GREEN / EXACT CORRECTED CORE LIVE / ALL FAST-READ + OUTBOUND EFFECT GATES OFF / NO SECOND ANA READ**

## Objective

Promote only the exact Core candidate containing the successful MCP `structuredContent.data` unwrapping correction required by Semantic Fast Read, while preserving the current production topology and keeping every customer/provider/outbound effect inert.

ADR 0168 remains binding. This slice changes only the existing Wandora-owned Core↔Paperclip replacement-boundary adaptation. It does not internalize Paperclip execution, VendaERP transport, retry, policy, lifecycle, provider state or any new subsystem.

## Incident evidence driving the correction

The supervised V2 browser request for 28PRO/Ana:

`Qual é o preço do produto PREMIUM PLUS?`

was executed exactly once and returned HTTP 500 `internal-error`.

That single request created Paperclip run:

`da852f91-44d0-43a1-aeb9-47121e42b40c`.

Unlike the earlier ADR 0363 failure, this run crossed the corrected upstream-tool identity boundary:

- Tool Gateway session creation returned 201;
- authorized tool listing returned 200;
- `POST /api/tool-gateway/tools/call` returned 200;
- governed connection activity for the exact namespaced runtime alias recorded `policy_decision=allow_profile`;
- the exact tool call recorded `call_completed / outcome=success`;
- exactly one VendaERP read occurred;
- no retry or second real request occurred;
- mandatory close restored the 14-file gates-OFF baseline immediately afterward.

Pinned Paperclip `v2026.916.1@d554c4789ed3930f8a53ac9fdf6503b3187097da` normalizes successful local-stdio MCP execution so the Tool Gateway result contains the MCP payload under `result.data`, including `structuredContent`. The VendaERP MCP returns its normalized business payload under `structuredContent.data`.

The existing Wandora bridge correctly handled semantic MCP error envelopes but returned `result.data` wholesale on success. The VendaERP Fast Read adapter therefore received the MCP CallToolResult wrapper instead of the provider-neutral product array and failed after the successful provider call.

## Minimal correction

The correction is limited to:

- `apps/core/src/paperclip-execution/tool-gateway-read-bridge.ts`;
- `apps/core/test/paperclip-tool-gateway-read-bridge.test.ts`.

After the existing fail-closed error checks, the bridge now prefers exact `result.data.structuredContent.data` when present, then preserves the prior `result.data`, `result.content`, and raw-result fallbacks.

Unchanged invariants:

- namespaced Paperclip runtime alias remains the execution identity;
- `upstreamToolName` / `providerToolName` mapping remains exact;
- identical-read dedupe remains unchanged;
- MCP `isError` and non-completed envelopes remain fail-closed;
- no arbitrary text parsing was introduced;
- no Connection ID hard-coding, suffix matching, registry, cache, table, migration, service, retry engine or provider mirror was added.

A focused regression fixture reproduces the pinned Paperclip local-stdio success envelope and proves the bridge returns the underlying product array.

Second adversarial review returned `proceed_fast` for the already-present minimal fix.

## Source and CI qualification

PR #369:

- branch: `feat/semantic-fast-read-runtime-wiring-v1`;
- exact source head: `c524f3f30bc20f3e6a6941f3cafed1cfe5c49871`;
- exact-head workflows: **17/17 GREEN**, zero failures;
- current `main`: `e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- merge ref: `83baca4110966989b484341b5c58bb42d1eb5407`;
- merge parents: exactly current main + exact PR head.

Core Candidate Artifact:

- workflow run: `36818003456`;
- artifact id: `11141674658`;
- artifact name: `core-organization-adapter-candidate-83baca4110966989b484341b5c58bb42d1eb5407`;
- GitHub ZIP digest: `sha256:0bf432e2ad5942b5707d24d0c4912eec973ac6265359b5701d2f8ce5b921bd04`.

The staged VPS ZIP independently matched the same digest. Internal archive identity:

- archive SHA-256: `7698a1f3cb2e290cb3ce43f121a33d6f9dc075f4f4c157e4ca48bbe05cce6eac`;
- image tag: `wandora/core:organization-adapter-candidate-83baca411096`;
- OCI config digest: `sha256:28fa919bea416ab93eecd870f24600810343b676304b498ed3486388de587548`;
- OCI manifest / Docker image id: `sha256:f8f09f785ed2b1f8fd86c9b9120c8ba09956d8f30b239190b93a110efd462d7f`;
- revision: `83baca4110966989b484341b5c58bb42d1eb5407`;
- contract: `organization-adapter-core-v1`;
- image user: `node`.

The canonical portable verifier returned:

`PORTABLE_CANDIDATE_ARCHIVE_V1_OK`.

## Promotion preflight

The candidate image was loaded locally without touching the live Core.

Read-only image inspection proved the exact expected image id, revision, contract and non-root user.

Using the exact live production inputs:

- env file 1: `/opt/wandora/ops-workspace/vigia-first-client-promotion-20260929/promotion.env`;
- env file 2: `/opt/wandora/ops-workspace/semantic-fast-read-attestation-render-f279acc.env`;
- env file 3: temporary candidate selector `/opt/wandora/ops-workspace/core-runtime-image-83baca411096.env`;
- exact existing 14-file production Compose chain;
- no custody or attestation overlays.

The exact render returned:

- `config --quiet`: exit 0;
- `config --images`: exactly `wandora/core:organization-adapter-candidate-83baca411096`.

Immediately before promotion:

- live Core `9d0a4ba...` healthy;
- Paperclip healthy;
- Messaging Gateway healthy;
- Task Drain `false / 0 / 0 / quiescent=true`;
- Fast Read OFF;
- Semantic Fast Read OFF;
- Human Send OFF;
- Messaging Gateway `outboundEnabled=false`;
- ADR 0365 current-baseline Rollback Freeze V2 receipt remained GREEN.

Final adversarial review returned `confirm` with high confidence.

## Execution

One explicitly human-approved managed-admin action recreated only `wandora-core`:

`docker compose ... up -d --no-deps --force-recreate --no-build --pull never --wait core`

The exact 3 env files and exact 14 compose files qualified above were used.

Compose reported Core Recreate → Recreated → Starting → Started → Waiting → Healthy. Exit code was 0 and there was no timeout.

No dependency or other service was recreated.

## Post-promotion validation

Fresh readback proves:

- live image = `wandora/core:organization-adapter-candidate-83baca411096`;
- live image id = `sha256:f8f09f785ed2b1f8fd86c9b9120c8ba09956d8f30b239190b93a110efd462d7f`;
- live revision = `83baca4110966989b484341b5c58bb42d1eb5407`;
- contract = `organization-adapter-core-v1`;
- user = `node`;
- Core healthy, restart count 0;
- read-only root filesystem preserved;
- `CapDrop=ALL`;
- `no-new-privileges=true`;
- no published host port;
- exact 14-file Compose provenance preserved;
- no custody or attestation mounts are live.

Core startup remains:

- `fastReadExecution=false`;
- `semanticFastRead=false`;
- `humanSendProposal=false`;
- `vigiaTelemetry=true`;
- `agentRuntime=mastra-supervised-model`.

Neighbor invariants:

- Paperclip remains healthy and was not restarted;
- Messaging Gateway remains healthy and was not restarted;
- Gateway remains `outboundEnabled=false`;
- Task Drain remains `false / 0 / 0 / quiescent=true`.

## Stable selector

The stable non-secret selector:

`/opt/wandora/ops-workspace/core-runtime-image.env`

now contains exactly:

`WANDORA_CORE_IMAGE=wandora/core:organization-adapter-candidate-83baca411096`

A separately human-approved read-only render using the stable selector, the same other two env files and the same 14-file chain completed:

- `config --quiet`: exit 0;
- `config --images`: exactly `wandora/core:organization-adapter-candidate-83baca411096`.

No service restart was caused by the selector reconciliation.

## Effects accounting

Executed:

- one previously authorized real Ana Fast Read before this promotion slice, which made exactly one successful VendaERP read but returned browser HTTP 500 due to the Core success-envelope bug;
- mandatory close immediately after that request;
- repository correction and regression test;
- exact artifact staging and portable verification;
- one Docker image load;
- one Core-only recreation;
- one stable non-secret selector update;
- read-only validation.

Not executed during this promotion slice:

- Semantic Fast Read opening;
- custody/attestation activation;
- second Ana request;
- second VendaERP call;
- TypeSafe/Mistral customer-path call;
- Human Send;
- Messaging Gateway outbound;
- Paperclip/OA mutation;
- migration/database mutation;
- any other service recreation.

## Decision

**Core MCP Structured Content Success Unwrapping Production Promotion V1 is GREEN.**

The exact corrected Core candidate `83baca...` is production-live with all customer/provider/outbound effect gates OFF.

The ADR 0365 rollback receipt remains valid rollback evidence for the prior live `9d0a4ba...` baseline, but is now historical for the current Core revision.

## Next boundary

**Current 83baca Core Rollback Freeze V2 Refresh V1 — NO FAST READ / NO CUSTOMER EFFECT.**

Before any later supervised Ana re-attestation:

1. reconcile current Git/CI/runtime;
2. repin only the existing Rollback Freeze V2 mechanism to the now-live `83baca...` Core identity;
3. qualify the exact helper/wrapper bytes and CI;
4. install only the existing canonical helper/wrappers if needed;
5. execute exactly one precheck and one persistent capture under fresh explicit approvals;
6. validate the new receipt;
7. keep Fast Read/Semantic/Human Send/Gateway outbound OFF throughout;
8. do not execute another Ana/VendaERP read in the rollback-refresh slice.
