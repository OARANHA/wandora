# ADR 0341 — Semantic Fast Read Custody Metadata Readback Execution V1

Date: 2026-09-29

Status: **EXECUTED ONCE / METADATA READBACK GREEN / CUSTODY CONTRACT SATISFIED / EFFECT GATES REMAIN OFF / HARD STOP**

## Objective

Execute exactly once the already-qualified and already-deployed ADR 0339/0340 managed-admin capability `wandora-semantic-fast-read-custody-metadata-v1`, return only the allowed metadata for the three qualified Core secret paths, validate the production baseline, document the result, and stop before Semantic Fast Read or any provider/customer/outbound execution.

## REAL NOW

Fresh reconciliation immediately before execution proved:

- Wandora `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 remained open / draft / mergeable / not merged on `feat/semantic-fast-read-runtime-wiring-v1`;
- exact pre-execution head `50eb8b311bf193ea0e6b73c79629fe17b16339b8`;
- that exact head completed **17/17 pull-request workflows GREEN**;
- live Remote-Ops was healthy as `2.0.0-dev` on image `ghcr.io/oaranha/remote-ops-mcp:sha-677712a`;
- `wandora-managed-admin` remained enabled on `host.managed_admin`;
- `wandora-ops-admin-broker.service` was active/running, PID `1440822`, restart count 0;
- Task Drain was `false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- Core, Paperclip and Messaging Gateway were healthy;
- Core startup gates remained `fastReadExecution=false`, `semanticFastRead=false`, `humanSendProposal=false`;
- Messaging Gateway remained `outboundEnabled=false`;
- Core live mounts did not include the TypeSafe or `wfri1` custody secrets, so no custody/attestation overlay was active.

No production state was changed during this reconciliation.

## PROVEN EVIDENCE

The installed capability at:

`/usr/local/sbin/wandora-semantic-fast-read-custody-metadata-v1`

was freshly re-proven as:

- Git blob `d12d7033d22d35ee0601ecc96e08daffbc27aae2`, equal to the reviewed repository source blob;
- owner `root`;
- group `root`;
- mode `0755`;
- regular file;
- non-symlink.

The exact source accepts zero caller arguments, requires EUID 0, pins exactly these three paths and performs metadata-only validation with `readlink`, `stat` and `printf`:

1. `/opt/wandora/stacks/core/secrets/wandora_typesafe_jev_api_key`;
2. `/opt/wandora/stacks/core/secrets/wandora_fast_read_intent_hmac`;
3. `/opt/wandora/stacks/core/secrets/wandora_model_provider_api_key`.

It has no code path that reads, copies, hashes, encodes or derives a secret value, performs network/provider I/O, changes ownership/mode, writes files, restarts services or changes Core/Paperclip/Gateway state.

`wandora-managed-admin.allowedAdminPrograms` contained the dedicated program exactly once. No generic root `stat`, shell, interpreter or `sudo` capability was added for this slice. The effective broker remained the ADR 0340 broker instance that had already loaded the same dedicated program.

## GAPS

No technical gap remained for the metadata-only readback itself.

The first fresh approval prepared in this slice, `adm_65907224ed998cbe4433528b`, expired before apply. Remote-Ops rejected it as nonexistent/expired and no execution occurred. The ticket was not reused.

State-first readback after that rejection proved the installed bytes, target authority, broker state, Task Drain, component health and effect gates were unchanged.

## CAPABILITY AUTHORITY / REUSE GATE

### Semantic authority

Wandora owns the attestation contract: exactly which three custody facts are required and which metadata fields may be exposed.

### Durable product state

No new durable product state is introduced by the execution.

### Operational authority

Remote-Ops remains the sole privileged execution authority through the existing `wandora-managed-admin` target, `host_admin_prepare/apply`, signed one-use approvals and the existing root broker.

### Provider implementation

No new broker, approval subsystem, root wrapper, lifecycle, registry, state machine, service, table, migration or operational subsystem was created.

### Replacement boundary

The Wandora-owned contract is the dedicated zero-argument named program. A replacement operator provider needs an equivalent governed named-program boundary; provider replacement does not imply internalizing privileged orchestration.

ADR 0168 remains satisfied.

## DECISION

After the expired first ticket was rejected with no effect, prepare one new one-use approval for exactly:

- target: `wandora-managed-admin`;
- program: `wandora-semantic-fast-read-custody-metadata-v1`;
- arguments: none.

Then, and only after exact human confirmation, execute exactly one `host_admin_apply`.

No second capability execution is authorized in this slice.

## SECOND ADVERSARIAL REVIEW

After state-first recovery from the expired ticket, a fresh independent guard reviewed the exact prepare-only action and returned:

- `confirm = 0.74`;
- `allow = 0.09`;
- `review = 0.03`;
- `deny = 0.14`;
- confidence `0.66`.

The reviewed conditions included exact byte identity, zero arguments, fixed three-path metadata-only behavior, no generic root authority widening, Task Drain quiescence, healthy components, all effect gates OFF, one-use confirmation, exactly-one apply and state-first handling for any ambiguous result.

The review did not authorize Semantic Fast Read, Human Fast Read, TypeSafe/JEV runtime execution, Mistral, VendaERP, Human Send or outbound.

## EXECUTION

Fresh approval:

`adm_82dc65eaf9c383627bfec4eb`

was explicitly confirmed by the human as:

`APPROVE adm_82dc65eaf9c383627bfec4eb`

Exactly one `host_admin_apply` was issued.

Result:

- `executed=true`;
- exit code `0`;
- duration `47 ms`;
- `timed_out=false`;
- `truncated=false`;
- stderr empty;
- program = `wandora-semantic-fast-read-custody-metadata-v1`.

Allowed stdout was exactly:

```text
path=/opt/wandora/stacks/core/secrets/wandora_typesafe_jev_api_key owner=wandora-admin group=wandora-ops mode=0640 type=regular_file
path=/opt/wandora/stacks/core/secrets/wandora_fast_read_intent_hmac owner=wandora-admin group=wandora-ops mode=0640 type=regular_file
path=/opt/wandora/stacks/core/secrets/wandora_model_provider_api_key owner=wandora-admin group=wandora-ops mode=0640 type=regular_file
SEMANTIC_FAST_READ_CUSTODY_METADATA_V1_OK
```

No secret value, content, hash, prefix/suffix, base64, fingerprint or derived secret material was emitted.

## VALIDATION

The output contains exactly the three ADR 0339 paths, each exactly once, and no fourth path.

All three report the qualified metadata:

- owner = `wandora-admin`;
- group = `wandora-ops`;
- mode = `0640`;
- type = `regular_file`.

The terminal marker is exactly:

`SEMANTIC_FAST_READ_CUSTODY_METADATA_V1_OK`.

Post-execution state-first validation proved:

- Task Drain remained `false / 0 / 0 / quiescent=true`;
- `wandora-core` remained healthy with unchanged start time;
- `wandora-paperclip` remained healthy with unchanged start time;
- `wandora-messaging-gateway` remained healthy with unchanged start time;
- `remote-ops-mcp` remained healthy;
- `wandora-ops-admin-broker.service` remained active/running on PID `1440822`, restart count 0;
- Core remained `fastReadExecution=false`;
- Core remained `semanticFastRead=false`;
- Core remained `humanSendProposal=false`;
- Gateway remained `outboundEnabled=false`.

The capability source contains no network/provider/customer/outbound path, and the production runtime remained on the same gates-OFF baseline. The execution therefore performed only the qualified local metadata readback.

No permission or ownership correction was needed or performed.

## HARD STOP

Not executed:

- custody overlay;
- attestation overlay;
- Semantic Fast Read;
- Human Fast Read;
- TypeSafe/JEV runtime provider execution;
- Mistral selector;
- VendaERP;
- Organization Adapter mutation;
- Paperclip plugin mutation;
- Human Send;
- WhatsApp/outbound;
- migration;
- secret change;
- chmod/chown;
- second invocation of the custody metadata capability.

## NEXT BOUNDARY

The custody-metadata prerequisite is now GREEN.

The recommended next slice is a **fresh Semantic Fast Read bounded-attestation execution preflight/effect-authorization slice**, starting again from REAL NOW and re-reading all mutable freshness gates immediately adjacent to any opening effect. It must not infer execution authority from ADR 0341, and it must preserve the existing rollback, Paperclip operational authority, provider boundaries and outbound gates.

ADR 0341 itself authorizes no Semantic Fast Read, provider/customer execution or outbound effect.
