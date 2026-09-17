# ADR 0044 — Organization Adapter Core Candidate Artifact + Pre-Activation Boundary V1

- Status: Accepted
- Date: 2026-09-17
- Scope: produce a traceable Core candidate artifact and prove the current live pre-activation boundary without activating Organization Adapter production state

## Context

ADR 0042 rehearsed activation/rollback in disposable infrastructure. ADR 0043 wired the Organization Adapter into Core behind a disabled-by-default, fail-closed candidate overlay. PR #89 then re-verified the real live state after an interrupted session.

The live VPS still runs `wandora/core:team-read-b31db507`. Migrations 010/011 remain absent, no Organization Adapter HMAC custody directory exists and there is no post-ADR-0043 Core image on the host.

Applying migration 011 or installing production plugin/HMAC state before an exact candidate artifact exists would widen capability ahead of the executable consumer and violate ADR 0043's ordering.

## Decision

Before any production migration/plugin/HMAC mutation, Wandora will create a source-identifiable Core candidate as a GitHub Actions artifact and separately prove the live environment still matches the expected pre-activation boundary.

The candidate build must:

1. build only `apps/core` from the checked-out commit;
2. label the image with the exact Git commit revision and Wandora candidate identity;
3. verify the image runs as `node` and contains no Organization Adapter enable flag or secret material baked into image environment;
4. export the image as a compressed Docker archive;
5. publish a manifest containing source SHA, image ID and SHA-256 hashes of the Dockerfile, lockfile and archive;
6. upload the archive + manifest only as a short-lived private GitHub Actions artifact;
7. never push the candidate to a public registry as part of this gate.

The live pre-activation verifier must be read-only and prove:

- live Core has Organization Adapter OFF;
- live Core has no published host port;
- live Core remains on the reviewed private networks;
- live Paperclip is the pinned `wandora/paperclip:v2026.831.1` image on the private Core network;
- migration-010 private tables remain absent;
- Organization Adapter HMAC custody is still absent;
- Human Send/Gateway outbound are not enabled by this slice.

## Adversarial review

### Build directly on the production VPS

Rejected. The VPS is a runtime host, not the source-of-truth development checkout. Pulling a private repository or introducing a persistent development tree there increases credential and drift risk merely to obtain a build context.

### Apply migrations first, then build the image

Rejected. Migration 011 grants new `wandora_core_runtime` capability. The executable candidate must exist and be provenance-checked before widening production privileges.

### Push the candidate to a public container registry

Rejected. Distribution convenience does not justify creating a new public supply-chain surface for a private pre-activation artifact.

### Install plugin/HMAC state first

Rejected. Provider capability and secret custody must not become live ahead of the identified Core candidate that consumes them.

## Exit criteria

This ADR is satisfied when:

- CI produces a candidate image archive and provenance manifest from the reviewed commit;
- artifact hashes validate inside CI;
- the live read-only pre-activation verifier is green;
- production migrations 010/011 remain unapplied;
- production Paperclip plugin/config/HMAC state remains absent;
- live Core remains unchanged and Organization Adapter remains unreachable to customers.

Loading or deploying the candidate on the VPS is a separate reviewed operation. Production technical activation and customer `Contratar/Ativar funcionário` remain later slices.