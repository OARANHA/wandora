# ADR 0194 — Organization Grounding Source File Upload Implementation V1

Status: **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**
Date: 2026-09-23

## Context

ADR 0191 approved the capability authority for organization-grounding source files:

- Wandora owns the customer-facing meaning of official evidence and the provider-neutral source reference;
- Supabase Storage remains the delegated private blob implementation;
- uploaded files are evidence only and do not automatically become retrieval, RAG, memory, embeddings, chunking or runtime context.

This ADR implements that contract in code without changing production.

## REAL NOW

Implementation base:

```text
main = 7e4c76661cb1c6b9fcf129ea1369fbd374bf89bc
open PRs = 0
live Web = wandora/web:candidate-840469b365d1 / healthy / restart 0
migration 018 = NOT LIVE
live grounding-source bucket count = 0
```

MEDICSPRO grounding remains:

```text
fact active = 1
fact retired = 1
rule active = 1
rule retired = 1
```

## Capability Authority / Reuse Gate

### Wandora semantic authority

Wandora owns:

- whether a source is official evidence for an organization fact or Regra da Casa;
- organization ownership and customer authorization semantics;
- provider-neutral `sourceRef` / `sourceLabel`;
- grounding version history and correction semantics.

### Blob implementation authority

Supabase Storage owns private object persistence.

No Wandora-native:

- document database;
- filesystem store;
- blob service;
- vector database;
- RAG pipeline;
- embedding service;
- chunking subsystem;
- runtime retrieval subsystem

is introduced.

### Core boundary

Core continues to receive only the existing provider-neutral grounding contract.

The binary file and Supabase object URL do not enter Core.

### Runtime boundary

A source file is evidence only.

The agent runtime does not automatically read, parse, chunk, embed, retrieve or place uploaded file contents into model context.

## Decision

### Migration 018

Add:

```text
20260923_018_organization_grounding_source_storage_v1.sql
```

It requires an existing Supabase Storage schema and creates one private bucket:

```text
organization-grounding-sources
```

Bucket contract:

```text
public = false
max file size = 10 MiB
```

Allowed content types:

- PDF;
- DOCX;
- XLSX;
- CSV;
- TXT;
- PNG;
- JPEG.

The migration fails closed if an already-existing bucket with the same ID does not match the reviewed contract.

### Immutable content-addressed object path

V1 object paths are:

```text
<organization-id>/<sha256-of-file-content>/<sanitized-file-name>
```

The SHA-256 makes retries deterministic and prevents an ambiguous upload retry from silently replacing different bytes.

V1 deliberately defines no customer UPDATE or DELETE policy.

Changing a document means a new immutable object plus a new grounding version.

### Provider-neutral source reference

The grounding record stores:

```text
wandora:grounding-source:v1:<organization-id>/<sha256>/<logical-name>
```

It does not store a Supabase URL as the semantic source identity.

### Storage authorization

RLS policies on `storage.objects` enforce:

- active organization members may SELECT same-organization grounding evidence;
- active owner/admin may INSERT same-organization grounding evidence;
- member upload is denied;
- cross-organization reads are denied;
- UPDATE is denied;
- DELETE is denied;
- object paths outside the reviewed organization/SHA/name shape are denied.

The browser uses the already-existing Supabase human JWT plus the browser-public publishable key.

No service-role credential is introduced in Web or Core.

### Browser adapter

`apps/web/src/groundingSourceStorage.ts` is the current provider adapter.

It:

1. validates extension, MIME and 10 MiB limit;
2. sanitizes the logical file name;
3. computes SHA-256 in the browser;
4. uploads with `x-upsert: false`;
5. returns only the provider-neutral sourceRef/sourceLabel to product code;
6. reconciles an ambiguous/duplicate upload only after downloading the existing private object and proving identical SHA-256;
7. uses the pinned Storage private-download route `/storage/v1/object/authenticated/...`;
8. re-verifies SHA-256 on download.

### Grounding association

For a new fact/rule:

```text
upload immutable evidence
→ obtain sourceRef/sourceLabel
→ existing canonical grounding create
```

For an existing active fact/rule:

```text
upload immutable evidence
→ existing grounding correction flow
→ new approved_correction version
→ previous grounding version remains historical
```

There is no in-place grounding overwrite.

### Customer surface

The Company surface adds:

- an optional **Arquivo da empresa** input;
- business-friendly accepted-type / 10 MB guidance;
- automatic official-source classification when a file is selected;
- **Baixar arquivo** in the right-side detail drawer for Wandora-managed file references;
- **Corrigir / anexar** for versioned evidence updates.

Raw sourceRef and Supabase implementation details remain hidden.

## Second adversarial review

The implementation was challenged against:

1. creating a duplicate Wandora document store;
2. exposing service-role in the browser;
3. public bucket/object access;
4. cross-tenant object access;
5. member upload mutation;
6. mutable or overwrite-in-place evidence;
7. provider URL becoming canonical source identity;
8. unsafe ambiguous retries;
9. corrupted downloads;
10. automatically turning uploaded files into RAG/memory/runtime context;
11. relying on an assumed Storage route rather than the pinned runtime.

Results:

- no new Wandora documents table/service exists;
- browser uses only publishable key + canonical human JWT;
- bucket is private;
- tenant/role RLS is enforced;
- V1 has no UPDATE/DELETE policy;
- `x-upsert=false`;
- sourceRef is provider-neutral;
- duplicate/ambiguous retry verifies bytes by SHA-256;
- download verifies SHA-256;
- no retrieval/RAG/runtime integration was added;
- live `supabase/storage-api:v1.74.0` was inspected and proved private GET uses `/object/authenticated/<bucket>/<path>`; adapter was corrected accordingly;
- CORS preflight from `https://app.wandora.com.br` proves required method/headers are allowed.

The review also found and corrected a filename Unicode-normalization escape bug before commit.

## Bounded orphan-object behavior

Upload occurs before the grounding mutation because the canonical grounding payload needs the resulting sourceRef.

Therefore an upload may succeed while a later grounding create/correct fails.

In that case an immutable, unreferenced blob may remain in Storage.

V1 accepts this bounded orphan possibility rather than introducing a delete capability or garbage-collector subsystem into this slice.

Any future orphan reconciliation/retention job requires a separate capability/operations review.

## Validation

### Storage / grounding verifier

```text
ORGANIZATION_GROUNDING_SOURCE_STORAGE_V1_VERIFY_OK
ORGANIZATION_GROUNDING_CONTRACT_V1_OK
12/12 existing grounding Core tests GREEN
ORGANIZATION_GROUNDING_V1_VERIFY_OK
```

The disposable verifier proves:

- owner insert;
- admin role policy shape;
- member read;
- member insert denied;
- cross-tenant read denied;
- update/delete denied;
- invalid object path denied.

### Web

Production-shaped Docker build is GREEN.

All existing Web gates remain GREEN, plus:

```text
WANDORA_WEB_GROUNDING_SOURCE_FILE_UPLOAD_V1_OK
```

### Browser-to-Storage transport

No-effect CORS preflight:

```text
Origin = https://app.wandora.com.br
HTTP = 200
allowed headers = authorization, apikey, content-type, x-upsert
```

## Production boundary

This ADR is **CODE ONLY / NO PRODUCTION EFFECT**.

Specifically:

- migration 018 has not been applied;
- live bucket count remains 0;
- no Storage object was created;
- Web production was not promoted;
- Core/Paperclip/Mastra/Gateway were not changed;
- grounding rows were not mutated;
- no model/runtime/outbound effect occurred.

The next separate slice is:

**Organization Grounding Source File Upload Production Promotion Preflight V1**.
