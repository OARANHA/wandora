# ADR 0351 — Semantic Fast Read Bounded Production Re-Attestation Preflight Blocked on Corrected Core Promotion V1

Date: 2026-09-30

Status: **BLOCKED BEFORE OPEN / ADR 0350 CORRECTION NOT LIVE / NO PRODUCTION MUTATION / NO PROVIDER OR CUSTOMER EFFECT**

## Objective

Start the new Semantic Fast Read bounded production re-attestation slice after ADR 0350 from fresh repository, CI and production evidence, and open no production window unless every hard prerequisite is currently true.

This ADR records the preflight stop. It does not authorize a Core promotion, Semantic Fast Read opening, browser request, provider call or rollout.

## REAL NOW

Fresh GitHub reconciliation proved:

- canonical `main = e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR #369 remains open / draft / mergeable on `feat/semantic-fast-read-runtime-wiring-v1`;
- exact PR head = `d46e58e8e9194486ad8430b37f81cc7b2158f88d`;
- current merge ref = `e7b1b1af596642da54cf5e5db7fae34bb1c9a554`;
- merge-ref parents are exactly `main e4c7c36bb1091ba38d39b85fa259bae94553fc52` + PR head `d46e58e8e9194486ad8430b37f81cc7b2158f88d`;
- exact-head CI = **17/17 workflows GREEN**;
- Semantic Fast Read CI run `36667558613` = success;
- Core CI run `36667558700` = success;
- Core Candidate Artifact run `36667558633`, attempt 2, job `109736364891` = success.

The attempt-2 Core candidate artifact remains available and unexpired:

- artifact id `11077191825`;
- name `core-organization-adapter-candidate-e7b1b1af596642da54cf5e5db7fae34bb1c9a554`;
- GitHub digest `sha256:0ff07a9a6436976e0aeae7393580ee14d0359c968b5becf9dcfca43951cea5a8`;
- expiration `2026-10-07T04:14:46Z`.

No artifact was downloaded, loaded or promoted in this slice.

Fresh production readback proved:

- Core tag = `wandora/core:organization-adapter-candidate-14534e57256f`;
- Core image / OCI manifest id = `sha256:ac253a9479338f0d47954937209323229314ef513125a71dd266558b3bfe1c8b`;
- Core revision = `14534e57256f0a73c49feb3944a1068921468f94`;
- Core healthy, restart count 0;
- exact 14-file gates-OFF Compose provenance remains live;
- custody and attestation overlays are absent;
- TypeSafe/`wfri1` attestation-only mounts are absent;
- Core startup reports `fastReadExecution=false`, `semanticFastRead=false`, `humanSendProposal=false`, `vigiaTelemetry=true`;
- Paperclip = `wandora/paperclip:v2026.916.1`, source `d554c4789ed3930f8a53ac9fdf6503b3187097da`, healthy;
- exactly one `wandora.organization-adapter-v1@0.6.1` is installed, durable plugin id `86e77fe7-c7e4-4bee-afa3-46cdad575d0c`, `status=ready`, `lastError=null`;
- Messaging Gateway is healthy and reports `outboundEnabled=false`;
- Task Drain = `false / 0 / 0 / quiescent=true`.

## PROVEN EVIDENCE

### Exact code/live mismatch

The live Core revision is the earlier merge ref:

`14534e57256f0a73c49feb3944a1068921468f94`

whose parents are exactly:

- `main e4c7c36bb1091ba38d39b85fa259bae94553fc52`;
- PR source `6035cfd2b32eb9a8da1aadb01414759201606930`.

ADR 0350's semantic correction was introduced later at code head:

`1b28df19eef190ec54bded54c9b1cc830a131d0b`.

GitHub compare from `6035cfd2...` to `1b28df19...` is:

- `status=ahead`;
- `ahead_by=10`;
- `behind_by=0`.

The compare includes the exact ADR 0350 production-code change:

`apps/core/src/semantic-routing/typesafe-jev-provider.ts`

plus the two regression-test files.

Therefore the currently live Core does **not** contain the ADR 0350 semantic correction. Reopening Semantic Fast Read on `14534e...` would re-attest the old semantic contract rather than the correction qualified by ADR 0350.

This is the decisive hard gate for this slice.

### Rollback Freeze V2

The current live-baseline receipt exists at:

`/opt/wandora/ops-workspace/production-rollback-freeze-v2-14534e57256f0a73c49feb3944a1068921468f94.metadata`

and fresh readback terminates in:

`ROLLBACK_FREEZE_V2_OK`.

It records the exact current Core/Paperclip/OA/gates-OFF baseline, official backup/restore proof and metadata-only TypeSafe/`wfri1`/Mistral custody.

This is rollback readiness for the **currently live 14534e baseline**. It does not make a not-yet-promoted corrected Core live and therefore cannot cure the hard gate above.

### Fresh Paperclip authority/readiness

Fresh company Tool Policies for 28PRO remain:

`[]`.

A fresh non-consuming/non-auditing Tool Policy qualification for Ana + the exact VendaERP Connection/Catalog identity + `vendaerp_search_products` with `{"pageSize":5,"skip":0}` returned:

- `decision=allow`;
- `allowed=true`;
- `reasonCode=allow_profile`;
- effective profile `259a5449-58ba-4d59-9774-92612e3caa91`;
- `matchedPolicyIds=[]`;
- `auditEvent=null`.

Fresh Organization Adapter `operational-read` then returned:

- `runtimeHealth=ok`;
- Connection `Wandora VendaERP Read-Only V1`;
- `status=active`;
- `enabled=true`;
- `healthStatus=ok`;
- `organizationGrantActive=true`;
- `installedForAgent=true`;
- `vendaerp_search_products` active, risk `read`, read-only, non-write, non-destructive and allowed by the effective profile.

The first operator-read CLI attempt was rejected before snapshot execution with `operator_operational_read_invalid_company_scope` because the caller payload omitted the required top-level `companyId`. Before retrying, pinned live Paperclip source was inspected and proved the exact body contract `{ companyId, params, renderEnvironment }`. The corrected scoped call was then executed once and succeeded. No connected VendaERP tool was executed by either attempt.

### Freshness gates intentionally not consumed after the hard stop

Because the exact corrected Core is not live, this slice deliberately did **not**:

- execute the managed-admin custody-metadata program again;
- open custody or attestation overlays;
- render/apply an opening composition;
- ask the owner/admin browser to execute the preflight/request;
- create a production approval ticket.

The current rollback receipt contains metadata-only custody evidence, but this ADR does not promote that historical capture into a fresh opening-time custody proof. Any later opening must re-read custody immediately adjacent to that future effect.

Likewise, ADR 0349 proved the legitimate browser-owned request boundary once, but browser availability was not claimed fresh here because the earlier hard gate already blocks opening.

## GAPS

The blocking gap is not a new capability or provider subsystem.

The gap is **deployment convergence**:

- ADR 0350 correction = qualified in repository/CI;
- exact corrected Core candidate = built by CI;
- production Core = still the earlier `14534e...` revision without that correction.

No semantic re-attestation can test ADR 0350 until the corrected Core is separately promoted with all effect gates OFF.

## CAPABILITY AUTHORITY / REUSE GATE

ADR 0168 remains binding.

Authority remains:

- **Wandora**: semantic contract, thresholds, admission, signed `wfri1`, business/effect policy;
- **TypeSafe/JEV**: replaceable semantic-decision provider;
- **Mastra + Mistral**: replaceable selector implementation;
- **Paperclip**: run lifecycle, Connections, grants, secrets, Tool Gateway, execution, terminal result and audit;
- **VendaERP**: replaceable business-system read provider.

No new table, migration, state machine, registry, cache, secret manager, lifecycle, retry engine, execution subsystem or provider implementation is justified.

The next need is ordinary deployment of already-qualified Wandora Core code, not internalization of a specialist capability.

## DECISION

**DO NOT OPEN the Semantic Fast Read bounded production re-attestation window.**

Do not mount custody/attestation overlays, enable Fast Read/Semantic/Selector, recreate Core for an attestation, execute the owner/admin browser request or call TypeSafe/Mistral/Paperclip Fast Read/VendaERP.

Split the work.

The next slice is:

**ADR 0350 Corrected Core Compatibility Promotion V1 — CORE ONLY / ALL EFFECT GATES OFF / NO HUMAN FAST READ**

That future slice must independently:

1. restart from fresh REAL NOW;
2. verify the exact attempt-2 candidate artifact and merge provenance;
3. verify portable image/archive identity and exact image tag/digest/revision;
4. re-prove the current `14534e...` rollback boundary immediately before mutation;
5. prove the exact 14-file gates-OFF Compose render resolves only to the corrected candidate;
6. perform a new decision + second adversarial review;
7. obtain a fresh one-use human approval for the Core-only recreation if required by the operator boundary;
8. recreate only Core with Fast Read, Semantic Fast Read, Semantic Selector and Human Send remaining OFF;
9. validate exact image/revision/health/restart/Compose/gates and unchanged Paperclip/OA/Gateway/Task Drain;
10. document and hard stop.

A production re-attestation is a **later new slice** after that promotion.

## SECOND ADVERSARIAL REVIEW

A fresh JEV 1.13.0 route review challenged the split decision using current GitHub/runtime/provider evidence.

Result:

- route = `split_task`;
- probabilities: `split_task=0.55`, `proceed_fast=0.29`, `deep_review=0.11`, `block=0.05`;
- reported confidence = `0.40`.

Because this was a consequential production boundary, a focused guard review then challenged the alternative “open the currently live 14534e Core anyway”.

Result:

- decision = `deny`;
- `deny=1.00`;
- confidence = `0.99`.

The deterministic source/live mismatch is independently sufficient to block opening.

## EXECUTION

No production mutation was executed.

Read-only/preflight work was limited to:

- canonical repository/ADR/runbook reads;
- GitHub PR/merge/CI/artifact reconciliation;
- production container/Compose/log/Task Drain readback;
- current Rollback Freeze V2 receipt readback;
- Paperclip plugin list;
- Tool Policy list/test;
- source inspection after the rejected malformed operator-read request;
- one correctly scoped bounded OA `operational-read`;
- JEV governance reviews.

Not executed:

- deploy or image load;
- Core recreation;
- custody/attestation overlay;
- Fast Read/Semantic/Selector activation;
- Human Fast Read;
- TypeSafe/System One customer-path call;
- Mistral selector call;
- Paperclip Fast Read run;
- VendaERP tool/API read or write;
- retry/second ERP read;
- Human Send;
- Gateway outbound;
- WhatsApp/customer effect;
- migration or database mutation.

## VALIDATION

Final observed production state remains inert:

- Core exact `14534e...`, healthy, gates OFF;
- Paperclip v2026.916.1 healthy;
- exactly one OA 0.6.1 ready / `lastError=null`;
- Task Drain `false / 0 / 0 / quiescent=true`;
- Gateway outbound OFF;
- no custody/attestation mounts introduced;
- no provider/business/customer/outbound effect occurred.

## DOCUMENTATION / HARD STOP

Record this checkpoint in `docs/CANONICAL_STATE.md` and `docs/WANDORA_PROJECT_SOURCE.md`.

Then stop.

Do not convert this preflight into the corrected-Core promotion in the same slice. The promotion requires a new fresh decision/review/effect authorization boundary.
