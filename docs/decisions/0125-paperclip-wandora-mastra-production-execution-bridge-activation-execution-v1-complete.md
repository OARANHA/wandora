# ADR 0125 — Paperclip -> Wandora/Mastra Production Execution Bridge Activation Execution V1 Complete

- Status: **Accepted completion checkpoint — bridge foundation live, employee execution remains deliberately paused**
- Date: **2026-09-19**
- Scope: close Activation Execution V1 after migration 014, dedicated bridge HMAC custody, exact Core promotion, corrected Paperclip bridge secret handoff, persistent exact `wandora_mastra` installation, official adapter test, and final dormant-employee/no-outbound validation.

## REAL NOW

Canonical Git after the corrective implementation:

```text
main = 72bcd60eb8428f6210bd2aae0532edabd2c75c5f
PR #175 = merged
ADR 0124 = canonical
```

Production bridge foundation now runs with:

```text
migration 014 = LIVE / verified
Core image = wandora/core:organization-adapter-candidate-0a40dac127ae
Core bridge = ON / healthy / ready
Paperclip image = wandora/paperclip:v2026.831.1
Paperclip bridge wrapper = corrected command-preserving version
dedicated host HMAC = root:wandora-ops / 0640
in-container Paperclip HMAC = tmpfs / 0400 node:node
wandora_mastra = installed exactly once from persistent hash-addressed local path
```

## PROVEN EVIDENCE

The dedicated host HMAC remains at:

```text
/opt/wandora/stacks/core/secrets/paperclip-execution-bridge-hmac
owner = root:wandora-ops
mode = 0640
```

Paperclip startup copies that value into an in-container tmpfs at the adapter-visible path as:

```text
owner = node:node
mode = 0400
size = 65 bytes
hash = identical to host HMAC
```

The corrected Paperclip container validated:

```text
status = running
health = healthy
restart count = 0
application command = node --import ./server/node_modules/tsx/dist/loader.mjs server/dist/index.js
application process = non-root UID/GID 1000
/api/health = 200 / bootstrapStatus ready
```

`wandora_mastra` readback validates:

```text
type = wandora_mastra
source = external
loaded = true
disabled = false
version = 0.1.0
isLocalPath = true
record count in /paperclip/adapter-plugins.json = 1
localPath = exact hash-addressed persistent operator package path
```

The official no-effect adapter environment check returned:

```text
status = pass
code = wandora-bridge-config
message = Private Wandora bridge configuration is valid.
```

## FINAL SAFETY VALIDATION

Migration/mapping:

```text
resolver present = true
resolver SECURITY DEFINER = true
MEDICSPRO mapping = exact Wandora organization
unknown provider company mapping = NULL / fail-closed
```

Employee/control-plane state:

```text
Wandora Ana count = 1
Wandora Ana = paused + supervised
Paperclip Ana count = 1
Paperclip Ana = paused
Paperclip adapter type = wandora_mastra
wakeup requests = 0
heartbeat runs = 0
agents.resume mentions = 0
```

Outbound/effect state:

```text
Human Send = OFF
Gateway outbound = OFF
MEDICSPRO outbound attempts = 0
```

Core and Paperclip both remained healthy after final validation.

## EXECUTION HISTORY / FAILURE RECONCILIATION

Activation Execution V1 encountered and safely reconciled two important live findings:

1. the initial Paperclip bridge HMAC bind was unreadable after Paperclip intentionally dropped privileges to the Node user; ADR 0123 selected a root-read startup copy into node-owned tmpfs;
2. the first ADR 0123 live promotion overrode the image entrypoint and rendered `Cmd=null`, causing a restart loop before application startup; production was rolled back immediately, ADR 0124 preserved the pinned image command explicitly, CI was hardened, and the corrected retry succeeded.

Neither failure caused Ana execution, wakeups, heartbeat runs, outbound attempts, adapter duplication or migration replay.

## CAPABILITY AUTHORITY / REUSE GATE

PASS.

The resulting production boundary preserves the selected authority model:

- Wandora owns product policy, tenant mapping, supervision and bridge authorization;
- Paperclip owns employee/control-plane state;
- Mastra remains the execution runtime behind `wandora_mastra`;
- no duplicate Wandora employee lifecycle or scheduler was introduced.

## SECOND ADVERSARIAL REVIEW

Confirmed absent:

- migration 014 replay;
- second adapter install;
- `agents.resume` grant;
- Ana resume/activation;
- Wandora `paused -> active` transition;
- Human Send enablement;
- Gateway outbound enablement;
- customer message send;
- secret plaintext exposure;
- host HMAC permission weakening.

## DECISION / STOP

**Activation Execution V1 is complete. STOP.**

The bridge foundation is live and validated, but Ana is intentionally still paused and supervised. No employee execution or customer outbound capability has been activated by this slice.

Any later slice that activates/resumes Ana, grants `agents.resume`, enables Human Send/Gateway outbound, or performs a real customer send requires a new explicit decision -> adversarial review -> execution -> validation cycle.