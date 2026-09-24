# ADR 0239 — wandora_mastra@0.5.0 Read-Tool Failure Disposition Production Promotion Preflight V1

Status: **GREEN / GO FOR SEPARATE PROMOTION ONLY / NO PROVIDER CALL / NO PRODUCTION EFFECT**
Date: 2026-09-24

## Objective

Qualify the exact production promotion of wandora_mastra@0.5.0 without calling VendaERP, running a production model, or changing live runtime during this preflight.

ADR 0238 closed the strict one-shot lifecycle gap in code: canonical customer-work HTTP 422 read-tool-failed maps to Paperclip-native blocked + unblockDescriptor, while the adapter run remains failed.

## REAL NOW

Repository:
- main = 9f40ccfd3469d9e8c465155ddd95f85c76b45348
- PR #311 = MERGED
- open PRs = 0 at preflight
- post-merge workflows = 6/6 GREEN

Production:
- Core = wandora/core:organization-adapter-candidate-4a54b5d8f14c
- Core revision = 4a54b5d8f14c469989fad277189f6ebdfb8fb1f0
- Core = healthy / restart 0
- Paperclip = wandora/paperclip:v2026.916.0
- Paperclip container id = 3633c77211a019646e92bd05af471027d1333d93056f7029be184078b7d32a2e
- Paperclip = healthy / restart 0

Official live adapter readback:
- type = wandora_mastra
- version = 0.4.0
- loaded = true
- disabled = false
- isLocalPath = true
- retained path = /paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c/package

Official test-environment = HTTP 200 / PASS. Source proves testEnvironment only validates local bridge URL/timeout/issue URL/HMAC custody and does not call Core execution, VendaERP or a model.

Task Drain readback:
- draining=false
- activeRuns=0
- pendingWakes=0
- quiescent=true
- expiresAt=null

Wandora counters:
- 28PRO work operations = 0
- 28PRO outbound attempts = 0

VendaERP Connection activity response SHA-256 remains exactly:
47de715854412222801f1f03c89b27d28ab64d0c2a5e824e04453539900e0c36

The response has 68 historical activity events, but byte-identical response hash versus ADR 0236 proves zero activity delta. No VendaERP tool call, model execution, customer work or outbound occurred in this preflight.

## Capability Authority / Reuse Gate

- Wandora owns customer/business work semantics, durable success-vs-uncertain receipts, provider-neutral execution correlation and external-effect authorization.
- Paperclip owns issue/run lifecycle, recovery/disposition, external adapter loading/registry, Task Drain and run-scoped operational identity.
- Mastra owns the ephemeral supervised model/tool loop.
- VendaERP MCP owns bounded provider translation and MCP tool-error representation.

ADR 0168 remains binding: Portability = contract decoupling, not implementation duplication. Provider replacement does not imply internalization.

No new table, migration, service, retry engine, lifecycle state machine, secret store or provider registry is authorized.

## Candidate Artifact

Post-merge workflow run id = 35950004444.
Artifact id = 10788382398.
Artifact name = paperclip-mastra-adapter-9f40ccfd3469d9e8c465155ddd95f85c76b45348.

Downloaded GitHub artifact ZIP SHA-256:
43e5cf90b584686a80d86160a6d7c21a05e5aafc682dce844f47a3f5b28ecc21

Provenance:
- wandora_source = 9f40ccfd3469d9e8c465155ddd95f85c76b45348
- paperclip_image = wandora/paperclip:v2026.916.0
- paperclip_source = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
- adapter_type = wandora_mastra

Installable candidate:
- file = wandora-paperclip-adapter-mastra-0.5.0.tgz
- SHA-256 = 64795ff7d2c519ef6303ab0944bac02d27aadf8b919860b832c2e6fac4defb62

Independent npm pack from exact main on the VPS reproduced the same byte hash.

Candidate package contains exactly README.md, compatibility.json, index.mjs and package.json.

Extracted candidate file SHA-256:
- README.md = f7fa768533bd6f1daa627203428e3efd66ecda05531049809676f89613e02287
- compatibility.json = be434e6bf3c7366a601fda63e5c5995bf7ebc592078b4fb5cfd1bd3d652cc7d8
- index.mjs = d76571aa107316683feda2f1222a61f559be47544ff60b04e1592d9f7f06cd95
- package.json = 9b79cd5e192936c6ad3d0ec346d28e2c05b5e63325b59eddf7cf186e1b4b513d

Candidate metadata:
- name = @wandora/paperclip-adapter-mastra
- version = 0.5.0
- adapterType = wandora_mastra
- Paperclip source = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
- failure disposition = run-scoped-issue-blocked-before-failed-adapter-return
- failure scope = exact-422-read-tool-failed-only

Future persistent target:
- /paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/64795ff7d2c519ef6303ab0944bac02d27aadf8b919860b832c2e6fac4defb62/package
- parent writable = yes
- candidate target currently absent

This preflight did not stage the candidate into live Paperclip storage.

## Rollback Evidence

Frozen under:
/home/wandora-admin/preflights/adr0239-read-tool-failure-disposition-promotion-v1/rollback-0.4.0/

Live adapter-plugins.json SHA-256:
45e0ca8d1ba002754a56de189ac1586cac99378a782a674bce36093290877a17

Retained active 0.4.0 file SHA-256:
- README.md = 164d85c8dedae3b5d6098824ced816dd1b4c2afedc95f9f41c72e52db1937f6b
- compatibility.json = d3a741523b6b4e61adcd600051e80885ac1714c4982958b26a279ef8bba316e8
- index.mjs = a8928675fd80145e330e3a775f4ba3891b295edd48404331238db2a4980dfd39
- package.json = f52507a1759ba6f6b137e9548ea0cea15c9a6b31fff1ea5f3ade5e4c2d05a12f

The retained live directory is the primary rollback identity and must not be deleted.

## Live Compose Identity

Project = paperclip.
Working directory = /opt/wandora/stacks/paperclip.
Service = paperclip.

Exact Compose inputs:
- compose.yaml SHA-256 = eabfb8b8828d3de90bf29b8e96a503231f97b2413d8dc61903fbd610b379bf29
- compose.paperclip-execution-bridge.yaml SHA-256 = 193bc8931652681a03891934db1799dee5557e0e6e6fb068ba09da1d0d017789
- paperclip-bridge-secret-entrypoint.sh SHA-256 = e44b6ff5dc83a5b991fc0e44035598b32528a6e7b5f3fe6db2f929561be7856d
- rendered Compose SHA-256 with current HMAC host path = 84e9f72b38d8d9097fc116c0d9da780112fe975af9c91060e867fbed79afd068
- rendered services = paperclip only

The /paperclip data volume is persistent and rw. Bridge HMAC, bridge wrapper and VendaERP MCP mounts remain read-only. No Compose/image/mount/Core/MCP change is needed.

## Pinned Paperclip Install Semantics

Pinned Paperclip source proves POST /api/adapters/install with isLocalPath=true:
1. loads the candidate before unregistering the current adapter;
2. detects the existing external record as reinstall;
3. unregisters old in-memory adapter;
4. registers new adapter;
5. persists registry;
6. returns requiresRestart=true for reinstall.

Expected confirmed response for this live state:
- HTTP 201
- type = wandora_mastra
- version = 0.5.0
- requiresRestart = true

## Decision — Promotion Shape

Production change is adapter-only.

Forbidden:
- Core recreation;
- Paperclip image change;
- VendaERP MCP replacement;
- Connection/grant/secret/install/profile/catalog mutation;
- migration;
- customer work creation;
- model call;
- VendaERP tool/provider call;
- outbound.

Paperclip-native Task Drain is the only maintenance/quiescence primitive.

## Authorized ADR 0240 Execution Sequence

1. Reconcile main, PRs, workflows and live runtime again.
2. Reverify artifact/provenance/SHA and frozen 0.4.0 rollback.
3. Reverify exactly one loaded/enabled live 0.4.0.
4. Reverify work/outbound zero and unchanged VendaERP activity snapshot.
5. Start native Task Drain with bounded TTL.
6. Require draining=true, activeRuns=0, pendingWakes=0, quiescent=true.
7. Only then stage exact 0.5.0 into the content-addressed Paperclip path.
8. Rehash extracted package and require exact candidate hashes.
9. Dispatch exactly one official /api/adapters/install.
10. Ambiguous response => no retry; read back adapter, registry and package paths first.
11. Confirm type/version/exact path/requiresRestart=true.
12. While original process remains drained, require candidate readback + official test-environment PASS.
13. Recreate only paperclip exactly once with same image and exact current Compose inputs.
14. Ambiguous restart => inspect container identity/state before any repeat.
15. Treat pre-restart Task Drain as cleared by design.
16. Require healthy, restart 0, exactly one loaded/enabled 0.5.0 at exact candidate path and test-environment PASS.
17. Immediately require Task Drain OFF/quiescent, activeRuns=0, pendingWakes=0, work=0, outbound=0, unchanged VendaERP activity and no provider/model/tool-execution marker.
18. STOP. No synthetic customer work and no provider/model validation call.

## Ambiguity / Rollback

Install timeout/broken response is operator execution_uncertain. Never repeat before readback.

Pre-restart candidate failure:
- keep first Task Drain active;
- restore retained 0.4.0 through official adapter install exactly once;
- resolve ambiguity by readback;
- restart only Paperclip if required;
- require loaded/enabled 0.4.0 + test-environment PASS.

Post-restart candidate failure:
- restart cleared the first Task Drain;
- start a **new** native Task Drain and require quiescence;
- restore retained 0.4.0 through official adapter boundary exactly once;
- resolve ambiguity by readback;
- restart only Paperclip if required;
- require loaded/enabled 0.4.0 + test-environment PASS;
- recheck runs/work/outbound/activity.

If Paperclip cannot start enough for official rollback, frozen adapter-plugins.json is break-glass recovery for Paperclip-owned state only, followed by one Paperclip recreate and full readback. Direct registry editing is not the normal path.

## Second Adversarial Review

- Artifact differs from merged main? No; provenance + independent byte-identical pack.
- Rollback can disappear? No; retained persistent path + registry frozen.
- Install unloads old before new is loadable? No; pinned source loads candidate first.
- Install changes in-memory adapter before restart? Yes; first Task Drain must remain active through pre-restart validation.
- Restart guessed? No; reinstall semantics return requiresRestart=true, actual response/readback remains authoritative.
- Duplicate install/restart on timeout? Forbidden; readback/container state first.
- Task Drain survives restart? No.
- Rollback after restart without protection? Forbidden; second Task Drain mandatory.
- test-environment can call VendaERP/model? No; source proves local config-only checks.
- Live failed-work synthetic test needed? No; CI/disposable E2E already proves semantics and live synthetic state would be unnecessary.
- Wandora lifecycle/retry mechanism created? No.
- Core/MCP/Connection/secret/database change required? No.
- Another provider read authorized? No.

## Decision

**GREEN / GO for a separate wandora_mastra@0.5.0 production promotion execution only.**

This ADR authorizes no production effect and no VendaERP/model call.

Another real provider read remains **NO-GO** until ADR 0240 is promoted GREEN and a separate post-promotion NO PROVIDER CALL preflight re-attests live failure-disposition semantics.

## Next Slice

**ADR 0240 — wandora_mastra@0.5.0 Read-Tool Failure Disposition Production Promotion Execution V1 — NO PROVIDER CALL.**
