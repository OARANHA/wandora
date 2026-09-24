# wandora_mastra@0.5.0 Read-Tool Failure Disposition Production Promotion Runbook V1

Authority: ADR 0239.

This runbook is for the separate production execution slice only. It never authorizes a VendaERP or production-model read.

## Frozen identities

- main = 9f40ccfd3469d9e8c465155ddd95f85c76b45348
- candidate artifact id = 10788382398
- candidate tgz = wandora-paperclip-adapter-mastra-0.5.0.tgz
- candidate tgz SHA-256 = 64795ff7d2c519ef6303ab0944bac02d27aadf8b919860b832c2e6fac4defb62
- candidate persistent target = /paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/64795ff7d2c519ef6303ab0944bac02d27aadf8b919860b832c2e6fac4defb62/package
- rollback package = /paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c/package
- rollback registry SHA-256 = 45e0ca8d1ba002754a56de189ac1586cac99378a782a674bce36093290877a17

## Hard stops

STOP before mutation unless all are true:

- repository/head/workflows match the approved execution base;
- Paperclip is healthy;
- live adapter is exactly one loaded/enabled 0.4.0;
- candidate artifact and extracted file hashes match ADR 0239;
- retained rollback package and frozen registry match ADR 0239;
- Task Drain is readable;
- work operations = 0;
- outbound attempts = 0;
- VendaERP Connection activity has no delta;
- candidate target is absent or byte-identical to the frozen candidate.

Never call VendaERP or a production model during this runbook.

## 1. Reconcile before effect

Read current main, open PRs, exact-head workflows, Core/Paperclip image/container/health/restart count, adapter registry/readback, official adapter test-environment, Task Drain, work/outbound counters and VendaERP Connection activity.

Do not rely on the previous chat response.

## 2. Start native Task Drain

Use Paperclip protected instance-admin authority.

Require:

- draining=true;
- activeRuns=0;
- pendingWakes=0;
- quiescent=true.

If quiescence is not reached, STOP.

Task Drain is process-local and is cleared by restart.

## 3. Stage exact candidate

Only while drained:

1. create the exact content-addressed candidate directory if absent;
2. extract only the frozen 0.5.0 tgz;
3. verify all four package file hashes from ADR 0239;
4. verify package name/version/main/compatibility metadata;
5. do not touch the retained 0.4.0 directory.

If target exists with different bytes, STOP.

## 4. Official replacement — exactly once

Call Paperclip POST /api/adapters/install with the exact local candidate package directory and isLocalPath=true.

Expected confirmed result:

- HTTP 201;
- type=wandora_mastra;
- version=0.5.0;
- requiresRestart=true.

If the response is ambiguous, DO NOT repeat.

Resolve first through:
- authenticated GET /api/adapters/wandora_mastra;
- /paperclip/adapter-plugins.json;
- exact candidate/rollback package paths.

## 5. Validate candidate before restart

The original process remains under the first Task Drain.

Require:
- wandora_mastra=0.5.0;
- loaded=true;
- disabled=false;
- exact candidate package path.

Run official company-scoped test-environment and require PASS.

This test is local/config-only and must not execute customer work, model or provider calls.

If it fails, use the pre-restart rollback path.

## 6. Recreate only Paperclip

Use exact current stack:
- project=paperclip;
- working directory=/opt/wandora/stacks/paperclip;
- compose.yaml;
- compose.paperclip-execution-bridge.yaml;
- same current HMAC host path and .env custody.

Recreate only service paperclip, exactly once, with image wandora/paperclip:v2026.916.0.

Do not recreate Core, Web, Gateway or Supabase.

If command outcome is ambiguous, inspect Paperclip container identity/state before any repeat.

Restart clears Task Drain by design.

## 7. Post-restart validation

Require:
- Paperclip healthy;
- restart=0 on recreated container;
- image unchanged;
- exactly one wandora_mastra;
- version=0.5.0;
- loaded=true;
- disabled=false;
- exact candidate package path;
- test-environment=PASS.

Immediately require:
- Task Drain draining=false;
- activeRuns=0;
- pendingWakes=0;
- quiescent=true;
- Wandora work operations=0;
- outbound attempts=0;
- VendaERP Connection activity delta=0.

Scan the maintenance window for provider/model/tool-execution markers.

Then STOP. Do not create validation customer work.

## Pre-restart rollback

If candidate is installed in-memory but fails validation before restart:

1. keep the first Task Drain active;
2. call official adapter install exactly once with retained 0.4.0 path;
3. resolve ambiguous response by readback;
4. require registry/readback points to 0.4.0;
5. restart only Paperclip if restore response requires it;
6. require exactly one loaded/enabled 0.4.0 + test-environment PASS.

## Post-restart rollback

Restart has cleared the first Task Drain.

Before restore:

1. establish a **new** Paperclip Task Drain;
2. require draining=true, activeRuns=0, pendingWakes=0, quiescent=true;
3. restore retained 0.4.0 through official adapter boundary exactly once;
4. resolve ambiguity by readback before retry;
5. restart only Paperclip if required;
6. require exactly one loaded/enabled 0.4.0 + test-environment PASS;
7. recheck zero live/pending runs, work/outbound and unchanged VendaERP activity.

If Paperclip cannot start sufficiently for official rollback, the frozen adapter-plugins.json is break-glass recovery for Paperclip-owned state only. Restore it only after proving the official boundary is unavailable, then recreate Paperclip once and perform the full readback.

## Forbidden

- VendaERP tools/call;
- any model call;
- customer work creation;
- synthetic failed-work issue creation;
- outbound;
- migration;
- Core recreation;
- MCP replacement;
- Connection/grant/secret/install/profile/catalog mutation;
- blind adapter-install retry;
- blind Paperclip-restart retry;
- deleting retained rollback package.
