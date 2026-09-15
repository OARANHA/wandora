# Core Mastra Deterministic Live Activation V1

Date: 2026-09-15

This document records the reviewed live activation of ADR 0014. It is evidence/runbook material, not a secret store.

## Preconditions

Live activation was allowed only after:

- PR #33 merged to `main` as `bd40a4380f4a71be0b6ff0028dfc9799ef9fa68c`;
- Core CI and Messaging Gateway CI were green on the final PR head;
- both workflows were green again on the resulting `main` push;
- the final review confirmed no database migration, no public Core port, no model credential and no outbound activation;
- Mastra telemetry disabling was moved before framework load using dynamic imports and was also forced in the Compose overlay.

## Exact build provenance

The VPS build context under the operator workspace was reconstructed from the merged commit and verified with Git blob hashes.

The complete runtime build matrix matched the commit for:

- `.dockerignore`;
- `Dockerfile`;
- `package.json`;
- `package-lock.json`;
- TypeScript configs;
- Ana contracts/policy/repository/service/supervised ingress;
- Gateway ingress runtime;
- Core server/config/main;
- Mastra deterministic adapter.

The canonical `package-lock.json` Git blob was:

`8bcd6e96ccaece26714b618ae2859c04b492448d`

Its canonicalized JSON semantic SHA-256 was:

`2761f05cc16b6ff3ac4d32ceebc52f4bea777095a16213220ca4578c13d5a258`

A local npm-generated lock initially differed in exactly one package metadata field: the `resolved` URL for `@esbuild/sunos-x64`. The build was not allowed to proceed until that entry matched the reviewed lock and the full Git blob became byte-identical.

## Local build gate

The exact context was validated with the pinned runtime:

```text
Node: v22.23.2
npm: 10.9.8
npm ci: green
typecheck: green
production build: green
```

Promoted image:

`wandora/core:mastra-deterministic-bd40a438`

The image runs as `node` and preserves the existing pinned Node base image.

## Compose second review

The live overlay is:

```yaml
services:
  core:
    environment:
      WANDORA_AGENT_RUNTIME_MODE: mastra-deterministic
      MASTRA_TELEMETRY_DISABLED: "true"
```

The effective Compose configuration was reviewed before live replacement and proved:

```text
ports: []
expose: 8788 only inside Docker
networks: wandora-core + wandora-data
read_only: true
cap_drop: ALL
security_opt: no-new-privileges:true
WANDORA_GATEWAY_INGRESS_ENABLED: true
WANDORA_AGENT_RUNTIME_MODE: mastra-deterministic
MASTRA_TELEMETRY_DISABLED: true
```

## Parallel candidate smoke

Before production replacement, a separate private candidate container used the production database/Gateway secret mounts and the same hardened runtime options.

Accepted candidate evidence:

```text
healthz: 200
readyz: 200
published ports: 0
networks: wandora-core + wandora-data
user: node
read-only root filesystem: true
agentRuntime: mastra-deterministic
```

The candidate container was removed after the smoke.

## Live promotion

The prior production image was captured as the rollback target before replacement:

`wandora/core:gateway-ingress-v1-2a49c066`

Only the Core service was recreated. Gateway, Evolution, PostgreSQL and other services were not recreated by this operation.

The promotion script automatically restored the previous image without the deterministic overlay if either health or readiness failed.

Rollback was not required.

Post-promotion evidence:

```text
image: wandora/core:mastra-deterministic-bd40a438
healthz: 200
readyz: 200
published ports: 0
networks: wandora-core + wandora-data
user: node
read-only root filesystem: true
cap_drop: ALL
no-new-privileges: true
secret-reader group: 987
WANDORA_AGENT_RUNTIME_MODE=mastra-deterministic
MASTRA_TELEMETRY_DISABLED=true
```

## Direct signed Core proof

The existing explicitly labeled Wandora internal supervised-proof tenant/connection was used. No customer fixture was created.

A synthetic normalized event was signed using the already mounted Gateway→Core HMAC secret without printing or exporting the secret.

The first successful request persisted:

```text
receipt: completed
result: supervision-required
proposal: present
proposal.kind: send-text
proposal.commitment: none
work: attention-required
approvals for event: 0
outbound attempts for event: 0
inbound messages for event: 1
outbound messages for event: 0
```

A first replay verifier incorrectly compared `JSON.stringify(...)` output and reported drift because PostgreSQL `jsonb` can reorder object keys. No runtime invariant failed.

The corrected replay verifier compared objects structurally and proved:

```text
HTTP: 200
duplicate: true
result: structurally identical to durable receipt result
approvals: 0
outbound attempts: 0
outbound messages: 0
```

## Messaging Gateway end-to-end proof

A second controlled synthetic event was injected at the live Messaging Gateway boundary using an Evolution-compatible JWT generated from the already mounted webhook key.

The test payload included a provider-private sentinel in fields that must never enter canonical Core state.

Proven path:

```text
Evolution-compatible JWT webhook
  -> wandora-messaging-gateway
  -> provider normalization
  -> Gateway/Core HMAC
  -> wandora-core
  -> Mastra deterministic proposal
  -> PostgreSQL durable supervision state
```

Both initial submission and replay returned HTTP 200 at the Gateway boundary.

Durable evidence:

```text
receipt: completed / supervision-required
proposal: present / send-text / commitment none
work: attention-required
approvals: 0
outbound attempts: 0
inbound messages: 1
outbound messages: 0
provider-private sentinel in receipt/message state: absent
```

No real WhatsApp message was sent by this activation operation.

## Current rollback

The prior image remains available locally as the immediate software rollback target:

`wandora/core:gateway-ingress-v1-2a49c066`

Rollback must omit the deterministic Agent Runtime overlay and then re-prove `/healthz` and `/readyz`.

Database rollback is not required for this V1 activation because no database migration was introduced.

## Current boundary after activation

Mastra deterministic proposal generation is live, but supervision remains authoritative.

This activation does **not** permit:

- automatic WhatsApp replies;
- automatic approval creation for safe drafts;
- direct browser access to private receipt data;
- real model-provider calls;
- re-use of the compromised historical Mistral token.

The next slice is **Supervised Proposal Review V1 — Core → Wandora Web**.