## Reconciled checkpoint — ADR 0253 safe product-list structural fingerprint CODE COMPLETE / NO PROVIDER CALL

ADR 0252 is merged at main@27e844da6f88964cc0959191ddcf312594976878; post-merge push workflows are 4/4 GREEN. Final production state remains Task Drain OFF/quiescent, ADR0252 policies=0, activity=72 events / SHA-256 6dc3de78ff954bcebda966f4daaa5d0847f369d28eb5f43e99f2bfffc2eb35fb, work=2, unfinished=1, outbound=0, and Ana truthfully error / wandora_execution_failed_422.

Public/accepted contract evidence still says Produtos/Pesquisar returns a direct array of Produto, while ADR 0252 proved the live 28PRO response does not satisfy the current array-of-objects parser. The exact envelope remains unknown because raw provider payload was intentionally not persisted.

ADR 0253 changes only the replaceable VendaERP MCP candidate to add an optional allowlisted structural shape alongside the existing invalid-provider-response / product-list-shape diagnostic. It does not accept any new provider shape. The MCP text error remains unchanged; arbitrary keys/values/raw payload/credentials cannot be emitted. Synthetic local validation is 12/12 GREEN + static verifier GREEN, with no network/provider/model call.

ADR 0253 is **CODE COMPLETE / NO EFFECT / NO PROVIDER CALL / CI REQUIRED**.

Next after merge: separate MCP promotion preflight and promotion, both NO PROVIDER CALL, before any separately authorized bounded diagnostic execution.

## Reconciled checkpoint — ADR 0252 diagnostic one-shot V2 COMPLETE / product-list-shape / hard budget honored

ADR 0252 executed exactly one genuine owner-originated 28PRO work under the Paperclip-native hard one-call budget. New execution-specific block + rate-limit guards were qualified under Task Drain with the full eight-tool dry-run matrix and zero pre-consumption, then Task Drain was ended before owner submission.

The single admitted `vendaerp_search_products {"pageSize":5,"skip":0}` consumed the native counter exactly once: `limit=1 / remaining=0`. Tool Gateway activity increased exactly from 70 to 72 events: one policy decision plus one call completed for the same run. Governed result evidence classified the provider response as `invalid-provider-response / product-list-shape`. It was not `product-name-missing`. No raw provider payload was persisted, so the exact unrecognized list envelope is not yet proven.

Lifecycle stayed one-shot: one assignment run `22ff09f4-d659-4790-89b9-3884ff303a9d`, `retry_of_run_id=null`, `continuation_attempt=0`, `scheduled_retry_at=null`; one owner-work wake plus one same-issue wake coalesced into the same run; no successor/manual retry/provider dispatch. Outbound remained 0.

Core failed closed as expected. The new work remains truthfully `execution_uncertain`; Ana remains Paperclip `error / wandora_execution_failed_422`. Those states were not force-rewritten. After evidence capture, only the two ADR0252 temporary policies were deleted. Final state: Task Drain OFF/quiescent, temporary policies=0, counter residue=0, active runs=0, pending wakes=0, activity=72 events / SHA-256 `6dc3de78ff954bcebda966f4daaa5d0847f369d28eb5f43e99f2bfffc2eb35fb`, work=2 total, unfinished=1, outbound=0.

ADR 0252 is **COMPLETE / HARD ONE-PROVIDER-CALL BUDGET HONORED / SAFE DIAGNOSTIC RESULT = product-list-shape / ZERO OUTBOUND**.

Next slice is **NO PROVIDER CALL**: reconcile the documented/accepted `Produtos/Pesquisar` response list shape and update only the replaceable VendaERP MCP parser if justified. Do not broaden parsing by guesswork or persist raw provider payload.

## Reconciled checkpoint — ADR 0251 product diagnostic one-shot V2 preflight GREEN / NO PROVIDER CALL

ADR 0250 is live and reconciled at `main@3170144a202371527fda6f6154515be317a91679`; post-merge push workflows are 4/4 GREEN and open PRs were 0 at ADR 0251 entry. The live VendaERP MCP remains exact at server SHA-256 `c740d1237374fe065907857465fe63ba6052ddb97096631fdb5ca94f90f9db9b` and source-marker SHA-256 `a24786e3011ca0a28dc3840af50917b4787c857f60db84ef638f69fa812accb6`.

Live preflight is clean: Paperclip/Core healthy/restart 0; Task Drain OFF/quiescent; Ana idle; Connection active/healthy local_stdio; gateway active/gateway_only; exactly 8 active VendaERP tools, all READ-only/non-write/non-destructive; temporary block/rate-limit policies=0; work=1 completed, unfinished=0, outbound=0; VendaERP activity remains 70 events with SHA-256 `e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b`.

ADR 0251 reuses ADR 0242/0244's Paperclip-native hard one-provider-call budget: block the seven non-product tools plus `rate_limit=1` for `vendaerp_search_products`, dry-run with `consumeRateLimit=false`, prove no pre-consumption, release Task Drain, then accept exactly one owner-originated customer work and no retry/manual wake/duplicate submission.

Paperclip's existing governed activity proves MCP `structuredContent.error` is retained in the redacted `resultSummary`; therefore ADR 0250's new allowlisted `reason` will be recoverable after one bounded failure without raw provider payload persistence or a third provider call. The non-canonical branch `feat/adr0251-read-tool-safe-diagnostic-reason-propagation-v1` is not selected as a prerequisite because its diagnostic-loss premise is contradicted by this live evidence; widening Core/Mastra before learning the provider shape is unnecessary.

ADR 0251 is **GREEN / NO EFFECT / HARD ONE-PROVIDER-CALL BUDGET REUSED / OWNER SESSION REQUIRED FOR EXECUTION / NO PROVIDER CALL**.

Next slice: **ADR 0252 — 28PRO VendaERP Product Diagnostic One-Shot V2 Production Execution V1**. Do not install guards until the genuine 28PRO owner browser session is confirmed ready.

## Reconciled checkpoint — ADR 0250 VendaERP safe-subreason MCP promotion COMPLETE / GREEN / NO PROVIDER CALL

ADR 0249 was merged at `main@1a018c024ede186f3c55c061740fb3ca6e1d7abe` with post-merge workflows 4/4 GREEN before effect.

The exact prequalified VendaERP MCP `server.mjs` from source `c697c9c803ac03dfafa52bf730a7e28c6191fda6` was atomically promoted under Paperclip-native Task Drain. Live hash is now `c740d1237374fe065907857465fe63ba6052ddb97096631fdb5ca94f90f9db9b`; source-marker hash is `a24786e3011ca0a28dc3840af50917b4787c857f60db84ef638f69fa812accb6`. No Paperclip restart occurred.

Live mounted-byte validation passed MCP initialize/tools-list (8 read-only tools) and synthetic in-memory proofs for `product-list-shape` and `product-name-missing`. A connection drop after file replacement was reconciled by readback before any repeat.

Protected/final state remained: Core/Paperclip healthy/restart 0. Task Drain was explicitly ended through the native Paperclip API; the first stop returned `wasActive=true`, and a second idempotent stop returned `wasActive=false` while confirming the final OFF/quiescent state. Ana remained idle, work=1 completed, unfinished=0, outbound=0, and VendaERP activity stayed byte-identical at 70 events / SHA-256 `e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b`. No provider/model call, migration, template/Connection/grant/install/profile/catalog/secret mutation occurred.

ADR 0250 is **COMPLETE / GREEN / MCP FILE PROMOTION EXECUTED / NO PROVIDER CALL**.

Next real provider read, if executed, must reuse the Paperclip-native hard one-call budget and genuine owner-originated canonical customer-work path; it must not be retried.

## Reconciled checkpoint — ADR 0249 VendaERP safe-subreason MCP promotion preflight GREEN / NO PROVIDER CALL

ADR 0248 is merged at `main@c697c9c803ac03dfafa52bf730a7e28c6191fda6`; post-merge push workflows are 6/6 GREEN. Production remains unchanged: Core `46741f8d...` healthy/restart 0, Paperclip `v2026.916.0` healthy/restart 0, Task Drain OFF/quiescent, Ana idle, work=1 completed, unfinished=0, outbound=0, and VendaERP activity remains exactly 70 events with SHA-256 `e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b`.

The exact merged deployable MCP artifact is `server.mjs` from `main@c697c9c...`: Git blob `8dae8f49611988a021d903fc9e01d77330805675`, SHA-256 `c740d1237374fe065907857465fe63ba6052ddb97096631fdb5ca94f90f9db9b`. The current live rollback remains frozen at SHA-256 `6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f`.

Pinned Paperclip proves `local_stdio` spawns the mounted template command per invocation. The active template still points to `/opt/wandora/integrations/vendaerp-readonly-mcp/server.mjs`; the host directory is operator-writable and bind-mounted read-only into Paperclip. Therefore the qualified promotion is an atomic file+source-marker replacement under native Task Drain, with no Paperclip restart and no template/Connection/grant/install/profile/catalog/secret mutation.

The exact candidate passed `--network none` MCP initialize/tools-list (8/8 read-only) and synthetic `product-list-shape` / `product-name-missing` proofs. No provider/model call or production mutation occurred.

ADR 0249 is **GREEN / NO EFFECT / GO FOR SEPARATE MCP FILE PROMOTION / NO PROVIDER CALL**.

Next slice: **ADR 0250 — VendaERP Product Safe Subreason MCP Production Promotion Execution V1 — NO PROVIDER CALL**.

## Reconciled checkpoint — ADR 0248 safe product-response subreason observability CODE COMPLETE / NO PROVIDER CALL

ADR 0247 is merged at `main@9264dcffdb340d434e754760702615d2111bafe2` and production remains on Core `organization-adapter-candidate-46741f8d82d0` / revision `46741f8d82d041b3f3cdde3d209c923e630db968`, healthy/restart 0 with healthz/readyz 200/200. Task Drain is OFF/quiescent; Ana is idle; work=1 completed, unfinished=0, outbound=0; VendaERP activity remains exactly 70 events with SHA-256 `e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b`.

The remaining business ambiguity is provider-side `invalid-provider-response`: existing evidence cannot distinguish an invalid product-list shape from a product missing required `nome`. ADR 0248 corrects only the replaceable VendaERP MCP adapter to attach an allowlisted structured `reason`: `product-list-shape` or `product-name-missing`. Arbitrary reasons are discarded. The existing text MCP error shape remains unchanged; the reason is limited to `structuredContent.error` and the safe stderr event. No raw provider payload, product data, URL, arguments or credentials are retained.

Validation is synthetic/no-network: `npm run verify` = 12/12 GREEN + static verifier GREEN. The production MCP bytes remain unchanged at SHA-256 `6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f`; no provider/model call or production mutation occurred.

ADR 0248 is **CODE COMPLETE / NO EFFECT / NO PROVIDER CALL / CI REQUIRED**.

Next slice after merge: **VendaERP Product Safe Subreason MCP Promotion Preflight V1 — NO PROVIDER CALL**. A second real VendaERP read remains prohibited until promotion and post-promotion re-attestation complete.

## Reconciled checkpoint — ADR 0247 post-promotion re-attestation GREEN / NO PROVIDER CALL

ADR 0246 is live: Core `organization-adapter-candidate-46741f8d82d0` / revision `46741f8d82d041b3f3cdde3d209c923e630db968`, healthy/restart 0, healthz/readyz 200/200. Paperclip remains the same container/image; Task Drain is OFF/quiescent; Ana is idle.

The live compiled `/app/dist/paperclip-execution/tool-gateway-read-bridge.js` contains the real-envelope guard and MCP semantic-error check. Synthetic in-memory re-attestation executed against those live bytes proved: completed envelope + inner MCP `isError=true` => `tool-failed`; identical repeated parameters collapse to one synthetic Tool Gateway call; non-completed envelope fails closed; valid completed envelope returns inner data. No network/provider/model call was used.

Final no-effect readback remains: work=1 completed, unfinished=0, outbound=0, temporary guards/counters=0, VendaERP activity=70 events with SHA-256 `e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b`.

ADR 0247 is **GREEN / NO EFFECT / LIVE FAILURE SEMANTICS PROVEN / NO PROVIDER CALL**.

Next slice: **VendaERP Product Invalid-Provider-Response Safe Subreason Observability V1 — NO PROVIDER CALL**. A second real provider read remains prohibited until the current `invalid-provider-response` ambiguity can be distinguished safely without raw provider payload persistence.

## Reconciled checkpoint — ADR 0246 Core promotion COMPLETE / GREEN / NO PROVIDER CALL

ADR 0245 was merged at `main@be85e5f4409a5f90134c148ef0ee550af7401416`; post-merge workflows were 4/4 GREEN and open PRs were 0 before effect.

The exact prequalified Core artifact `organization-adapter-candidate-46741f8d82d0` was loaded and promoted under Paperclip-native Task Drain. Only the `core` service was force-recreated with `--no-deps` using the exact live twelve-file Compose project and existing secret paths/GID. Core transitioned once from container `92f83c...` to `72b05d...`.

Production Core is now `wandora/core:organization-adapter-candidate-46741f8d82d0`, image id `sha256:789efb36999246b62c7b7a95211903d3a74504471c1cde9d0f4aa4c11deb4cc4`, revision `46741f8d82d041b3f3cdde3d209c923e630db968`, healthy/restart 0 with healthz/readyz 200/200. Paperclip retained the exact same container/image and remains healthy/restart 0; `wandora_mastra@0.5.0` and VendaERP MCP bytes are unchanged.

Protected validation proved Task Drain active/quiescent, Ana idle, work=1 completed, unfinished=0, outbound=0, VendaERP activity byte-identical at 70 events / SHA-256 `e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b`, and zero maintenance-window provider/model markers. No provider/model call or migration occurred.

Task Drain was explicitly ended through the native Paperclip API and returned `wasActive=true`; final state is OFF/quiescent with activeRuns=0/pendingWakes=0. Rollback was not needed.

ADR 0246 is **COMPLETE / GREEN / CORE-ONLY PRODUCTION PROMOTION EXECUTED / NO PROVIDER CALL**.

Next slice: **ADR 0247 — Tool Gateway Real Envelope Read-Error Post-Promotion Re-Attestation V1 — NO PROVIDER CALL**.

## Reconciled checkpoint — ADR 0245 Core promotion preflight GREEN / NO PROVIDER CALL

ADR 0244 correction is merged and post-merge CI-green. Current main at preflight is `d1dcc517fe2eaeb34d77d010e4a0045aff85f10a`; the executable Core candidate remains exactly `46741f8d82d041b3f3cdde3d209c923e630db968`, with no executable delta from that candidate to current main.

Post-merge Core Candidate Artifact `10794878077` was independently downloaded to the VPS. GitHub ZIP digest and VPS SHA-256 match exactly at `ffa055b1cbf7c8cbd0b9b545cf1b6329bc3984494ce82b19d0f2b550f85c9e70`. The inner archive passed `SHA256SUMS`; candidate manifest/source tree/image identities are exact. Candidate image remains absent from the Docker daemon.

The live twelve-file Core Compose project was rendered with current and candidate image tags using the same existing secret paths/GID. Structural diff is exactly one path, `/services/core/image`; non-image hashes are identical at `941a21aecf07932b804a4285bb7e1fcd08a396a6682fd5aa378e892b1461c8e3`. Rollback image `organization-adapter-candidate-4a54b5d8f14c` is local.

Runtime remains no-effect: Core/Paperclip healthy/restart 0, Core healthz/readyz 200/200, Task Drain OFF/quiescent, Ana idle, work=1 completed, unfinished=0, outbound=0, temporary guards=0, VendaERP activity remains 70 events with SHA-256 `e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b`, and VendaERP MCP hash remains unchanged. No model/provider call occurred.

ADR 0245 is **GREEN / NO EFFECT / GO FOR SEPARATE CORE-ONLY PRODUCTION PROMOTION / NO PROVIDER CALL**.

Next slice: **ADR 0246 — Tool Gateway Real Envelope Read-Error Core Production Promotion Execution V1 — NO PROVIDER CALL**.

## Reconciled checkpoint — ADR 0244 correction merged / post-merge CI GREEN

PR #317 was squash-merged at `main@46741f8d82d041b3f3cdde3d209c923e630db968` from exact head `12c251dfd8888f606bbb1426e1266597f1eea94c`. PR checks closed 9/9 GREEN and the post-merge push workflows closed 7/7 GREEN: Core CI, Core Candidate Artifact, Messaging Gateway CI, Paperclip Mastra Adapter CI, Paperclip OpenAPI Compatibility, Platform Admin CI and Web CI.

ADR 0244's production evidence is unchanged: the authenticated 28PRO owner created exactly one canonical work `17eb846e...`; Paperclip created issue `PRO-14` and exactly one assignment run `6f928fe8...`; the native rate-limit counter was captured at `limit=1 / remaining=0`; VendaERP activity moved exactly `68 -> 70` for the single bounded `vendaerp_search_products {"pageSize":5,"skip":0}` attempt; no retry/successor/manual wake/outbound occurred. The provider returned safe code `invalid-provider-response`, so the business read failed safe and no product data was trusted.

The Wandora-owned Tool Gateway read bridge correction is now merged and CI-green. It unwraps the real Paperclip execution envelope before applying the existing MCP semantic-error check, without changing Paperclip, adding retry/lifecycle state, or duplicating provider capability.

Production remains intentionally unchanged after the merge: Paperclip `v2026.916.0` is healthy/restart 0 and Core remains `organization-adapter-candidate-4a54b5d8f14c` / revision `4a54b5d8f14c469989fad277189f6ebdfb8fb1f0`, healthy/restart 0. No second VendaERP/provider call occurred.

Next slice: **Tool Gateway Real Envelope Read-Error Core Promotion Preflight V1 — NO PROVIDER CALL**. Do not perform another real VendaERP read until the merged Core correction is separately promoted and re-attested.

## Reconciled checkpoint — ADR 0244 one-shot safety GREEN / business read failed safe / real-envelope correction code complete

A genuine authenticated 28PRO owner submitted exactly one canonical customer work. Work 17eb846e... created Paperclip issue PRO-14 / 27d28163... and exactly one assignment run 6f928fe8.... The native Paperclip rate-limit counter was captured before cleanup at limit=1 / remaining=0; VendaERP activity moved exactly 68 -> 70 with only the expected policy_decision + call_completed for vendaerp_search_products {"pageSize":5,"skip":0}. No retry/successor/manual wake/outbound occurred.

The provider returned MCP isError=true with safe code invalid-provider-response, so no product data was trusted. The execution exposed a real contract gap: Paperclip correctly returns /api/tool-gateway/tools/call as an execution envelope {invocationId,status,tool,result}, while Core's bridge tested the MCP semantic error at the top level. ADR 0241's fixture had mocked the inner result directly, so the real envelope allowed error text to become a successful model summary.

The Wandora-owned bridge is corrected code-only to unwrap a real completed execution envelope before applying the existing data.isError / MCP error check, while preserving legacy direct-result compatibility and per-run identical-call dedupe. Focused bridge tests are 6/6 GREEN; focused Mastra/handler tests are GREEN; Core typecheck/build are GREEN. Local DB integration tests could not initialize because the fresh clone lacked Supabase tenant routing context (ENOIDENTIFIER); GitHub Core CI remains required.

Temporary Paperclip policies were removed after evidence capture; their rate counter cascaded away. Final live state: Task Drain OFF/quiescent, Ana idle, temporary guards/counters 0, VendaERP activity 70 with SHA-256 e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b, 28PRO work exactly 1 and outbound 0. No second provider call was made.

ADR 0244 is **EXECUTION SAFETY GREEN / BUSINESS READ FAILED SAFE / CODE CORRECTION COMPLETE / NO SECOND PROVIDER CALL**.

Next: merge the Core correction only after CI, then perform a separate **Tool Gateway Real Envelope Read-Error Core Promotion Preflight V1 — NO PROVIDER CALL**.
## Reconciled checkpoint — ADR 0243 one-shot product-read execution SAFE STOP on owner-session gate

ADR 0242 is merged at `main@3e8fcacd2e1a68fbf0a1e7cf75cffe798f3069fe`; open PRs were 0 and the exact post-merge workflows were 4/4 GREEN before ADR 0243 entry. The execution slice reconciled repository/runtime first and did not repeat ADR 0242 proofs.

Production readback remained unchanged: Paperclip `v2026.916.0` and Core `organization-adapter-candidate-4a54b5d8f14c` are healthy/restart 0; Ana `428b6730...` is `idle / wandora_mastra`; Task Drain is OFF with activeRuns=0, pendingWakes=0 and quiescent=true; no temporary block/rate-limit policy exists; `vendaerp_search_products` remains active/risk=read; VendaERP activity remains 68 events with SHA-256 `47de715854412222801f1f03c89b27d28ab64d0c2a5e824e04453539900e0c36`; 28PRO work/outbound remained `0/0`. An unauthenticated call to the canonical work endpoint returned 401 and created no work.

Second adversarial review found a mandatory pre-effect identity boundary: canonical customer work creation derives `actorUserId` from a genuine human session via `getSessionContext(Authorization)`. Existing accepted ADRs explicitly reject admin/service-role impersonation, minted/extracted owner JWTs, direct SQL work creation and direct Organization Adapter invocation for real customer work. This execution channel had no genuine 28PRO owner browser session available.

Therefore no Task Drain or temporary policy was installed: installing them without a ready owner session would leave temporary control-plane state active while the canonical work could not be submitted immediately after drain release. No VendaERP/provider call, production model call, customer work, Paperclip issue/run, migration, outbound effect or runtime mutation occurred.

ADR 0243 is **SAFE STOP / OWNER SESSION REQUIRED / NO PROVIDER CALL / NO PRODUCTION MUTATION**.

Next execution must be coordinated with a genuine authenticated 28PRO owner session already ready at the normal Wandora customer-work surface. Only then follow ADR 0242's frozen order: Task Drain -> install/dry-run block + rate_limit=1 -> prove zero consumption/quiescence -> release Task Drain -> owner submits exactly one canonical work -> one-shot read -> capture counter/activity -> cleanup temporary policies -> STOP.

## Reconciled checkpoint — ADR 0242 hard one-call provider budget GREEN

ADR 0241 is merged at `main@9571e4e98fcd0dec01dc93faa842aafcf008eadc`; open PRs were 0 and post-merge workflows were 4/4 GREEN at ADR 0242 entry. Production remains unchanged: Ana `428b6730...` is `idle` on `wandora_mastra`; Task Drain is OFF/quiescent with activeRuns=0/pendingWakes=0; 28PRO work/outbound remain `0/0`; VendaERP activity remains 68 events with unchanged SHA-256 `47de715854412222801f1f03c89b27d28ab64d0c2a5e824e04453539900e0c36`; no temporary live block/rate policy exists.

Pinned Paperclip `dffc2b3c...` proves `tool_rate_limit_counters` is authoritative and atomically consumes the final slot. Focused upstream tests for final-slot atomicity, persisted run/issue integrity, connected-MCP rate limiting and Task Drain start/stop are GREEN. The live-equivalent VendaERP MCP product-read test also proves one `searchProducts` invocation performs exactly one provider `fetch` and the implementation has no automatic retry. Disposable proofs captured the real counter before cleanup (`limit=1`, `remaining=0`, second decision `rate_limited`, count=1) and proved cleanup cascades the counter.

Second adversarial review corrected the old ADR 0231 issue-profile plan: Ana's live gateway is `gateway_only` and gateway profile precedence beats issue profile precedence. The qualified guard instead uses Paperclip-native policies that evaluate before profile allowance: a temporary agent+VendaERP `block` policy for the seven non-product reads plus an agent+product `rate_limit=1`. A disposable permissive gateway proof confirmed the block wins over the gateway profile and the product gets exactly one atomic slot.

Task Drain cannot stay active through canonical work creation because Paperclip scheduling suppression makes `requestWakeup` return no run, which would fail the Organization Adapter dispatch. Frozen execution order is therefore: Task Drain ON/quiescent -> install and dry-run both policies with zero rate consumption -> Task Drain OFF -> immediately create exactly one canonical Wandora customer work -> no manual retry/wake -> capture counter/activity before policy cleanup -> delete only temporary policies, never the canonical work/issue.

ADR 0242 is **GREEN / HARD ONE-CALL BUDGET QUALIFIED / NO PROVIDER CALL**. A real provider read is eligible only in the next separate bounded read-only execution slice.

Next slice: **28PRO VendaERP Canonical Customer-Work One-Shot Product Read Execution V1 — READ ONLY**.

## Reconciled checkpoint — ADR 0241 post-promotion read-tool failure semantics GREEN

ADR 0240 is merged at `main@f19715f2a90a3ea36c0194b33cbe02d11f353ac0`; post-merge workflows are 4/4 GREEN. Production remains exactly one loaded/enabled `wandora_mastra@0.5.0` on healthy/restart-0 Paperclip `v2026.916.0`; Core remains `organization-adapter-candidate-4a54b5d8f14c` / revision `4a54b5d8f14c469989fad277189f6ebdfb8fb1f0`, healthy/restart 0.

The four adapter files in exact current main are byte-identical to the four live package files. Node 24 adapter contracts are 9/9 GREEN; pinned Paperclip loader proof is GREEN; focused Core failure-propagation tests are 13/13 GREEN, including the model/tool latch that prevents read-tool failure from becoming textual success. Disposable pinned-Paperclip E2E using those live-equivalent bytes proves both success and failure converge to exactly one run / zero continuations; the failure case is `run=failed`, `issue=blocked`, with a real self-owned `unblockDescriptor`. The disposable Core/Organization Adapter verifier is 34/34 GREEN, including `execution_uncertain` rejecting both same-run replay and successor runs before another execution and read-tool failure never recording durable success.

Final production readback remains adapter `0.5.0` loaded/enabled + test-environment PASS, Task Drain OFF with activeRuns=0/pendingWakes=0/quiescent=true, 28PRO work/outbound `0/0`, VendaERP Connection activity byte-identical at SHA-256 `47de715854412222801f1f03c89b27d28ab64d0c2a5e824e04453539900e0c36`, and VendaERP MCP hashes unchanged (`server.mjs=6f27914c...`, source marker=`5635e6b4...`). No provider/model call or outbound occurred.

ADR 0241 is **GREEN / POST-PROMOTION FAILURE SEMANTICS RE-ATTESTED / NO PROVIDER CALL**. The ADR 0232 lifecycle/read-tool semantic counterexample is resolved for canonical customer work, but a real provider read remains NO-GO because the hard one-provider-call Tool Gateway budget still requires a separate no-provider proof with authoritative limiter/counter evidence before cleanup.

Next slice: **ADR 0242 — VendaERP Customer-Work One-Shot Hard Provider-Call Budget Preflight V1 — NO PROVIDER CALL**.

## Reconciled checkpoint — ADR 0240 wandora_mastra@0.5.0 production promotion COMPLETE

ADR 0239 is merged at `main@9c8ebb0d543fc773dc812cd63baccc7295de735f`; post-merge workflows closed 4/4 GREEN before effect. ADR 0240 then promoted only the Paperclip external adapter under native Task Drain, with no provider/model call.

Production now runs exactly one loaded/enabled `wandora_mastra@0.5.0` from retained content-addressed path `64795ff7.../package`. Paperclip was recreated exactly once on the unchanged `wandora/paperclip:v2026.916.0` image and is healthy/restart 0 as container `4b187dc5...`. Core remains unchanged at `wandora/core:organization-adapter-candidate-4a54b5d8f14c` / revision `4a54b5d8f14c469989fad277189f6ebdfb8fb1f0`, healthy/restart 0.

The install was dispatched exactly once and returned `version=0.5.0`, exact candidate path and `requiresRestart=true`. Pre-restart readback proved `0.5.0` loaded + test-environment PASS while Task Drain remained active/quiescent. Restart cleared Task Drain by design; post-restart readback proves `draining=false`, `activeRuns=0`, `pendingWakes=0`, `quiescent=true`, adapter `0.5.0` loaded/enabled and test-environment PASS.

The new registry SHA-256 is `bd7665892541f787b9062ca4124fc3bfb9454458007e9c5742c4ba36b4e38169`; the qualified 0.5.0 package files remain exact and the old 0.4.0 rollback path remains retained. 28PRO work operations/outbound attempts remain `0/0`. VendaERP Connection activity remains byte-identical at SHA-256 `47de715854412222801f1f03c89b27d28ab64d0c2a5e824e04453539900e0c36`; maintenance-window log scans found no Core/Mastra/VendaERP execution marker. No migration, Core/MCP/Connection/grant/secret/profile/catalog mutation or outbound effect occurred.

ADR 0240 is **COMPLETE / GREEN / NO PROVIDER CALL**. Another real VendaERP/provider read remains NO-GO.

Next slice: **ADR 0241 — wandora_mastra@0.5.0 Post-Promotion Read-Tool Failure Disposition Semantics Preflight V1 — NO PROVIDER CALL**.

## Reconciled checkpoint — ADR 0239 wandora_mastra@0.5.0 promotion preflight GREEN

ADR 0238 is merged at main@9f40ccfd3469d9e8c465155ddd95f85c76b45348; post-merge workflows are 6/6 GREEN and open PRs were 0 at preflight. Production remains unchanged: Core organization-adapter-candidate-4a54b5d8f14c / revision 4a54b5d8f14c469989fad277189f6ebdfb8fb1f0 healthy/restart 0; Paperclip v2026.916.0 is the same healthy container/restart 0; live wandora_mastra@0.4.0 is loaded/enabled from retained package 6390812d... and official test-environment PASS.

The exact post-merge adapter artifact is GitHub artifact 10788382398, provenance-pinned to main@9f40ccf..., with wandora-paperclip-adapter-mastra-0.5.0.tgz SHA-256 64795ff7d2c519ef6303ab0944bac02d27aadf8b919860b832c2e6fac4defb62. Independent VPS npm pack reproduced the same hash. The live 0.4.0 registry/package was frozen under /home/wandora-admin/preflights/adr0239-read-tool-failure-disposition-promotion-v1/rollback-0.4.0; registry SHA-256 is 45e0ca8d1ba002754a56de189ac1586cac99378a782a674bce36093290877a17. Candidate persistent target remains absent.

Task Drain remains OFF with activeRuns=0, pendingWakes=0, quiescent=true. 28PRO work operations/outbound attempts remain 0/0. VendaERP Connection activity response hash remains exactly 47de715854412222801f1f03c89b27d28ab64d0c2a5e824e04453539900e0c36, proving zero activity delta. No provider/model call occurred.

Second adversarial review adds a mandatory rollback guard: install changes the adapter in-memory while the first Task Drain is active, and Paperclip restart clears that drain. Any rollback required after restart must establish a new native Task Drain before restoring 0.4.0.

ADR 0239 is GREEN / GO for a separate adapter-only production promotion execution, NO PROVIDER CALL. Another real VendaERP/provider read remains NO-GO.

Next slice: ADR 0240 — wandora_mastra@0.5.0 Read-Tool Failure Disposition Production Promotion Execution V1 — NO PROVIDER CALL.

## Reconciled checkpoint — ADR 0238 customer-work read-tool failure native disposition CODE COMPLETE

ADR 0237's strict one-shot gap is corrected in code without duplicating Paperclip lifecycle. Candidate `wandora_mastra@0.5.0` recognizes only canonical customer work plus exact Core `422 read-tool-failed`, moves the exact Paperclip issue to native `blocked` with a run-scoped self-owned `unblockDescriptor`, then still fails the adapter run. Generic/non-work failures preserve existing behavior; ambiguous blocking is read back before any repeat mutation.

Pinned Paperclip `dffc2b3c...` source proves `blocked` is a valid provider-native disposition. Disposable E2E proves the failure run remains `failed`, the issue becomes `blocked`, run count stays exactly 1 and `issue_continuation_needed` successors remain 0 beyond the scheduler floor. Adapter tests = 9/9 GREEN; loader contract = GREEN; ADR 0237's unchanged Core DB-backed work safety remains 34/34 GREEN. Deterministic candidate package SHA-256 = `64795ff7d2c519ef6303ab0944bac02d27aadf8b919860b832c2e6fac4defb62`.

No VendaERP/model call, production mutation, migration, Paperclip fork, new lifecycle/retry state or outbound effect occurred. Production still runs `wandora_mastra@0.4.0`, so another real provider read remains prohibited.

Next slice: **ADR 0239 — Paperclip Customer-Work Read-Tool Failure Terminal Disposition Mapping Production Promotion Preflight V1 — NO PROVIDER CALL**.

## Reconciled checkpoint — ADR 0237 post-promotion failure semantics GREEN / provider read NO-GO

ADR 0234 failure propagation is live and re-attested without provider/model calls. The live Core remains `wandora/core:organization-adapter-candidate-4a54b5d8f14c` / revision `4a54b5d8f14c469989fad277189f6ebdfb8fb1f0`, healthy/restart 0 with healthz/readyz 200. Paperclip remains the same healthy `v2026.916.0` container and the VendaERP MCP hash is unchanged.

Focused failure tests are 13/13 GREEN. The disposable DB-backed verifier is 34/34 GREEN, including a new test-only regression proving that `execution_uncertain` customer work rejects both same-run replay and a different successor run before Tool Gateway/Mastra. 28PRO remains one Ana `active + supervised`, work operations `0`, outbound attempts `0`.

Second adversarial review found the remaining strict one-shot gap: `wandora_mastra@0.4.0` converts Core `422 read-tool-failed` into a generic thrown adapter failure, and pinned Paperclip classifies `adapter_failed` as transient continuation infrastructure with bounded automatic retries. Those successors are now blocked by Wandora before model/tool/provider execution, but their creation is still possible; therefore another real provider read is **NO-GO**.

Next slice: **Paperclip Customer-Work Read-Tool Failure Terminal Disposition Mapping V1 — CODE ONLY / NO PROVIDER CALL**. Reuse Paperclip-native lifecycle/disposition; do not create Wandora retry/lifecycle state.

## Reconciled checkpoint — ADR 0236 ADR 0234 Core-only production promotion COMPLETE

ADR 0234 read-tool failure propagation is now live in production.

- canonical entry for execution = `main@71346756f01771127a99e25672f220e5d5fa1ccb`; ADR 0235 = GREEN;
- promoted Core = `wandora/core:organization-adapter-candidate-4a54b5d8f14c`, revision `4a54b5d8f14c469989fad277189f6ebdfb8fb1f0`;
- Core = healthy / restart 0 / healthz 200 / readyz 200;
- only Core was recreated through the exact twelve-file live Compose project;
- Paperclip remained the same container/image, healthy/restart 0;
- `wandora_mastra@0.4.0` and VendaERP MCP remained unchanged;
- 28PRO live runs = 0; VendaERP Connection activity remained 0 with identical snapshot hash;
- Wandora work/outbound = 0/0;
- no provider/model call and no migration occurred;
- Paperclip-native Task Drain protected the transition; explicit `DELETE /api/instance/task-drain` returned HTTP 200 with `wasActive=true`, and immediate GET proved `draining=false`, zero active/pending runs and `quiescent=true`.

ADR 0236 records the execution as **COMPLETE / GREEN / NO PROVIDER CALL**.

Another VendaERP/provider read remains prohibited.

Next slice: **ADR 0234 Read Tool Failure Propagation Post-Promotion Failure-Semantics Preflight V1 — NO PROVIDER CALL**.

## Reconciled checkpoint — ADR 0235 ADR 0234 production promotion preflight GREEN

ADR 0234 read-tool failure propagation is merged at main `4a54b5d8f14c469989fad277189f6ebdfb8fb1f0`. The post-merge Core artifact `10783439687` is independently verified and source-addressed to the exact main tree. Live Core remains `fc8721...`, healthy/restart 0; Paperclip/MCP/adapter are unchanged; Task Drain is OFF/quiescent; live runs/work/outbound = 0/0/0; rollback image is locally present.

ADR 0235 authorizes only a separate Core-only production promotion using the same 12-file Compose project under Paperclip-native Task Drain. No provider/model call is authorized.

Next slice: **ADR 0234 Read Tool Failure Propagation Production Promotion Execution V1**.

## Reconciled checkpoint — ADR 0234 read-tool failure propagation CODE COMPLETE

ADR 0233's authority decision is implemented without changing Paperclip lifecycle, Tool Gateway context or `wandora_mastra` success semantics.

- the supervised Mastra runtime latches the first read-tool exception across one execution;
- later model text cannot convert a failed provider/tool read into successful Wandora execution;
- repeated read-tool attempts after the first failure are rejected;
- MCP `isError=true` maps to bounded `tool-failed`;
- Core exposes only safe private HTTP 422 `read-tool-failed`;
- customer-work integration coverage proves read-tool failure marks prepared work uncertain and does not record durable success.

Focused tests = 13/13 GREEN; Core typecheck/build = GREEN. The DB-backed customer-work regression is CI-authoritative.

No provider call, production mutation, Paperclip change, adapter replacement, migration or outbound effect occurred.

Another VendaERP read remains prohibited.

Next slice: **ADR 0234 Read Tool Failure Propagation Promotion Preflight V1 — NO PROVIDER CALL**.

## Reconciled checkpoint — ADR 0233 read-tool terminal semantics authority GREEN

ADR 0232's failed-safe execution remains the live truth, but its post-cleanup conclusion that the issue-scoped rate-limit was proven not to participate is superseded. Pinned Paperclip resolves Tool Gateway issue context from the persisted run, deleted issue foreign keys are SET NULL in audit rows, and a non-blocking rate-limit may continue to a final allow_profile decision without appearing in matchedPolicyIds/rateLimitState.

The proven semantic gap is Wandora-owned: MCP isError was rejected by the read bridge, Mastra absorbed the tool exception and returned a model summary, Core accepted that as success, and Paperclip therefore saw a succeeded run with the issue still in_progress. Paperclip then correctly invoked productive-terminal continuation recovery.

Paperclip already owns lifecycle/disposition. Wandora already reuses status=done for existing customer work through wandora_mastra@0.4.0. No new lifecycle or Tool Gateway subsystem is authorized.

Next slice: **Wandora Read Tool Failure Propagation V1 — CODE ONLY / NO PROVIDER CALL**. Another VendaERP read remains prohibited.

## Reconciled checkpoint — ADR 0232 V3 one-shot live proof FAILED SAFELY

ADR 0232 supersedes ADR 0231 only where ADR 0231 authorized the V3 provider-read execution. The live PRO-10 proof disproved two safety assumptions:

- one human `issue_commented` source run was followed automatically by `issue_continuation_needed`, then by `finish_successful_run_handoff`;
- the real Tool Gateway call persisted `issueId=null`, `matchedPolicyIds=[]` and `rateLimitState=null`, so the issue-scoped `rate_limit=1` policy did not match or consume a slot.

Exactly one real `vendaerp_search_products {"pageSize":5,"skip":0}` Tool Gateway attempt is evidenced, and it returned MCP `isError=true` with safe code `invalid-provider-response`. Product-like text produced by successor runs had no Tool Gateway/provider evidence and is untrusted.

PRO-10 was fully cleaned. The concurrent PRO-12 proof owner also cleaned its own issue/profile/policy/binding. Final live state: no V3 residual issue/profile/policy, live runs 0, Task Drain OFF/quiescent, Core/Paperclip healthy, work/outbound 0/0.

No further VendaERP provider read is authorized.

Next slice: **Paperclip One-Shot Lifecycle + Tool Gateway Run-Context Authority Review V1 — CODE/SOURCE ONLY / NO PROVIDER CALL**.

## Reconciled checkpoint — ADR 0231 one-shot replay + provider budget GREEN

ADR 0230's NO-GO conclusion is superseded after two additional adversarial reviews of pinned Paperclip and a live no-provider control-plane proof.

- successful `issue_commented` runs remain excluded from `finish_successful_run_handoff`;
- historical PRO-8 `wandora_mastra` runs are confirmed `runtimeMode=legacy`;
- a failed post-adapter-entry legacy run lacks positive `providerWorkStarted=false` evidence, so `legacyExecutionNeedsReconciliation()` holds it before generic recovery;
- Paperclip issue/tool-scoped `rate_limit=1` additionally enforces a hard one-product-call budget inside the run;
- live PRO-9 proof: assigned backlog created 0 runs, issue profile produced 1 allow / 7 deny, first rate slot allowed, second decision rate_limited;
- cleanup complete: PRO-9/profile/policy absent, connection activity 0, live runs 0, Task Drain OFF/quiescent, work/outbound 0/0;
- no model or VendaERP/provider call occurred.

ADR 0231 authorizes only a separate **28PRO VendaERP Comment-Driven One-Shot Product Read Execution V3 — READ ONLY**. No code/runtime promotion is required first.

## Reconciled checkpoint — ADR 0230 comment-driven one-shot preflight NO-GO

The Paperclip comment-driven path is proven to exclude `finish_successful_run_handoff`, but a failed Wandora bridge run currently becomes Paperclip `adapter_failed`, which is classified as transient infrastructure and may create an automatic `issue_continuation_needed` successor. Therefore one-shot behavior is not yet proven.

No issue/comment/run/profile/Tool Gateway/provider/model/work/outbound or production mutation occurred. Another VendaERP read remains prohibited.

Next slice: **Wandora Bridge Non-Retryable Tool Failure Mapping V1 — CODE ONLY / NO PROVIDER CALL**.

## Reconciled checkpoint — ADR 0229 tool-error runtime promotion COMPLETE

ADR 0227/0228 production promotion is complete and GREEN.

- entry main = `40c233374fc0fad213beeda816a889ade8257ddf`; PR #298 merged;
- Core live = `wandora/core:organization-adapter-candidate-fc8721ccaedd` / revision `fc8721ccaedd5079eec9f3be11e8b64051416579`, healthy/restart 0;
- VendaERP MCP live `server.mjs` = `6f27914c887e5ada8330f9eeb836f33b3626ad9c667d3c22dda77ddc55da683f`;
- Paperclip remains the same `wandora/paperclip:v2026.916.0` container, healthy/restart 0;
- `wandora_mastra@0.4.0` remains loaded from retained package `6390812d...`;
- Paperclip-native Task Drain protected the transition and is now OFF/quiescent;
- 28PRO live runs = 0; work operations = 0; outbound attempts = 0;
- no VendaERP provider call, model run, customer work, Paperclip restart, adapter replacement, migration or control-plane Connection/grant/secret/install/profile/catalog mutation occurred.

ADR 0229 records rollback evidence and the exact execution. Another provider retry remains prohibited.

Next slice: **Paperclip Comment-Driven One-Shot Product Read Preflight V1 — NO PROVIDER CALL**.

## Reconciled checkpoint — ADR 0228 ADR 0227 Core + VendaERP MCP promotion preflight GREEN

ADR 0227 promotion is qualified with **NO PRODUCTION EFFECT**.

- canonical entry: `main@9b211486aaea640c3ff7a81a5f5e1171da225bdb`, PR #297 merged, open PRs=0;
- PR #297 exact head = 9/9 GREEN; squash-main push workflows observed = 8/8 GREEN;
- Core live remains `wandora/core:organization-adapter-candidate-da4289034575` / source `da428903...`, healthy/restart 0;
- Paperclip remains `wandora/paperclip:v2026.916.0`, healthy/restart 0;
- `wandora_mastra@0.4.0` remains loaded from retained package `6390812d...`;
- VendaERP MCP live remains `067e7f98...`; candidate is `6f27914c...`;
- Task Drain is off/quiescent, 28PRO live runs=0, PRO-8/profile residue=0;
- 28PRO work/outbound remain 0/0;
- Core artifact `10779549706` / image `...-fc8721ccaedd` is source-equivalent to merged main and changes only the Core image in the full Compose gate;
- MCP candidate remains exactly eight read-only tools; MCP 10/10 + static verifier GREEN;
- Core bridge focused tests 5/5 + typecheck/build GREEN;
- no provider call, model run, issue/profile, migration, restart or production mutation occurred.

ADR 0228 authorizes only a **separate Core + MCP Tool Error Semantics Promotion Execution V1** using Paperclip-native Task Drain, atomic stack-local MCP replacement and Core-only recreation. Paperclip, `wandora_mastra`, Connection/grant/secret/install/profile/catalog state remain unchanged. No VendaERP retry is authorized.

After promotion, a separate **Paperclip Comment-Driven One-Shot Product Read Preflight V1 — NO PROVIDER CALL** is still required before any bounded read can be considered.

## Reconciled checkpoint — ADR 0227 product retry V2 NOT GREEN

The ADR 0226 bounded product retry executed with a Paperclip-native issue profile exposing only `vendaerp_search_products`. Native policy-test was 1 allow / 7 deny.

The first run `6c043d53...` made exactly one `vendaerp_search_products {"pageSize":5,"skip":0}` call and failed as `local_stdio_protocol_error`. Paperclip then created one provider-owned `finish_successful_run_handoff` corrective run `2da8c2cd...`, which made the same call once more and failed identically. No manual second wake occurred.

The issue/profile were removed; work/outbound remain 0/0; Core/Paperclip remain healthy. No further provider retry is authorized.

Pinned Paperclip proves two reusable primitives: comment-driven wakes are excluded from successful-run handoff, and MCP `tools/call` supports `result.isError=true`. ADR 0227 therefore qualifies a code-only correction: VendaERP execution failures use MCP tool-error result semantics, and the Core read bridge fails closed on `data.isError=true`. No Paperclip fork, retry engine or new Wandora state is added.

## Reconciled checkpoint — ADR 0226 VendaERP product retry preflight V2 GREEN

Paperclip-native issue-scoped narrowing is production-proven without a provider call.

A temporary unassigned Paperclip issue (`PRO-5`) and temporary `defaultAction=deny` profile were created. The profile contained exactly the `vendaerp_search_products` catalog entry and was bound with `targetType=issue`. Paperclip native policy-test against Ana + that issue returned exactly **1 allow / 7 deny** across the eight VendaERP catalog entries; only product search was allowed.

No run, Tool Gateway invocation, model execution or provider call occurred. Binding/profile/issue were fully removed. Post-cleanup: no residual profile/issue, new heartbeat runs=0, Tool Gateway audit events=0, work=0, outbound=0, Core/Paperclip healthy.

Next slice: **28PRO VendaERP Bounded Product Read Retry Execution V2 — READ ONLY**, using the frozen issue-scoped sequence and exactly `vendaerp_search_products {"pageSize":5,"skip":0}`, with no automatic retry.

## Reconciled checkpoint — ADR 0225 ADR 0224 convergence execution COMPLETE

Production convergence qualified by ADR 0224 is complete and directly revalidated.

- Core = `wandora/core:organization-adapter-candidate-da4289034575` / source `da42890345753ebabf579947f568acd74145089b`, healthy/restart 0.
- Paperclip = `wandora/paperclip:v2026.916.0`, healthy/restart 0.
- `wandora_mastra@0.4.0` = loaded/enabled from retained provider package `6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c`.
- Official `wandora_mastra` test-environment = PASS.
- VendaERP MCP remains `067e7f98912f...`; convergence did not modify it.
- Task Drain = off / activeRuns 0 / pendingWakes 0 / quiescent.
- Wandora work operations = 0; outbound attempts = 0.
- No VendaERP/provider retry occurred.

The canonical execution record intentionally relies on durable final-state/readback evidence rather than transient request counts from concurrent operator sessions.

The live Core + adapter no longer carry the redundant Wandora-owned per-task tool narrowing. Paperclip remains the operational authority for issue-scoped profile binding and Tool Gateway visibility.

Next slice: **28PRO VendaERP Bounded Product Read Retry Preflight V2 — NO PROVIDER CALL**, using a temporary Paperclip issue-scoped deny-by-default profile exposing exactly `vendaerp_search_products`.

## Reconciled checkpoint — ADR 0224 ADR 0223 convergence promotion preflight GREEN

ADR 0223 is merged at `main@e57d3b37c9e0bd01069a4a78b8a50076996e4de9`; its final reviewed head passed 9/9 workflows.

The Core convergence candidate `wandora/core:organization-adapter-candidate-da4289034575` is source-equivalent to merged main and changes exactly `/services/core/image` in the full live Compose render.

The ADR 0223 `wandora_mastra` candidate's operational files are byte-identical to the retained Paperclip package `6390812d...`, so convergence will reuse that provider-owned package rather than staging a duplicate. The current ADR 0221 package `ff93cfa7...` remains available for rollback.

The live VendaERP MCP safe-logging build `067e7f98...` remains accepted and will not change.

Core/Paperclip are healthy/restart 0; work operations and outbound attempts remain 0/0. ADR 0224 is **GREEN / NO EFFECT** and authorizes only a separate convergence promotion. Provider retry remains prohibited.

## Reconciled checkpoint — ADR 0223 Paperclip issue-scoped narrowing reuse

Pinned Paperclip proves native issue-scoped tool-profile narrowing with precedence `gateway > issue > routine > agent > project > company`; ordinary profiles use narrowest-scope wins. ADR 0221's Wandora-owned per-task marker/allowlist is therefore superseded by provider-native authority.

Production reconciliation now proves the full ADR 0221 runtime promotion completed before this architectural correction merged:

- Core = `wandora/core:organization-adapter-candidate-41801d40228f`, healthy/restart 0;
- `wandora_mastra@0.4.0` = candidate package path `ff93cfa7...`, loaded/enabled;
- VendaERP MCP = safe-logging `067e7f98...` build from `main@87bf5d51...`;
- Paperclip = `wandora/paperclip:v2026.916.0`, healthy/restart 0;
- official adapter test-environment = PASS;
- work operations = 0; outbound attempts = 0;
- no provider retry occurred after promotion.

ADR 0223 therefore requires a **Core + Paperclip adapter convergence promotion** after merge/CI: remove the redundant Wandora per-task marker/allowlist from both runtime artifacts, retain the live safe-logging VendaERP MCP, and preserve all Paperclip connection/grant/secret/profile/catalog authority.

Next after convergence: a separate retry preflight using a temporary Paperclip `issue` profile containing exactly `vendaerp_search_products`. No provider retry is authorized by this checkpoint.

## Reconciled checkpoint — ADR 0222 ADR 0221 runtime promotion preflight GREEN

ADR 0221 is merged at `main@87bf5d51a694389900bb81d5efbfcc15a8e12557`; PR #289 exact head passed 9/9 workflows.

Runtime promotion is separately qualified with zero production effect:

- Core candidate `wandora/core:organization-adapter-candidate-41801d40228f`; full 12-overlay render changes only `/services/core/image`;
- Paperclip adapter candidate tgz SHA-256 `ff93cfa7...`, with only `index.mjs` differing from the live 0.4.0 package;
- VendaERP MCP candidate `server.mjs` SHA-256 `067e7f98...`, live rollback hash `3f051655...`;
- Core/adapters/MCP candidate source blobs are identical to merged main;
- Paperclip remains healthy, Ana idle, no live runs, Task Drain currently off but quiescent, adapter test-environment PASS;
- work operations=0 and outbound attempts=0.

ADR 0222 authorizes only a separate promotion using Paperclip Task Drain, image-only Core recreation, stack-local atomic MCP replacement and exactly one official external-adapter replace/restart. It does **not** authorize a VendaERP provider retry.

## Reconciled checkpoint — ADR 0221 per-task read admission + safe provider error observability candidate

The first ADR 0220 bounded product read execution already occurred concurrently as Paperclip issue `PRO-4` and is **NOT GREEN**. The intended `vendaerp_search_products {pageSize:5,skip:0}` call failed with Paperclip `local_stdio_protocol_error`; the model then attempted additional read tools (`probe`, parties and price tables), proving that prompt-only tool restriction is not an authorization boundary. The issue was later cancelled. Wandora work/outbound remained 0/0 and no write/destructive tool was invoked.

ADR 0221 introduces only a Wandora-owned semantic narrowing contract: optional `wandora-read-tools-v1` marker → structured reviewed allowlist → intersection with Paperclip-authorized `risk=read` descriptors by stable `upstreamToolName`. It cannot grant access and creates no durable state or parallel policy engine.

The VendaERP MCP candidate also logs only normalized safe failure metadata (`event/tool/code`) to stderr, never credentials, request arguments or provider payloads. Public VendaERP OpenAPI confirms the current product endpoint/method/headers and expected product fields, but the exact live provider failure cause is still unproven.

No new 28PRO provider call was made during diagnosis or code validation. Local validation: Wandora Paperclip adapter 3/3 GREEN; VendaERP MCP 10/10 GREEN; Core typecheck/build GREEN; focused Core tests 9/9 GREEN.

This is **code candidate / NO EFFECT**. Do not retry the ADR 0220 provider read until merge + exact-head CI + separate runtime promotion/preflight.

## Reconciled checkpoint — ADR 0220 bounded VendaERP business read preflight GREEN

The next production proof is qualified as a low-privacy product-catalog read: `vendaerp_search_products` with exactly `pageSize=5, skip=0`, through the already-proven Paperclip → Wandora → Mastra → Paperclip Tool Gateway path.

Allowed supervised output is limited to provider-neutral product fields: name, code, category, brand, unit, sale price and stock balance when present. Provider/internal IDs, barcode, minimum price, credentials/tokens and customer/order PII are outside this proof. No commercial interpretation may be invented.

ADR 0220 is **NO EFFECT**. Next slice is **28PRO VendaERP Bounded Business-Semantic Read Execution V1 — READ ONLY**.

## Production checkpoint — ADR 0219 28PRO VendaERP E2E read path GREEN

The fixed Core candidate `wandora/core:organization-adapter-candidate-3b39a14f5c23` was promoted Core-only after 9/9 exact-head GREEN qualification, artifact/archive digest verification, source equivalence to merged main, and an image-only full Compose delta. Production Core is healthy with restart count 0.

A fresh synthetic non-customer Paperclip issue `PRO-3` proved the real Paperclip run identity → Wandora Core → Tool Gateway → supervised Mastra → VendaERP local_stdio path. Both runs returned `connected=true`.

ADR 0218's duplicate-collapse fix is production-proven: Paperclip audit shows exactly one `vendaerp_probe` provider call per run, versus five per run before the fix. Paperclip still generated a separate disposition handoff run; that remains Paperclip lifecycle authority and is not internalized into Wandora.

Wandora customer work operations remain 0 and outbound attempts remain 0. No ERP write occurred.

## Reconciled checkpoint — ADR 0218 Mastra duplicate read-call collapse candidate

The real 28PRO end-to-end read path is **functionally proven but not yet final GREEN**.

Synthetic Paperclip issue `PRO-1` traversed Paperclip run identity → Wandora Core → Paperclip Tool Gateway → supervised Mastra → VendaERP `local_stdio` and returned `connected=true`. Paperclip audit, however, showed five identical `vendaerp_probe {}` calls per Mastra run. A Paperclip disposition handoff created a second run, for ten read calls total. All calls were `risk=read`; Wandora customer work/outbound remained outside the proof.

ADR 0218 selects the narrow correction: run-scoped memoization in the existing ADR 0211 bridge, keyed by tool + canonicalized parameters, with failed identical calls also memoized. No durable cache, new subsystem or Paperclip authority is duplicated.

This checkpoint is **code candidate only**. A fixed Core must pass exact-head CI and be promoted separately before the production proof is repeated.

## Reconciled checkpoint — ADR 0217 VendaERP E2E Core bridge promotion preflight GREEN

The bounded 28PRO VendaERP end-to-end proof requires one prerequisite: production Core is still `0a7f3683...`, which predates ADR 0211.

The validated Core Candidate Artifact from workflow run `35859795861`, artifact `10749840984`, image `wandora/core:organization-adapter-candidate-fa64d98c5b87`, has verified artifact/archive digests. All 101 `apps/core/` blobs and all 15 `infra/stacks/core/` blobs are identical to current `main@ff123b508080d1700610488d590e5916f6585aea`.

Full production Compose rendering with current versus candidate image produced exactly one delta: `/services/core/image`. No migration, Web, Paperclip, flag, mount, network or secret change is required.

ADR 0217 is **GREEN / NO EFFECT** and authorizes a separate Core-only promotion before the bounded Wandora → Paperclip Tool Gateway → supervised Mastra → VendaERP read proof.

## Production checkpoint — ADR 0216 28PRO VendaERP read-only activation GREEN

**28PRO VendaERP Read-Only Connection Activation Execution V1 is GREEN.**

Paperclip now owns one active 28PRO `mcp_stdio/local_stdio` VendaERP Connection, one active default organization grant with three required Paperclip secret refs, one Ana-only install, one native default-deny install profile with exactly eight read catalog entries, and three active `local_encrypted` VendaERP secrets. The active approved stdio template is `wandora.vendaerp-readonly-v1-r1`; the original empty-tool template is disabled.

Cross-company agent access was denied with HTTP 403. Ana sees exactly 8/8 allowed tools, all `risk=read`, with no write/destructive entries. One explicit `vendaerp_probe` executed through Paperclip Tool Gateway and returned HTTP 200 / `connected=true`. No retry was performed.

Ana remains Wandora `active + supervised` and Paperclip `idle / wandora_mastra`; work operations remain 0 and outbound attempts remain 0.

No credential plaintext entered Wandora, Git, Mastra or model prompts.

Next safe slice: a separately bounded end-to-end Wandora → Paperclip Tool Gateway → supervised Mastra read-tool proof, still with no customer work, outbound or ERP write.

## Production checkpoint — ADR 0215 VendaERP activation phase 1 GREEN

The first production phase of **28PRO VendaERP Read-Only Connection Activation Execution V1** is GREEN.

Paperclip was recreated on the same `wandora/paperclip:v2026.916.0` image with one new read-only bind mount exposing the exact reviewed VendaERP MCP adapter from the stack-local deployment path. Source/staged/container SHA-256 all equal `3f051655ba01a73a204a7a68ede30e9c49e636916d625c7546787e5c73bd6f92`. Paperclip returned healthy with restart count 0 and live MCP initialize/tools/list returned exactly eight approved read-only tools.

No VendaERP ToolApplication, ToolConnection, stdio template, grant, install, profile, secret or provider call exists yet. Ana remains Paperclip idle and Wandora active+supervised; work/outbound remain 0/0.

Next phase requires secure custody of the owner-provided VendaERP Authorization-Token before any provider probe.

## Reconciled checkpoint — ADR 0214 VendaERP stack-local staging GREEN

ADR 0214 narrows ADR 0213's host staging path after live permission reconciliation. The adapter will be staged under the existing operator-owned Paperclip stack at `/opt/wandora/stacks/paperclip/runtime-integrations/vendaerp-readonly-mcp` and bind-mounted read-only to the unchanged container path `/opt/wandora/integrations/vendaerp-readonly-mcp`.

This avoids privilege escalation, user-home production dependencies and ad-hoc container copying. No production mutation was performed.

Next remains **28PRO VendaERP Read-Only Connection Activation Execution V1**.

## Reconciled checkpoint — ADR 0213 VendaERP runtime mount preflight GREEN

28PRO VendaERP local_stdio Runtime Mount Preflight V1 is **GREEN / NO PRODUCTION EFFECT**.

The second adversarial review found that the live Paperclip container does not currently mount the host path used by the ADR 0212 local_stdio command. The exact merged adapter was therefore validated in an ephemeral `wandora/paperclip:v2026.916.0` container with a read-only bind mount, no credentials and `--network none`. MCP initialize + tools/list returned exactly the eight approved read-only tools.

Activation must now begin by staging the exact reviewed adapter, adding the read-only bind mount, recreating/health-checking Paperclip, and proving local MCP discovery before any VendaERP ToolConnection/grant/secret is created.

No production mutation was performed by ADR 0213.

Next slice remains **28PRO VendaERP Read-Only Connection Activation Execution V1**.

## Reconciled checkpoint — ADR 0212 28PRO VendaERP activation preflight GREEN

28PRO VendaERP Read-Only Connection Activation Preflight V1 is **GREEN / NO PRODUCTION EFFECT**.

Verified live entry:

```text
main = 798317e80ebabae407235d2ff1ffaacaa64177a2
Paperclip = wandora/paperclip:v2026.916.0 / healthy / restart 0
28PRO ToolApplications = 0
28PRO ToolConnections = 0
28PRO custom VendaERP stdio template = absent
28PRO profiles/policies = 0/0
28PRO existing company secrets = 1 Organization Adapter HMAC only
Ana Paperclip = idle / wandora_mastra
Ana Wandora = active + supervised
28PRO work operations = 0
28PRO outbound attempts = 0
VendaERP adapter live path = absent
```

ADR 0212 freezes the future Paperclip-owned activation shape: approved local_stdio template with --tenant voepro, one mcp_stdio ToolApplication and one company ToolConnection, three local_encrypted credential secrets referenced only by the organization grant, Ana-only install, and a default-deny Ana Tool Profile containing exactly the eight ADR 0210 catalog entries. No Wandora table/service/state is added. Generic rest_api remains NO-GO under ADR 0208.

Next safe slice: **28PRO VendaERP Read-Only Connection Activation Execution V1**. It is the first slice allowed to receive/custody the Authorization-Token and create the frozen Paperclip resources. It must remain read-only and stop before employee work or outbound effects.

## Reconciled checkpoint — ADR 0211 Mastra ↔ Paperclip read Tool Gateway bridge GREEN

Wandora Mastra ↔ Paperclip Tool Gateway Read Tool Bridge Candidate V1 is **CODE ONLY / GREEN / NO PRODUCTION EFFECT**.

Verified entry:

```text
main = a1ae7eaca7dc468ad8f45eb84b60ade95f5337aa
PR #275 = DRAFT during qualification
reviewed implementation head = 824c8af8c21097a8ecb5d4f53ca9c99aecc214bd
Paperclip pin = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
```

The bridge reuses the already-verified Paperclip run JWT only to establish a short-lived Tool Gateway session. Wandora Core admits only connection-backed MCP tools classified `risk=read`, exposes them to one ephemeral supervised Mastra Agent execution, and performs calls through Paperclip using only the Tool Gateway session token. Run JWTs, Tool Gateway tokens and provider secrets do not enter model messages or durable Wandora state.

Cached customer-work replay returns before opening a Tool Gateway session. After work execution is prepared, a Tool Gateway failure shares the existing uncertain-execution boundary. The deterministic Mastra runtime is unchanged and does not use this bridge.

Validation on the reviewed implementation head was 7/7 GREEN, including complete Core CI, Core Candidate Artifact, Paperclip Mastra Adapter CI with disposable Paperclip→Core→Mastra E2E, OpenAPI compatibility, Web, Platform Admin and Messaging Gateway.

ADR 0208 remains authoritative: generic `rest_api` Tool Gateway execution is still NO-GO. Write/destructive tools and external effects are outside ADR 0211.

Next safe slice: **28PRO VendaERP Read-Only Connection Activation Preflight V1 — NO EFFECT**.

## Reconciled checkpoint — ADR 0210 VendaERP read-only MCP candidate GREEN

Paperclip VendaERP Read-Only MCP Adapter Candidate V1 is **CODE ONLY / GREEN / NO PRODUCTION EFFECT**.

Verified entry:

```text
main = e133ad7c326b0c48aa3beb180d0f1e4146c12fea
open PRs = 0
Paperclip live = wandora/paperclip:v2026.916.0
Paperclip pin = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
28PRO Tool Connections = 0
28PRO Connection Grants = 0
```

Second adversarial review narrowed ADR 0209 before activation: Paperclip's direct native connector-runtime tool authority is tied to `paperclip_runner`, while Ana uses `wandora_mastra`. The selected execution implementation is therefore the already-supported Paperclip `local_stdio` MCP boundary, not a Paperclip core patch and not generic REST Tool Gateway execution.

The candidate at `integrations/paperclip/mcp-vendaerp-readonly-v1/` is stateless, exposes exactly the eight ADR 0202 reads, derives the provider origin only from a tenant subdomain fixed by the approved Paperclip command template (`https://<tenant>.vendaerp.com.br`; 28PRO candidate = `https://voepro.vendaerp.com.br`), performs GET only, accepts no caller URL/method/tenant, uses bounded pagination/no retries, and expects exactly three Paperclip grant-secret env refs.

Validation: 9/9 adapter tests GREEN, static read-only verifier GREEN, exact Paperclip v2026.916.0 local_stdio/grant/env/gateway compatibility verifier GREEN. No real VendaERP request or credential was used.

ADR 0208 remains unchanged: generic `rest_api` Tool Gateway is still NO-GO.

Next safe slice: **Wandora Mastra ↔ Paperclip Tool Gateway Read Tool Bridge Candidate V1 — CODE ONLY / NO EFFECT**. Only after that bridge is GREEN may the 28PRO VendaERP read-only activation preflight begin.

## Reconciled checkpoint — ADR 0209 Business-System read execution boundary preflight GREEN

Business-System Read Execution Boundary Capability Preflight V1 is **GREEN / PAPERCLIP NATIVE CONNECTOR SELECTED / NO PRODUCTION EFFECT**.

Verified entry:

```text
main = 689908c7891f09dec12868665bd0682ba1ac96ae
open PRs = 0
Paperclip live = wandora/paperclip:v2026.916.0
28PRO Tool Connections = 0
28PRO Connection Grants = 0
```

ADR 0208 remains authoritative that generic `rest_api` Tool Gateway execution is NO-GO.

ADR 0209 proves the safe execution direction is a **Paperclip-native connector contribution** that reuses Paperclip ToolConnection + installs/grants + secret custody, executes only the fixed ADR 0202 read allowlist provider-side, and keeps VendaERP credential values out of Wandora Core/Web/tables/model prompts.

A standalone plugin tool is insufficient because it could create a competing assignment/grant authority. Paperclip v2026.916.1 does not close the generic REST gap and is not required for this capability.

No connection, grant, secret, provider call, upgrade, deployment or runtime effect occurred.

Next safe slice: **Paperclip VendaERP Native Read Connector Candidate V1 — CODE ONLY / NO EFFECT**.

## Reconciled checkpoint — ADR 0208 Business-System Tool Gateway qualification NO-GO

Paperclip Business-System Connection Container + REST Tool Gateway Read-Only Qualification V1 is **NO-GO FOR REST TOOL GATEWAY / NO PRODUCTION EFFECT**.

Verified entry state:

```text
main = 83fed6beb4bdaebb63dad04e8e0fbfc54472f97a
open PRs = 0
Paperclip = wandora/paperclip:v2026.916.0
pinned source = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
```

28PRO remains starter-workforce ready: one active organization, one active+supervised Ana, one completed starter hire, one control-plane binding, one employee/provider binding, Paperclip Ana idle, work items 0. Paperclip has 0 Tool Connections and 0 Connection Grants for 28PRO; no VendaERP credential exists.

Pinned Paperclip proves Connection/secrets/grants can represent the VendaERP three-header credential shape, but Tool Gateway execution is MCP-only for generic connected tools: `connectedMcpToolsForCompany` and test calls admit only `mcp_remote` / `local_stdio`, while remote dispatch is MCP JSON-RPC `tools/call`. The `rest_api` schema enum is not a generic REST execution boundary.

Therefore Paperclip Connections/grants/secrets remain the preferred connection/custody authority, while REST Tool Gateway remains QUARANTINED for VendaERP on v2026.916.0. No Wandora REST executor, secret manager or duplicate tool engine is authorized.

Next safe slice: **Business-System Read Execution Boundary Capability Preflight V1 — NO EFFECT**. Only after a narrow provider-owned execution boundary is proven may **28PRO VendaERP Read-Only Connection Activation Preflight V1 — NO EFFECT** begin.

## Reconciled real checkpoint — 2026-09-23 after ADR 0199 preflight

Customer Company Profile + First Access Onboarding Production Promotion Preflight V1 is **READY FOR A SEPARATE PRODUCTION PROMOTION EXECUTION / NO PRODUCTION EFFECT**.

Verified implementation main:

```text
main = 0a7f368331882f6dcfe4ff1fe722be6e442354a5
PR #259 = MERGED
post-merge workflows = 6/6 GREEN
open PRs before this documentation PR = 0
```

The preflight found and corrected two code/config gaps before promotion: the missing canonical onboarding activation overlay and missing Core Human API wiring for the already-reviewed fail-soft BrasilAPI CEP/CNPJ adapter. Core/Web qualification now uses exact-main artifacts from `0a7f3683...`.

Exact future promotion artifacts:

```text
Core artifact id = 10734743245
Core image = wandora/core:organization-adapter-candidate-0a7f36833188
Core GitHub digest = sha256:875ff17010e5974a15bc18e82cd9d949d54b77ddd67fcd2e62ba3f9efafaf8bd

Web artifact id = 10735126200
Web image = wandora/web:candidate-0a7f36833188
Web GitHub digest = sha256:4efe33331ac8343856127980322ec357c6a73ae3ed58cf1a0f53dfda91a82d4e
```

Production is still unchanged:

```text
migration 019 = ABSENT
wandora.organization_profiles = ABSENT
complete_customer_company_onboarding_v1 = ABSENT
WANDORA_CUSTOMER_COMPANY_ONBOARDING_ENABLED = ABSENT
live Core = wandora/core:organization-adapter-candidate-d8349b353bb7
live Web = wandora/web:candidate-aaada76d9806
```

Next safe slice: **Customer Company Profile + First Access Onboarding Production Promotion Execution V1**. Before any effect, reconcile exact main/runtime, capture a fresh protected pre-019 backup, and follow ADR 0199's frozen flag-last promotion order. Do not apply migration 019 or enable onboarding as part of context recovery.

# Wandora — Project Source / Continuity Bootstrap

## Reconciled real checkpoint — 2026-09-23 after PR #257 merge

Verified from GitHub + live runtime, not inferred from chat:

```text
main = 608bedd9d4eefaa8ee15dd454bd4b4cfeec40a62
PR #257 = MERGED
open PRs = 0
post-merge workflow runs for exact main SHA = 0
reviewed PR head = 5ffe209bb222056a7382204076991ef674ace798
reviewed PR-head workflows = 7/7 GREEN
```

Live runtime remains intentionally pre-ADR 0198:

```text
Web = wandora/web:candidate-aaada76d9806
Core = wandora/core:organization-adapter-candidate-d8349b353bb7
Paperclip = wandora/paperclip:v2026.916.0
Messaging Gateway = wandora/messaging-gateway:origin-fix-94cfb4de

Web/Core/Paperclip/Gateway/DB/Storage = healthy
restart count = 0

wandora.organization_profiles = ABSENT
complete_customer_company_onboarding_v1 = ABSENT
WANDORA_CUSTOMER_COMPANY_ONBOARDING_ENABLED = ABSENT

MEDICSPRO works = 2
MEDICSPRO outbound attempts = 0
MEDICSPRO digital employees = 1
```

Interpretation: ADR 0198 is merged code/documentation only. There is still no production migration, no Core/Web promotion and no onboarding activation. The next safe slice remains **Customer Company Profile + First Access Onboarding Production Promotion Preflight V1**, strictly NO EFFECT.


## Current continuity checkpoint — ADR 0198

Customer Company Profile + First Access Onboarding V1 is **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**.

The invite-only `unlinked` path now has a reviewed company-profile onboarding implementation behind an OFF-by-default Core flag. It creates only Wandora user identity + organization + owner membership + canonical company profile; it does not create Ana, Paperclip/Mastra state, connections, work or outbound.

CPF/CNPJ/CEP validation is deterministic and local. CNPJ supports both legacy numeric and Receita Federal alphanumeric formats. BrasilAPI is optional fail-soft CNPJ/CEP enrichment behind a provider-neutral adapter and is not validation authority.

Migration 019 + verifier passed on a disposable production-derived restore. Core typecheck/build and 12 focused tests are GREEN; full Web build, all existing Web gates and `WANDORA_WEB_COMPANY_PROFILE_ONBOARDING_V1_OK` are GREEN.

Production remains unchanged: migration 019/profile table/onboarding functions are absent and `WANDORA_CUSTOMER_COMPANY_ONBOARDING_ENABLED` is absent.

Next safe slice: **Customer Company Profile + First Access Onboarding Production Promotion Preflight V1**. Do not apply migration 019 or activate the feature without that separate preflight.

Git transport checkpoint: the host credential in `/etc/wandora/github-artifacts.env` is proven for artifact read/qualification but not repository write (`git push` returned GitHub 403). For this failure mode, use `docs/operations/github-actions-artifact-host-transfer-v1.md`: reconcile the remote first, use an authorized GitHub connector only for the work branch, and require exact local/remote tree-SHA equality before replacing any interrupted partial branch. Never force-update `main`.

## Current continuity checkpoint — ADR 0197

Organization Grounding Source File Owner-Session Smoke Test V1 is **COMPLETE / GREEN**.

A normal authenticated MEDICSPRO owner uploaded one real PDF through `/company`. Production now has exactly 1 object in `organization-grounding-sources` and exactly 1 new active rule with `approved_source` provenance and a provider-neutral `wandora:grounding-source:v1:...` reference. MEDICSPRO works remain 2 and outbound attempts remain 0; critical services remain healthy/restart 0.

The same owner also used **Baixar arquivo** successfully. Storage independently recorded an authenticated private GET 200 for the exact PDF, and post-download state remained 1 object / 1 matching sourceRef / 2 works / 0 outbound attempts. The customer upload + canonical association + private download path is now fully proved without extracting or minting owner credentials.

## Current continuity checkpoint — ADR 0196

Organization Grounding Source File Upload Production Promotion Execution V1 is **COMPLETE / GREEN**.

Live production now has:

```text
migration 018 = LIVE / verified
organization-grounding-sources bucket = 1
objects = 0
policies = 2

Web = wandora/web:candidate-aaada76d9806
revision = aaada76d9806d48ce3e3047a299974ee9d41a480
healthy / restart 0
```

Core/Paperclip/Gateway were not recreated. MEDICSPRO grounding, works and outbound remained unchanged. No real file was uploaded during promotion.

The next safe slice is an owner-session smoke test using a deliberate real company file through the customer-facing Company flow. Do not use direct SQL or direct Storage mutation to prove the product path.


## Current continuity checkpoint — ADR 0195

Organization Grounding Source File Upload Production Promotion Preflight V1 is **COMPLETE / GO FOR A SEPARATE FUTURE EXECUTION / NO PRODUCTION EFFECT**.

The only accepted future promotion path is:

```text
fresh execution-time backup + clean restore-check
→ migration 018 + verifier
→ exact private Web candidate proof
→ Web-only promotion
→ validation
→ STOP
```

Do not promote Core/Paperclip/Mastra/Gateway. Do not create a synthetic organization file merely to prove the deployment.

Exact qualified Web artifact:

```text
artifact id = 10729343085
source = aaada76d9806d48ce3e3047a299974ee9d41a480
digest = sha256:f7957a554ade68b4c23c760ef238216b9c2177723f97548c9ef9c54e14e03e8d
image = wandora/web:candidate-aaada76d9806
```

Preflight restore rehearsal on a production-derived dump passed migration 018 + `ORGANIZATION_GROUNDING_SOURCE_STORAGE_V1_VERIFY_OK`. Production itself remains unchanged: target bucket/policies/objects are still 0.


## Current continuity checkpoint — ADR 0194

Organization Grounding Source File Upload Implementation V1 is **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**.

The approved ADR 0191 direction is now implemented behind the existing grounding contract:

- private Supabase Storage bucket contract `organization-grounding-sources` in migration 018;
- provider-neutral `wandora:grounding-source:v1:...` references;
- browser upload through the existing human JWT + public Supabase key;
- owner/admin upload, active-member read and cross-tenant denial through Storage RLS;
- immutable SHA-256-addressed objects with no V1 UPDATE/DELETE policy;
- PDF/DOCX/XLSX/CSV/TXT/PNG/JPEG up to 10 MiB;
- upload/download integrity verification;
- Company UI upload and private download while create/correct continue through the existing grounding contract.

No document table, RAG, retrieval, embeddings, memory, chunking, service-role browser credential or Core blob proxy was introduced.

Validation is GREEN: migration 018/RLS verifier, all 12 existing grounding Core tests and the complete production-shaped Web build including `WANDORA_WEB_GROUNDING_SOURCE_FILE_UPLOAD_V1_OK`.

Production remains unchanged: migration 018 is not live, grounding-source bucket count is 0 and no object was created. Next slice is **Organization Grounding Source File Upload Production Promotion Preflight V1**.


## Current continuity checkpoint — ADR 0193

Web Home Greeting + Company Detail Drawer Production Promotion V1 is **COMPLETE / GREEN**.

Live Web is `wandora/web:candidate-840469b365d1`, revision `840469b365d1b0af25fcb91f365dc74e0da04ea6`, healthy/restart 0. Core/Paperclip/Gateway were not recreated. MEDICSPRO grounding remains exactly 1 active fact + 1 active rule + 2 retired rows.

## Current continuity checkpoint — ADR 0192

GitHub Actions artifacts now have a stable authenticated host path. Use:

```text
/home/wandora-admin/bin/wandora-github-artifact <artifact-id> <output-dir>
```

with host-only credentials from `/etc/wandora/github-artifacts.env`. Do not use temporary connector artifact URLs as the normal promotion path. The helper verifies GitHub digest, safe extraction, SHA256SUMS and manifest/source SHA before an artifact is eligible for promotion.


## Current continuity checkpoint — ADR 0191

Grounding Source File Upload Capability Authority Preflight V1 is **COMPLETE / NO EFFECT**.

Supabase Storage is the accepted delegated blob implementation, but live Storage has no bucket/policies for grounding sources yet. Wandora keeps provider-neutral sourceRef/sourceLabel semantics; uploaded files are evidence only, never automatic RAG/memory/retrieval. No bucket/policy/object/migration was created. Next safe slice is code-only upload implementation.

## Current continuity checkpoint — ADR 0190

Web Home Greeting + Company Detail Drawer V1 is **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**.

Home uses the canonical authenticated user name and browser-local daypart for Bom dia / Boa tarde / Boa noite, with a max ~3rem hero and existing-route quick actions. Company grounding cards use bounded previews and a right-side detail drawer without splitting durable rows.

Local production-shaped Web build is GREEN with WANDORA_WEB_HOME_GREETING_COMPANY_DRAWER_V1_OK.

## Current grounding real-state checkpoint — 2026-09-22

MEDICSPRO is no longer grounding=0. Live reconciliation proves exactly 4 rows total: 1 active fact, 1 active rule and 2 retired rows. The active fact groups three owner-entered facts in one durable record; the active rule groups four owner-entered house-rule statements in one durable record.


## Current continuity checkpoint — ADR 0189

Web Business Density Production Promotion V1 is **COMPLETE / GREEN / WEB ONLY**.

Live Web is `wandora/web:candidate-5f362fb43b62`, healthy/restart 0, from exact `main@5f362fb43b62d4567e850de7c2f09f099755a925`. The second Company / Regras da Casa reference now governs production density and business-first composition.

Core, Paperclip and Messaging Gateway were not recreated. At ADR 0189 promotion time MEDICSPRO had grounding 0, works 2 and outbound 0; that grounding count is historical and superseded by the current real-state checkpoint above. Do not repeat this Web promotion after chat interruption; reconcile runtime first.


## Current continuity checkpoint — ADR 0188

Web Business Density + Company Reference Fidelity V1 is **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**.

The second approved Company / Regras da Casa reference now controls visual density. Início, Equipe, Conversas and Empresa use a substantially smaller display scale; Empresa is reorganized to show real Regras da Casa first, then an intuitive Ensinar à equipe / Como funciona flow and confirmed company facts. Optional evidence remains available without forcing technical provenance language into the primary owner flow.

No fake people, tools, activity or timestamps from the reference were introduced. Production remains at ADR 0187 until a separately reviewed Web-only promotion.


## Current continuity checkpoint — ADR 0187

Web Design System + App Shell Production Promotion V1 is **COMPLETE / GREEN / WEB ONLY**.

Live Web = `wandora/web:candidate-67966d42d23e` from exact `main@67966d42d23e1778d89c2430de8d59e2235dedfb`, healthy/restart 0. The owner-approved typography, collapsible sidebar, complete mobile menu and real power-style logout are production-active.

Core/Paperclip/Gateway were unchanged. MEDICSPRO grounding = 0, works = 2, outbound = 0, Ana = active + supervised, Human Send/Gateway outbound = OFF. Valid rollback selector evidence is `web.env.before` in the ADR 0187 execution directory.

Do not repeat this promotion after chat interruption; reconcile runtime first. The already-authorized first MEDICSPRO grounding execution still requires the normal authenticated owner/admin customer flow.


## Current continuity checkpoint — ADR 0186

Web Design System + App Shell V1 is **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**.

The existing customer shell now has bundled Dela Gothic One / Space Grotesk / JetBrains Mono typography, explicit global design tokens, a 250px→82px collapsible desktop sidebar, a dedicated power-style logout wired to the existing real signOut() path, and a complete mobile route menu. All six canonical routes and existing auth/API contracts remain unchanged.

Production is still the ADR 0185 Core/Web state until a separately reviewed Web artifact qualification/promotion. Do not treat supplied design-reference demo people, tool states, activity or metrics as real Wandora state.


## Current continuity checkpoint — ADR 0185

Customer Company Grounding Save + Business UX Production Promotion V1 is **COMPLETE / GREEN**.

Canonical production:

- main = `d8349b353bb7cc46423ea8ba60e8989522ef6b17`;
- Core/Web both promoted to artifacts from that exact SHA;
- Core/Web healthy / restart 0;
- public grounding transport fixed end-to-end: valid unauthenticated POST = `401`, not `400`;
- business-friendly `/company` language is live;
- MEDICSPRO grounding remains 0;
- works = 2;
- outbound attempts = 0;
- Ana = active + supervised;
- Human Send / Gateway outbound remain OFF.

Next: resume **MEDICSPRO First Real Organization Grounding Content Execution V1** only through the normal authenticated owner/admin customer session, using F1/F2/F3 as facts and R1 as a rule. Housekeeping remains a separate later slice.


## Current continuity checkpoint — ADR 0184

Customer Company Grounding Create Body Bridge + Business-Friendly UX V1 is **CODE ONLY / NO PRODUCTION EFFECT**.

The failed first MEDICSPRO create was traced to Core HTTP body wiring: grounding create/correct POST bodies were not read before dispatch to the existing grounding handler. The fix adds only those canonical mutation paths to the reviewed Human API body boundary and includes a runtime regression test.

The /company surface also uses business language while preserving internal fact/rule/provenance semantics.

Local Core/Web validation is GREEN. Production remains unchanged until separate artifact qualification/promotion.


## Current continuity checkpoint — ADR 0183

Customer Company Grounding Browser Idempotency Production Promotion V1 is **COMPLETE / GREEN / WEB ONLY**. The safe grounding create browser contract is now live on `wandora/web:candidate-8fb5201b0229`.

No real grounding has been created yet. Next effect: normal authenticated MEDICSPRO owner/admin submits F1/F2/F3 = fact and R1 = rule with owner_statement provenance and the approved sourceRef.


## Current continuity checkpoint — ADR 0182

Customer Company Grounding Create Browser Idempotency V1 is **CODE ONLY / NO PRODUCTION EFFECT**. Grounding create now preserves the same request identity across ambiguous retries using UUID + request fingerprint in sessionStorage, reusing the existing customer work/hire pattern.

No real grounding exists yet. ADR 0179 semantic payloads remain unchanged; its textual planned idempotency keys are superseded before effect by browser-generated retained UUIDs.


## Current continuity checkpoint — ADR 0181

Customer Company Owner-Statement Evidence Surface Production Promotion V1 is **COMPLETE / GREEN / WEB ONLY**. Live Web is `wandora/web:candidate-8ee226bcc0dd`, healthy/restart 0, from exact main `8ee226bcc0ddec2f333348235c501320fb223152`.

The form now preserves optional sourceRef/sourceLabel for direct owner statements without misclassifying them as approved sources. Grounding remains 0. Next effect: create the four owner-confirmed MEDICSPRO entries through a normal authenticated owner/admin session: F1/F2/F3 = fact, R1 = rule.


## Current continuity checkpoint — ADR 0180

Customer Company Owner-Statement Evidence Surface V1 is **CODE ONLY / NO PRODUCTION EFFECT**. The Web form now faithfully exposes the already-live Core contract: direct owner statements may retain optional source evidence, while approved-source references remain required.

The MEDICSPRO execution set remains frozen as F1/F2/F3 = `fact`, R1 = `rule`. Production grounding remains unchanged until a separately reviewed Web promotion and normal owner-session mutation.


## Current continuity checkpoint — ADR 0179

MEDICSPRO First Real Organization Grounding Content Execution V1 is **AUTHORIZED / PRE-EFFECT READY**, with F1/F2/F3 confirmed as `fact` and R1 confirmed as a permanent `rule`.

The exact four payloads and retained idempotency keys are frozen in ADR 0179. All use truthful `owner_statement` provenance plus the owner-requested sourceRef `wandora:customer-work-operation:9a4bc45c-cb6e-410d-8e46-3d7b84fc85ab`.

No grounding row has been created yet. The remaining gate is the normal authenticated MEDICSPRO owner/admin customer session. Do not bypass it with Auth-admin/service-role impersonation, minted/extracted tokens or direct SQL.


## Current continuity checkpoint — ADR 0178

MEDICSPRO First Real Organization Grounding Content Preflight V1 is **COMPLETE / NO EFFECT**. Production remains unchanged with migration 017 live/verified and MEDICSPRO grounding rows = 0.

Exactly one low-ambiguity owner-approved fact candidate is accepted for a later execution: **MedicsPro reúne agenda, pacientes, informações clínicas e gestão financeira em um único ambiente**, sourced to the first authenticated owner work. Candidate positioning/benefit claims and the proposed review-before-send house rule require explicit owner confirmation. No Ana/model output is an official source, and global runtime/effect guardrails are not duplicated into tenant grounding.

Next effect, only after owner confirmation as needed: **MEDICSPRO First Real Organization Grounding Content Execution V1** through the canonical customer-facing Core contract. Do not use direct SQL, model output or inferred content.


## Current continuity checkpoint — ADR 0177

Customer Web Grounding API Bridge Production Promotion Execution V1 is **COMPLETE / GREEN / WEB ONLY**. Exact ADR 0176 artifact `wandora/web:candidate-1800aa3d3fb4` is now live, healthy and restart 0. Public unauthenticated grounding now reaches Core and returns 401 rather than old-Web Nginx 404. Migration 017 remains LIVE/verified with 0 grounding rows; MEDICSPRO works = 2 and outbound attempts = 0. Core/Paperclip/Gateway were unchanged; Human Send and Gateway outbound remain OFF. Any first real MEDICSPRO fact/rule is a separate effect slice.

Snapshot date: **2026-09-22**
Repository: `OARANHA/wandora`

## Current continuity checkpoint — ADR 0176

Customer Web Grounding API Bridge Artifact Qualification V1 closes the code-only bridge slice after PR #233. Exact `main@1800aa3d3fb4a0928f314eed4f1722f7adb59ef0` produced immutable Web artifact **10695249794** (`web-candidate-1800aa3d3fb4a0928f314eed4f1722f7adb59ef0`), ZIP digest `sha256:adba9f361b1135e123c555f6ff4afb3b555c13ec3dc129b7347a9467ddc6a109`, image `wandora/web:candidate-1800aa3d3fb4` / `sha256:270a150454befd2e260c45ebbe9b5985a973a32905ac157ce1738d6acf1a243d`.

Post-merge Web/Core/Platform Admin/Messaging Gateway workflows are GREEN. Production was not changed; the public grounding route therefore still returns the old-Web Nginx 404. Next slice is **WEB ONLY** production promotion qualification/execution of the corrected artifact. Migration 017 and the grounding-aware Core are already live and must not be repeated.


## Current continuity checkpoint — ADR 0175

Customer Web Grounding API Bridge / Nginx Allowlist Correction V1 is code-only and no-effect. It fixes only the explicit Web bridge for the canonical grounding Core routes, keeps /api/ fail-closed, adds dedicated static + production-shaped CI verification, and does not change capability authority.

Live production remains on the ADR 0174 safe partial state: migration 017 + grounding-aware Core are live; Web remains the prior candidate; grounding rows = 0; MEDICSPRO works = 2; outbound attempts = 0; Human Send/Gateway outbound = OFF. The next effect, after merge/artifact qualification, is a separate Web-only promotion slice. Do not repeat migration 017 or Core promotion.
Preflight base checkpoint for ADR 0173: `main@fba159db751122bfb5c600296bb7a0d5beb5a474`

## Current grounding promotion checkpoint — ADR 0173

A fresh REAL NOW reconciliation on 2026-09-22 closed **Organization Grounding Production Promotion Preflight V1** as **GO for a separate future execution only**.

```text
canonical main = fba159db751122bfb5c600296bb7a0d5beb5a474
PR #229 = merged
open PRs = 0
migration 017 = ABSENT live
MEDICSPRO grounding rows = none
Human Send = OFF
Gateway outbound = OFF
```

The future promotion dependency is strictly:

```text
fresh execution-time backup + restore-check
  -> migration 017 + canonical verifier
  -> exact Core candidate / readyz
  -> exact Web candidate
  -> validation
  -> STOP
```

The preflight uses only the already-approved Wandora grounding semantic state and contracts. It creates no new RAG/memory/vector/document/provider subsystem and preserves ADR 0168: **portability = contract decoupling, not implementation duplication**.

See ADR 0173 for exact artifact IDs/digests, restore evidence, rollback boundaries and objective stop conditions. Preflight success is not authorization to mutate production.

Checkpoint entering ADR 0173: PR #229 merged; open PRs = 0; normal repository CI is GitHub-hosted per ADR 0158. Mutable state must be reverified.

> **Purpose:** compact bootstrap for ChatGPT Project Sources and future development sessions. It prevents architectural drift, accidental reinvention and stale workflow assumptions.
>
> **This file is not the highest authority and never replaces live verification.** If this snapshot conflicts with current Git, accepted ADRs or the running environment, the newer canonical evidence wins.


## Current continuity checkpoint — grounding promotion partial safe stop

ADR 0174 is the newest grounding-production checkpoint.

- migration 017 is **LIVE and verified**; do not reapply it;
- `wandora.organization_grounding_entries` exists with **0 rows**;
- grounding-aware Core `wandora/core:organization-adapter-candidate-d90b225e6cc2` is live, healthy and ready;
- the ADR 0173 Web candidate was rejected because its Nginx bridge did not proxy the grounding API;
- Web was rolled back to `wandora/web:candidate-65908b76c667`, healthy/restart 0;
- Paperclip and Messaging Gateway were unchanged;
- MEDICSPRO remains at 2 customer work operations and 0 outbound attempts;
- Human Send and Gateway outbound remain OFF;
- no real fact or Regra da Casa was created.

Next code slice: **Customer Web Grounding API Bridge / Nginx Allowlist Correction V1 — CODE ONLY / NO PRODUCTION EFFECT**. It must correct only the Web bridge for the existing Core grounding contract and produce a new immutable Web artifact before another Web promotion attempt.

## Mandatory session bootstrap and authority order

A new technical session should read this file first for continuity, then immediately apply the real authority chain below. This file is a bootstrap, not higher authority.

Before a material product, architecture, code, database or infrastructure decision:

1. `AGENTS.md`;
2. relevant accepted ADRs in `docs/decisions/`;
3. `docs/CAPABILITY_AUTHORITY.md`;
4. `docs/architecture.md`;
5. `docs/CANONICAL_STATE.md`;
6. component README/runbook.

A handoff prompt is only a bridge. Mutable facts such as branch, PR, workflow, container image, feature flags, database counts and deployment status must be reverified. After timeout/chat change, inspect whether prior actions executed before repeating them.


## Current CI execution boundary

The repository is public. ADR 0158 supersedes ADR 0113 for normal repository CI execution.

All nine current GitHub Actions workflows target disposable GitHub-hosted `ubuntu-24.04` runners rather than the VPS-hosted `wandora-ci` runner. Job/check names are unchanged. The Paperclip OpenAPI gate provisions exact Node 24.21.0 with `actions/setup-node` rather than relying on machine-local `RUNNER_TOOL_CACHE`.

No normal CI workflow is a production deployment workflow or receives production SSH, Docker socket, Board, model-provider, database or customer messaging credentials. Production effects remain explicit operator actions.

The existing `wandora-vps-01-ci` runner may remain temporarily installed only as migration fallback. Once hosted-runner CI is proven GREEN, stop/deregister it from normal repository Actions.

## Mandatory development discipline

```text
REAL NOW
  -> PROVEN EVIDENCE
  -> GAPS
  -> CAPABILITY AUTHORITY / REUSE GATE
  -> DECISION
  -> SECOND ADVERSARIAL REVIEW
  -> EXECUTION
  -> VALIDATION
```

The second review must actively try to prove the first decision wrong, duplicated, unsafe, too broad or based on an unproven premise.

A missing Wandora table/service/workflow is **never**, by itself, evidence that Wandora must build that capability.

## Product thesis

Wandora is the product through which businesses hire, train, govern and measure digital employees alongside human teams.

Customers should understand company, team, responsibilities, work, conversations, approvals, outcomes and learning. They should not need to know Paperclip, Mastra, Evolution, Supabase, RLS, provider IDs, prompts, tokens or Portainer.

## Canonical capability architecture

```text
CUSTOMER                                  WANDORA OPERATOR
app.wandora.com.br                        Platform Admin
        |                                      |
        +-------------------+------------------+
                            v
                    Wandora Core/API
              contracts + authorization + policy
                 orchestration + stable IDs
                            |
          +-----------------+------------------+------------------+
          |                 |                  |                  |
          v                 v                  v                  v
  Organization Adapter  Agent Runtime      Messaging         Data/Auth
          |              Adapter            Gateway           Boundary
          v                 |                  |                  |
      Paperclip             v                  v                  v
                         Mastra             Evolution          Supabase
                            |
                            v
                    Model/Tool providers
```

**Wandora owns the product contract and experience; specialist components lend capabilities through Wandora-owned adapters.**

`Wandora-owned` does **not** mean `Wandora-native implementation`.

## Capability authority

| Capability | Wandora owns | Specialist capability |
| --- | --- | --- |
| Customer product | vocabulary, UX, policy, authorization, stable IDs | Wandora Web/Core |
| Platform operation | operator contracts, authorization, audit | Platform Admin over adapters |
| Human identity/session | Wandora user/membership semantics | Supabase Auth |
| Durable Wandora facts | mappings, policy, projections, audit/reconciliation | Supabase PostgreSQL |
| Digital-employee control plane | customer-facing identity/contract/policy | Paperclip via Organization Adapter |
| Agent execution | allowed execution contract and policy | Mastra via Agent Runtime Adapter |
| WhatsApp transport | provider-neutral messaging/effect policy | Evolution via Messaging Gateway |
| Model inference | provider-neutral runtime/model policy | replaceable model providers |
| Runtime/operations | desired topology in Git | Docker/Compose/Portainer/Traefik/Cloudflare |

Native consoles are protected engineering/operator surfaces. They are not the customer product and do not replace Platform Admin.

## Capability Reuse Gate

Before a material new table, service, workflow, state machine, scheduler, assignment model, agent registry or admin subsystem, answer:

1. What exact customer/operator capability is missing?
2. Does an accepted component already provide all or part of it?
3. Which layer owns the capability and which semantics/IDs/policy remain Wandora-owned?
4. What is the **minimum** Wandora state needed for safety, replaceability, authorization, idempotency, audit or reconciliation?
5. What adapter prevents provider IDs/schemas/auth from leaking to Web or Platform Admin?
6. What happens on timeout, partial success, outage or replacement?
7. Would a Wandora-native implementation duplicate an accepted provider capability?

If #7 is yes, default = **do not build it**. A newer ADR must prove reuse insufficient.

## Customer Web — current classification

Implemented routes: `/`, `/team`, `/work`, `/conversations`, `/approvals`, `/company`, `/login`, `/start`.

**REAL:** login/session, explicit multi-organization selection, `Equipe` canonical read, `Trabalho`, `Conversas` list/history, Confirmation V2, controlled WhatsApp end-to-end proof.

**PARTIAL / PLACEHOLDER:** `Início`, customer `Aprovações`, customer `Empresa`, and production actions in `/start`, including real hiring/activation.

Do not rebuild REAL surfaces from zero.

## Proven end-to-end loop

```text
WhatsApp inbound
 -> Evolution
 -> Messaging Gateway
 -> Wandora Core
 -> Mastra deterministic Agent Runtime
 -> canonical supervised proposal
 -> Trabalho / human review
 -> Confirmation V2
 -> Gateway / Evolution outbound
 -> message observed on authorized handset
```

External-effect switches were returned to OFF after the controlled proof.

## Live snapshot — reverify before relying on it

Observed/reverified through 2026-09-17:

```text
Core:      wandora/core:team-read-b31db507               healthy
Web:       wandora/web:team-read-b31db507                healthy
Gateway:   wandora/messaging-gateway:origin-fix-94cfb4de healthy
Paperclip: wandora/paperclip:v2026.831.1                  healthy/private
Paperclip bootstrapStatus: ready

control.wandora.com.br -> protected Paperclip operator console
runtime.wandora.com.br -> protected isolated Mastra Studio
Cloudflare Access: required/proven for both

Paperclip companies = 1
Paperclip canary company = Wandora Internal Supervised Proof
Paperclip canary agents = 1
Paperclip managed resources = 1
Organization Adapter plugin = wandora.organization-adapter-v1@0.1.0, ready

Human Send: OFF / enable flag absent
Gateway outbound: OFF / enable flag absent
organizations = 2
digital_employees = 3
active_employees = 3
```

Migrations `20260916_010_organization_adapter_state_v1.sql` and `20260916_011_organization_adapter_service_contract_v1.sql` are **live**, and both canonical verifiers are green. The internal canary has live provider binding + company-scoped custody/config. The candidate image remains loaded; the temporary smoke container was removed after the successful canary.

## Paperclip boundary — proven

Paperclip remains authoritative for its organization/control-plane lifecycle. Wandora must not recreate a parallel hierarchy/task/agent-control-plane merely because local tables would be convenient.

Historical direct `agent-hires` laboratory evidence remains valid: repeated equal requests can create distinct provider agents. It is no longer the selected V1 provider action for catalog employees.

## Paperclip -> Wandora -> Mastra bridge — proven in laboratory

```text
Paperclip task/run
 -> external wandora_mastra adapter
 -> dedicated Paperclip->Wandora HMAC
 -> private Wandora execution bridge
 -> Agent Runtime Adapter / Mastra
 -> callback to Paperclip with opaque run-scoped JWT
```

The adapter minimizes provider context via allow-list. Wandora never receives Paperclip's JWT master signing secret.

## ADR 0038 — Organization Adapter private state — LIVE FOR INTERNAL CANARY

The accepted minimum private state remains:

- Wandora organization <-> provider company binding;
- Wandora digital employee <-> provider agent binding;
- operation journal for Wandora idempotency/request hash/recovery/audit.

Migration 010 is live and remains private. Migration 011 grants only the reviewed minimum Core runtime contract. There is still no authenticated/customer direct access, no customer hiring route, and provider credentials remain behind the adapter/custody boundaries.

## ADR 0039 — Managed Catalog Organization Adapter V1 — LIVE FOR INTERNAL CANARY

PR #78 merged at:

```text
5c69cac595b7af9bd23a6496fc24a9d356027e29
```

The V1 Paperclip technical identity/provider operation is now selected:

```text
Wandora Organization Adapter
 -> private signed webhook
 -> Wandora-owned headless multi-company Paperclip plugin
 -> company-scoped config + secret_ref
 -> timestamp/HMAC verification
 -> Paperclip configured-company host scope
 -> agents.managed.reconcile(stable catalog agentKey, companyId)
 -> stable managed Paperclip agent
```

Minimum plugin capabilities proven:

```text
webhooks.receive
secrets.read-ref
agents.managed
```

Disposable proof established:

- missing `secrets.read-ref` is denied by the host;
- plugin config cannot bind another company's secret reference;
- first reconcile creates the declared managed catalog agent;
- replay resolves the same provider agent ID rather than duplicating it;
- a proactive plugin call can reconcile within its configured company;
- the same call targeting an unconfigured company is denied by the Paperclip host.

Second adversarial review found a critical scope limit: `agents.managed.reconcile()` only supports **manifest-declared plugin-managed agents**. Therefore V1 is intentionally a **catalog employee** model. Arbitrary/custom employees remain outside V1 and there is no fallback to direct `agent-hires` without a newer ADR/proof.

A broad ordinary Board API key is not the normal tenant runtime credential. Plugin install/configuration are trusted operator/provisioning actions; customer browsers never receive Paperclip credentials or native plugin management access.

The exact combined negative case — valid Company A HMAC with Company B as target — was later executed successfully in the disposable final request-contract proof recorded by ADR 0040. A separate live cross-company gate remains required before customer-facing activation if the activation ADR still calls for it.

Evidence:

```text
docs/decisions/0039-paperclip-managed-catalog-organization-adapter-v1.md
docs/infra/paperclip-organization-adapter-managed-plugin-proof-v1-20260916.md
```

PR #78 passed Core, Web, Messaging Gateway and Platform Admin CI.

## Abandoned direction — DO NOT REVIVE

The old native `digital_employee_work_assignments` direction was rejected before merge/live application.

Do not create a Wandora-native employee hierarchy/responsibility/task control plane merely because the concepts are convenient locally.

## Current Organization Adapter canary

ADR 0059 records the completed internal canary.

```text
migrations 010/011 = LIVE + verifiers green
internal Wandora -> Paperclip binding = 1
Paperclip plugin = installed + ready
Paperclip company config = present
company-scoped custody = live
Wandora Ana = 1 active / supervised
Paperclip Ana = 1 paused / wandora_mastra
Paperclip managed resources = 1
same-idempotency-key replay = same Wandora employee id

live Core = wandora/core:organization-adapter-candidate-068d30a49d9b
live Core Organization Adapter = ON
live Core healthz/readyz = 200/200
Gateway ingress = ON
Human API = ON
deterministic Agent Runtime = ON
Human Send = OFF
Gateway outbound = OFF
customer Contratar/Ativar = absent
Empresa Exemplo Paperclip company = absent
```

The first canary attempt failed closed at Paperclip's private hostname guard. PR #103 added only the internal Docker hostname to the allowlist, preserved the guard, and the same `uncertain` operation was retried with the same idempotency key and completed.

The temporary candidate smoke container was removed after validation. ADR 0060 then promoted the same provenance-matched image to the live Core. Git comparison proved no later changes under `apps/core/` or `infra/stacks/core/`; the final render preserved the existing database, Gateway ingress, deterministic Agent Runtime and Human API capabilities and added only the reviewed Organization Adapter configuration/custody mount.

Post-promotion replay through the live Core returned the same existing Ana employee ID. Paperclip remains at one company, one paused Ana and one managed resource.

## Live cross-company isolation — closed

ADR 0062 records the completed live gate against the production Paperclip/plugin/HMAC composition.

The proof used one ephemeral provider-only B company, never `Empresa Exemplo`. Paperclip rejected an A-owned secret_ref in B's plugin config with its canonical cross-company error, and the private webhook targeting B while signed with A's HMAC returned `invalid_wandora_signature`. B remained at zero agents/managed resources.

The B fixture was deleted through the official provider API. A's existing config was then re-saved unchanged to recompute the plugin worker's configured-company scope to A-only. Final readback shows one live Paperclip company, the original A secret_ref/Ana/managed resource intact, no B residue and no Wandora DB delta.

Human Send and Gateway outbound remain OFF. `Empresa Exemplo` remains unprovisioned in Paperclip.

## Customer digital-employee lifecycle preflight

ADR 0063 separates hire from activation.

```text
Contratar = idempotent catalog materialization -> Wandora employee paused + supervised
Ativar    = separate future provider/runtime effect
```

The existing Organization Adapter journal/bindings are reused; no new lifecycle table is introduced. First-time customer hire will finalize `paused`, while hire replay may return the same employee as `paused` or `active` if a later activation has occurred.

Paperclip managed agents are natively provisioned paused and require explicit activation. Paperclip offers company-scoped `agents.resume`, but the live Wandora plugin does not request it and the execution bridge remains laboratory-only, so customer activation remains unavailable.

Provider company creation is lazy at first hire but is not yet safe to hide inside the customer request. The first customer-like canary will use a separately reviewed provider bootstrap prerequisite; general self-service requires higher-trust bootstrap automation.

The current `/start` prototype is not a production contract. V1 must be authenticated/tenant-bound, use the selected organization, expose only real catalog Ana, perform only `Contratar`, and remove fake company/WhatsApp/knowledge effects.

## Customer Hire Contract Implementation V1 — COMPLETE, GATE OFF

ADR 0064 records that the paused-first customer hire contract is implemented and CI-green without production activation.

Implemented in code:

- exact authenticated POST on the canonical digital-employees collection;
- owner/admin authorization through Organization Adapter;
- stable idempotency key;
- first-time `paused + supervised` finalization;
- replay returning current `paused|active`;
- dedicated disabled-by-default customer-hire runtime flag and separate compose overlay;
- authenticated tenant-bound Ana-only `/start`;
- `Equipe` paused presentation as “Contratada · aguardando ativação”;
- reviewed Web bridge for Authorization + Idempotency-Key with Cookie stripped.

The second adversarial review found a legacy active/supervised Ana already present in `Empresa Exemplo` with no Paperclip binding and no proven catalog identity. Automatic adoption by name/role is rejected. A matching legacy row now causes `catalog-conflict` before journal reservation or provider effect.

Therefore `Empresa Exemplo` must not be used as a naive first-hire canary. The earlier future-canary assumption in ADR 0063 is superseded by ADR 0064.

Production remains unchanged: Customer Digital-Employee Hire OFF, Human Send OFF, Gateway outbound OFF, customer activation unavailable.

## Customer Hire Canary Selection + Legacy Reconciliation Preflight V1 — COMPLETE

ADR 0065 selects a fresh internal customer-like organization with **zero digital employees** as the first paused-first hire canary. Legacy `Empresa Exemplo` adoption is deferred because there is no durable evidence proving its existing active Ana is catalog identity `ana-commercial-v1`.

The current ADR 0030 tenant provisioner cannot create that canary cleanly because it always creates one active supervised commercial-assistant employee. Passing a different name would only leave an unrelated extra employee, so the accepted direction is a versioned employee-free **Tenant Provisioning V2**, not direct SQL and not a new organization subsystem.

The future canary identity is:

```text
Wandora Customer Hire Canary
slug = wandora-customer-hire-canary
pre-hire digital employees = 0
```

The first actual hire effect must run through a private production-connected candidate Core with Customer Digital-Employee Hire ON while the normal live Core remains OFF. This keeps the runtime-wide gate from becoming a public multi-tenant rollout merely to prove one canary.

Live state remains unchanged: organizations = 2, new canary absent, `Empresa Exemplo` unbound, Customer Digital-Employee Hire OFF, Human Send OFF, Gateway outbound OFF.

## Private Tenant Provisioning V2 — CODE COMPLETE / PRODUCTION PREFLIGHT COMPLETE

ADRs 0066–0067 establish the employee-free tenant provisioning path.

Canonical V2:

```text
wandora_private.provision_beta_organization_v2(...)
  -> organization
  -> canonical user / Supabase identity mapping
  -> active owner membership
  -> zero digital employees
```

V1 remains historically compatible and continues to create its original initial active supervised employee. V1 and V2 share one private idempotency ledger with an explicit version/row-shape invariant; only `wandora_platform_provisioner` may execute V2.

PR #111 merged the code/CI implementation; at that historical checkpoint migration 012 was not yet live. ADR 0068 later applied it to production.

ADR 0067 then proved the live pre-012 state, produced and restore-tested the current rollback snapshot, applied the exact migration twice to a disposable restore of current production, and proved a lossless migration-only reverse path while `tenant_provisioning_requests = 0`.

Current rollback artifact:

```text
/home/wandora-admin/backups/postgres-pre-provisioning-v2-20260918T070139Z.dump
sha256=d88a4acb89eba37f7a366621c1d0ede4a824a26e54565bd823591979f28853ff
```

ADR 0068 then applied migration 012 to production using the exact canonical Git artifacts after a fresh live-state/hash recheck.

Production now has the employee-free V2 provisioner live but dormant:

```text
V2 function = present
provisioning_version = present
employee_id = nullable
platform provisioner EXECUTE V2 = true
Core/authenticated EXECUTE V2 = false
tenant provisioning requests = 0
```

Existing business/provider state remained unchanged at 2 organizations, 3 digital employees, 1 control-plane binding, 1 employee binding and 1 completed catalog hire. The future customer-hire canary remains absent. Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF.

## Customer Hire Canary Tenant Provisioning Preflight — COMPLETE

ADR 0069 freezes the first employee-free production canary request without creating it.

```text
request_key = customer-hire-canary:tenant-v2:v1
slug        = wandora-customer-hire-canary
name        = Wandora Customer Hire Canary
owner       = existing canonical Wandora owner, provider subject runtime-resolved/hash-gated
```

The accepted execution path keeps `wandora_platform_provisioner` passwordless with `CONNECTION LIMIT 0`: a local private `supabase_admin` maintenance session resolves the existing owner identity, then uses `SET LOCAL ROLE wandora_platform_provisioner` for the V2 call. The role-switch proof is green and the platform role still has no direct private-ledger read.

Production is unchanged after preflight: canary absent, provisioning ledger empty, Customer Digital-Employee Hire OFF, Human Send OFF and Gateway outbound OFF.

## Customer Hire Canary Tenant Provisioning Execution — LIVE

ADR 0070 created the single employee-free customer-like canary through V2 using the frozen no-password least-privilege path.

```text
Wandora organizations = 3
canary = Wandora Customer Hire Canary
canary employees = 0
V2 provisioning requests = 1
canary Paperclip company = absent
canary provider bindings/hire operations = 0
```

The existing canonical owner was reused; no provider subject was persisted to Git. `wandora_platform_provisioner` remains passwordless with `CONNECTION LIMIT 0`.

Paperclip independently remains at exactly one company, `Wandora Internal Supervised Proof`. Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF.

## Customer Hire Canary Paperclip Bootstrap Preflight — COMPLETE

ADR 0071 freezes a one-shot provider-company bootstrap with no provider mutation yet.

```text
Paperclip commit = 65ec059bde30d98c92165b24a30a540800dd1f6f
operator = existing protected board_key, live isInstanceAdmin=true
current companies = 1
canary-name matches = 0
backup = enabled / ok
```

Exact future POST body is `{"name":"Wandora Customer Hire Canary"}` (SHA-256 `e1c49549f40291c7247bc70916127842ffa7aecb04428ce1b3380b08aaad51fe`).

Paperclip does not provide an idempotency key for company creation, names are not unique and the route can persist the company before later owner/audit steps complete. Therefore any ambiguous/non-201 result after dispatch requires read-only reconciliation and never a blind retry. The live health contract reports company deletion disabled, so normal rollback does not assume DELETE.

## Customer Hire Canary Paperclip Bootstrap Execution — LIVE

ADR 0072 created the canary provider company once through the official Paperclip CLI with the protected Board credential store.

```text
Wandora Customer Hire Canary providerCompanyRef
  = e7422a00-1474-49d5-ac32-34594520015e

Paperclip companies = 2
canary provider company = active
canary owner membership = active
canary provider agents = 0
canary Organization Adapter config = absent
canary company secrets = 0

Wandora canary employees/provider bindings/hire operations = 0/0/0
Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

No provider-create replay was executed.

## Customer Hire Canary Organization Adapter Wiring Preflight — COMPLETE / BLOCKED

ADR 0073 freezes the exact canary wiring sequence without mutating production:

```text
Wandora organization = 918d4c7e-fccb-41f0-aba7-04105a9b4ec0
Paperclip company     = e7422a00-1474-49d5-ac32-34594520015e
future HMAC filename  = paperclip-0cbf21f19c002ca9207c67e5cdec8180641431eacdf601629b683de2a363bbd2.hmac
```

Future order is: operator-owned control-plane binding → protected Core custody file → company-owned Paperclip `local_encrypted` secret → company-scoped plugin config last → independent validation. Ambiguous secret/config effects require readback reconciliation and never blind retry.

The second adversarial review found the current Paperclip disaster-recovery gap: automatic database backups and `master.key` live on the same Docker volume, but both are required to restore `local_encrypted` values. No out-of-volume master-key recovery copy was found, so canary secret creation is blocked.

## Paperclip Local-Encrypted Secret Recovery Snapshot Preflight — COMPLETE

ADR 0074 freezes a same-host, out-of-Docker-volume recovery pair before another `local_encrypted` secret is allowed.

```text
fresh official Paperclip logical DB backup
+ exact current master.key
+ SHA-256/mode manifest
+ disposable PG18 restore
+ correct-key decrypt/hash-match
+ wrong-key decrypt rejection
```

The proof reuses the exact production Paperclip image/runtime and never prints restored plaintext. No snapshot or canary wiring effect was created during the preflight.

## Paperclip Local-Encrypted Secret Recovery Snapshot Execution — GREEN

ADR 0075 creates and proves the protected same-host recovery pair outside the Paperclip Docker volume.

```text
fresh official DB backup = retained
exact master.key copy = retained
source/copy hashes = match
disposable PG18 restore = green
matching-key decrypt/hash-match = green
wrong-key rejection = green
proof-only state = removed
```

Live Paperclip/Core were not restarted or mutated, and the customer-hire canary still has zero secrets/config/agents/binding/employees/hire operations.

This clears the ADR 0073 blocker but does not claim off-host/VPS-loss disaster recovery.

## Customer Hire Canary Organization Adapter Wiring Execution — GREEN

ADR 0076 makes the clean canary's provider control-plane wiring live:

```text
Wandora org -> Paperclip company binding = present
Core deterministic HMAC custody = present / 0640 / readable
Paperclip local_encrypted secret = exactly 1
Paperclip Organization Adapter config = exact secret_ref / healthy
Paperclip agents = 0
Wandora employees/employee bindings/hire ops = 0/0/0
Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

Independent hash-only validation proves the Core HMAC file and Paperclip encrypted secret version represent the same plaintext without revealing it.

## Customer Hire Canary Private Candidate Hire Execution — GREEN

ADR 0078 makes the first clean customer-like hire real and verified:

```text
Wandora Ana id = 3e689529-a9a2-4d70-8ce1-17aa3aed6f8f
role = commercial-assistant
status = paused
autonomy = supervised

Wandora employees / employee bindings / hire ops = 1 / 1 / 1
primary hire operation = completed
Paperclip managed Ana count = 1
Paperclip Ana = paused / wandora_mastra
```

The proof used the later PR #111 candidate artifact on private networks only and a real normal Supabase owner browser session. Candidate `/me` returned 200 for the canonical owner. The first hire returned 200, and same-key plus different-key/same-catalog replay both returned the same employee with no duplicate Wandora or Paperclip state and no provider/secret leakage in the customer response.

Cleanup completed:

```text
candidate running = false / container absent
ephemeral browser-session material = removed
normal live Core Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

The successful Ana remains paused. `Ativar` is still a separate future effect.

## Customer Digital-Employee Hire Public Rollout Preflight — COMPLETE / OFF

ADR 0079 freezes the rollout boundary. PR #126 is merged and proves refresh-safe, tenant-bound browser idempotency. The live Web is still pre-rollout and normal customer hire remains OFF.

The Core hire flag is global while organizations have different readiness states. A control-plane binding cannot serve as customer eligibility because accepted wiring creates that binding before the integration setup is complete.

Decision:

```text
global runtime hire gate
AND
explicit Wandora-owned organization + catalog eligibility
=
customer hire available
```

Eligibility is provider-neutral, operator-owned and enforced before provider effects. No production activation occurred.

## Customer Digital-Employee Hire Tenant Eligibility — IMPLEMENTED / CI GREEN / NOT LIVE

ADR 0080 + PR #128 implement the Wandora-owned eligibility boundary selected by ADR 0079.

Current implemented contract:

```text
new hire availability
=
global Core hire gate
AND
organization + catalog eligibility
AND
normal authorization / safety checks
```

Eligibility is a private Wandora fact. It does not contain provider IDs/configuration.

Write authority is isolated behind a dedicated `wandora_customer_hire_operator` NOLOGIN capability and a controlled setter. The tenant provisioner is deliberately not reused for rollout policy. Core has tenant-scoped SELECT only; browser/service roles have no direct authority.

The Core checks eligibility before any new journal/provider effect. An unfinished catalog hire can resume only with its original idempotency key; a completed catalog hire remains deduplicated even if eligibility is later disabled.

Customer GET now exposes only:

```text
available
already-hired
reconciliation-required
unavailable
```

The Web gates `Equipe`/`Contratar` from that projection and never invents a new key for a reconciliation-required operation.

Technical validation was green on the implementation head:

```text
Core CI                 35342325894 = success
Web CI                  35342325859 = success
Platform Admin CI       35342325774 = success
Messaging Gateway CI    35342325740 = success
Core Candidate Artifact 35342325793 = success
```

Production is unchanged: migration 013 is absent; no eligibility state is live; normal Customer Hire, Human Send and Gateway outbound remain OFF. CI candidate artifacts were not promoted.

## Customer Digital-Employee Hire Production Activation Preflight V2 — COMPLETE / NO EFFECT

ADR 0081 revalidated current `main`, production DB/runtime, final PR #128 artifacts and all active organizations without applying migration 013 or changing runtime effects.

Key frozen facts:

```text
main = e438518bb52be8119883c4350295dac58cd70ef2
main tree = 1438f0b4c33a7dda4d7ec8de94755f4e5f93122e
reviewed PR merge-ref tree = same exact tree
migration 013 live objects = absent
Customer Hire / Human Send / Gateway outbound = OFF
active tenants selected for new catalog eligibility = 0
```

The reviewed Core/Web candidate artifacts from the final #128 validation are current-main tree-equivalent and are selected for the later dormant foundation execution.

Frozen production order:

```text
migration 013
-> read-only zero-row/authority postverify
-> Core
-> Core validation
-> Web
-> Web validation
-> stop with global hire OFF and zero eligibility rows
```

Eligibility changes use the dedicated NOLOGIN `wandora_customer_hire_operator` only through a protected local transactional `SET LOCAL ROLE` path; no new general-purpose login is authorized.

## Customer Digital-Employee Hire Dormant Production Foundation — LIVE / DORMANT

ADR 0082 applied migration 013 and promoted the reviewed PR #128 Core/Web candidates while deliberately keeping every rollout effect closed.

Live foundation:

```text
migration 013 = LIVE
eligibility rows = 0
customer-hire operator = NOLOGIN / controlled setter only

Core = wandora/core:organization-adapter-candidate-af542864d267
Web  = wandora/web:candidate-af542864d267
Core/Web = healthy

Customer Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

A fresh pre-migration backup is retained and its Wandora-owned schemas passed a disposable PostgreSQL 17.6 restore/count proof. Exact migration and candidate provenance were hash-gated before production use.

Core/Web Compose drift gates each proved that the only promotion delta was the image. Previous Core/Web images and rollback records remain available.

No durable employee/binding/hire count changed and no tenant received eligibility.

## Customer Digital-Employee Hire Global Runtime Gate Preflight — COMPLETE / OFF

ADR 0083 proves the next process-wide activation is a one-line Core configuration effect on the already-live reviewed image.

```text
canonical overlay blob = cf188f4e22651f318984f10a17aba3dee05ad2ea
delta = WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED=true
eligibility rows = 0
live gate = OFF
```

The overlay is not yet materialized in the live stack directory. Config-only rendering proves no image/network/mount/secret/port or unrelated capability changes.

Current safety state also proves:

```text
eligibility rows = 0
unfinished hire operations = 0
completed hire operations = 2
```

A disposable executable proof used the same live Core image with a production-derived Wandora schema clone and canonical migration 013. A synthetic fully wired owner tenant with no eligibility projected `unavailable`; POST returned provider-neutral 404 before journal/provider effect, with provider calls = 0 and no new employee/binding/operation.

The rollout order is frozen as global gate first with zero eligibility **and zero unfinished operations**, validate no new tenant availability, then stop. Tenant eligibility remains a later scoped effect.

## Customer Digital-Employee Hire Global Runtime Gate — LIVE / ZERO TENANT ELIGIBILITY

ADR 0084 executed the one-overlay Core activation selected by ADR 0083.

```text
Core image = wandora/core:organization-adapter-candidate-af542864d267
Customer Hire = ON
eligibility rows = 0
unfinished hire operations = 0
Human Send = OFF
Gateway outbound = OFF
```

The same reviewed Core image was recreated with only the canonical hire overlay. Core is healthy/ready with zero restarts. No durable employee/binding/hire count changed.

The live projection for all active tenants is still closed to new hire: two completed-hire tenants return `already-hired`; `Empresa Exemplo` returns `unavailable`; none returns `available=true`.

## First Tenant Eligibility Rollout Preflight — COMPLETE / NO CURRENT TARGET

ADR 0085 revalidated all active tenants with the global customer-hire gate already ON and eligibility still empty.

```text
Internal Supervised Proof -> completed ana-commercial-v1 / already-hired
Customer Hire Canary      -> completed ana-commercial-v1 / already-hired
Empresa Exemplo           -> matching legacy Ana + no Paperclip control binding / unavailable

eligibility rows = 0
unfinished hire operations = 0
Human Send = OFF
Gateway outbound = OFF
```

The two Paperclip-bound companies remain correctly wired with company-scoped `secret_ref` config, healthy Organization Adapter plugin and protected Core HMAC custody. The dedicated eligibility operator remains NOLOGIN and setter-only.

No current tenant qualifies for a first new catalog rollout, so no eligibility was enabled. ADR 0085 freezes the future target-specific setter/rollback and requires the first rollout to fail closed unless exactly one reviewed organization+catalog pair becomes enabled. The frozen first-rollout transaction is serialized with an EXCLUSIVE table lock; a disposable two-session race proved a second concurrent target is rejected before setter execution, and rollback restores zero enabled rows. The local operator session uses the existing protected `supabase_admin` boundary and narrows to the NOLOGIN hire-operator role only for the setter.

## Clean Tenant Rollout Candidate Preparation — COMPLETE / OWNER ONBOARDING BLOCKER

ADR 0086 proves there is no real clean customer/owner target waiting in production:

```text
Auth users = 1
Wandora users = 1
users without memberships = 0
active organizations = 3
Paperclip companies = 2
eligibility rows = 0
```

Private Tenant Provisioning V2 is ready but requires a real existing Supabase Auth subject. Public signup remains disabled. Live GoTrue has configured SMTP plus protected admin invite/generate-link routes, while the current Web only supports password login/refresh/logout and canonical `/api/v1/me` bootstrap.

The selected beta path is invite-only onboarding through Supabase Auth, followed by employee-free V2 provisioning, Paperclip company/bootstrap+wiring, and finally the ADR 0085 serialized tenant eligibility transaction. No synthetic tenant is created merely to advance rollout.

## Customer Owner Invite Acceptance + First Password — IMPLEMENTED / NOT LIVE

ADR 0087 implements the provider-aligned normal first-access path in Web/code/CI only.

Against exact GoTrue v2.196.0 source, Wandora now handles the current administrative invite as an implicit-flow redirect, strictly stages only `sb + type=invite + bearer + unexpired` sessions, removes credentials from the URL before React renders, supports SITE_URL-root fallback, and sets the first password through authenticated Supabase Auth `PUT /user`.

The invite session is isolated from the normal browser session until password success; existing `/api/v1/me` remains the canonical Wandora user/organization authorization boundary. No `service_role` or Auth-admin secret is added to Web/Core.

Web CI proved the invite acceptance, first-password, existing customer-hire browser and Human API bridge contracts together. The code is **not deployed** and no real invite/Auth user/customer tenant/provider/eligibility effect occurred.

An explicit operational gap remains: if the browser session is lost after one-time invite verification but before the password is defined, the customer cannot know GoTrue's random temporary password. A Supabase Auth recovery contract must be reviewed before real customer invitation.

## Customer Owner Interrupted Invite Recovery — PREFLIGHT COMPLETE / NO EFFECT

ADR 0088 selects the minimum recovery contract against exact GoTrue v2.196.0. Normal customer recovery will reuse public provider-native `POST /recover`, a dedicated Wandora `/recover-access` Web flow, strict `type=recovery` browser-session staging and the existing ADR 0087 authenticated password-update + password-grant reconciliation.

Recovery tokens/session issuance remain Supabase Auth state. No Wandora recovery table, generic Core recovery proxy or browser Auth-admin credential is justified. `/admin/generate_link type=recovery` remains privileged operator-only emergency/diagnostic capability.

A second interruption after consuming a recovery link is not terminal: the exact provider contract can issue a later recovery token again, subject to rate/frequency limits. Live CAPTCHA is currently disabled, so anti-abuse review is an explicit activation gate before any real customer recovery.

The preflight generated no invite/recovery, changed no Auth user, performed no deploy/provisioning/provider wiring and kept eligibility at zero.

## Customer Owner Interrupted Invite Recovery — IMPLEMENTED / NOT LIVE

ADR 0089 + PR #137 implement the ADR 0088 recovery contract in Web/code proof only.

The public `/recover-access` route now provides a neutral recovery request and the provider callback/reset path. The browser calls public Supabase Auth `POST /recover` with the publishable key only, stages exact unexpired `type=recovery` sessions separately under `wandora.auth.recovery.v1`, removes URL credentials before React renders and reuses the shared authenticated password-update + password-grant reconciliation from ADR 0087.

The second review found a pre-render collision: the existing invite handler would have stripped a valid recovery fragment first. Invite now explicitly defers recovery and recovery explicitly defers invite; unsupported Auth fragments still fail closed.

GitHub-hosted checks for the implementation head again ended before runner assignment with `steps=null`, so they are not called green. An independent reconstruction of the exact Web branch with the pinned Dockerfile passed strict TypeScript, invite/recovery/hire verifiers, Vite production build and an isolated route smoke with `/recover-access=200`, `/accept-invite=200` and generic unreviewed API `404`.

The implementation is not deployed. No recovery/invite was generated or sent, no Auth user/tenant/provider state changed, and eligibility remains zero. Live CAPTCHA is still disabled and remains an activation gate.

## Customer Owner Invite + Recovery Production Activation Preflight — COMPLETE / BLOCKED

ADR 0090 proves the owner-access Web source and a production-keyed local candidate without deploying it.

```text
canonical main = 5f135e9070380e28c64f244c8a7126644cfa793c
candidate = wandora/web:owner-access-candidate-5f135e90
candidate manifest list = sha256:7921ad23cd626efc9f6fc619f70fc98a5d62e862958d6534edc488e6afc21ba5
live Web = wandora/web:candidate-af542864d267
```

All 34 Web build-context files match current main Git blobs. The candidate uses the existing public Supabase ANON/publishable key, passed strict TypeScript + invite/recovery/hire verifiers + Vite build, and isolated smoke returned 200 for `/login`, `/accept-invite`, `/recover-access`, with unauthenticated `/api/v1/me=401`. Rollback is image-only.

Auth redirect/origin configuration is compatible and public signup remains disabled. No recovery POST was sent.

Activation remains blocked by the anti-abuse gate: GoTrue CAPTCHA is off and the current Web has no CAPTCHA-token contract; the public Supabase Traefik router has no recovery-specific limiter; the origin is not proven Cloudflare-only; and the installed Cloudflare DNS token can read the zone but receives 403 reading the HTTP rate-limit ruleset. Therefore no compatible Cloudflare recovery rule is currently proven.

No Web/Auth/Core deployment, invite/recovery, tenant/provider wiring or eligibility effect occurred.

## Customer Owner Recovery Edge Anti-Abuse Control Preflight — COMPLETE

ADR 0091 resolves the anti-abuse design against the actual Cloudflare zone.

```text
Cloudflare plan = Free Website
selected rule = exact /auth/v1/recover path
rate = 6 requests / 10 seconds / IP
mitigation = block 10 seconds
phase = http_ratelimit
```

Free-plan constraints matter: one rate-limiting rule, Path matching, IP counting, 10-second window/mitigation, and no Method field. Therefore OPTIONS and POST are intentionally counted together; the threshold allows several rapid human retries while cutting machine-speed bursts.

The existing DNS token remains DNS-only and cannot read the rate-limit ruleset (403). It must not be widened. Future execution requires a separate one-zone WAF credential that first snapshots the current ruleset and proves the Free single-rule slot is available.

A direct-origin attempt from independent `28server` timed out before connection, correcting the earlier over-interpretation of local loopback routing. Exact UFW rules are still not readable without interactive sudo, so future execution rechecks the external direct-origin negative rather than assuming a specific firewall implementation.

The future edge-rule validation can use OPTIONS-only burst traffic and therefore does not need a real recovery POST or e-mail.

No Cloudflare rule, Auth setting, Web runtime, tenant/provider state or eligibility changed in this preflight.

## Recovery Edge Activation — PRE-MUTATION CREDENTIAL GATE

ADR 0092 records that execution reached the credential/custody boundary and stopped safely.

Only the Cloudflare DNS token exists on the VPS and it remains DNS-scoped. The reviewed WAF secret directory does not exist and `/opt/wandora/data` is root-owned, so `wandora-admin` cannot create the production custody path without sudo. No alternate WAF token was found.

Required operator-issued token:

```text
specific zone = wandora.com.br
Zone Read
Zone WAF Read
Zone WAF Edit/Write
no DNS edit
no account-level WAF
```

Reviewed custody:

```text
/opt/wandora/data/cloudflare/secrets/recovery_ratelimit_api_token
root:wandora-ops
0640
```

No Cloudflare rule mutation occurred.

## Customer Owner Recovery Edge Activation — COMPLETE

ADR 0093 records the successful edge-rule transaction.

The Free-plan `http_ratelimit` phase had no entry point before mutation (`404 / 10003`). The dedicated one-zone WAF token was used to create exactly one reviewed rule:

```text
wandora_owner_recovery_burst_guard_v1
/auth/v1/recover
6 requests / 10 seconds / IP
block 10 seconds
```

Read-back returned one rule with exact match. OPTIONS-only burst validation reached 429 and returned to 200 after 12 seconds. No recovery POST was sent; recovery-token/sent counters remain zero.

Independent direct-origin TCP remained unreachable after the edge change.

Owner-access Web remains undeployed; live Web is still `wandora/web:candidate-af542864d267`.

## Customer Owner Invite + Recovery Web Production Activation — COMPLETE

ADR 0094 records the production Web promotion.

```text
live Web = wandora/web:owner-access-candidate-5f135e90
id = sha256:7921ad23cd626efc9f6fc619f70fc98a5d62e862958d6534edc488e6afc21ba5
health = healthy
restarts = 0
```

Only the Web image selector changed and only `wandora-web` was recreated.

Public routes are live (`/login`, `/accept-invite`, `/recover-access` = 200) while unauthenticated `/api/v1/me` remains 401. Auth signup remains disabled, recovery counters remain zero, eligibility remains zero, and Human Send/Gateway outbound remain OFF.

The recovery edge guard remains reachable normally after mitigation and direct-origin TCP remains unreachable externally.

No real invite/recovery has been sent.

## First Real Customer Owner Access + Tenant — REAL

ADR 0101 sent the first real owner invite. ADR 0102 proves invite consumption, first password and a fresh normal password login.

ADR 0103 froze the first real tenant request and ADR 0104 made `MEDICSPRO` / `medicspro` live through Private Tenant Provisioning V2.

ADR 0105 now proves the customer product end-to-end with a genuine normal owner session: MEDICSPRO renders as the active organization, `/api/v1/me` returns 200 from the fresh login flow, and tenant-authorized Trabalho/Equipe/Conversas reads return 200. No customer secret/session extraction or privileged JWT impersonation was used.

MEDICSPRO remains intentionally employee-free and provider-unwired: no Paperclip/control binding, employee binding, eligibility or hire state exists for it.

## MEDICSPRO Paperclip Company Bootstrap — PREFLIGHT COMPLETE

ADR 0106 freezes the provider-company bootstrap without creating it. Live Paperclip is still the pinned `wandora/paperclip:v2026.831.1` / `65ec059b...` runtime, healthy/private/authenticated, with exactly two existing provider companies and zero exact `MEDICSPRO` matches. The protected Board credential remains instance-admin when explicitly addressed to `http://127.0.0.1:3100`.

The exact future payload is `{"name":"MEDICSPRO"}` (SHA-256 `6320780ded5fe0976fd96d8e5d8e834b87d87d771b9f9b441818fd2c793b415b`). Reuse the ADR 0072 official one-shot CLI path; Paperclip company creation is not idempotent and names are not unique, so ambiguous dispatch must be reconciled by read-only state and never blindly retried.

MEDICSPRO remains at zero employees, control bindings, employee bindings, hire operations and eligibility. No HMAC/secret/plugin config was created.

## MEDICSPRO Paperclip Company Bootstrap — LIVE

ADR 0107 executed exactly one official Paperclip company create for MEDICSPRO after revalidating the ADR 0106 gates.

```text
provider company id = a63f27a8-dbac-4552-a456-b3a21302226b
name                = MEDICSPRO
status              = active
owner membership    = active
agents              = 0
company secrets     = 0
plugin config       = null
```

Wandora remains intentionally unwired for MEDICSPRO: control binding, employee-provider binding, eligibility and hire state are all zero. The deterministic future HMAC file is also absent. No runtime was recreated and no outbound effect was enabled.

## MEDICSPRO Organization Adapter Custody + Config + Binding — LIVE

ADR 0110 executes the exact ADR 0108 wiring boundary after ADR 0109 cleared recovery.

```text
control binding            = exactly 1
Core HMAC                  = 0640 / readable / deterministic path
Paperclip secret           = exactly 1 active local_encrypted
plugin config              = exact secret_ref / healthy
secret usage               = exactly one required plugin hmacSecret binding
Paperclip agents           = 0

MEDICSPRO employees        = 0
employee bindings          = 0
hire operations            = 0
eligibility                = 0 / 0 enabled
```

The final current secret version is version 2. The adversarial review rotated the initial value to an exact 32-byte `crypto.randomBytes(32)` value before closure; hash-only proof matches Core custody to Paperclip `value_sha256` and `fingerprint_sha256`. No plaintext was exposed. Temporary staging was removed, runtime health is green and outbound remains OFF.

## MEDICSPRO First Real Tenant Eligibility Rollout — LIVE

ADR 0111 accepted MEDICSPRO as the clean real target; ADR 0112 executed the serialized operator transition.

```text
eligibility rows/enabled   = 1 / 1
enabled target             = MEDICSPRO + ana-commercial-v1
MEDICSPRO employees        = 0
employee bindings          = 0
MEDICSPRO hire operations  = 0
Paperclip agents           = 0
Organization Adapter       = exact + ready
Human Send                 = OFF
Gateway outbound           = OFF
```

The dedicated setter ran only under `SET LOCAL ROLE wandora_customer_hire_operator` after the exclusive lock and zero-enabled check. Independent post-commit validation confirmed no employee, provider-agent, activation or outbound side effect.

## MEDICSPRO First Real Digital-Employee Hire — LIVE

ADR 0114 froze the execution boundary; ADR 0115 completed the first genuine MEDICSPRO owner hire through the normal customer browser flow.

```text
MEDICSPRO employees          = 1
Ana status/autonomy          = paused / supervised
employee bindings            = 1
ana-commercial-v1 hire ops   = 1 completed
unfinished hires             = 0
Paperclip agents             = 1 paused
Paperclip adapter            = wandora_mastra
hire projection              = already-hired
outbound attempts/messages   = 0 / 0
Human Send                   = OFF
Gateway outbound             = OFF
```

The owner clicked `Contratar Ana` once. The original browser idempotency key became the single completed durable hire operation; no retry was required. Independent Paperclip reconciliation confirms Ana is paused with zero budget, no heartbeat and an explicit pause reason requiring separate activation.

Capability Reuse Gate remains satisfied: Wandora owns the customer contract/policy and minimum mapping/idempotency state; Paperclip owns the provider employee lifecycle behind Organization Adapter.

## MEDICSPRO Digital-Employee Activation Preflight — COMPLETE / NO-GO

ADR 0116 revalidated the first real customer activation boundary without any activation effect.

The exact MEDICSPRO mapping remains green: one Wandora Ana `paused/supervised`, one employee-provider binding, one completed `ana-commercial-v1` hire operation and one matching Paperclip managed Ana in the exact company, also paused with healthy org chain.

Two independent activation prerequisites are still absent:

```text
live Paperclip wandora_mastra adapter = absent / exact read returns 404
live Organization Adapter agents.resume capability = absent
```

The live plugin remains ready with only `agents.managed`, `webhooks.receive` and `secrets.read-ref`. The pinned Paperclip SDK already provides company-scoped `ctx.agents.resume(agentId, companyId)` behind `agents.resume`, and provider resume converges `paused -> idle`.

Therefore customer activation remains unavailable. The operator Board credential is not a valid customer-activation shortcut; Wandora may project `active` only after the exact provider-managed employee is resumed and confirmed through the company-scoped Organization Adapter.

Human Send and Gateway outbound remain OFF and are not bundled into activation.

## Paperclip -> Wandora/Mastra Production Execution Bridge — COMPLETE / MERGED

ADR 0117 turns the ADR 0037 laboratory direction into a production-shaped but dormant bridge. PR #166 is merged in canonical `main` at `7bc8c4790e37b0410703bf58979458200810d5a9`.

```text
canonical external adapter = @wandora/paperclip-adapter-mastra@0.1.0
adapter type               = wandora_mastra
Core private route         = /internal/v1/paperclip/execution
Core bridge gate           = disabled by default
migration 014              = repository source only / not live
production adapter install = not performed
```

The adapter signs a minimized request with a dedicated file-backed HMAC and carries the Paperclip run token only in a secret header. Core independently validates that token back against private Paperclip `/api/agents/me` and requires exact company/agent plus `wandora.organization-adapter-v1 / ana-commercial-v1` managed identity.

Only then does Core resolve the active Wandora organization, derive the existing stable managed provider ref and require the exact Wandora employee binding with `status=active / autonomy=supervised` before invoking the existing Agent Runtime/Mastra boundary. Provider IDs do not enter Mastra.

No resume authority or outbound capability is added by this slice. All seven PR workflows were green before merge, and post-merge live validation proves migration 014 remains absent, the live Paperclip adapter store still has no `wandora_mastra`, MEDICSPRO Ana remains `paused + supervised`, and Core bridge/Human Send/Gateway outbound remain OFF.

## Paperclip -> Wandora/Mastra Production Execution Bridge Activation Preflight — COMPLETE / NO-GO

ADR 0118 revalidated the dormant production state after the bridge implementation and froze the future activation transaction.

Still true:

```text
migration 014              = absent
live wandora_mastra        = absent / exact read 404
Core execution bridge      = OFF
Organization Adapter       = ready
agents.resume              = absent

MEDICSPRO Ana / Wandora    = exactly 1 / paused + supervised
MEDICSPRO binding          = exactly 1
MEDICSPRO hire             = exactly 1 / completed
MEDICSPRO Ana / Paperclip  = exactly 1 / paused / no heartbeat

Human Send                 = OFF
Gateway outbound           = OFF
```

The adapter and Core candidate are now exact-artifact frozen. The selected adapter tgz SHA-256 is `0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f`. The selected Core archive SHA-256 is `b4acc5bac69743493865a69fa51757d32d2ab5bc738d9b277fccd62c3e3a7287`; its source tree is byte-identical to the canonical bridge-code squash merge.

Production activation is **not** authorized yet because three readiness contracts are missing:

1. canonical Paperclip execution-bridge runtime overlay for the shared read-only dedicated HMAC and exact Core URL;
2. Core bridge-specific `/readyz` proof for migration 014;
3. one disposable integrated Paperclip run-token -> Core -> Agent Runtime/Mastra attestation.

The future activation order and rollback are frozen in ADR 0118. The adapter must be extracted into a restart-stable path under persistent `/paperclip/operator-packages` and installed through the official local-directory adapter route; never install it from `/tmp`, a CI workspace or an unverified registry package.

## Paperclip -> Wandora/Mastra Production Execution Bridge Runtime Custody + Readiness + Disposable E2E Attestation — COMPLETE

ADR 0119 closed ADR 0118's three implementation gaps without activating production:

```text
Paperclip bridge runtime overlay             = implemented / CI-validated
Core migration-014-aware bridge readiness   = implemented / fail-closed
disposable pinned Paperclip -> Core -> Mastra= GREEN
migration 014 live                           = NO
```

The disposable proof uses Paperclip's native managed-agent service and a real run-scoped token. Its resolver shim is proof-only and is not a substitute for migration 014.

## Paperclip -> Wandora/Mastra Production Execution Bridge Activation Preflight V2 — COMPLETE / GO

ADR 0120 revalidated current `main@cb52b601d440b5abb9412005fc6503c7b8065adc`, PR #169 artifacts and production.

```text
migration 014            = absent
bridge secret             = absent
Core bridge               = OFF
Paperclip bridge overlay  = absent live
wandora_mastra store      = []
agents.resume             = absent
Ana                       = exactly 1 / paused + supervised
Paperclip wakeups/runs    = 0 / 0
Human Send                = OFF
Gateway outbound          = OFF
```

Exact current artifacts are frozen:

```text
adapter artifact ZIP sha256 = ad82c276239e091779aadade7a7067175505f5c4a3f9aa0b0d4e5b0024163952
adapter tgz sha256          = 0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f

Core artifact ZIP sha256    = 6c9daf4528e8f18dbaff2a4d313edf7616915627e19683223bacbd4da449b2fc
Core archive sha256         = b101033ac47b7f1e4695d5e2a15d288558682d38e0e508cd7d059abd0aae902d
Core source tree            = abacb9da0949a63210080a01bdd95b087e98d02e
```

The Core source tree is exactly the canonical current-main tree. The adapter tgz is byte-identical to ADR 0118. Live Core/Paperclip base Compose files remain byte-equivalent to Git, and the new bridge overlays remain repository-only.

The GO is only for a separately reviewed bridge-foundation activation. It does not authorize `agents.resume`, Ana activation/resume, Human Send or Gateway outbound. If the current short-lived Actions artifacts expire or disappear, provenance must be re-established before any live mutation.

## Activation Execution V1 pre-mutation amendment

ADR 0121 adds two mandatory pre-mutation gates discovered after ADR 0120 merged: reclaim proven disposable runtime headroom / remove the old host-network Paperclip proof listener while preserving proof volumes, and create a fresh current Paperclip DB + `master.key` recovery snapshot with disposable restore/decrypt/state proof. The latest previous snapshot predates the current MEDICSPRO Ana.
## Activation Execution V1 partial production checkpoint

ADR 0122 records that ADR 0121 Gates A-C are GREEN, the fresh scoped Wandora backup/rehearsal is GREEN, and **migration 014 is now LIVE and independently verified**.

The execution stopped at the next step because the execution platform blocked creation of the dedicated bridge HMAC before remote dispatch. No bypass was attempted.

Current bridge-foundation boundary at this checkpoint:

```text
migration 014          = LIVE / verified
bridge HMAC             = not created by this execution
Core bridge             = OFF / not promoted
Paperclip bridge overlay= not activated
wandora_mastra          = not installed live
agents.resume           = absent
Ana                     = exactly 1 / paused + supervised
Human Send              = OFF
Gateway outbound        = OFF
outbound attempts       = 0
```

Continuity rule: **never repeat migration 014 on resume merely because the HMAC/runtime portion remains incomplete.** Reconcile first and continue from the HMAC custody gate.

## Production execution bridge activation V1 — COMPLETE

ADR 0125 records completion of the Paperclip -> Wandora/Mastra production execution bridge foundation on `main@72bcd60eb8428f6210bd2aae0532edabd2c75c5f`.

The final live path is:

```text
Paperclip control plane
-> wandora_mastra external adapter
-> dedicated Paperclip/Core HMAC boundary
-> Wandora Core resolver/policy boundary
-> existing Agent Runtime / Mastra execution boundary
```

Migration 014 is live/verified and must not be replayed. The host bridge HMAC remains `root:wandora-ops / 0640`. Paperclip uses the corrected startup wrapper to copy the secret into non-persistent tmpfs as `0400 uid:gid 1000:1000` before the original non-root application startup. Core and Paperclip are healthy with zero restarts at the final checkpoint.

`wandora_mastra@0.1.0` is installed exactly once from the retained hash-addressed local package path and official `test-environment` is PASS.

Safety state remains frozen:

```text
Ana = exactly 1 / paused + supervised
Paperclip Ana = paused
wakeups = 0
heartbeat runs = 0
agents.resume = absent
Human Send = OFF
Gateway outbound = OFF
MEDICSPRO outbound attempts = 0
```

The bridge being live is **not** permission to execute Ana or send messages.

## Paperclip + Mastra capability canonicalization — CURRENT

ADR 0126 adds the canonical capability maps:

- `docs/PAPERCLIP_CAPABILITY_MAP.md`;
- `docs/MASTRA_CAPABILITY_MAP.md`;
- `docs/CAPABILITY_COLLISION_MATRIX.md`.

Durable split:

```text
Paperclip = organizational control plane
Mastra    = execution runtime
Wandora   = customer contract, tenancy, policy, adapters and external effects
```

Key reuse decisions:

- Paperclip Routines own durable business recurrence;
- Paperclip tasks/issues own durable organizational work;
- Paperclip owns organizational Skills catalog/policy while Mastra may materialize runtime skills;
- Paperclip Decisions/Execution Policy govern control-plane work, not Wandora external-effect authorization;
- Paperclip Decision Training and Mastra Evals are different evidence layers;
- Paperclip Connections is the leading candidate for organizational connection/grant authority;
- Mastra `@mastra/connect` is not adopted as a competing authority.

Production now runs Paperclip `v2026.916.0` at `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca` / `sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced`. Mastra Core remains `1.66.0`.

ADRs 0127–0130 close the Paperclip v916 qualification, rollback preflight and production execution chain.

Current production result:

```text
Paperclip health/restarts = healthy / 0
migration ledger          = 278 / max 278
new migration rows        = 49
startup migration files   = 0231..0279 / applied
Organization Adapter      = 1 / ready / v0.1.0
wandora_mastra            = 1 / v0.1.0 / testEnvironment pass
MEDICSPRO Ana             = paused + supervised
Paperclip Ana             = paused
MEDICSPRO wakeups/runs    = 0 / 0
MEDICSPRO outbound        = 0
agents.resume             = absent
Human Send                = OFF
Gateway outbound          = OFF
```

The retained ADR 0129 recovery set remains authoritative. Because v916 migrations committed, image-only rollback to v831 is forbidden; rollback requires the schema-faithful PostgreSQL 18.1 pre-upgrade restore + matching `master.key` + exact frozen v831 runtime/extensions.

## Next executable slice

**Customer Owner First Real Tenant Digital-Employee Activation Readiness Refresh V1.**

Reconcile ADR 0116's earlier activation assumptions against the now-live Paperclip v2026.916.0 capability/authority maps and current runtime. Determine actual prerequisites before employee activation rather than adopting every new provider capability by default.

This is a readiness slice only. MEDICSPRO Ana must remain paused + supervised, `agents.resume` absent, Human Send OFF and Gateway outbound OFF unless a later separately reviewed activation execution explicitly changes those boundaries.
## Platform Admin

Platform Admin remains a separate Wandora operator trust plane and is not the current priority. ADR 0033 provisioning API work remains frozen unless explicitly reprioritized.

## Security invariants

- customer/product browsers never talk directly to Paperclip, Mastra, Evolution or privileged DB/admin APIs; protected operator consoles are a separate operator-only surface;
- provider IDs/contracts never become customer-facing Wandora contracts;
- no production credential merely because a role/table/adapter exists;
- outbound remains OFF unless deliberately activated by a separate reviewed step;
- uncertain effects are never blindly retried;
- secrets/tokens/private keys never enter Git;
- private services remain private unless a reviewed public contract says otherwise;
- tenant selectors are not authorization; Core reauthorizes every tenant request;
- merged migration != live migration.

## New-session bootstrap

1. read this file for orientation;
2. read `AGENTS.md` and the authority chain;
3. fetch current `main`;
4. inspect active PR/branch relevant to the requested work;
5. verify live runtime when deployment state matters;
6. classify target as REAL / PARTIAL / PLACEHOLDER / ABSENT;
7. apply Capability Reuse Gate;
8. execute decision -> adversarial review -> execution -> validation.

Do not ask the user to reconstruct decisions already documented unless evidence is genuinely missing or contradictory.

## Maintenance rule

Update this file when architecture authority, REAL customer surfaces, live topology relevant to continuity, selected providers/adapters, major safety invariants or the current executable slice materially changes.

Keep it compact. Detailed history belongs in ADRs/evidence docs.

## Paperclip v2026.916.0 production-upgrade execution checkpoint

ADR 0130 supersedes the mutable Paperclip production-version lines above.

```text
Paperclip          = v2026.916.0
source             = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
image ID           = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
health/restarts    = healthy / 0
migration ledger  = 278 / max 278
new migrations    = 49 / startup files 0231..0279

Organization Adapter = 1 / ready / v0.1.0
wandora_mastra       = 1 / v0.1.0 / testEnvironment pass

MEDICSPRO Ana      = paused + supervised
Paperclip Ana      = paused
wakeups/runs       = 0 / 0
agents.resume      = absent
Human Send         = OFF
Gateway outbound   = OFF
outbound attempts  = 0
```

The ADR 0129 protected recovery set remains retained. Production has crossed the migration boundary, so v831 image-only rollback is forbidden; v831 recovery requires the schema-faithful PostgreSQL 18.1 pre-upgrade restore + matching `master.key` + frozen runtime/extensions.

Post-upgrade acceptance used only the existing **Wandora Internal Supervised Proof** identity. The initial proof ran through Paperclip's normal heartbeat service so Paperclip minted the run-scoped JWT internally; the bounded on-demand run and one timer heartbeat that fired during the brief synthetic idle window both completed `succeeded`. During later chat-continuity recovery, before the already-existing PR #180 checkpoint was discovered, the same `WAN-1` proof path was invoked once more and run `3d316b82-eaa2-4ceb-a89e-f25e9263fec6` also completed `succeeded`. Final proof state is 3 succeeded runs total, agent `paused`, issue `cancelled`, pending runs/wakeups `0/0`, and proof outbound attempts unchanged at 4. A forged/tampered JWT was rejected with 401, and a live Core service check returned `UNKNOWN_MAPPING_FAIL_CLOSED=true` for an unmapped Paperclip company. The local-encrypted Organization Adapter path was proven by resolving the secret before deliberately rejecting an invalid signature. No MEDICSPRO employee or outbound effect was triggered.

No `wandora_mastra` repack, Organization Adapter behavior change or Mastra upgrade was bundled.

Next executable slice: **Customer Owner First Real Tenant Digital-Employee Activation Readiness Refresh V1**. It must reconcile the earlier activation preflight with v916 and the capability maps before any resume/activation.

## Canonical documents

- `AGENTS.md`
- `docs/CAPABILITY_AUTHORITY.md`
- `docs/architecture.md`
- `docs/CANONICAL_STATE.md`
- `docs/PAPERCLIP_CAPABILITY_MAP.md`
- `docs/MASTRA_CAPABILITY_MAP.md`
- `docs/CAPABILITY_COLLISION_MATRIX.md`
- `docs/operations/paperclip-v2026-916-0-disposable-upgrade-compatibility-proof-v1.md`
- `docs/operations/paperclip-v2026-916-0-production-upgrade-execution-v1.md`
- ADR 0034 — state-first continuity
- ADR 0036 — capability authority/reuse gate
- ADR 0037 — Paperclip/Wandora/Mastra execution bridge
- ADR 0038 — Organization Adapter private state
- ADR 0039 — Managed Catalog Organization Adapter V1
- ADR 0056 — Paperclip Provider Company Bootstrap V1
- ADR 0057 — Organization Adapter Production Activation Preflight V2 Closure
- ADR 0059 — Organization Adapter Execution V1 internal canary
- ADR 0060 — Organization Adapter Live Core Promotion V1
- ADR 0063 — Customer Digital-Employee Lifecycle Contract Preflight V1
- ADR 0064 — Customer Hire Contract Implementation V1
- ADR 0065 — Customer Hire Canary Selection + Legacy Reconciliation Preflight V1
- ADR 0066 — Private Tenant Provisioning V2 Employee-Free Contract Implementation V1
- ADR 0067 — Private Tenant Provisioning V2 Production Migration Preflight V1
- ADR 0068 — Private Tenant Provisioning V2 Production Migration Execution V1
- ADR 0069 — Customer Hire Canary Employee-Free Tenant Provisioning Preflight V1
- ADR 0070 — Customer Hire Canary Employee-Free Tenant Provisioning Execution V1
- ADR 0071 — Customer Hire Canary Paperclip Provider Company Bootstrap Preflight V1
- ADR 0072 — Customer Hire Canary Paperclip Provider Company Bootstrap Execution V1
- ADR 0073 — Customer Hire Canary Organization Adapter Custody + Config + Binding Preflight V1
- ADR 0074 — Paperclip Local-Encrypted Secret Recovery Snapshot Preflight V1
- ADR 0075 — Paperclip Local-Encrypted Secret Recovery Snapshot Execution V1
- ADR 0076 — Customer Hire Canary Organization Adapter Custody + Config + Binding Execution V1
- ADR 0077 — Customer Hire Canary Private Candidate Core Hire Preflight V1
- ADR 0078 — Customer Hire Canary Private Candidate Core Hire Execution V1
- ADR 0079 — Customer Digital-Employee Hire Public Rollout Preflight V1
- ADR 0080 — Customer Digital-Employee Hire Tenant Eligibility Contract Implementation V1
- ADR 0081 — Customer Digital-Employee Hire Production Activation Preflight V2
- ADR 0082 — Customer Digital-Employee Hire Dormant Production Foundation Activation V1
- ADR 0083 — Customer Digital-Employee Hire Global Runtime Gate Activation Preflight V1
- ADR 0084 — Customer Digital-Employee Hire Global Runtime Gate Activation Execution V1
- ADR 0085 — Customer Digital-Employee Hire First Tenant Eligibility Rollout Preflight V1
- ADR 0086 — Customer Digital-Employee Hire Clean Tenant Rollout Candidate Preparation Preflight V1
- ADR 0087 — Customer Owner Invite Acceptance + First Password Contract Implementation V1
- ADR 0088 — Customer Owner Interrupted Invite Recovery Contract Preflight V1
- ADR 0089 — Customer Owner Interrupted Invite Recovery Contract Implementation V1
- ADR 0090 — Customer Owner Invite + Recovery Production Activation Preflight V1
- ADR 0091 — Customer Owner Recovery Edge Anti-Abuse Control Preflight V1
- ADR 0092 — Customer Owner Recovery Edge Anti-Abuse Credential + Activation Execution V1 Pre-Mutation Credential Gate
- ADR 0093 — Customer Owner Recovery Edge Anti-Abuse Credential + Activation Execution V1
- ADR 0094 — Customer Owner Invite + Recovery Web Production Activation Execution V1
- ADR 0095 — Customer Owner First Real Access End-to-End Validation Preflight V1
- ADR 0096 — Customer Owner Transactional E-mail Delivery Foundation Preflight V1
- ADR 0097 — Customer Owner Transactional E-mail Sender Domain + Credential Provisioning Execution V1
- ADR 0098 — Customer Owner Transactional E-mail GoTrue SMTP Activation Preflight V1
- ADR 0099 — Customer Owner Transactional E-mail GoTrue SMTP Activation Execution V1
- ADR 0100 — Customer Owner First Real Invite Execution Preflight V1
- ADR 0101 — Customer Owner First Real Invite Execution V1
- ADR 0102 — Customer Owner First Invite Acceptance + First Password Validation V1
- ADR 0103 — Customer Owner First Real Tenant Provisioning Preflight V1
- ADR 0104 — Customer Owner First Real Tenant Provisioning Execution V1
- ADR 0105 — Customer Owner First Real Tenant Access Validation V1
- ADR 0106 — Customer Owner First Real Tenant Paperclip Company Bootstrap Preflight V1
- ADR 0107 — Customer Owner First Real Tenant Paperclip Company Bootstrap Execution V1
- ADR 0108 — Customer Owner First Real Tenant Organization Adapter Custody + Config + Binding Preflight V1
- ADR 0109 — Customer Owner First Real Tenant Paperclip Local-Encrypted Recovery Snapshot Refresh Execution V1
- ADR 0110 — Customer Owner First Real Tenant Organization Adapter Custody + Config + Binding Execution V1
- ADR 0111 — Customer Owner First Real Tenant Eligibility Rollout Preflight V1
- ADR 0112 — Customer Owner First Real Tenant Eligibility Rollout Execution V1
- ADR 0113 — GitHub Actions Self-Hosted Runner Isolation V1
- ADR 0114 — Customer Owner First Real Tenant Digital-Employee Hire Execution Preflight V1
- ADR 0115 — Customer Owner First Real Tenant Digital-Employee Hire Execution V1
- ADR 0116 — Customer Owner First Real Tenant Digital-Employee Activation Preflight V1
- ADR 0117 — Paperclip -> Wandora/Mastra Production Execution Bridge Contract Implementation V1
- ADR 0118 — Paperclip -> Wandora/Mastra Production Execution Bridge Activation Preflight V1
- ADR 0119 — Paperclip -> Wandora/Mastra Production Execution Bridge Runtime Custody + Readiness + Disposable E2E Attestation Implementation V1
- ADR 0120 — Paperclip -> Wandora/Mastra Production Execution Bridge Activation Preflight V2
- ADR 0121 — Paperclip -> Wandora/Mastra Production Execution Bridge Pre-Mutation Recovery + Host Hygiene Gate
- ADR 0122 — Paperclip -> Wandora/Mastra Production Execution Bridge Activation Execution V1 Partial Checkpoint
- ADR 0123 — Paperclip -> Wandora/Mastra Production Execution Bridge Secret Custody Privilege-Drop Correction
- ADR 0124 — Paperclip Bridge Wrapper Command Preservation Correction
- ADR 0125 — Paperclip -> Wandora/Mastra Production Execution Bridge Activation Execution V1 Complete
- ADR 0126 — Paperclip + Mastra Capability Canonicalization, Authority Collision Audit + Paperclip Upgrade Preflight V1
- ADR 0127 — Paperclip v2026.916.0 Disposable Upgrade Compatibility Proof V1 Partial Checkpoint
- ADR 0128 — Paperclip v2026.916.0 Disposable Upgrade Compatibility Proof V1 Complete
- ADR 0129 — Paperclip v2026.916.0 Production Upgrade Preflight V1
- ADR 0130 — Paperclip v2026.916.0 Production Upgrade Execution V1 Complete
- current Git `main`
- current runtime/container state when deployment facts matter

## One-line memory anchor

> **Wandora owns the customer/operator contract; specialist components lend capabilities behind Wandora adapters. Verify real state first, reuse before rebuilding, persist only minimum Wandora-owned safety/state, and never let local implementation convenience redefine the architecture.**

## Customer Owner First Real Tenant Digital-Employee Activation Readiness Refresh V1

ADR 0131 refreshed the first real activation boundary against live Paperclip v2026.916.0.

Resolved from ADR 0116:

- the Paperclip -> Wandora/Mastra execution bridge is live and healthy;
- `wandora_mastra@0.1.0` is installed exactly once and v916-qualified;
- the old missing-adapter blocker is closed.

Still blocked:

- the Organization Adapter manifest intentionally still lacks `agents.resume`;
- Core/Web still have hire/read but no customer-owner activation contract/action.

Exact v916 source inspection proves that Paperclip resume changes a paused agent to `idle` without issuing a wakeup, and managed reconcile does not silently repause an already resumed agent. Therefore Paperclip remains lifecycle authority; Wandora should not build a parallel lifecycle.

The minimum next implementation is a signed company-scoped Organization Adapter action constrained to the fixed managed Ana plus a Wandora owner/admin activation contract that reconciles provider state before the local `paused -> active` projection. No activation journal is approved absent further evidence: native resume is convergent and ambiguous responses can be resolved by exact readback.

Current safety state remains:

```text
MEDICSPRO Ana / Wandora   = paused + supervised
MEDICSPRO Ana / Paperclip = paused
wakeups/runs              = 0 / 0
agents.resume             = absent
Human Send                = OFF
Gateway outbound          = OFF
outbound attempts         = 0
```

Next executable slice: **Customer Owner First Real Tenant Digital-Employee Activation Contract Implementation V1**. It is implementation/qualification only and must not resume the real MEDICSPRO Ana.

## 2026-09-20 checkpoint — Activation Production Preflight V1

ADR 0133 completed the **Customer Owner First Real Tenant Digital-Employee Activation Production Preflight V1 — NO EFFECT**.

Current production remains dormant: migration 015 absent; Organization Adapter v0.1.0 live without `agents.resume`; activation gate OFF; Ana MEDICSPRO `paused + supervised` / Paperclip `paused`; wakeups, heartbeat runs, open routine runs and outbound attempts all zero; Human Send and Gateway outbound OFF.

The live-derived disposable rehearsal qualified migration 015, its verifier and restore rollback. Exact Core/Web/Organization Adapter v0.2.0 candidate provenance and current rollback anchors are frozen in ADR 0133. Activation adds only Paperclip `agents.resume`; it does not invoke work or Mastra.

Next slice: **Customer Owner First Real Tenant Digital-Employee Activation Production Execution V1**, with a fresh execution-time backup and fresh pre-resume gates before any lifecycle effect.


## Current real-customer activation checkpoint — 2026-09-20

The first real MEDICSPRO digital employee activation is complete under ADR 0135.

Current production checkpoint:

```text
canonical main entering checkpoint docs = 3f9f6a580f6e2cadab20cd375c9bee4255344093

MEDICSPRO Wandora Ana = active + supervised
MEDICSPRO Paperclip Ana = idle / wandora_mastra

migration 015 = live / verifier green
Organization Adapter = v0.2.0 / ready / agents.resume present
Core = organization-adapter-candidate-8d2a53e3c264
Web = candidate-eda946c36ec4
Paperclip = v2026.916.0

Human Digital-Employee Activation = ON
Human Send = OFF
Gateway outbound = OFF
```

The production activation was executed exactly once through the normal authenticated customer-owner Web flow.

A Web candidate Auth-build defect was discovered before the lifecycle effect, failed closed, and was corrected by PR #185 / ADR 0134. Real owner login then succeeded before activation resumed.

Post-activation evidence proves:

```text
Wandora Ana active + supervised
Paperclip Ana idle
wakeups = 0
heartbeat runs = 0
routine runs = 0
task sessions = 0
runtime last_run_id = null
runtime tokens/cost = 0
run identity contexts = 0
outbound attempts = 0
```

Therefore activation did not invoke Mastra or create execution work.

Continuity rule: do not repeat activation after chat failure. Reconcile the real Wandora/Paperclip states first. The next work must be a new, explicitly reviewed post-activation operational slice; do not manufacture work or enable outbound merely to prove that Ana is active.

## First legitimate active-employee work boundary — ADR 0136

The first post-activation MEDICSPRO work preflight is complete without creating work.

Fresh live state remained:

```text
Wandora Ana       = active + supervised
Paperclip Ana     = idle / wandora_mastra
assigned issues   = 0
wakeups/runs      = 0 / 0
routine runs      = 0
task sessions     = 0
runtime last run  = null
runtime cost      = 0
outbound attempts = 0
Human Send        = OFF
Gateway outbound  = OFF
```

The first legitimate work must originate from a real authenticated MEDICSPRO owner instruction through a Wandora-owned customer contract. Paperclip remains the durable work authority:

```text
owner intent
-> Wandora authorization + stable request/idempotency boundary
-> company-scoped Organization Adapter
-> Paperclip issue + assignment wakeup/run
-> run-scoped identity
-> wandora_mastra -> Core -> Agent Runtime -> Mastra
-> supervised internal result
-> Wandora customer-safe projection
-> STOP before external effect
```

The live Organization Adapter does not yet have Paperclip `issues.read/create/wakeup`, and Core/Web do not yet expose a customer-safe Paperclip work admission/result projection. Existing `wandora.work_items` remain part of the proven messaging supervision slice; do not expand them into a competing Paperclip task engine.

Because issue creation and execution wake are distinct Paperclip effects and generic plugin issue creation has no first-class create idempotency key, the next implementation may add only the **minimum Wandora integration-safety journal** required to reconcile ambiguous outcomes. It must not clone Paperclip task lifecycle.

First real work execution remains blocked until that contract is implemented, qualified and promoted separately. Human Send and Gateway outbound remain independent Wandora-owned effect gates and stay OFF.

Next executable slice: **Customer Owner First Real Tenant Active Digital-Employee First Legitimate Work Contract Implementation V1 — NO REAL WORK**.


## First legitimate work contract implementation — ADR 0137

The first customer-owner work contract is repository-qualified with PR #188 head `21ba162b463dbdeb6be3c84419c46afa0d465335` and **7/7 GREEN** workflows.

The accepted ownership split is:

```text
Wandora
  customer intent / auth / tenant policy
  stable work request + minimum reconciliation receipt
  supervised customer result projection

Paperclip
  durable issue/task
  assignment
  dispatch/wakeup/run

Mastra
  execution-local reasoning/workflow behind the existing Agent Runtime
```

Candidate components remain dormant in production:

- migration 016 is not live;
- Organization Adapter v0.3 is not promoted;
- `wandora_mastra@0.2.0` is not promoted;
- `WANDORA_HUMAN_DIGITAL_EMPLOYEE_WORK_ENABLED` is OFF/absent;
- Human Send and Gateway outbound remain OFF.

Final read-only production proof still shows exactly one MEDICSPRO Ana, `active + supervised` in Wandora and `idle / wandora_mastra` in Paperclip, with zero assigned issues, wakeups, heartbeat runs, routine runs, task sessions, runtime usage/cost and outbound attempts.

Next executable slice: **Customer Owner First Real Tenant Active Digital-Employee First Legitimate Work Production Preflight V1 — NO EFFECT**.


## First legitimate work Production Preflight V1 — ADR 0138

The no-effect production preflight is complete and GREEN.

Current canonical repository checkpoint after the preflight hardening:

```text
PR #190 head  = 768be4e0177f52cbc957a517640457a4b6905a2a
PR #190 CI    = 5 / 5 GREEN
main          = e867585622abd0ee020bf45756eda6b53ef4fec8
```

The preflight hardened first-work idempotency before any live promotion:

- Core concurrent same-key admission converges to one Wandora work + one provider effect;
- browser idempotency survives timeout, refresh, duplicate submit and 503 while storing only opaque UUID + SHA-256 fingerprint;
- migration 016 passed double-apply + canonical verifier on a production-derived disposable restore;
- final Core/Web candidates are immutable CI artifacts;
- Organization Adapter v0.3 and `wandora_mastra@0.2.0` remain the qualified provider-side candidates from ADR 0137.

Production is still unchanged:

```text
Wandora Ana       = active + supervised
Paperclip Ana     = idle / wandora_mastra
migration 016     = absent
work gate         = OFF
issues/runs       = 0 / 0
sessions/routines = 0 / 0
outbound attempts = 0
Human Send        = OFF
Gateway outbound  = OFF
```

Paperclip v2026.916.0 source inspection added two execution constraints:

1. replacing external `wandora_mastra` requires a Paperclip restart before continuing;
2. same-key local plugin install does not itself perform the capability-escalation approval semantics expected from the generic upgrade comments.

ADR 0138 therefore explicitly freezes the exact Organization Adapter v0.3 capability set and the production promotion order.

Next executable slice:

**Customer Owner First Real Tenant Active Digital-Employee First Legitimate Work Production Execution V1 — NO REAL WORK**

Promotion must stop after enabling and validating the customer-work contract. Do not manufacture a work request. The first real work must come from a genuine authenticated MEDICSPRO owner instruction and still stops before external effect.

## Model Provider / Mistral supervised assigned-work foundation — ADR 0142

ADR 0142 qualifies the first real model-provider boundary in repository code/CI while keeping production unchanged.

Accepted path:

```text
owner work
-> Wandora admission
-> Organization Adapter
-> Paperclip issue/run
-> wandora_mastra
-> Core execution bridge
-> Mastra Agent
-> Mistral V1 model provider
-> structured supervised internal summary
-> STOP before external effect
```

The V1 runtime mode is `mastra-supervised-model`; provider/model are pinned to `mistral / mistral-small-2603` behind a file-backed operator secret. The customer result uses only `wandora-supervised-v1`, not provider identity.

Important containment:

- supervised inbound/WhatsApp remains deterministic and does not gain model-provider egress;
- only Paperclip assigned-work `title` + `description` may enter the provider request;
- provider request deadline is 45 seconds;
- `wandora_mastra@0.3.0` candidate bridge deadline is 60 seconds;
- automatic model retries are disabled;
- Human Send and Gateway outbound are unchanged and remain OFF.

Qualification evidence:

```text
focused runtime tests = 8 / 8 GREEN
Paperclip adapter contract = 1 / 1 GREEN
canonical Core disposable verifier = 126 / 126 GREEN
post-migration work/adapter harness = 30 / 30 GREEN
```

Fresh production readback still shows `mastra-deterministic`, no model-provider env/secret, exactly one MEDICSPRO Ana `active + supervised`, work journal 0, outbound attempts 0 and live `wandora_mastra@0.2.0`.

Next slice after merge/CI: **Model Provider / Mistral Production Credential Custody + Disposable Real-Provider Attestation Preflight V1**. It may custody a fresh key and perform one synthetic non-customer provider call, but must stop before live runtime activation or real MEDICSPRO work.


## Mistral real-provider attestation preflight — GREEN / PRODUCTION DORMANT

ADR 0143 closes **Model Provider / Mistral Production Credential Custody + Disposable Real-Provider Attestation Preflight V1**.

Canonical repository base for the proof:

```text
main = 82ea046ede32605f8d5511ef06bc47ecf060d2ea
```

The intended Mistral key is now custodied only at:

```text
/opt/wandora/stacks/core/secrets/wandora_model_provider_api_key
mode 0640 / wandora-admin:wandora-ops
```

It is **not mounted into the live Core**.

One synthetic non-customer invocation through the exact qualified Core candidate succeeded against `mistral-small-2603`:

```text
logical model      = wandora-supervised-v1
input tokens       = 222
output tokens      = 44
total tokens       = 266
cached input tokens= 0
exit               = 0
```

Post-call production remains:

```text
Core runtime        = mastra-deterministic
model env/key mount = absent
Human Send          = OFF
Gateway outbound    = OFF
MEDICSPRO Ana       = exactly 1 / active + supervised
work journal        = 0
outbound attempts   = 0
Paperclip Ana       = idle / wandora_mastra
issues/wakeups/heartbeat runs/task sessions/routines/routine runs = 0
Paperclip runtime session/run = null/null
Paperclip runtime token/cost counters = 0
```

An earlier operator-entered credential was not the intended current key and is not provider-qualification evidence. It was replaced through the same reviewed custody path; only the later intended-key success is canonical.

### NEXT EXECUTABLE SLICE

**Model Provider / Mistral Production Runtime Activation Preflight V1 — NO EFFECT**

Reconcile live adapter version/provenance, freeze the `wandora_mastra@0.3.0` + 60s bridge-timeout promotion, freeze the Core model overlay + read-only secret mount, prove rollback/order and outbound boundaries, and stop before changing live Paperclip or Core.


## 2026-09-21 — AI runtime portability checkpoint (ADR 0144)

The model-provider foundation is provider/runtime replaceable by contract. Concrete Mistral provider/model/base URL are internal runtime configuration; the stable Wandora result identity is the logical profile `wandora-supervised-v1`.

The Agent Runtime result now includes normalized token usage so a future Runtime X can map its native usage without changing Paperclip/customer contracts. No usage history/cost field was persisted because no consumer requirement yet justifies it.

The current Mistral API key is a Wandora platform credential even though its transitional host path sits under the Core stack. It remains unmounted from live Core until a separately reviewed activation.

Paperclip operational budgets, Mastra/runtime execution guardrails and Wandora commercial billing remain distinct authorities. Paperclip v2026.916.0 has native budgets/cost events/secrets/connections, while Mastra 1.66 has version support for token limiting and TokenCostControl; the latter is not yet operational because Wandora has not installed/configured Mastra observability plus durable observability storage.

## ADR 0145 — Model Provider / Mistral Production Runtime Activation Preflight V1

Status: **NO-GO for production activation / NO EFFECT preflight complete.**

The preflight starting from `main@d5f98ed92a29b351b243c4873bf17a2d13cdfc78` qualified the exact current-main Core candidate, `wandora_mastra@0.3.0` promotion, host-side platform-secret injection, local readiness/fail-closed behavior, 45s provider deadline < 60s bridge timeout, zero automatic provider retry, provider-error handling and Runtime-X portability without changing production.

Production remains deliberately unchanged:

```text
Core runtime        = mastra-deterministic
model provider env  = absent
model key mount     = absent
live wandora_mastra = 0.2.0
Human Send          = OFF
Gateway outbound    = OFF
MEDICSPRO work      = 0
MEDICSPRO outbound  = 0
Ana                 = active + supervised / Paperclip idle
Paperclip run state = zero
```

The only activation blocker is aggregate cost governance. Paperclip has native budget enforcement, but the Core/Mastra path does not currently emit an authoritative billed-cents cost event into Paperclip; the Paperclip cost-event contract requires caller-supplied `costCents`. Mastra native cumulative cost control is not yet production-qualified because its observability/storage prerequisites are not configured. Per-execution controls (single step, max output 768, 45s deadline, zero retry, bounded task input) are GREEN but are not an aggregate spend ceiling.

Do **not** create a Wandora provider-pricing table, cost engine, second budget ledger, model router or tenant secret manager to close this gap.

Next canonical slice:

**Model Provider Runtime Native Cost Governance Qualification V1 — NO EFFECT**

It must choose the minimum Mastra/Paperclip-native aggregate spend guard using synthetic/disposable evidence only. Production Core must remain deterministic; the Mistral secret must remain unmounted; Mistral must not be called. Only after that slice is GREEN may a separate Model Provider / Mistral Production Runtime Activation Execution V1 be authorized.

## ADR 0146 — Model Provider Runtime Native Cost Governance Qualification V1

The ADR 0145 cost-governance architecture gap is resolved without adding a Wandora pricing/cost engine.

Canonical authority is now:

~~~text
Mistral Workspace spending limit = hard aggregate provider-spend boundary
Mastra / Agent Runtime           = per-execution technical guardrails
Paperclip                        = organizational operational budgets / billed-cents ledger
Wandora                          = commercial plan / price / margin / billing
~~~

Current official Mistral documentation proves that API keys are scoped to a Workspace and Workspace monthly spending limits reject requests with HTTP 429 when exhausted. A disposable local synthetic 429 through the exact qualified Wandora runtime made one request and zero retries.

Mastra TokenCostControl is not accepted as the hard financial ceiling because its cumulative observability path is approximate and can fail open. Paperclip v2026.916.0 currently budgets billed_cents and requires caller-supplied costCents, so Wandora must not invent provider pricing merely to feed that ledger.

Production remains dormant and unchanged. Before model-runtime activation, the real host-custodied production key must be proven to belong to a dedicated Mistral production Workspace with an explicit finite monthly spending limit. That proof is the next separate NO EFFECT slice.

## ADR 0147 — Provider-Neutral Runtime Risk Guard + Cost Governance Correction V1

ADR 0147 restores ADR 0144's provider/runtime replaceability as the controlling activation architecture.

The Mistral Workspace spending-limit capability found in ADR 0146 remains valid provider-specific defense in depth, but it is no longer a universal prerequisite for activating the model-backed runtime. Wandora must not make one provider's account model part of the stable Agent Runtime contract.

Canonical activation guard:

~~~text
bounded admitted work
+ exact tenant/employee/run identity
+ maxSteps = 1
+ maxRetries = 0
+ bounded output
+ provider deadline < bridge deadline
+ structured output
+ fail-closed ambiguity
+ no implicit provider fallback
+ no external effect
~~~

Paperclip retains organizational work/run/budget authority. Provider-account financial controls are applied when appropriate to that provider/commercial exposure. Wandora retains logical AI profile, customer policy/entitlement, commercial billing and effect authorization.

No production mutation was performed by the correction. The separate **Model Provider / Mistral Production Runtime Activation Execution V1** is now architecturally GO, but must freshly reconcile state, promote `wandora_mastra@0.3.0` before Core, switch Core only after Paperclip is healthy, keep Human Send/Gateway outbound OFF and stop before first customer work.

## 2026-09-21 — Model-backed production runtime activated (ADR 0148)

The production Agent Runtime activation is complete.

~~~text
Wandora stable logical profile = wandora-supervised-v1
current Agent Runtime          = Mastra-backed
current provider/model         = Mistral / mistral-small-2603

Core                           = healthy / ready
Core runtime                   = mastra-supervised-model
wandora_mastra                 = 0.3.0 / exactly one / loaded
Paperclip                      = v2026.916.0 / healthy

Human Send                     = OFF
Gateway outbound               = OFF
~~~

The platform credential remains Wandora-owned host custody and is mounted read-only into Core. Provider/model identity remains implementation detail under ADR 0144/0147; this activation does not make Mistral or Mastra part of the customer contract.

Activation itself produced no work/run/model usage:

~~~text
MEDICSPRO Ana / Wandora = active + supervised
MEDICSPRO Ana / Paperclip = idle
work operations = 0
outbound attempts = 0
issues/wakeups/heartbeat runs/task sessions/routines/routine runs = 0
runtime session/run = null/null
runtime tokens/cost = 0
model usage events during activation = 0
~~~

Exact rollback state is retained under:
`/home/wandora-admin/executions/model-provider-runtime-activation-execution-v1-20260921/rollback`.

### NEXT EXECUTABLE EFFECT SLICE

**Customer Owner First Real Tenant Active Digital-Employee First Model-Backed Legitimate Work Execution V1**

It must be separately authorized. Admit at most one legitimate owner-driven MEDICSPRO work request through the existing Wandora -> Paperclip -> Agent Runtime path, keep Human Send and Gateway outbound OFF, and stop at the supervised result. No recurring/unattended/bulk model-backed work is authorized by ADR 0148.


## 2026-09-21 — First model-backed legitimate work effect gate (ADR 0149)

Fresh production reconciliation after ADR 0148 found no drift: Core/Paperclip/Web/Gateway healthy, `wandora_mastra@0.3.0` unique/loaded, logical profile `wandora-supervised-v1`, current Mistral implementation mounted read-only, exactly one MEDICSPRO Ana active+supervised / Paperclip idle, and all work/run/usage/outbound counters still zero.

The technical bounded-work contract is ready, including one-step execution, zero automatic model retries, structured bounded output, 45s provider deadline under the 60s bridge timeout, exact run identity and fail-closed uncertain replay.

No real work was executed because the accepted customer-work authority requires the exact title and description to originate from the authenticated MEDICSPRO owner through the Wandora customer surface. The operator must not manufacture the first task or impersonate the owner session. Human Send and Gateway outbound remain OFF.

Next effect remains one genuine owner-submitted MEDICSPRO work request through Wandora -> Paperclip -> `wandora_mastra` -> Core -> Agent Runtime -> current provider -> supervised result -> STOP.


## First real model-backed MEDICSPRO work — result valid, lifecycle deviation contained (ADR 0150)

The authenticated MEDICSPRO owner has now submitted the first genuine commercial work through the Wandora customer surface. Wandora admitted exactly one work operation and recorded a supervised `wandora-supervised-v1` result.

Core observed exactly one real inference through the current implementation:

```text
provider/model = mistral / mistral-small-2603
input/output   = 333 / 372
cached/total   = 0 / 705
model calls    = 1
```

Human Send and Gateway outbound remained OFF and outbound attempts stayed zero.

Paperclip historical truth is deliberately not normalized away: MED-1 had one intended successful run followed by one native `issue_continuation_needed` recovery run. The recovery run was rejected by Wandora's exact-run binding with HTTP 409 before Agent Runtime/model execution. The issue became blocked and no third run appeared.

Root cause: live `wandora_mastra@0.3.0` is a legacy/direct adapter. Its successful result did not terminalize the Paperclip issue, so Paperclip's own stranded-issue scheduler correctly interpreted the assigned open issue as needing a continuation.

PR #204 qualifies the provider-neutral lifecycle correction in `wandora_mastra@0.4.0`:

- Core normalized usage is returned to Paperclip as per-run adapter usage;
- after the exact supervised result has been committed, the same run-scoped Paperclip identity marks the exact customer-work issue `done`;
- the self-call uses Paperclip's resolved local listener, never the public URL/Traefik/customer input;
- ambiguous issue completion performs readback before any repeat;
- issue-completion recovery cannot replay Core/model execution.

Pinned disposable Paperclip proof is GREEN for one customer-work run, zero continuation recovery and usage `11|7|2`.

This repository qualification does not promote production. Live Paperclip still has `wandora_mastra@0.3.0`. The legitimate MEDICSPRO work must not be replayed.

### NEXT EXECUTABLE SLICE

**Paperclip Customer-Work Terminal Disposition + Usage Adapter Production Promotion Preflight V1 — NO EFFECT**

Reconcile live historical work/model/outbound state, freeze the immutable 0.4.0 artifact and rollback, determine whether/how MED-1 may be terminalized without wakeup, and stop before production mutation or any new customer/model work.


## Paperclip customer-work terminal disposition + usage adapter promotion preflight — ADR 0151

The first-work lifecycle remediation is now production-preflight qualified without changing live runtime.

Exact current-main candidate:

```text
wandora_mastra = 0.4.0
main           = c44634ea8f03b491db32fbde9917a2b7a7fcbd16
tgz sha256     = 6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c
```

Exact live rollback was frozen before any promotion:

```text
live adapter = wandora_mastra@0.3.0
live tgz hash= 78e4b57ee2f12a898f697f5b9c491e820d8f68d589fce55a3fdde1fc4ed82798
registration = exactly one / loaded
test-environment = pass
```

The protected Paperclip Board/instance-admin credential store remains `/paperclip/operator-cli/activation-v1/auth.json`, mode 0600, and is used only by reference with explicit private API base `http://127.0.0.1:3100`; its value was not read or copied.

Official CLI readback proves MED-1 is still blocked but quiescent: no live runs, no active recovery, no blockers/review path, no checkout/execution run. A future repair will use only the official board `issue update --status done` path after 0.4.0 is healthy. No direct SQL, no agent run token, no comment/resume/reassignment, no replay of the original work.

The live `v2026.916.0` OpenAPI and pinned source also qualify Paperclip's native instance Task Drain for the future execution: it holds new run admission while the current process drains and must report `quiescent=true` before restart. The drain is process-memory state and is cleared by restart, so it is not treated as a persistent maintenance lock.

Preflight effects remained zero: no Task Drain mutation, adapter install, Paperclip restart, issue mutation, work/run/model call, migration or outbound action occurred.

The next executable slice is the separately reviewed **Paperclip Customer-Work Terminal Disposition + Usage Adapter Production Promotion Execution V1**, following the frozen runbook.

## 2026-09-21 — Paperclip capability reuse / provider portability audit + companion Core correction

The Paperclip capability audit now establishes the following canonical direction:

```text
Wandora
  = customer/product semantic authority
  = stable IDs and employee identity
  = customer work/result contract
  = commercial policy/billing
  = final external-effect authorization

Paperclip
  = current specialist operational control-plane provider
  = issue/run/routine/skills/policy/budget/etc. authority where adopted

wandora_mastra
  = Paperclip external runtime adapter

Wandora Agent Runtime
  = stable execution boundary

Mastra / Mistral
  = current replaceable runtime/model implementation
```

Use Paperclip adapters/plugins/connectors as provider-side implementation mechanisms when they fit the capability. Do not expose Paperclip IDs/state machines as customer-facing Wandora contracts.

New generic Wandora subsystems that overlap Paperclip require the Capability Authority / Reuse Gate first. Portability is achieved with stable Wandora contracts + provider bindings + export/reconciliation, not a shadow Paperclip database.

Paperclip experimental features are QUARANTINE by default. Live production currently has Cases, Pipelines, Agent Chat and Chat Connectors disabled.

Pinned Paperclip company export/import is useful for provider exit, but its own export-fidelity report states approval history, cost history and activity history are not included. Exit strategy therefore uses native export + minimum Wandora binding/receipt manifest + targeted historical archive only where required.

Pinned v2026.916.0 also proves positive external-adapter usage creates Paperclip cost events. Events without authoritative cost remain `unpriced` with `costCents=0`; current Paperclip budgets observe only `billed_cents`. Do not confuse usage telemetry with monetary hard-stop enforcement.

### ADR 0153 correction to the pending production promotion

Read-only production inspection found the live Core bridge still returns only `executionId/model/summary`, not normalized usage.

Current main has the usage-return change in exactly one executable Core source file. The existing GREEN Core Candidate Artifact is executable-source equivalent to current main.

Therefore ADR 0151's adapter-only execution order is superseded by ADR 0153:

```text
fresh REAL NOW
-> native Paperclip Task Drain
-> companion Core image-only promotion
-> Core health/readiness + zero-activity validation
-> wandora_mastra@0.4.0 replacement
-> Paperclip-only restart
-> adapter validation
-> status-only MED-1 blocked -> done repair
-> prove historical runs=2 / model calls=1 / outbound=0
-> STOP
```

No new customer/model work is permitted merely to validate telemetry.

Current production remains unchanged:

```text
Paperclip = v2026.916.0 / wandora_mastra@0.3.0 / healthy
Core      = d5f98ed... image / mastra-supervised-model / healthy
MED-1     = blocked / quiescent
Paperclip historical runs = 2
Core historical model calls = 1
outbound = 0
Human Send = OFF
Gateway outbound = OFF
```

Research/decision set:

- `docs/decisions/0152-paperclip-capability-reuse-provider-portability-architecture-v1.md`
- `docs/decisions/0153-paperclip-customer-work-usage-companion-core-promotion-preflight-v1.md`
- `docs/research/PAPERCLIP_CAPABILITY_PORTABILITY_AUDIT_V1.md`
- `docs/research/PAPERCLIP_CAPABILITY_PORTABILITY_MATRIX_V1.md`
- `docs/research/PAPERCLIP_PROVIDER_EXIT_STRATEGY_V1.md`
- `docs/research/PAPERCLIP_OPENAPI_COMPATIBILITY_GATE_PROPOSAL_V1.md`
- `docs/research/PAPERCLIP_UPSTREAM_DELTA_AUDIT_2026-09-21.md`

The next production mutation remains a separate reviewed slice. Do not execute it merely because this audit is merged.


## 2026-09-21 — Customer-work terminal disposition + usage production promotion V2

ADR 0154 records the completed production promotion. The live Core is now `wandora/core:organization-adapter-candidate-61cbb34d4bfd` / `sha256:6c38930a45591970fd47d699c9881a9c9bd881272028268431ba3bf1c73c2873`, while Paperclip remains `wandora/paperclip:v2026.916.0` with exactly one loaded/enabled `wandora_mastra@0.4.0` and official test-environment PASS.

MED-1 was terminalized once through the protected Board status-only path from `blocked` to `done`. It still has exactly two historical Paperclip runs and no live run; their historical usage remains null because backfill was explicitly forbidden. The first legitimate work remains exactly one Wandora work and one model call. Outbound attempts remain zero, Human Send OFF and Gateway outbound OFF.

Prospective lifecycle + normalized usage now require/use the companion Core + adapter 0.4.0 pair. This does not make Paperclip monetary budget authoritative for provider spend: unpriced usage has `costCents=0`, and Wandora does not fabricate monetary cost.

A residual historical provider-state fact remains: Paperclip Ana is `error` with `errorReason=wandora_execution_failed_409`, last updated at the pre-promotion failed continuation. It was deliberately preserved. The next slice is a **Paperclip MEDICSPRO Ana Historical Error-State Reconciliation Preflight V1 — NO EFFECT** before admitting another legitimate work item.


## 2026-09-21 — MEDICSPRO Ana historical Paperclip error-state reconciliation preflight

ADR 0155 proves from exact Paperclip v2026.916.0 source that `error` is an invokable agent lifecycle state. The residual MEDICSPRO Ana `error / wandora_execution_failed_409` is a diagnostic projection of the old failed continuation run, not a blocker requiring resume/reassignment before another legitimate work item.

Live readback also proves Ana's scheduler is disabled/inactive, MED-1 is `done`, live runs and active recovery are empty, Wandora still has exactly one recorded work, and MEDICSPRO outbound attempts remain zero.

Paperclip's dedicated reconciliation primitive is Board-only `POST /api/agents/{id}/clear-error`; it performs `error -> idle` and preserves historical runs/runtime diagnostics. Plugin SDK exposes resume but not clear-error, and managed-agent reconcile does not auto-clear lifecycle errors.

Canonical decision: **NO-OP for readiness**. Do not clear/resume/pause/wake/retry/PATCH/SQL merely to normalize the display. If a future operator-facing cleanup becomes an explicit requirement, authorize it separately and use only the native `clear-error` path after fresh reconciliation.


## 2026-09-21 — second legitimate customer-work preflight found Organization Adapter gate drift

ADR 0156 closes a subtle gap left after ADR 0155: Paperclip v2026.916.0 correctly considers `error` invokable, but Organization Adapter 0.3.0 rejects any managed agent not literally `idle` before customer-work issue/wakeup admission.

The production artifact contains the same idle-only check as source. Therefore a second legitimate work must not be used to discover this incompatibility.

Decision: no lifecycle mutation. Implement a narrow compatibility correction so customer-work pre-admission accepts `idle | error`, still rejects `running` and other states, and still delegates final execution admission to Paperclip `issues.requestWakeup`.

Disposable proof of that minimal change passed 5/5 work-admission tests in the exact pinned Paperclip image, with no network or production data. The next slice is repository implementation only; production promotion remains separate.


## 2026-09-21 — Organization Adapter 0.3.1 historical-error work-admission compatibility

ADR 0157 implements the ADR 0156 correction without production effect. Customer-work pre-admission now accepts `idle | error`, still rejects `running` and other states, and still delegates final execution admission to Paperclip `issues.requestWakeup`.

The candidate remains capability-identical to 0.3.0 and changes no webhook/HMAC/origin/dispatch-receipt contract. Full pinned-image qualification passed 16/16 tests plus typecheck, artifact/manifest validation and reproducible packaging.

Qualified local candidate package hash: `49bc32b4d22b3000310e01db13c51a3348dc66774a4bf880571154136b3d0240`.

Live Organization Adapter remains 0.3.0. Promotion is a separate reviewed slice and no second customer work may run first.


## 2026-09-22 — Organization Adapter 0.3.1 production promotion preflight

ADR 0159 freezes the production-promotion path for the repository-qualified Organization Adapter 0.3.1.

Canonical candidate comes from GitHub-hosted Organization Adapter Plugin CI #232 on `main@d4d9ecc69cce33f6b0553b8372e576c56a4d91ac`: artifact ZIP SHA-256 `2a6bba462b4998736493eb70f00da90ba8f4d99117bbae384fbeb87467d9ce2f`; package SHA-256 `06a42a04dd0b6eff8ee377c1d4f1e40bbabce122767d0d77e92ee509d27d811d`.

Live remains 0.3.0. Promotion will use Paperclip-native soft uninstall (no purge) followed by one local-path reinstall from a new immutable content-addressed path. This preserves plugin ID/company config and dynamically reloads the worker in-process; a Paperclip restart is explicitly unnecessary and rejected.

No second legitimate work is authorized before the separate promotion execution completes and is revalidated.


## 2026-09-22 — Organization Adapter 0.3.1 live

ADR 0160 records the completed production promotion of `wandora.organization-adapter-v1` from 0.3.0 to 0.3.1.

The live plugin kept the same Paperclip plugin ID and company-scoped HMAC secret-ref config. The immutable 0.3.0 rollback package remains retained. Paperclip was not restarted: the native plugin lifecycle loaded the 0.3.1 worker in-process and logged `wandora_organization_adapter_ready`.

The historical Ana `error` projection was not cleared or resumed. MED-1/work/run/model/outbound counters did not change. The normal customer-work path can now admit Paperclip `idle | error` while leaving final invokability to Paperclip.

A second legitimate MEDICSPRO work remains a separate owner-originated effect and must begin with fresh reconciliation.


## 2026-09-22 — second legitimate MEDICSPRO work is GREEN

ADR 0161 records the first successful customer-work execution after Organization Adapter 0.3.1 promotion.

The authenticated MEDICSPRO owner submitted a genuine supervised commercial-preparation task through Wandora Web. Starting from Paperclip Ana's truthful historical `error / wandora_execution_failed_409`, the normal path created exactly one new Wandora work and one new Paperclip issue, produced exactly one successful assignment run, called the Mistral-backed Mastra runtime exactly once, recorded prospective Paperclip usage of 273 input / 740 output / 0 cached tokens, and returned a customer-visible internal result marked `Pronto para sua revisão`.

The issue terminalized as `done`; no continuation or recovery appeared. Paperclip naturally finalized Ana to `idle` with `errorReason=null` after the successful run. No lifecycle normalization was performed beforehand.

Total Wandora customer work is now 2. MEDICSPRO outbound attempts remain 0, Human Send remains OFF and Gateway outbound remains OFF.

Next product axis: **Customer Product Surface / Demo Readiness**. Replace visible placeholders and rough internal presentation with real canonical state before expanding infrastructure further.

## 2026-09-22 — customer product surface canonicalization begins

ADR 0162 adopts the owner-approved Wandora customer-panel prototype as the canonical design direction without adopting its demonstration data as truth.

The first code slice keeps the accepted React/Vite/TanStack runtime, ports the cream/black/lime/yellow customer shell and turns Início into a real-state-only surface using existing digital-employee and customer-work reads. The previous fictitious dashboard commercial metrics are removed.

The production truth rule is now explicit: every customer-visible block is REAL, DERIVÁVEL or FUTURO before implementation. FUTURO capability must not be populated with demo values.

`docs/product/customer-surface-canonicalization-v1.md` records the page-by-page map for Início, Equipe, Trabalho, Conversas, Aprovações and Empresa.

No production deployment/effect is part of this checkpoint. Grounding / `Regras da casa` remains an upcoming capability-authority review before broader autonomous outbound.


## 2026-09-22 — Equipe surface canonicalization implemented in code

ADR 0163 ports the approved Wandora Equipe design into the existing customer Web without inventing capabilities.

The new Team surface uses the canonical customer visual language while preserving the current real contracts for digital-employee identity, role, active/paused status, supervised autonomy, activation availability, customer work and catalog-hire state.

Demo-only prototype concepts — training history, weekly scoring, human teammate cards, response-time claims, candidate queues and actionable alternative autonomy levels — remain future capability and are not shown as production facts.

The visual rewrite preserved the protected activation contract: activating a digital employee **Não inicia trabalho** and **não libera envios externos**.

This is code/CI only. Production Web remains unchanged until a separately reviewed promotion.


## 2026-09-22 — customer-work result presentation implemented safely

ADR 0164 fixes the raw-Markdown presentation gap observed in the real MEDICSPRO customer-work result.

Web now parses a bounded Markdown-like subset into inert React nodes and strips link targets. It does not trust model output as HTML and does not create clickable model-provided links. The compact Início preview uses normalized plain text.

A dedicated build gate `WANDORA_WEB_WORK_RESULT_SAFE_RENDERING_V1_OK` validates this contract.

This remains code/CI only until a separately reviewed Web production promotion.


## 2026-09-22 — canonical customer product surface promoted to production

ADR 0165 records the production promotion of the exact merged-main Web artifact from `main@2e23abd8852558155a4e1475c5891962ab03d6fa`.

The live Web is now `wandora/web:candidate-2e23abd88525`, healthy with restart count 0. The deployed bundle contains the canonical customer shell, real-state-only Início, Equipe surface and safe internal work-result renderer.

Before promotion, reconciliation found the persisted Web stack selector still pointed to the older ADR 0135 candidate while the actual live container had already advanced to ADR 0141's `candidate-88facf57466d`. The promotion explicitly resolved this drift and left the persisted selector aligned with the live container.

Core, Paperclip and Messaging Gateway were not recreated. MEDICSPRO stayed at two works, Ana stayed active + supervised, outbound stayed zero, and both Human Send and Gateway outbound remained OFF.

Next customer-product convergence target: Conversas, then Empresa / Regras da casa grounding authority.


## 2026-09-22 — Conversas surface canonicalization implemented in code

ADR 0166 ports the approved Conversas customer experience into the existing Web while reusing the already-live canonical conversation list/history reads.

The new code preserves real contact/status/employee/message state and the 100-message bounded-history contract. It remains explicitly read-only and does not invent unread state, presence, typing, takeover or response/send controls.

No backend, messaging effect or production deployment is part of this slice.


## 2026-09-22 — canonical Conversas surface promoted to production

ADR 0167 records the Web-only production promotion of the canonical read-only Conversas surface from `main@65908b76c667e1326b0c73584766b8cc4ad73c0e`.

Production Web is now `wandora/web:candidate-65908b76c667`, healthy with zero restarts. Core, Paperclip and Messaging Gateway were not recreated.

The deployed conversation UX uses only the existing tenant-authorized list/history contracts and does not expose or enable reply/send/takeover/presence behavior.

Next product capability review: Empresa / Regras da casa grounding authority.


## 2026-09-22 — permanent session continuity + provider pluggability guardrail

ADR 0168 makes the following rules permanent for future Wandora sessions:

- repository/canonical docs + real runtime evidence outrank visible chat history;
- handoff prompts are bridges, not state authority;
- after timeout/disconnect/chat change, reconcile before repeating any operation;
- important slices must leave repository checkpoints so continuity survives chat changes;
- **portability means contract decoupling, not implementation duplication**;
- provider replacement does not imply internalizing provider operational capabilities into Wandora;
- every material provider-backed capability must separate semantic authority, minimum durable product state, operational authority, provider implementation and replacement boundary.

This generalizes the existing Paperclip-specific portability work to Paperclip, Mastra and future specialist providers.


## 2026-09-22 — Empresa / Regras da Casa grounding authority

ADR 0169 defines the grounding boundary before any customer knowledge/memory subsystem is introduced.

Wandora owns only the durable semantics that must survive provider replacement: official company facts, owner-authored house rules, provenance and provider-neutral approved source references. Paperclip continues to own organizational control-plane capabilities such as Skills, Decisions/Decision Training and Connections/grants. Mastra/runtime continues to own execution mechanics such as memory, retrieval, context assembly, runtime skills/tools and evals when separately qualified.

The code-only first contract is migration 017, `wandora.organization_grounding_entries`, with tenant-scoped Core SELECT only. Disposable PostgreSQL proof is GREEN. Migration 017 is **not applied to production**; no real MEDICSPRO grounding data exists yet.

The next safe implementation is an owner-authorized mutation + customer read contract, still code-only/no-effect. Runtime projection and production promotion remain separate reviewed slices.


## Organization Grounding owner mutation/read contract — code only

ADR 0170 extends ADR 0169 with a bounded customer contract: active members may read tenant-scoped company grounding, while only active owner/admin memberships may create, retire or correct entries.

Core still has no arbitrary table write. Database mutation is restricted to audited tenant-scoped functions; corrections preserve prior content via supersedes_entry_id.

This is still not a knowledge base, RAG, vector, memory, document, skill, decision-training or policy-engine implementation. Migration 017 is not live until a separate production-effect slice.
## Checkpoint — Organization Grounding Runtime Projection V1 (2026-09-22)

ADR 0171 implements the code-only Wandora → Agent Runtime grounding projection over the already-approved migration 017 contract. Active official facts/rules are projected tenant-scoped into required `officialFacts[]` / `houseRules[]`, with `workContext` kept separate and provider-neutral provenance preserved.

No retrieval/memory/RAG/vector/chunking subsystem was internalized. Paperclip remains control-plane authority and Mastra/runtime remains execution/context implementation authority. Runtime has no grounding write or model-output promotion path.

Migration 017 is still not live. The next recommended code-only slice is the customer `Empresa / Regras da Casa` surface; production promotion remains a later separately reviewed effect.


## 2026-09-22 — Empresa / Regras da Casa customer surface implemented in code

ADR 0172 replaces the placeholder /company content with the minimum customer-facing projection/editor for the already-approved organization grounding contract.

The Web reuses existing human session, explicit active-organization selection, React Query and Core API boundaries. Active members can read. Owner/admin can create official facts or Regras da Casa, retire entries, and register evidence-backed corrections through ADR 0170 endpoints.

Correction preserves history instead of overwriting it. Raw sourceRef evidence is not rendered; provider IDs/names do not enter the customer surface. No direct browser database path exists.

This adds no new table/migration, RAG, retrieval, vector, embedding, chunking, document store, memory or duplicate Paperclip/Mastra capability. The local production-shaped Web build is GREEN with the dedicated WANDORA_WEB_COMPANY_GROUNDING_SURFACE_V1_OK gate.

Migration 017 is still not live and no production deploy/effect is part of this slice. A separately reviewed production-promotion preflight is required before any migration or Core/Web promotion.

## ADR 0200 — Customer Company Profile + First Access Onboarding Production Promotion Execution V1 — Partial Checkpoint

Status: **PARTIAL / FAIL-CLOSED**.

Migration 019 is now live and verified. The exact qualified Core and Web candidates from executable `main@0a7f368331882f6dcfe4ff1fe722be6e442354a5` are production-active and healthy:

```text
Core = wandora/core:organization-adapter-candidate-0a7f36833188
Web = wandora/web:candidate-0a7f36833188
```

A fresh protected pre-019 backup was captured and restore-readiness proved in a disposable PostgreSQL container. The canonical onboarding overlay was activated briefly and Core remained ready, but production has zero unlinked Auth users and no canonical legitimate smoke e-mail alias.

The required invite-only smoke therefore could not be performed without inventing identity state. The onboarding flag was turned back OFF. No organization profile, new identity, employee, provider binding, work, model run or outbound effect was created.

Do not repeat migration 019 or Core/Web promotion. Next slice is **Customer Company Profile + First Access Onboarding — Invite-Only Smoke + Final Flag Activation V1**, requiring one legitimate e-mail address authorized to receive the production invite.

## ADR 0201 — Customer Company Profile + First Access Onboarding Invite-Only Smoke — Invite Execution V1

Status: **PARTIAL / EXACTLY ONE REAL INVITE APPLIED / ACCEPTANCE PENDING**.

One explicitly authorized real production invite was sent through the existing Supabase Auth provider-native invite route with redirect to /accept-invite. The target address is intentionally omitted from Git.

Read-back proved exactly one pending invited Auth identity: target auth rows=1, invited_at present=1, confirmation_sent_at present=1, confirmed=0, signed in=0, target one-time tokens=1. No retry occurred.

The target still has zero Wandora identity mappings, no organization/profile and no hire operation. Core/Web/Auth/Paperclip/Gateway remain healthy. The onboarding flag remains OFF.

One globally-enabled MEDICSPRO ana-commercial-v1 eligibility row is pre-existing and unrelated to this invited identity.

Next safe slice: **Customer Company Profile + First Access Onboarding — Invite Acceptance + Final Flag Activation + Company Profile Smoke V1**. The recipient must first open the delivered Wandora invite and establish the first password. Do not resend automatically; reconcile provider state first if delivery is questioned.


## ADR 0201 final — Customer Company Profile + First Access Onboarding

Status: **COMPLETE / PRODUCTION ONBOARDING ACTIVE / REAL INVITE-ONLY SMOKE PASSED**.

The authorized invite was accepted and the recipient completed company onboarding successfully. Production reconciliation proves exactly one Auth identity, one Wandora identity, one organization, one active owner membership and one organization profile for the new tenant. The onboarding flag is ON and Core/Web/Auth/Paperclip/Gateway are healthy with zero restarts.

Scoped to the new organization: digital-employee eligibility=0, hire operations=0, outbound attempts=0. No Paperclip/Mastra/work/outbound side effect was created by onboarding.

BrasilAPI remains enrichment-only; CPF/CNPJ/CEP validation remains local and deterministic. With the live adapter headers, provider probes from Core returned HTTP 200 for both CEP and CNPJ.

## ADR 0202 — Provider-Neutral Business System Contract + VendaERP Read-Only Adapter V1

Status: **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**.

The first ERP integration slice introduces a provider-neutral Business System read contract plus a VendaERP adapter. V1 is deliberately limited to connection probe, companies, products, stock, price tables/product prices, people/customers/suppliers and orders.

No integration table, secret manager, browser credential flow, Paperclip Connection, Mastra tool exposure, production credential or live VendaERP call is part of this slice. Paperclip Connections/grants/secrets remains the candidate organizational connection authority and must be qualified before real credential onboarding. Paperclip Tool Gateway remains quarantined.

Mobile/conversational access is now an explicit invariant: channel address -> verified Wandora identity/contact -> organization relationship/role -> capability/effect authorization. A phone number alone never grants authority, and ERP party records are commercial mappings rather than Wandora identity authority.

Next safe slice after exact-head CI/merge: **Paperclip Connection Credential Custody + 28PRO VendaERP Read-Only Connection Preflight V1 — NO EFFECT**.

## ADR 0203 — Paperclip Connection Credential Custody + 28PRO VendaERP Read-Only Connection Preflight V1

Status: **COMPLETE / REUSE PAPERCLIP CONNECTIONS + SECRETS / LIVE CONNECTION NOT YET AUTHORIZED**.

Paperclip v2026.916.0 was inspected at pinned source `dffc2b3ca1b9e88fa21cb17493083e682dffd1ca`. It can represent the VendaERP credential set as three secret-backed header credential refs and already supplies company-scoped secrets, Connections, grants, installs, responsible-user routing and run-bound secret access.

Board/company APIs do not provide a general plaintext secret-read path to Wandora Core; agent secret value resolution is deliberately run-bound. Therefore Core must not retrieve the ERP token from Paperclip and call VendaERP as a secret bypass.

Paperclip Tool Gateway can internally resolve granted connection secrets and inject multiple HTTP headers, but remains quarantined by canonical authority and requires a dedicated read-only qualification before production use.

28PRO currently has no Paperclip company/provider binding, as intended by first-access onboarding. Any provider company required for Connections must be lazily materialized only after explicit integration intent and must not hire/activate an employee or create work.

Next safe slice: **Paperclip Business-System Connection Container + REST Tool Gateway Read-Only Qualification V1 — CODE ONLY / NO EFFECT**. Do not enter the real VendaERP token before that slice closes GREEN.

## ADR 0204 — Wandora Commercial Activation + Starter Digital Employee Product Contract V1

Status: **ACCEPTED PRODUCT CONTRACT / NO PRODUCTION EFFECT**.

Wandora's V1 commercial product includes one starter digital employee. Invite/account/company-profile onboarding remains a separate, effect-minimal transition and is not itself proof of purchase or entitlement.

`ana-commercial-v1` is reused as the starter employee V1. No second employee catalog, lifecycle engine or provisioning subsystem is introduced.

A customer-facing state described as Wandora active/ready for work requires: active organization + starter entitlement + exactly one Paperclip company binding + exactly one completed starter hire + exact employee/provider binding + Ana active/supervised. This readiness does not imply work execution, Mastra run, outbound messaging or ERP write authority.

ADR 0204 supersedes ADR 0203 only on provider-company timing for commercially activated customers: Paperclip company materialization belongs to starter-workforce provisioning, not to the later ERP-connection event. ERP remains an optional tool attached to the already-existing workforce.

28PRO is currently onboarded but not starter-workforce ready. No production mutation is authorized yet.

Next safe slice: **Starter Digital Employee Commercial Activation Composition V1 — CODE ONLY / NO EFFECT**. After that is GREEN, run **28PRO Starter Digital Employee Production Activation Preflight V1 — NO EFFECT** before any real provisioning.

## ADR 0205 — Starter Digital Employee Commercial Activation Composition V1

Status: **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**.

Core now has a provider-neutral starter-workforce readiness projection and authenticated read-only route `GET /api/v1/organizations/:organizationId/starter-workforce`.

Readiness is derived only from existing product/provider reconciliation state and returns one of: `commercial-activation-required`, `provider-company-required`, `hire-required`, `activation-required`, `ready`, `reconciliation-required`.

No new table/migration/state machine exists. Eligibility remains starter-provisioning policy rather than billing state. The route exposes no provider company/agent refs or secrets. Web Nginx allows only the exact UUID-scoped read route.

Local strict TypeScript typecheck/build and 6 dedicated tests are GREEN.

Next safe slice after exact-head CI/merge: **28PRO Starter Digital Employee Production Activation Preflight V1 — NO EFFECT**. Do not create the Paperclip company, enable eligibility, hire or activate Ana before that preflight freezes the exact sequence and ambiguity recovery.

## ADR 0206 — 28PRO Starter Digital Employee Production Activation Preflight V1

Status: **GREEN / NO EFFECT / PRODUCTION EXECUTION QUALIFIED**.

28PRO live state was reconciled as one active organization with one active owner and zero starter eligibility, zero Paperclip control-plane binding, zero employees, zero matching Ana, zero starter hire operations and zero employee/provider bindings.

Paperclip v2026.916.0 is healthy and contains exactly three existing companies: Wandora Customer Hire Canary, Wandora Internal Supervised Proof and MEDICSPRO. Exact `28PRO` provider-company matches = 0. The protected Board credential still reads as `isInstanceAdmin=true`.

Live Core has Organization Adapter, customer hire and customer activation gates ON. Paperclip Organization Adapter plugin is ready at v0.3.1. No Human Send flag and no Gateway outbound enable flag were observed.

The production execution sequence is frozen as: Paperclip company create -> Organization Adapter binding/HMAC/secret/config -> starter eligibility -> canonical paused-first hire -> supervised activation. Reconcile between every non-atomic effect; no blind retry.

No effect occurred in this preflight.

Next safe slice: **28PRO Starter Digital Employee Production Activation Execution V1**. After starter workforce is proven `ready`, resume the provider-neutral ERP path; VendaERP remains only the first ERP provider.

## ADR 0207 — 28PRO Starter Digital Employee Production Activation Execution V1

Status: **PARTIAL / SAFE STOP AT ORGANIZATION-ADAPTER SECRET CUSTODY STEP**.

Execution reconciled exactly one active Paperclip `28PRO` company (`5d7ec217-118c-4292-8136-0a9ab16926ea`), exactly one matching Wandora control-plane binding and an existing deterministic host HMAC file with `0640 wandora-admin:wandora-ops` custody.

Current Paperclip company state: 0 Organization Adapter secrets, plugin config `null`, 0 agents. Current Wandora starter state: 0 eligibility, 0 employees, 0 hire operations, 0 employee/provider bindings.

Remote execution tooling blocked the secret-transfer command before host execution. No secret-create request was dispatched. Do not recreate company, binding or HMAC.

Continuation begins only at Paperclip HMAC secret creation, then plugin config -> eligibility -> paused-first hire -> activation, with reconciliation after every effect.

### ADR 0207 continuation — 28PRO starter wiring ready for owner hire

28PRO Organization Adapter wiring is now complete: exactly one active Paperclip HMAC secret, exact company-scoped plugin config with referenceCount 1 and lastError null, and zero provider agents.

`ana-commercial-v1` eligibility is now enabled through the canonical least-privilege operator function. 28PRO still has 0 digital employees, 0 starter hire operations and 0 employee/provider bindings.

Next effect is the normal owner/admin authenticated hire from the customer UI. Do not replace that boundary with an operator/direct-provider shortcut.

### ADR 0207 complete — 28PRO starter workforce ready

Owner-authorized hire and activation completed through the existing customer contracts. Final reconciliation proves exactly one Ana, hire `completed`, one employee/provider binding, Wandora Ana `active + supervised`, Paperclip Ana `idle`, 0 work items and 0 outbound attempts.

28PRO is now starter-workforce ready. No Mastra run or external send was caused by activation.

Next safe slice: **Paperclip Business-System Connection Container + REST Tool Gateway Read-Only Qualification V1 — CODE ONLY / NO EFFECT**; only after that should the real 28PRO VendaERP read-only connection be activated.
