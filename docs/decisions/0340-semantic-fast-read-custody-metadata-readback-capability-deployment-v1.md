# ADR 0340 — Semantic Fast Read Custody Metadata Readback Capability Deployment V1

Date: 2026-09-29

Status: **CAPABILITY DEPLOYED / VALIDATED / METADATA READBACK NOT EXECUTED / NO PROVIDER, CUSTOMER OR OUTBOUND EFFECT**

## Objective

Deploy only the already-qualified ADR 0339 managed-admin capability `wandora-semantic-fast-read-custody-metadata-v1`, preserve the existing Remote-Ops authority boundary, validate its installed byte identity and effective allowlists, and hard-stop before any custody metadata execution.

This ADR is capability deployment only. The zero-argument metadata readback remains a separate future slice.

## REAL NOW

Fresh pre-execution reconciliation proved:

- Wandora `main = 8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 remained open / draft / not merged on `feat/semantic-fast-read-runtime-wiring-v1`;
- exact pre-deployment source head `96707a8e3e57c93902679a9eeb5dcfc127d5e8bb`;
- that source lineage retained the ADR 0339 qualified entrypoint blob `d12d7033d22d35ee0601ecc96e08daffbc27aae2`;
- the exact source program passed `bash -n`;
- live Remote-Ops was healthy as `2.0.0-dev`, with `wandora-managed-admin` using the existing `host.managed_admin` boundary;
- the live managed-admin target and admin broker exposed the existing rollback precheck/capture programs but not the custody-metadata program;
- Task Drain was `false / activeRuns=0 / pendingWakes=0 / quiescent=true`;
- Core, Paperclip and Messaging Gateway were healthy;
- Core effect gates remained `fastReadExecution=false`, `semanticFastRead=false`, `humanSendProposal=false`;
- Messaging Gateway remained `outboundEnabled=false`.

Remote-Ops repository `main` was one commit ahead of the live image at `9ffb3176ae9d9ead2b1356db4c7ac4f29059762f`. Fresh diff inspection proved that commit changes only Agent Mesh onboarding/installer files and does not alter dynamic-target registry loading or this capability boundary.

## PROVEN DELTA

The protected dynamic registry was copied through the existing managed-admin boundary into the operator workspace for review.

The candidate changed exactly one semantic field:

- target: `wandora-managed-admin`;
- field: `allowedAdminPrograms`;
- appended value: `wandora-semantic-fast-read-custody-metadata-v1`.

Validation proved:

- the new value occurs exactly once across target administrative allowlists;
- removing that single value from the candidate produces exact semantic equality with the fresh live registry copy.

The broker candidate likewise preserved the effective `WANDORA_ADMIN_PROGRAMS` list and appended only the same named program.

No generic `stat`, shell, interpreter, sudo or filesystem read authority was added.

## CAPABILITY AUTHORITY / REUSE GATE

### Semantic authority

Wandora owns the exact three-path metadata proof contract qualified by ADR 0339.

### Durable product state

None was introduced.

### Operational authority

Remote-Ops remains the sole privileged execution authority through the existing managed-admin target, `host_admin_prepare/apply`, signed one-use approvals and the existing root broker.

### Provider implementation

No new broker, approval subsystem, lifecycle manager, state machine, service or root execution path was created.

### Replacement boundary

The Wandora-owned contract remains one dedicated named zero-argument administrative program. Provider replacement requires an equivalent governed adapter boundary, not internalization of provider orchestration.

ADR 0168 remains preserved.

## DECISION

Deploy only:

`/usr/local/sbin/wandora-semantic-fast-read-custody-metadata-v1`

with exact ADR 0339 qualified bytes and expose only that program name through the existing managed-admin target and broker allowlists.

Do not execute the program in this slice.

## SECOND ADVERSARIAL REVIEW

After the fresh live registry copy and exact candidate diff were available, an independent pre-execution guard reviewed the concrete mutation package and returned:

- `confirm = 0.92`;
- `deny = 0.07`;
- `review = 0.01`;
- `allow = 0.00`;
- confidence `0.89`.

The reviewed package was limited to the exact entrypoint install, one broker drop-in, one dynamic-target allowlist addition, daemon reload, required broker/control-plane restarts, validation and hard stop.

## EXECUTION

All privileged mutations used the existing `wandora-managed-admin` + `host_admin_prepare/apply` boundary with explicit human `APPROVE adm_...` confirmations.

Applied, in order:

1. installed the exact qualified entrypoint as `root:root 0755`;
2. installed one broker drop-in as `root:root 0644`, adding only the named program;
3. installed the reviewed dynamic registry candidate as `wandora-admin:wandora-ops 0600`;
4. ran `systemctl daemon-reload`;
5. restarted `wandora-ops-admin-broker.service`;
6. restarted `remote-ops-mcp` so the control plane reloaded the dynamic registry.

The broker restart disconnected its own managed-admin call. It was **not retried**. State-first readback proved the service active/running with new PID `1440822` and the effective broker environment containing the new program.

The control-plane restart returned an internal client/tool error. It was **not retried**. State-first readback proved `remote-ops-mcp` running/healthy with `started_at=2026-09-29T15:47:12.546369775Z`, and the effective `wandora-managed-admin` target contained the new program.

This preserves the permanent rule: ambiguity after restart is resolved by state readback, never by blind repetition.

## VALIDATION

Installed capability:

- Git blob readback = `d12d7033d22d35ee0601ecc96e08daffbc27aae2`;
- owner = `root`;
- group = `root`;
- mode = `0755`;
- type = regular file;
- symlink target = empty.

Effective authority:

- `wandora-managed-admin.allowedAdminPrograms` contains `wandora-semantic-fast-read-custody-metadata-v1`;
- effective broker `WANDORA_ADMIN_PROGRAMS` contains the same name;
- admin broker is active/running;
- `remote-ops-mcp` is healthy.

Production safety state after deployment:

- Task Drain = `false / 0 / 0 / quiescent=true`;
- Core = healthy;
- Paperclip = healthy;
- Messaging Gateway = healthy;
- `fastReadExecution=false`;
- `semanticFastRead=false`;
- `humanSendProposal=false`;
- `outboundEnabled=false`.

## HARD STOP

Not executed:

- `wandora-semantic-fast-read-custody-metadata-v1`;
- any metadata readback of the three secret paths;
- any secret value/hash/copy;
- custody or attestation overlay;
- Semantic Fast Read;
- Human Fast Read;
- TypeSafe/JEV model provider call;
- Mistral selector call;
- VendaERP call;
- Human Send;
- WhatsApp or any outbound effect.

## NEXT BOUNDARY

Next slice only, from fresh REAL NOW:

**Semantic Fast Read Custody Metadata Readback Execution V1**

That slice must:

1. reconcile repository, PR/CI, runtime, Task Drain and effect gates again;
2. re-prove installed program byte identity and effective allowlists;
3. run a fresh decision and second adversarial review;
4. call `host_admin_prepare` for exactly the zero-argument named program;
5. require a new explicit human `APPROVE adm_...`;
6. call `host_admin_apply` exactly once;
7. validate state-first and document only the allowed metadata output.

No other activation or provider/customer/outbound work is authorized by this deployment.


## Execution follow-up

ADR 0341 executed the deployed custody-metadata capability exactly once after fresh state reconciliation, fresh adversarial review and explicit one-use human approval.

The readback returned exactly the three ADR 0339 paths as `wandora-admin:wandora-ops 0640 regular_file` and terminated with `SEMANTIC_FAST_READ_CUSTODY_METADATA_V1_OK`. No secret value/hash/copy, permission correction, provider/customer/outbound call or Fast Read/Human Send activation occurred. Post-execution Task Drain, component health and gates remained unchanged.

Canonical execution detail: `docs/decisions/0341-semantic-fast-read-custody-metadata-readback-execution-v1.md`.
