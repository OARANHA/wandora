# Paperclip Fast Read production candidate V1

This directory owns only the reproducible composition boundary for the exact
Paperclip source plus the already-qualified Fast Read patches used by Wandora.

It is **not** a Paperclip reimplementation, registry, deployment subsystem or
production activation path.

## Exact source and deltas

The composition script accepts only:

```text
Paperclip v2026.916.1
d554c4789ed3930f8a53ac9fdf6503b3187097da
```

and composes exactly these retained patches:

- `v2026.916.1-host-operational-read-v1.patch`;
- `v2026.916.1-fast-read-run-result-read-v1.patch`;
- `v2026.916.1-synchronous-webhook-response-v1.patch`.

No additional Paperclip capability may enter the production candidate without a
new qualification decision.

## Candidate workflow

`.github/workflows/paperclip-fast-read-production-candidate-ci.yml` reuses the
exact upstream Dockerfile and the existing patch composer on a GitHub-hosted
`ubuntu-24.04` runner. It:

1. checks out the exact Paperclip source commit;
2. composes the already-qualified patches;
3. proves Organization Adapter 0.5.0 compatibility pins;
4. builds the upstream `production` Docker target as
   `wandora/paperclip:v2026.916.1`;
5. starts that image in a disposable authenticated/private container using only
   synthetic CI secrets and requires `/api/health` to report `status=ok`;
6. freezes the exact image as a Docker archive compressed with zstd;
7. records source SHA, patch SHA-256 values, Wandora source SHA, Docker image/config
   digest, archive digests, build inputs and startup proof in `provenance.json`;
8. uploads only the exact archive/provenance/checksum set as a short-lived Actions
   artifact.

The workflow does not push an image, contact a model/business provider, use a
production credential or deploy anything.

## Exact-bytes promotion rule

The upstream Paperclip Dockerfile intentionally installs several CLI packages
through floating `@latest` specifications. Therefore source + patch identity does
not imply a byte-identical future image rebuild.

For this candidate, the promotion unit is the **exact archived image bytes**
qualified by the artifact SHA-256 and the loaded Docker image/config digest.

A future production execution must either:

- consume the exact retained archive and verify its checksum/digest before load; or
- if the artifact has expired or cannot be proved identical, build a new candidate
  and run a new convergence preflight.

Do not silently rebuild from the same source and call it the same candidate.

An OCI manifest digest is intentionally not asserted in this code/CI-only slice:
the candidate is a Docker image archive and is not pushed to an OCI registry.
That field is recorded as not applicable in provenance rather than fabricated.

## Production boundary

This candidate does not authorize Paperclip promotion. Production still requires a
fresh rollback capture, Task Drain/quiescence proof, exact artifact readback and a
new effect-authorizing decision/review.
