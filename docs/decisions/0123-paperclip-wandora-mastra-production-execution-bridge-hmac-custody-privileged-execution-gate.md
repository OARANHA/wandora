# ADR 0123 — Paperclip -> Wandora/Mastra Production Execution Bridge Secret Custody Privilege-Drop Correction

- Status: **Accepted corrective execution checkpoint — STOP before Paperclip retry until canonical wrapper is merged and promoted**
- Date: **2026-09-19**
- Scope: record the real Activation Execution V1 state after the dedicated HMAC was created, Core/Paperclip bridge runtime was promoted, `wandora_mastra` was installed exactly once, and the official adapter test failed closed because Paperclip drops its server process to UID/GID 1000 before reading a host-custodied `root:wandora-ops / 0640` secret.

## REAL NOW

Canonical Git entering the HMAC gate:

```text
main = ace37458b8d66e680320d99417097516a6c6dab4
PR #172 = merged
ADR 0122 = canonical
```

An authorized human operator created exactly one dedicated bridge HMAC at:

```text
/opt/wandora/stacks/core/secrets/paperclip-execution-bridge-hmac
mode  = 0640
owner = root:wandora-ops
size  = 65 bytes
```

Only hash/metadata were read back. Its SHA-256 differs from Gateway ingress, Core outbound and all Organization Adapter HMAC files.

Migration 014 remains LIVE/verified and was not repeated.

## EXECUTION REACHED BEFORE THE CORRECTIVE STOP

The exact PR #169 Core archive was loaded:

```text
image = wandora/core:organization-adapter-candidate-0a40dac127ae
image id = sha256:1fd3f3d7e63d77a9dc80bb903e85ceba77d14aaa8739464133523d54872f5b14
archive sha256 = b101033ac47b7f1e4695d5e2a15d288558682d38e0e508cd7d059abd0aae902d
source tree = abacb9da0949a63210080a01bdd95b087e98d02e
```

Core was recreated alone with the canonical bridge overlay and validated:

```text
healthz = 200
readyz = 200
bridge flag = true
HMAC mount hash = host hash
Paperclip private /api/health = 200
unsigned bridge POST = 401
Human Send = OFF
```

Paperclip was then recreated alone with the original bridge overlay, while the adapter was still absent. Health remained green, the shared HMAC mount hash matched, Ana remained paused and wakeups/heartbeat runs remained zero.

The exact adapter tgz was extracted into:

```text
/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
  0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f/
  package/
```

The package contains exactly:

```text
README.md
compatibility.json
index.mjs
package.json
```

with package `@wandora/paperclip-adapter-mastra@0.1.0`.

The pre-install official read returned exact 404. A first CLI invocation failed locally on malformed JSON before reaching the API; reconciliation again proved exact 404 and no adapter store. The corrected official local-directory install was then executed exactly once and returned:

```text
type = wandora_mastra
version = 0.1.0
isLocalPath = true
requiresRestart = false
```

Independent `adapter get` readback proved:

```text
source = external
loaded = true
disabled = false
supportsLocalAgentJwt = true
packageName = exact hash-addressed persistent path
version = 0.1.0
```

## DISCOVERED FAILURE — FAIL CLOSED

The official no-effect:

```text
adapter test-environment wandora_mastra -C <MEDICSPRO>
```

returned:

```text
status = fail
code = wandora-bridge-config
message = EACCES reading /run/secrets/wandora/paperclip-execution-bridge.hmac
```

No execution run was started.

Reconciliation proved why:

```text
container PID 1 tini = uid/gid 0
Paperclip server node process = uid/gid 1000
server supplementary groups = none
host secret = uid 0 / gid 987 / mode 0640
```

The image's `docker-entrypoint.sh` intentionally ends with:

```text
exec gosu node "$@"
```

which resets supplementary groups. A disposable `--group-add 987` proof therefore still produced Node groups `1000` only and reproduced EACCES. Merely adding Compose `group_add` is rejected.

## CAPABILITY AUTHORITY / REUSE GATE

PASS.

The defect is runtime secret custody across Paperclip's intentional privilege drop. It does not justify changing provider authority, Wandora domain state, employee lifecycle or HMAC ownership.

## DECISION

Preserve host custody:

```text
root:wandora-ops / 0640
```

and add a minimal Paperclip startup wrapper:

1. root reads only the root-custodied bind at startup;
2. copies it into an in-container tmpfs;
3. tmpfs directory becomes `0700 node:node`;
4. copied secret becomes `0400 node:node`;
5. wrapper execs the original Paperclip `docker-entrypoint.sh`;
6. original entrypoint drops to Node UID/GID 1000;
7. no root application process is introduced;
8. no secret enters Git, Compose values, Docker env or persistent Paperclip data.

The source bind becomes:

```text
/run/secrets-root/wandora/paperclip-execution-bridge.hmac
```

and the adapter-visible tmpfs path remains:

```text
/run/secrets/wandora/paperclip-execution-bridge.hmac
```

The implementation is versioned in this PR as:

```text
infra/stacks/paperclip/paperclip-bridge-secret-entrypoint.sh
infra/stacks/paperclip/compose.paperclip-execution-bridge.yaml
```

CI also validates wrapper syntax/invariants and the rendered runtime contract.

## DISPOSABLE ADVERSARIAL PROOF

Against the exact live Paperclip image, with network disabled and the real host file mounted read-only at the root-only source path, the proposed wrapper produced:

```text
final uid = 1000
final gid = 1000
final groups = 1000
tmpfs secret mode = 0400
secret bytes readable = 65
```

The plaintext was never printed.

## SECOND ADVERSARIAL REVIEW

Rejected:

- chmod/chown weakening of the host HMAC;
- `group_add 987` alone, because `gosu node` drops supplementary groups;
- changing Node's primary GID to host `wandora-ops`, which would broaden Paperclip volume group ownership;
- running the Paperclip application as root;
- putting the HMAC plaintext into an environment variable;
- copying it into persistent `/paperclip`;
- reinstalling the already-installed adapter;
- retrying `test-environment` before correcting runtime custody;
- resuming Ana, granting `agents.resume`, enabling Human Send or enabling Gateway outbound.

## CURRENT SAFETY STATE

At the corrective stop:

```text
migration 014 = LIVE / verified
dedicated HMAC = present / canonical host custody
Core candidate = live / healthy / ready
Core bridge = ON
Paperclip bridge URL/secret path = live
wandora_mastra = installed exactly once / readback green
adapter test-environment = FAIL CLOSED on EACCES
Ana = paused + supervised
Paperclip Ana = paused
wakeup requests = 0
heartbeat runs = 0
agents.resume = absent
Human Send = OFF
Gateway outbound = OFF
MEDICSPRO outbound attempts = 0
```

## NEXT

Do not reinstall the adapter and do not repeat migration 014.

After this corrective wrapper/overlay is merged and green:

```text
stage exact corrected wrapper/overlay
-> render non-secret delta
-> recreate only wandora-paperclip
-> prove final server UID/GID 1000
-> prove tmpfs secret 0400 node:node and hash == host HMAC
-> Paperclip health
-> adapter readback without reinstall
-> run official test-environment once
-> require status=pass
-> prove Ana remains paused and wakeups/heartbeats remain zero
-> prove agents.resume absent / Human Send OFF / Gateway outbound OFF / outbound attempts zero
-> STOP
```
