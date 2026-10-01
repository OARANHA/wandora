# Session Continuity + Git Provenance Reconciliation V1

Status: **canonical operational runbook**

Use this whenever work resumes after a new chat, long interruption, tool failure, timeout or handoff, and immediately before any production-bound mutation whose provenance depends on GitHub state.

This runbook supplements `AGENTS.md`; it does not replace the repository authority order.

## Why this exists

During ADR 0352 resumption, a PR object's historical `base.sha=ce805822...` was temporarily interpreted as the current `main` tip. The actual Git ref was still `refs/heads/main=e4c7c36...`. The error was caught before the Core recreation, but it exposed a continuity failure mode that must not depend on chat memory.

## GitHub evidence hierarchy

For **current repository identity**, use this order:

1. actual branch ref — `refs/heads/<branch>`;
2. exact PR head SHA;
3. pull merge ref — `refs/pull/<PR>/merge` when a merge candidate is material;
4. merge commit parent graph;
5. workflow runs bound to the exact SHA;
6. PR REST/connector convenience metadata only as descriptive context.

A PR object's `base.sha` / connector `base_sha` is **not** authority for the current base branch tip.

## Required PROVENANCE NOW block

Immediately before any production mutation that depends on repository provenance, record:

```text
PROVENANCE NOW
base_ref=refs/heads/main
base_sha=<live ref sha>
pr=<number>
pr_head_ref=<branch>
pr_head_sha=<exact sha>
merge_ref=refs/pull/<number>/merge
merge_sha=<exact sha>
merge_parent_1=<must equal base_sha>
merge_parent_2=<must equal pr_head_sha>
ci_sha=<exact sha being relied on>
ci=<N/N completed success>
```

Omit merge fields only when no merge candidate is part of the action, and say why.

## Reconciliation procedure

### 1. REAL NOW

Read `docs/WANDORA_PROJECT_SOURCE.md` only as bootstrap, then the normal authority chain.

Read the live Git refs directly. For GitHub REST, equivalent read-only endpoints are:

- `GET /repos/<owner>/<repo>/git/ref/heads/<branch>`;
- `GET /repos/<owner>/<repo>/pulls/<PR>` for PR head identity/state;
- `GET /repos/<owner>/<repo>/git/ref/pull/<PR>/merge`;
- `GET /repos/<owner>/<repo>/commits/<merge-sha>` for parent verification.

A local clone may use an equivalent direct-ref read such as `git ls-remote`, but the recorded evidence must identify which ref was read.

### 2. PROVEN EVIDENCE

Verify independently:

- live base ref SHA;
- intended PR head SHA;
- current merge ref SHA, if applicable;
- merge parents exactly equal the live base SHA plus intended PR head SHA;
- exact-SHA workflows are complete and successful;
- production runtime still matches the last documented baseline before extending an effect.

### 3. CONFLICT HANDLING

If any source disagrees:

- stop the mutation;
- identify whether the disagreement is between a live ref, commit graph, workflow SHA, runtime state or descriptive PR metadata;
- prefer live refs/commit graph for current Git identity;
- do not infer force-push/reset merely from PR `base.sha`;
- do not “repair” Git or production simply to make the records agree;
- document the discrepancy before deciding.

### 4. INTERRUPTION / CHAT CHANGE

After timeout, disconnect or chat change:

- determine whether the previous mutation actually executed from authoritative runtime/state;
- do not replay an approval or command because the prior assistant response was lost;
- re-read live refs before using a previous merge/candidate conclusion;
- treat the handoff as a list of things to verify, never as current truth.

### 5. APPROVAL BOUNDARY

A provenance read or adversarial review never substitutes for a required human effect approval.

If a prepared one-use approval expired, first prove whether it executed. If not, prepare a fresh ticket and require a fresh explicit approval.

## Retrospective audit: ADR 0342–0352

Audit performed on 2026-09-30 after the ADR 0352 incident.

| ADR | Provenance evidence in record | Audit classification |
| --- | --- | --- |
| 0342 | states `main=e4c7...`; records exact current-main ephemeral compatibility proof, but not the raw-ref retrieval source | historically consistent; source method under-specified |
| 0343 | states `main=e4c7...`; production effect is strongly bounded, but raw-ref source is not recorded | historically consistent; source method under-specified |
| 0344 | states `main=e4c7...`; no raw-ref retrieval source recorded | historically consistent; source method under-specified |
| 0345 | fresh-entry section does not make a current-main provenance claim | not applicable to this failure mode |
| 0346 | merge `14534e...` recorded with parents `e4c7... + 6035...`; current commit graph confirms those parents | strongly corroborated |
| 0347 | states `main=e4c7...`; no raw-ref retrieval source recorded | historically consistent; source method under-specified |
| 0348 | states `main=e4c7...`; repository-only slice, no raw-ref retrieval source recorded | historically consistent; source method under-specified |
| 0349 | merge `fe9c...` recorded; current commit graph confirms parents `e4c7... + 8d322...` | strongly corroborated |
| 0350 | states `main=e4c7...`; code/CI-only, no raw-ref retrieval source recorded | historically consistent; source method under-specified |
| 0351 | merge `e7b1...` recorded with parents exactly `e4c7... + d46e...`; current commit graph confirms it | strongly corroborated |
| 0352 | confirmed transient interpretation error: PR `base.sha` was mistaken for current main; corrected before mutation using live refs; merge `a495...` parents confirm `e4c7... + 004551...` | confirmed error, contained before production effect |

Current `main` history has `e4c7c36...` as the tip and `ce805822...` as its parent. The present repository evidence contains **no proof that an earlier production promotion in ADR 0342–0351 used a wrong base because of this exact failure mode**.

That statement is deliberately limited: Git commit history is not a complete reflog/audit trail of every transient branch-ref movement, and ADRs that did not record the raw-ref source cannot be upgraded retroactively to stronger evidence.

## Permanent rule

A future ADR may say “current main = X” only when the evidence bundle can answer:

> Which live ref was read, what exact SHA did it return, what PR head was paired with it, and — if a merge candidate mattered — do the merge parents close exactly over those two SHAs?

If the answer cannot be reconstructed, the provenance statement is incomplete and cannot authorize a production-bound candidate by itself.
