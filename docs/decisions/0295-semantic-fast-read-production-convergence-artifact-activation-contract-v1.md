# ADR 0295 — Semantic Fast Read Production Convergence Artifact + Activation Contract V1

Status: **QUALIFIED / 17/17 PR WORKFLOWS GREEN / PRODUCTION EXECUTION NO-GO / NO PRODUCTION EFFECT**

Date: 2026-09-26

## Context

ADR 0294 completed production convergence preflight and proved that the remaining blockers were deployment evidence and production custody, not missing Wandora-owned product state or a missing subsystem.

The executable slice was intentionally limited to code/CI:

- produce a deployable exact Paperclip `v2026.916.1` candidate with the three already-qualified Fast Read host patches;
- prove authenticated/private startup before freezing the candidate bytes;
- record sufficient provenance to prevent a later rebuild from being mistaken for the same candidate;
- define the smallest disabled-by-default Core activation contract;
- separate effect-inert compatibility convergence from future production secret custody;
- preserve the existing Wandora platform Mistral credential as the selector credential source;
- stop before any VPS, production, provider, ERP, customer, WhatsApp or outbound mutation.

The permanent ADR 0168 guardrail remains unchanged:

> Portability = contract decoupling, not duplication of provider implementation.

Paperclip remains operational authority for workforce/run/tools/secrets/audit. Wandora remains semantic/product/effect authority. TypeSafe/System One, Mastra/Mistral and VendaERP remain replaceable providers behind Wandora-owned contracts.

## REAL NOW reconciled before execution

Before this slice:

- `main` = `8d6a65f519de5c1c49607314b49968af608c7164`;
- PR #369 was open/draft/mergeable;
- production still ran the older Core/Paperclip state captured by ADR 0294;
- no production mutation was authorized.

The qualified implementation head before this documentation checkpoint is:

- PR #369 head: `2029c7b3f49ad984510f30c4e19cff3e52c877ff`;
- GitHub pull-request merge ref: `fd4d9373d3d7e4d9eca202abdf075fde8feeb8d0`;
- base `main`: `8d6a65f519de5c1c49607314b49968af608c7164`.

The distinction matters because GitHub `pull_request` workflows expose the tested merge ref as `GITHUB_SHA`. Candidate provenance therefore records `fd4d9373...`, while the branch implementation head is `2029c7b3...`.

## Capability Authority / Reuse Gate

No new Wandora lifecycle, run store, provider registry, cache, ERP mirror, secret manager, retry engine or operational mirror was justified.

The slice reuses:

- upstream Paperclip Dockerfile as the image implementation;
- exact Paperclip source `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
- existing `compose-qualified-patches.sh`;
- the three retained Paperclip Fast Read patches;
- existing Core runtime gates and file-loading behavior;
- existing `compose.agent-runtime-model.yaml` for the platform Mistral credential;
- GitHub-hosted `ubuntu-24.04` CI per ADR 0158.

## Decision

### 1. Exact Paperclip candidate bytes are the promotion unit

Added `.github/workflows/paperclip-fast-read-production-candidate-ci.yml`.

The workflow:

1. checks out exact Paperclip `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
2. composes only the three already-qualified provider patches;
3. verifies Organization Adapter `0.5.0` compatibility pins;
4. builds the upstream Paperclip Dockerfile target `production`;
5. starts the image in an authenticated/private disposable container with synthetic CI-only secrets;
6. waits until `GET /api/health` reports `status=ok`;
7. verifies the embedded Paperclip build commit;
8. freezes the exact image with `docker save`;
9. compresses it with zstd;
10. records source, patch, image and archive provenance;
11. uploads the exact archive + `provenance.json` + `SHA256SUMS` as one short-lived private Actions artifact.

The workflow does **not** push to GHCR and does **not** deploy.

Because the upstream Paperclip Dockerfile intentionally resolves several CLI tools using floating `@latest` specifications, source + patch identity is not sufficient to claim byte-identical rebuilds. A future production execution must consume the exact retained archive and verify its checksum, or create a new candidate and repeat preflight.

### 2. Core compatibility convergence remains effect-inert

Added `infra/stacks/core/compose.semantic-fast-read.yaml`.

It explicitly sets:

```text
WANDORA_FAST_READ_EXECUTION_ENABLED=false
WANDORA_SEMANTIC_FAST_READ_ENABLED=false
WANDORA_SEMANTIC_SELECTOR_ENABLED=false
WANDORA_HUMAN_SEND_PROPOSAL_ENABLED=false
```

It records container-side secret paths and bounded timeouts only.

With those gates OFF, Core does not open the new TypeSafe/System One key file or the Fast Read intent-HMAC file. The overlay must therefore render without any new production host secret.

### 3. Future custody is a separate overlay

Added `infra/stacks/core/compose.semantic-fast-read-custody.yaml`.

It contains only two read-only future mounts:

- TypeSafe/System One API key → `/run/secrets/wandora/typesafe-jev.api-key`;
- distinct Wandora Fast Read `wfri1` HMAC → `/run/secrets/wandora/fast-read-intent.hmac`.

The overlay neither creates those secret values nor authorizes their use.

The semantic selector does not receive a new secret. It continues to reuse the existing platform Mistral mount from `compose.agent-runtime-model.yaml`:

```text
/run/secrets/wandora/model-provider.api-key
```

### 4. CI enforces the split

Core CI now proves:

- gates-OFF convergence renders without the new host secret variables;
- the four effect gates remain false;
- the container secret paths/timeouts are stable;
- the custody overlay adds only the two intended read-only mounts;
- no selector-specific Mistral mount was introduced.

## Adversarial review

The first JEV route returned `deep_review` with probability `0.66`.

The design was narrowed:

- no GHCR/package push;
- no second deployment system;
- no claim of byte-reproducible rebuilds;
- exact archived bytes become the candidate;
- gates-OFF and custody overlays are separated;
- Mistral custody is reused rather than duplicated.

The second JEV route returned `proceed_fast` with probability `0.68`.

After execution and validation, JEV completion review returned `complete` with probability `0.70`.

JEV remains advisory and did not override repository authority or deterministic gates.

## Validation evidence

### Paperclip production candidate

Workflow:

- run: `36266133475`;
- job: `108471033723`;
- result: **GREEN**.

Candidate facts:

- image tag: `wandora/paperclip:v2026.916.1`;
- Paperclip source: `d554c4789ed3930f8a53ac9fdf6503b3187097da`;
- tested Wandora merge ref recorded by `GITHUB_SHA`: `fd4d9373d3d7e4d9eca202abdf075fde8feeb8d0`;
- Docker config/image digest: `sha256:e05f1604cf863d316b4ce5db189782f022fa4fd17544f9724747e11223d4356c`;
- raw Docker archive SHA-256: `a91f96feff4dbb8161d182e350fc3e2ca1d0d6784cfa9179fdaa20a200e7ce97`;
- compressed zstd artifact SHA-256: `69c962c79375446060af12fc9240385987790f4d11a3528cbb7a6ad745e98269`;
- provenance SHA-256: `00dc1f18c30e610107498531c80a09d9296b5295008a72c8ab2208a212af01e9`;
- Actions artifact ID: `10914008713`;
- uploaded artifact ZIP SHA-256: `e43acc85e3f7f010b7189f11bd9c3622f9a7a9015765a50f315ca61a98c36a19`;
- artifact retention: 7 days.

Patch SHA-256 values:

- host operational read: `fc0ce000b2fa5051f10fb71cfece71df17e9b4953779486d951b3f2990cd8bfb`;
- terminal run-result read: `8972f5d500012f706ccce82dee8aef055aa99f8b97a1d34f89856a3e1d311c6f`;
- synchronous webhook response: `94d8d520285af6c7ec11859bdc3dde97d2646ad8e589b3c04532791db32c181f`.

Startup evidence:

- deployment mode: authenticated;
- deployment exposure: private;
- credentials: synthetic CI-only;
- endpoint: `http://127.0.0.1:3100/api/health`;
- required terminal health: `status=ok`;
- result: **GREEN**.

The first candidate attempt exposed a verifier defect: Paperclip may return HTTP 200 with `status=starting` while startup recovery converges. The original smoke incorrectly stopped on the first HTTP 200. Commit `2029c7b3...` changed the verifier to continue until `status=ok`; the corrected candidate then passed.

### Core candidate post-gates

The Core Candidate workflow originally ran before the primary gates and was treated as non-qualifying.

After Core CI and Semantic Fast Read CI were GREEN, the Core Candidate job was rerun:

- job: `108472053317`;
- result: **GREEN**;
- tested merge ref/source SHA: `fd4d9373d3d7e4d9eca202abdf075fde8feeb8d0`;
- image: `wandora/core:organization-adapter-candidate-fd4d9373d3d7`;
- archive SHA-256: `520207bf5caff9530104e600ec9522bcaeeca2d05264da367ed254627188cc55`;
- OCI config digest: `sha256:391fbe85384dc0d8ab4420776c1d70d9851da382473b15a72b599f2d9c42c8d1`;
- OCI manifest digest: `sha256:c567405a6cbdce247de15b4b08aa01ff1fc4b665b79d4473ff570b477efdd538`;
- Actions artifact ID: `10914002165`;
- uploaded artifact ZIP SHA-256: `4c7fce1d9a88fae19bf91232678162c602ac6073bf1ee2ae902172f5f4d61071`.

### PR workflow set

The corrected implementation head/merge ref reached:

**17/17 PR workflows GREEN**

including:

- Core CI;
- Semantic Fast Read CI;
- Paperclip Fast Read Production Candidate CI;
- Paperclip Fast Read Patch Composition CI;
- Paperclip Host Operational Read Extension CI;
- Paperclip Fast Read Run Result Read CI;
- Paperclip Synchronous Webhook Response CI;
- Paperclip 916.1 OpenAPI Candidate CI;
- Organization Adapter Plugin CI;
- Integration Capability Projection CI;
- Core Candidate Artifact post-gates;
- all remaining PR workflows.

Semantic Fast Read CI had one transient first-attempt failure before semantic execution at disposable PostgreSQL `pg_isready` immediately after image pull. A single rerun, with no code change, passed.

## Production effect

None.

This slice did **not**:

- change the VPS;
- deploy Core or Paperclip;
- alter production Compose;
- create or move production secrets;
- call TypeSafe/System One;
- call Mistral;
- call VendaERP;
- send WhatsApp/customer traffic;
- enable Human Send;
- enable Messaging Gateway outbound;
- change Task Drain;
- call a production provider.

## Remaining production blockers

Production execution remains **NO-GO** until a new pre-mutation decision/review closes all of the following:

1. qualify the real TypeSafe/System One production credential purpose and custody;
2. create/qualify a distinct Fast Read intent HMAC under operator custody;
3. re-attest metadata-only owner/group/mode of the existing Mistral platform secret without reading its value;
4. reconcile the exact Paperclip candidate artifact still exists and matches its frozen SHA-256; if it expired, build a new candidate and repeat preflight;
5. capture a fresh immediately-pre-mutation Core/Paperclip rollback set;
6. prove Task Drain OFF / quiescence / no active operational work;
7. re-read production Core/Paperclip/Organization Adapter state immediately before mutation;
8. perform another explicit adversarial review for the actual production operation.

## Result

**QUALIFIED / CODE+CI ONLY / NO PRODUCTION EFFECT.**

ADR 0294 deployment-evidence gaps (Paperclip candidate artifact and reviewed fail-closed Core activation/custody contract) are closed for this exact qualified candidate.

This ADR does not authorize production activation.

The next slice should be a separately reviewed production credential-custody + pre-mutation attestation slice, not a continuation by assumption.
