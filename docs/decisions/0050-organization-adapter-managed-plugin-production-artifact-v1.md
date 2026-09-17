# ADR 0050 — Organization Adapter Managed Plugin Production Artifact V1

- Status: **Accepted and proven in canonical `main`; NOT installed/configured live**
- Date: 2026-09-17
- Scope: promote the proven Paperclip managed-plugin contract out of disposable `spikes/` into a reproducible production-installable artifact without installing or configuring it in production

## Context

ADR 0049 stopped the Organization Adapter production preflight because the only preserved Paperclip managed-plugin implementation was explicitly disposable proof source under `spikes/`. Production migrations 010/011, Paperclip plugin/config, HMAC custody and Core Organization Adapter activation therefore remained OFF.

The pinned Paperclip runtime is `wandora/paperclip:v2026.831.1`, source commit `65ec059bde30d98c92165b24a30a540800dd1f6f`. Its plugin API is V1 and its source package reports `@paperclipai/plugin-sdk` version `1.0.0`.

A production artifact must preserve ADR 0039's company-scoped `secret_ref` + HMAC + `agents.managed.reconcile()` semantics while removing proof-only identities/endpoints and gaining a reproducible package/provenance gate.

## Additional finding

`@paperclipai/plugin-sdk@1.0.0` is not available from the npm registry. A package that merely declared that dependency would look conventional but would not be independently installable.

The accepted build therefore compiles against the SDK from the exact pinned Paperclip source commit and bundles the SDK into the final worker. The installable tarball has no runtime npm dependency on the unpublished SDK package.

## Decision

Canonical package source lives at:

```text
integrations/paperclip/plugins/organization-adapter-v1/
```

Package identity:

```text
paperclip-plugin-wandora-organization-adapter@0.1.0
plugin id: wandora.organization-adapter-v1
apiVersion: 1
```

Compatibility is explicitly pinned in `compatibility.json` to the accepted Paperclip image/source/SDK contract.

The V1 catalog remains deliberately narrow:

```text
catalogKey  = ana-commercial-v1
displayName = Ana
role        = commercial-assistant
adapterType = wandora_mastra
status      = paused
budget      = 0
```

`wandora_mastra` is a stable adapter identifier only. This package embeds no execution URL, token or runtime credential, and plugin installation does not itself promote or enable the Paperclip → Wandora/Mastra execution bridge.

Arbitrary/custom employees and direct `agent-hires` fallback remain outside V1.

## Signed webhook boundary

The worker accepts only `employee-reconcile` with exact `companyId` + `catalogKey` body semantics.

It requires:

- one timestamp header within the bounded five-minute window;
- one HMAC-SHA256 signature over `timestamp + '.' + exact raw body`;
- per-company secret material resolved only through the configured Paperclip `secret_ref`;
- at least 32 characters of resolved HMAC material;
- catalog key `ana-commercial-v1` exactly.

Ambiguous repeated signature headers fail closed. Valid authentication then calls only:

```text
ctx.agents.managed.reconcile('ana-commercial-v1', companyId)
```

Paperclip host configured-company scope and managed-agent semantics remain independent enforcement layers.

## Reproducible artifact gate

`.github/workflows/organization-adapter-plugin-ci.yml` checks out the exact Paperclip source commit and uses Node `24.21.0` plus pnpm `9.15.4`.

The package verifier proves:

1. strict TypeScript against the pinned Paperclip SDK declarations;
2. worker/manifest bundling against the pinned SDK runtime;
3. five signed-ingress contract tests;
4. artifact shape/invariant verification;
5. syntax validation of generated worker and manifest;
6. acceptance by the pinned Paperclip native manifest validator;
7. two independent `npm pack` executions produce the same SHA-256;
8. the tarball contains only README, compatibility contract, manifest, worker and package metadata;
9. forbidden proof/credential material is absent;
10. private CI artifact includes the `.tgz`, SHA-256 file and external provenance record.

The GitHub artifact is retained for seven days and is not published to a public npm registry by this slice.

## Laboratory evidence before PR

A disposable build against the exact installed Paperclip image proved strict typecheck, bundle generation, contract tests, Wandora artifact validation and native Paperclip manifest validation.

Two consecutive local `npm pack` executions produced the same SHA-256:

```text
2677c1dfea38541b75bc1417c5ce70d523e524e05028bdda6f25c5c7fb4b8376
```

That laboratory hash is historical evidence only. It was superseded by the canonical CI-built source after the final hardening changes.

## Canonical merge and post-merge proof

PR #95 was squash-merged into:

```text
main = f60715d042da4bbe4ac9068ea29dae2c986006bd
```

The PR head passed all five relevant workflows, including the dedicated Organization Adapter Plugin CI and the Core Production Activation Rehearsal.

The post-merge `main` Organization Adapter Plugin CI then rebuilt the artifact from a clean checkout:

```text
workflow_run        = 35266676646
artifact_id         = 10516662930
artifact_name       = organization-adapter-plugin-f60715d042da4bbe4ac9068ea29dae2c986006bd
artifact_zip_sha256 = 121358ee9f09b910eae82d6a72e15ed8ed6285bd6fe8ab311232fca2928abfa4
package             = paperclip-plugin-wandora-organization-adapter-0.1.0.tgz
package_sha256      = a4811f1d1f8521aeaf3930979ce12784f9b55e52390e24ead85300250d383e36
paperclip_source    = 65ec059bde30d98c92165b24a30a540800dd1f6f
```

The installable package contains exactly:

```text
package/README.md
package/compatibility.json
package/dist/manifest.js
package/dist/worker.js
package/package.json
```

No production installation/configuration was performed by this proof.

## Second adversarial review

### Depend on `@paperclipai/plugin-sdk@1.0.0` from npm

Rejected. The version is not published in the registry, so the resulting package would not satisfy the installability claim.

### Copy the disposable spike directly into production

Rejected. It contains proof naming and the proof execution adapter endpoint/identity; it also bypasses provenance and package verification.

### Preserve `wandora_mastra_spike` in the production manifest

Rejected. A production control-plane artifact must not freeze a laboratory execution identity into managed agents.

### Embed a Wandora execution URL now

Rejected. Organization Adapter plugin promotion and Paperclip → Wandora execution-adapter promotion are separate capability gates. The managed employee therefore starts paused and has no embedded adapter configuration.

### Publish the package publicly to npm now

Rejected. Public registry publication is unnecessary for the current private deployment gate and would widen the supply-chain/release surface without product value.

### Install/configure live Paperclip as part of this slice

Rejected. This slice exists specifically to close the missing artifact gate before returning to a fresh production preflight.

## Production effect

None.

This ADR does **not** authorize or perform:

- migrations 010/011 in production;
- live Paperclip plugin installation or company configuration;
- production HMAC generation/custody;
- Core Organization Adapter enablement/recreation;
- customer `Contratar` / `Ativar funcionário` UI/API;
- arbitrary/custom employee creation;
- Human Send or Gateway outbound activation;
- promotion of the Paperclip → Wandora/Mastra execution adapter.

## Next gate

The production-artifact blocker from ADR 0049 is cleared. The next executable slice is a **fresh Organization Adapter Production Activation Preflight**.

That preflight must re-verify real runtime state and the exact post-merge installable artifact before any production migration, Paperclip configuration, HMAC creation or Core activation is allowed. It must not repeat already-proven backup/restore or candidate-load operations merely because a chat or tool session was interrupted.
