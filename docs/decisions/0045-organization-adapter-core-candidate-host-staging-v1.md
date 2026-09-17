# ADR 0045 — Organization Adapter Core Candidate Host Staging V1

- Status: Accepted
- Date: 2026-09-17
- Scope: stage and verify the exact post-merge Core candidate archive on the Wandora VPS without running it

## Context

ADR 0044 / PR #90 created a traceable Core candidate artifact from canonical `main` and published it as a private short-lived GitHub Actions artifact. The production VPS intentionally remained unchanged: live Core still runs `wandora/core:team-read-b31db507`, Organization Adapter remains OFF, migrations 010/011 remain absent and no HMAC custody directory exists.

The remaining uncertainty was whether the exact private artifact could be transferred to the live host without turning the VPS into a Git checkout, introducing a registry contract or creating a new long-lived credential.

## Decision

Use the short-lived signed artifact download produced through the authorized GitHub connector only for one-time host staging.

The artifact is staged under the operator account, outside `/opt/wandora` runtime stacks:

```text
/home/wandora-admin/.local/share/wandora/core-candidates/<source_sha>/
```

Staging is not deployment. It must not create/recreate a container, alter Compose, install a plugin, create HMAC material or apply migrations.

The staged artifact is accepted only when all of the following match:

1. GitHub artifact ZIP SHA-256;
2. manifest `source_sha` equals canonical `main`;
3. manifest archive identity/provenance fields match the CI-produced candidate metadata;
4. manifest `archive_sha256` equals the locally recomputed Docker archive SHA-256;
5. bundled `SHA256SUMS` passes on the host;
6. ZIP extraction rejects absolute paths and `..` traversal components;
7. staged files are private to the operator account.

ADR 0047 later clarified that the historical manifest field named `image_id` is a runner-local diagnostic/config digest and must not be treated as a portable cross-engine `.Id` equality contract.

## Proven result

Canonical source:

```text
main = 7c7e7706c5ec59f9f732ff15bf7fd6939f1e7569
```

CI candidate/staged archive:

```text
historical runner_image_id/config_digest = sha256:ea91dfa41b728ed0ee03965ae76c52b95d3a726c5fd655917532aa5e9a284895
archive_sha256 = 2164ecabeeef0d085e8c16ac842e251913235345249fbb7f2e4381a2e8c44a57
artifact_zip_sha256 = 1661fc806db899fb904cfa6ec1c8e94ea231e50e052c58beeb2c63f9458ff783
```

Host proof returned:

```text
CORE_CANDIDATE_HOST_STAGING_V1_OK
```

The exact source SHA and both artifact/archive hashes matched. The archive was accepted as the exact CI-produced bytes.

## Failure/recovery evidence

The first `/opt/wandora/artifacts` staging attempt failed before download because the operator account did not own that path. No partial artifact was created there.

A subsequent attempt to create that path through `sudo` was rejected because sudo requires an interactive password. The operation stopped; no privilege workaround was introduced.

The chosen user-owned staging directory then downloaded the artifact successfully. The transfer completed and the ZIP digest matched before extraction. Extraction initially failed because `unzip` is not installed; the already-validated download was reused, not repeated. Python's standard `zipfile` module performed traversal-checked extraction without installing packages.

## Adversarial review

### Add a temporary SSH key or Git credential to move the artifact

Rejected. The authorized connector already yielded a short-lived signed artifact URL. Creating a new credential would widen the trust surface for no product benefit.

### Build again directly on the VPS

Rejected. The live VPS remains a runtime host, not a development checkout. Rebuilding there would replace provenance with a second build path.

### Stage under `/opt/wandora` using a sudo workaround

Rejected. Staging is not runtime and does not justify privilege escalation or asking the operator to expose a sudo password.

### Treat Docker `.Id` as the portable artifact identity

Rejected by the later evidence recorded in ADR 0047. The saved OCI archive has distinct config and manifest digests, and different Docker image stores may expose different one through `.Id`.

## Exit criteria

ADR 0045 is satisfied because the exact post-merge artifact is present and hash-verified on the VPS while:

- live Core remains unchanged;
- Organization Adapter remains OFF;
- migrations 010/011 remain absent;
- production Paperclip plugin/HMAC activation remains absent;
- no customer route or external effect was activated.

A subsequent separately reviewed `docker load` was attempted after this staging gate and produced the cross-engine digest evidence captured in ADR 0047. It did not start or recreate any container.