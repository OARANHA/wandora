# Paperclip Host Operational Read Capability V1

Repository-retained provider delta for Paperclip Host Operational Read Capability Extension Preflight V1.

This directory is CODE ONLY / NO PRODUCTION EFFECT. It does not patch the live Paperclip runtime.

## Upstream pin

- repository: paperclipai/paperclip
- release: v2026.916.1
- commit: d554c4789ed3930f8a53ac9fdf6503b3187097da
- patch SHA-256: fc0ce000b2fa5051f10fb71cfece71df17e9b4953779486d951b3f2990cd8bfb

Retained patch path: integrations/paperclip/patches/v2026.916.1-host-operational-read-v1.patch

## Purpose

The current accepted Paperclip stable keeps Connection, Connection-grant, catalog,
effective Tool Profile and runtime-health reads behind Board-authenticated APIs.
Normal plugins do not have an equivalent PluginContext client.

The retained patch adds the narrowest host-owned read surface found during ADR 0281:

- manifest capability: tools.operational.read;
- plugin client: ctx.toolAccess.readOperationalSnapshot(...);
- host-worker JSON-RPC using the existing plugin protocol;
- host-enforced invocation-company scope;
- exact-agent company membership verification;
- current Paperclip services as the source of truth;
- cache-only catalog reads, never catalog refresh/provider I/O;
- bounded projection without Board/admin credentials, provider credentials, secret refs,
  connection/catalog/grant/profile IDs, or mutation methods.

toolName is intentionally available only inside the provider-side plugin/adapter so a
replaceable adapter can map implementation operations to Wandora BusinessCapability.
It is not a Wandora public/product semantic and must not cross the adapter as such.

Runtime Tool Gateway authorization remains separate and final. This snapshot never grants
run authority and is never persisted by Wandora or plugin.state.

## CI

.github/workflows/paperclip-host-operational-read-extension-ci.yml checks out the exact upstream
commit, applies this patch, runs a static safety verifier, installs the frozen upstream
dependencies under Node 24, typechecks the plugin SDK + server, and runs focused tests.

The focused tests prove:

- missing capability is rejected;
- cross-company invocation scope is rejected;
- a same-company invocation is admitted;
- the real host service rejects a cross-company agent;
- the operational snapshot is tenant/agent-scoped;
- the returned projection contains no Paperclip object IDs or credential/secret fields.

No production deploy, Paperclip restart, customer/provider/model call, customer work,
outbound effect, migration, registry, or state mirror is authorized by this artifact.
