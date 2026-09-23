# ADR 0191 — Organization Grounding Source File Upload Capability Authority Preflight V1

Status: **PREFLIGHT COMPLETE / NO EFFECT / IMPLEMENTATION NOT YET LIVE**
Date: 2026-09-22

## Goal

Support real company files such as:

- price lists;
- internal rules/norms;
- PDFs;
- DOCX;
- XLSX/CSV;
- supporting images;

as evidence for official company facts or Regras da Casa.

This preflight determines authority before creating storage state.

## REAL NOW

Canonical grounding already supports provider-neutral:

- sourceRef;
- sourceLabel;
- owner_statement / approved_source / approved_correction provenance.

Live Supabase Storage is healthy, but live inspection proves:

```text
storage.buckets = 0
storage policies = 0
```

No grounding file bucket or upload contract exists today.

## Capability Authority / Reuse Gate

### Semantic authority

Wandora owns:

- the meaning that a file is evidence for an official company fact/rule;
- provider-neutral sourceRef semantics;
- which organization and grounding version the evidence belongs to;
- customer authorization and lifecycle.

### Blob implementation authority

Supabase Storage is already the accepted managed object-storage infrastructure under ADR 0004.

Wandora must not implement:

- a filesystem document store;
- a second object-storage service;
- a RAG/vector/document-ingestion subsystem merely to support uploads.

### Runtime authority

Uploaded files are **evidence only** in V1.

They are not automatically:

- read by the model;
- chunked;
- embedded;
- indexed;
- retrieved;
- added to memory;
- added to prompt/context.

Any future runtime use requires a separate Mastra/runtime retrieval authority review.

## Decision

Adopt the following minimum future contract.

### Private bucket

One private Supabase Storage bucket:

```text
organization-grounding-sources
```

No public objects.

### Object path

Tenant-scoped provider object path:

```text
<organization-id>/<source-id>/<sanitized-file-name>
```

### Provider-neutral sourceRef

Customer/product state continues to store only a Wandora reference, conceptually:

```text
wandora:grounding-source:v1:<organization-id>/<source-id>/<logical-name>
```

Web/customer contracts must not store a Supabase object URL as the semantic source identity.

### Authorization

Reuse the current human identity and canonical membership semantics.

Required policy:

- active member -> may read an attached source belonging to their organization;
- active owner/admin -> may create/replace an attached source for their organization;
- member -> no upload mutation;
- cross-organization access -> forbidden.

The same Supabase JWT subject maps through the existing Wandora user/membership functions.

Service-role must not be exposed to the browser and is not required by this direction.

### Grounding association

V1 supports one official file source per grounding version through the already-live sourceRef/sourceLabel fields.

Attaching/replacing evidence on an existing active item must use the existing versioned correction flow rather than an in-place grounding overwrite.

Multiple arbitrary attachments per one grounding version are not introduced in V1 because the current product contract does not own an attachment collection.

### Bounded file types

First implementation should be bounded to common business evidence:

- PDF;
- DOCX;
- XLSX;
- CSV;
- TXT;
- PNG;
- JPEG.

A conservative file-size limit must be enforced both in Storage bucket configuration and Web upload validation.

### Replacement boundary

If Supabase Storage is replaced:

- grounding sourceRef semantics stay stable;
- Web product language stays stable;
- only the source-storage adapter/path mapping and blob migration change.

## Rejected alternatives

Rejected:

1. new Wandora documents table merely for upload;
2. saving binary/base64 into PostgreSQL grounding rows;
3. direct public bucket;
4. browser service-role credential;
5. making raw Supabase object URLs canonical sourceRefs;
6. automatically extracting/indexing uploaded files;
7. adopting Paperclip task attachments as organization-grounding source authority;
8. introducing RAG/vector/memory as part of upload.

## Second adversarial review

The preflight proves the requested upload is a legitimate Wandora-owned **evidence semantic** backed by delegated Storage implementation.

However, live production has no bucket/policy today. Therefore no upload button may claim to work until a separate code-only implementation defines:

- migration 018 bucket/policies;
- provider-neutral Web source-storage adapter;
- upload idempotency/fingerprint;
- safe file limits/types;
- private read/download path;
- grounding correction association;
- dedicated tests.

## Effect boundary

This ADR creates **no bucket, policy, object or grounding mutation**.

Next slice:

**Organization Grounding Source File Upload Implementation V1 — CODE ONLY / NO PRODUCTION EFFECT**.