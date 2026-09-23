# ADR 0195 — Organization Grounding Source File Upload Production Promotion Preflight V1

Status: **ACCEPTED / GO FOR A SEPARATE FUTURE EXECUTION ONLY / NO PRODUCTION EFFECT**
Date: 2026-09-23

## Context

ADR 0194 merged the Organization Grounding Source File Upload Implementation V1 into canonical `main`, but production deliberately still has migration 018 absent and the prior Web image live.

This preflight qualifies the smallest safe future production effect.

It does **not** apply migration 018, create a bucket/object, mutate grounding, recreate any live service, call a model, create work/run/session state or enable outbound.

## REAL NOW

Canonical Git:

```text
main = aaada76d9806d48ce3e3047a299974ee9d41a480
PR #252 = MERGED
```

The exact PR-head workflows were GREEN:

- Core CI
- Web CI
- Messaging Gateway CI
- Organization Adapter Plugin CI
- Core Candidate Artifact
- Platform Admin CI

Post-merge push workflows on the exact main were also GREEN for:

- Core CI
- Web CI
- Core Candidate Artifact
- Messaging Gateway CI
- Platform Admin CI

Organization Adapter Plugin CI does not run on this push shape and had already passed on the exact PR head.

Live runtime remained unchanged throughout this preflight:

```text
Web = wandora/web:candidate-840469b365d1 / healthy / restart 0
Core = wandora/core:organization-adapter-candidate-d8349b353bb7 / healthy / restart 0
Paperclip = wandora/paperclip:v2026.916.0 / healthy / restart 0
Messaging Gateway = wandora/messaging-gateway:origin-fix-94cfb4de / healthy / restart 0
```

MEDICSPRO grounding remained:

```text
fact active = 1
fact retired = 1
rule active = 1
rule retired = 1
```

Live Storage baseline before any future execution:

```text
storage.buckets total = 0
organization-grounding-sources bucket = 0
storage.objects total = 0
organization-grounding-sources policies = 0
PostgreSQL = 17.6
```

## Capability Authority / Reuse Gate

No new capability is required for promotion.

- Wandora remains semantic authority for official organization evidence and provider-neutral `sourceRef` / `sourceLabel`;
- Supabase Storage remains delegated private blob persistence;
- existing grounding create/correct versioning remains the only customer-facing association contract;
- Mastra/runtime receives no automatic file retrieval/RAG/memory/context capability from this slice;
- Paperclip lifecycle/control-plane capability is unchanged;
- Core does not need a blob proxy or runtime promotion.

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication.

## Migration 018 qualification

Canonical source:

```text
infra/stacks/supabase/migrations/20260923_018_organization_grounding_source_storage_v1.sql
sha256 = 5418560cef3be6adfbad7a83f822524831b3fc44e3f3cf99ca8fb3d3c4a377af

infra/stacks/supabase/verifiers/VERIFY_20260923_ORGANIZATION_GROUNDING_SOURCE_STORAGE_V1.sql
sha256 = 01ee278353f379a80fcea48f700dfdceb41d5d4b0482a33d2569f6c84df98709
```

Migration 018 is transaction-wrapped and requires the existing Supabase Storage schema.

It adds exactly:

- private bucket `organization-grounding-sources`;
- 10 MiB file limit;
- bounded business MIME types;
- active-member same-tenant SELECT policy;
- active owner/admin same-tenant INSERT policy.

It intentionally adds no customer UPDATE or DELETE policy.

## Production-derived backup rehearsal

A read-only preflight dump was captured from the live database for:

- `wandora`;
- `wandora_private`;
- `storage`.

Evidence:

```text
/home/wandora-admin/preflights/grounding-source-file-upload-promotion-preflight-v1/
  wandora-storage-pre-018.dump

mode = 0600
sha256 = b6998e36a478407019410cfe23df948db8a0ead6f9b09014a9b83d22d00efc2e
size ≈ 303 KiB
```

This dump is preflight evidence only. A future execution must capture a **fresh** protected pre-migration dump immediately before any live schema mutation.

### Restore rehearsal history

Three discarded laboratory attempts were reconciled and must not be repeated:

1. restoring into the default database of the exact Supabase image failed because that database already contains `storage`, while the dump correctly contains `CREATE SCHEMA storage`;
2. the next attempt did not create the clean restore database because the SQL block was sent through `docker exec` without interactive stdin;
3. the first clean-database retry started `pg_restore` after `pg_isready` but before the Supabase image had completed its own initialization/restart cycle; that expected internal restart terminated the restore session while adding the Storage FK.

None of these attempts touched production.

The valid rehearsal waited for the explicit image marker:

```text
PostgreSQL init process complete; ready for start up.
```

and only then required a post-restart `pg_isready`.

It used:

- exact image `supabase/postgres:17.6.1.136`;
- a fresh database `wandora_restore_018` inside the disposable cluster;
- native `supabase_admin`;
- the reviewed non-secret Wandora role shapes required by the dump;
- `pg_restore --exit-on-error`.

Restored baseline:

```text
target bucket = 0
storage objects = 0
target policies = 0
organization grounding rows = 4
```

Migration 018 then applied successfully in the restored lab.

The canonical verifier returned:

```text
ORGANIZATION_GROUNDING_SOURCE_STORAGE_V1_VERIFY_OK
```

Postverify:

```text
target bucket = 1
target objects = 0
target policies = 2
```

The verifier transaction rolled back its synthetic tenant/user/object fixtures.

Final rehearsal log:

```text
/home/wandora-admin/preflights/grounding-source-file-upload-promotion-preflight-v1/
  restore-rehearsal-018-final.log

sha256 = 503d0b1b5d15577ab89bea8d044189399ba300bfd250ae815c285685d98fc76f
result = RESTORE_REHEARSAL_018_OK
```

## Exact Web artifact

Post-merge Web workflow:

```text
workflow run = 35811056614
artifact id = 10729343085
artifact name = web-candidate-aaada76d9806d48ce3e3047a299974ee9d41a480
artifact digest = sha256:f7957a554ade68b4c23c760ef238216b9c2177723f97548c9ef9c54e14e03e8d
expires = 2026-09-30T02:37:39Z
```

The artifact was transferred through the ADR 0192 host-authenticated path.

Local ZIP SHA-256 exactly matched the GitHub digest.

Internal `SHA256SUMS` verification passed:

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

Loaded runtime image label preserved the exact source revision:

```text
revision = aaada76d9806d48ce3e3047a299974ee9d41a480
```

## Private Web candidate proof

The exact loaded candidate was started privately without replacing `wandora-web`.

Proof:

```text
/healthz = ok
/company = 200
```

Bundle proof contains:

- `wandora:grounding-source:v1:`;
- private Storage download route `/storage/v1/object/authenticated/`;
- `Baixar arquivo`;
- `Arquivo da empresa`.

The private candidate was removed after proof.

## Browser / Storage transport proof

The Web artifact contains the existing browser-public Supabase publishable key used by current Auth. No service-role credential is introduced.

CORS preflight from `https://app.wandora.com.br` proved the required browser transport.

POST path allows:

```text
authorization
apikey
content-type
x-upsert
```

GET private-download path allows:

```text
authorization
apikey
```

Both returned HTTP 200 preflight and allow origin `https://app.wandora.com.br`.

## Why Core is not promoted

A Core candidate artifact exists because the canonical workflow always builds one, but this slice did not change the Core product/runtime implementation required for the feature.

The browser uploads directly to delegated Supabase Storage using the existing human session JWT.

Grounding association still reaches Core only through the already-live provider-neutral create/correct contract.

Promoting Core would therefore add risk with no capability benefit.

Decision: **Core promotion is rejected as unnecessary.**

## Dependency and execution order

The future effect order is:

```text
fresh backup + isolated restore-check
  → migration 018 + canonical verifier
  → exact private Web candidate proof
  → Web-only promotion
  → public validation
  → STOP
```

Migration 018 must precede the new Web because the UI can expose upload only after the private bucket and RLS exist.

## Rollback boundaries

### Before migration verifier is GREEN

Any apply/verifier failure is a hard STOP.

Use the fresh execution-time pre-018 dump to restore the exact baseline before any Web promotion.

Do not improvise a destructive hand-written down migration.

### After migration verifier is GREEN, before any real file upload

Migration 018 is additive and the previous Web does not depend on its absence.

If Web candidate/promotion fails:

- restore only the prior Web image/selector;
- keep the verified migration in place unless an exact-baseline restore is independently required.

Do not restore the database merely to undo a binary deployment.

### After any real organization file exists

A pre-018 database dump is no longer a routine rollback mechanism.

In particular, database restore alone is not a complete blob rollback strategy for uploaded object bytes.

Therefore:

- do not delete the bucket/policies as an automatic rollback;
- do not remove uploaded evidence to reverse a Web deployment;
- any future schema/provider reversal after real evidence exists requires a separate retention-aware forward migration and blob migration decision.

## Frozen future execution

A separate **Organization Grounding Source File Upload Production Promotion Execution V1** may proceed only after a fresh REAL NOW reconciliation remains green:

1. confirm exact current main and no conflicting open PR;
2. require target bucket and target policies still absent; unexpected presence is a STOP/reconcile condition;
3. confirm runtime and MEDICSPRO grounding baseline;
4. require exact Web artifact still available and digest-valid; if expired, regenerate from the exact accepted source through canonical CI;
5. capture a fresh protected `pg_dump -Fc` of `wandora`, `wandora_private` and `storage`;
6. perform a clean-database role-aware restore-check on the exact Supabase PostgreSQL image;
7. freeze prior Web selector/image as rollback;
8. apply migration 018 exactly once and run the canonical verifier immediately;
9. require 1 target bucket, 0 target objects and exactly 2 target policies after verifier;
10. run the exact Web candidate privately and require health/company proof;
11. promote/recreate **only Web**;
12. validate public routes and unauthenticated boundaries;
13. recheck Storage bucket/policies, grounding row counts, service health and restart counts;
14. do not create a real organization file merely to prove promotion;
15. do not mutate grounding, call a model, create work/run/session state or enable/send outbound;
16. STOP.

Core, Paperclip, Mastra and Messaging Gateway are not promoted/recreated.

## Objective STOP conditions

Stop before the next effect if any of the following is observed:

- main or relevant source drift without fresh review;
- exact Web artifact missing/expired/digest mismatch;
- unexpected existing target bucket/policies/objects;
- fresh backup/hash/restore-check failure;
- migration/verifier failure;
- private Web candidate failure;
- publishable-key or CORS regression;
- prior Web rollback image/selector unavailable;
- unexpected MEDICSPRO grounding drift;
- provider/runtime health degradation;
- any apparent need to introduce a new document store, RAG, vector, retrieval, memory or Core blob proxy to complete promotion.

## Second adversarial review

The review explicitly rejected:

1. promoting Core merely because a Core artifact exists;
2. applying migration 018 before a fresh execution-time backup/restore-check;
3. using the preflight dump as the future execution rollback asset;
4. testing production by creating a synthetic organization file;
5. deleting the Storage bucket as routine rollback after evidence may exist;
6. treating database restore as sufficient blob rollback after real uploads;
7. exposing Supabase object URLs as canonical source identity;
8. adding service-role to Web/Core;
9. creating RAG/retrieval/memory as part of file upload;
10. retrying failed laboratory restore attempts without reconciling why they failed.

## Decision

**GO for a separate future Organization Grounding Source File Upload Production Promotion Execution V1, and only under the frozen order and STOP conditions above.**

This preflight does not itself authorize or perform production mutation.
