# Paperclip Managed Connection Command Host Capability V1

Repository-retained provider delta for ADR 0405.

This directory is **CODE ONLY / DISPOSABLE TESTS / NO PRODUCTION EFFECT**. It does not patch, restart, deploy or otherwise mutate the live Paperclip runtime.

## Upstream and patch chain

- Paperclip repository: `paperclipai/paperclip`
- accepted release: `v2026.916.1`
- exact upstream commit: `d554c4789ed3930f8a53ac9fdf6503b3187097da`
- prerequisite retained patch: `integrations/paperclip/patches/v2026.916.1-host-operational-read-v1.patch`
- prerequisite patch SHA-256: `fc0ce000b2fa5051f10fb71cfece71df17e9b4953779486d951b3f2990cd8bfb`
- incremental patch: `integrations/paperclip/patches/v2026.916.1-managed-connection-command-v1.patch`
- incremental patch SHA-256: `9b28a5990d48b93a265048f4972c92d3320b1c61669ced8a10c2878ce5a5f8b7`

The incremental patch is qualified only when applied **after** the ADR 0281 host-operational-read patch on that exact upstream commit.

## Scope

V1 is deliberately limited to the already-existing legacy 28PRO VendaERP read-only Connection.

It adds:

- plugin capability `tools.connections.managed`;
- `ctx.toolAccess.manageDeclaredConnection(...)` over the existing host-worker RPC;
- host invocation-company scope in addition to capability gating;
- an additional hard bind to plugin key `wandora.organization-adapter-v1`;
- exactly one admitted declaration: `wandora.28pro.vendaerp-readonly-v1`;
- operations `inspect`, `replace_credentials`, `health` and `disconnect`.

It does **not** add:

- new Connection/Application provisioning;
- arbitrary URL, transport, stdio command, template, Paperclip ID or config input;
- employee assignment;
- AppDefinition/backport work;
- a Wandora secret store, Connection registry or grant lifecycle;
- Board/admin credentials in a plugin;
- Organization Adapter webhook/Core/Web wiring;
- a production deployment.

New-customer provisioning remains a separate future slice.

## Exact existing-connection declaration

The provider-side resolver fails closed unless it finds exactly the historical Paperclip shape:

- application key `wandora.vendaerp-readonly-v1`;
- `mcp_stdio` application;
- managed/tool/customer `local_stdio` Connection;
- Paperclip vault + shared credential policy;
- template `wandora.vendaerp-readonly-v1-r1`;
- command `node`;
- args `/opt/wandora/integrations/vendaerp-readonly-mcp/server.mjs --tenant voepro`;
- env keys `VENDAERP_AUTHORIZATION_TOKEN`, `VENDAERP_USER`, `VENDAERP_APP`;
- exactly the eight ADR 0210 read-only VendaERP tool declarations;
- exactly one active Connection grant, which must be the default organization grant;
- exactly three matching, required, `latest` env secret refs on Connection and grant.

No metadata “adoption” marker is persisted. Every command re-qualifies current Paperclip state.

## Credential-set replacement

`replace_credentials` accepts all three semantic values or none.

The host then uses one Paperclip database transaction to:

1. lock and revalidate Application, Connection, grant and approved template;
2. lock the exact three `local_encrypted`, company-scoped active secret rows;
3. prove those secret identities are not referenced by another Connection or grant and that any bindings still target only the declared Connection;
4. invoke `secretService(tx).rotate(..., expectedLatestVersion)` for all three existing secret identities;
5. mark Connection health `unchecked`;
6. append a Paperclip Tool Access audit event containing only non-secret metadata.

Any later rotation/CAS/database failure rolls the whole transaction back. Secret refs and identities remain stable; only native Paperclip secret versions advance.

For this exact pin, local stdio credentials are resolved immediately before each invocation and the MCP child is spawned and terminated per call, so no credential-bearing process survives between calls.

## Health and disconnect

`health` delegates to native Paperclip `checkHealth`. On the pinned `local_stdio` path this resolves credentials and validates the approved stdio template/runtime slot; it does not call VendaERP or spawn the adapter.

`disconnect` delegates to native Paperclip removal every time, including a retry against an already archived Connection. This preserves Paperclip's fail-closed/resumable cleanup semantics.

## Output and idempotency boundary

The command result exposes only:

- declaration key;
- `connected | needs_attention | disconnected`;
- health status or null;
- whether credentials were updated.

It exposes no Paperclip object IDs, secret refs or credential values.

This host patch intentionally stores no command receipt. A future Organization Adapter wiring slice must reuse the existing narrow `plugin.state` dispatching/succeeded/uncertain receipt pattern and must not blindly retry an ambiguous secret-bearing dispatch.

## CI

`.github/workflows/paperclip-managed-connection-command-v1-ci.yml`:

1. checks out the exact Paperclip pin;
2. applies the retained ADR 0281 patch;
3. applies this incremental patch;
4. verifies patch digests, authority and leak constraints;
5. installs the frozen Paperclip dependency graph under Node 24;
6. typechecks plugin SDK and server;
7. runs the existing host-read tests plus the new capability/atomic-replacement tests.

The new embedded-Postgres test uses native `secretService` with an isolated test master key and proves successful 3/3 version rotation, rollback when the third version write fails, structural local-stdio health and native disconnect cleanup.

Local VPS preflight proved `git diff --check`; full local typecheck/test execution was not accepted as qualification because the execution broker repeatedly lost long-running install sessions and the local host Node version was 22.23.3 while the pinned Paperclip workspace requires Node >=24.11.0. GitHub-hosted CI is the execution authority for this code slice.
