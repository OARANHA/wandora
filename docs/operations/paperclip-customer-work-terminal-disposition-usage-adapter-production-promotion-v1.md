# Paperclip Customer-Work Terminal Disposition + Usage Adapter — Production Promotion Execution V1

Status: **Frozen by ADR 0151; do not execute from this runbook without fresh reconciliation and second adversarial review.**

## Immutable inputs

```text
main = c44634ea8f03b491db32fbde9917a2b7a7fcbd16

candidate:
  version = 0.4.0
  tgz = wandora-paperclip-adapter-mastra-0.4.0.tgz
  sha256 = 6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c

candidate host root:
  /home/wandora-admin/preflights/paperclip-customer-work-terminal-promotion-v1/candidate-0.4.0

rollback host root:
  /home/wandora-admin/preflights/paperclip-customer-work-terminal-promotion-v1/rollback-0.3.0

live 0.3.0 package hash:
  78e4b57ee2f12a898f697f5b9c491e820d8f68d589fce55a3fdde1fc4ed82798

Paperclip image:
  wandora/paperclip:v2026.916.0

MED-1:
  42a8a8df-f6d9-4a4e-a3aa-662a05dc6154

MEDICSPRO Paperclip company:
  a63f27a8-dbac-4552-a456-b3a21302226b

protected board auth store:
  /paperclip/operator-cli/activation-v1/auth.json

private API base:
  http://127.0.0.1:3100
```

Never print the auth-store contents.

## Pre-mutation gates

Require all:

```text
Paperclip healthy
exactly one wandora_mastra registration
version = 0.3.0
loaded = true
test-environment = pass

MED-1 = blocked
MED-1 live-runs = []
MED-1 activeRecoveryAction = null
MED-1 checkoutRunId = null
MED-1 executionRunId = null

Wandora work operations = 1
Paperclip historical runs = 2
Core model calls = 1
outbound attempts = 0
Human Send = OFF
Gateway outbound = OFF
```

If any differs, STOP and reconcile.

## Candidate staging

The execution may copy/extract the frozen 0.4.0 tarball only under:

```text
/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
6390812d44afed0918b64388a882e10de0761de08c9b78f440403336612b717c/
```

Expected extracted install directory:

```text
.../package
```

The retained 0.3.0 directory MUST remain untouched.

Verify before install:

```text
package name    = @wandora/paperclip-adapter-mastra
version         = 0.4.0
main            = ./index.mjs
artifact sha256 = exact frozen hash
```

## Official adapter replacement

Use the protected instance-admin credential store and explicit private API base.

Conceptual CLI contract:

```text
PAPERCLIP_AUTH_STORE=/paperclip/operator-cli/activation-v1/auth.json
paperclipai adapter install
  --payload-json {
    "packageName":"<exact persistent 0.4.0 package directory>",
    "isLocalPath":true
  }
  --api-base http://127.0.0.1:3100
  --json
```

Dispatch exactly once.

Expected response:

```text
type = wandora_mastra
version = 0.4.0
isLocalPath = true
requiresRestart = true
```

If response is ambiguous, DO NOT repeat. Run authenticated `adapter get wandora_mastra` and inspect `adapter-plugins.json` first.

## Paperclip-only restart

After confirmed replacement:

1. recreate/restart only the existing Paperclip service;
2. do not change image;
3. preserve current bridge wrapper/HMAC custody;
4. wait for health;
5. require restart/recreate operation happened only once.

Post-restart require:

```text
Paperclip = healthy
wandora_mastra count = 1
version = 0.4.0
loaded = true
disabled = false
supportsLocalAgentJwt = true
test-environment = pass
```

Then revalidate:

```text
Ana = active + supervised
no new live run
historical runs = 2
model calls = 1
outbound = 0
Human Send = OFF
Gateway outbound = OFF
```

## Historical MED-1 terminal repair

Only after 0.4.0 is healthy.

Pre-read with official board CLI:

```text
issue get MED-1
issue live-runs MED-1
issue recovery-actions MED-1
```

Require:

```text
status = blocked
live-runs = []
active recovery = none
```

Then issue exactly one board-authorized status-only update:

```text
PAPERCLIP_AUTH_STORE=/paperclip/operator-cli/activation-v1/auth.json
paperclipai issue update 42a8a8df-f6d9-4a4e-a3aa-662a05dc6154
  --status done
  --api-base http://127.0.0.1:3100
  --json
```

Do not add comment, run id, API key, reassignment or resume/reopen intent.

If response is ambiguous, read MED-1 first. Do not repeat until state proves the first mutation did not commit.

## Final validation

Require:

```text
MED-1 = done
MED-1 live-runs = []
historical heartbeat runs = exactly 2
new issue_continuation_needed runs = 0
Core model calls = exactly 1
Wandora work operations = exactly 1
outbound attempts = 0
Human Send = OFF
Gateway outbound = OFF
Ana = active + supervised
wandora_mastra = exactly one / 0.4.0 / loaded
Paperclip = healthy
```

No historical usage backfill is authorized.

## Rollback

If adapter replacement/restart does not validate before MED-1 repair:

- restore frozen `adapter-plugins.json`;
- retain/use existing 0.3.0 package path;
- recreate/restart only Paperclip;
- require healthy + one loaded 0.3.0 registration;
- verify MED-1 remains blocked and counters remain unchanged;
- STOP.

Never replay the MEDICSPRO work as a rollback or validation mechanism.
