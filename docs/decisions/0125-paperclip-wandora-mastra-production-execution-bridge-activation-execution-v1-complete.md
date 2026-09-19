# ADR 0125 — Paperclip -> Wandora/Mastra Production Execution Bridge Activation Execution V1 — Complete

- Status: **Accepted execution checkpoint — bridge foundation live; employee/outbound activation remains prohibited**
- Date: **2026-09-19**
- Scope: record completion of the reviewed Paperclip -> Wandora/Mastra production execution bridge foundation after ADRs 0118, 0120, 0121, 0122, 0123 and 0124, while keeping Ana paused/supervised and all customer outbound effects OFF.

## REAL NOW

Canonical Git at completion:

```text
main = 72bcd60eb8428f6210bd2aae0532edabd2c75c5f
PR #175 = merged
ADR 0124 = canonical
```

PR #175 completed all six required workflows successfully:

```text
Paperclip Mastra Adapter CI = GREEN
Core CI                     = GREEN
Organization Adapter Plugin CI = GREEN
Messaging Gateway CI        = GREEN
Platform Admin CI           = GREEN
Web CI                      = GREEN
```

## PROVEN EXECUTION

### 1. Migration 014

Migration 014 remains LIVE and verified. It was not repeated during the resumed execution.

```text
resolver = wandora_private.resolve_paperclip_execution_organization(text)
MEDICSPRO mapping = exact
unknown mapping = NULL / fail-closed
```

### 2. Dedicated bridge HMAC custody

Host custody remains:

```text
/opt/wandora/stacks/core/secrets/paperclip-execution-bridge-hmac
owner = root:wandora-ops
mode  = 0640
size  = 65 bytes
```

Its SHA-256 differs from existing directional HMACs. Plaintext was never printed.

Core reads the root-custodied file directly through its reviewed read-only mount.

Paperclip uses the ADR 0123/0124 privilege-drop-safe path:

```text
host root-only bind
-> /run/secrets-root/wandora/paperclip-execution-bridge.hmac
-> startup wrapper
-> in-container tmpfs
-> /run/secrets/wandora/paperclip-execution-bridge.hmac
   mode 0400 / uid:gid 1000:1000
-> original Paperclip entrypoint
-> non-root application process
```

Runtime hash equality between the host HMAC and Paperclip tmpfs copy is proven.

### 3. Exact Core candidate

Live Core:

```text
image = wandora/core:organization-adapter-candidate-0a40dac127ae
image id = sha256:1fd3f3d7e63d77a9dc80bb903e85ceba77d14aaa8739464133523d54872f5b14
source tree = abacb9da0949a63210080a01bdd95b087e98d02e
archive sha256 = b101033ac47b7f1e4695d5e2a15d288558682d38e0e508cd7d059abd0aae902d
health = healthy
restart count = 0
/healthz = 200
/readyz = 200
bridge enabled = true
```

Unsigned POST to the private execution boundary was previously proven rejected with 401.

### 4. Paperclip bridge runtime

Live Paperclip:

```text
image = wandora/paperclip:v2026.831.1
commit = 65ec059bde30d98c92165b24a30a540800dd1f6f
health = healthy
restart count = 0
application command = node --import ./server/node_modules/tsx/dist/loader.mjs server/dist/index.js
```

ADR 0124 corrected the earlier `Cmd=null` failure by explicitly preserving the pinned application command through the custom bridge wrapper.

### 5. wandora_mastra install

The exact adapter package was extracted to the persistent hash-addressed path:

```text
/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f/
package/
```

Adapter state:

```text
adapter store total = 1
wandora_mastra count = 1
version = 0.1.0
source = external / local path
loaded = true
disabled = false
supportsLocalAgentJwt = true
```

The adapter was installed exactly once through Paperclip's official instance-admin local-directory route. A malformed CLI invocation failed locally before API dispatch and was reconciled before the successful install. After chat interruption, real state was read before any retry; the already-installed adapter was therefore not reinstalled.

Official readback remained green after the final Paperclip recreation.

Official no-effect environment test returned:

```text
adapterType = wandora_mastra
status = pass
code = wandora-bridge-config
message = Private Wandora bridge configuration is valid.
```

That test validates configuration/secret readability only. It does not execute Ana.

## FINAL SAFETY INVARIANTS

Final production proof:

```text
Wandora MEDICSPRO Ana       = exactly 1 / paused / supervised
Wandora provider binding   = exactly 1
completed hire             = exactly 1
MEDICSPRO outbound attempts= 0

Paperclip MEDICSPRO Ana    = exactly 1 / paused / wandora_mastra
budget                     = 0
last heartbeat             = NULL
wakeup requests            = 0
heartbeat runs             = 0
agents.resume mentions     = 0

Human Send                 = OFF / absent
Gateway outbound           = OFF / absent
customer messaging         = NONE
```

Core, Paperclip and Messaging Gateway are all healthy with zero restarts at the final validation checkpoint.

## CAPABILITY AUTHORITY / REUSE GATE

PASS.

Paperclip remains authority for company/task/run lifecycle, run-scoped local-agent identity and external adapter loading. Wandora remains authority for tenant policy, employee state, organization/provider mapping and the private HMAC execution trust boundary. Mastra/Agent Runtime remains the execution boundary.

No parallel scheduler, task engine, provider lifecycle or duplicate employee state was introduced.

## DECISION

**Production Execution Bridge Activation Execution V1 is COMPLETE.**

The bridge foundation is now live and ready, but this does **not** authorize employee activation or customer messaging.

Explicitly still prohibited in this checkpoint:

- granting `agents.resume`;
- changing Ana from `paused` to `active`;
- changing Wandora autonomy/activation state;
- creating wakeups or heartbeat execution for Ana;
- enabling Human Send;
- enabling Gateway outbound;
- sending any customer message.

Any future activation/resume must be a separate reviewed slice with fresh runtime reconciliation and its own safety gates.

## SECOND ADVERSARIAL REVIEW

Rejected during execution:

- replaying migration 014 after chat/tool interruption;
- reinstalling `wandora_mastra` after ambiguous UI delivery;
- weakening host HMAC permissions;
- relying on Docker `group_add` across `gosu node` privilege drop;
- changing Node's primary group to host `wandora-ops`;
- running Paperclip as root;
- accepting the first ADR 0123 wrapper after it produced `Cmd=null`;
- retrying a failed Paperclip recreation without rollback/reconciliation;
- using production Ana to prove the bridge;
- enabling outbound merely to validate the bridge.

The final path instead preserved exact artifacts, fail-closed behavior, least-privilege secret custody and paused/no-outbound invariants.

## VALIDATION

Required final gate is GREEN:

```text
main implementation = 72bcd60eb8428f6210bd2aae0532edabd2c75c5f
migration 014 = LIVE / verified
HMAC custody = GREEN
Core bridge = LIVE / healthy / ready
Paperclip bridge = LIVE / healthy
Paperclip secret tmpfs = 0400 / 1000:1000 / hash match
wandora_mastra = exactly one / loaded
adapter test-environment = PASS
Ana = paused + supervised
wakeups / heartbeats = 0 / 0
agents.resume = absent
Human Send = OFF
Gateway outbound = OFF
outbound attempts = 0
```

## NEXT

STOP this slice.

Any future employee activation/resume or outbound enablement must start in a new reviewed slice from fresh REAL NOW evidence. Do not treat the live bridge foundation as authorization to run Ana.