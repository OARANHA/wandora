# ADR 0124 — Paperclip Execution Bridge Wrapper Command Preservation Correction

- Status: **Accepted corrective implementation candidate — production retry blocked until merge/green**
- Date: **2026-09-19**
- Scope: correct the ADR 0123 startup wrapper contract after a live fail-closed promotion proved that Docker Compose rendered the overridden Paperclip entrypoint with `Cmd=null`, causing the original entrypoint to reach `gosu node` without a server command.

## REAL NOW

Canonical Git entering this correction:

```text
main = 2710f3e9100e93214b202953432a74d513ee5739
PR #173 = merged
ADR 0123 = canonical
```

Production after the failed corrective promotion was immediately rolled back to the previous healthy Paperclip bridge overlay.

Current live state:

```text
migration 014 = LIVE / verified
Core candidate = wandora/core:organization-adapter-candidate-0a40dac127ae / healthy
Core bridge = ON / readyz 200
Paperclip = wandora/paperclip:v2026.831.1 / healthy
Paperclip live overlay = pre-wrapper blob 47f35c7c6ff50c433b95265ea8ba4423454c9891
wandora_mastra = installed exactly once / loaded / version 0.1.0
Ana / Wandora = paused + supervised
Ana / Paperclip = paused
wakeups = 0
heartbeat runs = 0
agents.resume = absent
Human Send = OFF
Gateway outbound = OFF
MEDICSPRO outbound attempts = 0
```

The adapter remains installed at the exact persistent hash-addressed path frozen by ADR 0118/0120/0123. It must not be reinstalled.

## PROVEN FAILURE

The first live promotion of the ADR 0123 wrapper/overlay returned successfully from Compose but Paperclip entered a restart loop.

Exact runtime evidence:

```text
Entrypoint = ["/usr/bin/tini","--","/bin/sh","/run/wandora/paperclip-bridge-secret-entrypoint.sh"]
Cmd = null
state = restarting / unhealthy
logs = gosu usage with no command
```

The wrapper itself was functioning as written. The failure was that overriding Compose `entrypoint` caused no effective server command to reach `"$@"`, so:

```text
exec /usr/local/bin/docker-entrypoint.sh "$@"
```

became an invocation with zero arguments.

No adapter execution occurred and no customer effect occurred.

## CAPABILITY AUTHORITY / REUSE GATE

PASS.

This remains a deployment-contract correction only. Paperclip stays the control-plane authority, Wandora owns the private trust/mapping policy boundary, and Mastra remains behind the existing Agent Runtime adapter.

## DECISION

Preserve the ADR 0123 root-custody wrapper and add the exact pinned Paperclip image server command to the bridge overlay:

```text
node
--import
./server/node_modules/tsx/dist/loader.mjs
server/dist/index.js
```

The command is not a new runtime implementation. It is the exact `Config.Cmd` already present in the pinned live image `wandora/paperclip:v2026.831.1`.

The Paperclip Mastra Adapter CI must render Compose as JSON and fail unless:

```json
["node","--import","./server/node_modules/tsx/dist/loader.mjs","server/dist/index.js"]
```

is present as the effective Paperclip command.

Any future Paperclip image upgrade must revalidate this explicit command against the new image before promotion.

## DISPOSABLE PROOF

Against the exact live Paperclip image:

```text
compose_command_preserved = true
final uid = 1000
final gid = 1000
tmpfs secret mode = 0400
secret readable = true
```

The proof used synthetic secret material, network disabled, exact wrapper semantics and no production data.

## SECOND ADVERSARIAL REVIEW

Rejected:

- retrying the already-failed merged ADR 0123 overlay unchanged;
- reinstalling `wandora_mastra`;
- removing the wrapper and weakening host HMAC custody;
- running Paperclip as root;
- changing Node primary GID or recursively chowning the Paperclip volume;
- adding host ACL packages merely to work around the image privilege-drop;
- resuming Ana to test execution;
- enabling Human Send or Gateway outbound.

The live rollback to the previous healthy overlay is accepted as the safest bounded recovery while this correction is reviewed.

## IMPLEMENTATION

This corrective branch changes only:

```text
infra/stacks/paperclip/compose.paperclip-execution-bridge.yaml
.github/workflows/paperclip-mastra-adapter-ci.yml
canonical documentation
```

The wrapper from ADR 0123 is unchanged.

## NEXT

After this correction is merged and green:

```text
reconcile main/runtime
-> stage exact corrected overlay + unchanged wrapper
-> render and require exact command
-> recreate only wandora-paperclip
-> require Paperclip healthy / restart 0
-> prove server uid/gid 1000
-> prove tmpfs secret 0400 node:node and hash == host HMAC
-> adapter get only; do not reinstall
-> run official test-environment exactly once
-> require status=pass
-> prove Ana paused / wakeups 0 / heartbeats 0
-> prove agents.resume absent / Human Send OFF / Gateway outbound OFF / outbound attempts 0
-> STOP
```
