# Paperclip Fast Read Run Result Read V1

Repository-retained provider delta for ADR 0284 / Paperclip Fast Read terminal result read qualification.

This directory is **CODE ONLY / NO PRODUCTION EFFECT**. It does not patch the live Paperclip runtime.

## Upstream pin

- repository: paperclipai/paperclip
- release: v2026.916.1
- commit: d554c4789ed3930f8a53ac9fdf6503b3187097da
- retained patch: `integrations/paperclip/patches/v2026.916.1-fast-read-run-result-read-v1.patch`
- patch SHA-256: `1bdc5fffdf097c71d8ae7a8e746b168f55d9fdc2c66c02f2d8d7893051a09785`

## Purpose

Paperclip already owns heartbeat-run lifecycle and terminal result/usage state. The existing
plugin `ctx.agents.invoke(...)` surface returns only a `runId`, while Wandora's
Organization Adapter needs a bounded provider-owned observation path before it can return a
synchronous customer Fast Read result.

The retained patch adds the narrowest host-owned read surface selected by ADR 0284:

- manifest capability: `agent.runs.read`;
- plugin client: `ctx.agentRuns.get({ companyId, agentId, runId })`;
- existing host-worker JSON-RPC boundary;
- existing host invocation-company scope;
- exact company + agent + run membership checks;
- existing `heartbeatService.getRun(runId)` as source of truth;
- bounded projection of `runId`, `status`, deterministic result fields and normalized usage;
- no run mutation, retry, cancellation, wakeup, Board credential, agent credential or direct
  database contract for the plugin.

Non-terminal runs expose status only. Terminal results are projected rather than returned as
raw heartbeat records. Logs, context snapshots, process/session identifiers, internal errors,
provider metadata, credentials and unrelated operational fields do not cross the plugin API.

This read capability does not itself wait, poll or dispatch. Organization Adapter wait semantics
remain a later separately reviewed slice after this provider read boundary is qualified.

## CI

`.github/workflows/paperclip-fast-read-run-result-read-ci.yml` checks out the exact upstream
commit, applies the digest-pinned patch, runs the static authority/leak verifier, installs frozen
upstream dependencies under Node 24, typechecks the patched plugin SDK and Paperclip server,
and runs focused capability/company/agent/run isolation tests.

No production deployment, Paperclip restart, provider/model/VendaERP call, customer work,
outbound effect, migration, Wandora lifecycle, registry or result mirror is authorized by this
artifact.
