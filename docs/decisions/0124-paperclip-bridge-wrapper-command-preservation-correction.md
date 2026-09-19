# ADR 0124 — Paperclip Bridge Wrapper Command Preservation Correction

- Status: **Accepted corrective implementation — production retry blocked until merged + green**
- Date: **2026-09-19**
- Scope: correct the Paperclip bridge secret wrapper introduced by ADR 0123 after the first live promotion proved that overriding the Compose entrypoint cleared the image CMD, causing a restart loop before the application started.

## REAL NOW

Canonical Git entering this correction:

```text
main = 2710f3e9100e93214b202953432a74d513ee5739
PR #173 = merged
ADR 0123 = canonical
```

Live safety reconciliation after the failed corrective recreate and rollback:

```text
wandora-core = healthy / bridge ON
wandora-paperclip = healthy / rolled back to prior bridge overlay
wandora_mastra = installed exactly once / readback green
Ana = exactly 1 / paused + supervised
Paperclip Ana = paused
wakeup requests = 0
heartbeat runs = 0
agents.resume = absent
Human Send = OFF
Gateway outbound = OFF
```

Migration 014 remains LIVE/verified and was not repeated.

## PROVEN FAILURE

The ADR 0123 wrapper/overlay was staged exactly from merged main and only Paperclip was recreated.

The resulting container repeatedly restarted before health:

```text
Entrypoint = /usr/bin/tini -- /bin/sh /run/wandora/paperclip-bridge-secret-entrypoint.sh
Cmd        = null
restart loop = true
log symptom = gosu usage / no command
```

The wrapper ended with:

```sh
exec /usr/local/bin/docker-entrypoint.sh "$@"
```

but Compose had supplied zero arguments because overriding `entrypoint` did not preserve the image CMD in the created container. The original Paperclip entrypoint therefore reached `gosu node` with no application command.

No adapter reinstall, employee activation, wakeup, heartbeat or outbound effect occurred.

## ROLLBACK

The previous simple Paperclip bridge overlay was restored and only `wandora-paperclip` was recreated.

Rollback validation returned:

```text
Paperclip = running / healthy / restart 0
/api/health = 200 / bootstrapStatus ready
adapter remains installed exactly once
```

The known adapter `test-environment` EACCES state is intentionally retained until the corrected wrapper is promoted.

## GAP

ADR 0123 correctly solved host secret custody across the Paperclip privilege drop, but its Compose contract failed to preserve the pinned image application command.

This is a deployment-contract bug. It does not change capability authority or justify weakening HMAC custody.

## CAPABILITY AUTHORITY / REUSE GATE

PASS.

Paperclip remains the control-plane authority, Wandora remains the bridge trust/mapping authority, and Mastra remains the execution runtime. No new lifecycle, scheduler or secret store is introduced.

## DECISION

Preserve the exact pinned Paperclip image command explicitly in the bridge overlay:

```text
node
--import
./server/node_modules/tsx/dist/loader.mjs
server/dist/index.js
```

and harden the wrapper with:

```sh
test "$#" -gt 0
```

before any secret copy or privilege drop.

CI must verify both the wrapper fail-closed guard and the rendered command list, preventing a future overlay from silently producing `Cmd=null`.

## SECOND ADVERSARIAL REVIEW

Rejected:

- retrying the same merged ADR 0123 overlay after a restart loop;
- running Paperclip as root;
- weakening the host HMAC from `root:wandora-ops / 0640`;
- changing Node's primary group or Paperclip volume ownership;
- reinstalling the already-installed adapter;
- repeating migration 014;
- accepting a render that has the custom entrypoint but no explicit command;
- resuming Ana or enabling outbound to test the bridge.

## EXECUTION CONTRACT AFTER MERGE

After this correction is merged and green:

```text
reconcile main + live state
-> stage exact corrected overlay + wrapper
-> require Git blob identity
-> render and prove explicit Paperclip command
-> recreate only wandora-paperclip
-> require healthy / restart 0
-> prove application UID/GID 1000
-> prove tmpfs secret = 0400 node:node and hash == host HMAC
-> adapter readback without reinstall
-> official adapter test-environment once
-> require status=pass
-> prove Ana paused + zero wakeups/heartbeats
-> prove agents.resume absent / Human Send OFF / Gateway outbound OFF / outbound attempts zero
-> STOP
```

Any ambiguous recreate or test result must be reconciled before retry.