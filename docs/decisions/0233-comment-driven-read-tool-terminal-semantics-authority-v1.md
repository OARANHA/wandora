# ADR 0233 — Comment-Driven Read Tool Terminal Semantics + Provider Result Authority V1

Status: **GREEN / AUTHORITY DECIDED / NO PROVIDER CALL / CODE CHANGE REQUIRED**
Date: 2026-09-23

## Objective

Reconcile the real ADR 0232 V3 counterexample against pinned Paperclip v2026.916.0 and decide the minimum authority-correct next implementation.

This slice is source/repository analysis only. It performs no VendaERP call, model run, customer work, outbound effect, Paperclip mutation or production change.

## Canonical entry

main = 457e15d55fb500095b8b894473229a4c8b66c00b
PR #304 = MERGED
PR #303 = CLOSED / not merged / duplicate documentation
ADR 0232 = FAILED SAFELY / NO-GO for another provider read
Paperclip = v2026.916.0
Core live = wandora/core:organization-adapter-candidate-fc8721ccaedd
wandora_mastra = 0.4.0

ADR 0232's durable provider fact remains: exactly one real product Tool Gateway call occurred, it returned MCP isError=true with safe code invalid-provider-response, no trusted product rows were obtained, and work/outbound stayed 0/0.

## Finding 1 — Tool Gateway run context was not proven broken

The live post-cleanup activity showed issueId null, matchedPolicyIds empty, rateLimitState null and reasonCode allow_profile. That does not prove that the issue-scoped rate-limit was skipped.

Pinned Paperclip source proves:

1. POST /api/tool-gateway/sessions accepts runId, issueId and projectId.
2. toolGateway.createSession() calls resolveRunContext().
3. resolveRunContext() loads the persisted heartbeat run and reads contextSnapshot.issueId and contextSnapshot.projectId.
4. Persisted run context takes precedence over supplied context and is company/agent validated.
5. The V3 source run durably had the PRO-10 issue id in contextSnapshot.issueId.

Paperclip Tool Gateway and audit foreign keys use ON DELETE SET NULL for issue references. PRO-10 was deleted during cleanup, so observing issueId null afterward is compatible with an event that originally referenced the issue.

Pinned tool-access policy code also evaluates matching rate-limit policies before the final grant/profile decision. A non-exceeded limiter calls enforceRateLimit() and continues. The eventual allow may therefore be allow_profile without retaining the rate policy in matchedPolicyIds or rateLimitState. Only a blocking limiter returns rate_limited with its policy/state.

Therefore ADR 0232 is superseded only where it claimed the rate-limit was proven not to participate. The correct durable statement is: participation is unresolved post-cleanup; exactly one real provider dispatch is independently proven by Tool Gateway activity.

No Tool Gateway issue-context patch is justified by current evidence.

## Finding 2 — the actual lifecycle failure is a missing terminal disposition after a technically successful run

The source run had wakeReason issue_commented, Paperclip status succeeded, and the issue remained in_progress after the run.

Paperclip correctly skips direct successful-run handoff for a comment-driven source run. But periodic recovery separately handles an assigned in_progress issue whose productive successful run ended without a live execution path or durable disposition.

That provider-owned path enqueues issue.productive_terminal_continuation_recovery with reason and retryReason issue_continuation_needed.

The observed chain was therefore:

human comment -> issue_commented -> issue_continuation_needed -> finish_successful_run_handoff

The direct comment-driven exclusion was functioning. The source run simply exited without a valid issue disposition.

## Finding 3 — Paperclip already owns the required lifecycle contract

Pinned Paperclip guidance requires every actionable run to leave a durable final disposition before exit:

- done when work is complete and verified;
- in_review only with a real reviewer, approval, interaction or monitor path;
- blocked only with a real blocker or named unblock owner/action;
- in_progress only while a live continuation path exists.

Wandora must not introduce a parallel lifecycle or retry state machine.

## Finding 4 — Wandora already reuses the provider-native disposition for customer work

wandora_mastra 0.4.0 already has a qualified completion path for existing Wandora customer work identified by the wandora-work-v1 marker.

On successful durable Wandora work completion, the adapter uses the Paperclip run-scoped token plus x-paperclip-run-id to PATCH the same issue to status done, with readback/retry only for ambiguous transport outcome.

This is already production-qualified by ADRs 0151-0154.

Therefore an actual owner/customer ERP lookup should use the existing Wandora customer-work semantic path rather than treating a generic Paperclip issue as the product-system-of-record task.

Authority remains separated:

- Wandora owns business work and durable work result semantics.
- Paperclip owns issue/run lifecycle and the final provider-native issue disposition.
- The adapter maps successful Wandora work completion to Paperclip's native disposition.

ADR 0168 remains preserved.

## Finding 5 — the semantic tool failure was swallowed inside the Mastra run

The live MCP returned a standard error result with isError=true and safe code invalid-provider-response.

The Wandora read bridge rejected that tool execution. Mastra's model/tool loop nevertheless absorbed the tool exception and returned a valid structured model object containing a textual failure summary.

Core accepted that model object as successful task execution. The adapter consequently returned exitCode 0 and Paperclip persisted the heartbeat run as succeeded.

That erased the semantic distinction between provider-backed task success and provider/tool failure followed by model-authored text.

This is the proven Wandora-owned semantic gap.

## Finding 6 — successor product text is never provider authority

The two automatic successor runs had no Tool Gateway/provider invocation but produced product-shaped text.

Those summaries are untrusted model synthesis, not ERP facts.

Authority order is:

Tool Gateway/provider evidence
> durable Wandora work result derived from that evidence
> model-authored summary

A model statement cannot manufacture provider success.

## Capability Authority / Reuse Gate

Paperclip already owns and provides issue/run lifecycle, comment wake, continuation recovery, successful-run handoff, native issue disposition, Tool Gateway policy/audit/rate limiting and run-scoped authorization.

Wandora owns customer/business work semantics, durable work result state, the semantic rule that an MCP/provider tool error is not successful work, and the provider-neutral private execution contract.

Mastra owns the ephemeral supervised model/tool loop implementation. It does not own the business truth that failed provider execution became successful work.

## Decision — reject the unnecessary context patch

Do not add issueId propagation merely to repair the ADR 0232 post-cleanup audit observation. Pinned Paperclip already resolves issue context from runId.

A context patch may be reconsidered only if a fresh no-provider proof demonstrates a real live context mismatch before issue deletion.

## Decision — never convert read-tool failure into adapter success

Do not convert read-tool-failed into exitCode 0 for comment-driven runs.

That would preserve the wrong semantic: failed provider work reported as a successful heartbeat run.

## Required next code slice

The minimum implementation is **Wandora Read Tool Failure Propagation V1 — CODE ONLY / NO PROVIDER CALL**.

It must:

1. preserve the first read-tool execution failure across Mastra's model/tool loop;
2. after Agent.generate(), fail the Wandora task if any read tool failed even if the model generated a valid structured summary;
3. preserve a bounded fail-closed tool-failed category;
4. map that category to a safe private Core failure response;
5. keep wandora_mastra semantics as a failed adapter execution and never convert the failure to exitCode 0;
6. prove the existing customer-work path marks execution uncertain instead of recording durable success when a read tool fails;
7. leave Paperclip failed-run reconciliation/replay safety in authority;
8. make no Paperclip source/fork change;
9. make no provider call.

The existing experimental local patch that returns successful adapter output for HTTP 422 is rejected by this ADR.

## Next real execution shape after code promotion

No provider retry is authorized by this ADR.

After code review, merge, production promotion and a separate no-provider preflight, the next real product-read proof should use the existing customer-work path:

Wandora customer work
-> Paperclip issue carrying the existing wandora-work-v1 marker
-> one supervised execution
-> provider-backed read tool result
-> durable Wandora work result
-> same-run Paperclip issue done

On provider/tool failure:

no durable successful work result
-> uncertain/failed Wandora work execution
-> no false Paperclip success
-> no Wandora-authorized automatic provider replay

Any future rate-limit proof must capture authoritative limiter/counter state before deleting the temporary policy/counter.

## Second adversarial review

- Is Paperclip's direct comment-driven handoff exclusion broken? **No.**
- What created the first successor? **Productive-terminal continuation recovery because the issue stayed in_progress.**
- Does Paperclip already define valid final dispositions? **Yes.**
- Does Wandora already reuse Paperclip issue completion for customer work? **Yes.**
- Is a new Wandora lifecycle engine required? **No.**
- Was Tool Gateway issue context proven lost live? **No.**
- Can post-cleanup issueId null prove original null context? **No.**
- Can final allow_profile prove a non-blocking rate-limit did not run? **No.**
- What semantic failure is proven? **Mastra absorbed a failed read tool and Core accepted the model summary as successful task execution.**
- Should adapter HTTP 422 be converted to success? **No.**
- Is another VendaERP call authorized? **No.**

## Decision

**GREEN / AUTHORITY DECIDED / CODE CHANGE REQUIRED / NO PROVIDER CALL.**

The next correction belongs at the Wandora runtime/adapter semantic boundary, not in Paperclip lifecycle or Tool Gateway policy.

No provider read may resume until the failure-propagation code slice is merged, promoted and separately preflighted.
