# ADR 0244 — 28PRO VendaERP One-Shot Execution + Tool Gateway Envelope Read-Error Correction V1

Status: **EXECUTION SAFETY GREEN / BUSINESS READ FAILED SAFE / CODE CORRECTION COMPLETE / NO SECOND PROVIDER CALL**
Date: 2026-09-24

## Objective

Execute the ADR 0242 hard one-provider-call budget through a genuine 28PRO owner-originated canonical customer work, preserve Paperclip lifecycle authority, and stop after one bounded read.

The execution proved the one-shot budget, but VendaERP returned an MCP semantic error. The real call also exposed a Wandora bridge contract mismatch that allowed an MCP isError=true result to become a successful textual run.

## Entry state

Repository entry:
- main = 422db9a20df5b3c60b22e4e46bf96532859a4f86
- ADR 0243 = merged safe-stop checkpoint
- open PRs = 0

Production before owner submission:
- Paperclip = wandora/paperclip:v2026.916.0 / healthy / restart 0
- Core revision = 4a54b5d8f14c469989fad277189f6ebdfb8fb1f0
- Ana = idle / wandora_mastra
- Task Drain = OFF / activeRuns=0 / pendingWakes=0 / quiescent=true
- 28PRO work/outbound = 0/0
- VendaERP activity = 68 events
- VendaERP activity SHA-256 = 47de715854412222801f1f03c89b27d28ab64d0c2a5e824e04453539900e0c36

## Guard preparation
The owner was authenticated normally in the 28PRO customer surface.

Under native Paperclip Task Drain, two temporary policies were installed:
1. Ana + VendaERP block policy covering the seven non-product read tools.
2. Ana + vendaerp_search_products rate_limit policy with limit=1, windowSeconds=3600, keyed by agent+tool.

The dry-run policy matrix used consumeRateLimit=false:
- 7 non-product tools -> deny_policy_block
- vendaerp_search_products -> allow

Before execution, tool_rate_limit_counters had zero rows for the temporary rate policy.

Task Drain then expired by its native TTL. Final pre-submit readback proved:
- Task Drain = OFF / quiescent
- temporary policies = 2
- rate counter rows = 0
- Ana = idle
- VendaERP activity = still 68 events
- 28PRO work/outbound = 0/0

## Canonical owner-originated work

The authenticated 28PRO owner submitted exactly one work through the normal Wandora customer surface.

Work:
- id = 17eb846e-4a5d-4d87-892d-cee3ebd58910
- title = Consulta limitada de produtos no VendaERP
- status = result_recorded
- provider = paperclip
- provider run = 6f928fe8-3a85-4c95-8352-6221a03a70e0
- execution id = exec_c40a2a1b4207ac7bfc9deab218a4944efa551c8a3006b3054dae04987f349536
- result model = wandora-supervised-v1

Paperclip issue:
- identifier = PRO-14
- issue id = 27d28163-33ab-4635-aea8-ad81b3fb81f5
- origin = plugin:wandora.organization-adapter-v1:customer-work-v1
- status = done

Exactly one assignment run executed:
- run id = 6f928fe8-3a85-4c95-8352-6221a03a70e0
- invocation source = assignment
- status = succeeded
- retry_of_run_id = null
- continuation_attempt = 0
- scheduled_retry_at = null
- process_loss_retry_count = 0

Exactly one corresponding wake request existed and completed, keyed to the canonical Wandora work. No manual wake or second customer work was created.

## Hard provider-call budget proof

The temporary Paperclip rate-limit counter was captured before cleanup:
- limit = 1
- remaining = 0
- window = hour
VendaERP Connection activity moved only 68 -> 70 events.

The two new events belonged to the same run and exact tool:
- policy_decision
- call_completed

Exact admitted arguments: {"pageSize":5,"skip":0}

No other VendaERP tool was invoked.

Hard budget result: **GREEN — exactly one governed Tool Gateway/provider attempt, no retry.**

## Provider result

The MCP result was:
- isError = true
- structured error code = invalid-provider-response
- transport = local_stdio

The provider-neutral work summary recorded that the VendaERP query returned invalid-provider-response and no product was recovered.

The live VendaERP adapter can emit invalid-provider-response for at least:
- an unexpected product-list response shape; or
- a product record missing the required nome.

The raw provider payload is not durably retained in the customer work evidence, so this ADR does not claim which branch occurred.

Business result: **FAILED SAFE — no trustworthy product data was produced.**

## Counterexample discovered

Pinned Paperclip intentionally treats an MCP isError=true result as a successfully transported Tool Gateway execution.
The real /api/tool-gateway/tools/call response is an execution envelope with:
- invocationId
- status = completed
- tool
- result

The inner result then carries:
- data.isError = true
- error = MCP tool returned an error result

The Wandora Core bridge previously parsed the HTTP body as though that inner result were top-level, checking body.data.isError and body.error.

ADR 0241's unit fixture mocked the simplified direct payload, so the real envelope was not covered. During this execution the bridge therefore returned the envelope as a normal read-tool value. The Mastra failure latch never saw an exception, the model summarized the error text, and Paperclip finalized the run as succeeded.

This is a Wandora adapter-contract bug, not a reason to change Paperclip Tool Gateway semantics.

## Capability Authority / Reuse Gate

No new subsystem is required.

- Paperclip remains authority for Tool Gateway transport, policy, rate limiting, audit and lifecycle.
- Wandora owns semantic translation from Paperclip Tool Gateway responses into RuntimeReadTool success/failure.
- Mastra remains the ephemeral supervised runtime.
- VendaERP remains a replaceable provider adapter.

ADR 0168 remains binding: portability is contract decoupling, not implementation duplication.

The correction belongs in the existing Wandora-owned tool-gateway-read-bridge. No Paperclip fork, retry state, cache, mirror or replacement Tool Gateway is authorized.

## Code correction
apps/core/src/paperclip-execution/tool-gateway-read-bridge.ts now:
1. recognizes the real Tool Gateway execution envelope only when the expected envelope markers are present;
2. requires envelope status = completed;
3. unwraps responseBody.result;
4. applies the existing semantic failure checks to the inner MCP result;
5. preserves direct-result compatibility;
6. preserves the existing same-parameters per-run dedupe.

Tests now cover:
- a real successful completed envelope;
- a non-completed envelope failing closed;
- a completed envelope whose inner MCP result has isError=true;
- repeated identical MCP semantic failures collapsing to exactly one Tool Gateway call.

## Validation

Local focused validation:
- paperclip-tool-gateway-read-bridge.test.ts = 6/6 GREEN
- Mastra supervised + execution handler focused tests = GREEN
- Core typecheck = GREEN
- Core build = GREEN

The database-backed integration suite could not run locally because the fresh clone lacked the required Supabase tenant routing context and failed during fixture reset with ENOIDENTIFIER before executing the test bodies. GitHub Core CI remains the authority for that environment-backed suite.

No second VendaERP/provider call was performed while diagnosing or correcting the bug.

## Cleanup and final production state

The two temporary policies were deleted through the native Paperclip policy API after the authoritative rate counter and activity evidence were captured.
The policy deletion cascaded the temporary counter as designed.

Final production readback:
- Task Drain = OFF / activeRuns=0 / pendingWakes=0 / quiescent=true
- temporary ADR0243 policies = 0
- temporary rate counters = 0
- Ana = idle / wandora_mastra
- VendaERP activity = 70 events
- VendaERP activity SHA-256 = e7114e6f43675b0634a186b35a9d1b440ccf57fbd00179c1853ee85c38a97d8b
- 28PRO work = exactly 1
- 28PRO outbound = 0

No migration, runtime restart, provider write, customer message, e-mail, WhatsApp or other external outbound effect occurred.

## Second adversarial review

- Did the owner create exactly one canonical work? **Yes.**
- Did the hard provider budget allow more than one attempt? **No; limit=1, remaining=0.**
- Was any other VendaERP tool invoked? **No.**
- Did Paperclip create a successor/retry run? **No.**
- Did the correction duplicate Paperclip Tool Gateway semantics? **No; it adapts the existing response contract at the Wandora-owned boundary.**
- Does the correction create Wandora lifecycle/retry state? **No.**
- Does direct-result backward compatibility remain? **Yes.**
- Does a non-completed real envelope fail closed? **Yes.**
- Was a second provider call used to debug the issue? **No.**
- Is the provider-response-shape root cause itself proven? **No; only the safe code invalid-provider-response is proven.**

## Decision

**ONE-SHOT SAFETY = GREEN.**
**BUSINESS PRODUCT READ = FAILED SAFE.**
**REAL TOOL-GATEWAY ENVELOPE FAILURE PROPAGATION CORRECTION = CODE COMPLETE, pending CI.**

Another real VendaERP read remains prohibited until this Core correction is merged, separately promoted, and re-attested in production.

Next slice after merge: **Tool Gateway Real Envelope Read-Error Core Promotion Preflight V1 — NO PROVIDER CALL.**
