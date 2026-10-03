# ADR 0405 — Paperclip Managed Connection Command Host Capability V1

- Status: **CODE CANDIDATE / CI PENDING / NO PRODUCTION EFFECT**
- Date: 2026-10-02
- Paperclip pin: `v2026.916.1@d554c4789ed3930f8a53ac9fdf6503b3187097da`
- Prerequisite: ADR 0281 retained host-operational-read patch
- Parent boundary: ADR 0404

## Context

ADR 0404 proved that customer 28PRO self-service must terminate in Paperclip-owned Connection, grant and secret custody. It also left one material blocker open: customer “Atualizar credenciais” is logically one three-value replacement, while pinned Paperclip `reconnectGalleryApp` rotates provided existing secrets sequentially before its later database transaction. That path does not prove all-three atomicity.

This slice re-entered from real `main@9eb58cdf29bb15ceec9d150daabeb0b4aa0fdac5`, after PR #403 / ADR 0404 was 9/9 GREEN and squash-merged.

The Dynamic Managed Employee PR stack remains separate and is not a dependency of this vertical.

## REAL NOW / proven evidence

Exact-pin source review proves:

1. Paperclip already owns Applications, Connections, grants, secrets, approved stdio templates, installs, profiles, catalog, health, removal and audit.
2. `secretService(tx)` is an existing native pattern and `rotate` supports `expectedLatestVersion`.
3. `local_encrypted` prepares encrypted version material locally and commits its durable state through the bound database handle; it does not require an external secret-provider write.
4. Pinned `local_stdio` invocation resolves `env.*` values immediately before each tool call, spawns a fresh child for that call and terminates it in `finally`. There is no credential-bearing persistent child that needs restart after rotation.
5. Pinned `checkConnectionHealth` for `local_stdio` resolves credentials and validates the approved stdio template/runtime slot; it does not invoke VendaERP.
6. Native `removeConnection` is intentionally fail-closed and resumable: database access paths close before secret cleanup and retries can finish a prior partial removal.
7. The live Prorevest shape is already documented by ADR 0216: one `wandora.vendaerp-readonly-v1` application, one active shared/customer `local_stdio` Connection using template `wandora.vendaerp-readonly-v1-r1`, exactly one active default organization grant, and exactly three required `latest` env secret refs.

A read-only attempt to re-open the live adapter source under `/opt/wandora/integrations/vendaerp-readonly-mcp/server.mjs` was denied by the current target path boundary. No privilege elevation or production change was performed.

## First decision and adversarial rejection

The first candidate also proposed new-customer `configure`, AppDefinition/env mapping and legacy adoption.

The mandatory second adversarial review returned:

- `deep_review = 0.88`
- confidence `0.85`

That review exposed a material false premise: `saveDraft:true` does not exist at the accepted 916.1 pin. Current later upstream has a save-draft path, but it is restricted to remote MCP connector methods rather than this `local_stdio` path. Therefore this slice could not prove a native new-customer configuration path that vaults credentials while avoiding provider/discovery effects.

Creating Paperclip rows manually to bypass that gap would duplicate or bypass provider lifecycle authority and violate ADR 0168.

## Revised Capability Authority / Reuse Gate

The slice was split.

Wandora continues to own:

- the customer meaning of “28PRO connected”, “update credentials”, health/readiness projection and disconnect intent;
- tenant/effect authorization;
- the provider-neutral Organization Adapter contract;
- future non-secret idempotency/uncertain receipt semantics at the adapter boundary.

Paperclip continues to own:

- Application/Connection identity;
- grant/secret custody;
- stdio template/catalog/profile/install/runtime state;
- native health/removal;
- secret versioning and audit.

This ADR adds no Wandora table, migration, secret store, Connection registry, grant state machine, runtime process lifecycle or generic provider executor.

## Revised second adversarial review

The existing-Connection-only design was resubmitted.

Result:

- `proceed_fast = 0.53`
- `deep_review = 0.46`
- `block = 0.01`
- confidence `0.36`

The moderate confidence requires strong CI and fail-closed invariants, but no remaining review evidence required another authority split before code.

## Decision

Qualify a **provider-side host capability candidate** for the already-existing 28PRO Connection only.

The incremental retained patch adds:

- capability `tools.connections.managed`;
- `ctx.toolAccess.manageDeclaredConnection(...)`;
- the existing host invocation-company scope gate;
- an independent hard bind to `wandora.organization-adapter-v1`;
- one declaration key: `wandora.28pro.vendaerp-readonly-v1`;
- operations:
  - `inspect`;
  - `replace_credentials`;
  - `health`;
  - `disconnect`.

No caller can supply Paperclip object IDs, arbitrary URL, transport, stdio command/args, template key, grant/profile/catalog IDs, secret refs or arbitrary provider config.

## Declaration/requalification invariants

Every non-archived command re-qualifies current provider state. It must find exactly:

- application key `wandora.vendaerp-readonly-v1`, type `mcp_stdio`;
- one managed/tool/customer `local_stdio` Connection;
- `paperclip_vault` + shared credential policy;
- template `wandora.vendaerp-readonly-v1-r1`;
- command `node`;
- args `/opt/wandora/integrations/vendaerp-readonly-mcp/server.mjs --tenant voepro`;
- exact env keys:
  - `VENDAERP_AUTHORIZATION_TOKEN`;
  - `VENDAERP_USER`;
  - `VENDAERP_APP`;
- exactly the eight ADR 0210 read-only VendaERP tool declarations;
- exactly one active Connection grant, which must be the default organization grant;
- exactly three matching Connection/grant refs, all required and selecting `latest`.

No adoption marker or copied provider state is stored. Zero, duplicate or contradictory state fails closed.

## Atomic three-secret replacement

`replace_credentials` requires the complete three-value set.

Inside one Paperclip database transaction the host:

1. locks and revalidates exact Application, Connection, grant and approved template;
2. locks the exact three secret rows;
3. requires company scope, `local_encrypted`, active/not-deleted custody;
4. proves the three secret IDs are not referenced by another Connection or grant;
5. validates any secret bindings still point only to the declared Connection with the expected env path, `latest`, and `required=true`;
6. calls `secretService(tx).rotate` on the same three secret IDs with `expectedLatestVersion`;
7. marks Connection health `unchecked`;
8. writes one non-secret Paperclip Tool Access audit event.

The operation changes secret versions, not secret identities or refs. If the second/third version write, CAS or any later transactional write fails, earlier rotations roll back with the outer transaction.

No health/provider call is automatically made after credential replacement. The response is `needs_attention / unchecked` until explicit health succeeds.

## Runtime freshness

For the exact pinned `local_stdio` path, secrets are resolved immediately before each invocation and the child process is fresh per call and killed in `finally`.

Therefore credential replacement does not require a separate process-restart subsystem.

## Health

`health` delegates to native Paperclip `checkHealth`.

For this pinned local-stdio path the check is structural: credential resolution + approved template/runtime metadata. It does not call VendaERP.

A future real customer/provider test remains a separate explicitly effect-authorized action.

## Disconnect

`disconnect` always delegates to native Paperclip removal, including when a previous pass already archived the Connection.

This is deliberate. Native removal is resumable, so skipping an archived Connection could strand cleanup after a prior provider/secret failure.

## Secret-bearing path and idempotency

This host patch is a single-command provider execution boundary. It stores no command receipt.

Future customer wiring remains:

`browser → authenticated Core → company-HMAC Organization Adapter → capability-gated Paperclip host`.

Credential values are transient and forbidden from Wandora DB/logs, `plugin.state`, model context, employee config, command result and customer read APIs.

The future Organization Adapter wiring slice must reuse its existing narrow non-secret `dispatching / succeeded / uncertain` receipt pattern. An ambiguous dispatch must not blindly reinvoke the host.

## Disposable tests

The retained patch adds focused tests for:

- missing capability denial;
- cross-company invocation denial;
- exact declaration/operation boundary;
- successful inspect;
- complete 3/3 version rotation;
- no Paperclip IDs/secrets/plaintext in command result;
- explicit structural `local_stdio` health;
- injected third-secret version conflict proving full rollback of the first two rotations, health update and audit;
- native disconnect and grant revocation;
- repeated disconnected inspection.

The test uses embedded PostgreSQL and native `secretService` with an isolated test master-key file.

## Retained artifact

Incremental patch:

`integrations/paperclip/patches/v2026.916.1-managed-connection-command-v1.patch`

SHA-256:

`d06d369bf29d0177f054d8e16f483bd6e57544b96e817dd324e9eb86801e5fc1`

It must be applied after the immutable ADR 0281 host-operational-read patch.

## Validation status

Local disposable preparation proved the patch chain applies and `git diff --check` is clean.

Full local dependency installation/typecheck/test was **not** accepted as qualification: the VPS execution broker repeatedly lost long-running install sessions, leaving the workspace dependency links incomplete, and the broker host runs Node 22.23.3 while the Paperclip workspace requires Node >=24.11.0.

Therefore GitHub-hosted ADR 0158 CI under Ubuntu 24.04 / Node 24 is the execution authority for this code candidate.

Current status remains **CI PENDING**.

### CI iteration 1

PR #404 run `37120145953` passed exact patch application, the static authority/leak verifier, dependency installation and plugin SDK typecheck, then failed only at server TypeScript typecheck.

The failure was type-contract-only: the helper had narrowed native `ToolCredentialSecretRef.versionSelector` to `string | null` even though the exact pin defines `number | "latest"`, and it required an index signature from the typed credential-value object. The patch was corrected to accept the native union while still requiring runtime `"latest"`, and to treat credential input as `unknown` until its existing exact-key runtime validation. No capability, authority, transaction, redaction or runtime behavior changed.

The retained patch digest below is the post-fix digest; qualification remains **CI PENDING** until GitHub-hosted CI is GREEN.

## Explicit non-decisions / deferred work

This ADR does not authorize or implement:

- new-customer 28PRO Connection creation;
- local-stdio AppDefinition/backport;
- employee assignment;
- Organization Adapter command webhook;
- Core/Web customer self-service API/UI;
- production patch/deploy/restart;
- real credential mutation;
- real VendaERP call;
- fiscal read or DANFE behavior.

A later new-customer provisioning slice must independently prove a provider-native create path and safe env mapping. Provider replacement still means replacing the adapter/provider implementation behind the Wandora contract, not internalizing Paperclip lifecycle.

## Rollback

Repository rollback is removal/revert of the incremental retained patch, verifier/workflow and this documentation.

There is no runtime rollback in this ADR because no production runtime is changed.
