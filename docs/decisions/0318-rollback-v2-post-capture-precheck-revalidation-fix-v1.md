# ADR 0318 — Rollback V2 Post-Capture Precheck Revalidation Fix V1

Date: 2026-09-28

Status: **SOURCE FIX APPLIED TO PR / CI PENDING / PRODUCTION UNCHANGED**

## Objective

Restore the existing governed Rollback Freeze V2 precheck as a reusable freshness check after a successful persistent V2 capture, without creating a second capability, widening managed-admin authority, or weakening capture collision protection.

## REAL NOW

A fresh governed execution of `wandora-rollback-freeze-v2-precheck` was explicitly approved and reached the managed-admin broker, but exited 1 with:

`ROLLBACK_FREEZE_V2_ERROR: receipt already exists; reconcile it before any rerun`

The existing safe receipt remained present at:

`/opt/wandora/ops-workspace/production-rollback-freeze-v2.metadata`

Runtime remained inert and healthy; no provider, VendaERP, customer, browser or outbound effect occurred.

Repository inspection proved the cause in `scripts/operations/production-rollback-freeze-v2.sh`: the receipt-exists guard ran before all fresh precheck logic, including the documented `--precheck-only` exit-before-write path.

## Capability Authority / Reuse Gate

No new subsystem or authority mechanism is justified.

- Wandora continues to own the rollback/precheck contract and exact bytes.
- Remote-Ops continues to own managed-admin prepare/apply, signed one-use approvals and root broker execution.
- The existing `wandora-rollback-freeze-v2-precheck` and `wandora-rollback-freeze-v2-capture` programs remain the only named root entrypoints.
- No generic shell/interpreter/root authority is added.
- ADR 0168 remains preserved.

## Decision

Change only the canonical helper semantics so an existing receipt blocks persistent capture reruns but does not block `--precheck-only`.

The capture-mode collision remains fail-closed.

The precheck still performs the same fresh runtime/custody checks and exits before the explicit:

`# First write begins here`

boundary.

Because both governed entrypoints byte-pin the helper, both wrappers and both verifier expected hashes must move to the same new helper blob. Regression checks must also assert the receipt guard remains capture-only.

## Second adversarial review

The source-only correction was reviewed immediately before mutation.

Result:

- choice: `allow`;
- allow: `0.39`;
- confirm: `0.29`;
- review: `0.22`;
- deny: `0.10`;
- confidence: `0.18`.

The reviewed action was restricted to the existing PR branch. It did not authorize production deployment or execution.

## Source execution

PR #369 branch `feat/semantic-fast-read-runtime-wiring-v1` was updated.

Previous helper Git blob:

`849a05971d5f2526b6e8829d5315b4678f169315`

New helper Git blob:

`a48812427b050383def5ba410f333e4b72987744`

Changed source package:

- `scripts/operations/production-rollback-freeze-v2.sh`;
- `scripts/operations/managed-admin-production-rollback-freeze-v2-precheck.sh`;
- `scripts/operations/verify-managed-admin-production-rollback-freeze-v2-precheck.mjs`;
- `scripts/operations/managed-admin-production-rollback-freeze-v2-capture.sh`;
- `scripts/operations/verify-managed-admin-production-rollback-freeze-v2-capture.mjs`.

Both wrappers and both verifiers now pin exactly `a48812427b050383def5ba410f333e4b72987744`.

The verifier suite also asserts that the helper contains the capture-only receipt collision guard.

## Production boundary

Production remains on the previously installed helper/wrapper bytes until a separate deployment is reviewed and explicitly authorized.

Do not execute or deploy the new bytes until the exact final PR head is GREEN.

After GREEN CI, any host deployment must have its own fresh runtime reconciliation, Decision, second adversarial review, explicit managed-admin approval(s), state-first validation and documentation.

No Human Fast Read is authorized by this ADR.
