# ADR 0368 — Semantic Fast Read Supervised Production Re-Attestation V3

Date: 2026-10-01

Status: **GREEN / ONE OWNER-BROWSER REQUEST COMPLETED / ONE VENDAERP READ / MANDATORY CLOSE COMPLETE / BASELINE RESTORED**

## Objective

Execute the smallest useful live Semantic Fast Read re-attestation on the corrected Core `83baca...`: one explicitly authorized owner-browser request for 28PRO/Ana, no retry, no second ERP read, followed by mandatory close to the exact gates-OFF baseline.

ADR 0168 remains binding. Wandora retains semantic/effect authority; Paperclip retains run, Connection, Tool Gateway and audit authority; provider implementations remain replaceable behind their existing contracts. No provider capability was internalized.

## Real-now and source qualification

Immediately before the effect window:

- PR #369 branch: `feat/semantic-fast-read-runtime-wiring-v1`;
- exact source head: `2f52e234a5ef1fd17398f22ee47253fc84c843ba`;
- exact-head CI: **17/17 GREEN**;
- current `main`: `e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- merge ref parents: exactly current main + exact PR head;
- Core image: `wandora/core:organization-adapter-candidate-83baca411096`;
- Core image id: `sha256:f8f09f785ed2b1f8fd86c9b9120c8ba09956d8f30b239190b93a110efd462d7f`;
- Core revision: `83baca4110966989b484341b5c58bb42d1eb5407`;
- Paperclip healthy;
- Messaging Gateway healthy;
- Task Drain `false / 0 / 0 / quiescent=true`;
- Core Fast Read/Semantic/Human Send OFF;
- Gateway outbound OFF;
- ADR 0367 current-baseline Rollback Freeze V2 receipt GREEN.

## Fresh effect-adjacent gates

The dedicated root custody metadata program was first re-hashed live and matched canonical Git blob `d12d7033d22d35ee0601ecc96e08daffbc27aae2`.

One metadata-only execution then proved exactly three fixed secret files, each regular file, owner `wandora-admin`, group `wandora-ops`, mode `0640`. No secret value, hash or copy was returned.

Fresh Paperclip qualification for the intended 28PRO/Ana/VendaERP path proved:

- Tool Policy decision `allow`;
- reason `allow_profile`;
- no temporary matched policy;
- no audit/rate-limit consumption from the qualification itself.

Fresh Organization Adapter `operational-read` proved:

- runtime health `ok`;
- VendaERP Connection active/enabled/healthy;
- organization grant active;
- installed for Ana;
- `vendaerp_search_products` active;
- risk `read`;
- read-only, non-write, non-destructive;
- allowed by the effective profile.

## Compose hard gates

The current live 14-file Core provenance was captured from runtime.

Two separately approved read-only Docker Compose renders were executed with the exact existing env inputs and stable Core selector:

1. close/baseline = exact live 14-file chain;
2. open = the same chain plus:
   - `compose.semantic-fast-read-custody.yaml`;
   - `compose.semantic-fast-read-attestation.yaml`.

Both completed with exit 0 and `config --quiet --images` resolved exactly:

`wandora/core:organization-adapter-candidate-83baca411096`.

No mutation occurred during these renders.

## Browser-owned authority preflight

The already-authenticated owner browser at `app.wandora.com.br` executed the canonical preflight with `EXECUTE=false`.

It proved:

- organization: 28PRO;
- role: `owner`;
- exactly one active Ana;
- no Fast Read POST performed during preflight.

The browser token remained entirely browser-owned and was never copied into Remote-Ops, MCP or operator state.

## Ana/Paperclip invokability reconciliation

Before opening, Paperclip projected Ana as `status=error` with prior `wandora_execution_failed_500`, while the organization chain was healthy.

Pinned Paperclip source was inspected before mutation. Its direct non-invokable status set contains only:

- `paused`;
- `terminated`;
- `pending_approval`.

`error` is therefore invokable when the organization-chain eligibility remains valid. No Paperclip lifecycle mutation, clear-error action or resume operation was introduced merely to prepare the attestation.

## Decision and second adversarial review

A fresh effect review covered OPEN and MANDATORY CLOSE together.

The successful retry of that review returned:

- decision `confirm`;
- probability `confirm=0.82`;
- confidence `0.76`.

Both one-use managed-admin tickets were prepared before OPEN execution so the window had an already-authorized close path.

## OPEN execution

The approved OPEN recreated only `wandora-core` using:

- exact current Core image;
- exact current 14-file baseline;
- custody overlay appended;
- attestation overlay appended last;
- `--no-deps`;
- `--force-recreate`;
- `--no-build`;
- `--pull never`;
- `--wait`.

Execution completed exit 0 in approximately 6.9 seconds.

Immediate readback proved:

- same exact Core image id and revision;
- restart count 0;
- active provenance included custody and attestation overlays;
- TypeSafe and `wfri1` mounts present read-only;
- `fastReadExecution=true`;
- `semanticFastRead=true`;
- `humanSendProposal=false`;
- Paperclip healthy;
- Organization Adapter healthy/ready;
- Gateway healthy and outbound OFF;
- Task Drain quiescent.

## Exactly one real owner-browser request

The user then executed exactly once, from the same browser-owned owner session:

`Qual é o preço do produto PREMIUM PLUS?`

Returned browser payload:

- HTTP status `200`;
- Fast Read kind `completed`;
- correlation id `a249f6fa-4179-4e9f-aa04-d98ff2db93ce`;
- model `wandora-deterministic-read-v1`;
- summary:
  - product `PREMIUM PLUS`;
  - code `3`;
  - price `R$ 890,00`.

No second request was executed, including no retry after success.

## Mandatory close

Immediately after receipt of the single browser result, the already-approved CLOSE ticket executed once.

It recreated only `wandora-core` from the exact pre-window 14-file gates-OFF composition, with the same exact Core image and the same no-deps/no-build/no-pull safeguards.

Execution completed exit 0 in approximately 6.9 seconds.

Post-close readback proves:

- same exact Core image id and revision;
- restart count 0;
- active provenance again contains exactly the 14 baseline files;
- custody overlay absent;
- attestation overlay absent;
- TypeSafe mount absent;
- `wfri1` mount absent;
- `fastReadExecution=false`;
- `semanticFastRead=false`;
- `humanSendProposal=false`;
- Gateway outbound remains OFF;
- Paperclip/OA remain healthy;
- Task Drain remains `false / 0 / 0 / quiescent=true`.

## Paperclip terminal evidence

After close, Paperclip runtime state for Ana reports:

- `lastRunId=51170b58-99a8-4de8-aad2-d6915737e7f0`;
- `lastRunStatus=succeeded`;
- Ana status `idle`;
- `errorReason=null`.

The successful run therefore also cleared the prior runtime error projection through normal Paperclip execution semantics; no operator lifecycle repair was needed.

## Governed VendaERP Connection evidence

The first safe activity query with the generic logical tool name intentionally returned zero matching tool rows but disclosed the exact operational name associated with the run:

`mcp.wandora-vendaerp-readonly-v1-8e2c23f4:vendaerp-search-products`.

A second read-only safe activity query using that exact runtime tool name returned exactly two records for run `51170b58-99a8-4de8-aad2-d6915737e7f0`:

1. `policy_decision`
   - decision `allow`;
   - reason `allow_profile`;
   - outcome `success`.

2. `call_completed`
   - decision `allow`;
   - reason `tool_completed`;
   - outcome `success`;
   - no error code.

Those two audit records represent one governed tool execution: authorization + completion. They are not two ERP reads. No second matching runtime tool execution is present for the run.

## Evidence limitations

Mandatory close recreates Core, so the short-lived OPEN Core container no longer existed when post-hoc logging was attempted. The durable evidence retained for the completed path is therefore:

- the browser HTTP 200 completed result and correlation id;
- Paperclip terminal runtime state;
- governed Connection policy/completion activity;
- post-close baseline readback.

A later read of `wandora-jev-mcp.service` returned `-- No entries --`. This ADR therefore does **not** claim a separately retained post-hoc JEV journal event or a post-hoc copy of the OPEN Core log.

The absence of those post-hoc logs does not convert the proven browser/Paperclip/Connection result into additional provider telemetry. No unsupported inference is made.

## Completion review

A post-close completion review returned:

- `complete=0.93`;
- confidence `0.90`.

## Decision

**Semantic Fast Read Supervised Production Re-Attestation V3 is GREEN.**

The corrected end-to-end owner-browser path produced one successful current VendaERP product-price result, Paperclip recorded one successful governed product-search execution, and mandatory close restored the exact gates-OFF Core baseline.

This is attestation evidence only.

It does **not** authorize:

- permanent Fast Read activation;
- customer rollout;
- a second request;
- additional ERP reads;
- Human Send or Gateway outbound;
- PR #369 merge.

Any rollout or persistent activation is a separate decision slice and must begin from fresh current-state evidence and capability authority.
