# ADR 0048 — Organization Adapter Core Candidate Portable Host Proof V1

- Status: Accepted
- Date: 2026-09-17
- Scope: prove the corrected post-merge Core candidate can be staged and loaded on the production host without activating or mutating the running Organization Adapter runtime

## Context

ADR 0047 corrected the provenance contract after the same OCI archive exposed different engine-local `.Id` values on the GitHub runner and the Wandora VPS. PR #92 then made archive-derived `oci_config_digest` and `oci_manifest_digest` authoritative and kept `runner_image_id` diagnostic only.

The remaining gate was to rebuild from the real post-merge `main`, prove the private artifact, stage those exact bytes on the host, and re-run the host load proof without creating or recreating a container.

Canonical application source for this candidate:

```text
main/source_sha = 068d30a49d9b96a943c7c3d23d86116e94cce788
```

## Post-merge CI proof

GitHub Actions `Core Candidate Artifact` run `35198147447` executed on `push` to `main` at the exact source SHA above and completed successfully.

The build/reload verifier proved:

```text
candidate tag       = wandora/core:organization-adapter-candidate-068d30a49d9b
archive_sha256      = 3b7c65c30525fb3f2bb0674bbe81687570aae48f26b08ee80b8c6a33193a7d76
oci_config_digest   = sha256:256f237aafdfb4f7968c122cce044312de78390105bb148b63a8ff7e271edb9f
oci_manifest_digest = sha256:f0ffa18271172e6e6e77f778f7b2f4f5302a84901909663525b8f665ad9f0c1e
runner_image_id     = sha256:256f237aafdfb4f7968c122cce044312de78390105bb148b63a8ff7e271edb9f
candidate_contract  = organization-adapter-core-v1
image_user          = node
```

The falsifiable regression also behaved correctly: changing only `runner_image_id` remained acceptable to the portable archive verifier, while forging `oci_config_digest` failed with `candidate_manifest_fact_mismatch:oci_config_digest`.

The short-lived private artifact was published as:

```text
artifact_id         = 10487136577
artifact_zip_sha256 = 2bf661160c5344c87ed4445e709dfdcdc95e067c4c049eb596f3a1835c6d02db
```

## Host staging proof

The exact artifact was transferred using the authorized connector's short-lived download capability into the existing operator-owned staging area:

```text
/home/wandora-admin/.local/share/wandora/core-candidates/
  068d30a49d9b96a943c7c3d23d86116e94cce788/
```

Staging used `umask 077`; the base and extracted payload directories were mode `0700`. The ZIP SHA-256 was verified before extraction. Python stdlib `zipfile` rejected absolute paths and `..` traversal components before extracting.

Host verification then independently proved:

- bundled `SHA256SUMS` passed;
- manifest `source_sha` matched the canonical application source;
- Docker archive SHA-256 matched the CI value;
- `manifest.json` config digest and `index.json` manifest digest matched the expected archive blobs;
- both referenced blobs matched their own SHA-256 digests;
- the OCI manifest referenced the expected config digest;
- source revision and candidate labels matched;
- configured user was `node`;
- no Organization Adapter enable/secret, HMAC, password, token or API-key environment material was baked into the image.

The host verifier returned:

```text
CORE_CANDIDATE_HOST_PORTABLE_PROVENANCE_OK
```

## Docker load result

The verified archive was loaded into the Docker image store only. No `docker run`, `docker compose up`, container recreate or restart was requested.

The VPS Docker 29.8 image store exposes:

```text
loaded tag       = wandora/core:organization-adapter-candidate-068d30a49d9b
loaded .Id       = sha256:f0ffa18271172e6e6e77f778f7b2f4f5302a84901909663525b8f665ad9f0c1e
```

That `.Id` equals the already-proven OCI manifest digest, which is valid under ADR 0047.

The loaded image retained the exact source revision label, candidate contract, `USER node` and forbidden-env boundary. The number of running containers using the new candidate tag is zero.

## Failure/recovery evidence

The first combined load-validation command exited non-zero after the image had already loaded. The operation was **not repeated**.

The cause was the verification harness, not Docker load: under `set -o pipefail`, a `grep` used to count candidate containers returned exit status 1 when it correctly found zero matches. That expected-zero result terminated the shell before the success message.

State was inspected before any retry. The candidate tag was already present with the expected OCI manifest digest, labels, user and environment boundary, and zero running candidate containers. Therefore no second `docker load` was performed.

This is a continuity requirement: an interrupted or failed response/harness must be reconciled against real state before repeating an operation.

## No-runtime-mutation proof

Docker event inspection over the relevant interval showed only normal health-check `exec_create`, `exec_start` and `exec_die` events. No container create/start/restart/stop lifecycle event occurred because of this load.

The most recent existing container `StartedAt` remained hours earlier than the candidate load. Live Core remained:

```text
container             = wandora-core
image                 = wandora/core:team-read-b31db507
status                = healthy
Organization Adapter  = OFF
```

The production Organization Adapter HMAC custody directory remained absent.

A read-only PostgreSQL check after the load still returned:

```text
wandora.control_plane_provider_bindings    = ABSENT
wandora.digital_employee_provider_bindings = ABSENT
wandora.digital_employee_hire_operations   = ABSENT
```

Therefore migrations 010/011 remain unapplied.

## Adversarial review

### Treat successful image load as permission to activate production

Rejected. Loading an inert image proves supply-chain portability only. It does not satisfy the separate migration, Paperclip plugin/configuration, per-company HMAC custody, Core runtime wiring or customer authorization gates.

### Repeat the load because the combined harness exited 1

Rejected. Real-state inspection proved the load had already completed. Repeating work after a timeout or harness failure without reconciling actual state would violate the project's continuity discipline.

### Clean up old candidate/laboratory containers and images during this slice

Rejected. Cleanup is a separate operational concern. Mixing it with provenance staging would widen the mutation surface and make validation less attributable.

### Deploy the candidate immediately because CI and host provenance are green

Rejected. The next step is a separately reviewed production activation preflight. Production migrations, provider plugin state, HMAC custody and Core recreation remain distinct effects and must not be bundled into this proof.

## Decision

The portable provenance defect identified by ADR 0047 is closed for the post-merge candidate source `068d30a49d9b96a943c7c3d23d86116e94cce788`.

The candidate is **STAGED + LOADED, NOT RUNNING**. This state does not activate the Organization Adapter and does not authorize customer hiring.

## Next action

Next executable slice: **Organization Adapter Production Activation Preflight V1**.

The preflight must re-read current `main`, runtime and production state and produce an ordered, reversible activation plan covering at least:

1. migrations 010/011 and their exact pre/post verifiers;
2. pinned Paperclip managed-plugin installation/configuration boundary;
3. per-company HMAC generation and mounted-file custody without exposing secrets;
4. candidate Core composition/readiness and rollback ordering;
5. confirmation that Human Send and Gateway outbound remain outside this activation;
6. confirmation that no customer `Contratar/Ativar funcionário` route is introduced by technical activation;
7. second adversarial review before any production mutation.

No production activation is authorized by this ADR.
