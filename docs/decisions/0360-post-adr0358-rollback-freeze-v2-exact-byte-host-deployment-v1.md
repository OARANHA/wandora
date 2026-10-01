# ADR 0360 — Post-ADR0358 Rollback Freeze V2 Exact-Byte Host Deployment V1

Date: 2026-09-30

Status: **DEPLOYED + EXACT-BYTE VALIDATED / ROOT PRECHECK NOT EXECUTED / CAPTURE NOT EXECUTED / NO CUSTOMER EFFECT**

## Context

ADR 0359 qualified the post-ADR0358 Rollback Freeze V2 source without authorizing a production effect. This slice was limited to reconciling and, only if required, installing the already-qualified helper and two existing managed-admin wrappers at their existing canonical host paths.

No new rollback mechanism, state machine, service, subsystem, provider implementation or authority was created. The existing Remote-Ops managed-admin boundary remained the operational authority. Paperclip remains the provider-owned operational authority for its adapter/runtime state, consistent with ADR 0168.

## Reconciled source state

Before mutation:

- `main=e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 source head `e8170a6adca24314854e7ee53f4cbb06591886ec`;
- exact-head PR CI already qualified at 17/17 GREEN; no workflow was rerun;
- qualified helper blob `31742060143e8ff7c86a9753045400364b98c9c9`;
- qualified precheck wrapper blob `94d47e50d25e733799a345d7c5cfb4ff243ee74a`;
- qualified capture wrapper blob `5fa90bd0432c51a72ec050e3f2d78ce1ebb73737`.

Fresh root readback proved the live files were still the older ADR 0356 bytes:

- helper `d1203bdf2cc90a5471fe9536e886eedcef496c2b`;
- precheck wrapper `be4616837539bafebe72e1729aa1669a91150682`;
- capture wrapper `865a9b9338ce7f273140cfb35e401320383fce0f`.

Therefore exact-byte deployment was required.

## Runtime state before deployment

Read-only reconciliation showed:

- Paperclip `wandora/paperclip:v2026.916.1` healthy;
- Core `wandora/core:organization-adapter-candidate-f279acc98687` healthy;
- Messaging Gateway `wandora/messaging-gateway:origin-fix-94cfb4de` healthy;
- Task Drain `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- Organization Adapter `0.6.1` ready;
- external `wandora_mastra@0.6.0` loaded and enabled at
  `/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/2e97da6dabfe8cc81c60c35ce74b071329078835373eb3ca39ce63017e9b9ecf/package`;
- future post-ADR0358 receipt absent;
- historical ADR 0356 receipt preserved.

## Decision and second adversarial review

The reuse gate selected the already-existing `wandora-managed-admin` capability. No allowlist widening or new privileged program was required.

The first guarded review returned `allow=0.51` with low confidence, so a focused second review was performed. It returned `proceed_fast=0.77`, with the execution boundary kept to exact-byte staging, exact blob proof, install only, validation and documentation.

## Exact-byte staging

The three files were materialized from PR #369 source head `e8170a6adca24314854e7ee53f4cbb06591886ec` into:

`/opt/wandora/ops-workspace/post-adr0358-exact-byte-host-deployment-v1`

Independent `git hash-object --no-filters` readback of the staged files matched all three qualified blobs exactly. `bash -n` over all three staged scripts exited 0.

## Governed deployment

Canonical live paths remained unchanged:

- helper: `/usr/local/libexec/wandora/production-rollback-freeze-v2.sh`;
- precheck wrapper: `/usr/local/sbin/wandora-rollback-freeze-v2-precheck`;
- capture wrapper: `/usr/local/sbin/wandora-rollback-freeze-v2-capture`.

An initial pair of short-lived install approvals expired before execution. The broker rejected the first apply and a state-first readback proved no mutation had occurred; no stale approval was reused.

Fresh explicit approvals then installed only the already-qualified staged bytes:

- helper via `install -o root -g root -m 0750`;
- both wrappers via `install -o root -g root -m 0755`.

Both governed install actions returned `executed=true`, `exit_code=0`, no timeout and no stderr.

## Final validation

Final live metadata:

- helper = regular file, `root:root 0750`;
- precheck wrapper = regular file, `root:root 0755`;
- capture wrapper = regular file, `root:root 0755`.

A separate governed root `git hash-object --no-filters` readback then proved the final live bytes exactly:

- helper: `31742060143e8ff7c86a9753045400364b98c9c9`;
- precheck wrapper: `94d47e50d25e733799a345d7c5cfb4ff243ee74a`;
- capture wrapper: `5fa90bd0432c51a72ec050e3f2d78ce1ebb73737`.

Post-deployment readback kept Paperclip, Core, Gateway and all seven containers healthy. Task Drain remained `false / 0 / 0 / quiescent=true`. OA remained `0.6.1 ready`; `wandora_mastra@0.6.0` remained loaded/enabled at the exact 2e97... package path.

The future receipt remains absent:

`/opt/wandora/ops-workspace/production-rollback-freeze-v2-post-adr0358-f279acc98687da894a1ce6570273b5949552a8c7-mastra060-2e97da6d.metadata`

The historical ADR 0356 receipt remains untouched.

## Explicit effect boundary

**PRECHECK NOT EXECUTED.**

**CAPTURE NOT EXECUTED.**

**PRODUCTION CUSTOMER EFFECT = NONE.**

No Semantic Fast Read was opened or executed. No VendaERP/provider/customer call occurred. No outbound activation occurred. Core, Paperclip and Gateway were not altered. No rollback capture or future receipt was created.

## Next slice

**STOP HERE.**

The next chat/slice is a separate **Post-ADR0358 Rollback Freeze V2 — ROOT PRECHECK EXECUTION V1**.

It must restart from fresh REAL NOW evidence, decision, second adversarial review, new `host_admin_prepare`, explicit human approval and exactly one execution of the existing zero-argument `wandora-rollback-freeze-v2-precheck` program.

Persistent capture is a third separate slice and is authorized only after the root precheck is GREEN. Semantic Fast Read remains outside this boundary.
