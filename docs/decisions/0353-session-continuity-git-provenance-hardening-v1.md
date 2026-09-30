# ADR 0353 — Session Continuity + Git Provenance Hardening V1

Date: 2026-09-30

Status: **GOVERNANCE HARDENED / RETROSPECTIVE AUDIT COMPLETE / NO PRODUCTION EFFECT**

## Objective

Convert the ADR 0352 resumption incident into a repository-enforced continuity rule and audit ADRs 0342–0352 for the same provenance failure mode.

No production/runtime/provider/database effect is authorized or performed.

## REAL NOW

At slice start:

- PR #369 branch head = `d666ac716ef0a278f5926166c56b53340186f4a2`;
- that exact documentation head completed **17/17 workflows GREEN**;
- ADR 0352 promotion is complete and records corrected Core `a49504c...` live with all Semantic Fast Read/customer/outbound effect gates OFF;
- authoritative `refs/heads/main` remains `e4c7c36bb1091ba38d39b85fa259bae94553fc52`.

Current main history has:

- `e4c7c36...` — PR #376, current tip;
- parent `ce805822...` — PR #375.

## Confirmed incident

During ADR 0352 resumption, connector PR metadata returned historical `base.sha=ce805822...`.

That field was temporarily interpreted as the current main tip, producing a false provenance mismatch and a fail-closed deny decision.

Direct reads then proved:

- `refs/heads/main=e4c7c36...`;
- `refs/pull/369/merge=a49504c...`;
- merge parents exactly `e4c7c36... + 004551f...`.

No Core recreation had occurred during the false-block interval. The incorrect premise was removed, adversarial review was repeated on corrected evidence, and only then was the separately approved Core-only promotion executed.

## PROVEN EVIDENCE

Search across ADRs 0342–0351 found no other explicit use of PR `base.sha` as current-main authority.

Mechanical commit-graph verification confirms:

- ADR 0346 merge `14534e...` parents = `e4c7... + 6035...`;
- ADR 0349 merge `fe9c...` parents = `e4c7... + 8d322...`;
- ADR 0351 merge `e7b1...` parents = `e4c7... + d46e...`;
- ADR 0352 merge `a495...` parents = `e4c7... + 004551...`.

Other audited ADRs state `main=e4c7...` without preserving the raw-ref retrieval source. They are consistent with the current commit history, but this audit does not retroactively claim stronger evidence than the ADR records.

There is therefore:

- one **confirmed interpretation error** — ADR 0352 resumption, contained before production mutation;
- no evidence in the audited records of an earlier production promotion caused by this exact error;
- an evidence-quality gap: several ADRs did not record enough source detail to prove how “current main” was obtained.

## GAPS

The gap is operational epistemology, not product/runtime capability.

Chat continuity can fail if a convenience field is silently promoted into authority. The remedy is not new Wandora runtime state or a new service. It is an explicit evidence hierarchy and mandatory provenance bundle.

## CAPABILITY AUTHORITY / REUSE GATE

ADR 0168 is unaffected.

No table, service, migration, state machine, provider implementation or runtime subsystem is created.

Reuse existing Git/GitHub refs, commit graph and workflow evidence.

## DECISION

1. Amend `AGENTS.md` with a Git provenance hard gate.
2. Add `docs/operations/session-continuity-git-provenance-v1.md`.
3. Require a **PROVENANCE NOW** block immediately before production-bound Git-derived mutations.
4. Ban PR `base.sha` / connector `base_sha` as authority for the current base branch tip.
5. Require live base ref + PR head + merge ref + merge-parent verification where a merge candidate matters.
6. On conflicts, investigate rather than infer a branch reset from descriptive PR metadata.
7. Preserve historical ADRs; record audit limitations instead of rewriting history.

## SECOND ADVERSARIAL REVIEW

JEV 1.13.0 reviewed the exact documentation-only hardening and retrospective-audit plan.

Result:

- decision = `confirm`;
- `confirm=0.41`;
- `allow=0.40`;
- `review=0.16`;
- `deny=0.03`;
- confidence = `0.21`.

Low confidence reflects the governance/documentation nature of the action, not a deterministic blocker. The proposed change has no production effect and narrows, rather than widens, future authority.

## EXECUTION

Documentation/governance only:

- update `AGENTS.md`;
- add the continuity/provenance runbook;
- add this ADR;
- update `docs/CANONICAL_STATE.md`;
- update `docs/WANDORA_PROJECT_SOURCE.md`.

No production or provider action is executed.

## VALIDATION

The final documentation head must complete normal exact-head CI GREEN.

Future production-bound slices must fail closed if the **PROVENANCE NOW** bundle is incomplete or contradictory.

## HARD STOP

Do not use this governance slice to reopen Semantic Fast Read.

After exact-head CI GREEN, the next functional slice remains:

**Semantic Fast Read Bounded Production Re-Attestation after ADR 0350 — FRESH PREFLIGHT / CONTROLLED EFFECT**.

That future slice must start by applying this new provenance runbook.
