# ADR 0309 — Current Rollback/Custody Precheck + Owner Browser Trigger Preparation V1

Date: 2026-09-27

Status: **PREPARED / CANONICAL V2 STAGED EXACT-BYTES / BASH-N GREEN / ROOT PRECHECK BLOCKED BY CURRENT MANAGED-ADMIN PROGRAM AUTHORITY / ROLLBACK NOT CAPTURED / HUMAN FAST READ NOT EXECUTED / NO PRODUCTION EFFECT**

## Objective

Continue ADR 0308 without widening Remote-Ops or duplicating provider capabilities.

Prepare the smallest existing-authority path for the three remaining Immediate Pre-Mutation gaps:

1. fresh metadata-only TypeSafe/`wfri1`/Mistral custody readback;
2. a legitimate owner/admin Human Fast Read trigger that keeps browser session material inside the browser;
3. rollback readiness for the immediately current Paperclip/Core/Organization Adapter state.

This ADR is preparation only. It does not authorize the root precheck, rollback capture, custody mount, Core recreation, gate activation, provider call or Human Fast Read.

## REAL NOW

Repository at preparation entry:

- `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 = open / draft / mergeable;
- exact source head = `2b54668dfe85a9495c6a38c9d409f2deeb949a85`;
- exact source head = **17/17 workflows completed successfully**.

Current production anchors remain:

- Paperclip `wandora/paperclip:v2026.916.1`;
- Paperclip source commit `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
- Core `wandora/core:organization-adapter-candidate-2c2142237c9c`;
- Core revision `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`;
- Organization Adapter `wandora.organization-adapter-v1@0.5.0`, package path ending in `f4e733613e72e771eb18361dbdbf420c810c5b8bbe31361a64040a2081cc2ae2/package`;
- Core gates-OFF `compose.semantic-fast-read.yaml` active;
- Core custody and attestation overlays absent;
- Paperclip semantic Fast Read candidate compose active;
- Task Drain OFF/quiescent;
- Human Send OFF;
- Messaging Gateway outbound OFF.

ADR 0308 already closed:

- exact current VendaERP policy authorization for the bounded read;
- Ana's current `error` projection as a lifecycle blocker: exact Paperclip v2026.916.1 source explicitly treats `error` as invokable.

## Capability Authority / Reuse Gate

ADR 0168 remains binding.

No new backup service, secret manager, identity proxy, session broker, lifecycle or execution subsystem is justified.

Reuse:

- the already-qualified ADR 0299 rollback/restore mechanism;
- Paperclip's official `db:backup`;
- the existing local PostgreSQL 18.1 recovery image;
- current Remote-Ops governed operator boundaries;
- the existing Wandora browser session and Core owner/admin authorization;
- the existing Human Fast Read API.

The operator plane must not acquire or impersonate a customer Bearer token.

## Decision A — adapt the existing rollback helper, do not invent another mechanism

The already-qualified ADR 0299 helper was copied byte-for-byte in the operator workspace:

`/opt/wandora/ops-workspace/production-rollback-freeze-v1.sh`
→
`/opt/wandora/ops-workspace/production-rollback-freeze-v2.sh`.

Immediately after copy, both files had SHA-256:

`db48c0d1508cd816c4fa3dab224487a47672b00cab368488d359bb49372c7afe`.

V2 then changed only current anchors/guards/names required by runtime drift:

- Paperclip v916.0 → v916.1;
- Paperclip commit → `d554c478...`;
- Core f322... → `2c214223...`;
- Organization Adapter 0.3.1 → 0.5.0 and its exact current package path;
- require the current Core gates-OFF semantic overlay rather than reject it;
- continue to reject custody and attestation overlays;
- require the current Paperclip three-file Compose set including `compose.semantic-fast-read-candidate.yaml`;
- retain that Paperclip semantic candidate compose in the protected rollback bundle;
- use V2 rollback-root/receipt/terminal-marker names.

All remaining official backup, PostgreSQL dump/restore/schema-equality, master-key copy-equality, provider package capture, Compose capture, protected custody and checksum logic is retained from the qualified mechanism.

## Decision B — split metadata precheck from persistent rollback capture

V2 accepts one optional argument:

`--precheck-only`.

That mode runs the same fresh current-state checks, including:

- exact Paperclip/Core/OA anchors;
- Task Drain quiescence;
- gates/outbound disabled;
- TypeSafe/`wfri1`/Mistral regular-file metadata;
- local PostgreSQL 18.1 identity;
- live PostgreSQL/schema read;
- collision checks.

It then stops **before the first persistent write** and emits only safe metadata plus:

`ROLLBACK_FREEZE_V2_PRECHECK_OK`.

It does not create the protected rollback root or V2 receipt.

The no-argument path remains the separately authorizable persistent rollback capture and terminates only on:

`ROLLBACK_FREEZE_V2_OK`.

This separation prevents a metadata freshness check from implicitly authorizing a protected backup write.

## Validation status of the prepared helper

Before `--precheck-only` was added, the V2 helper passed:

`bash -n production-rollback-freeze-v2.sh` → exit 0.

The prior V1→V2 diff was also read back and contained only the expected anchor/guard/name/copy changes.

After the `--precheck-only` block was added, the execution broker refused further `process.start` with:

`BROKER_DENIED: session_capacity`.

At that preparation checkpoint, state-first reconciliation proved the edit itself did commit to the workspace. All retained sessions shown by the broker were already terminal, and attempted termination correctly returned `sent=false`. The broker was **not** restarted merely to obtain another syntax check.

That historical validation gap is now closed by the later exact-byte staging checkpoint below: the host file matches canonical Git blob `849a05971d5f2526b6e8829d5315b4678f169315` and a fresh non-root `bash -n` exits 0.

Therefore the current state is:

**HELPER STAGED EXACT-BYTES / POST-STAGING SYNTAX GREEN / ROOT EXECUTION STILL NOT AUTHORIZED.**

## Decision C — legitimate owner/admin trigger remains browser-owned

The existing Web already stores its authenticated browser session in `sessionStorage`, and `AuthProvider.authFetch` injects the Bearer token locally.

The Core Human Fast Read route:

- derives the user from the supplied authenticated session;
- passes canonical `session.user.id`;
- revalidates the organization membership server-side;
- requires active role `owner` or `admin`.

Therefore the future bounded test must be initiated inside the already-authenticated owner/admin browser, not from Remote-Ops.

The prepared browser procedure:

1. reads the existing session locally without logging/exporting it;
2. calls `GET /api/v1/me`;
3. requires an active selected organization whose returned role is `owner` or `admin`;
4. reads that organization's digital employees;
5. requires exactly one intended active Ana employee;
6. prints only safe organization/role/employee preflight metadata;
7. defaults to no POST;
8. only after an explicit local execution switch sends one POST to the existing Human Fast Read route;
9. never prints access/refresh tokens.

Candidate bounded request:

`Qual é o preço do produto PREMIUM PLUS?`

This is selected because the current contract requires a product selector + price and the request exercises that complete semantic path. Historical price data is not treated as the current expected answer.

The existence of this procedure closes the **boundary design** gap, but it does not prove a current authenticated owner session. That is intentionally execution-time human evidence.

## Second adversarial review

Preparation-only review returned:

- `proceed_fast = 0.59`;
- `deep_review = 0.33`;
- `block = 0.07`;
- `split_task = 0.01`.

The decision remains narrow because no root/effect execution is included.

## Effect boundary

This slice performed only repository analysis and an operator-workspace helper preparation.

It did **not** perform:

- root helper execution;
- metadata precheck execution;
- rollback capture;
- secret value read;
- Core/Paperclip/Gateway container recreation;
- Compose activation;
- Task Drain mutation;
- Tool Policy mutation;
- TypeSafe/Mistral/VendaERP call;
- customer Human Fast Read;
- Human Send;
- WhatsApp/outbound.

## Result

The three ADR 0308 gaps are now separated into executable boundaries:

1. **fresh secret metadata** — prepared as V2 `--precheck-only`, but still requires post-edit syntax validation + a fresh reviewed/authorized root execution;
2. **legitimate Human trigger** — qualified as a browser-owned, server-revalidated owner/admin path; current human authentication remains execution-time evidence;
3. **current rollback capture** — prepared through the same ADR 0299 mechanism, but requires a separate later decision/review/authorization after the precheck is GREEN.

Production attestation remains blocked.

## Post-preparation adversarial reconciliation — workspace helper quarantined

A state-first audit found a material reproducibility gap in the workspace-only V2:

- a retained pre-`--precheck-only` Git diff proves that staged V2 still contained two `ROLLBACK_FREEZE_V1_OK` terminal markers at that point;
- the later edit is proven to have added `--precheck-only`, but the shared execution broker now rejects new process sessions with `BROKER_DENIED: session_capacity` on both operator targets;
- governed `read_file` returns the first 400 lines only, so the current tail cannot be independently re-read;
- infrastructure was not restarted merely to recover convenience.

Therefore the current VPS copy is **QUARANTINED / DO NOT EXECUTE**. Documentation intent is not proof of the current tail bytes.

The remediation is repository-only. `scripts/operations/production-rollback-freeze-v2.sh` becomes the canonical V2 source, deterministically derived from the qualified V1 pattern with current anchors, `--precheck-only`, V2-only receipt/root/error/terminal markers, exact image/revision guards and CI validation against pinned Paperclip v2026.916.1 source.

A future host-staging effect must replace the quarantined workspace copy with the exact CI-qualified repository bytes and independently prove identity before any root call.

Final narrowed adversarial review for this repository-only remediation returned `proceed_fast=0.66 / deep_review=0.29 / split_task=0.04 / block=0.01`.

No VPS write or production effect is included in this remediation.

## Canonical V2 host staging checkpoint — exact bytes / no root execution

Fresh reconciliation immediately before staging proved:

- `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 remained open / draft / mergeable at exact source head `11cda265e15e75ee03492326a3b9bbf64bfd8d9b`;
- all 17 workflows for that exact head completed successfully;
- Semantic Fast Read CI run `36335619133` completed GREEN, including `ADR 0309 canonical V2 rollback helper static qualification` and the pinned Paperclip v916.1 contract;
- production remained inert and healthy on Paperclip v2026.916.1, Core `2c214223...`, exactly one Organization Adapter 0.5.0 ready, Task Drain false/0/0/quiescent, Human Send OFF and Gateway outbound OFF.

Capability Authority / Reuse Gate found no missing subsystem. The already-governed `wandora-agent` target permits atomic writes inside `/opt/wandora/ops-workspace`, so staging reused that existing boundary without allowlist, target-authority, broker, Docker or root expansion.

Immediately before staging, governed `git hash-object --no-filters` proved the quarantined host copy was still non-canonical:

`4058eaf32e46de69e23a1866ba64878491bf642e`.

The exact repository source at the GREEN head has Git blob:

`849a05971d5f2526b6e8829d5315b4678f169315`.

The second adversarial review for the bounded staging action returned `allow` with probabilities `allow=0.70 / confirm=0.23 / review=0.04 / deny=0.03`. The operator request explicitly scoped this continuation through the safe staging limit.

Execution then replaced only:

`/opt/wandora/ops-workspace/production-rollback-freeze-v2.sh`

using the exact GitHub file bytes from source head `11cda265...`.

Independent post-write validation proved:

- host `git hash-object --no-filters` = `849a05971d5f2526b6e8829d5315b4678f169315`, exactly matching the canonical GitHub blob;
- non-root `bash -n /opt/wandora/ops-workspace/production-rollback-freeze-v2.sh` exited 0;
- no `production-rollback-freeze-v2.metadata` receipt exists;
- the same seven production containers remained present and healthy with the same identities observed before staging;
- Task Drain remained `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`.

No helper mode was executed. In particular, no `sudo`, no `--precheck-only`, no no-argument rollback capture, no protected rollback-root creation, no secret read, no Compose/container/gate mutation, no provider/model/VendaERP call, no customer work and no outbound effect occurred.

The former host-byte quarantine is therefore closed **only for file identity and syntax**. This checkpoint does not authorize root execution.

## Root precheck fresh reconciliation — blocked by current managed-admin program authority

A fresh continuation started from repository, CI and runtime state rather than from chat history.

Repository and CI at the decision point:

- `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 remained open / draft / mergeable at head `ded6f2a443545b52f64d6ec617ffe5531e62230a`;
- the current head is two documentation-only commits ahead of the fully GREEN staging source head `11cda265e15e75ee03492326a3b9bbf64bfd8d9b`;
- the canonical helper blob remains `849a05971d5f2526b6e8829d5315b4678f169315`;
- fresh CI readback reached **16/17 GREEN / 0 failures**, with only `Paperclip Fast Read Production Candidate CI` still in progress; no workflow was rerun.

Fresh host/runtime evidence remained inert and compatible with the V2 guards:

- staged host `git hash-object --no-filters` = `849a05971d5f2526b6e8829d5315b4678f169315`;
- fresh non-root `bash -n` = exit 0;
- `production-rollback-freeze-v2.metadata` remained absent from the operator workspace;
- Paperclip remained `wandora/paperclip:v2026.916.1`, healthy, restart 0, commit `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
- Core remained `wandora/core:organization-adapter-candidate-2c2142237c9c`, healthy, restart 0, revision `2c2142237c9cccc1f7a90d6ae056cd12cc5f4754`;
- Core active Compose retained the gates-OFF semantic overlay and excluded custody/attestation overlays;
- exactly one `wandora.organization-adapter-v1@0.5.0` remained `ready` with `lastError=null`;
- Task Drain remained `draining=false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- Core Fast Read/Semantic execution remained OFF, Human Send remained OFF and Messaging Gateway remained healthy with outbound OFF.

Capability Authority / Reuse Gate again found no missing Wandora subsystem and no justification for a new backup mechanism, secret manager, lifecycle, execution subsystem or Remote-Ops expansion.

The existing `wandora-managed-admin` target does expose semantic capability `host.managed_admin`, but its current root `allowedAdminPrograms` does **not** include `bash` or `sh`. The exact governed preparation:

`bash /opt/wandora/ops-workspace/production-rollback-freeze-v2.sh --precheck-only`

was submitted through `host_admin_prepare` and deterministically rejected before any approval was created:

`CAPABILITY_DENIED: program administrativo "bash" é hard-denied`

Therefore there is no legitimate `adm_...` to confirm for this root precheck under the current authority boundary. No `host_admin_apply` was attempted.

The first adversarial guard review was already non-permissive (`deny=0.52 / confirm=0.46`, low confidence). After the deterministic authority denial, a new independent route review returned:

- `block = 0.97`;
- confidence `0.96`;
- `proceed_fast = 0.02`;
- `deep_review = 0.01`.

Decision:

**BLOCK / NO ROOT PRECHECK / NO AUTHORITY WIDENING / NO PRODUCTION EFFECT.**

Do not resolve this by changing target presets/allowlists, using `target_agent_prepare/apply`, invoking Docker/systemd as a shell substitute, or bypassing the managed-admin policy. The full no-argument rollback capture remains a separate later effect and is not authorized.

The protected rollback-root path was not bypassed merely to enumerate it from an unauthorized boundary. Absence of the V2 safe receipt is proven; absence of an independently created protected V2 root is not upgraded beyond the evidence available through the current authorized boundary.

## Next

1. Let the current exact-head CI finish naturally; do not rerun merely because one workflow is still in progress.
2. Keep the root precheck blocked while the only governed root boundary hard-denies the exact executable required by the canonical helper.
3. Any future change to managed-admin root program authority must be treated as a **separate governance/capability slice**, with its own canonical evidence, decision, second adversarial review and explicit authorization; it must not be smuggled into this precheck slice.
4. If a canonically authorized existing root boundary later accepts the exact helper without an in-slice authority widening, start again from fresh repository/CI/runtime state, rerun the decision and second adversarial review, prepare the exact one-use admin ticket, and require the user's explicit `APPROVE adm_...` before apply.
5. Only after a GREEN `ROLLBACK_FREEZE_V2_PRECHECK_OK` may the no-argument V2 rollback capture be considered in a separate slice.
6. Only after a separately authorized/validated current rollback capture may a brand-new Immediate Pre-Mutation Attestation + Effect Authorization begin.

ADR 0309 must never be reused as production activation authorization.
