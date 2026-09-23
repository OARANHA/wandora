# ADR 0196 — Organization Grounding Source File Upload Production Promotion Execution V1

Status: **EXECUTED / GREEN / MIGRATION 018 + WEB ONLY**
Date: 2026-09-23

## Context

ADR 0195 qualified the smallest safe production effect for organization-grounding source files:

```text
fresh execution-time backup + clean restore-check
→ migration 018 + canonical verifier
→ exact private Web candidate proof
→ Web-only promotion
→ public validation
→ STOP
```

This execution followed that order.

No real organization file was created merely to prove deployment.

## REAL NOW entering execution

Canonical repository state at execution:

```text
main = 1bb3887c448df2ced2ba472e08f046b14fb510f7
open PRs = 0
```

The accepted implementation source remained:

```text
aaada76d9806d48ce3e3047a299974ee9d41a480
```

The diff from that source to execution-time `main` contained documentation only:

```text
docs/CANONICAL_STATE.md
docs/WANDORA_PROJECT_SOURCE.md
docs/decisions/0195-organization-grounding-source-file-upload-production-promotion-preflight-v1.md
```

There was no code/migration/runtime drift after the accepted source.

Live runtime before effect:

```text
Web = wandora/web:candidate-840469b365d1
      healthy / restart 0
      container id ce84a461926936096964d1aed18d9365cdb7695fe93b607638e982dfa0b13af3

Core = wandora/core:organization-adapter-candidate-d8349b353bb7
       healthy / restart 0
       container id 98295b7d82fa242f41f48cd9b0b78566caad3224330e624bd9cd204c7e2ace0a

Paperclip = wandora/paperclip:v2026.916.0
            healthy / restart 0
            container id 9f4ca914e5fb9166c509f3a7ec8cfc497bc4663b8e2010721117835eca3bb29a

Messaging Gateway = wandora/messaging-gateway:origin-fix-94cfb4de
                    healthy / restart 0
                    container id f00991a4b25db48ea19004c156d11bb4de20e2a14658773305bacaa083b5330f
```

Live Storage baseline:

```text
target bucket = 0
target objects = 0
target policies = 0
```

MEDICSPRO baseline:

```text
fact active = 1
fact retired = 1
rule active = 1
rule retired = 1
works = 2
outbound attempts = 0
```

Human Send / Gateway outbound enable flags were absent.

## Capability Authority / Reuse Gate

No capability authority changed during execution.

- Wandora owns official-evidence semantics and provider-neutral `sourceRef` / `sourceLabel`;
- Supabase Storage owns delegated private blob persistence;
- existing grounding create/correct remains the customer association contract;
- Core does not own blob persistence and was not promoted;
- Paperclip/Mastra/runtime did not gain file retrieval, RAG, memory, embeddings, chunking or context assembly;
- Messaging Gateway was not touched.

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication.

## Exact Web artifact

Qualified GitHub artifact:

```text
artifact id = 10729343085
name = web-candidate-aaada76d9806d48ce3e3047a299974ee9d41a480
GitHub digest = sha256:f7957a554ade68b4c23c760ef238216b9c2177723f97548c9ef9c54e14e03e8d
expired = false
expires = 2026-09-30T02:37:39Z
head/source SHA = aaada76d9806d48ce3e3047a299974ee9d41a480
```

Local ZIP SHA-256 matched GitHub exactly:

```text
f7957a554ade68b4c23c760ef238216b9c2177723f97548c9ef9c54e14e03e8d
```

Internal `SHA256SUMS`:

```text
web-image.tar = OK
manifest.txt = OK
```

Manifest:

```text
candidate_contract = wandora-web-reviewed-bridge-v1
source_sha = aaada76d9806d48ce3e3047a299974ee9d41a480
source_tree_sha = 4e68fec8e195d8ce5a554dee2afff60512d2798a
image_tag = wandora/web:candidate-aaada76d9806
image_id = sha256:f06f55bc547e3b16b01302fc6cebfc39708407c618376fee3c4731410f9d96bb
archive_sha256 = c82910572b3d59e3f8d55075f12ffc7459a099081fe9a317160ef4de33666af6
```

## Rollback anchors

The previous Web selector was frozen before mutation:

```text
WANDORA_WEB_IMAGE=wandora/web:candidate-840469b365d1
```

Selector/config snapshot SHA-256:

```text
cf184a07644ec2ae03b4b68861d043c0642201d57f0c78b391773e8ce2740121
```

The prior Web image remained locally available.

## Fresh execution-time backup and restore-check

Immediately before migration 018, a fresh protected `pg_dump -Fc` was taken for:

- `wandora`;
- `wandora_private`;
- `storage`.

Execution artifact:

```text
/home/wandora-admin/executions/grounding-source-file-upload-production-promotion-v1/
  wandora-storage-pre-018.dump

sha256 = 587db1845f58d93a870f81283210d98c1a30c2ff0f4124dc5914ef3dfabc6e2c
mode = 0600
```

A clean-database restore-check used the exact `supabase/postgres:17.6.1.136` image and waited for the explicit Supabase initialization-complete marker before restoring.

Restored baseline:

```text
target bucket = 0
target objects = 0
target policies = 0
grounding rows = 4
```

Migration 018 + verifier passed in that restored production baseline:

```text
ORGANIZATION_GROUNDING_SOURCE_STORAGE_V1_VERIFY_OK
target bucket after = 1
target objects after = 0
target policies after = 2
EXECUTION_RESTORE_CHECK_018_OK
```

Restore-check log SHA-256:

```text
48c2b3deda25d62829c10934feaa2affc0771e4fa5fa5512a73061738c484c0f
```

## Migration 018 — LIVE / GREEN

Canonical source:

```text
migration sha256 = 5418560cef3be6adfbad7a83f822524831b3fc44e3f3cf99ca8fb3d3c4a377af
verifier sha256 = 01ee278353f379a80fcea48f700dfdceb41d5d4b0482a33d2569f6c84df98709
```

Final pre-apply check was exactly:

```text
bucket = 0
objects = 0
policies = 0
```

Migration 018 was then applied exactly once live.

Canonical verifier returned:

```text
ORGANIZATION_GROUNDING_SOURCE_STORAGE_V1_VERIFY_OK
```

Live postverify:

```text
bucket = 1
objects = 0
policies = 2
fact active = 1
fact retired = 1
rule active = 1
rule retired = 1
```

Evidence hashes:

```text
migration-018-live.log =
59066c78bd66f5b3d62dfb6517195b2469f6f79a321be4b0ab5f655e5cd41bbe

verifier-018-live.log =
7171dde4c0e46aa2f6b4904975895db61cd6081264dd072a9e20c19992baf318

storage.post-verify =
d8fe87c7a297e58977a6b2830ef5b22ca7d837ab4ea6f450a220baca51679824
```

The verifier's synthetic objects/users/tenants rolled back.

No real Storage object was created.

## Exact private Web candidate proof after migration

The exact candidate was started privately against the live composition after migration 018.

Proof:

```text
image = wandora/web:candidate-aaada76d9806
revision = aaada76d9806d48ce3e3047a299974ee9d41a480
healthy
restart = 0
/healthz = 200
/company = 200
/api/v1/me without session = 401
```

Storage upload CORS from `https://app.wandora.com.br` remained GREEN:

```text
HTTP = 200
allow-origin = https://app.wandora.com.br
allowed request headers include:
  authorization
  apikey
  content-type
  x-upsert
```

The candidate was removed before live promotion.

## Web-only production promotion

Only the Web selector changed:

```text
before = wandora/web:candidate-840469b365d1
after = wandora/web:candidate-aaada76d9806
```

Only `wandora-web` was recreated.

Core, Paperclip and Messaging Gateway container IDs remained unchanged.

## Final live validation

Web:

```text
image = wandora/web:candidate-aaada76d9806
revision = aaada76d9806d48ce3e3047a299974ee9d41a480
healthy
restart = 0
```

Public routes:

```text
/healthz = 200
/login = 200
/ = 200
/team = 200
/work = 200
/conversations = 200
/approvals = 200
/company = 200
/api/v1/me without session = 401
```

Live bundle contains:

- `wandora:grounding-source:v1:`;
- `Baixar arquivo`;
- `Arquivo da empresa`.

Private-download CORS:

```text
HTTP = 200
allow-origin = https://app.wandora.com.br
allowed request headers include:
  authorization
  apikey
```

Final product state:

```text
organization-grounding-sources bucket = 1
target objects = 0
target policies = 2

MEDICSPRO fact active = 1
MEDICSPRO fact retired = 1
MEDICSPRO rule active = 1
MEDICSPRO rule retired = 1
MEDICSPRO works = 2
MEDICSPRO outbound attempts = 0

Core = unchanged / healthy / restart 0
Paperclip = unchanged / healthy / restart 0
Messaging Gateway = unchanged / healthy / restart 0
```

No model call, work, run, wakeup, task session, grounding mutation, file upload or external message was caused by this promotion.

## Rollback boundary after execution

Migration 018 is additive and verified.

If a later Web-only defect is found before any real file upload:

- restore the prior Web selector/image;
- keep migration 018 in place unless an exact-baseline database restore is separately justified.

Do not restore the pre-018 database merely to undo Web.

After any real organization file exists, the pre-018 dump is not a routine rollback mechanism because database restoration alone does not restore/delete provider object bytes safely.

Any later Storage/provider reversal must preserve evidence through a retention-aware forward migration.

## Second adversarial review

The execution explicitly rejected:

1. promoting Core because a Core artifact existed;
2. recreating Paperclip, Mastra or Gateway;
3. creating a real file merely to prove upload;
4. using service-role in browser/Core;
5. exposing raw Supabase object URL as canonical source identity;
6. creating document store/RAG/retrieval/memory;
7. destructive bucket deletion as automatic rollback;
8. restoring the database just to undo Web.

## Decision

**Organization Grounding Source File Upload Production Promotion Execution V1 is COMPLETE / GREEN.**

Migration 018 and the customer Web upload/download surface are now production-live.

The next safe proof is a separate owner-session smoke test using a deliberate real company file. That proof must use the customer-facing Company flow and must not bypass the canonical grounding contract with SQL or direct Storage mutation.
