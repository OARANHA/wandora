# ADR 0197 — Organization Grounding Source File Owner-Session Smoke Test V1

Status: **COMPLETE / GREEN / OWNER UPLOAD + PRIVATE DOWNLOAD PROVED**
Date: 2026-09-23

## Context

ADR 0196 promoted migration 018 and the customer-facing organization-grounding source-file surface to production without creating a real file.

The next proof is deliberately customer-originated: a real MEDICSPRO owner uses the normal authenticated `/company` flow. Direct SQL, direct Storage mutation, Auth-admin impersonation and service-role bypass remain prohibited.

## REAL NOW

Canonical Git entering the proof:

```text
main = 55f14bdd9e047ea1829acd735cec79e1c23e1e60
PR #255 = MERGED
open PRs = 0
```

Live services were reconciled before the owner effect:

```text
Web = wandora/web:candidate-aaada76d9806
Core = wandora/core:organization-adapter-candidate-d8349b353bb7
Paperclip = wandora/paperclip:v2026.916.0
Messaging Gateway = wandora/messaging-gateway:origin-fix-94cfb4de

Web/Core/Paperclip/Gateway/DB/Storage = healthy
restart count = 0
```

Migration 018 was already live and was not repeated.

## Owner action observed

A normal authenticated MEDICSPRO owner session used the customer Company surface.

Web access log evidence:

```text
GET  /api/v1/organizations/<MEDICSPRO>/grounding = 200
POST /api/v1/organizations/<MEDICSPRO>/grounding = 200
GET  /api/v1/organizations/<MEDICSPRO>/grounding = 200
```

The operation created exactly one Storage object:

```text
bucket = organization-grounding-sources
object count = 1
path = <MEDICSPRO>/11ad412dbe104186b3b7235aacf18a7ce7e4b81b43b0ead8d59767ce68a97be6/regras_da_casa_medicspro.pdf
size = 136312 bytes
mimetype = application/pdf
```

and exactly one new grounding association using the provider-neutral contract:

```text
entry_type = rule
status = active
provenance_type = approved_source
source_ref = wandora:grounding-source:v1:<MEDICSPRO>/11ad412dbe104186b3b7235aacf18a7ce7e4b81b43b0ead8d59767ce68a97be6/regras_da_casa_medicspro.pdf
source_label = regras_da_casa_medicspro.pdf
supersedes = none
same source_ref rows = 1
```

The entered rule text is:

```text
Sempre atenta com cordialidade e simpatia
```

No direct database or Storage mutation was used to create the customer state.

## Capability Authority / Reuse Gate

No authority changed.

- Wandora owns the meaning of official organization evidence and the grounding association.
- Supabase Storage remains the delegated private blob implementation.
- The source identity remains provider-neutral.
- The PDF remains evidence only.
- No RAG, retrieval, embeddings, chunking, runtime memory, context assembly or document subsystem was created.
- Paperclip/Mastra execution authority is unchanged.

ADR 0168 remains binding:

> Portabilidade = desacoplamento do contrato, não duplicação da implementação. Provider replacement não implica internalização.

## Adversarial validation

Storage remained private:

```text
authenticated object route without auth = non-success (400)
public object route without auth = non-success (400)
bucket public = false
```

The live RLS contract remains exactly two policies:

- active same-tenant member SELECT;
- active same-tenant owner/admin INSERT.

No UPDATE or DELETE policy was introduced.

Product state after the owner upload:

```text
MEDICSPRO work operations = 2
MEDICSPRO outbound attempts = 0
MEDICSPRO digital employees = 1
Storage objects in target bucket = 1
```

All critical services remained healthy with zero restarts.

No work, model call, Paperclip run, wakeup, session, outbound message or provider-side effect was caused by this upload proof.

## Owner-authenticated private download proof

The same normal MEDICSPRO owner used **Baixar arquivo** in the customer Company surface and confirmed the PDF downloaded successfully.

Storage API independently recorded:

```text
GET /object/authenticated/organization-grounding-sources/<MEDICSPRO>/11ad412d.../regras_da_casa_medicspro.pdf
role = authenticated
HTTP = 200
content-type = application/pdf
content-length = 136312
operation = storage.object.get_authenticated
```

The browser implementation only completes the managed download after re-verifying the downloaded bytes against the SHA-256 encoded in the provider-neutral sourceRef, so the successful customer download exercises that integrity gate.

The negative controls remained fail-closed:

```text
authenticated route without Authorization = 400
public route = non-success (400)
bucket public = false
```

Post-download state stayed unchanged:

```text
Storage objects = 1
same sourceRef grounding rows = 1
MEDICSPRO work operations = 2
MEDICSPRO outbound attempts = 0
```

No owner JWT was extracted or minted to simulate the proof.

## Decision

**Organization Grounding Source File Owner-Session Smoke Test V1 is COMPLETE / GREEN.**

Both directions are proved through the normal customer path:

```text
owner upload → private Storage object → canonical grounding association
owner Baixar arquivo → authenticated private GET → browser integrity verification
```

The file remains official evidence only. No RAG/retrieval/memory/context capability is implied by this proof.
