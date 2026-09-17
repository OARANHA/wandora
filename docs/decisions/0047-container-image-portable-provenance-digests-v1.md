# ADR 0047 — Portable Container Image Provenance Digests V1

- Status: Accepted
- Date: 2026-09-17
- Supersedes: any assumption in ADR 0044/0045 that `docker image inspect .Id` is a portable identity across Docker image stores
- Scope: candidate image provenance and host-load verification only

## New evidence

The exact ADR-0044 candidate archive was hash-verified on the Wandora VPS and then loaded without starting a container.

CI had recorded:

```text
docker image inspect .Id
= sha256:ea91dfa41b728ed0ee03965ae76c52b95d3a726c5fd655917532aa5e9a284895
```

After loading that exact archive on the VPS Docker 29.8.0, the same command returned:

```text
sha256:2afe1888f7398290b92d1539dc5dea1e4ae956078f03ebe85e54f111cd49de14
```

The load gate stopped before any container mutation because it had assumed `.Id` must be equal across engines.

Archive inspection proved the artifact itself is internally consistent:

```text
manifest.json Config:
  blobs/sha256/ea91dfa41b728ed0ee03965ae76c52b95d3a726c5fd655917532aa5e9a284895

index.json manifest digest:
  sha256:2afe1888f7398290b92d1539dc5dea1e4ae956078f03ebe85e54f111cd49de14
```

Therefore:

- `ea91…` is the saved image **config digest**;
- `2afe…` is the OCI image **manifest digest**;
- the two Docker engines expose different one of these through `.Id` after the OCI archive round trip.

The loaded image still carried the exact canonical revision label, candidate contract label, non-root `node` user and expected non-sensitive environment. The running container set remained unchanged.

## Decision

Wandora candidate provenance must record and verify portable OCI facts from the saved archive, not treat engine-local `.Id` as the universal identity.

The candidate manifest must contain at least:

```text
source_sha
source_tree_sha
archive_sha256
oci_config_digest
oci_manifest_digest
```

`runner_image_id` may be retained only as diagnostic evidence and must not be used as a cross-engine equality gate.

Host-load verification must:

1. recompute the archive SHA-256;
2. parse the archive `manifest.json` and `index.json`;
3. verify `oci_config_digest` and `oci_manifest_digest` against the candidate manifest;
4. load the image only after those archive-level checks pass;
5. verify the loaded image's canonical revision/candidate labels, configured user and forbidden-env boundary;
6. accept engine-local `.Id` only when it equals one of the already-proven archive identities appropriate to that engine, never as the sole provenance fact;
7. prove no running container/service changed.

## Adversarial review

### Keep `.Id` equality and call the VPS load corrupt

Rejected. The archive itself contains both digests and the loaded image metadata matches the canonical source. Treating a Docker image-store representation detail as corruption would be a false red.

### Ignore image identity entirely and trust only the archive SHA

Rejected. Archive integrity proves bytes, but explicit OCI config/manifest digests improve diagnosis and make the candidate contract portable across engines.

### Rebuild on the VPS to make `.Id` match

Rejected. That would destroy the single-build provenance chain and replace it with a second build.

### Continue production activation before fixing the provenance contract

Rejected. The candidate load exposed a verifier-contract bug. Provenance semantics must be corrected in Git/CI before any migration, plugin, HMAC or candidate runtime activation.

## Current host state

The candidate image is now present in the VPS Docker image store but is **not running**.

```text
candidate tag:
  wandora/core:organization-adapter-candidate-7c7e7706c5ec

VPS .Id / OCI manifest digest:
  sha256:2afe1888f7398290b92d1539dc5dea1e4ae956078f03ebe85e54f111cd49de14

OCI config digest:
  sha256:ea91dfa41b728ed0ee03965ae76c52b95d3a726c5fd655917532aa5e9a284895
```

Live `wandora-core` remains `wandora/core:team-read-b31db507`; Organization Adapter remains OFF; migrations 010/011 and HMAC custody remain absent.

## Next action

Fix the ADR-0044 candidate builder/workflow so the artifact manifest records both OCI config and manifest digests and the CI reload gate uses the portable contract. Rebuild from the next canonical `main`, then re-stage/reload only if the candidate bytes changed.