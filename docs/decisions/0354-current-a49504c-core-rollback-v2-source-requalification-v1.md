# ADR 0354 — Current a49504c Core Rollback Freeze V2 Source Requalification V1

Date: 2026-09-30

Status: **CODE-ONLY REQUALIFICATION / CURRENT BASELINE REPINNED / NO HOST DEPLOYMENT / NO CAPTURE / ATTESTATION CLOSED**

## Objective

Requalify the existing Rollback Freeze V2 source contract for the exact Core currently live after ADR 0352, without changing backup/restore semantics or creating a new rollback subsystem.

## REAL NOW / PROVENANCE NOW

Immediately before the repository mutation:

- `refs/heads/main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 head = `95c3918b7f0783595e2e58f2eb016d7bdeda46cb`;
- `refs/pull/369/merge = 53469eeacb1620f39ad6de8326348ef91f173351`;
- merge parents are exactly `e4c7c36...` + `95c3918...`;
- exact PR head CI = **17/17 GREEN**.

Production immediately before this source-only change:

- Core tag = `wandora/core:organization-adapter-candidate-a49504c7c41e`;
- image id = `sha256:ec37d2f730e0069521745fc620085f5d2353dc583117808d955f9e6975604005`;
- revision = `a49504c7c41ee255fa25cc3944ef0f718cc9a696`;
- Core healthy / restart 0;
- Semantic Fast Read and Fast Read execution OFF;
- Human Send OFF;
- Gateway outbound OFF;
- Task Drain = `false / 0 / 0 / quiescent=true`.

No Rollback Freeze V2 receipt exists for `a49504c...`; existing receipts remain historical for `b2cff...`, `e4c7...` and `14534e...`.

## GAP

The live Core advanced in ADR 0352 but the reusable Rollback Freeze V2 helper still pins the prior `14534e...` Core identity. A bounded production re-attestation must not open until rollback readiness describes the immediately current live baseline.

## CAPABILITY AUTHORITY / REUSE GATE

ADR 0168 remains binding. Reuse the existing Rollback Freeze V2 mechanism and managed-admin boundary.

No new backup subsystem, service, state machine, database table, provider implementation or approval mechanism is justified.

## DECISION

Repin only the exact current Core tag/image/revision, immutable receipt/root/temp namespaces, managed-admin helper byte pin and static CI/verifier expectations. The prior `14534e...` identity becomes explicitly stale for current-helper qualification.

Historical receipts remain untouched.

## SECOND ADVERSARIAL REVIEW

JEV 1.13.0 reviewed this exact repository-only action and returned `confirm` as the leading choice (`confirm=0.41`, `review=0.33`, `deny=0.14`, `allow=0.12`, confidence `0.21`).

## EFFECT BOUNDARY

This ADR authorizes only repository source/documentation requalification.

No helper deployment, root precheck, persistent capture, Core recreation, Semantic Fast Read opening, Human Fast Read, TypeSafe/Mistral/VendaERP customer-path call, Human Send, Gateway outbound or WhatsApp is authorized here.

## NEXT

Require exact-head CI GREEN. Then deploy only the reviewed byte-pinned helper/wrappers through the existing managed-admin boundary, run the zero-argument precheck, capture exactly one current-baseline Rollback Freeze V2 receipt, independently validate it, and continue directly into the fresh bounded production re-attestation preflight if all hard gates remain GREEN.
