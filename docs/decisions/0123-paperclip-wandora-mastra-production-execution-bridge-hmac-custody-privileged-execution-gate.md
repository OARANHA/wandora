# ADR 0123 — Paperclip -> Wandora/Mastra Production Execution Bridge HMAC Custody Privileged Execution Gate

- Status: **Accepted partial execution checkpoint — blocked before HMAC creation**
- Date: **2026-09-19**
- Scope: record the privileged-custody blocker discovered after ADR 0122 was merged, without weakening custody, bypassing the operator trust boundary, promoting Core/Paperclip, installing the adapter, resuming Ana or enabling outbound effects.

## REAL NOW

Canonical Git entering this checkpoint:

```text
main = ace37458b8d66e680320d99417097516a6c6dab4
PR #172 = merged
ADR 0122 = canonical
```

Fresh production reconciliation after the merge proves:

```text
migration 014              = LIVE / verified
MEDICSPRO mapping          = exact
unknown mapping            = NULL / fail-closed
bridge HMAC                = absent
Core bridge                = OFF / absent
Paperclip bridge overlay   = absent live
wandora_mastra             = not installed live
Ana / Wandora              = exactly 1 / paused + supervised
Ana / Paperclip            = exactly 1 / paused
wakeup requests            = 0
heartbeat runs             = 0
agents.resume              = absent
Human Send                 = OFF
Gateway outbound           = OFF
MEDICSPRO outbound attempts= 0
```

The exact PR #169 adapter/Core artifacts remain staged and hash-verified.

## PROVEN EVIDENCE

The authorized Desktop Commander device runs as `wandora-admin` (uid 1001) in group `wandora-ops` (gid 987).

The canonical Core secret directory is `/opt/wandora/stacks/core/secrets`, mode `0700`, owner `wandora-admin:wandora-ops`.

The dedicated bridge HMAC file remains absent.

ADR 0120's newer custody requirement is authoritative over the older ADR 0118 ownership wording:

```text
/opt/wandora/stacks/core/secrets/paperclip-execution-bridge-hmac
owner = root:wandora-ops
mode  = 0640
generation = openssl rand -hex 32
```

An exact attempt to create the secret through the authorized Desktop Commander session did not reach OpenSSL. It stopped at privilege elevation because `sudo` required interactive authentication. No file was created.

A follow-up attempt to enumerate non-interactive sudo authority was blocked by the execution platform before dispatch. No alternate root channel was used.

## GAPS

The bridge foundation cannot safely continue until the exact dedicated HMAC exists with canonical root custody. This is an operator-privilege/custody gap, not an architecture or capability gap.

## CAPABILITY AUTHORITY / REUSE GATE

PASS. No new Wandora subsystem is justified. The correct action remains the existing file-backed secret contract shared read-only by Core and Paperclip.

## DECISION

**STOP before HMAC creation. Keep the production bridge dormant.**

Do not:

- change the owner requirement from `root:wandora-ops` to `wandora-admin`;
- use Docker, another host, CI, Python or another generator as an indirect privilege bypass;
- expose or paste secret plaintext;
- repeat migration 014;
- load/promote Core before the dedicated HMAC exists;
- recreate Paperclip or install `wandora_mastra` early.

The next authorized effect is exactly one privileged operator execution that creates the canonical file without printing plaintext.

The canonical operator command is:

```bash
sudo sh -c 'set -eu
P=/opt/wandora/stacks/core/secrets/paperclip-execution-bridge-hmac
test ! -e "$P"
umask 027
openssl rand -hex 32 > "$P"
chown root:wandora-ops "$P"
chmod 0640 "$P"
stat -c "created|%a|%U:%G|%s|%n" "$P"
sha256sum "$P"'
```

The SHA-256 is safe reconciliation evidence; the file contents must never be printed.

## SECOND ADVERSARIAL REVIEW

Rejected:

- treating membership in the host `docker` group as permission to obtain root through a container;
- using the older ADR 0118 owner wording to bypass ADR 0120's newer custody requirement;
- generating under `wandora-admin` and promising to fix ownership later;
- asking for or transporting the operator sudo password through chat;
- proceeding with Core/Paperclip runtime mutation while the HMAC is absent.

## VALIDATION

At this checkpoint:

```text
migration 014 = LIVE / verified
bridge HMAC   = ABSENT
Core bridge   = OFF
Paperclip bridge overlay = absent
wandora_mastra = absent
Ana = paused + supervised
wakeups / heartbeats = 0 / 0
agents.resume = absent
Human Send = OFF
Gateway outbound = OFF
outbound attempts = 0
```

## NEXT

After an authorized operator creates the exact root-custodied HMAC, resume with reconciliation only:

```text
prove file metadata/hash
-> prove hash differs from existing directional HMACs
-> exact Core candidate + canonical bridge overlay
-> Core health/readiness fail-closed proof
-> Paperclip bridge overlay with adapter absent
-> Ana/control-plane proof
-> persistent hash-addressed package extraction
-> exactly one official local-directory wandora_mastra install
-> readback/test/reconciliation
-> final paused/no-outbound proof
-> STOP
```

Migration 014 is already live and must not be repeated.
